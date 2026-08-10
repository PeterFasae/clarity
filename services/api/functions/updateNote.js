import { UpdateNoteRequestSchema } from "@clarity/core";
import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/**
 * PUT /notes/{id} — recomputes summary + actions. `content` is only ever
 * written from the request, never from the summariser.
 * STUB: implemented in Phase 1.
 */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  void UpdateNoteRequestSchema;
  throw new Error("updateNote is not implemented until Phase 1");
}
