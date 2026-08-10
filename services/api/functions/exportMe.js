import { DEFAULT_PREFERENCES, PreferencesSchema } from '@clarity/core';
import { getPreferences, listAllNotesByUser } from '../lib/dynamo.js';
import { withAuth } from '../lib/handler.js';
import { ok, toWireNote } from '../lib/respond.js';

/**
 * POST /me/export — everything this account has, as plain JSON.
 *
 * Scoped by the same UserIdIndex query every other read uses, so it can only
 * ever contain the caller's own notes. There is a test that says so.
 */
export const handler = withAuth(async (event, userId) => {
  const [notes, stored] = await Promise.all([
    listAllNotesByUser(userId),
    getPreferences(userId),
  ]);

  return ok(event, {
    exportedAt: new Date().toISOString(),
    notes: notes.map((note) => toWireNote(note)),
    preferences: PreferencesSchema.parse({ ...DEFAULT_PREFERENCES, ...(stored ?? {}) }),
  });
});
