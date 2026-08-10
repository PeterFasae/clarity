import { describe, expect, test } from 'vitest';
import { api, someUser } from './helpers.js';

/**
 * No token, no route. Every path in ENGINEERING.md's table is listed here on
 * purpose — a route added later without an authorizer should make this file
 * fail rather than quietly serve someone's notes.
 */

const ROUTES = [
  ['POST', '/notes'],
  ['GET', '/notes'],
  ['GET', '/notes/some-id'],
  ['PUT', '/notes/some-id'],
  ['DELETE', '/notes/some-id'],
  ['GET', '/notes/some-id/summary'],
  ['POST', '/notes/some-id/summarize'],
  ['GET', '/actions'],
  ['GET', '/me/preferences'],
  ['PUT', '/me/preferences'],
  ['POST', '/me/export'],
  ['DELETE', '/me'],
];

describe('a request with no JWT', () => {
  test.each(ROUTES)('%s %s is refused', async (method, pathname) => {
    const response = await api(method, pathname);
    expect(response.status).toBe(401);
  });
});

describe('a request with a token', () => {
  test('reaches the handler', async () => {
    const response = await api('GET', '/notes', { as: someUser() });
    expect(response.status).toBe(200);
  });

  test('is scoped by the token’s sub, not by anything in the request', async () => {
    const alice = someUser();
    const bob = someUser();

    // `userId` in the body is ignored — it is not in any request schema, and
    // the handler reads only claims.sub.
    await api('POST', '/notes', {
      as: alice,
      body: { content: 'Alice wrote this.', userId: bob },
    });

    const bobsNotes = await api('GET', '/notes', { as: bob });
    expect(bobsNotes.body.notes).toEqual([]);
  });
});
