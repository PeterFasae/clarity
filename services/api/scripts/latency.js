import { parseArgs } from 'node:util';
import { noteContent } from './notes-fixture.js';
import { seed, tokenFor } from './seed.js';

/**
 * The Phase 1 performance gate.
 *
 * Report §5.4 publishes measured results for the deployed system — createNote
 * 240ms average, getNotes 275ms, summarizeNote 310ms, max 590ms — and BUILD.md
 * asks for p95 under 350ms warm over a 500-note corpus.
 *
 * Read the output with its caveat attached. Run against `serverless offline`
 * and DynamoDB Local this measures handler work, expression cost and the
 * search build over a real 500-note corpus, on one machine with no network in
 * the way. It is not the deployed figure: there is no API Gateway hop, no
 * cross-AZ DynamoDB call, and no Lambda container. It is a lower bound and a
 * regression detector. `--base` points it at a deployed stage when there are
 * credentials to deploy one with, and that run is the one the dissertation's
 * numbers should be compared against.
 */

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:3999/test' },
    user: { type: 'string', default: 'latency-user' },
    corpus: { type: 'string', default: '500' },
    samples: { type: 'string', default: '100' },
    warmup: { type: 'string', default: '20' },
    budget: { type: 'string', default: '350' },
    rig: { type: 'boolean', default: false },
  },
});

const BASE = values.base;
const USER = values.user;
const CORPUS = Number(values.corpus);
const SAMPLES = Number(values.samples);
const WARMUP = Number(values.warmup);
const BUDGET_MS = Number(values.budget);

const token = tokenFor(USER);
const authorised = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

async function call(method, pathname, body) {
  const started = performance.now();
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers: authorised,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const elapsed = performance.now() - started;

  if (response.status >= 400) {
    throw new Error(`${method} ${pathname} → ${response.status} ${text}`);
  }

  return { elapsed, body: text ? JSON.parse(text) : undefined };
}

function summarise(name, samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

  return {
    name,
    n: sorted.length,
    avg: sorted.reduce((sum, ms) => sum + ms, 0) / sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    max: sorted.at(-1),
  };
}

async function measure(name, run) {
  for (let i = 0; i < WARMUP; i += 1) await run(i);

  const samples = [];
  for (let i = 0; i < SAMPLES; i += 1) samples.push(await run(WARMUP + i));

  return summarise(name, samples);
}

async function main() {
  let teardown;
  if (values.rig) {
    const { default: setup } = await import('../tests/setup/global.js');
    console.log('Starting DynamoDB Local and serverless offline…');
    teardown = await setup();
  }

  try {
    const existing = await call('GET', '/notes?limit=1');
    console.log(`Seeding ${CORPUS} notes for "${USER}"…`);
    const seedStarted = Date.now();
    await seed({ base: BASE, user: USER, count: CORPUS, concurrency: 8 });
    console.log(
      `  done in ${Date.now() - seedStarted}ms (the account already had ${
        existing.body.notes.length
      } note(s) before this run)\n`,
    );

    // One note to re-summarise over and over, so `summarize` measures the
    // recompute rather than a different note each time.
    const subject = (await call('POST', '/notes', { content: noteContent(9_999) })).body.note;

    const results = [
      await measure('createNote', async (i) => {
        const { elapsed } = await call('POST', '/notes', { content: noteContent(10_000 + i) });
        return elapsed;
      }),
      await measure('getNotes', async () => {
        const { elapsed } = await call('GET', '/notes?limit=25');
        return elapsed;
      }),
      await measure('getNotes (search)', async () => {
        const { elapsed } = await call('GET', '/notes?q=working%20memory%20chunking');
        return elapsed;
      }),
      await measure('summarize', async () => {
        const { elapsed } = await call('POST', `/notes/${subject.id}/summarize`);
        return elapsed;
      }),
      await measure('getNote', async () => {
        const { elapsed } = await call('GET', `/notes/${subject.id}`);
        return elapsed;
      }),
    ];

    const total = (await call('GET', '/notes?limit=1')).body;
    console.log(`Corpus: ${CORPUS}+ notes for one user. Budget: p95 < ${BUDGET_MS}ms.\n`);
    console.log(
      ['operation', 'n', 'avg', 'p50', 'p95', 'max', ''].join('\t').replace(/\t$/, ''),
    );
    for (const result of results) {
      console.log(
        [
          result.name.padEnd(18),
          result.n,
          `${result.avg.toFixed(1)}ms`,
          `${result.p50.toFixed(1)}ms`,
          `${result.p95.toFixed(1)}ms`,
          `${result.max.toFixed(1)}ms`,
          result.p95 < BUDGET_MS ? 'PASS' : 'FAIL',
        ].join('\t'),
      );
    }

    const failed = results.filter((result) => result.p95 >= BUDGET_MS);
    console.log(
      `\n${failed.length === 0 ? 'All operations within budget.' : `${failed.length} operation(s) over budget: ${failed.map((r) => r.name).join(', ')}`}`,
    );
    console.log(
      '\nMeasured against the local rig unless --base says otherwise: no API Gateway\n' +
        'hop, no cross-AZ DynamoDB call, no Lambda container. A lower bound and a\n' +
        'regression detector, not the deployed figure.',
    );
    void total;

    if (failed.length > 0) process.exitCode = 1;
  } finally {
    if (teardown) await teardown();
  }
}

await main();
process.exit(process.exitCode ?? 0);
