import { DEFAULT_PREFERENCES, SummariseQuerySchema } from '@clarity/core';
import { selectEngine } from '../lib/ai/index.js';
import { assertOwnership } from '../lib/auth.js';
import { getNote, getPreferences, putNote } from '../lib/dynamo.js';
import { enrich } from '../lib/enrich.js';
import { NotFoundError } from '../lib/errors.js';
import { parseQuery, withAuth } from '../lib/handler.js';
import { ok, toWireNote } from '../lib/respond.js';

/**
 * POST /notes/{id}/summarize — force a recompute.
 *
 * `?mode=llm` is refused with a 409 unless the user's own `aiEnabled` is true.
 * Refused, not quietly downgraded: a user needs to be able to trust that off
 * means off, and a silent fallback would make `summarySource` the only
 * evidence of what happened.
 *
 * Returns the whole note rather than just the summary, because this is a write
 * and `updatedAt` has moved.
 */
export const handler = withAuth(async (event, userId) => {
  const { mode } = parseQuery(event, SummariseQuerySchema);

  const note = await getNote(event.pathParameters.id);
  if (!note) throw new NotFoundError();
  assertOwnership(note, userId);

  const preferences = (await getPreferences(userId)) ?? DEFAULT_PREFERENCES;
  const engine = selectEngine(preferences, mode);

  const recomputed = enrich(note, engine);
  await putNote(recomputed);

  return ok(event, { note: toWireNote(recomputed) });
});
