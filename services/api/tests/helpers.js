import { randomUUID } from 'node:crypto';
import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { DDB_PORT, NOTES_TABLE } from './setup/global.js';

export const API_BASE = 'http://localhost:3999/test';
export const ALLOWED_ORIGIN = 'http://localhost:8080';
export const UNLISTED_ORIGIN = 'https://notes-thief.example';

/**
 * A Cognito-shaped ID token.
 *
 * Unsigned, because the thing under test is the handlers' behaviour once the
 * authorizer has run — API Gateway verifies the signature in production and
 * `serverless offline` decodes the payload without checking it. What matters
 * here is that `sub` is the only thing that decides which notes you can see,
 * and that a request carrying no token at all never reaches a handler.
 */
export function tokenFor(sub) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', kid: 'test', typ: 'JWT' });
  const payload = encode({
    sub,
    'cognito:username': sub,
    email: `${sub}@example.test`,
    token_use: 'id',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.test-signature`;
}

/** A fresh subject per test file, so files never see each other's notes. */
export const someUser = () => `user-${randomUUID()}`;

/**
 * One call against the running API.
 *
 * @returns {Promise<{ status: number, headers: Headers, body: any }>}
 */
export async function api(method, pathname, { as, body, rawBody, origin, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(as ? { Authorization: `Bearer ${tokenFor(as)}` } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...headers,
    },
    // `rawBody` is a string sent exactly as given, for tests about how a body
    // is encoded rather than what is in it.
    ...(rawBody !== undefined
      ? { body: rawBody }
      : body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
  });

  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : undefined,
  };
}

/**
 * Invoke one function through the emulator's Lambda-invocation API and get the
 * raw proxy response back — statusCode and headers exactly as the handler
 * returned them.
 *
 * The HTTP path runs through Hapi, which decorates every response with its own
 * CORS headers and so hides what the Lambda actually emitted. In production
 * nothing does that: a proxy integration sends the handler's headers and
 * nothing else. This is how a CORS assertion can be made about the real thing.
 */
export async function invokeLambda(name, event) {
  const response = await fetch(
    `http://localhost:3998/2015-03-31/functions/clarity-api-test-${name}/invocations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    },
  );

  return response.json();
}

/** Create a note and hand back the wire object. */
export async function createNote(as, body) {
  const response = await api('POST', '/notes', { as, body });
  if (response.status !== 201) {
    throw new Error(`createNote failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.note;
}

function rawClient() {
  return new DynamoDBClient({
    endpoint: `http://localhost:${DDB_PORT}`,
    region: 'eu-north-1',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
}

/**
 * A note exactly as DynamoDB holds it, in the wire form (`{ S: ... }`), with
 * nothing unmarshalled or reshaped. This is what the item-size rules are
 * defined over, so it is what the size tests measure.
 *
 * @returns {Promise<Record<string, object> | undefined>}
 */
export async function rawStoredNote(noteId) {
  const { Item } = await rawClient().send(
    new GetItemCommand({ TableName: NOTES_TABLE, Key: { noteId: { S: noteId } }, ConsistentRead: true }),
  );
  return Item;
}

/**
 * Put an item straight into the notes table, bypassing the API, and say
 * whether DynamoDB took it. For tests about DynamoDB's own limits.
 *
 * @returns {Promise<{ accepted: boolean, error?: Error }>}
 */
export async function rawPutNote(item) {
  try {
    await rawClient().send(new PutItemCommand({ TableName: NOTES_TABLE, Item: item }));
    return { accepted: true };
  } catch (error) {
    return { accepted: false, error };
  }
}

export async function rawDeleteNote(noteId) {
  await rawClient().send(new DeleteItemCommand({ TableName: NOTES_TABLE, Key: { noteId: { S: noteId } } }));
}
