import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import DynamoDbLocal from 'dynamodb-local';

/**
 * Fetch DynamoDB Local once into `services/api/.dynamodb` (gitignored, ~64MB).
 *
 * The integration tests spawn the jar themselves rather than going through this
 * package's `launch()`, which does not reliably resolve under Node 23 — this
 * script is only here for the download.
 */

const INSTALL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.dynamodb',
);

if (existsSync(path.join(INSTALL_PATH, 'DynamoDBLocal.jar'))) {
  console.log(`DynamoDB Local is already installed at ${INSTALL_PATH}`);
  process.exit(0);
}

DynamoDbLocal.configureInstaller({ installPath: INSTALL_PATH });
await DynamoDbLocal.install();
console.log(`DynamoDB Local installed at ${INSTALL_PATH}`);
process.exit(0);
