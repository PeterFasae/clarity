import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type Preferences } from '@clarity/core';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

/**
 * Preferences — ported from the marketing site's version and extended to the
 * full set, then given a server to sync with.
 *
 * The pattern is unchanged and is the reason it was worth porting: state goes
 * onto <html> as data attributes, and CSS does all the rendering. No component
 * anywhere asks "what theme is this?" — they just describe themselves and the
 * stylesheet answers.
 *
 * localStorage is the offline cache and the pre-login source, so the interface
 * is already right on the first paint. The server is the cross-device record:
 * once signed in, what it holds wins, because that is what "set it once and it
 * follows you" has to mean. No cookies, which is why there is no cookie banner.
 */

const KEY = 'clarity.preferences.v1';
/** Long enough that a run of clicks is one write, short enough to feel saved. */
const SYNC_DELAY_MS = 600;

interface PreferencesApi extends Preferences {
  set: (patch: Partial<Preferences>) => void;
  /** True when the OS asked for reduced motion, used to seed the first value. */
  systemReducedMotion: boolean;
  /** Whether the last write reached the server. Drives the honest status line. */
  syncState: 'local' | 'saving' | 'synced' | 'failed';
}

const PreferencesContext = createContext<PreferencesApi | undefined>(undefined);

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function readCache(): Partial<Preferences> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
  } catch {
    return {};
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const systemReducedMotion = systemPrefersReducedMotion();

  const [preferences, setPreferences] = useState<Preferences>(() => ({
    ...DEFAULT_PREFERENCES,
    // An OS that already asked for less motion gets it without being asked
    // twice — but only until the user makes their own choice, which the cache
    // then carries forward in both directions.
    ...(systemReducedMotion ? { motion: 'reduced' as const } : {}),
    ...readCache(),
  }));

  const [syncState, setSyncState] = useState<PreferencesApi['syncState']>('local');
  const pending = useRef<number | undefined>(undefined);

  // Reflect onto <html>. Everything visual follows from these four attributes.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.dataset.font = preferences.font;
    root.dataset.textSize = preferences.textSize;
    // Both directions: the class turns motion off whatever the OS says, and
    // data-motion="full" turns it back on against the media query.
    root.dataset.motion = preferences.motion;
    root.classList.toggle('reduce-motion', preferences.motion === 'reduced');
    // shadcn's own components key off `.dark`, so keep it in step.
    root.classList.toggle('dark', preferences.theme === 'dark' || preferences.theme === 'low-stimulation');
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(preferences));
    } catch {
      // Private browsing, or storage full. Preferences still apply for this
      // session; they just will not survive a reload.
    }
  }, [preferences]);

  // On sign-in, adopt what the account has. This is the step that makes
  // settings follow a user to a second device.
  useEffect(() => {
    if (status !== 'signed-in') return;
    let cancelled = false;

    api
      .getPreferences()
      .then((stored) => {
        if (cancelled) return;
        setPreferences(stored);
        setSyncState('synced');
      })
      .catch(() => {
        if (!cancelled) setSyncState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const set = useCallback(
    (patch: Partial<Preferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };

        if (status === 'signed-in') {
          setSyncState('saving');
          window.clearTimeout(pending.current);
          pending.current = window.setTimeout(() => {
            api
              .updatePreferences(patch)
              .then(() => setSyncState('synced'))
              .catch(() => setSyncState('failed'));
          }, SYNC_DELAY_MS);
        }

        return next;
      });
    },
    [status],
  );

  useEffect(() => () => window.clearTimeout(pending.current), []);

  const value = useMemo(
    () => ({ ...preferences, set, systemReducedMotion, syncState }),
    [preferences, set, systemReducedMotion, syncState],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferencesApi {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
}
