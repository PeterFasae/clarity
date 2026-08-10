/**
 * The retrieval pipeline.
 *
 * Capture was never the problem. Getting things back out was, so this is the
 * part of the app worth having tests around: a summary that runs on save,
 * actions lifted into their own list, and search that matches on meaning
 * rather than on the words you happened to type.
 *
 * Everything here is deterministic and dependency-free, which is why it can be
 * unit tested rather than eyeballed.
 */

const STOP_WORDS = new Set(
  `a about after all also am an and any are as at be because been before being between both but by can could did do does
   doing down during each few for from further had has have having he her here hers him his how i if in into is it its
   just me more most my no nor not of off on once only or other our out over own same she should so some such than that
   the their them then there these they this those through to too under until up very was we were what when where which
   while who whom why will with you your`.split(/\s+/)
);

export function tokenise(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map(stem);
}

/**
 * A deliberately small suffix stripper. It exists so "meeting" and "meetings"
 * land on the same term; it is not a real morphological analyser and does not
 * pretend to be.
 */
function stem(word) {
  // Applied repeatedly, because suffixes stack: "meetings" has to lose the
  // "s" and then the "ing" to land on the same term as "meeting".
  let current = word;
  let changed = true;

  while (changed) {
    changed = false;
    for (const suffix of ['ing', 'edly', 'ed', 'es', 's']) {
      if (current.length > suffix.length + 2 && current.endsWith(suffix)) {
        current = current.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }
  }

  return current;
}

/**
 * Splits into sentences, treating a blank line as a hard break.
 *
 * A single newline is not a sentence boundary. People hard-wrap notes, and
 * splitting on every newline chops sentences in half, which produces summaries
 * that read like two fragments glued together.
 */
export function splitSentences(text) {
  return String(text)
    .split(/\n\s*\n/) // paragraphs
    .flatMap((paragraph) =>
      paragraph
        .replace(/\s*\n\s*/g, ' ') // unwrap soft line breaks
        .split(/(?<=[.!?])\s+/)
    )
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * Extractive summary: score each sentence by how much of the note's own
 * vocabulary it carries, then keep the best few in their original order.
 *
 * Extractive rather than generative on purpose. It cannot invent a fact that
 * was not in the note, which for a notes app matters more than fluency.
 */
export function summarise(text, { maxSentences = 2 } = {}) {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences.join(' ');

  const frequency = new Map();
  for (const term of tokenise(text)) {
    frequency.set(term, (frequency.get(term) ?? 0) + 1);
  }

  const scored = sentences.map((sentence, index) => {
    const terms = tokenise(sentence);
    if (terms.length === 0) return { index, score: 0 };
    const total = terms.reduce((sum, term) => sum + (frequency.get(term) ?? 0), 0);
    // Divide by length so a long rambling sentence does not win on volume.
    return { index, score: total / terms.length };
  });

  const keep = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((entry) => sentences[entry.index]);

  return keep.join(' ');
}

const ACTION_PATTERNS = [
  /^\s*[-*]\s*\[ \]\s*(.+)$/i, // - [ ] markdown checkbox
  /^\s*todo:?\s*(.+)$/i,
  /^\s*action:?\s*(.+)$/i,
  /^\s*(?:i|we)\s+(?:need to|should|must|have to)\s+(.+)$/i,
  /^\s*(?:remember|remind me)\s+to\s+(.+)$/i,
  /^\s*(?:chase|email|call|send|book|write|fix|check|ask)\s+(.+)$/i,
];

/**
 * Pulls actionable lines out of a note so they can live in their own list.
 * Pattern-based, so it is predictable: you can learn what it will pick up.
 */
export function extractActions(text) {
  const actions = [];
  const seen = new Set();

  for (const line of String(text).split('\n')) {
    for (const pattern of ACTION_PATTERNS) {
      const match = line.match(pattern);
      if (!match) continue;

      const action = match[1].trim().replace(/[.,;]+$/, '');
      const key = action.toLowerCase();
      if (action.length > 2 && !seen.has(key)) {
        seen.add(key);
        actions.push(action);
      }
      break; // one action per line
    }
  }

  return actions;
}

/**
 * TF-IDF with cosine similarity.
 *
 * The inverse document frequency is what makes this useful: a word that
 * appears in every note tells you nothing about which note you want, so it is
 * weighted down automatically as the collection grows.
 *
 * This is similarity over the words actually present. It will not connect
 * "invoice" to "billing" the way a sentence-embedding model would; the
 * production plan was to swap this scorer for embeddings behind the same
 * interface.
 */
export function buildIndex(notes) {
  const documents = notes.map((note) => ({
    id: note.id,
    terms: tokenise(`${note.title} ${note.body}`),
  }));

  const documentFrequency = new Map();
  for (const doc of documents) {
    for (const term of new Set(doc.terms)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const total = documents.length || 1;
  const vectors = new Map();

  for (const doc of documents) {
    vectors.set(doc.id, toVector(doc.terms, documentFrequency, total));
  }

  return { vectors, documentFrequency, total };
}

function toVector(terms, documentFrequency, total) {
  const counts = new Map();
  for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);

  const vector = new Map();
  for (const [term, count] of counts) {
    const tf = count / terms.length;
    // Smoothed, so a term present in every document scores near zero rather
    // than exactly zero, and an unseen query term does not divide by zero.
    const idf = Math.log((total + 1) / ((documentFrequency.get(term) ?? 0) + 1)) + 1;
    vector.set(term, tf * idf);
  }
  return vector;
}

function cosine(a, b) {
  let dot = 0;
  // Iterate the smaller vector; the result is symmetric.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other) dot += weight * other;
  }
  if (dot === 0) return 0;

  const magnitude = (v) => Math.sqrt([...v.values()].reduce((sum, w) => sum + w * w, 0));
  const denominator = magnitude(a) * magnitude(b);
  return denominator === 0 ? 0 : dot / denominator;
}

export function search(query, notes, { limit = 10, threshold = 0.02 } = {}) {
  const trimmed = String(query).trim();
  if (!trimmed) return [];

  const index = buildIndex(notes);
  const queryVector = toVector(tokenise(trimmed), index.documentFrequency, index.total);
  if (queryVector.size === 0) return [];

  return notes
    .map((note) => ({ note, score: cosine(queryVector, index.vectors.get(note.id)) }))
    .filter((hit) => hit.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
