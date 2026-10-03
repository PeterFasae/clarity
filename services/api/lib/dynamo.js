import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { LIMITS } from '@clarity/core';
import { decodeCursor, encodeCursor } from './cursor.js';
import { NoteTooLargeError } from './errors.js';
import { retryUnprocessed } from './retry.js';
import { itemBytes } from './item-size.js';

/**
 * The store, and the seam.
 *
 * This is the only file that knows DynamoDB exists. Handlers call these
 * functions and never see a client, a table name, an ExpressionAttributeName or
 * an ExclusiveStartKey. Keeping that boundary honest is what makes the data
 * layer swappable — it is how the in-memory version of this app became the AWS
 * version without a single handler changing.
 */

const NOTES_TABLE = () => process.env.NOTES_TABLE;
const PREFERENCES_TABLE = () => process.env.PREFERENCES_TABLE;
const USER_ID_INDEX = 'UserIdIndex';

let documentClient;

function client() {
  if (!documentClient) {
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    documentClient = DynamoDBDocumentClient.from(
      new DynamoDBClient(endpoint ? { endpoint } : {}),
      { marshallOptions: { removeUndefinedValues: true } },
    );
  }
  return documentClient;
}

/** Exposed only so tests can reset between runs. */
export function resetClient() {
  documentClient = undefined;
}

// Tests substitute a fake client and watch the backoff instead of waiting for it.
// Production never sets either, so `timing` is empty and retry.js uses the real ones.
let timing = {};

export const testHooks = {
  useClient(fake) {
    documentClient = fake;
  },
  useTiming(overrides) {
    timing = overrides ?? {};
  },
};

// Aliased in every expression. DynamoDB's reserved-word list is long and
// changes; aliasing unconditionally means never having to check it.
const NAMES = {
  '#noteId': 'noteId',
  '#userId': 'userId',
  '#title': 'title',
  '#content': 'content',
  '#summary': 'summary',
  '#actions': 'actions',
  '#tags': 'tags',
  '#pinned': 'pinned',
  '#archived': 'archived',
  '#updatedAt': 'updatedAt',
};

/**
 * DynamoDB rejects an ExpressionAttributeNames map containing an alias the
 * expressions don't mention, so the map has to be built per call rather than
 * passed wholesale.
 */
function namesUsedIn(...expressions) {
  const used = {};
  for (const token of expressions.filter(Boolean).join(' ').match(/#[A-Za-z0-9_]+/g) ?? []) {
    if (NAMES[token]) used[token] = NAMES[token];
  }
  return used;
}

/** The four attributes `search()` needs. Keeps the query payload small. */
const SEARCH_PROJECTION = '#noteId, #title, #content, #updatedAt';

// ------------------------------------------------------------------ notes

/** @returns {Promise<object | null>} the stored item, or null. */
export async function getNote(noteId) {
  const { Item } = await client().send(
    new GetCommand({ TableName: NOTES_TABLE(), Key: { noteId } }),
  );
  return Item ?? null;
}

/**
 * Write a note, unless the finished item would be over the stored-size ceiling.
 *
 * Measured on the complete item, attribute names and overhead included, after
 * the generated fields have been bounded. Nothing is trimmed here to make it
 * fit: an item that is still too big is refused with `NoteTooLargeError`, and
 * nothing is written.
 */
export async function putNote(note) {
  if (itemBytes(note) > LIMITS.itemBytes) throw new NoteTooLargeError();
  await client().send(new PutCommand({ TableName: NOTES_TABLE(), Item: note }));
  return note;
}

/**
 * Delete, with ownership enforced by the condition rather than by a prior read.
 *
 * `ReturnValuesOnConditionCheckFailure` is what makes this possible: when the
 * condition fails DynamoDB hands back the item it refused to touch, so we can
 * tell "someone else's note" (403) from "no such note" (404) without ever
 * holding GetItem permission. That is why `deleteNote`'s IAM role is a single
 * DeleteItem statement, exactly as report §4.3E specifies.
 *
 * @returns {Promise<'deleted' | 'forbidden' | 'not-found'>}
 */
export async function deleteNoteOwnedBy(noteId, userId) {
  try {
    await client().send(
      new DeleteCommand({
        TableName: NOTES_TABLE(),
        Key: { noteId },
        ConditionExpression: 'attribute_exists(#noteId) AND #userId = :userId',
        ExpressionAttributeNames: { '#noteId': 'noteId', '#userId': 'userId' },
        ExpressionAttributeValues: { ':userId': userId },
        ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
      }),
    );
    return 'deleted';
  } catch (error) {
    if (error.name !== 'ConditionalCheckFailedException') throw error;
    return error.Item ? 'forbidden' : 'not-found';
  }
}

const FILTERS = {
  pinned: { expression: '#pinned = :true', values: { ':true': true } },
  archived: { expression: '#archived = :true', values: { ':true': true } },
};

/**
 * One page of a user's notes, newest first.
 *
 * Filter views apply a FilterExpression *after* the query, as report §4.3C
 * describes — which means a page can come back shorter than `limit` while more
 * results still exist. That is DynamoDB's semantics, and the cursor is what
 * makes it correct: keep following it until it comes back undefined.
 *
 * @returns {Promise<{ items: object[], cursor?: string }>}
 */
export async function listNotesByUser(userId, { limit = 25, cursor, filter, projection } = {}) {
  const filterSpec = filter ? FILTERS[filter] : undefined;
  const keyCondition = '#userId = :userId';

  const { Items = [], LastEvaluatedKey } = await client().send(
    new QueryCommand({
      TableName: NOTES_TABLE(),
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: keyCondition,
      // Descending on updatedAt: the GSI sort key gives reverse-chronological
      // listing for free, with no sort in the Lambda and no scan.
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor, userId),
      ...(filterSpec ? { FilterExpression: filterSpec.expression } : {}),
      ...(projection ? { ProjectionExpression: projection } : {}),
      ExpressionAttributeNames: namesUsedIn(keyCondition, filterSpec?.expression, projection),
      ExpressionAttributeValues: { ':userId': userId, ...(filterSpec?.values ?? {}) },
    }),
  );

  return { items: Items, cursor: encodeCursor(LastEvaluatedKey) };
}

/**
 * Every note a user has, following the cursor to the end.
 *
 * Search needs the whole corpus — TF-IDF's inverse document frequency is
 * computed across it — and so do the actions list, the GDPR export and the
 * GDPR delete. Scoping "the corpus" to one user is both correct (relevance is
 * personal) and what keeps this bounded. The ceiling is roughly 1–2k notes per
 * user; past that the query payload and index build dominate and the upgrade
 * path is an inverted-index table written on save. Do not build that until
 * measurement says it is needed.
 */
export async function listAllNotesByUser(userId, { projection, pageSize = 250 } = {}) {
  const all = [];
  let cursor;

  do {
    const page = await listNotesByUser(userId, { limit: pageSize, cursor, projection });
    all.push(...page.items);
    cursor = page.cursor;
  } while (cursor);

  return all;
}

/** Hydrate the top search hits. BatchGetItem caps at 100 keys per call. */
export async function batchGetNotes(noteIds) {
  if (noteIds.length === 0) return [];

  const found = new Map();

  for (let start = 0; start < noteIds.length; start += 100) {
    const keys = noteIds.slice(start, start + 100).map((noteId) => ({ noteId }));

    // BatchGetItem may return UnprocessedKeys under throttling; retrying them
    // is the caller's job, and here the caller is us. Retried with backoff,
    // never straight away: see retry.js.
    await retryUnprocessed(keys, async (pending) => {
      const response = await client().send(
        new BatchGetCommand({ RequestItems: { [NOTES_TABLE()]: { Keys: pending } } }),
      );
      for (const item of response.Responses?.[NOTES_TABLE()] ?? []) {
        found.set(item.noteId, item);
      }
      return response.UnprocessedKeys?.[NOTES_TABLE()]?.Keys ?? [];
    }, timing);
  }

  // Preserve the order the caller asked in — for search that order is the ranking.
  return noteIds.map((noteId) => found.get(noteId)).filter(Boolean);
}

// ------------------------------------------------------------ preferences

/** @returns {Promise<object | null>} the stored preferences, or null if never set. */
export async function getPreferences(userId) {
  const { Item } = await client().send(
    new GetCommand({ TableName: PREFERENCES_TABLE(), Key: { userId } }),
  );
  return Item ?? null;
}

export async function putPreferences(userId, preferences) {
  const item = { userId, ...preferences, updatedAt: new Date().toISOString() };
  await client().send(new PutCommand({ TableName: PREFERENCES_TABLE(), Item: item }));
  return item;
}

// ------------------------------------------------------------------- gdpr

/**
 * Hard delete: every note plus the preferences item. No soft-delete flag, no
 * tombstone — CONTEXT.md §2 rule 7 promises a clear deletion policy, and
 * "we marked it deleted" is not one.
 */
export async function deleteEverythingForUser(userId) {
  const notes = await listAllNotesByUser(userId, { projection: '#noteId' });

  for (let start = 0; start < notes.length; start += 25) {
    const requests = notes
      .slice(start, start + 25)
      .map((note) => ({ DeleteRequest: { Key: { noteId: note.noteId } } }));

    await retryUnprocessed(requests, async (pending) => {
      const response = await client().send(
        new BatchWriteCommand({ RequestItems: { [NOTES_TABLE()]: pending } }),
      );
      return response.UnprocessedItems?.[NOTES_TABLE()] ?? [];
    }, timing);
  }

  await client().send(
    new DeleteCommand({ TableName: PREFERENCES_TABLE(), Key: { userId } }),
  );

  return { notesDeleted: notes.length };
}

export { SEARCH_PROJECTION };
