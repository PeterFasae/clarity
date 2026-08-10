import type { CognitoUserPool, CognitoUserSession } from 'amazon-cognito-identity-js';
import { COGNITO, LOCAL_AUTH, cognitoIsConfigured } from './config';

/**
 * Sessions.
 *
 * Two implementations behind one shape: Cognito, and a local identity for
 * development. Everything above this file asks for `getIdToken()` and never
 * learns which one it got.
 *
 * The Cognito SDK is loaded on demand rather than imported at the top. It is a
 * large dependency that also expects a Node-ish global, and a local build never
 * touches it — so it lives in its own chunk and only arrives if a real sign-in
 * actually happens.
 */

export interface Account {
  /** The Cognito `sub`. Every note the API returns is scoped to this. */
  id: string;
  email: string;
  /** True when this is the development identity rather than a real account. */
  local: boolean;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ---------------------------------------------------------------- local

const LOCAL_KEY = 'clarity.local-account.v1';

function base64url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function localAccount(): Account | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

function localToken(account: Account): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64url({ alg: 'none', typ: 'JWT' }),
    base64url({ sub: account.id, email: account.email, token_use: 'id', iat: now, exp: now + 3600 }),
    'local-development-only',
  ].join('.');
}

/** A short stable id from an email, so the local identity survives a reload. */
async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes).slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// -------------------------------------------------------------- cognito

let pool: CognitoUserPool | null = null;

async function cognito() {
  if (!cognitoIsConfigured) {
    throw new AuthError(
      'Sign-in is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.',
    );
  }
  return import('amazon-cognito-identity-js');
}

async function userPool(): Promise<CognitoUserPool> {
  const { CognitoUserPool: Pool } = await cognito();
  pool ??= new Pool({ UserPoolId: COGNITO.userPoolId, ClientId: COGNITO.clientId });
  return pool;
}

/** Cognito's callback API, wrapped so the rest of the app can use await. */
async function currentCognitoSession(): Promise<CognitoUserSession | null> {
  const user = (await userPool()).getCurrentUser();
  if (!user) return null;

  return new Promise((resolve) => {
    // getSession refreshes with the stored refresh token when the id token has
    // expired, so this is also how a returning visitor stays signed in.
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      resolve(error || !session?.isValid() ? null : session);
    });
  });
}

function accountFromSession(session: CognitoUserSession): Account {
  const claims = session.getIdToken().decodePayload() as Record<string, string>;
  return { id: claims.sub, email: claims.email ?? '', local: false };
}

// --------------------------------------------------------------- shared

export async function currentAccount(): Promise<Account | null> {
  if (LOCAL_AUTH) return localAccount();
  if (!cognitoIsConfigured) return null;

  const session = await currentCognitoSession();
  return session ? accountFromSession(session) : null;
}

/**
 * The bearer token for an API call, or null when signed out.
 *
 * Always fetched fresh rather than cached, because Cognito rotates the id token
 * roughly hourly and `getSession` is what triggers the refresh.
 */
export async function getIdToken(): Promise<string | null> {
  if (LOCAL_AUTH) {
    const account = localAccount();
    return account ? localToken(account) : null;
  }
  if (!cognitoIsConfigured) return null;

  const session = await currentCognitoSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

export async function signIn(email: string, password: string): Promise<Account> {
  if (LOCAL_AUTH) {
    const account: Account = {
      // Stable for a given email, so signing back in finds the same notes.
      id: `local-${await digest(email.trim().toLowerCase())}`,
      email: email.trim(),
      local: true,
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(account));
    return account;
  }

  const { AuthenticationDetails, CognitoUser } = await cognito();
  const Pool = await userPool();

  return new Promise((resolve, reject) => {
    new CognitoUser({ Username: email.trim(), Pool }).authenticateUser(
      new AuthenticationDetails({ Username: email.trim(), Password: password }),
      {
        onSuccess: (session) => resolve(accountFromSession(session)),
        onFailure: (error: Error) => reject(new AuthError(readableAuthError(error))),
        newPasswordRequired: () =>
          reject(new AuthError('This account needs a new password. Reset it to continue.')),
      },
    );
  });
}

export async function signUp(email: string, password: string): Promise<{ confirmed: boolean }> {
  if (LOCAL_AUTH) {
    await signIn(email, password);
    return { confirmed: true };
  }

  const { CognitoUserAttribute } = await cognito();
  const Pool = await userPool();

  return new Promise((resolve, reject) => {
    Pool.signUp(
      email.trim(),
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email.trim() })],
      [],
      (error, result) => {
        if (error) return reject(new AuthError(readableAuthError(error)));
        resolve({ confirmed: Boolean(result?.userConfirmed) });
      },
    );
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  if (LOCAL_AUTH) return;

  const { CognitoUser } = await cognito();
  const Pool = await userPool();

  return new Promise((resolve, reject) => {
    new CognitoUser({ Username: email.trim(), Pool }).confirmRegistration(
      code.trim(),
      true,
      (error) => (error ? reject(new AuthError(readableAuthError(error))) : resolve()),
    );
  });
}

export async function signOut(): Promise<void> {
  if (LOCAL_AUTH) {
    localStorage.removeItem(LOCAL_KEY);
    return;
  }
  if (!cognitoIsConfigured) return;
  (await userPool()).getCurrentUser()?.signOut();
}

/**
 * Cognito's messages are written for developers. These are the ones a user is
 * actually likely to hit, said plainly — this audience reads a stack trace as
 * their own failure.
 */
function readableAuthError(error: Error & { code?: string }): string {
  switch (error.code) {
    case 'NotAuthorizedException':
      return 'That email and password do not match an account.';
    case 'UserNotFoundException':
      return 'No account with that email yet.';
    case 'UsernameExistsException':
      return 'There is already an account with that email.';
    case 'UserNotConfirmedException':
      return 'Check your email for the confirmation code and enter it below.';
    case 'CodeMismatchException':
      return 'That code does not match. Codes expire after a while — ask for a new one if it keeps failing.';
    case 'InvalidPasswordException':
      return 'Passwords need at least 12 characters, with an uppercase letter and a number.';
    case 'LimitExceededException':
      return 'Too many attempts. Wait a minute and try again.';
    default:
      return error.message || 'Something went wrong signing in.';
  }
}
