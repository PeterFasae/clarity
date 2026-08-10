/**
 * Pagination cursors.
 *
 * DynamoDB hands back a `LastEvaluatedKey` — a map of the index's key
 * attributes. Clients get it as one opaque base64url string, so nothing about
 * the table's key schema leaks into the API contract and the shape can change
 * without a client change.
 *
 * There is no signature on this and it does not need one. A tampered cursor
 * either fails to decode, or names a partition other than the caller's — and a
 * Query whose ExclusiveStartKey disagrees with its KeyConditionExpression is
 * rejected by DynamoDB before it reads anything. `decodeCursor` re-stamps the
 * caller's own userId regardless, so the failure mode is an empty page, never
 * someone else's notes.
 */

export function encodeCursor(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return undefined;
  return Buffer.from(JSON.stringify(lastEvaluatedKey), 'utf8').toString('base64url');
}

export function decodeCursor(cursor, userId) {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    return { ...parsed, userId };
  } catch {
    // A cursor we can't read means start from the beginning, not a 500.
    return undefined;
  }
}
