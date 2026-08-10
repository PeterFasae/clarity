import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Account, currentAccount, signIn as doSignIn, signOut as doSignOut, signUp as doSignUp, confirmSignUp as doConfirm } from '@/lib/session';

/**
 * Who is signed in.
 *
 * `userId` never travels in a request — the API reads it from the token's
 * `sub` and nothing else. This context exists so the UI knows whether to show
 * the app or the sign-in screen, not so it can tell the server who it is.
 */

type Status = 'loading' | 'signed-in' | 'signed-out';

interface AuthApi {
  status: Status;
  account: Account | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ confirmed: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void | Promise<void>;
}

const AuthContext = createContext<AuthApi | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let cancelled = false;

    currentAccount()
      .then((found) => {
        if (cancelled) return;
        setAccount(found);
        setStatus(found ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (!cancelled) setStatus('signed-out');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const found = await doSignIn(email, password);
    setAccount(found);
    setStatus('signed-in');
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await doSignUp(email, password);
    // The local identity signs straight in; Cognito needs the emailed code first.
    if (result.confirmed) {
      const found = await currentAccount();
      if (found) {
        setAccount(found);
        setStatus('signed-in');
      }
    }
    return result;
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    await doConfirm(email, code);
  }, []);

  const signOut = useCallback(async () => {
    // Clear locally first: a network hiccup on the way out should never leave
    // someone looking at an account they meant to leave.
    setAccount(null);
    setStatus('signed-out');
    await doSignOut();
  }, []);

  const value = useMemo(
    () => ({ status, account, signIn, signUp, confirmSignUp, signOut }),
    [status, account, signIn, signUp, confirmSignUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
