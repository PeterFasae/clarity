import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { startAnthropicRecorder } from './anthropic-recorder.js';
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';

/**
 * The local rig the integration tests run against.
 *
 * DynamoDB Local (the real engine, as a Java process) plus `serverless
 * offline`, so the tests exercise routing, the authorizer, CORS and the actual
 * DynamoDB expressions — not a hand-written fake that would agree with the
 * handlers by construction and prove nothing.
 *
 * Table definitions are read out of `serverless.yml` rather than restated here,
 * so a schema change cannot pass the tests and fail on deploy.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = path.resolve(HERE, '../..');
const JAR_DIR = path.join(SERVICE_ROOT, '.dynamodb');

// Overridable so `npm run dev:local` can raise the same rig on the stage and
// port the app expects, rather than keeping a second copy of it.
export const DDB_PORT = Number(process.env.RIG_DDB_PORT ?? 8123);
export const API_PORT = Number(process.env.RIG_API_PORT ?? 3999);
export const LAMBDA_PORT = Number(process.env.RIG_LAMBDA_PORT ?? 3998);
export const ANTHROPIC_PORT = Number(process.env.RIG_ANTHROPIC_PORT ?? 3997);
export const STAGE = process.env.RIG_STAGE ?? 'test';
export const API_BASE = `http://localhost:${API_PORT}/${STAGE}`;
export const ALLOWED_ORIGIN = 'http://localhost:8080';

const serverless = yaml.load(readFileSync(path.join(SERVICE_ROOT, 'serverless.yml'), 'utf8'));
const NOTES_TABLE = `${serverless.service}-notes-${STAGE}`;
const PREFERENCES_TABLE = `${serverless.service}-preferences-${STAGE}`;

const CHILD_ENV = {
  ...process.env,
  AWS_REGION: 'eu-north-1',
  AWS_DEFAULT_REGION: 'eu-north-1',
  AWS_ACCESS_KEY_ID: 'local',
  AWS_SECRET_ACCESS_KEY: 'local',
  DYNAMODB_ENDPOINT: `http://localhost:${DDB_PORT}`,
  ALLOWED_ORIGINS: ALLOWED_ORIGIN,
  // Points the Anthropic SDK at the local recorder. A key has to be present or
  // the engine reports itself unconfigured and never attempts a call — which
  // would make the zero-calls test pass for the wrong reason.
  ANTHROPIC_API_KEY: 'sk-ant-test-not-a-real-key',
  ANTHROPIC_BASE_URL: `http://localhost:${ANTHROPIC_PORT}`,
  ANTHROPIC_TIMEOUT_MS: '1500',
};

async function waitFor(check, { label, timeoutMs = 90_000, intervalMs = 400 }) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

function startDynamoLocal() {
  if (!existsSync(path.join(JAR_DIR, 'DynamoDBLocal.jar'))) {
    throw new Error(
      `DynamoDB Local is not installed. Run "npm run dynamo:install -w services/api" first.\n` +
        `(It is a ~64MB Java package, cached at services/api/.dynamodb and gitignored.)`,
    );
  }

  const child = spawn(
    'java',
    [
      '-Djava.library.path=./DynamoDBLocal_lib',
      '-jar',
      'DynamoDBLocal.jar',
      '-inMemory', // nothing survives the run, so tests cannot leak into each other
      '-sharedDb',
      '-port',
      String(DDB_PORT),
    ],
    { cwd: JAR_DIR, stdio: 'ignore' },
  );

  child.on('error', (error) => {
    throw new Error(`Could not start DynamoDB Local — is Java installed? ${error.message}`);
  });

  return child;
}

/** Build both tables from the CloudFormation resources in serverless.yml. */
async function createTables() {
  const client = new DynamoDBClient({
    endpoint: `http://localhost:${DDB_PORT}`,
    region: 'eu-north-1',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });

  const resources = serverless.resources.Resources;
  const tables = [
    [resources.NotesTable.Properties, NOTES_TABLE],
    [resources.PreferencesTable.Properties, PREFERENCES_TABLE],
  ];

  for (const [properties, tableName] of tables) {
    try {
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          AttributeDefinitions: properties.AttributeDefinitions,
          KeySchema: properties.KeySchema,
          BillingMode: properties.BillingMode,
          ...(properties.GlobalSecondaryIndexes
            ? { GlobalSecondaryIndexes: properties.GlobalSecondaryIndexes }
            : {}),
        }),
      );
    } catch (error) {
      // A stray DynamoDB Local left running from an earlier session already has
      // these tables. That is fine — but it should read as one line, not as a
      // hundred-line SDK error dump.
      if (error.name !== 'ResourceInUseException') throw error;
      console.warn(`Table ${tableName} already exists; reusing it.`);
    }
  }

  client.destroy();
}

function startServerlessOffline() {
  const child = spawn(
    'npx',
    [
      'serverless',
      'offline',
      '--stage',
      STAGE,
      '--httpPort',
      String(API_PORT),
      '--lambdaPort',
      String(LAMBDA_PORT),
      // serverless-offline decorates every response with Hapi's own CORS
      // headers, defaulting to an allow-any origin — which would mask what the
      // Lambda actually emitted. Pointing it at the same allowlist stops it
      // answering for origins the real gateway never would. The Lambda's own
      // behaviour is pinned separately, in respond.test.js, where no emulator
      // sits in the way.
      '--corsAllowOrigin',
      ALLOWED_ORIGIN,
    ],
    { cwd: SERVICE_ROOT, env: CHILD_ENV, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  // Kept so a startup failure reports what actually went wrong rather than a
  // bare "timed out".
  let output = '';
  const record = (chunk) => {
    output += chunk;
    // RIG_VERBOSE=1 surfaces the API's own logs while debugging a test.
    if (process.env.RIG_VERBOSE) process.stderr.write(chunk);
  };
  child.stdout.on('data', record);
  child.stderr.on('data', record);

  return { child, readOutput: () => output };
}

export default async function setup() {
  const anthropic = await startAnthropicRecorder(ANTHROPIC_PORT);
  const dynamo = startDynamoLocal();

  await waitFor(
    async () => {
      const response = await fetch(`http://localhost:${DDB_PORT}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-amz-json-1.0',
          'x-amz-target': 'DynamoDB_20120810.ListTables',
        },
        body: '{}',
      });
      return response.status > 0;
    },
    { label: 'DynamoDB Local', timeoutMs: 30_000 },
  );

  await createTables();

  const offline = startServerlessOffline();

  try {
    await waitFor(
      async () => {
        // Every route is authorized, so an unauthenticated probe answering 401
        // means the server is up *and* the authorizer is attached.
        const response = await fetch(`${API_BASE}/notes`);
        return response.status === 401;
      },
      { label: 'serverless offline' },
    );
  } catch (error) {
    dynamo.kill('SIGKILL');
    offline.child.kill('SIGKILL');
    anthropic.close();
    throw new Error(`${error.message}\n\n--- serverless offline output ---\n${offline.readOutput()}`);
  }

  return async () => {
    offline.child.kill('SIGTERM');
    dynamo.kill('SIGKILL');
    anthropic.close();
  };
}
