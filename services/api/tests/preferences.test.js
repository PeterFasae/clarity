import { describe, expect, test } from 'vitest';
import { api, createNote, someUser } from './helpers.js';

describe('preferences', () => {
  test('a user who has never set any gets a complete default set', async () => {
    const response = await api('GET', '/me/preferences', { as: someUser() });

    expect(response.status).toBe(200);
    expect(response.body.preferences).toEqual({
      theme: 'light',
      font: 'atkinson',
      textSize: 'm',
      motion: 'full',
      aiEnabled: false,
      aiConsentedAt: null,
    });
  });

  test('aiEnabled is false until the user says otherwise', async () => {
    const response = await api('GET', '/me/preferences', { as: someUser() });
    expect(response.body.preferences.aiEnabled).toBe(false);
  });

  test('a partial update leaves the rest alone', async () => {
    const user = someUser();

    await api('PUT', '/me/preferences', { as: user, body: { theme: 'low-stimulation' } });
    const afterFirst = await api('PUT', '/me/preferences', { as: user, body: { textSize: 'xl' } });

    expect(afterFirst.body.preferences.theme).toBe('low-stimulation');
    expect(afterFirst.body.preferences.textSize).toBe('xl');
    expect(afterFirst.body.preferences.font).toBe('atkinson');
  });

  test('persists across requests, which is what makes settings follow a user', async () => {
    const user = someUser();

    await api('PUT', '/me/preferences', {
      as: user,
      body: { theme: 'high-contrast', font: 'dyslexic', motion: 'reduced' },
    });
    const reread = await api('GET', '/me/preferences', { as: user });

    expect(reread.body.preferences).toMatchObject({
      theme: 'high-contrast',
      font: 'dyslexic',
      motion: 'reduced',
    });
  });

  test('refuses a value outside the contract', async () => {
    const response = await api('PUT', '/me/preferences', {
      as: someUser(),
      body: { theme: 'neon' },
    });

    expect(response.status).toBe(422);
    expect(response.body.details[0].path).toBe('theme');
  });

  test('one user’s preferences are not another’s', async () => {
    const alice = someUser();
    const bob = someUser();

    await api('PUT', '/me/preferences', { as: alice, body: { theme: 'dark' } });
    const bobs = await api('GET', '/me/preferences', { as: bob });

    expect(bobs.body.preferences.theme).toBe('light');
  });
});

describe('export and delete', () => {
  test('export returns every note plus the preferences', async () => {
    const user = someUser();
    await createNote(user, { content: 'One.' });
    await createNote(user, { content: 'Two.' });
    await api('PUT', '/me/preferences', { as: user, body: { theme: 'dark' } });

    const response = await api('POST', '/me/export', { as: user });

    expect(response.status).toBe(200);
    expect(response.body.notes).toHaveLength(2);
    expect(response.body.preferences.theme).toBe('dark');
    expect(response.body.exportedAt).toBeTypeOf('string');
  });

  test('delete will not fire without an explicit confirmation', async () => {
    const user = someUser();
    await createNote(user, { content: 'Still here.' });

    const response = await api('DELETE', '/me', { as: user, body: {} });

    expect(response.status).toBe(422);
    const stillThere = await api('GET', '/notes', { as: user });
    expect(stillThere.body.notes).toHaveLength(1);
  });

  test('delete leaves no residue', async () => {
    const user = someUser();
    await createNote(user, { content: 'Delete me.' });
    await createNote(user, { content: 'Delete me too.' });
    await api('PUT', '/me/preferences', { as: user, body: { theme: 'dark' } });

    const response = await api('DELETE', '/me', { as: user, body: { confirm: true } });
    expect(response.status).toBe(200);
    expect(response.body.notesDeleted).toBe(2);

    const notes = await api('GET', '/notes', { as: user });
    expect(notes.body.notes).toEqual([]);

    const preferences = await api('GET', '/me/preferences', { as: user });
    expect(preferences.body.preferences.theme).toBe('light');
  });
});
