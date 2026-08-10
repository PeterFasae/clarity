import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * The opt-in engine.
 *
 * `packages/retrieval` is frequency-based and extractive, and report §4.6 is
 * honest about where that falls down: it "performs best with well-structured
 * content", while "users with free-form ADHD writing posed parsing
 * difficulties." Free-form writing is exactly what this product receives. So
 * there is a second engine — and the choice between them is the privacy story
 * rather than a compromise of it, because a user who never turns it on has
 * genuinely never had a note leave the system.
 *
 * Everything here is arranged so that being unavailable is cheap. One request,
 * a short timeout, no retries, and every failure path returns to the caller
 * quickly enough that `enrich()` can fall back to the local engine inside the
 * Lambda's own budget.
 */

/** Long enough for a note-sized request, short enough to fall back inside the Lambda's 10s. */
const TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 6000);

const MODEL = 'claude-sonnet-5';

/**
 * The shape the model must answer in.
 *
 * Written out as JSON Schema rather than derived from the zod schema below:
 * the SDK's `zodOutputFormat` helper reads zod 4's internals, and this
 * workspace is on zod 3 because `packages/core` is. Upgrading the contract
 * package's validator to satisfy a formatting helper is the wrong way round —
 * so the schema is stated once here for the API, and the zod schema is kept for
 * validating what comes back. `additionalProperties: false` is required by
 * structured outputs.
 */
const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        "Two or three sentences capturing what the note is actually about, in the writer's own register.",
    },
    actions: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Things the writer said they would do, one per entry, phrased as they wrote them. Empty if there are none.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'At most four short lower-case topic tags. Empty if nothing obvious fits.',
    },
  },
  required: ['summary', 'actions', 'tags'],
  additionalProperties: false,
};

/** The same shape, used to check what actually came back before it is trusted. */
const AnalysisSchema = z.object({
  summary: z.string(),
  actions: z.array(z.string()),
  tags: z.array(z.string()),
});

const SYSTEM = `You are summarising someone's own notes, for them, inside a note-taking app built for people with ADHD.

These notes are written fast and under pressure. They will be half-punctuated, they will change subject mid-sentence, and they will contain asides that go nowhere. That is the input you are built for — do not treat it as a defect and do not tidy the writer's thinking.

Summary: two or three sentences on what the note is actually about. Write in the writer's own register, not a report voice. Never invent a fact, a name, a date or a number that is not in the note. If the note is too short or too fragmentary to summarise, return the note's own first sentence rather than padding.

Actions: only things the writer committed to doing. "I should email Sam" is an action; "Sam mentioned the deadline" is not. Phrase each one the way they wrote it, so they recognise it. An empty list is a perfectly good answer.

Tags: at most four, lower case, only where a topic is obvious. Empty is better than a guess — a wrong tag costs more than a missing one, because the whole point is that they never have to file anything.

Never address the writer, never comment on their note, and never suggest what they should have written.`;

let client;

function anthropic() {
  client ??= new Anthropic({
    // Milliseconds in this SDK, unlike the Python one.
    timeout: TIMEOUT_MS,
    // No retries. A retried timeout is two timeouts, and the whole guarantee
    // here is that a save never waits on this.
    maxRetries: 0,
  });
  return client;
}

export function claudeIsConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * One request for all three answers.
 *
 * Asking separately would triple the cost and the latency, and would let the
 * summary and the actions disagree about what the note says — which is the
 * exact failure `enrich()` exists to prevent.
 */
async function analyse(text) {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    // Thinking would roughly double the latency for no benefit on a task this
    // shaped, and latency here is the thing that decides whether a save waits.
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA },
    },
    messages: [{ role: 'user', content: text }],
  });

  // Safety classifiers can decline a request, and that arrives as a normal 200
  // with no content rather than as an error — so it has to be checked before
  // the response is read, not caught.
  if (response.stop_reason === 'refusal') {
    throw new Error(`Anthropic declined this note (${response.stop_details?.category ?? 'unknown'})`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Anthropic response was cut short');
  }

  const block = response.content?.find((candidate) => candidate.type === 'text');
  if (!block) throw new Error('Anthropic returned no text to read');

  // Structured outputs should make this exact, but it is still parsed and
  // validated rather than trusted — a malformed answer becomes a local summary
  // rather than a 500 or, worse, a note with a broken summary saved against it.
  const { summary, actions, tags } = AnalysisSchema.parse(JSON.parse(block.text));

  return {
    summary: summary.trim(),
    actions: actions.map((action) => action.trim()).filter(Boolean),
    tags: tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 4),
  };
}

export const claudeEngine = {
  name: 'llm',
  analyse,
  // The three named methods the interface documents. Each is one request, so
  // callers that want only a summary do not pay for tags they will discard.
  summarise: async (text) => (await analyse(text)).summary,
  extractActions: async (text) => (await analyse(text)).actions,
  suggestTags: async (text) => (await analyse(text)).tags,
};
