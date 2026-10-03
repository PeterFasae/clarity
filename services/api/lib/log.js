/**
 * What may be written to a log about an error.
 *
 * The class and the HTTP status, and nothing else. An error's message and its
 * `cause` can carry the text that caused it: a JSON parse error quotes the
 * model's answer, which quotes the note, and an SDK error object carries the
 * request. Logs never hold note content, titles, transcripts, email bodies,
 * push endpoints, sync tokens or request fingerprints, so an error is reduced
 * to what cannot.
 */
export function describeError(error, { frames = false } = {}) {
  return {
    name: typeof error?.name === 'string' ? error.name : 'UnknownError',
    ...(Number.isInteger(error?.status) ? { status: error.status } : {}),
    ...(Number.isInteger(error?.$metadata?.httpStatusCode)
      ? { status: error.$metadata.httpStatusCode }
      : {}),
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
