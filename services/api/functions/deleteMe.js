import { DeleteAccountRequestSchema } from '@clarity/core';
import { deleteEverythingForUser } from '../lib/dynamo.js';
import { parseBody, withAuth } from '../lib/handler.js';
import { ok } from '../lib/respond.js';

/**
 * DELETE /me — a hard delete of every note plus the preferences item.
 *
 * No soft-delete flag and no tombstone. CONTEXT.md §2 rule 7 promises a clear
 * deletion policy, and "we marked it deleted" is not one. The body must carry
 * `{ "confirm": true }`, so nothing here fires by accident.
 *
 * This does not delete the Cognito user; that is the identity provider's own
 * record and is removed by the sign-out-and-delete flow in Phase 3.
 */
export const handler = withAuth(async (event, userId) => {
  parseBody(event, DeleteAccountRequestSchema);

  const { notesDeleted } = await deleteEverythingForUser(userId);
  return ok(event, { deleted: true, notesDeleted });
});
