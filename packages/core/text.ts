/**
 * Text that is safe to count, cut and store.
 *
 * Every limit in this API is counted in Unicode code points, which is what a
 * person would call a character: an emoji is one, where JavaScript's own
 * `.length` says two. Nothing here trims or normalises, because a user's words
 * are theirs; the helpers only measure, and cut text that the server wrote.
 *
 * A "broken" character is an unpaired UTF-16 surrogate. It is not valid
 * Unicode text, and not every storage path keeps it intact, so user text
 * containing one is refused (`invalid_text`) and generated text has it
 * replaced before it can be saved.
 */

export const ELLIPSIS = '…';

const isHighSurrogate = (unit: number) => unit >= 0xd800 && unit <= 0xdbff;
const isLowSurrogate = (unit: number) => unit >= 0xdc00 && unit <= 0xdfff;

/** True when the unit at `index` starts a surrogate pair. */
function startsPair(text: string, index: number): boolean {
  return (
    isHighSurrogate(text.charCodeAt(index)) &&
    index + 1 < text.length &&
    isLowSurrogate(text.charCodeAt(index + 1))
  );
}

/** Number of code points. An unpaired surrogate counts as one. */
export function countCodePoints(text: string): number {
  let count = 0;
  for (let index = 0; index < text.length; index++) {
    if (startsPair(text, index)) index++;
    count++;
  }
  return count;
}

/** False when the text contains a high or low surrogate with no partner. */
export function isWellFormedText(text: string): boolean {
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (isHighSurrogate(unit)) {
      if (!startsPair(text, index)) return false;
      index++;
    } else if (isLowSurrogate(unit)) {
      return false;
    }
  }
  return true;
}

/** Replaces each unpaired surrogate with U+FFFD. Well-formed text is returned as it is. */
export function toWellFormedText(text: string): string {
  if (isWellFormedText(text)) return text;

  let result = '';
  for (let index = 0; index < text.length; index++) {
    if (startsPair(text, index)) {
      result += text.slice(index, index + 2);
      index++;
    } else {
      const unit = text.charCodeAt(index);
      result += isHighSurrogate(unit) || isLowSurrogate(unit) ? '�' : text[index];
    }
  }
  return result;
}

/** The first `max` code points, never splitting a surrogate pair. */
export function sliceCodePoints(text: string, max: number): string {
  if (max <= 0) return '';

  let end = 0;
  let count = 0;
  while (end < text.length && count < max) {
    end += startsPair(text, end) ? 2 : 1;
    count++;
  }
  return text.slice(0, end);
}

/**
 * Fits `text` into `max` code points, ellipsis included: a 1,000-code-point
 * limit keeps 999 code points and then the ellipsis. Text that already fits is
 * returned untouched. For text the server generated, never for a user's own.
 */
export function truncateCodePoints(text: string, max: number): string {
  if (countCodePoints(text) <= max) return text;
  if (max <= 1) return sliceCodePoints(ELLIPSIS, max);
  return sliceCodePoints(text, max - 1) + ELLIPSIS;
}
