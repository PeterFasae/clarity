import { z } from 'zod';
import { ActionItemSchema, NoteSchema, ScoredNoteSchema } from './note.js';
import { PreferencesSchema } from './preferences.js';
import { LIMITS } from './limits.js';
import { countCodePoints, isWellFormedText } from './text.js';

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

const SHARING_NOT_AVAILABLE = "Sharing isn't available yet.";

/**
 * A field the contract refuses outright.
 *
 * zod strips unknown keys without a word, which is the right default for most
 * fields and the wrong one here: a client that sends `sharedWith` believes it
 * has shared a note. So the key is declared, and any value at all is an issue
 * tagged with the stable error `code` that `respond.js` turns into a response.
 * The type says "undefined", so no caller can build a request that contains it.
 */
function refusedField(code: string, message: string) {
  return z.unknown().superRefine((value, ctx) => {
    if (value !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, params: { clarity: code } });
    }
  }) as unknown as z.ZodOptional<z.ZodUndefined>;
}

const number = new Intl.NumberFormat('en-GB');

/**
 * Text a person wrote: a note's content, its title, a tag.
 *
 * Counted in Unicode code points, never trimmed or normalised. An unpaired
 * surrogate is `invalid_text` and over the limit is `limit_exceeded`; both are
 * tagged so `respond.js` can answer with the stable code. The messages say what
 * is wrong, never what was sent: an error body must not carry the text.
 */
function userText(max: number, required?: string) {
  const base = required ? z.string().min(1, required) : z.string();
  return base.superRefine((value, ctx) => {
    if (!isWellFormedText(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'This has a character in it that cannot be saved. Try typing or pasting it again.',
        params: { clarity: 'invalid_text' },
      });
      return;
    }
    if (countCodePoints(value) > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `This is longer than the ${number.format(max)} characters that can be kept.`,
        params: { clarity: 'limit_exceeded', limit: max },
      });
    }
  });
}

/** A list with a ceiling on how many items it may hold. */
function boundedList<T extends z.ZodTypeAny>(item: T, max: number) {
  return z.array(item).superRefine((list, ctx) => {
    if (list.length > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `There are more here than the ${number.format(max)} that can be kept.`,
        params: { clarity: 'limit_exceeded', limit: max },
      });
    }
  });
}

const contentSchema = userText(LIMITS.content, 'A note needs some content.');
const titleSchema = userText(LIMITS.title);
const tagsSchema = boundedList(userText(LIMITS.tag), LIMITS.tags);

/** A date-time string has no natural length, so it needs one for the item size to be bounded. */
const reminderSchema = z
  .string()
  .datetime()
  .superRefine((value, ctx) => {
    if (value.length > LIMITS.reminder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `This is longer than the ${LIMITS.reminder} characters a reminder can be.`,
        params: { clarity: 'limit_exceeded', limit: LIMITS.reminder },
      });
    }
  });
const remindersSchema = boundedList(reminderSchema, LIMITS.reminders);

export const CreateNoteRequestSchema = z.object({
  content: contentSchema,
  /** Optional. Derived from the first line of `content` when absent. */
  title: titleSchema.optional(),
  tags: tagsSchema.optional(),
  pinned: z.boolean().optional(),
  reminders: remindersSchema.optional(),
  sharedWith: refusedField('sharing_not_available', SHARING_NOT_AVAILABLE),
});
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;

export const UpdateNoteRequestSchema = z
  .object({
    content: contentSchema,
    title: titleSchema,
    tags: tagsSchema,
    pinned: z.boolean(),
    archived: z.boolean(),
    sharedWith: refusedField('sharing_not_available', SHARING_NOT_AVAILABLE),
    reminders: remindersSchema,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update.' });
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;

export const NoteFilterSchema = z.enum(['pinned', 'archived']);
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
  consentRequired: 'consent_required', // 422 — aiEnabled true with no consent on record
  sharingNotAvailable: 'sharing_not_available', // 422 — sharedWith sent; sharing is not built
  invalidText: 'invalid_text', // 422 — user text with an unpaired surrogate
  limitExceeded: 'limit_exceeded', // 422 — a field or a list is over its limit
  noteTooLarge: 'note_too_large', // 422 — the finished item is over the stored-size ceiling
  payloadTooLarge: 'payload_too_large', // 413 — the request body is over 1 MiB
} as const;
