import { LIMITS, toWellFormedText, truncateCodePoints } from '@clarity/core';
import { localEngine } from './ai/index.js';
import { describeError } from './log.js';

/**
 * Compute-on-write.
 *
 * Summary and actions are computed, never entered, and recomputed on every
 * write — so there is one source of truth for what a note says and they cannot
 * drift from it. Doing it on write means the work happens once per edit rather
 * than once per search, and capture still feels instant because the write was
 * already a round trip.
 *
 * `content` is never written here. The predecessor's summariser overwrote the
 * note body with its summary, destroying the user's own words; that is the
 * single worst inherited bug and this function is where it does not come back.
 *
 * **An AI outage must never block a save.** If the chosen engine throws — a
 * timeout, a rate limit, a refusal, a bad response shape, anything — the local
 * engine answers instead and `summarySource` records what actually produced the
 * values. The user's note is saved either way. That guarantee lives here, in
 * one place, rather than in each handler.
 */
export async function enrich(note, engine, fallback = localEngine) {
  const computed = await compute(note.content, engine, fallback);
  const { summary, actions } = boundGenerated(computed);

  return {
    ...note,
    summary,
    actions,
    summarySource: computed.source,
    updatedAt: new Date().toISOString(),
  };
}

async function compute(content, engine, fallback) {
  try {
    const { summary, actions } = await engine.analyse(content);
    return { summary, actions, source: engine.name };
  } catch (error) {
    if (engine.name === fallback.name) throw error;

    // Logged rather than surfaced: the user asked for a better summary and got
    // a working one, which is not an error they can act on. Only the error's
    // class and status are logged. The SDK's error object carries the request,
    // and a JSON parse error quotes the model's answer, which quotes the note.
    console.warn(
      `The ${engine.name} engine failed; falling back to ${fallback.name}.`,
      describeError(error),
    );

    const { summary, actions } = await fallback.analyse(content);
    return { summary, actions, source: fallback.name };
  }
}

/**
 * What an engine may hand back, cut down to what a note can carry.
 *
 * Both engines can return far more than a stored note has room for: the
 * extractive summary is the whole note when it has no full stop, and a note of
 * `todo` lines yields a line each. The limits (ADR 0009) are applied to the
 * generated fields only, here, on code-point boundaries with the ellipsis
 * inside the limit, and any unpaired surrogate an engine produced is replaced.
 * `content` never passes through this function. Nothing is dropped to make an
 * item fit; the store measures the finished item and refuses it if it is still
 * too big.
 */
export function boundGenerated({ summary, actions }) {
  return {
    summary: truncateCodePoints(toWellFormedText(String(summary ?? '')), LIMITS.summary),
    actions: (actions ?? [])
      .slice(0, LIMITS.actions)
      .map((action) => truncateCodePoints(toWellFormedText(String(action)), LIMITS.action)),
  };
}
