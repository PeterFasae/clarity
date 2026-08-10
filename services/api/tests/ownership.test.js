import { beforeAll, describe, expect, test } from 'vitest';
import { api, createNote, someUser } from './helpers.js';

/**
 * The reason Phase 1 exists.
 *
 * The predecessor defaulted `userId` to the literal string "default-user" and
 * no handler checked ownership, so every note in the system belonged to
 * everybody. This file was written before the handlers were.
 *
 * 403 rather than 404 throughout: the id is a v4 UUID, so there is nothing to
 * enumerate, and being explicit makes the failure unambiguous.
 */

const owner = someUser();
const stranger = someUser();
let note;

beforeAll(async () => {
  note = await createNote(owner, { content: 'The bank details for the deposit are in the drawer.' });
});

describe("another user's note", () => {
  test('cannot be read', async () => {
    const response = await api('GET', `/notes/${note.id}`, { as: stranger });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden');
    // Nothing about the note leaks through the refusal.
    expect(JSON.stringify(response.body)).not.toContain('bank details');
  });

  test('cannot have its summary read', async () => {
    const response = await api('GET', `/notes/${note.id}/summary`, { as: stranger });
    expect(response.status).toBe(403);
  });

  test('cannot be updated', async () => {
    const response = await api('PUT', `/notes/${note.id}`, {
      as: stranger,
      body: { content: 'Rewritten by someone else.' },
    });

    expect(response.status).toBe(403);

    const stillThere = await api('GET', `/notes/${note.id}`, { as: owner });
    expect(stillThere.body.note.content).toBe(
      'The bank details for the deposit are in the drawer.',
    );
  });

  test('cannot be re-summarised', async () => {
    const response = await api('POST', `/notes/${note.id}/summarize`, { as: stranger });
    expect(response.status).toBe(403);
  });

  test('cannot be deleted', async () => {
    const response = await api('DELETE', `/notes/${note.id}`, { as: stranger });

    expect(response.status).toBe(403);

    const stillThere = await api('GET', `/notes/${note.id}`, { as: owner });
    expect(stillThere.status).toBe(200);
  });
});

describe('a note that does not exist', () => {
  const missing = '00000000-0000-4000-8000-000000000000';

  test('reads as 404, not 403', async () => {
    const response = await api('GET', `/notes/${missing}`, { as: owner });
    expect(response.status).toBe(404);
  });

  test('deletes as 404, not 403', async () => {
    const response = await api('DELETE', `/notes/${missing}`, { as: owner });
    expect(response.status).toBe(404);
  });
});

describe('listing', () => {
  test("never includes another user's notes", async () => {
    await createNote(stranger, { content: 'Entirely unrelated shopping list.' });

    const mine = await api('GET', '/notes', { as: owner });
    const theirs = await api('GET', '/notes', { as: stranger });

    expect(mine.body.notes.map((n) => n.id)).toEqual([note.id]);
    expect(theirs.body.notes.map((n) => n.id)).not.toContain(note.id);
  });

  test('a search cannot reach across users', async () => {
    const response = await api('GET', '/notes?q=deposit%20drawer', { as: stranger });
    expect(response.body.notes.map((n) => n.id)).not.toContain(note.id);
  });

  test('an export contains only the exporter’s notes', async () => {
    const response = await api('POST', '/me/export', { as: stranger });

    expect(response.status).toBe(200);
    expect(response.body.notes.map((n) => n.id)).not.toContain(note.id);
  });
});
