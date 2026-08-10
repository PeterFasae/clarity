/**
 * The store, and the seam.
 *
 * This is the only file that knows DynamoDB exists. Handlers call these
 * functions and never see a client, a table name, or an ExclusiveStartKey.
 * Keeping that boundary honest is what makes the data layer swappable — it is
 * how the in-memory version of this app became the AWS version without any
 * handler changing.
 *
 * STUB — Phase 0 scaffolds the shape; Phase 1 implements it against
 * NotesTable (PK `noteId`, GSI `UserIdIndex`: PK `userId`, SK `updatedAt`).
 */

const notImplemented = (name) => {
  throw new Error(`dynamo.${name} is not implemented until Phase 1`);
};

/** @returns {Promise<import('@clarity/core').StoredNote | null>} */
export async function getNote(_noteId) {
  return notImplemented('getNote');
}

/** @returns {Promise<import('@clarity/core').StoredNote>} */
export async function putNote(_note) {
  return notImplemented('putNote');
}

export async function deleteNote(_noteId) {
  return notImplemented('deleteNote');
}

/**
 * Query UserIdIndex. `projection` keeps the payload small on the search path —
 * noteId, title, content, updatedAt is enough to rank against.
 * `filter` applies a FilterExpression after the query (report §4.3C).
 *
 * @returns {Promise<{ items: object[], cursor?: string }>}
 */
export async function listNotesByUser(_userId, _options = {}) {
  return notImplemented('listNotesByUser');
}

/** Hydrate the top N search hits. */
export async function batchGetNotes(_noteIds) {
  return notImplemented('batchGetNotes');
}

/** @returns {Promise<import('@clarity/core').Preferences | null>} */
export async function getPreferences(_userId) {
  return notImplemented('getPreferences');
}

export async function putPreferences(_userId, _preferences) {
  return notImplemented('putPreferences');
}

/** GDPR hard delete: every note plus the preferences item. */
export async function deleteEverythingForUser(_userId) {
  return notImplemented('deleteEverythingForUser');
}
