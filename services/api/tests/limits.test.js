import { describe, expect, test, vi } from 'vitest';
import { LIMITS, countCodePoints, isWellFormedText } from '@clarity/core';
import { handler as createNoteHandler } from '../functions/createNote.js';
import { handler as putPreferencesHandler } from '../functions/putPreferences.js';
import { handler as updateNoteHandler } from '../functions/updateNote.js';
import { wireItemBytes } from '../lib/item-size.js';
import { api, createNote, rawStoredNote, someUser } from './helpers.js';

const user = someUser();

const EMOJI = '\u{1F600}';
const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}'; // 7 code points
const CJK = '中';
const LONE_HIGH = '\ud800';
const MARKER = 'SECRET-MARKER-9f3a';

const post = (body) => api('POST', '/notes', { as: user, body });
const text = (unit, count) => unit.repeat(count);

/**
 * The limits (ADR 0009), checked at both edges of each one and in each way a
 * character can be written. An error must say which part is wrong and must
 * never repeat what was sent, so every refusal is also checked for the marker.
 */
function expectRefusal(response, status, code, { path } = {}) {
  expect(response.status).toBe(status);
  expect(response.body.error).toBe(code);
  expect(response.body.message).toEqual(expect.any(String));
  expect(JSON.stringify(response.body)).not.toContain(MARKER);
  if (path) expect(response.body.details.map((detail) => detail.path)).toContain(path);
}

describe('content', () => {
  test.each([
    ['ASCII', 'a', 'a'],
    ['three-byte text', CJK, CJK],
    ['four-byte emoji', EMOJI, EMOJI],
  ])('%s: exactly 60,000 characters is kept, and 60,001 is refused', async (_label, unit) => {
    const atLimit = await post({ content: text(unit, LIMITS.content) });
    expect(atLimit.status).toBe(201);
    expect(atLimit.body.note.content).toBe(text(unit, LIMITS.content));

    const over = await post({ content: MARKER + text(unit, LIMITS.content) });
    expectRefusal(over, 422, 'limit_exceeded', { path: 'content' });
  });

  test('a joined emoji counts as the seven code points it is made of', async () => {
    const fits = text(FAMILY, 8571); // 59,997
    const tooMany = text(FAMILY, 8572); // 60,004

    expect(countCodePoints(fits)).toBe(59_997);
    expect((await post({ content: fits })).status).toBe(201);
    expectRefusal(await post({ content: tooMany }), 422, 'limit_exceeded', { path: 'content' });
  });

  test('a decomposed é counts as two', async () => {
    const decomposed = 'é';

    expect((await post({ content: text(decomposed, 30_000) })).status).toBe(201);
    expectRefusal(await post({ content: text(decomposed, 30_001) }), 422, 'limit_exceeded', { path: 'content' });
  });

  test('the user’s words come back exactly: no trimming, no normalising, controls kept', async () => {
    const words = '  leading spaces\r\n\ttabbed, a NUL \u0000, a bell \u0007, DEL \u007f, é and é, trailing  \n\n ';

    const created = await post({ content: words });
    expect(created.status).toBe(201);
    expect(created.body.note.content).toBe(words);

    const read = await api('GET', `/notes/${created.body.note.id}`, { as: user });
    expect(read.body.note.content).toBe(words);
    expect((await rawStoredNote(created.body.note.id)).content.S).toBe(words);
  });

  test('empty is still refused with the plain message', async () => {
    const response = await post({ content: '' });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('validation_failed');
  });

  test('an update that makes content too long is refused and the note is unchanged', async () => {
    const note = await createNote(user, { content: 'Original words' });

    const response = await api('PUT', `/notes/${note.id}`, {
      as: user,
      body: { content: MARKER + text('a', LIMITS.content) },
    });

    expectRefusal(response, 422, 'limit_exceeded', { path: 'content' });
    const after = (await api('GET', `/notes/${note.id}`, { as: user })).body.note;
    expect(after.content).toBe('Original words');
  });
});

describe('title, tags and reminders', () => {
  test('a title of 200 characters is kept, 201 is refused, in ASCII and in emoji', async () => {
    for (const unit of ['t', EMOJI]) {
      const ok = await post({ content: 'x', title: text(unit, 200) });
      expect(ok.status).toBe(201);
      expect(ok.body.note.title).toBe(text(unit, 200));

      expectRefusal(await post({ content: 'x', title: MARKER + text(unit, 200) }), 422, 'limit_exceeded', {
        path: 'title',
      });
    }
  });

  test('twenty tags are kept and twenty-one are refused', async () => {
    const tags = (count) => Array.from({ length: count }, (_, index) => `tag${index}`);

    expect((await post({ content: 'x', tags: tags(20) })).status).toBe(201);
    expectRefusal(await post({ content: 'x', tags: tags(21) }), 422, 'limit_exceeded', { path: 'tags' });
  });

  test('a tag of 40 characters is kept and 41 is refused, in ASCII and in emoji', async () => {
    for (const unit of ['g', EMOJI]) {
      expect((await post({ content: 'x', tags: [text(unit, 40)] })).status).toBe(201);
      expectRefusal(await post({ content: 'x', tags: [MARKER + text(unit, 40)] }), 422, 'limit_exceeded', {
        path: 'tags.0',
      });
    }
  });

  test('twenty reminders are kept and twenty-one are refused', async () => {
    const reminders = (count) =>
      Array.from({ length: count }, (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`);

    expect((await post({ content: 'x', reminders: reminders(20) })).status).toBe(201);
    expectRefusal(await post({ content: 'x', reminders: reminders(21) }), 422, 'limit_exceeded', {
      path: 'reminders',
    });
  });

  test('a reminder string of 40 characters is kept and 41 is refused', async () => {
    const withDigits = (digits) => `2026-10-03T09:00:00.${'0'.repeat(digits)}Z`;

    expect(withDigits(19)).toHaveLength(40);
    expect((await post({ content: 'x', reminders: [withDigits(19)] })).status).toBe(201);
    expectRefusal(await post({ content: 'x', reminders: [withDigits(20)] }), 422, 'limit_exceeded', {
      path: 'reminders.0',
    });
  });

  test('a malformed reminder is still an ordinary validation failure', async () => {
    const response = await post({ content: 'x', reminders: ['next Tuesday'] });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('validation_failed');
  });

  test('limits on an update are enforced the same way', async () => {
    const note = await createNote(user, { content: 'x' });
    const tags = Array.from({ length: 21 }, (_, index) => `t${index}`);

    expectRefusal(await api('PUT', `/notes/${note.id}`, { as: user, body: { tags } }), 422, 'limit_exceeded', {
      path: 'tags',
    });
    expectRefusal(
      await api('PUT', `/notes/${note.id}`, { as: user, body: { title: MARKER + text('t', 200) } }),
      422,
      'limit_exceeded',
      { path: 'title' },
    );
  });
});

describe('text that cannot be saved', () => {
  test.each([
    ['content', { content: `${MARKER} ${LONE_HIGH} tail` }],
    ['title', { content: 'x', title: `${MARKER}${LONE_HIGH}` }],
    ['tags.0', { content: 'x', tags: [`${MARKER}\udc00`] }],
  ])('an unpaired surrogate in %s is invalid_text', async (path, body) => {
    expectRefusal(await post(body), 422, 'invalid_text', { path });
  });

  test('a valid pair is fine, and so are control characters', async () => {
    expect((await post({ content: `fine ${EMOJI} and \u0000 and \u0001` })).status).toBe(201);
  });

  test('on an update too, and the note is unchanged', async () => {
    const note = await createNote(user, { content: 'Original words' });

    const response = await api('PUT', `/notes/${note.id}`, {
      as: user,
      body: { content: `${MARKER}${LONE_HIGH}` },
    });

    expectRefusal(response, 422, 'invalid_text', { path: 'content' });
    expect((await api('GET', `/notes/${note.id}`, { as: user })).body.note.content).toBe('Original words');
  });

  test('nothing is written to the logs about it', async () => {
    const spies = ['log', 'info', 'warn', 'error'].map((method) => vi.spyOn(console, method).mockImplementation(() => {}));

    const response = await createNoteHandler({
      headers: {},
      requestContext: { authorizer: { claims: { sub: user } } },
      body: JSON.stringify({ content: `${MARKER}${LONE_HIGH}` }),
    });

    expect(JSON.parse(response.body).error).toBe('invalid_text');
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(MARKER);
      spy.mockRestore();
    }
  });
});

describe('which code wins when a request breaks several rules', () => {
  test('invalid_text beats limit_exceeded, and details still name every path', async () => {
    const response = await post({
      content: `${MARKER}${LONE_HIGH}`,
      tags: Array.from({ length: 21 }, (_, index) => `t${index}`),
    });

    expectRefusal(response, 422, 'invalid_text', { path: 'content' });
    expect(response.body.details.map((detail) => detail.path)).toContain('tags');
  });

  test('sharing_not_available beats both', async () => {
    const response = await post({
      content: `${MARKER}${LONE_HIGH}`,
      tags: Array.from({ length: 21 }, (_, index) => `t${index}`),
      sharedWith: [],
    });

    expectRefusal(response, 422, 'sharing_not_available');
  });

  test('limit_exceeded beats an ordinary validation failure', async () => {
    const response = await post({ content: MARKER + text('a', LIMITS.content), pinned: 'yes' });

    expectRefusal(response, 422, 'limit_exceeded', { path: 'content' });
    expect(response.body.details.map((detail) => detail.path)).toContain('pinned');
  });
});

describe('the largest valid request, however it is written', () => {
  const maxBody = () => ({
    content: text(EMOJI, LIMITS.content),
    title: text(EMOJI, LIMITS.title),
    tags: Array.from({ length: LIMITS.tags }, () => text(EMOJI, LIMITS.tag)),
    reminders: Array.from({ length: LIMITS.reminders }, () => `2026-10-03T09:00:00.${'0'.repeat(19)}Z`),
  });

  /** What Python's json.dumps does by default: every non-ASCII unit becomes \uXXXX. */
  const ensureAscii = (json) =>
    json.replace(/[\u0080-￿]/g, (unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`);

  test('plain UTF-8 and fully escaped both fit under the body limit and are accepted', async () => {
    const plain = JSON.stringify(maxBody());
    const escaped = ensureAscii(plain);

    expect(Buffer.byteLength(plain)).toBeLessThan(LIMITS.bodyBytes);
    // The escaped form is the reason the body limit is 1 MiB and not 256 KB.
    expect(Buffer.byteLength(escaped)).toBeGreaterThan(700_000);
    expect(Buffer.byteLength(escaped)).toBeLessThan(LIMITS.bodyBytes);

    for (const rawBody of [plain, escaped]) {
      const response = await api('POST', '/notes', { as: user, rawBody });

      expect(response.status).toBe(201);
      expect(response.body.note.content).toBe(maxBody().content);
      expect(response.body.note.title).toBe(maxBody().title);
    }
  });

  test('60,000 control characters, each written as \\u0001, fit as well', async () => {
    const rawBody = JSON.stringify({ content: text('\u0001', LIMITS.content) });

    expect(Buffer.byteLength(rawBody)).toBeGreaterThan(300_000);
    const response = await api('POST', '/notes', { as: user, rawBody });

    expect(response.status).toBe(201);
    expect(response.body.note.content).toBe(text('\u0001', LIMITS.content));
  });
});

describe('the request body limit', () => {
  const event = (body, extra = {}) => ({
    headers: {},
    requestContext: { authorizer: { claims: { sub: user } } },
    pathParameters: { id: '00000000-0000-4000-8000-000000000000' },
    body,
    ...extra,
  });

  /** A JSON body of exactly `bytes` bytes. */
  const bodyOf = (bytes) => {
    const wrapper = '{"content":""}';
    return `{"content":"${'a'.repeat(bytes - Buffer.byteLength(wrapper))}"}`;
  };

  test('exactly 1,048,576 bytes gets past the gate (and is then refused as too long for a note)', async () => {
    const body = bodyOf(LIMITS.bodyBytes);
    expect(Buffer.byteLength(body)).toBe(LIMITS.bodyBytes);

    const response = await createNoteHandler(event(body));

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body).error).toBe('limit_exceeded');
  });

  test('one byte more is a 413 payload_too_large', async () => {
    const response = await createNoteHandler(event(bodyOf(LIMITS.bodyBytes + 1)));

    expect(response.statusCode).toBe(413);
    expect(JSON.parse(response.body).error).toBe('payload_too_large');
    expect(JSON.parse(response.body).message).toMatch(/nothing was changed/i);
  });

  test('the gate runs before the body is parsed', async () => {
    const notJson = 'x'.repeat(LIMITS.bodyBytes + 1);

    expect((await createNoteHandler(event(notJson))).statusCode).toBe(413);
  });

  test('it counts bytes, not characters', async () => {
    // 524,289 two-byte characters is 1,048,578 bytes but only 524,289 characters.
    const response = await createNoteHandler(event('é'.repeat(524_289)));

    expect(response.statusCode).toBe(413);
  });

  test('a base64 body is measured after decoding', async () => {
    const encode = (bytes) => Buffer.from('a'.repeat(bytes)).toString('base64');

    const over = await createNoteHandler(event(encode(LIMITS.bodyBytes + 1), { isBase64Encoded: true }));
    expect(over.statusCode).toBe(413);

    const exact = await createNoteHandler(event(encode(LIMITS.bodyBytes), { isBase64Encoded: true }));
    expect(exact.statusCode).not.toBe(413);
  });

  test('every route with a body is gated, before any read of the store', async () => {
    const big = bodyOf(LIMITS.bodyBytes + 1);

    expect((await updateNoteHandler(event(big))).statusCode).toBe(413);
    expect((await putPreferencesHandler(event(big))).statusCode).toBe(413);
  });

  test('a request with no body is not affected', async () => {
    const response = await createNoteHandler(event(undefined));

    // It gets past the gate and fails validation for want of content.
    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body).error).toBe('validation_failed');
  });

  test('an unauthenticated oversize request is a 401 first', async () => {
    const response = await createNoteHandler({ headers: {}, body: bodyOf(LIMITS.bodyBytes + 1) });

    expect(response.statusCode).toBe(401);
  });
});

describe('the largest note, with the most the server can add to it, saves', () => {
  /**
   * The user's side is at every limit, in four-byte text. The engine's side is
   * at every limit too: sixty `todo` lines of 300 characters each give more
   * actions than are kept and ones longer than the limit, and the whole note
   * has no full stop, so the extractive summary is the entire note.
   */
  function worstCase() {
    const lines = Array.from({ length: 60 }, (_, index) => `todo ${index} ${text(EMOJI, 300)}`);
    const head = `${lines.join('\n')}\n`;
    const content = head + text(EMOJI, LIMITS.content - countCodePoints(head));

    expect(countCodePoints(content)).toBe(LIMITS.content);
    return {
      content,
      title: text(EMOJI, LIMITS.title),
      tags: Array.from({ length: LIMITS.tags }, () => text(EMOJI, LIMITS.tag)),
      reminders: Array.from({ length: LIMITS.reminders }, () => `2026-10-03T09:00:00.${'0'.repeat(19)}Z`),
    };
  }

  async function expectWorstCaseSaved(response, input) {
    expect(response.status).toBeLessThan(300);
    const { note } = response.body;

    // The user's side: untouched, byte for byte.
    expect(note.content).toBe(input.content);
    expect(note.title).toBe(input.title);
    expect(note.tags).toEqual(input.tags);
    expect(note.reminders).toEqual(input.reminders);

    // The server's side: at its limits, whole, and saying so.
    expect(countCodePoints(note.summary)).toBe(LIMITS.summary);
    expect(note.summary.endsWith('…')).toBe(true);
    expect(isWellFormedText(note.summary)).toBe(true);
    expect(note.actions).toHaveLength(LIMITS.actions);
    for (const action of note.actions) {
      expect(countCodePoints(action)).toBe(LIMITS.action);
      expect(isWellFormedText(action)).toBe(true);
    }

    // The complete item as DynamoDB holds it, measured by the documented rules.
    const stored = await rawStoredNote(note.id);
    const bytes = wireItemBytes(stored);
    expect(bytes).toBeGreaterThan(250_000); // it really is the worst case
    expect(bytes).toBeLessThanOrEqual(LIMITS.itemBytes);
    return bytes;
  }

  test('creating it', async () => {
    const input = worstCase();

    await expectWorstCaseSaved(await post(input), input);
  });

  test('updating a note to it', async () => {
    const input = worstCase();
    const existing = await createNote(user, { content: 'small to start with' });

    await expectWorstCaseSaved(await api('PUT', `/notes/${existing.id}`, { as: user, body: input }), input);
  });
});
