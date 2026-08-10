import { useEffect, useRef } from 'react';
import { useNoteList } from './useNotes';

/**
 * Reminders, for as long as the tab is open.
 *
 * This is deliberately modest and the UI says so: it checks the notes it
 * already has and raises a browser notification when one comes due. There is
 * no service worker and no push, so nothing fires when Clarity is closed.
 *
 * Saying that plainly matters more than the feature does. A reminder you
 * believe in and that does not arrive is worse than no reminder at all — this
 * audience has been let down by exactly that, repeatedly.
 */

const CHECK_EVERY_MS = 30_000;
const SEEN_KEY = 'clarity.reminders-fired.v1';

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function useReminders(enabled: boolean) {
  const { data } = useNoteList();
  const seen = useRef<Set<string>>(readSeen());

  useEffect(() => {
    if (!enabled || !data?.notes.length) return;
    if (typeof Notification === 'undefined') return;

    function check() {
      const now = Date.now();

      for (const note of data?.notes ?? []) {
        for (const reminder of note.reminders) {
          const key = `${note.id}:${reminder}`;
          const due = new Date(reminder).getTime();

          // Only fire for something that has just come due — not for every
          // missed reminder since the last time the tab was open, which would
          // be a wall of notifications and exactly the wrong thing.
          if (seen.current.has(key) || due > now || now - due > 60 * 60 * 1000) continue;

          seen.current.add(key);
          try {
            localStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current]));
          } catch {
            // Not being able to remember means it might fire twice. Tolerable.
          }

          if (Notification.permission === 'granted') {
            new Notification(note.title, {
              body: note.summary || note.content.slice(0, 120),
              tag: key,
            });
          }
        }
      }
    }

    check();
    const id = window.setInterval(check, CHECK_EVERY_MS);
    return () => window.clearInterval(id);
  }, [enabled, data]);
}

/** Asked for on a click, never on load — an unprompted permission dialog is a jump-scare. */
export async function askForNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}
