import { ZodError } from 'zod';
import { ERROR_CODES, LIMITS } from '@clarity/core';
import { getUserId } from './auth.js';
import { ForbiddenError, NoteTooLargeError, NotFoundError, PayloadTooLargeError } from './errors.js';
import { describeError } from './log.js';
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
      assertBodyWithinLimit(event);
      return await fn(event, userId);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return failure(
          event,
          413,
          ERROR_CODES.payloadTooLarge,
          'That is too big to send in one go, so nothing was changed. If it is a long note, try splitting it into two.',
        );
      }
      if (error instanceof NoteTooLargeError) {
        return failure(
          event,
          422,
          ERROR_CODES.noteTooLarge,
          'This note, with everything Clarity works out from it, is too big to keep in one piece, so nothing was changed. Try splitting it into two notes.',
        );
      }
      if (error instanceof ForbiddenError) return forbidden(event, error.message);
      if (error instanceof NotFoundError) return notFound(event, error.message);
      if (error instanceof ZodError) return validationFailed(event, error);
      if (error?.name === 'AiDisabledError') {
        return failure(event, 409, ERROR_CODES.aiDisabled, error.message);
      }

      console.error('Unhandled error', describeError(error, { frames: true }));
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
    parsed = event.body ? JSON.parse(decodedBody(event)) : {};
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

/**
 * The body as text. API Gateway marks a body it has base64 encoded, and the
 * size gate already measures it decoded, so parsing has to read it decoded too.
 * The bytes must be valid UTF-8: a lenient decoder would swap a bad byte for
 * U+FFFD and quietly change what the user wrote, so a body that is not valid
 * UTF-8 is refused like any other body that is not valid JSON.
 */
function decodedBody(event) {
  if (!event.isBase64Encoded) return event.body;
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(event.body, 'base64'));
}

/**
 * The request body's size in bytes, after any base64 decoding, checked before
 * anything parses it. A body over the limit costs a length check and nothing
 * else.
 */
export function assertBodyWithinLimit(event) {
  const body = event?.body;
  if (typeof body !== 'string') return;

  const bytes = event.isBase64Encoded ? base64DecodedLength(body) : Buffer.byteLength(body, 'utf8');
  if (bytes > LIMITS.bodyBytes) throw new PayloadTooLargeError();
}

function base64DecodedLength(encoded) {
  const clean = encoded.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}
