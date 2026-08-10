import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";

/**
 * Focus mode — the signature moment. Activating it collapses the ENTIRE marketing
 * page (nav, sections, footer) behind a calm overlay showing one note. This
 * demonstrates the product feature by performing it on the site itself.
 *
 * Accessibility:
 *  - Esc exits; a visible exit control is always present.
 *  - Focus is trapped inside the overlay and restored to the trigger on exit.
 *  - Enter/exit is announced via an aria-live region.
 *  - Under reduced motion, the fade becomes an instant state change (still works).
 */

interface FocusModeApi {
  active: boolean;
  enter: (note?: string) => void;
  exit: () => void;
}

const FocusModeContext = createContext<FocusModeApi | undefined>(undefined);

const DEFAULT_NOTE =
  "Everything else is gone now — just this one note, and space to think.\n\nThis is focus mode. In the app it hides every other note, the sidebar, and the chrome, so there's nothing to pull your attention away.\n\nType here if you like. Press Esc, or use the button, to bring the page back.";

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const { motion } = usePreferences();
  const [active, setActive] = useState(false);
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [announce, setAnnounce] = useState("");

  const triggerRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // `inert` isn't in React 18's JSX types, so toggle it imperatively. This fully
  // removes the backdrop from tab order + the accessibility tree while active.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (active) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }, [active]);

  const enter = useCallback(
    (initial?: string) => {
      triggerRef.current = document.activeElement as HTMLElement | null;
      if (initial !== undefined) setNote(initial);
      setActive(true);
      setAnnounce("Focus mode on. The rest of the page is hidden.");
    },
    [],
  );

  const exit = useCallback(() => {
    setActive(false);
    setAnnounce("Focus mode off. The page is back.");
    // Restore focus to whatever opened it.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Esc to exit + focus trap while active.
  useEffect(() => {
    if (!active) return;

    // Move focus into the overlay.
    requestAnimationFrame(() => textareaRef.current?.focus());

    // Lock body scroll.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, exit]);

  const instant = motion === "reduced";

  return (
    <FocusModeContext.Provider value={{ active, enter, exit }}>
      {/* App content — hidden from AT + made inert while focus mode is on. */}
      <div
        ref={contentRef}
        aria-hidden={active ? "true" : undefined}
        className={
          instant
            ? active
              ? "invisible"
              : ""
            : "transition-opacity duration-500 ease-out " +
              (active ? "pointer-events-none opacity-0" : "opacity-100")
        }
      >
        {children}
      </div>

      {/* Live region for screen readers. */}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {active && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Focus mode"
          className={
            "fixed inset-0 z-50 flex items-center justify-center bg-bg px-6 " +
            (instant ? "" : "animate-fade-rise")
          }
        >
          <button
            type="button"
            onClick={exit}
            className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-base font-bold text-ink-muted hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            Exit focus mode
            <kbd className="ml-1 rounded border border-line px-1.5 py-0.5 text-sm">
              Esc
            </kbd>
          </button>

          <div className="w-full max-w-2xl">
            <label htmlFor="focus-note" className="sr-only">
              Your note
            </label>
            <textarea
              id="focus-note"
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              spellCheck={false}
              className="min-h-[50vh] w-full resize-none border-0 bg-transparent text-xl leading-relaxed text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
        </div>
      )}
    </FocusModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFocusMode(): FocusModeApi {
  const ctx = useContext(FocusModeContext);
  if (!ctx) throw new Error("useFocusMode must be used within FocusModeProvider");
  return ctx;
}
