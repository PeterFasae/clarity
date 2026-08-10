import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/** GET /notes/{id}/summary — returns the stored summary (report §4.5). STUB. */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("getNoteSummary is not implemented until Phase 1");
}
