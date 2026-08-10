import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/** GET /me/preferences. STUB: implemented in Phase 1. */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("getPreferences is not implemented until Phase 1");
}
