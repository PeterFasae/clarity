import { parseArgs } from 'node:util';
import { CORPUS_SIZE_DEFAULT, noteContent } from './notes-fixture.js';

/**
 * Fill an account with realistic notes, through the API rather than around it —
 * so every seeded note has gone through validation, `enrich()` and the same
 * write path a real one would.
 *
 *   npm run seed -w services/api -- --count 500 --user latency-user
 *
 * Expects an API to already be running (`npm run dev -w services/api`).
 */

export function tokenFor(sub) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'RS256', kid: 'seed', typ: 'JWT' }),
    encode({ sub, token_use: 'id', exp: Math.floor(Date.now() / 1000) + 3600 }),
    'seed-signature',
  ].join('.');
}

export async function seed({ base, user, count: total, concurrency: lanes = 8, onProgress }) {
  const token = tokenFor(user);
  let next = 0;
  let done = 0;

  async function lane() {
    while (next < total) {
      const n = next;
      next += 1;

      const response = await fetch(`${base}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: noteContent(n) }),
      });

      if (response.status !== 201) {
        throw new Error(`seed failed at note ${n}: ${response.status} ${await response.text()}`);
      }

      done += 1;
      if (onProgress && done % 50 === 0) onProgress(done, total);
    }
  }

  await Promise.all(Array.from({ length: lanes }, lane));
  return done;
}

// Argument parsing lives in here, not at module scope, because the latency
// harness imports `seed` and would otherwise fail on its own flags.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      count: { type: 'string', default: String(CORPUS_SIZE_DEFAULT) },
      user: { type: 'string', default: 'seed-user' },
      base: { type: 'string', default: 'http://localhost:3000/dev' },
      concurrency: { type: 'string', default: '8' },
    },
  });

  const started = Date.now();
  const written = await seed({
    base: values.base,
    user: values.user,
    count: Number(values.count),
    concurrency: Number(values.concurrency),
    onProgress: (n, total) => process.stdout.write(`\r  ${n}/${total}`),
  });
  process.stdout.write('\r');
  console.log(`Seeded ${written} notes for "${values.user}" in ${Date.now() - started}ms`);
}
