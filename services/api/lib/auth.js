/**
 * Who is calling, and may they.
 *
 * `userId` comes from the Cognito JWT's `claims.sub`, which API Gateway's
 * authorizer has already verified. It is never read from a request body or a
 * query string. The predecessor defaulted it to the literal string
 * "default-user" and no handler ever checked ownership, which meant every
 * note in the system belonged to everybody.
 *
 * STUB — Phase 0 scaffolds the shape; Phase 1 wires the authorizer.
 */

/**
 * Pull the verified subject out of the request context.
 * @returns {string | null} the Cognito sub, or null when unauthenticated.
 */
export function getUserId(event) {
  return event?.requestContext?.authorizer?.claims?.sub ?? null;
}

export class ForbiddenError extends Error {
  constructor(message = 'That note belongs to someone else.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * 403, not 404. Hiding the existence of another user's note behind a 404 is a
 * defensible choice in general, but here the route is only reachable with a
 * valid note id, and being explicit makes the test unambiguous.
 */
export function assertOwnership(note, userId) {
  if (!note || note.userId !== userId) throw new ForbiddenError();
  return note;
}
