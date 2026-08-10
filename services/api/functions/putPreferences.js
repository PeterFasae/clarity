import { PreferencesUpdateSchema } from "@clarity/core";
import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/** PUT /me/preferences. STUB: implemented in Phase 1. */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  void PreferencesUpdateSchema;
  throw new Error("putPreferences is not implemented until Phase 1");
}
