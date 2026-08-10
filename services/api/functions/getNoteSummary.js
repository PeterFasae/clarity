import { assertOwnership } from '../lib/auth.js';
import { getNote } from '../lib/dynamo.js';
import { NotFoundError } from '../lib/errors.js';
import { withAuth } from '../lib/handler.js';
import { ok } from '../lib/respond.js';

/**
 * GET /notes/{id}/summary — the stored summary (report §4.5).
 *
 * A read, not a computation: the values were written when the note was, so
 * this cannot disagree with what `GET /notes/{id}` returns. Use
 * `POST /notes/{id}/summarize` to force a recompute.
 */
export const handler = withAuth(async (event, userId) => {
  const note = await getNote(event.pathParameters.id);
  if (!note) throw new NotFoundError();
  assertOwnership(note, userId);

  return ok(event, {
    summary: note.summary,
    actions: note.actions ?? [],
    summarySource: note.summarySource,
  });
});
