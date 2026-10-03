import { readFileSync, readdirSync } from 'node:fs';
import { inspect } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { enrich } from '../lib/enrich.js';
import { withAuth } from '../lib/handler.js';
import { describeError } from '../lib/log.js';

const MARKER = 'SECRET-NOTE-WORDS-7c1d';
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Logs never hold note content, titles, transcripts, email bodies, push
 * endpoints, sync tokens or request fingerprints. The places a note's words can
 * leak into a log are error objects: an SDK error carries the request it
 * failed on, and a JSON parse error quotes the text it choked on, which for the
 * model's answer is a summary of the note. So an error is logged as its class
 * and its status, and these tests make a note's words part of every error and
 * look for them afterwards.
 */
let spies;

beforeEach(() => {
  spies = ['log', 'info', 'warn', 'error', 'debug'].map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
});

afterEach(() => {
  for (const spy of spies) spy.mockRestore();
});

// `inspect`, not JSON.stringify: JSON leaves out an Error's message and stack,
// which is exactly where the note's words would be, and would let a leak pass.
const everythingLogged = () => inspect(spies.flatMap((spy) => spy.mock.calls), { depth: null });

/** Shaped like the Anthropic SDK's API error: a status, headers, and the request body it sent. */
function sdkError() {
  const error = new Error(`400 {"error":{"message":"could not process: ${MARKER}"}}`);
  error.name = 'BadRequestError';
  error.status = 400;
  error.request = { body: { messages: [{ role: 'user', content: MARKER }] } };
  error.cause = new SyntaxError(`Unexpected token in JSON: "${MARKER}"`);
  return error;
}

const note = (content) => ({
  noteId: 'n',
  userId: 'u',
  title: 't',
  content,
  summary: '',
  actions: [],
  summarySource: 'local',
  tags: [],
  pinned: false,
  archived: false,
  reminders: [],
  createdAt: '2026-10-03T09:00:00.000Z',
  updatedAt: '2026-10-03T09:00:00.000Z',
});

describe('describeError', () => {
  test('keeps the class and the status, and nothing else', () => {
    expect(describeError(sdkError())).toEqual({ name: 'BadRequestError', status: 400 });
  });

  test('reads an AWS SDK status too', () => {
    const error = new Error('x');
    error.name = 'ThrottlingException';
    error.$metadata = { httpStatusCode: 400 };

    expect(describeError(error)).toEqual({ name: 'ThrottlingException', status: 400 });
  });

  test('copes with things that are not errors', () => {
    expect(describeError(undefined)).toEqual({ name: 'UnknownError' });
    expect(describeError('a string with the note in it')).toEqual({ name: 'UnknownError' });
  });

  test('frames show where, never what: a message made to look like frames is not kept', () => {
    const error = new Error(`first line\n    at ${MARKER} (somewhere)`);

    const described = describeError(error, { frames: true });

    expect(JSON.stringify(described)).not.toContain(MARKER);
    expect(described.frames.length).toBeGreaterThan(0);
    expect(described.frames.every((frame) => frame.startsWith('at '))).toBe(true);
  });

  test('a stack that does not open with the message yields no frames at all', () => {
    const error = new Error('x');
    error.stack = `something else\n    at ${MARKER} (file)`;

    expect(describeError(error, { frames: true }).frames).toEqual([]);
  });
});

describe('when the AI engine fails and the local one answers', () => {
  test('the note is saved with the local summary, and the log has the error class and status only', async () => {
    const failing = { name: 'llm', analyse: async () => Promise.reject(sdkError()) };

    const result = await enrich(note(`I should email Sam about ${MARKER}.`), failing);

    expect(result.summarySource).toBe('local');
    expect(everythingLogged()).not.toContain(MARKER);
    expect(spies[2].mock.calls[0][1]).toEqual({ name: 'BadRequestError', status: 400 });
  });

  test('the same holds when the failure is a parse error that quotes the answer', async () => {
    const failing = {
      name: 'llm',
      analyse: async () => {
        throw new SyntaxError(`Unexpected token } in JSON at position 41: "${MARKER}"`);
      },
    };

    await enrich(note(MARKER), failing);

    expect(everythingLogged()).not.toContain(MARKER);
  });
});

describe('when a handler fails for a reason nobody planned for', () => {
  const event = { headers: {}, requestContext: { authorizer: { claims: { sub: 'someone' } } } };

  test('the caller gets a 500 that says nothing, and the log has no message', async () => {
    const handler = withAuth(async () => {
      throw sdkError();
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain(MARKER);
    expect(everythingLogged()).not.toContain(MARKER);
    expect(spies[3].mock.calls[0][0]).toBe('Unhandled error');
    expect(spies[3].mock.calls[0][1]).toMatchObject({ name: 'BadRequestError', status: 400 });
  });

  test('the log still says where it happened', async () => {
    const handler = withAuth(async () => {
      throw new Error(MARKER);
    });

    await handler(event);

    const logged = spies[3].mock.calls[0][1];
    expect(logged.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(logged)).not.toContain(MARKER);
  });
});

describe('the source', () => {
  test('no console call in the API passes a bare error object', () => {
    const roots = ['lib', 'functions'].map((directory) => path.join(HERE, '..', directory));
    const offenders = [];

    const files = (directory) =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : entry.name.endsWith('.js')
            ? [path.join(directory, entry.name)]
            : [],
      );

    for (const file of roots.flatMap(files)) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (/console\.\w+\(.*,\s*(error|err|e)\s*\)/.test(line)) {
            offenders.push(`${path.relative(HERE, file)}:${index + 1}`);
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});
