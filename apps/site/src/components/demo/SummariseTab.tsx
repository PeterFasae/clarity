import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
// The production engine, imported directly. There is no site-local copy of the
// summariser any more — this is the same module services/api runs on write, so
// what a visitor sees here is what the product will actually do.
import { splitSentences, summarise } from "@clarity/retrieval";

interface SummaryResult {
  summary: string;
  /** how many sentences the summary kept */
  keptSentenceCount: number;
  /** how many the source had, so the UI can be honest about the ratio */
  sourceSentenceCount: number;
}

// A genuinely messy lecture note — the free-form, half-punctuated input this
// product exists to handle. Editable, so the summary is never hardcoded.
const SAMPLE_NOTE = `so today's lecture was about working memory and honestly I nearly missed the start because the room changed. the main claim is that working memory is basically a limited workspace, like you can only hold a few things at once, the number people used to say was seven but apparently it's more like four now. he kept stressing that it's not about intelligence, it's about capacity, which is a different thing. there was a whole tangent about a guy called Baddeley and his model, phonological loop and visuospatial sketchpad, I didn't fully follow the sketchpad bit. the practical takeaway, and this is the important part for the exam, is that if you overload working memory nothing transfers to long term memory, so chunking information matters a lot, breaking it into smaller groups. also he said external aids like notes literally count as extending your working memory which I thought was a nice way to put it. oh and the reading is chapter four, due before the seminar. I need to actually do it this time.`;

export function SummariseTab() {
  const [note, setNote] = useState(SAMPLE_NOTE);
  const [result, setResult] = useState<SummaryResult | null>(null);

  function handleSummarise() {
    const summary = summarise(note, { maxSentences: 3 });
    setResult({
      summary,
      keptSentenceCount: splitSentences(summary).length,
      sourceSentenceCount: splitSentences(note).length,
    });
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Original — always present, never replaced. */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="demo-note" className="font-bold text-ink">
              Your note
            </label>
            <span className="text-sm text-ink-muted">Editable — paste your own</span>
          </div>
          <textarea
            id="demo-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setResult(null);
            }}
            rows={12}
            className="w-full rounded-lg border border-line bg-surface p-4 text-base leading-relaxed text-ink outline-none focus-visible:border-[#5F49BC]"
          />
        </div>

        {/* Summary — appears beside the original. */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-ink">Summary</span>
            {result && (
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Dismiss
              </button>
            )}
          </div>

          <div
            aria-live="polite"
            className="h-[calc(100%-2.25rem)] min-h-[16rem] rounded-lg border border-line bg-lavender-soft p-4"
          >
            {result ? (
              <>
                <p className="text-base leading-relaxed text-ink">
                  {result.summary}
                </p>
                <p className="mt-4 border-t border-[#5F49BC]/20 pt-3 text-sm text-ink-muted">
                  {result.sourceSentenceCount} sentences &rarr;{" "}
                  {result.keptSentenceCount}. Your original is untouched on the
                  left — you never lose your words.
                </p>
              </>
            ) : (
              <p className="text-ink-muted">
                Press summarise. The condensed version appears here, beside your
                note — not instead of it.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Button onClick={handleSummarise} size="lg" disabled={note.trim().length < 20}>
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Summarise
        </Button>
        <p className="mt-3 max-w-measure text-sm text-ink-muted">
          This runs in your browser, and it is not a canned animation: it is
          literally the same summariser the app runs on the server, imported
          from the same module. It is extractive, so it can only ever pick
          sentences you wrote — it cannot invent a fact that was not in the
          note.
        </p>
      </div>
    </div>
  );
}
