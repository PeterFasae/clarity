import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/** DELETE /notes/{id}. STUB: implemented in Phase 1. */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("deleteNote is not implemented until Phase 1");
}
