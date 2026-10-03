/**
 * The failures a handler is allowed to throw. Everything else is a bug and
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

/** The request body is larger than the API will read (413). */
export class PayloadTooLargeError extends Error {
  constructor() {
    super('The request body is larger than 1 MiB.');
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * The finished item is over the stored-size ceiling (422). With the field
 * limits in place this should be unreachable; it exists so that a future
 * attribute that grows the item is refused, not stored and not a 500.
 */
export class NoteTooLargeError extends Error {
  constructor() {
    super('The note is too large to store.');
    this.name = 'NoteTooLargeError';
  }
}
