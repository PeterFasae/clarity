/**
 * What the app does with words a person has typed and not yet saved.
 *
 * A note's text is theirs. Nothing here trims, tidies or reshapes it; the only
 * question these helpers ask of it is whether there is anything there at all.
 * Kept free of React and of the network so the rules can be tested on their own.
 */

/** True when there is nothing to save. This decides; it never changes what is sent. */
export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

/**
 * Put a draft that failed to save back in the box, in front of anything typed
 * since it was sent. The box clears the moment a request goes out so the next
 * thought can go straight in, which means the failure can arrive after someone
 * has started writing. Overwriting that would lose the newer words.
 */
export function restoreAfterFailedSave(original: string, typedSince: string): string {
  return typedSince ? `${original}\n\n${typedSince}` : original;
}

/**
 * Join dictated text onto what is already typed. A space goes in only if the
 * typed text does not already end in whitespace, and nothing the person typed
 * is removed.
 */
export function appendDictation(current: string, transcript: string): string {
  if (!current) return transcript;
  return /\s$/.test(current) ? current + transcript : `${current} ${transcript}`;
}

export type SaveOutcome =
  /** `sent` is false when there was nothing to save. */
  | { ok: true; sent: boolean }
  | { ok: false; message: string };

/**
 * Save a draft if it needs saving, and say plainly whether it worked.
 *
 * A draft needs saving when it differs from what the server last accepted and
 * is not blank (the API refuses an empty note, and clearing the box is not a
 * request to wipe the note). A failure of any kind, whether too long, refused
 * or the network being down, is returned as a message rather than thrown, so
 * that whatever called this can keep the draft on screen instead of closing as
 * though it had worked.
 */
export async function saveDraft(input: {
  draft: string;
  saved: string;
  save: (text: string) => Promise<void>;
  messageFor: (error: unknown) => string;
}): Promise<SaveOutcome> {
  const { draft, saved, save, messageFor } = input;
  if (draft === saved || isBlank(draft)) return { ok: true, sent: false };

  try {
    await save(draft);
    return { ok: true, sent: true };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}
