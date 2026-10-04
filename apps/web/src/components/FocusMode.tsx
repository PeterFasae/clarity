import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check, Timer, X } from 'lucide-react';
import type { Note } from '@clarity/core';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/context/PreferencesContext';
import { useUpdateNote } from '@/hooks/useNotes';
import { ApiError } from '@/lib/api';
import { isBlank, saveDraft, type SaveOutcome } from '@/lib/draft';

/**
 * Focus mode — ported from the marketing site, where it was already finished
 * and genuinely accessible, and wired to a real note.
 *
 * What came across unchanged, because it was right:
 *  - Esc exits, and there is always a visible exit control too.
 *  - Focus moves into the overlay, is trapped there, and returns to whatever
 *    opened it.
 *  - The rest of the app is set `inert` and hidden from assistive technology,
 *    so it is gone for a screen reader too, not just visually.
 *  - Entering and leaving are announced through an aria-live region.
 *  - Under reduced motion the fade becomes an instant state change.
 *
 * What is new here: it holds a real note and saves it, and there is an optional
 * timer. Leaving never discards writing that has not been saved: if the save
 * fails, for any reason, focus mode stays open with the words still in it and
 * says so in plain language. The timer counts up rather than down, and nothing happens when it
 * reaches a number — a countdown that runs out is a small failure event, and
 * design rule 6 rules out anything that works by making you feel behind.
 */

interface FocusModeApi {
  active: boolean;
  enter: (note: Note) => void;
  exit: () => void;
}

const FocusModeContext = createContext<FocusModeApi | undefined>(undefined);

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** What to tell someone when a save did not work. It always says the writing is safe. */
function whyNotSaved(error: unknown): string {
  if (error instanceof ApiError) {
    return error.code === 'offline' ? error.readable : `${error.readable} Your writing is still here.`;
  }
  return 'Could not save that. Your writing is still here.';
}

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const { motion } = usePreferences();
  const updateNote = useUpdateNote();

  const [note, setNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState('');
  const [announce, setAnnounce] = useState('');
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const triggerRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef('');
  const noteRef = useRef<Note | null>(null);
  // What the server last accepted, so a draft is only sent when it differs.
  const savedRef = useRef('');
  const inflightRef = useRef<Promise<SaveOutcome> | null>(null);
  const leavingRef = useRef(false);

  const active = note !== null;
  const timerRunning = elapsed !== null;
  draftRef.current = draft;
  noteRef.current = note;

  // `inert` is not in React 18's JSX types, so it is set imperatively. It takes
  // the backdrop out of the tab order and out of the accessibility tree at once.
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    if (active) element.setAttribute('inert', '');
    else element.removeAttribute('inert');
  }, [active]);

  const enter = useCallback((target: Note) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    savedRef.current = target.content;
    setNote(target);
    setDraft(target.content);
    setSaved(false);
    setSaveError(null);
    setElapsed(null);
    setAnnounce('Focus mode on. Everything else is hidden.');
  }, []);

  /**
   * Save the draft if it needs saving. One save at a time: a blur and an Exit
   * arrive together, and sending the same words twice helps nobody. The outcome
   * is returned and shown, never thrown, so nothing downstream can close the
   * overlay as though a failed save had worked.
   */
  const persist = useCallback(async (): Promise<SaveOutcome> => {
    while (inflightRef.current) await inflightRef.current;

    const target = noteRef.current;
    if (!target) return { ok: true, sent: false };

    const attempt = saveDraft({
      draft: draftRef.current,
      saved: savedRef.current,
      messageFor: whyNotSaved,
      save: async (text) => {
        await updateNote.mutateAsync({ id: target.id, content: text });
        savedRef.current = text;
      },
    });

    inflightRef.current = attempt;
    try {
      const outcome = await attempt;
      // `in`, not `.ok`: this app compiles without strictNullChecks, where a
      // boolean tag does not narrow a union.
      setSaveError('message' in outcome ? outcome.message : null);
      return outcome;
    } finally {
      inflightRef.current = null;
    }
  }, [updateNote]);

  const hasUnsaved = useCallback(
    () => draftRef.current !== savedRef.current && !isBlank(draftRef.current),
    [],
  );

  const exit = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    try {
      // Words typed while a save was on its way are saved too, a few times at
      // most, rather than being left behind when the overlay closes.
      for (let attempt = 0; attempt < 3; attempt++) {
        const outcome = await persist();
        if ('message' in outcome) {
          setAnnounce('Not saved. You are still in focus mode and your writing is still here.');
          textareaRef.current?.focus();
          return;
        }
        if (!hasUnsaved()) break;
      }
      if (hasUnsaved()) {
        setAnnounce('Still saving. You are still in focus mode.');
        return;
      }

      setNote(null);
      setElapsed(null);
      setSaveError(null);
      setAnnounce('Focus mode off. Everything is back.');
      // Back to whatever opened it — losing your place is the thing focus mode
      // is supposed to prevent, not cause.
      requestAnimationFrame(() => triggerRef.current?.focus());
    } finally {
      leavingRef.current = false;
    }
  }, [persist, hasUnsaved]);

  // Esc, and the focus trap.
  useEffect(() => {
    if (!active) return;

    requestAnimationFrame(() => textareaRef.current?.focus());

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void exit();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [active, exit]);

  // The timer, when it is running.
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setElapsed((value) => (value ?? 0) + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  async function saveNow() {
    const outcome = await persist();
    if ('sent' in outcome && outcome.sent) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  const instant = motion === 'reduced';

  return (
    <FocusModeContext.Provider value={{ active, enter, exit }}>
      <div
        ref={contentRef}
        aria-hidden={active ? 'true' : undefined}
        className={
          instant
            ? active
              ? 'invisible'
              : ''
            : `transition-opacity duration-500 ease-out ${active ? 'pointer-events-none opacity-0' : 'opacity-100'}`
        }
      >
        {children}
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {active && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Focus mode"
          className="fixed inset-0 z-50 flex flex-col items-center bg-background px-6 py-6"
        >
          <div className="flex w-full max-w-2xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setElapsed((value) => (value === null ? 0 : null))}
                aria-pressed={elapsed !== null}
              >
                <Timer className="mr-2 h-4 w-4" aria-hidden="true" />
                {elapsed === null ? 'Start a timer' : formatElapsed(elapsed)}
              </Button>
              {elapsed !== null && (
                <span className="sr-only" aria-live="polite">
                  Timer running.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span aria-live="polite" className="text-sm text-muted-foreground">
                {updateNote.isPending ? 'Saving…' : saved ? 'Saved' : ''}
              </span>
              <Button type="button" variant="ghost" onClick={() => void saveNow()}>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => void exit()}>
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Exit
                <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs">Esc</kbd>
              </Button>
            </div>
          </div>

          {saveError && (
            <p
              role="alert"
              className="mt-4 w-full max-w-2xl rounded-lg border border-destructive p-3 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}

          <div className="mt-8 w-full max-w-2xl flex-1">
            <label htmlFor="focus-note" className="sr-only">
              {note.title}
            </label>
            <textarea
              id="focus-note"
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void saveNow()}
              spellCheck
              className="h-full min-h-[60vh] w-full resize-none border-0 bg-transparent text-xl leading-relaxed text-foreground outline-none"
            />
          </div>
        </div>
      )}
    </FocusModeContext.Provider>
  );
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFocusMode(): FocusModeApi {
  const context = useContext(FocusModeContext);
  if (!context) throw new Error('useFocusMode must be used within a FocusModeProvider');
  return context;
}
