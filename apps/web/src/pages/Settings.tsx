import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Font, Motion, TextSize, Theme } from '@clarity/core';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/context/PreferencesContext';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/lib/api';

/**
 * Settings.
 *
 * Personalisation here is cognitive empowerment rather than decoration — the
 * interface adapting to the person instead of the person adapting to it — so
 * every one of these is a first-class control, not something buried behind an
 * "advanced" disclosure.
 *
 * Each choice applies the moment it is made. There is no Save button, because
 * a settings page you can get wrong is a settings page people avoid.
 */

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'The default.' },
  { value: 'dark', label: 'Dark', hint: 'Dimmed rather than inverted, to avoid glare.' },
  { value: 'high-contrast', label: 'High contrast', hint: 'Black on white, hard edges.' },
  { value: 'low-stimulation', label: 'Low stimulation', hint: 'Muted, quiet, almost no colour.' },
];

const FONTS: { value: Font; label: string; hint: string }[] = [
  { value: 'atkinson', label: 'Atkinson Hyperlegible', hint: 'Designed so similar letters stay distinct.' },
  { value: 'dyslexic', label: 'OpenDyslexic', hint: 'Weighted bottoms; helps some readers, not all.' },
  { value: 'system', label: 'Your system font', hint: 'Whatever the rest of your device uses.' },
];

const SIZES: { value: TextSize; label: string }[] = [
  { value: 's', label: 'Small' },
  { value: 'm', label: 'Medium' },
  { value: 'l', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

const MOTIONS: { value: Motion; label: string; hint: string }[] = [
  { value: 'full', label: 'Movement on', hint: 'Gentle fades and slides.' },
  { value: 'reduced', label: 'Movement off', hint: 'Nothing animates, anywhere.' },
];

export function Settings() {
  const preferences = usePreferences();
  const { account, signOut } = useAuth();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function exportEverything() {
    setBusy('export');
    setError(null);
    try {
      const data = await api.exportEverything();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `clarity-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.readable : 'Could not build the export.');
    } finally {
      setBusy(null);
    }
  }

  async function deleteEverything() {
    setBusy('delete');
    setError(null);
    try {
      await api.deleteAccount();
      signOut();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.readable : 'Could not delete the account.');
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 lg:p-6">
      <h1>Settings</h1>
      <p className="-mt-2 mb-2 text-muted-foreground">
        These follow you to any device you sign in on.
      </p>
      <p aria-live="polite" className="mb-8 text-sm text-muted-foreground">
        {preferences.syncState === 'saving' && 'Saving…'}
        {preferences.syncState === 'synced' && 'Saved to your account.'}
        {preferences.syncState === 'failed' &&
          'Saved on this device only — could not reach your account.'}
        {preferences.syncState === 'local' && 'Saved on this device.'}
      </p>

      <Choice
        legend="Theme"
        options={THEMES}
        value={preferences.theme}
        onChange={(theme) => preferences.set({ theme })}
      />

      <Choice
        legend="Typeface"
        options={FONTS}
        value={preferences.font}
        onChange={(font) => preferences.set({ font })}
      />

      <Choice
        legend="Text size"
        options={SIZES}
        value={preferences.textSize}
        onChange={(textSize) => preferences.set({ textSize })}
      />

      <Choice
        legend="Movement"
        options={MOTIONS}
        value={preferences.motion}
        onChange={(motion) => preferences.set({ motion })}
        note={
          preferences.systemReducedMotion
            ? 'Your device already asks for less movement. This overrides it either way.'
            : undefined
        }
      />

      <section aria-labelledby="ai-heading" className="mb-10">
        <h2 id="ai-heading">AI assistance</h2>
        <p className="text-muted-foreground">
          Off. Summaries, the things-to-do list and search all run on our own servers with no third
          party involved. Turning this on would send the text of your notes to Anthropic to produce
          a better summary — so it stays off until there is a consent screen worth reading, which
          is the next phase of work.
        </p>
      </section>

      <section aria-labelledby="data-heading" className="mb-10">
        <h2 id="data-heading">Your data</h2>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </p>
        )}

        <Button type="button" variant="outline" onClick={() => void exportEverything()} disabled={busy !== null}>
          {busy === 'export' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Download everything
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Every note and every setting, as plain JSON. Yours to keep, whatever happens to us.
        </p>

        <div className="mt-6 rounded-lg border border-destructive/30 p-4">
          <h3 className="text-base">Delete your account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Every note and setting, gone for good. There is no bin and no undo.
          </p>

          {confirmingDelete ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" variant="destructive" onClick={() => void deleteEverything()} disabled={busy !== null}>
                {busy === 'delete' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Yes, delete everything
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="mt-3" onClick={() => setConfirmingDelete(true)}>
              Delete my account
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="account-heading">
        <h2 id="account-heading">Account</h2>
        <p className="text-muted-foreground">{account?.email}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={signOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}

/**
 * A radio group that looks like buttons. Radios rather than a select or a
 * segmented div, because the browser already gives them arrow-key navigation,
 * a group label and a correct announcement — and nothing hand-rolled here
 * would do it better.
 */
function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  note,
}: {
  legend: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  note?: string;
}) {
  return (
    <fieldset className="mb-10">
      <legend className="mb-3 text-xl font-bold">{legend}</legend>
      {note && <p className="mb-3 text-sm text-muted-foreground">{note}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${legend}-${option.value}`.replace(/\s+/g, '-').toLowerCase();
          const selected = option.value === value;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                selected ? 'border-primary bg-accent' : 'border-border'
              }`}
            >
              <input
                id={id}
                type="radio"
                name={legend}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                <span className="block font-bold">{option.label}</span>
                {option.hint && (
                  <span className="block text-sm text-muted-foreground">{option.hint}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
