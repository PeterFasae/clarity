import { describe, expect, test } from 'vitest';
import { api, createNote, invokeLambda, someUser } from './helpers.js';

const user = someUser();

/**
 * API Gateway can hand a Lambda a base64-encoded body and set
 * `isBase64Encoded`. The size gate measures such a body decoded, so parsing has
 * to read it decoded as well; otherwise a request that passes the gate is then
 * parsed as base64 text and refused as "not valid JSON". These go through the
 * Lambda invocation API with the flag set, which the HTTP path cannot do.
 */
const encode = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64');

const event = (body, extra = {}) => ({
  headers: {},
  requestContext: { authorizer: { claims: { sub: user } } },
  body,
  isBase64Encoded: true,
  ...extra,
});

describe('a base64-encoded body', () => {
  test('creates a note, and the words come back exactly', async () => {
    const content = '  Café ☕ with 😀 and a tab\t, a newline\n and trailing space  ';

    const response = await invokeLambda('createNote', event(encode({ content })));

    expect(response.statusCode).toBe(201);
    const { note } = JSON.parse(response.body);
    expect(note.content).toBe(content);

    const read = await api('GET', `/notes/${note.id}`, { as: user });
    expect(read.body.note.content).toBe(content);
  });

  test('updates a note the same way', async () => {
    const existing = await createNote(user, { content: 'Before' });
    const content = 'After — with “quotes” and 😀';

    const response = await invokeLambda('updateNote', {
      ...event(encode({ content })),
      pathParameters: { id: existing.id },
    });

    expect(response.statusCode).toBe(200);
    const read = await api('GET', `/notes/${existing.id}`, { as: user });
    expect(read.body.note.content).toBe(content);
  });

  test('the same note sent as plain text and as base64 is stored identically', async () => {
    const content = 'Same words, two encodings 😀';

    const plain = await invokeLambda('createNote', event(JSON.stringify({ content }), { isBase64Encoded: false }));
    const encoded = await invokeLambda('createNote', event(encode({ content })));

    expect(JSON.parse(plain.body).note.content).toBe(JSON.parse(encoded.body).note.content);
  });

  test('bytes that are not valid UTF-8 are refused, not repaired', async () => {
    // 0xff can never appear in UTF-8. A lenient decoder would turn it into U+FFFD.
    const bad = Buffer.concat([Buffer.from('{"content":"before '), Buffer.from([0xff]), Buffer.from(' after"}')]);

    const response = await invokeLambda('createNote', event(bad.toString('base64')));

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body).error).toBe('validation_failed');
    expect(JSON.parse(response.body).message).toBeDefined();
    const list = await api('GET', '/notes', { as: user });
    expect(list.body.notes.some((note) => note.content.includes('before'))).toBe(false);
  });

  test('base64 that decodes to something that is not JSON is the usual 422', async () => {
    const response = await invokeLambda('createNote', event(encode('not json at all')));

    expect(response.statusCode).toBe(422);
  });
});
