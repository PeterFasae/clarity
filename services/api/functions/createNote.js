import { randomUUID } from 'node:crypto';
import { CreateNoteRequestSchema, deriveTitle } from '@clarity/core';
import { localEngine } from '../lib/ai/index.js';
import { putNote } from '../lib/dynamo.js';
import { enrich } from '../lib/enrich.js';
import { parseBody, withAuth } from '../lib/handler.js';
import { created, toWireNote } from '../lib/respond.js';

/**
 * POST /notes
 *
 * Summary and actions are computed here, on write. Note what the request schema
 * does not accept: `summary`, `actions`, `summarySource`, `userId`, or either
 * timestamp. Those are the server's, and `userId` is the authorizer's.
 */
export const handler = withAuth(async (event, userId) => {
  const body = parseBody(event, CreateNoteRequestSchema);
  const now = new Date().toISOString();

  const note = enrich(
    {
      noteId: randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
      title: body.title?.trim() || deriveTitle(body.content),
      content: body.content,
      summary: '',
      actions: [],
      summarySource: 'local',
      tags: body.tags ?? [],
      pinned: body.pinned ?? false,
      archived: false,
      sharedWith: [],
      reminders: body.reminders ?? [],
    },
    localEngine,
  );

  await putNote(note);
  return created(event, { note: toWireNote(note) });
});
