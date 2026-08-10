import { ForbiddenError } from './errors.js';

/**
 * Who is calling, and may they.
 *
 * `userId` is the Cognito JWT's `claims.sub`, which the API Gateway authorizer
 * has already verified before the Lambda ever runs. It is never read from a
 * request body, a query string or a header the client controls. The predecessor
 * defaulted it to the literal string "default-user" and no handler checked
 * ownership, which meant every note in the system belonged to everybody.
 */

/**
 * @returns {string | null} the Cognito sub, or null when unauthenticated.
 *
 * In production this is unreachable with a null — API Gateway rejects the
 * request before invocation. It is still checked, because a route added later
 * without an authorizer should fail closed rather than serve someone else's
 * notes.
 */
export function getUserId(event) {
  const sub = event?.requestContext?.authorizer?.claims?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

/**
 * 403, not 404.
 *
 * Answering 404 for another user's note hides its existence, which is the more
 * cautious default in general. Here the id is a v4 UUID that a stranger cannot
 * guess, so there is nothing to enumerate, and being explicit makes both the
 * failure and the test that covers it unambiguous.
 */
export function assertOwnership(note, userId) {
  if (!note || note.userId !== userId) throw new ForbiddenError();
  return note;
}

export { ForbiddenError };
