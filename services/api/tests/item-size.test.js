import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { LIMITS } from '@clarity/core';
import { putNote, resetClient } from '../lib/dynamo.js';
import { NoteTooLargeError } from '../lib/errors.js';
import { withAuth } from '../lib/handler.js';
import { itemBytes, valueBytes, wireItemBytes } from '../lib/item-size.js';
import { DDB_PORT, NOTES_TABLE } from './setup/global.js';
import { rawDeleteNote, rawPutNote, rawStoredNote } from './helpers.js';

/**
 * DynamoDB's own limit is 400 KB, 409,600 bytes, counted over attribute names
 * and values and not over any JSON rendering of them. These tests pin the size
 * function to AWS's published rules by hand-worked examples, and pin the rules
 * to the real engine by finding where DynamoDB Local draws the line. Local is
 * not AWS, so the boundary test is repeated against staging.
 */
const HARD_LIMIT = 409_600;

describe('the size rules, worked by hand', () => {
  test.each([
    ['a string is its name plus its UTF-8 bytes', { a: { S: 'xy' } }, 1 + 2],
    ['multi-byte text counts bytes, not characters', { a: { S: 'é中\u{1F600}' } }, 1 + (2 + 3 + 4)],
    ['an attribute name counts in UTF-8 bytes too', { 'é': { S: 'x' } }, 2 + 1],
    ['a boolean is one byte', { b: { BOOL: true } }, 1 + 1],
    ['null is one byte', { b: { NULL: true } }, 1 + 1],
    ['an empty list is three bytes of overhead', { l: { L: [] } }, 1 + 3],
    ['a list adds one byte per element', { l: { L: [{ S: 'ab' }] } }, 1 + 3 + (1 + 2)],
    ['an empty map is three bytes of overhead', { m: { M: {} } }, 1 + 3],
    ['a map adds one byte and the name for each entry', { m: { M: { k: { S: 'v' } } } }, 1 + 3 + (1 + 1 + 1)],
    ['nesting adds up', { m: { M: { k: { L: [{ S: 'ab' }] } } } }, 1 + 3 + (1 + 1 + (3 + (1 + 2)))],
    ['a number is a byte per two significant digits, plus one', { n: { N: '123' } }, 1 + (2 + 1)],
    ['trailing zeros are not significant digits', { n: { N: '1200' } }, 1 + (1 + 1)],
    ['a string set has no extra overhead', { s: { SS: ['ab', 'c'] } }, 1 + 3],
  ])('%s', (_label, wire, expected) => {
    expect(wireItemBytes(wire)).toBe(expected);
  });

  test('a number is capped at 21 bytes', () => {
    expect(valueBytes({ N: '1'.repeat(60) })).toBe(21);
  });

  test('a plain object is measured through the same marshalling the client uses', () => {
    // 'title' (5) + 'abc' (3), 'tags' (4) + list (3 + 1 + 2 for 'xy'), 'pinned' (6) + 1.
    expect(itemBytes({ title: 'abc', tags: ['xy'], pinned: true })).toBe(5 + 3 + (4 + 3 + 1 + 2) + (6 + 1));
  });

  test('undefined values are dropped, as the client drops them on the way out', () => {
    expect(itemBytes({ a: 'x', b: undefined })).toBe(1 + 1);
  });

  test('JSON.stringify would have got it wrong', () => {
    const item = { tags: ['a', 'b'], n: 5 };
    expect(JSON.stringify(item).length).not.toBe(itemBytes(item));
  });
});

describe('where DynamoDB Local draws the line', () => {
  const made = [];

  /** An item of exactly `target` bytes, built from the shape under test. */
  function itemOfSize(shape, target) {
    const noteId = randomUUID();
    const build = (padding) => {
      const filler = { S: 'a'.repeat(padding) };
      const attributes =
        shape === 'flat'
          ? { content: filler }
          : shape === 'list'
            ? { actions: { L: [filler] } }
            : { nested: { M: { text: filler } } };
      return { noteId: { S: noteId }, ...attributes };
    };
    const padding = target - wireItemBytes(build(0));
    return { noteId, item: build(padding) };
  }

  afterAll(async () => {
    for (const noteId of made) await rawDeleteNote(noteId);
  });

  test.each(['flat', 'list', 'map'])(
    'an item of exactly 409,600 bytes is accepted and one more is refused (%s)',
    async (shape) => {
      const exact = itemOfSize(shape, HARD_LIMIT);
      const over = itemOfSize(shape, HARD_LIMIT + 1);
      made.push(exact.noteId, over.noteId);

      expect(wireItemBytes(exact.item)).toBe(HARD_LIMIT);
      expect((await rawPutNote(exact.item)).accepted).toBe(true);

      const refused = await rawPutNote(over.item);
      expect(refused.accepted).toBe(false);
      expect(refused.error.message).toMatch(/Item size has exceeded the maximum allowed size/);
    },
  );
});

describe('the store refuses a finished item over the ceiling', () => {
  const saved = {};

  beforeAll(() => {
    for (const key of ['NOTES_TABLE', 'DYNAMODB_ENDPOINT', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
      saved[key] = process.env[key];
    }
    process.env.NOTES_TABLE = NOTES_TABLE;
    process.env.DYNAMODB_ENDPOINT = `http://localhost:${DDB_PORT}`;
    process.env.AWS_REGION = 'eu-north-1';
    process.env.AWS_ACCESS_KEY_ID = 'local';
    process.env.AWS_SECRET_ACCESS_KEY = 'local';
    resetClient();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetClient();
  });

  const note = (noteId, content) => ({
    noteId,
    userId: 'ceiling-test-user',
    createdAt: '2026-10-03T09:00:00.000Z',
    updatedAt: '2026-10-03T09:00:00.000Z',
    title: 'Ceiling',
    content,
    summary: '',
    actions: [],
    summarySource: 'local',
    tags: [],
    pinned: false,
    archived: false,
    reminders: [],
  });

  test('an item at exactly 350,000 bytes is written', async () => {
    const noteId = randomUUID();
    const room = LIMITS.itemBytes - itemBytes(note(noteId, ''));

    await putNote(note(noteId, 'a'.repeat(room)));

    const stored = await rawStoredNote(noteId);
    expect(stored).toBeDefined();
    expect(wireItemBytes(stored)).toBe(LIMITS.itemBytes);
    await rawDeleteNote(noteId);
  });

  test('one byte more is refused, and nothing is written', async () => {
    const noteId = randomUUID();
    const room = LIMITS.itemBytes - itemBytes(note(noteId, ''));

    await expect(putNote(note(noteId, 'a'.repeat(room + 1)))).rejects.toBeInstanceOf(NoteTooLargeError);
    expect(await rawStoredNote(noteId)).toBeUndefined();
  });

  test('the ceiling is below what DynamoDB itself would accept', () => {
    expect(LIMITS.itemBytes).toBeLessThan(HARD_LIMIT);
  });

  test('the handler wrapper answers it with 422 note_too_large, content-free', async () => {
    const handler = withAuth(async () => {
      throw new NoteTooLargeError();
    });

    const response = await handler({
      headers: {},
      requestContext: { authorizer: { claims: { sub: 'someone' } } },
    });

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body).error).toBe('note_too_large');
    expect(JSON.parse(response.body).message).toMatch(/nothing was changed/i);
  });
});
