import { search } from '@clarity/retrieval';
import { ListNotesQuerySchema } from '@clarity/core';
import { SEARCH_PROJECTION, batchGetNotes, listAllNotesByUser, listNotesByUser } from '../lib/dynamo.js';
import { parseQuery, withAuth } from '../lib/handler.js';
import { ok, toWireNote } from '../lib/respond.js';

/**
 * GET /notes — list, filter and search, all through one handler.
 *
 *   ?q=       rank the user's notes with search() from @clarity/retrieval
 *   ?filter=  pinned | archived | shared
 *   ?limit= / ?cursor=   pagination over the UserIdIndex GSI
 *
 * The predecessor pointed four separate routes at this handler and branched on
 * `event.path`, because its frontend never sent query parameters. One handler,
 * one query string.
 */
export const handler = withAuth(async (event, userId) => {
  const { q, filter, limit, cursor } = parseQuery(event, ListNotesQuerySchema);
  const query = q?.trim();

  if (query) return ok(event, await runSearch(userId, query, limit));

  const page = await listNotesByUser(userId, { limit, cursor, filter });
  return ok(event, {
    notes: page.items.map((note) => toWireNote(note)),
    ...(page.cursor ? { cursor: page.cursor } : {}),
  });
});

/**
 * Scoped to one user's own notes, which is both correct — relevance is
 * personal — and what keeps an in-Lambda TF-IDF viable. The corpus is projected
 * down to the four attributes the scorer reads, then the top hits are hydrated
 * in one BatchGetItem.
 */
async function runSearch(userId, query, limit) {
  const corpus = await listAllNotesByUser(userId, { projection: SEARCH_PROJECTION });

  // `search()` reads `note.id`, `note.title` and `note.body`. That naming is
  // the engine's and it is vendored — six of its 25 tests pass fixtures in
  // that shape — so the mapping happens here rather than in the engine.
  // Everything either side of these two lines says `content`.
  const scorable = corpus.map((note) => ({
    id: note.noteId,
    title: note.title,
    body: note.content,
  }));

  const hits = search(query, scorable, { limit });
  if (hits.length === 0) return { query, notes: [] };

  const scores = new Map(hits.map((hit) => [hit.note.id, hit.score]));
  const hydrated = await batchGetNotes(hits.map((hit) => hit.note.id));

  return {
    query,
    notes: hydrated.map((note) =>
      toWireNote(note, { score: Number(scores.get(note.noteId).toFixed(4)) }),
    ),
  };
}
