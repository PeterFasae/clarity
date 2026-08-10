import { CreateNoteRequestSchema } from "@clarity/core";
import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/**
 * POST /notes — create. Computes summary + actions on write via lib/enrich.js.
 * STUB: implemented in Phase 1.
 */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  void CreateNoteRequestSchema;
  throw new Error("createNote is not implemented until Phase 1");
}
