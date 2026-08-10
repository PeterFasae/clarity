import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { LOCAL_AUTH, cognitoIsConfigured } from '@/lib/config';

/**
 * Sign in, sign up, and the confirmation code in between.
 *
 * One screen with one job at a time. No marketing, no feature tour, no
 * "welcome back!" — this audience did not come here to read, and the fastest
 * possible route to their notes is the whole point of the product.
 */

type Mode = 'sign-in' | 'sign-up' | 'confirm';

export function SignIn() {
  const { signIn, signUp, confirmSignUp } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else if (mode === 'sign-up') {
        const { confirmed } = await signUp(email, password);
        if (!confirmed) {
          setMode('confirm');
          setNotice('Check your email for a six-digit code.');
        }
      } else {
        await confirmSignUp(email, code);
        await signIn(email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const heading =
    mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Make an account' : 'Confirm your email';

  const unavailable = !LOCAL_AUTH && !cognitoIsConfigured;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl">Clarity</h1>
        <p className="mb-8 text-muted-foreground">
          Notes that don&rsquo;t ask you to be organised first.
        </p>

        {unavailable ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            Sign-in is not configured for this build. Set the Cognito environment variables, or
            run against the local API.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <h2 className="mb-6 text-xl">{heading}</h2>

            <div className="mb-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={mode === 'confirm'}
                className="mt-1.5"
              />
            </div>

            {mode !== 'confirm' && (
              <div className="mb-4">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  required
                  className="mt-1.5"
                  aria-describedby={mode === 'sign-up' ? 'password-help' : undefined}
                />
                {mode === 'sign-up' && (
                  <p id="password-help" className="mt-1.5 text-sm text-muted-foreground">
                    At least 12 characters, with an uppercase letter and a number.
                  </p>
                )}
              </div>
            )}

            {mode === 'confirm' && (
              <div className="mb-4">
                <Label htmlFor="code">Confirmation code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                  className="mt-1.5"
                />
              </div>
            )}

            {/* Announced, so a screen reader hears the failure rather than the
                form silently doing nothing. */}
            <div aria-live="polite">
              {notice && <p className="mb-4 text-sm text-muted-foreground">{notice}</p>}
              {error && (
                <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Confirm'}
            </Button>

            {mode !== 'confirm' && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === 'sign-in' ? 'No account yet?' : 'Already have one?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                    setError(null);
                    setNotice(null);
                  }}
                  className="rounded font-bold text-primary underline underline-offset-2"
                >
                  {mode === 'sign-in' ? 'Make one' : 'Sign in'}
                </button>
              </p>
            )}

            {LOCAL_AUTH && (
              <p className="mt-8 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                Development build: this signs you in locally against the API on your own machine.
                Any email and password will do — the email decides which set of notes you get.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
