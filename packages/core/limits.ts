/**
 * The limits (ADR 0009). Text limits are in Unicode code points; the two byte
 * limits are in bytes.
 *
 * They were chosen backwards from DynamoDB's 400 KB item limit (409,600
 * bytes, attribute names included): with every field at its cap, in four-byte
 * text, a stored note measured 289,464 bytes, and the store refuses anything
 * over `itemBytes`. The request-body limit is separate and larger on purpose,
 * because the same note can arrive as plain UTF-8 or with every non-ASCII
 * character written as a `\uXXXX` escape, and has to fit either way.
 */
export const LIMITS = Object.freeze({
  /** Decoded request body, in bytes. Larger is a 413. */
  bodyBytes: 1_048_576,
  content: 60_000,
  title: 200,
  tags: 20,
  tag: 40,
  reminders: 20,
  /** Characters in one reminder's date-time string; the string has no natural length. */
  reminder: 40,
  /** Generated, bounded before saving. */
  summary: 1_000,
  actions: 50,
  action: 200,
  /** The complete stored item, in bytes by DynamoDB's own sizing rules. */
  itemBytes: 350_000,
});
