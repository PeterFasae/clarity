import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { corsHeaders, noContent, ok, preflight, toWireNote } from '../lib/respond.js';

/**
 * The serialisation and CORS seam, tested with nothing in between.
 *
 * The integration tests run through `serverless offline`, which adds its own
 * CORS headers to every response — so they can show that the whole stack
 * behaves, but not that *this* code does. In production nothing decorates a
 * proxy-integration response: what these functions return is exactly what the
 * browser receives. Which makes this file, not the HTTP one, the place the
 * "never a wildcard" guarantee actually lives.
 */

const ALLOWED = 'http://localhost:8080';
const UNLISTED = 'https://notes-thief.example';

let originalAllowedOrigins;

beforeEach(() => {
  originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = `${ALLOWED},http://localhost:8081`;
});

afterEach(() => {
  process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
});

const from = (origin) => (origin ? { headers: { origin } } : { headers: {} });

describe('CORS headers', () => {
  test('echo an allowed origin', () => {
    expect(corsHeaders(from(ALLOWED))['Access-Control-Allow-Origin']).toBe(ALLOWED);
  });

  test('are absent entirely for an unlisted origin', () => {
    expect(corsHeaders(from(UNLISTED))).toEqual({});
  });

  test('are absent when there is no Origin at all', () => {
    expect(corsHeaders(from(undefined))).toEqual({});
  });

  test('vary on Origin, so a shared cache cannot serve one origin’s response to another', () => {
    expect(corsHeaders(from(ALLOWED)).Vary).toBe('Origin');
  });

  test('are never a wildcard, for any origin and any allowlist', () => {
    const origins = [ALLOWED, UNLISTED, '*', 'null', undefined, ''];
    const allowlists = [`${ALLOWED},http://localhost:8081`, '', '   ', ALLOWED];

    for (const allowlist of allowlists) {
      process.env.ALLOWED_ORIGINS = allowlist;
      for (const origin of origins) {
        expect(corsHeaders(from(origin))['Access-Control-Allow-Origin']).not.toBe('*');
      }
    }
  });

  test('an empty allowlist allows nothing rather than everything', () => {
    process.env.ALLOWED_ORIGINS = '';
    expect(corsHeaders(from(ALLOWED))).toEqual({});
  });
});

describe('preflight', () => {
  test('answers 204 with the methods and headers a client needs', () => {
    const response = preflight(from(ALLOWED));

    expect(response.statusCode).toBe(204);
    expect(response.headers['Access-Control-Allow-Origin']).toBe(ALLOWED);
    expect(response.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(response.headers['Access-Control-Allow-Methods']).toContain('DELETE');
  });

  test('gives an unlisted origin nothing it can use', () => {
    const response = preflight(from(UNLISTED));
    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});

describe('serialisation', () => {
  const stored = {
    noteId: 'a1b2c3',
    userId: 'cognito-sub-123',
    title: 'Supervision',
    content: 'The body as written.',
    summary: 'A summary.',
    actions: ['book the lab slot'],
    summarySource: 'local',
    tags: [],
    pinned: false,
    archived: false,
    sharedWith: [],
    reminders: [],
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
  };

  test('renames noteId to id', () => {
    const wire = toWireNote(stored);

    expect(wire.id).toBe('a1b2c3');
    expect(wire).not.toHaveProperty('noteId');
  });

  test('drops userId', () => {
    expect(toWireNote(stored)).not.toHaveProperty('userId');
  });

  test('passes everything else through untouched', () => {
    const wire = toWireNote(stored);

    expect(wire.content).toBe(stored.content);
    expect(wire.summary).toBe(stored.summary);
    expect(wire.actions).toEqual(stored.actions);
    expect(wire.pinned).toBe(false);
  });

  test('takes an extra field, which is how a search score gets attached', () => {
    expect(toWireNote(stored, { score: 0.42 }).score).toBe(0.42);
  });
});

describe('responses', () => {
  test('never cache', () => {
    expect(ok(from(ALLOWED), { ok: true }).headers['Cache-Control']).toBe('no-store');
    expect(noContent(from(ALLOWED)).headers['Cache-Control']).toBe('no-store');
  });

  test('204 carries no body', () => {
    expect(noContent(from(ALLOWED)).body).toBe('');
  });
});
