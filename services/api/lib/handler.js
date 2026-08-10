import { ZodError } from 'zod';
import { ERROR_CODES } from '@clarity/core';
import { getUserId } from './auth.js';
import { ForbiddenError, NotFoundError } from './errors.js';
import { failure, forbidden, notFound, unauthenticated, validationFailed } from './respond.js';

/**
 * The shape every handler has.
 *
 * Authenticate, then run, then turn the two failures a handler is allowed to
 * throw into their documented responses. Anything else is a bug: it is logged
 * with its stack and answered with a 500 that says nothing about the internals.
 *
 * Handlers stay small because this is where the ceremony lives.
 */
export function withAuth(fn) {
  return async (event) => {
    const userId = getUserId(event);
    if (!userId) return unauthenticated(event);

    try {
      return await fn(event, userId);
    } catch (error) {
      if (error instanceof ForbiddenError) return forbidden(event, error.message);
      if (error instanceof NotFoundError) return notFound(event, error.message);
      if (error instanceof ZodError) return validationFailed(event, error);
      if (error?.name === 'AiDisabledError') {
        return failure(event, 409, ERROR_CODES.aiDisabled, error.message);
      }

      console.error('Unhandled error', error);
      return failure(event, 500, 'internal_error', 'Something went wrong at our end.');
    }
  };
}

/**
 * Parse and validate a JSON body in one step. A malformed body is a 422 with
 * the same `details` shape a schema failure produces, not a 500.
 */
export function parseBody(event, schema) {
  let parsed;
  try {
    parsed = event.body ? JSON.parse(event.body) : {};
  } catch {
    throw new ZodError([
      { code: 'custom', path: [], message: 'The request body was not valid JSON.' },
    ]);
  }
  return schema.parse(parsed);
}

/** Query strings arrive as `null` rather than `{}` when there are none. */
export function parseQuery(event, schema) {
  return schema.parse(event.queryStringParameters ?? {});
}
