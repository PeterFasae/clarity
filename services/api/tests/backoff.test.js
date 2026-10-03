import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { batchGetNotes, deleteEverythingForUser, testHooks } from '../lib/dynamo.js';
import { BACKOFF, UnprocessedItemsError, backoffDelay, retryUnprocessed } from '../lib/retry.js';

/**
 * DynamoDB returns part of a batch as "unprocessed" when it is throttling the
 * table. The old code sent the same request again immediately, in a loop with
 * no end, which is the one response that makes a throttle worse. These tests
 * watch the waiting without doing it: the sleep is replaced, and the random
 * number is fixed, so the delay each retry asks for can be read off exactly.
 */
const NEARLY_ONE = () => 0.999999;

describe('the delay', () => {
  test('doubles with each attempt up to a cap, as an upper bound', () => {
    const delays = Array.from({ length: 8 }, (_, attempt) => backoffDelay(attempt, NEARLY_ONE));

    expect(delays).toEqual([49, 99, 199, 399, 799, 999, 999, 999]);
  });

  test('is a random point below that bound, so callers do not retry in step', () => {
    expect(backoffDelay(4, () => 0)).toBe(0);
    expect(backoffDelay(4, () => 0.5)).toBe(400);
  });

  test('never exceeds the cap, however many attempts', () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      expect(backoffDelay(attempt, NEARLY_ONE)).toBeLessThan(BACKOFF.capMs);
    }
  });
});

describe('retryUnprocessed', () => {
  test('waits before every retry, and not at all when nothing was left over', async () => {
    const slept = [];
    let calls = 0;

    await retryUnprocessed(['a', 'b'], async (items) => (++calls < 4 ? items : []), {
      sleep: async (ms) => slept.push(ms),
      random: NEARLY_ONE,
    });

    expect(calls).toBe(4);
    expect(slept).toEqual([49, 99, 199]);

    slept.length = 0;
    await retryUnprocessed(['a'], async () => [], { sleep: async (ms) => slept.push(ms) });
    expect(slept).toEqual([]);
  });

  test('passes only what was left over to the next try', async () => {
    const seen = [];

    await retryUnprocessed([1, 2, 3], async (items) => {
      seen.push(items);
      return items.length > 1 ? items.slice(1) : [];
    }, { sleep: async () => {} });

    expect(seen).toEqual([[1, 2, 3], [2, 3], [3]]);
  });

  test('gives up after a bounded number of attempts, rather than looping until the Lambda times out', async () => {
    let calls = 0;
    const slept = [];

    await expect(
      retryUnprocessed(['stuck'], async (items) => (calls++, items), {
        sleep: async (ms) => slept.push(ms),
        random: NEARLY_ONE,
      }),
    ).rejects.toBeInstanceOf(UnprocessedItemsError);

    expect(calls).toBe(BACKOFF.maxAttempts);
    expect(slept).toHaveLength(BACKOFF.maxAttempts - 1);
  });
});

describe('the store', () => {
  const slept = [];
  const saved = {};

  beforeEach(() => {
    for (const key of ['NOTES_TABLE', 'PREFERENCES_TABLE']) saved[key] = process.env[key];
    process.env.NOTES_TABLE = 'notes';
    process.env.PREFERENCES_TABLE = 'preferences';
  });

  afterEach(() => {
    slept.length = 0;
    testHooks.useClient(undefined);
    testHooks.useTiming(undefined);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  /** A client that behaves as a throttled DynamoDB does for the first `throttled` calls. */
  function throttledClient(throttled) {
    const calls = [];
    let throttle = throttled;

    return {
      calls,
      async send(command) {
        const kind = command.constructor.name;
        calls.push(kind);

        if (kind === 'BatchGetCommand') {
          const [table, request] = Object.entries(command.input.RequestItems)[0];
          if (throttle-- > 0) return { UnprocessedKeys: { [table]: request }, Responses: {} };
          return { Responses: { [table]: request.Keys.map((key) => ({ ...key, title: 'found' })) } };
        }
        if (kind === 'QueryCommand') {
          return { Items: [{ noteId: 'n1' }, { noteId: 'n2' }] };
        }
        if (kind === 'BatchWriteCommand') {
          const [table, requests] = Object.entries(command.input.RequestItems)[0];
          if (throttle-- > 0) return { UnprocessedItems: { [table]: requests } };
          return {};
        }
        return {};
      },
    };
  }

  const watch = () =>
    testHooks.useTiming({ sleep: async (ms) => slept.push(ms), random: NEARLY_ONE });

  test('BatchGetItem backs off between retries and still returns every note, in order', async () => {
    const client = throttledClient(3);
    testHooks.useClient(client);
    watch();

    const notes = await batchGetNotes(['b', 'a', 'c']);

    expect(notes.map((note) => note.noteId)).toEqual(['b', 'a', 'c']);
    expect(client.calls.filter((kind) => kind === 'BatchGetCommand')).toHaveLength(4);
    expect(slept).toEqual([49, 99, 199]);
  });

  test('deleting everything backs off between retries too', async () => {
    const client = throttledClient(2);
    testHooks.useClient(client);
    watch();

    const result = await deleteEverythingForUser('someone');

    expect(result).toEqual({ notesDeleted: 2 });
    expect(slept).toEqual([49, 99]);
  });

  test('a table that never recovers is an error, not an endless loop', async () => {
    testHooks.useClient(throttledClient(Infinity));
    watch();

    await expect(batchGetNotes(['a'])).rejects.toBeInstanceOf(UnprocessedItemsError);
    expect(slept).toHaveLength(BACKOFF.maxAttempts - 1);
  });
});
