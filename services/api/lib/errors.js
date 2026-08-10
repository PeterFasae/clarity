/**
 * The two failures a handler is allowed to throw. Everything else is a bug and
 * becomes a 500 with a logged stack — never a leaked message.
 */

export class ForbiddenError extends Error {
  constructor(message = 'That note belongs to someone else.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'No such note.') {
    super(message);
    this.name = 'NotFoundError';
  }
}
