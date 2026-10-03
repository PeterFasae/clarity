import { ERROR_CODES } from '@clarity/core';

/**
 * The only place a note is serialised to the wire, and the only copy of the
 * CORS headers.
 *
 * Both of those are deliberate. The predecessor had a hand-rolled headers
 * object in every handler, each with `Access-Control-Allow-Origin: '*'`, and no
 * mapping at all between the persisted shape and the shape the frontend
 * expected — so `note.id` was `undefined` and every per-note call hit a bad
 * path. Centralising serialisation means no handler can forget to turn
 * `noteId` into `id`; centralising CORS means the allowlist is enforced once.
 */

/** Read at call time, not module load, so tests can vary it. */
function allowlist() {
  return String(process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Echo the request's Origin back only if it is on the allowlist. An unlisted
 * origin gets no CORS header at all, so the browser blocks the response —
 * which is the point. There is no code path here that can emit a wildcard.
 */
export function corsHeaders(event) {
  const origin = event?.headers?.origin ?? event?.headers?.Origin;
  if (!origin || !allowlist().includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

/**
 * Persisted shape → wire shape. `noteId` becomes `id`; `userId` never leaves
 * the server. Anything else on the item passes through unchanged.
 */
export function toWireNote(stored, extra = {}) {
  const { noteId, userId: _userId, ...rest } = stored;
  return { id: noteId, ...rest, ...extra };
}

export function respond(event, statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(event),
    },
    body: body === undefined ? '' : JSON.stringify(body),
  };
}

export const ok = (event, body) => respond(event, 200, body);
export const created = (event, body) => respond(event, 201, body);

export const noContent = (event) => ({
  statusCode: 204,
  headers: { 'Cache-Control': 'no-store', ...corsHeaders(event) },
  body: '',
});

/**
 * The preflight answer. Same allowlist, so an unlisted origin gets a 204 with
 * no CORS headers — which the browser reads as "not allowed", exactly as it
 * should.
 */
export const preflight = (event) => ({
  statusCode: 204,
  headers: {
    ...corsHeaders(event),
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '600',
  },
  body: '',
});

export function failure(event, statusCode, error, message, details) {
  return respond(event, statusCode, {
    error,
    ...(message ? { message } : {}),
    ...(details ? { details } : {}),
  });
}

export const unauthenticated = (event, message) =>
  failure(event, 401, ERROR_CODES.unauthenticated, message ?? 'Sign in to continue.');

/**
 * 403, not 404. Someone else's note exists — we simply will not hand it over.
 * There is a test for this on read, update and delete.
 */
export const forbidden = (event, message) =>
  failure(event, 403, ERROR_CODES.forbidden, message ?? 'That note belongs to someone else.');

export const notFound = (event, message) =>
  failure(event, 404, ERROR_CODES.notFound, message ?? 'No such note.');

/**
 * A schema can tag an issue with a more specific stable code
 * (`params.clarity`). When one request breaks several rules, the first code in
 * this list wins; `details` still names every path that failed.
 */
const SPECIFIC_CODES = {
  [ERROR_CODES.sharingNotAvailable]: "Sharing isn't available yet.",
  [ERROR_CODES.invalidText]:
    'Some of the text has a character in it that cannot be saved, so nothing was changed. Try typing or pasting it again.',
  [ERROR_CODES.limitExceeded]:
    'Something is longer than Clarity can keep, so nothing was changed. The details say which part.',
};

/**
 * Zod's own message for an enum names the value it was sent, which is the
 * client's input echoed back. Say the same thing without the echo.
 */
const detailMessage = (issue) =>
  issue.code === 'invalid_enum_value' ? 'That is not one of the allowed values.' : issue.message;

/** Turns a zod error into the documented `details` array. */
export const validationFailed = (event, zodError) => {
  const tagged = new Set(zodError.issues.map((issue) => issue.params?.clarity));
  const code = Object.keys(SPECIFIC_CODES).find((candidate) => tagged.has(candidate));

  return failure(
    event,
    422,
    code ?? ERROR_CODES.validationFailed,
    code ? SPECIFIC_CODES[code] : 'That request was not in a shape we understand.',
    zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: detailMessage(issue),
    })),
  );
};
