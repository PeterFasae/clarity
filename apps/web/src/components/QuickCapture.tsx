import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Mic, MicOff, Square } from 'lucide-react';
import { deriveTitle } from '@clarity/core';
import { Button } from '@/components/ui/button';
import { useCreateNote } from '@/hooks/useNotes';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { ApiError } from '@/lib/api';

/**
 * Quick capture — the thing the whole product is arranged around.
 *
 * ⌘N focuses this box from anywhere. ⌘↵ saves it. There is no title field, no
 * folder picker and no tag prompt, because every one of those is an
 * executive-function tax charged at the exact moment attention is lowest. The
 * title comes from the first line; you can change it later or never.
 *
 * Nothing here blocks on the network. The box clears the moment the request
 * goes out, so the next thought can go straight in behind it, and a failure
 * puts the text back rather than losing it.
 */
export function QuickCapture() {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createNote = useCreateNote();
  const speech = useSpeechRecognition();

  // ⌘N / Ctrl+N from anywhere. The browser's own "new window" is a rarely-used
  // shortcut and this is the app's central action, so taking it is the right
  // trade — but only when focus is not already in a text field, so it never
  // interrupts someone mid-sentence somewhere else.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'n' || !(event.metaKey || event.ctrlKey)) return;

      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        (target instanceof HTMLTextAreaElement && target !== textareaRef.current) ||
        target?.isContentEditable;
      if (typing) return;

      event.preventDefault();
      textareaRef.current?.focus();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Dictation appends into whatever is already typed, so voice and keyboard
  // can be swapped mid-thought. Only finalised text lands in the box; the
  // interim guess is shown below it, so typing over a half-heard phrase cannot
  // bake it into the note.
  const { transcript, reset: resetSpeech } = speech;
  useEffect(() => {
    if (!transcript) return;
    setContent((current) => (current ? `${current.trimEnd()} ${transcript}` : transcript));
    resetSpeech();
  }, [transcript, resetSpeech]);

  function save() {
    const text = content.trim();
    if (!text || createNote.isPending) return;

    setContent('');
    setError(null);

    createNote.mutate(
      { content: text },
      {
        onSuccess: (note) => {
          setJustSaved(note.title);
          window.setTimeout(() => setJustSaved(null), 4000);
        },
        onError: (caught) => {
          // Never swallow what someone wrote.
          setContent(text);
          setError(caught instanceof ApiError ? caught.readable : 'Could not save that. It is still in the box.');
          textareaRef.current?.focus();
        },
      },
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  }

  const previewTitle = content.trim() ? deriveTitle(content) : '';

  return (
    <section aria-labelledby="capture-heading" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="capture-heading" className="mb-0 text-lg">
          What&rsquo;s on your mind?
        </h2>
        <p className="text-sm text-muted-foreground">
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">⌘N</kbd> from
          anywhere ·{' '}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">⌘↵</kbd> to save
        </p>
      </div>

      <label htmlFor="capture" className="sr-only">
        Write a note. It saves with ⌘ and Enter.
      </label>
      <textarea
        id="capture"
        ref={textareaRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={onKeyDown}
        rows={4}
        placeholder="Type it, say it, paste it. Nothing else to fill in."
        aria-describedby="capture-title-preview"
        className="w-full resize-y rounded-lg border border-input bg-background p-3 text-base leading-relaxed outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} disabled={!content.trim() || createNote.isPending}>
          {createNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Save
        </Button>

        {speech.supported ? (
          <Button
            type="button"
            variant={speech.listening ? 'secondary' : 'outline'}
            onClick={speech.listening ? speech.stop : speech.start}
            aria-pressed={speech.listening}
          >
            {speech.listening ? (
              <>
                <Square className="mr-2 h-4 w-4" aria-hidden="true" />
                Stop dictating
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
                Dictate
              </>
            )}
          </Button>
        ) : (
          // No dead microphone. The control is absent and the reason is stated.
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <MicOff className="h-4 w-4" aria-hidden="true" />
            Dictation needs Chrome or Edge. Typing works everywhere.
          </p>
        )}

        <p id="capture-title-preview" className="ml-auto text-sm text-muted-foreground">
          {previewTitle ? `Saves as “${previewTitle}”` : 'The first line becomes the title.'}
        </p>
      </div>

      <div aria-live="polite" className="mt-2 min-h-[1.5rem] text-sm">
        {speech.listening && (
          <span className="text-muted-foreground">
            Listening…{speech.interim && <span className="italic"> {speech.interim}</span>}
          </span>
        )}
        {speech.error && <span className="text-destructive">{speech.error}</span>}
        {error && <span className="text-destructive">{error}</span>}
        {justSaved && <span className="text-muted-foreground">Saved “{justSaved}”.</span>}
      </div>
    </section>
  );
}
