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
 */
export function enrich(note, engine) {
  return {
    ...note,
    summary: engine.summarise(note.content),
    actions: engine.extractActions(note.content),
    summarySource: engine.name,
    updatedAt: new Date().toISOString(),
  };
}
