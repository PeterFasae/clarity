/**
 * What may be written to a log about an error.
 *
 * A category and an HTTP status, and nothing else. An error's message and its
 * `cause` can carry the text that caused it: a JSON parse error quotes the
 * model's answer, which quotes the note, and an SDK error object carries the
 * request. Even `name` is only a string somebody set, and an error can be made
 * with a note's words as its name, so the name is logged only if it is one of
 * the classes listed below. Anything else is "OtherError". Logs never hold note
 * content, titles, transcripts, email bodies, push endpoints, sync tokens or
 * request fingerprints, so an error is reduced to what cannot.
 */
const KNOWN_ERRORS = new Set([
  // The language and the runtime.
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError',
  'URIError', 'AggregateError', 'AbortError', 'TimeoutError',
  // Validation.
  'ZodError',
  // This service's own.
  'ForbiddenError', 'NotFoundError', 'PayloadTooLargeError', 'NoteTooLargeError',
  'UnprocessedItemsError', 'AiDisabledError',
  // The Anthropic SDK.
  'APIError', 'APIConnectionError', 'APIConnectionTimeoutError', 'APIUserAbortError',
  'BadRequestError', 'AuthenticationError', 'PermissionDeniedError', 'ConflictError',
  'UnprocessableEntityError', 'RateLimitError', 'InternalServerError',
  // DynamoDB.
  'ConditionalCheckFailedException', 'TransactionCanceledException',
  'TransactionConflictException', 'ProvisionedThroughputExceededException',
  'RequestLimitExceeded', 'ThrottlingException', 'ResourceNotFoundException',
  'ValidationException', 'ItemCollectionSizeLimitExceededException', 'LimitExceededException',
]);

const isStatus = (value) => Number.isInteger(value) && value >= 100 && value <= 599;

export function describeError(error, { frames = false } = {}) {
  const status = isStatus(error?.status) ? error.status : error?.$metadata?.httpStatusCode;

  return {
    name:
      typeof error?.name !== 'string'
        ? 'UnknownError'
        : KNOWN_ERRORS.has(error.name)
          ? error.name
          : 'OtherError',
    ...(isStatus(status) ? { status } : {}),
    ...(frames ? { frames: stackFrames(error) } : {}),
  };
}

/**
 * Where it happened, without what it said. A stack opens with the error's name
 * and message, and a message can run over several lines that look like frames,
 * so the opening is cut off by its exact text before anything is kept. If the
 * stack does not open the way V8 writes it, nothing is kept at all.
 */
function stackFrames(error) {
  if (typeof error?.stack !== 'string') return [];

  const opening = `${error.name}: ${error.message}`;
  if (!error.stack.startsWith(opening)) return [];

  return error.stack
    .slice(opening.length)
    .split('\n')
    .filter((line) => /^\s+at /.test(line))
    .slice(0, 8)
    .map((line) => line.trim());
}
