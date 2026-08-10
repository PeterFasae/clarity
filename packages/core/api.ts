import { z } from 'zod';
import { ActionItemSchema, NoteSchema, ScoredNoteSchema, ShareSchema } from './note.js';
import { PreferencesSchema } from './preferences.js';

/**
 * The API contract.
 *
 * Every handler validates its request body against the schema here, at the
 * handler boundary, before anything touches the store. Response types are
 * declared alongside so the client and the server cannot disagree about a
 * shape without it being a type error.
 *
 * Note what is absent from every request schema: `summary`, `actions`,
 * `summarySource`, `userId`, `createdAt` and `updatedAt`. Those are the
 * server's to set. A client cannot write a summary, and `userId` comes from
 * the Cognito JWT's `claims.sub` — never from a request body.
 */

// ---------------------------------------------------------------- notes

export const CreateNoteRequestSchema = z.object({
  content: z.string().min(1, 'A note needs some content.'),
  /** Optional. Derived from the first line of `content` when absent. */
  title: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
  reminders: z.array(z.string().datetime()).optional(),
});
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;

export const UpdateNoteRequestSchema = z
  .object({
    content: z.string().min(1),
    title: z.string().max(200),
    tags: z.array(z.string()),
    pinned: z.boolean(),
    archived: z.boolean(),
    sharedWith: z.array(ShareSchema),
    reminders: z.array(z.string().datetime()),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update.' });
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;

export const NoteFilterSchema = z.enum(['pinned', 'archived', 'shared']);
export type NoteFilter = z.infer<typeof NoteFilterSchema>;

/** Query string for `GET /notes`. Values arrive as strings, so `limit` is coerced. */
export const ListNotesQuerySchema = z.object({
  q: z.string().optional(),
  filter: NoteFilterSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  /** Opaque to the client; an encoded DynamoDB `ExclusiveStartKey`. */
  cursor: z.string().optional(),
});
export type ListNotesQuery = z.infer<typeof ListNotesQuerySchema>;

export const SummariseModeSchema = z.enum(['local', 'llm']);
export type SummariseMode = z.infer<typeof SummariseModeSchema>;

/** Query string for `POST /notes/{id}/summarize`. Subject to the user's `aiEnabled`. */
export const SummariseQuerySchema = z.object({
  mode: SummariseModeSchema.optional(),
});
export type SummariseQuery = z.infer<typeof SummariseQuerySchema>;

// ----------------------------------------------------------------- gdpr

/**
 * `DELETE /me` is irreversible and takes everything, so it will not act on a
 * bare request. The client has to say so explicitly, which means an accidental
 * or forged request does nothing.
 */
export const DeleteAccountRequestSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Deleting an account has to be confirmed explicitly.' }),
  }),
});
export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequestSchema>;

// ------------------------------------------------------------ responses

export const NoteResponseSchema = z.object({ note: NoteSchema });
export type NoteResponse = z.infer<typeof NoteResponseSchema>;

export const NoteListResponseSchema = z.object({
  notes: z.array(z.union([NoteSchema, ScoredNoteSchema])),
  /** Absent when there is no further page. */
  cursor: z.string().optional(),
  /** Echoed back when the list was a search, so the UI can say what it matched. */
  query: z.string().optional(),
});
export type NoteListResponse = z.infer<typeof NoteListResponseSchema>;

export const SummaryResponseSchema = z.object({
  summary: z.string(),
  actions: z.array(z.string()),
  summarySource: z.enum(['local', 'llm']),
});
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

export const ActionListResponseSchema = z.object({ actions: z.array(ActionItemSchema) });
export type ActionListResponse = z.infer<typeof ActionListResponseSchema>;

export const PreferencesResponseSchema = z.object({ preferences: PreferencesSchema });
export type PreferencesResponse = z.infer<typeof PreferencesResponseSchema>;

export const ExportResponseSchema = z.object({
  exportedAt: z.string().datetime(),
  notes: z.array(NoteSchema),
  preferences: PreferencesSchema,
});
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

/**
 * One error shape for every failure. `error` is a stable machine-readable code;
 * `message` is for people and may change.
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  /** Present when the failure was schema validation. */
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const ERROR_CODES = {
  unauthenticated: 'unauthenticated', // 401 — no or invalid JWT
  forbidden: 'forbidden', // 403 — authenticated, but not your note
  notFound: 'not_found', // 404
  validationFailed: 'validation_failed', // 422
  aiDisabled: 'ai_disabled', // 409 — llm mode asked for with aiEnabled false
} as const;
