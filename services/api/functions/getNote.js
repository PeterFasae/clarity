import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/**
 * GET /notes/{id} — the route the predecessor's frontend called and which
 * did not exist. STUB: implemented in Phase 1.
 */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("getNote is not implemented until Phase 1");
}
