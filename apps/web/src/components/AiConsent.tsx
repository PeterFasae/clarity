import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/context/PreferencesContext';
import { ApiError, api } from '@/lib/api';

/**
 * The AI assistance switch, and the consent that has to come before it.
 *
 * The copy says the one thing that actually matters and says it first: turning
 * this on sends the text of your notes to another company. No "enhanced
 * experience", no "powered by", no burying it under a list of benefits. This
 * audience is over-surveilled in academic and work settings already, and the
 * whole privacy claim rests on the flag being a real, informed choice.
 *
 * The server enforces the same rule — it refuses `aiEnabled: true` without a
 * consent timestamp on the record — so this screen is where consent is *given*,
 * not where it is *checked*.
 */
export function AiConsent() {
  const preferences = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recomputed, setRecomputed] = useState<number | null>(null);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      await api.updatePreferences({ aiEnabled: true, aiConsentedAt: new Date().toISOString() });
      preferences.set({ aiEnabled: true, aiConsentedAt: new Date().toISOString() });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.readable : 'Could not switch that on.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Turning it off puts the switch back immediately, then offers to rewrite the
   * summaries it produced. Those stay accurate either way — they came out of
   * the user's own notes — but "off" should be able to mean that nothing on the
   * screen is a product of the thing you just switched off.
   */
  async function turnOffAndRecompute() {
    setBusy(true);
    setError(null);
    setRecomputed(null);

    try {
      await api.updatePreferences({ aiEnabled: false });
      preferences.set({ aiEnabled: false });

      const { notes } = await api.listNotes({ limit: 100 });
      const written = notes.filter((note) => note.summarySource === 'llm');

      for (const note of written) {
        await api.summarizeNote(note.id, 'local');
      }
      setRecomputed(written.length);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.readable
          : 'Switched off, but some summaries could not be rewritten.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ai-heading" className="mb-10">
      <h2 id="ai-heading">AI assistance</h2>

      {preferences.aiEnabled ? (
        <>
          <p className="text-muted-foreground">
            On. When you save a note, its text is sent to Anthropic, which writes the summary and
            picks out the things to do. Everything else — search, and the notes themselves — still
            stays on our servers.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => void turnOffAndRecompute()}
            disabled={busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Switch it off and rewrite those summaries here
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border p-4">
            <p className="font-bold">Before you turn this on, the part that matters:</p>
            <p className="mt-2 text-muted-foreground">
              Right now nothing you write leaves our servers. Summaries, the things-to-do list and
              search all run on our own machines, with no third party involved.
            </p>
            <p className="mt-2 text-muted-foreground">
              If you switch this on, <strong className="text-foreground">the text of every note
              you save is sent to Anthropic</strong>, a separate company, so their model can write a
              better summary than ours can. That is the whole trade: better summaries on messy
              writing, in exchange for your notes leaving here.
            </p>
            <p className="mt-2 text-muted-foreground">
              You can switch it back off at any time, and we will rewrite the affected summaries
              ourselves when you do.
            </p>

            <Button type="button" className="mt-4" onClick={() => void turnOn()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              I understand — switch it on
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Leaving it off costs you nothing else. Every other feature works exactly the same.
          </p>
        </>
      )}

      <div aria-live="polite" className="mt-3 text-sm">
        {recomputed !== null && (
          <p className="text-muted-foreground">
            {recomputed === 0
              ? 'Switched off. Nothing needed rewriting.'
              : `Switched off, and ${recomputed} summar${recomputed === 1 ? 'y' : 'ies'} rewritten here.`}
          </p>
        )}
        {error && <p className="text-destructive">{error}</p>}
      </div>
    </section>
  );
}
