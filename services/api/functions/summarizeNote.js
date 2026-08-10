import { SummariseQuerySchema } from "@clarity/core";
import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/**
 * POST /notes/{id}/summarize — force a recompute. ?mode=local|llm, subject to
 * the user's aiEnabled preference. Local is the default and the fallback.
 * STUB: implemented in Phase 1, LLM path in Phase 3.
 */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  void SummariseQuerySchema;
  throw new Error("summarizeNote is not implemented until Phase 1");
}
