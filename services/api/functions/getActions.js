import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/**
 * GET /actions — every action across the user's notes, each carrying noteId
 * and noteTitle. Derived at read time from stored `actions`, never a separate
 * store, so it cannot drift from what the note says. STUB.
 */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("getActions is not implemented until Phase 1");
}
