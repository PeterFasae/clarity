import { marshall } from '@aws-sdk/util-dynamodb';

/**
 * How big DynamoDB considers an item to be.
 *
 * The rules are AWS's, from "Calculating item size" in the developer guide: the
 * size of an item is the sum of its attribute names and values, with strings
 * and names counted in UTF-8 bytes. A list or map costs 3 bytes of overhead and
 * 1 more byte per element. A boolean or null is 1 byte. A number is 1 byte per
 * two significant digits plus 1, up to 21. Binary is its raw length.
 *
 * It is applied to the marshalled form (`{ S: '...' }`), because that is what
 * DynamoDB is given and what a read hands back. Measuring `JSON.stringify` of
 * the object would be wrong by the attribute-name and overhead terms, which is
 * the whole point of measuring it properly. The 409,600-byte boundary is
 * checked against DynamoDB Local in the tests, and against staging later.
 */

const utf8 = (text) => Buffer.byteLength(text, 'utf8');

function numberBytes(text) {
  const [mantissa] = String(text).toLowerCase().split('e');
  const digits = mantissa.replace(/^-/, '').replace('.', '').replace(/^0+/, '').replace(/0+$/, '');
  return Math.min(21, Math.ceil(Math.max(digits.length, 1) / 2) + 1);
}

/** Size of one attribute value, not counting its own name. */
export function valueBytes(value) {
  if ('S' in value) return utf8(value.S);
  if ('N' in value) return numberBytes(value.N);
  if ('B' in value) return value.B.length;
  if ('BOOL' in value || 'NULL' in value) return 1;
  if ('SS' in value) return value.SS.reduce((sum, text) => sum + utf8(text), 0);
  if ('NS' in value) return value.NS.reduce((sum, text) => sum + numberBytes(text), 0);
  if ('BS' in value) return value.BS.reduce((sum, bytes) => sum + bytes.length, 0);
  if ('L' in value) return 3 + value.L.reduce((sum, item) => sum + 1 + valueBytes(item), 0);
  if ('M' in value) {
    return (
      3 +
      Object.entries(value.M).reduce(
        (sum, [name, item]) => sum + 1 + utf8(name) + valueBytes(item),
        0,
      )
    );
  }
  throw new Error('Unknown DynamoDB attribute type.');
}

/** Size of a whole item given in the wire form (what DynamoDB stores and returns). */
export function wireItemBytes(item) {
  return Object.entries(item).reduce((sum, [name, value]) => sum + utf8(name) + valueBytes(value), 0);
}

/** Size of a plain object as it will be written. */
export function itemBytes(item) {
  return wireItemBytes(marshall(item, { removeUndefinedValues: true }));
}
