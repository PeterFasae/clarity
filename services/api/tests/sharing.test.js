import { describe, expect, test } from 'vitest';
import { api, createNote, rawStoredNote, someUser } from './helpers.js';

const user = someUser();
const STRANGER = 'a.stranger@example.test';

/**
 * Sharing is planned, not built (docs/status.json), so the API has no sharing
 * surface at all. A client that still sends `sharedWith` is told so, rather
 * than having the field dropped in silence and believing a note was shared.
 */
describe('sharing is not available', () => {
  test('creating a note with sharedWith is refused with a stable code, and nothing is created', async () => {
    const before = (await api('GET', '/notes', { as: user })).body.notes.length;

    const response = await api('POST', '/notes', {
      as: user,
      body: { content: 'Shared draft', sharedWith: [{ email: STRANGER, permission: 'write' }] },
    });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('sharing_not_available');
    expect(response.body.message).toBe("Sharing isn't available yet.");
    expect((await api('GET', '/notes', { as: user })).body.notes.length).toBe(before);
  });

  test('updating a note with sharedWith is refused, and no other change in the same request is applied', async () => {
    const note = await createNote(user, { content: 'Original words' });

    const response = await api('PUT', `/notes/${note.id}`, {
      as: user,
      body: { pinned: true, sharedWith: [{ email: STRANGER, permission: 'read' }] },
    });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('sharing_not_available');

    const after = (await api('GET', `/notes/${note.id}`, { as: user })).body.note;
    expect(after.pinned).toBe(false);
    expect(after.content).toBe('Original words');
  });

  test('an empty list is refused too, because the field itself is gone', async () => {
    const response = await api('POST', '/notes', {
      as: user,
      body: { content: 'x', sharedWith: [] },
    });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('sharing_not_available');
  });

  test('a null value is refused as well', async () => {
    const response = await api('POST', '/notes', { as: user, body: { content: 'x', sharedWith: null } });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('sharing_not_available');
  });

  test('the refusal does not echo what was sent', async () => {
    const response = await api('POST', '/notes', {
      as: user,
      body: { content: 'x', sharedWith: [{ email: STRANGER, permission: 'write' }] },
    });

    expect(JSON.stringify(response.body)).not.toContain(STRANGER);
  });

  test('a request without it is unaffected', async () => {
    const response = await api('POST', '/notes', { as: user, body: { content: 'No sharing here' } });

    expect(response.status).toBe(201);
  });

  test('a note no longer carries a sharedWith field on the wire', async () => {
    const note = await createNote(user, { content: 'Plain note' });

    expect(note).not.toHaveProperty('sharedWith');
  });

  test('and none is stored', async () => {
    const note = await createNote(user, { content: 'Stored plain note' });
    const stored = await rawStoredNote(note.id);

    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty('sharedWith');
  });

  test('the shared filter is no longer a filter', async () => {
    const response = await api('GET', '/notes?filter=shared', { as: user });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('validation_failed');
    // Zod's own wording for an unknown enum value names what it was sent.
    expect(JSON.stringify(response.body)).not.toContain('received');
  });
});
