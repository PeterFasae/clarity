import { UpdateNoteRequestSchema, deriveTitle } from '@clarity/core';
import { selectEngine } from '../lib/ai/index.js';
import { assertOwnership } from '../lib/auth.js';
import { getNote, getPreferences, putNote } from '../lib/dynamo.js';
import { enrich } from '../lib/enrich.js';
import { NotFoundError } from '../lib/errors.js';
import { parseBody, withAuth } from '../lib/handler.js';
import { ok, toWireNote } from '../lib/respond.js';

/**
 * PUT /notes/{id} — a partial update. Summary and actions are recomputed on
 * every write, and `content` is only ever written from the request body.
 */
export const handler = withAuth(async (event, userId) => {
  const existing = await getNote(event.pathParameters.id);
  if (!existing) throw new NotFoundError();
  assertOwnership(existing, userId);

  const body = parseBody(event, UpdateNoteRequestSchema);
  const content = body.content ?? existing.content;

  const merged = {
    ...existing,
    content,
    title: nextTitle(existing, body, content),
    ...(body.tags !== undefined ? { tags: body.tags } : {}),
    ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
    ...(body.archived !== undefined ? { archived: body.archived } : {}),
    ...(body.sharedWith !== undefined ? { sharedWith: body.sharedWith } : {}),
    ...(body.reminders !== undefined ? { reminders: body.reminders } : {}),
  };

  const engine = await selectEngine(await getPreferences(userId));
  const note = await enrich(merged, engine);
  await putNote(note);
  return ok(event, { note: toWireNote(note) });
});

/**
 * A title the user typed is theirs and survives any later edit. A title that
 * was derived stays derived, and follows the first line as the note grows.
 * Telling the two apart by re-deriving from the *old* content is the whole
 * trick — otherwise toggling `pinned` would silently rename the note.
 */
function nextTitle(existing, body, content) {
  if (body.title !== undefined) return body.title.trim() || deriveTitle(content);
  if (existing.title === deriveTitle(existing.content)) return deriveTitle(content);
  return existing.title;
}
