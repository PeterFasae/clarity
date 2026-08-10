import { localEngine } from './local.js';

/**
 * Pick the engine for one request.
 *
 * Both engines expose the same interface — `{ name, summarise, extractActions,
 * suggestTags }` — so `enrich()` never learns which one it has.
 *
 * The rule, which does not change when the LLM arrives in Phase 3:
 *   - `local` is the default and the fallback.
 *   - `llm` requires the user's own `aiEnabled` to be true. A request asking
 *     for it without that flag is refused, not silently downgraded — a user
 *     needs to be able to trust that off means off.
 *   - If the LLM errors or times out, the local engine answers. **An AI outage
 *     must never block a save.**
 */
export function selectEngine(preferences, requestedMode) {
  const wantsLlm = requestedMode === 'llm';
  if (!wantsLlm) return localEngine;

  if (!preferences?.aiEnabled) {
    const error = new Error('AI assistance is switched off for this account.');
    error.name = 'AiDisabledError';
    throw error;
  }

  // Phase 3 returns the Claude engine here, wrapped so that any failure falls
  // through to localEngine rather than surfacing to the caller.
  return localEngine;
}

export { localEngine };
