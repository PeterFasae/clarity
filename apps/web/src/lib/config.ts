/**
 * Everything environment-shaped, in one place. Nothing here is hardcoded to a
 * deployment — the values come from Vite env vars, and `.env.example` lists
 * every one of them.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/dev';

export const COGNITO = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
};

export const cognitoIsConfigured = Boolean(COGNITO.userPoolId && COGNITO.clientId);

/**
 * The local development sign-in.
 *
 * `serverless offline` does not verify a JWT's signature — API Gateway does
 * that, and it happens before a Lambda is ever invoked — so running the app
 * against the local API only needs a token with a `sub` in it. This lets the
 * whole product work with nothing deployed and no user pool.
 *
 * Two locks on it: the env var has to be set, and `import.meta.env.DEV` is
 * false in a production build, so Vite removes the branch entirely. A token
 * minted here would be rejected by the real gateway anyway.
 */
export const LOCAL_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_AUTH === 'true';
