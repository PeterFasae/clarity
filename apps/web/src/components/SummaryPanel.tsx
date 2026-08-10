import { useState } from 'react';
import { ChevronDown, Loader2, RefreshCw, Volume2, X } from 'lucide-react';
import type { Note } from '@clarity/core';
import { Button } from '@/components/ui/button';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSummarizeNote } from '@/hooks/useNotes';

/**
 * The summary, beside the original rather than instead of it.
 *
 * This panel sits above the note body and can be collapsed or dismissed, and
 * the body underneath is never touched. That arrangement is the point: the
 * user stays in charge of simplification, and their own words are always still
 * there. The predecessor's summariser overwrote the note with its summary —
 * this component is the visual promise that it does not.
 *
 * The engine that produced it is labelled, because "a computer wrote this" and
 * "a language model wrote this" are different claims and the user is entitled
 * to know which one they are looking at.
 */
export function SummaryPanel({ note }: { note: Note }) {
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(true);
  const summarize = useSummarizeNote();
  const speech = useSpeechSynthesis();

  if (dismissed || !note.summary) return null;

  const fromLlm = note.summarySource === 'llm';

  return (
    <section
      aria-labelledby={`summary-heading-${note.id}`}
      className="mb-5 rounded-lg border border-border bg-muted/40 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={`summary-body-${note.id}`}
          className="inline-flex items-center gap-2 rounded font-bold"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          <span id={`summary-heading-${note.id}`}>Summary</span>
        </button>

        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {fromLlm ? 'Written by AI assistance' : 'Picked from your own sentences'}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {speech.supported && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => (speech.speaking ? speech.stop() : speech.speak(note.summary))}
              aria-pressed={speech.speaking}
            >
              <Volume2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {speech.speaking ? 'Stop' : 'Read aloud'}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => summarize.mutate({ id: note.id })}
            disabled={summarize.isPending}
          >
            {summarize.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Redo
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss the summary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {open && (
        <div id={`summary-body-${note.id}`} className="mt-3">
          <p className="leading-relaxed">{note.summary}</p>

          {note.actions.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-base">Things to do, lifted out</h3>
              <ul className="space-y-1">
                {note.actions.map((action) => (
                  <li key={action} className="flex gap-2">
                    <span aria-hidden="true" className="text-muted-foreground">
                      —
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
            Your note is untouched below. This is a shortcut back into it, not a replacement.
          </p>
        </div>
      )}
    </section>
  );
}
