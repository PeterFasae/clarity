import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { api, createNote, someUser } from './helpers.js';

/**
 * The privacy claim, tested.
 *
 * CONTEXT.md §4.5: "A user who never turns the flag on has genuinely never had
 * a note leave the system. That is a claim worth being able to make." This file
 * is what makes it a claim rather than an intention.
 *
 * `ANTHROPIC_BASE_URL` points the SDK at a recorder inside the test rig, so any
 * request the API makes — through any code path, intended or not — is counted.
 * With the flag off the count must be zero. The tests immediately after prove
 * the counter is capable of going up, because a zero that can never be anything
 * else proves nothing at all.
 */

const RECORDER = 'http://localhost:3997';

const recorder = {
  reset: () => fetch(`${RECORDER}/__reset`, { method: 'POST' }),
  hits: () => fetch(`${RECORDER}/__hits`).then((r) => r.json()),
  mode: (mode) =>
    fetch(`${RECORDER}/__mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }),
};

/** Accept the consent copy, then switch the flag on. */
async function enableAi(user) {
  const response = await api('PUT', '/me/preferences', {
    as: user,
    body: { aiEnabled: true, aiConsentedAt: new Date().toISOString() },
  });
  expect(response.status).toBe(200);
  expect(response.body.preferences.aiEnabled).toBe(true);
}

beforeEach(() => recorder.reset());
afterEach(() => recorder.reset());

describe('with AI assistance off — the default', () => {
  test('nothing reaches Anthropic, across every route that could have', async () => {
    const user = someUser();

    const note = await createNote(user, {
      content: 'Supervision\n\nTODO: book the lab slot\nI need to email the ethics board',
    });
    await api('PUT', `/notes/${note.id}`, { as: user, body: { content: 'Rewritten entirely.' } });
    await api('POST', `/notes/${note.id}/summarize`, { as: user });
    await api('GET', `/notes/${note.id}/summary`, { as: user });
    await api('GET', '/notes?q=ethics%20board', { as: user });
    await api('GET', '/actions', { as: user });
    await api('POST', '/me/export', { as: user });

    const { count, requests } = await recorder.hits();
    expect({ count, requests }).toEqual({ count: 0, requests: [] });
  });

  test('a note is still summarised — locally', async () => {
    const note = await createNote(someUser(), {
      content: 'Ring the dentist about the crown.\n\nTODO: call on Monday',
    });

    expect(note.summary).not.toBe('');
    expect(note.actions).toEqual(['call on Monday']);
    expect(note.summarySource).toBe('local');
    expect((await recorder.hits()).count).toBe(0);
  });

  test('asking for the LLM anyway is refused, not quietly downgraded', async () => {
    const user = someUser();
    const note = await createNote(user, { content: 'Anything at all.' });

    const response = await api('POST', `/notes/${note.id}/summarize?mode=llm`, { as: user });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('ai_disabled');
    expect((await recorder.hits()).count).toBe(0);
  });

  test('the flag cannot be switched on without consent on the record', async () => {
    const user = someUser();

    const refused = await api('PUT', '/me/preferences', { as: user, body: { aiEnabled: true } });
    expect(refused.status).toBe(422);
    expect(refused.body.error).toBe('consent_required');

    const stillOff = await api('GET', '/me/preferences', { as: user });
    expect(stillOff.body.preferences.aiEnabled).toBe(false);
  });
});

describe('with AI assistance on', () => {
  test('the recorder does see a request — so the zero above means something', async () => {
    const user = someUser();
    await enableAi(user);

    const note = await createNote(user, { content: 'A note worth summarising properly.' });

    const { count, requests } = await recorder.hits();
    expect(count).toBeGreaterThan(0);
    expect(requests[0].model).toBe('claude-sonnet-5');
    expect(note.summarySource).toBe('llm');
    expect(note.summary).toContain('written by the language model');
  });

  test('the note itself is still never rewritten', async () => {
    const user = someUser();
    await enableAi(user);

    const original = 'The exact words, kept exactly.\n\nTODO: prove it';
    const note = await createNote(user, { content: original });

    expect(note.content).toBe(original);
    expect(note.summary).not.toBe(original);
  });
});

describe('when Anthropic is unavailable', () => {
  test('an error still saves the note, locally', async () => {
    const user = someUser();
    await enableAi(user);
    await recorder.mode('error');

    const note = await createNote(user, { content: 'TODO: survive the outage' });

    expect(note.summarySource).toBe('local');
    expect(note.actions).toEqual(['survive the outage']);
    expect((await recorder.hits()).count).toBeGreaterThan(0);
  });

  test('a hang still saves the note, once the timeout fires', async () => {
    const user = someUser();
    await enableAi(user);
    await recorder.mode('hang');

    const started = Date.now();
    const note = await createNote(user, { content: 'TODO: not wait forever' });
    const elapsed = Date.now() - started;

    expect(note.summarySource).toBe('local');
    expect(note.actions).toEqual(['not wait forever']);
    // Bounded by the engine's own timeout rather than by the Lambda's.
    expect(elapsed).toBeLessThan(5000);
  });

  test('a refusal still saves the note, locally', async () => {
    const user = someUser();
    await enableAi(user);
    await recorder.mode('refusal');

    const note = await createNote(user, { content: 'TODO: handle a refusal' });

    expect(note.summarySource).toBe('local');
    expect(note.summary).not.toBe('');
  });
});
