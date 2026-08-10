import { deleteNoteOwnedBy } from '../lib/dynamo.js';
import { withAuth } from '../lib/handler.js';
import { forbidden, noContent, notFound } from '../lib/respond.js';

/**
 * DELETE /notes/{id}
 *
 * Ownership is enforced by the delete's own ConditionExpression rather than by
 * reading the note first, which is why this function's IAM role is a single
 * DeleteItem statement and nothing else (report §4.3E). DynamoDB returns the
 * item it refused to delete, so 403 and 404 stay distinguishable.
 */
export const handler = withAuth(async (event, userId) => {
  const outcome = await deleteNoteOwnedBy(event.pathParameters.id, userId);

  if (outcome === 'forbidden') return forbidden(event);
  if (outcome === 'not-found') return notFound(event);
  return noContent(event);
});
