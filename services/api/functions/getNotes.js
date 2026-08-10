import { ListNotesQuerySchema } from "@clarity/core";
import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/**
 * GET /notes — list, filter and search, all through one handler.
 *   ?q=       runs search() from @clarity/retrieval over the projected corpus
 *   ?filter=  pinned | archived | shared, applied as a FilterExpression
 *   ?limit= / ?cursor=  pagination over the UserIdIndex GSI
 * STUB: implemented in Phase 1.
 */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  void ListNotesQuerySchema;
  throw new Error("getNotes is not implemented until Phase 1");
}
