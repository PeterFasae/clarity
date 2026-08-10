import express from 'express';
import { extractActions, search, summarise } from '../shared/retrieval.js';
import { seedNotes } from './seed.js';

/**
 * The API.
 *
 * Each handler below is deliberately small and stateless apart from the store,
 * because in the deployed version each one is a Lambda behind API Gateway. The
 * store is the seam: swap the Map for a DynamoDB client and the handlers do not
 * change. Keeping that boundary honest is what made the AWS version a
 * deployment detail rather than a rewrite.
 */

const store = new Map(seedNotes.map((note) => [note.id, note]));
let nextId = seedNotes.length + 1;

const app = express();
app.use(express.json({ limit: '1mb' }));

const asList = () => [...store.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

app.get('/api/notes', (req, res) => {
  const query = String(req.query.q ?? '').trim();

  if (!query) return res.json({ notes: asList(), query: '' });

  const hits = search(query, asList());
  res.json({
    query,
    notes: hits.map((hit) => ({ ...hit.note, score: Number(hit.score.toFixed(4)) })),
  });
});

app.get('/api/actions', (_req, res) => {
  // Actions are derived, never stored separately. There is one source of
  // truth for what a note says, so they cannot drift apart.
  const actions = asList().flatMap((note) =>
    note.actions.map((text) => ({ text, noteId: note.id, noteTitle: note.title }))
  );
  res.json({ actions });
});

app.post('/api/notes', (req, res) => {
  const { title, body } = req.body ?? {};
  if (typeof body !== 'string' || body.trim().length === 0) {
    return res.status(422).json({ error: 'body_required' });
  }

  const note = enrich({
    id: String(nextId++),
    title: typeof title === 'string' && title.trim() ? title.trim() : deriveTitle(body),
    body,
    createdAt: new Date().toISOString(),
  });

  store.set(note.id, note);
  res.status(201).json({ note });
});

app.put('/api/notes/:id', (req, res) => {
  const existing = store.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const { title, body } = req.body ?? {};
  if (typeof body !== 'string' || body.trim().length === 0) {
    return res.status(422).json({ error: 'body_required' });
  }

  const note = enrich({
    ...existing,
    title: typeof title === 'string' && title.trim() ? title.trim() : deriveTitle(body),
    body,
  });

  store.set(note.id, note);
  res.json({ note });
});

app.delete('/api/notes/:id', (req, res) => {
  if (!store.delete(req.params.id)) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

/**
 * Summary and actions are recomputed on every write rather than on read.
 * Capture stays instant either way, but doing it here means the expensive part
 * happens once per edit instead of once per keystroke of a search.
 */
function enrich(note) {
  return {
    ...note,
    summary: summarise(note.body),
    actions: extractActions(note.body),
    updatedAt: new Date().toISOString(),
  };
}

function deriveTitle(body) {
  const firstLine = body.split('\n').find((line) => line.trim()) ?? 'Untitled';
  return firstLine.trim().replace(/^#+\s*/, '').slice(0, 60);
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`clarity api on http://localhost:${port}`));
