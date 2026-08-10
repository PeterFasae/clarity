import { localEngine } from './local.js';

/**
 * Pick the engine for one request.
 *
 * Both engines expose the same interface — `{ name, analyse, summarise,
 * extractActions, suggestTags }` — so `enrich()` never learns which one it
 * has.
 *
 * The rules, in order of how much they matter:
 *
 *   1. **`local` is the default.** No preference, no key, no flag: local.
 *   2. **`llm` requires the user's own `aiEnabled`.** A request asking for it
 *      without that flag is refused with a 409, not quietly downgraded. Off has
 *      to mean off in a way the user can verify, and a silent downgrade would
 *      make `summarySource` the only evidence of what happened.
 *   3. **`local` is also the fallback.** If the LLM errors or times out, the
 *      local engine answers — see `enrich()`. An AI outage must never block a
 *      save.
 *
 * `mode` is what the request asked for: `local` forces the deterministic
 * engine, `llm` demands the other one, and no mode at all means "whatever this
 * account is set to" — which is how a save picks up `aiEnabled` without the
 * user having to press a second button.
 *
 * The Claude module is imported lazily, so a deployment with `aiEnabled` false
 * everywhere never loads the SDK at all — which is the cheapest possible way to
 * be sure of rule 1.
 */
export async function selectEngine(preferences, requestedMode) {
  if (requestedMode === 'local') return localEngine;

  const wantsLlm = requestedMode === 'llm' || (!requestedMode && preferences?.aiEnabled);
  if (!wantsLlm) return localEngine;

  if (!preferences?.aiEnabled) {
    const error = new Error('AI assistance is switched off for this account.');
    error.name = 'AiDisabledError';
    throw error;
  }

  const { claudeEngine, claudeIsConfigured } = await import('./claude.js');

  if (!claudeIsConfigured()) {
    // Misconfiguration on our side is not the user's problem, and it is not a
    // reason to refuse a save. Local answers and `summarySource` records it.
    console.warn('ANTHROPIC_API_KEY is not set; falling back to the local engine.');
    return localEngine;
  }

  return claudeEngine;
}

export { localEngine };
