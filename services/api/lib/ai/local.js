import { extractActions, summarise } from '@clarity/retrieval';

/**
 * The deterministic engine — `packages/retrieval`, wrapped in the provider
 * interface.
 *
 * This is the default and the fallback. It runs in-process, needs no key, no
 * network and no third party, which is what lets Clarity say that a user who
 * never turns AI assistance on has genuinely never had a note leave the system.
 * Phase 3 adds `claude.js` beside this file with the same three methods.
 */
export const localEngine = {
  name: 'local',
  summarise: (text) => summarise(text),
  extractActions: (text) => extractActions(text),
  // Deterministic tag suggestion is not something the frequency-based engine
  // does well, and guessing badly is worse than not guessing. The LLM engine
  // is where this becomes real.
  suggestTags: () => [],
};
