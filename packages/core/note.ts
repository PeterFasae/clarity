import { z } from 'zod';
import { sliceCodePoints } from './text.js';

/**
 * The canonical Note.
 *
 * This file is the only place a Note is defined. The predecessor codebase had
 * two incompatible shapes — `_id`/`pinned`/`archived` in the database and
 * `id`/`isPinned`/`isArchived` in the frontend — with nothing mapping between
 * them, so `note.id` was `undefined` and every per-note action was silently
 * broken. One definition, imported everywhere, turns that class of bug into a
 * type error.
 *
 * Two shapes are declared here, and the difference between them is deliberate:
 *
 *   StoredNote — exactly what sits in DynamoDB's NotesTable.
 *   Note       — exactly what goes over the wire.
 *
 * `noteId` becomes `id` and `userId` is dropped on the way out. That mapping
 * happens in exactly one place, `services/api/lib/respond.js`, so no handler
 * can forget to do it.
 */

/** Which engine produced `summary` and `actions`. */
export const SummarySourceSchema = z.enum(['local', 'llm']);
export type SummarySource = z.infer<typeof SummarySourceSchema>;

/** The persisted item. Attribute names match the table exactly. */
export const StoredNoteSchema = z.object({
  /** Partition key. */
  noteId: z.string().uuid(),
  /** Cognito `claims.sub`. Partition key of the UserIdIndex GSI. Never client-supplied. */
  userId: z.string().min(1),
  /** Sort key of the UserIdIndex GSI, which is what gives free reverse-chronological listing. */
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  /** Derived from the first line of `content` when not supplied. */
  title: z.string(),
  /** The note body as the user wrote it. Never written by the summariser. */
  content: z.string(),
  /** Computed on write. Never user-entered, never written into `content`. */
  summary: z.string(),
  /** Computed on write. */
  actions: z.array(z.string()),
  summarySource: SummarySourceSchema,
  tags: z.array(z.string()),
  pinned: z.boolean(),
  archived: z.boolean(),
  /** ISO-8601 timestamps. */
  reminders: z.array(z.string().datetime()),
});
export type StoredNote = z.infer<typeof StoredNoteSchema>;

/** The wire shape. The API returns `id`, never `noteId`. */
export const NoteSchema = StoredNoteSchema.omit({ noteId: true, userId: true }).extend({
  id: z.string().uuid(),
});
export type Note = z.infer<typeof NoteSchema>;

/** A note returned from a search, carrying its relevance score. */
export const ScoredNoteSchema = NoteSchema.extend({ score: z.number() });
export type ScoredNote = z.infer<typeof ScoredNoteSchema>;

/**
 * An action lifted out of a note. Derived at read time from the note's stored
 * `actions`, never a separate store — so it cannot drift from what the note says.
 */
export const ActionItemSchema = z.object({
  text: z.string(),
  noteId: z.string().uuid(),
  noteTitle: z.string(),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

/** Fields the summariser owns. A client may never set these. */
export const COMPUTED_NOTE_FIELDS = ['summary', 'actions', 'summarySource'] as const;

/**
 * The title rule, in one place because both the API (on write) and the app (for
 * its optimistic preview) need it and they must agree: first non-empty line,
 * leading `#` stripped, capped at 60 characters. Characters are code points, so
 * an emoji on the boundary is kept whole rather than cut in half.
 */
export function deriveTitle(content: string): string {
  const firstLine = String(content)
    .split('\n')
    .find((line) => line.trim());
  if (!firstLine) return 'Untitled';
  return sliceCodePoints(firstLine.trim().replace(/^#+\s*/, ''), 60) || 'Untitled';
}
