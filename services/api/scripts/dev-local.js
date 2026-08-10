/**
 * The whole API, locally, with nothing deployed.
 *
 *   npm run dev:local -w services/api    → http://localhost:3000/dev
 *
 * Raises DynamoDB Local, builds both tables from the CloudFormation resources
 * in serverless.yml, and starts `serverless offline` on the stage and port
 * `apps/web` expects by default. It is the same rig the integration tests use —
 * one definition, so "it worked in the tests" and "it works in the app" cannot
 * come apart.
 *
 * `npm run dev` is the other command: plain `serverless offline` against real
 * AWS tables, for when there is a deployed stage to point at.
 */

process.env.RIG_STAGE ??= 'dev';
process.env.RIG_API_PORT ??= '3000';
process.env.RIG_LAMBDA_PORT ??= '3002';

const { default: setup, API_BASE } = await import('../tests/setup/global.js');

const teardown = await setup();
console.log(`\nClarity API on ${API_BASE}`);
console.log('DynamoDB Local is in-memory — everything goes when this stops.\n');

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await teardown();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
