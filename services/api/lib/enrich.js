import { localEngine } from './ai/index.js';

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

  return {
    ...note,
    summary: computed.summary,
    actions: computed.actions,
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
    // a working one, which is not an error they can act on.
    console.warn(`The ${engine.name} engine failed; falling back to ${fallback.name}.`, error);

    const { summary, actions } = await fallback.analyse(content);
    return { summary, actions, source: fallback.name };
  }
}
