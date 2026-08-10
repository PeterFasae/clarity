import { listAllNotesByUser } from '../lib/dynamo.js';
import { withAuth } from '../lib/handler.js';
import { ok } from '../lib/respond.js';

/**
 * GET /actions — every action across the user's notes, newest note first.
 *
 * Derived at read time from each note's stored `actions`, never a separate
 * store. That is the whole reason an action cannot drift from the note it came
 * out of, and it is why ticking one off in Phase 2 will be a note edit rather
 * than a write to a second table that then disagrees.
 */
export const handler = withAuth(async (event, userId) => {
  const notes = await listAllNotesByUser(userId, {
    projection: '#noteId, #title, #actions',
  });

  const actions = notes.flatMap((note) =>
    (note.actions ?? []).map((text) => ({
      text,
      noteId: note.noteId,
      noteTitle: note.title,
    })),
  );

  return ok(event, { actions });
});
