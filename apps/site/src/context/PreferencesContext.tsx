import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Visitor preferences: font family, theme, and motion.
 *
 * Persisted to localStorage ONLY (no cookies -> no cookie banner). These are the
 * same three levers the product promises in-app; offering them on the marketing
 * site itself is part of the pitch, not just a claim.
 */

type Theme = "light" | "dark";
type Font = "default" | "dyslexic";
type Motion = "full" | "reduced";

interface Preferences {
  theme: Theme;
  font: Font;
  motion: Motion;
  /** true when the OS asked for reduced motion (used to seed the initial value) */
  systemReducedMotion: boolean;
  setTheme: (t: Theme) => void;
  setFont: (f: Font) => void;
  setMotion: (m: Motion) => void;
}

const KEY = "ffn.prefs.v1";

const PreferencesContext = createContext<Preferences | undefined>(undefined);

function readStored(): Partial<Record<"theme" | "font" | "motion", string>> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const systemReduced = systemPrefersReducedMotion();

  const [theme, setThemeState] = useState<Theme>(
    stored.theme === "dark" ? "dark" : "light",
  );
  const [font, setFontState] = useState<Font>(
    stored.font === "dyslexic" ? "dyslexic" : "default",
  );
  const [motion, setMotionState] = useState<Motion>(
    stored.motion === "reduced" || (!stored.motion && systemReduced)
      ? "reduced"
      : "full",
  );

  // Reflect state onto <html> so CSS drives the actual rendering.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("font-dyslexic", font === "dyslexic");
    root.classList.toggle("reduce-motion", motion === "reduced");
  }, [theme, font, motion]);

  // Persist.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme, font, motion }));
    } catch {
      /* storage unavailable (private mode); preferences simply won't persist */
    }
  }, [theme, font, motion]);

  const value: Preferences = {
    theme,
    font,
    motion,
    systemReducedMotion: systemReduced,
    setTheme: setThemeState,
    setFont: setFontState,
    setMotion: setMotionState,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
