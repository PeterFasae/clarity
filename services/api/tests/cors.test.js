import { describe, expect, test } from 'vitest';
import { ALLOWED_ORIGIN, UNLISTED_ORIGIN, api, invokeLambda, someUser } from './helpers.js';

const user = someUser();

/**
 * The predecessor sent `Access-Control-Allow-Origin: *` from a hand-rolled
 * headers object copied into every handler. There is now one copy, in
 * lib/respond.js, and it can only ever echo back an origin it was configured
 * with — there is no branch that produces a wildcard.
 *
 * Read this file alongside respond.test.js. `serverless offline` decorates
 * every response with Hapi's own CORS headers, so what arrives here is the
 * emulator's answer on top of the Lambda's. The rig points the emulator at the
 * same allowlist to stop it masking the difference; the Lambda's own output is
 * pinned in respond.test.js, where nothing sits in between.
 */
describe('CORS', () => {
  test('echoes an allowed origin back', async () => {
    const response = await api('GET', '/notes', { as: user, origin: ALLOWED_ORIGIN });

    expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
    expect(response.headers.get('vary')).toContain('Origin');
  });

  test('sends no CORS header at all to an unlisted origin', async () => {
    // Asked of the Lambda directly, because Hapi would answer for it otherwise.
    const response = await invokeLambda('getNotes', {
      headers: { origin: UNLISTED_ORIGIN },
      requestContext: { authorizer: { claims: { sub: user } } },
      queryStringParameters: null,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  test('never answers with a wildcard', async () => {
    for (const origin of [ALLOWED_ORIGIN, UNLISTED_ORIGIN, undefined]) {
      const response = await invokeLambda('getNotes', {
        headers: origin ? { origin } : {},
        requestContext: { authorizer: { claims: { sub: user } } },
        queryStringParameters: null,
      });

      expect(response.headers['Access-Control-Allow-Origin']).not.toBe('*');
    }
  });

  test('a refusal carries the CORS header too, so the browser can read the error', async () => {
    const response = await api('GET', '/notes/00000000-0000-4000-8000-000000000000', {
      as: user,
      origin: ALLOWED_ORIGIN,
    });

    expect(response.status).toBe(404);
    expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
  });

  describe('preflight', () => {
    test('is answered for an allowed origin without a token', async () => {
      const response = await api('OPTIONS', '/notes', {
        origin: ALLOWED_ORIGIN,
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      });

      // The Lambda returns 204; the emulator reports 200. respond.test.js
      // pins the real status.
      expect(response.status).toBeLessThan(300);
      expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
      expect(response.headers.get('access-control-allow-headers')).toContain('Authorization');
    });

    test('gives an unlisted origin nothing to work with', async () => {
      const response = await invokeLambda('preflight', {
        headers: { origin: UNLISTED_ORIGIN },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(response.headers['Access-Control-Allow-Methods']).toBeTypeOf('string');
    });
  });
});
