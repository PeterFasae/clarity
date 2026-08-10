import { preflight } from '../lib/respond.js';

/**
 * OPTIONS on every path. The only route without an authorizer, because a
 * browser sends no credentials on a preflight.
 *
 * It exists as a Lambda rather than as API Gateway's mock integration so that
 * the preflight answer comes from the same origin allowlist as every other
 * response. A mock integration would need one hardcoded origin — or a wildcard.
 */
export const handler = async (event) => preflight(event);
