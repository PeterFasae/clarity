import { extractActions, summarise } from '@clarity/retrieval';

/**
 * The deterministic engine — `packages/retrieval`, wrapped in the provider
 * interface.
 *
 * This is the default and the fallback. It runs in-process, needs no key, no
 * network and no third party, which is what lets Clarity say that a user who
 * never turns AI assistance on has genuinely never had a note leave the
 * system.
 *
 * The methods are async only because the LLM engine's are, and `enrich()`
 * should not have to know which one it is holding.
 */
export const localEngine = {
  name: 'local',

  async analyse(text) {
    return {
      summary: summarise(text),
      actions: extractActions(text),
      // Deterministic tag suggestion is not something a frequency-based engine
      // does well, and guessing badly is worse than not guessing — a wrong tag
      // costs more than a missing one when the whole promise is that you never
      // have to file anything.
      tags: [],
    };
  },

  async summarise(text) {
    return summarise(text);
  },

  async extractActions(text) {
    return extractActions(text);
  },

  async suggestTags() {
    return [];
  },
};
