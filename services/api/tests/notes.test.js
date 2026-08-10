import { describe, expect, test } from 'vitest';
import { api, createNote, someUser } from './helpers.js';

const user = someUser();

/**
 * The note the user wrote comes back exactly as they wrote it. Summary and
 * actions live in their own fields and are computed on write.
 *
 * The predecessor's summariser overwrote `content` with its summary, which
 * destroyed the user's own words. That is the single worst inherited bug, and
 * this file is where it does not come back.
 */
const MESSY = [
  '# Supervision — 12 March',
  '',
  'Talked about the retrieval chapter. He thinks the evaluation section is thin  ',
  'and wants a comparison against a baseline before the next draft.',
  '',
  'TODO: book a slot in the lab for the study',
  'I need to email the ethics board about the amendment',
  '- [ ] rewrite section 4.2',
  '',
  'Also: café ☕️ closes at 4 now — 100% annoying.',
].join('\n');

describe('creating a note', () => {
  test('stores the content byte-for-byte, and computes the rest', async () => {
    const created = await createNote(user, { content: MESSY });
    const fetched = await api('GET', `/notes/${created.id}`, { as: user });

    expect(fetched.status).toBe(200);
    expect(fetched.body.note.content).toBe(MESSY);
    expect(fetched.body.note.summary).not.toBe('');
    expect(fetched.body.note.summary).not.toBe(MESSY);
    expect(fetched.body.note.actions.length).toBeGreaterThan(0);
    expect(fetched.body.note.summarySource).toBe('local');
  });

  test('lifts the actions out without touching the note', async () => {
    const note = await createNote(user, { content: MESSY });

    expect(note.actions).toEqual([
      'book a slot in the lab for the study',
      'email the ethics board about the amendment',
      'rewrite section 4.2',
    ]);
    expect(note.content).toBe(MESSY);
  });

  test('derives the title from the first line, stripped of its hash', async () => {
    const note = await createNote(user, { content: MESSY });
    expect(note.title).toBe('Supervision — 12 March');
  });

  test('keeps a title the caller supplied', async () => {
    const note = await createNote(user, { content: MESSY, title: 'Supervision notes' });
    expect(note.title).toBe('Supervision notes');
  });

  test('returns `id`, never `noteId`, and never the owner', async () => {
    const note = await createNote(user, { content: 'One line.' });

    expect(note.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(note).not.toHaveProperty('noteId');
    expect(note).not.toHaveProperty('userId');
  });

  test('refuses an empty note with a 422 and a reason', async () => {
    const response = await api('POST', '/notes', { as: user, body: { content: '' } });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('validation_failed');
    expect(response.body.details[0].path).toBe('content');
  });

  test('refuses a body that is not JSON', async () => {
    const response = await api('POST', '/notes', {
      as: user,
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
    });
    expect(response.status).toBe(422);
  });
});

describe('updating a note', () => {
  test('recomputes summary and actions, and stores the new content exactly', async () => {
    const note = await createNote(user, { content: 'Ring the dentist about the appointment.' });
    const rewritten = 'TODO: ring the dentist\nTODO: move the standup to Thursday';

    const response = await api('PUT', `/notes/${note.id}`, {
      as: user,
      body: { content: rewritten },
    });

    expect(response.status).toBe(200);
    expect(response.body.note.content).toBe(rewritten);
    expect(response.body.note.actions).toEqual([
      'ring the dentist',
      'move the standup to Thursday',
    ]);
    expect(response.body.note.summary).not.toBe(note.summary);

    const fetched = await api('GET', `/notes/${note.id}`, { as: user });
    expect(fetched.body.note.content).toBe(rewritten);
  });

  test('a pin does not rewrite the note', async () => {
    const note = await createNote(user, { content: 'Keep this exactly as written.' });

    const response = await api('PUT', `/notes/${note.id}`, { as: user, body: { pinned: true } });

    expect(response.body.note.pinned).toBe(true);
    expect(response.body.note.content).toBe('Keep this exactly as written.');
  });

  test('a title the user typed survives a later content edit', async () => {
    const note = await createNote(user, {
      content: 'First line here.',
      title: 'My own title',
    });

    const response = await api('PUT', `/notes/${note.id}`, {
      as: user,
      body: { content: 'A completely different first line.' },
    });

    expect(response.body.note.title).toBe('My own title');
  });

  test('a derived title follows the first line', async () => {
    const note = await createNote(user, { content: 'First line here.' });

    const response = await api('PUT', `/notes/${note.id}`, {
      as: user,
      body: { content: 'A completely different first line.' },
    });

    expect(response.body.note.title).toBe('A completely different first line.');
  });

  test('refuses an empty update', async () => {
    const note = await createNote(user, { content: 'Something.' });
    const response = await api('PUT', `/notes/${note.id}`, { as: user, body: {} });
    expect(response.status).toBe(422);
  });
});

describe('the summary routes', () => {
  test('GET /notes/{id}/summary returns what was stored', async () => {
    const note = await createNote(user, { content: MESSY });
    const response = await api('GET', `/notes/${note.id}/summary`, { as: user });

    expect(response.status).toBe(200);
    expect(response.body.summary).toBe(note.summary);
    expect(response.body.actions).toEqual(note.actions);
    expect(response.body.summarySource).toBe('local');
  });

  test('POST /notes/{id}/summarize recomputes without touching content', async () => {
    const note = await createNote(user, { content: MESSY });
    const response = await api('POST', `/notes/${note.id}/summarize`, { as: user });

    expect(response.status).toBe(200);
    expect(response.body.note.content).toBe(MESSY);
    expect(response.body.note.summary).toBe(note.summary);
  });

  test('?mode=llm is refused while aiEnabled is false, not quietly downgraded', async () => {
    const note = await createNote(user, { content: MESSY });
    const response = await api('POST', `/notes/${note.id}/summarize?mode=llm`, { as: user });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('ai_disabled');
  });
});

describe('deleting a note', () => {
  test('removes it', async () => {
    const note = await createNote(user, { content: 'Temporary.' });

    const response = await api('DELETE', `/notes/${note.id}`, { as: user });
    expect(response.status).toBe(204);

    const fetched = await api('GET', `/notes/${note.id}`, { as: user });
    expect(fetched.status).toBe(404);
  });
});
