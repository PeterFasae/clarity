import { unauthenticated } from "../lib/respond.js";
import { getUserId } from "../lib/auth.js";

/** DELETE /me — GDPR hard delete, behind an explicit confirmation. STUB: Phase 3. */
export async function handler(event) {
  const userId = getUserId(event);
  if (!userId) return unauthenticated(event);
  throw new Error("deleteMe is not implemented until Phase 3");
}
