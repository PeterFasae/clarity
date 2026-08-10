import { beforeAll, describe, expect, test } from 'vitest';
import { api, createNote, someUser } from './helpers.js';

const user = someUser();
let dashboard;

/**
 * The thesis, tested.
 *
 * "Capture was never the problem. Getting it back out was." — so the case that
 * matters is finding a note by describing it rather than naming it.
 */
beforeAll(async () => {
  dashboard = await createNote(user, {
    content: [
      'Why the dashboard felt slow',
      '',
      'The orders panel waited for its own request to come back before it asked',
      'for details, so every request after it queued behind that one.',
    ].join('\n'),
  });

  await createNote(user, {
    content: 'Dentist\n\nRing about the appointment on Tuesday.',
  });
  await createNote(user, {
    content: 'Billing migration\n\nThe invoice schema needs a review before we migrate.',
  });
  await createNote(user, {
    content: 'Standup\n\nDiscussed the invoice schema and the migration plan.',
  });
});

describe('search', () => {
  test('finds a note by what it says, not what it is called', async () => {
    // Not one of these words is in the title "Why the dashboard felt slow"
    // except "slow" — "page"/"request" live only in the body.
    const response = await api('GET', '/notes?q=why%20was%20the%20request%20slow', { as: user });

    expect(response.status).toBe(200);
    expect(response.body.query).toBe('why was the request slow');
    expect(response.body.notes[0].id).toBe(dashboard.id);
  });

  test('matches on words that appear only in the body', async () => {
    const response = await api('GET', '/notes?q=orders%20queued', { as: user });

    expect(response.body.notes.map((note) => note.id)).toContain(dashboard.id);
  });

  test('returns a score with every hit', async () => {
    const response = await api('GET', '/notes?q=invoice%20schema', { as: user });

    expect(response.body.notes.length).toBeGreaterThan(0);
    for (const note of response.body.notes) {
      expect(note.score).toBeGreaterThan(0);
    }
    // Ranked, best first.
    const scores = response.body.notes.map((note) => note.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  test('hydrates the full note, not just the projection it ranked on', async () => {
    const response = await api('GET', '/notes?q=orders%20queued', { as: user });
    const hit = response.body.notes[0];

    expect(hit.summary).toBeTypeOf('string');
    expect(hit.actions).toBeInstanceOf(Array);
    expect(hit.createdAt).toBeTypeOf('string');
    expect(hit).not.toHaveProperty('noteId');
  });

  test('excludes notes that share no term with the query', async () => {
    const response = await api('GET', '/notes?q=dentist%20appointment', { as: user });

    expect(response.body.notes.map((note) => note.id)).not.toContain(dashboard.id);
  });

  test('returns nothing rather than everything for an unmatched query', async () => {
    const response = await api('GET', '/notes?q=kayaking%20volcano', { as: user });

    expect(response.status).toBe(200);
    expect(response.body.notes).toEqual([]);
  });

  test('a whitespace-only query lists rather than searches', async () => {
    const response = await api('GET', '/notes?q=%20%20%20', { as: user });

    expect(response.body.notes.length).toBe(4);
    expect(response.body).not.toHaveProperty('query');
  });
});
