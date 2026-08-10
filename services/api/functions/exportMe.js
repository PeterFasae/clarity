import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/** POST /me/export — GDPR. All notes + preferences as JSON. STUB: Phase 3. */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("exportMe is not implemented until Phase 3");
}
