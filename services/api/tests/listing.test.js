import { beforeAll, describe, expect, test } from 'vitest';
import { api, createNote, someUser } from './helpers.js';

const user = someUser();
const created = [];

beforeAll(async () => {
  // Sequential, so every note gets its own updatedAt and the GSI sort key is a
  // total order rather than a tie.
  for (let n = 1; n <= 5; n += 1) {
    created.push(await createNote(user, { content: `Note number ${n}` }));
  }

  await api('PUT', `/notes/${created[0].id}`, { as: user, body: { pinned: true } });
  await api('PUT', `/notes/${created[1].id}`, { as: user, body: { archived: true } });
});

describe('listing', () => {
  test('is newest first', async () => {
    const response = await api('GET', '/notes', { as: user });
    const timestamps = response.body.notes.map((note) => note.updatedAt);

    expect([...timestamps].sort().reverse()).toEqual(timestamps);
  });

  test('?filter=pinned returns only pinned notes', async () => {
    const response = await api('GET', '/notes?filter=pinned', { as: user });

    expect(response.body.notes.map((note) => note.id)).toEqual([created[0].id]);
  });

  test('?filter=archived returns only archived notes', async () => {
    const response = await api('GET', '/notes?filter=archived', { as: user });

    expect(response.body.notes.map((note) => note.id)).toEqual([created[1].id]);
  });

  test('?filter=shared is refused, because sharing is not built', async () => {
    const response = await api('GET', '/notes?filter=shared', { as: user });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('validation_failed');
  });

  test('rejects a filter it does not know', async () => {
    const response = await api('GET', '/notes?filter=starred', { as: user });
    expect(response.status).toBe(422);
  });
});

describe('pagination', () => {
  test('walks the whole set with no duplicates and no gaps', async () => {
    const seen = [];
    let cursor;
    let pages = 0;

    do {
      const query = cursor ? `/notes?limit=2&cursor=${encodeURIComponent(cursor)}` : '/notes?limit=2';
      const response = await api('GET', query, { as: user });

      expect(response.status).toBe(200);
      seen.push(...response.body.notes.map((note) => note.id));
      cursor = response.body.cursor;
      pages += 1;
    } while (cursor && pages < 10);

    expect(pages).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(seen.length);
    expect(new Set(seen)).toEqual(new Set(created.map((note) => note.id)));
  });

  test('holds its ordering across the page boundary', async () => {
    const first = await api('GET', '/notes?limit=2', { as: user });
    const second = await api('GET', `/notes?limit=2&cursor=${encodeURIComponent(first.body.cursor)}`, {
      as: user,
    });

    const boundary = [
      ...first.body.notes.map((note) => note.updatedAt),
      ...second.body.notes.map((note) => note.updatedAt),
    ];

    expect([...boundary].sort().reverse()).toEqual(boundary);
  });

  test('a cursor from another user cannot reach their notes', async () => {
    const stranger = someUser();
    await createNote(stranger, { content: 'Not yours.' });

    const theirs = await api('GET', '/notes?limit=1', { as: stranger });
    const mine = await api('GET', `/notes?limit=5&cursor=${encodeURIComponent(theirs.body.cursor ?? '')}`, {
      as: user,
    });

    expect(mine.status).toBe(200);
    for (const note of mine.body.notes) {
      expect(created.map((n) => n.id)).toContain(note.id);
    }
  });

  test('a nonsense cursor starts from the beginning rather than erroring', async () => {
    const response = await api('GET', '/notes?limit=2&cursor=not-a-real-cursor', { as: user });
    expect(response.status).toBe(200);
  });
});

describe('actions', () => {
  test('are gathered across notes, each pointing back at its source', async () => {
    const actionUser = someUser();

    const first = await createNote(actionUser, {
      content: 'Supervision\n\nTODO: book the lab slot\nI need to email the ethics board',
    });
    const second = await createNote(actionUser, {
      content: 'Shopping\n\n- [ ] buy coffee',
    });

    const response = await api('GET', '/actions', { as: actionUser });

    expect(response.status).toBe(200);
    expect(response.body.actions).toHaveLength(3);

    const byText = Object.fromEntries(response.body.actions.map((a) => [a.text, a]));
    expect(byText['book the lab slot'].noteId).toBe(first.id);
    expect(byText['book the lab slot'].noteTitle).toBe('Supervision');
    expect(byText['buy coffee'].noteId).toBe(second.id);
    expect(byText['buy coffee'].noteTitle).toBe('Shopping');
  });

  test('follow the note when it is edited, because they are derived', async () => {
    const actionUser = someUser();
    const note = await createNote(actionUser, { content: 'TODO: the old thing' });

    await api('PUT', `/notes/${note.id}`, { as: actionUser, body: { content: 'TODO: the new thing' } });

    const response = await api('GET', '/actions', { as: actionUser });
    expect(response.body.actions.map((a) => a.text)).toEqual(['the new thing']);
  });
});
