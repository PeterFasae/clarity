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
 * timer. The timer counts up rather than down, and nothing happens when it
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

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const { motion } = usePreferences();
  const updateNote = useUpdateNote();

  const [note, setNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState('');
  const [announce, setAnnounce] = useState('');
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const triggerRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef('');

  const active = note !== null;
  draftRef.current = draft;

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
    setNote(target);
    setDraft(target.content);
    setSaved(false);
    setElapsed(null);
    setAnnounce('Focus mode on. Everything else is hidden.');
  }, []);

  const exit = useCallback(() => {
    const current = note;
    const text = draftRef.current;

    if (current && text !== current.content && text.trim().length > 0) {
      updateNote.mutate({ id: current.id, content: text });
    }

    setNote(null);
    setElapsed(null);
    setAnnounce('Focus mode off. Everything is back.');
    // Back to whatever opened it — losing your place is the thing focus mode
    // is supposed to prevent, not cause.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [note, updateNote]);

  // Esc, and the focus trap.
  useEffect(() => {
    if (!active) return;

    requestAnimationFrame(() => textareaRef.current?.focus());

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exit();
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
    if (elapsed === null) return;
    const id = window.setInterval(() => setElapsed((value) => (value ?? 0) + 1), 1000);
    return () => window.clearInterval(id);
  }, [elapsed === null]);

  function saveNow() {
    if (!note) return;
    updateNote.mutate(
      { id: note.id, content: draft },
      {
        onSuccess: () => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2500);
        },
      },
    );
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
              <Button type="button" variant="ghost" onClick={saveNow}>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Save
              </Button>
              <Button type="button" variant="outline" onClick={exit}>
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Exit
                <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs">Esc</kbd>
              </Button>
            </div>
          </div>

          <div className="mt-8 w-full max-w-2xl flex-1">
            <label htmlFor="focus-note" className="sr-only">
              {note.title}
            </label>
            <textarea
              id="focus-note"
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={saveNow}
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
