/**
 * Note bodies for the seed and the latency harness.
 *
 * Deliberately not lorem ipsum. The engine's weak spot, which report §4.6 names
 * outright, is free-form writing: frequency-based summarisation "performs best
 * with well-structured content" and struggles with the half-punctuated,
 * sideways-running prose this product actually receives. Measuring it against
 * tidy paragraphs would measure the wrong thing.
 */

const TOPICS = [
  ['working memory', 'the phonological loop', 'chunking', 'Baddeley', 'the seminar reading'],
  ['the billing migration', 'the invoice schema', 'the schema review', 'sign-off', 'the staging run'],
  ['the dashboard', 'the orders panel', 'a waterfall of requests', 'the p95', 'caching'],
  ['the dissertation', 'the evaluation chapter', 'a baseline comparison', 'the ethics amendment'],
  ['the standup', 'the flaky test', 'the release branch', 'the rollback', 'the on-call rota'],
  ['the lecture on attention', 'sustained attention', 'task switching', 'the cost of interruption'],
  ['the supervision meeting', 'the literature review', 'the citation manager', 'the reading list'],
  ['the accessibility audit', 'contrast ratios', 'focus order', 'the screen reader pass'],
];

const OPENERS = [
  'so today was mostly about',
  'quick note before I forget —',
  'ok so the thing that actually matters here is',
  'writing this on the bus, apologies.',
  'half of this is going to be wrong but',
];

const MIDDLES = [
  'the point he kept coming back to was that it is not about effort, it is about capacity, which is a different thing entirely.',
  'nobody could agree on whether that was a blocker or just annoying, so it got parked again.',
  'it only shows up under load, which is why we kept missing it locally.',
  'I lost the thread for about ten minutes here and came back to something about the deadline.',
  'the practical takeaway, and this is the bit for the exam, is that overloading it means nothing transfers.',
  'apparently this has been broken since March and everyone assumed someone else had raised it.',
];

const ACTIONS = [
  'TODO: book a slot in the lab',
  'I need to email the supervisor about the amendment',
  '- [ ] rewrite the evaluation section',
  'Remember to chase the invoice',
  'We should fix the flaky test before the release',
  'Action: send the deck to the group',
  'TODO: read chapter four before the seminar',
  'I have to call the bank about the standing order',
];

const CLOSERS = [
  'anyway. moving on.',
  'need to come back to this when I have more than four minutes.',
  'this is the third time I have written this down somewhere.',
  'genuinely no idea where I put the earlier version of this.',
];

const pick = (list, n) => list[n % list.length];

/**
 * Deterministic, so a seeded corpus is the same every run and a latency number
 * is comparable to the last one.
 */
export function noteContent(n) {
  const topic = TOPICS[n % TOPICS.length];

  return [
    `${pick(OPENERS, n)} ${topic[0]}`,
    '',
    `${pick(MIDDLES, n)} there was a whole tangent about ${topic[1]} that I did not fully follow.`,
    `the part about ${topic[2]} made sense at the time. ${pick(MIDDLES, n + 3)}`,
    `something about ${topic[3]} as well, which I should look up.`,
    '',
    pick(ACTIONS, n),
    pick(ACTIONS, n + 5),
    '',
    pick(CLOSERS, n),
  ].join('\n');
}

export const CORPUS_SIZE_DEFAULT = 500;
