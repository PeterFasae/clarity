import { assertOwnership } from '../lib/auth.js';
import { getNote } from '../lib/dynamo.js';
import { NotFoundError } from '../lib/errors.js';
import { withAuth } from '../lib/handler.js';
import { ok, toWireNote } from '../lib/respond.js';

/**
 * GET /notes/{id}
 *
 * The predecessor's frontend called this route and it did not exist, so every
 * "open a note" path 404'd against a handler that was never written.
 */
export const handler = withAuth(async (event, userId) => {
  const note = await getNote(event.pathParameters.id);
  if (!note) throw new NotFoundError();
  assertOwnership(note, userId);

  return ok(event, { note: toWireNote(note) });
});
