import { LIMITS } from '@clarity/core';
import type {
  ActionItem,
  CreateNoteRequest,
  ExportResponse,
  Note,
  NoteFilter,
  Preferences,
  PreferencesUpdate,
  UpdateNoteRequest,
} from '@clarity/core';
import { API_BASE_URL } from './config';
import { getIdToken } from './session';

/**
 * The API client.
 *
 * Every type here comes from `@clarity/core`, the same file the handlers
 * validate against — so if the server's shape and the client's expectation
 * ever drift apart it is a compile error rather than an `undefined` three
 * screens deep. That is the entire reason the package exists.
 */

export interface ScoredNote extends Note {
  /** Present only on search results. */
  score?: number;
}

export interface NotePage {
  notes: ScoredNote[];
  cursor?: string;
  query?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(status: number, code: string, message: string, details?: ApiError['details']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** The sentence to show a person. Never a status code, never a stack. */
  get readable(): string {
    switch (this.code) {
      case 'unauthenticated':
        return 'You have been signed out. Sign in again to carry on.';
      case 'forbidden':
        return 'That note belongs to someone else.';
      case 'not_found':
        return 'That note is not there any more.';
      case 'ai_disabled':
        return 'AI assistance is switched off for this account.';
      case 'offline':
        return "Could not reach Clarity. Your connection may be down — nothing you've typed is lost.";
      // The server's wording is written for API clients ("the details say which
      // part"), so a person is told which part here.
      case 'limit_exceeded':
        return this.details?.some((detail) => detail.path === 'content')
          ? `This note is longer than the ${LIMITS.content.toLocaleString('en-GB')} characters Clarity can keep, so nothing was changed. Shorten it, or split it into two notes.`
          : 'Something here is longer than Clarity can keep, so nothing was changed.';
      case 'payload_too_large':
        return 'That is too big to send in one go, so nothing was changed. If it is a long note, try splitting it into two.';
      case 'note_too_large':
        return 'This note, with everything Clarity works out from it, is too big to keep in one piece, so nothing was changed. Try splitting it into two notes.';
      case 'invalid_text':
        return 'Some of the text has a character in it that cannot be saved, so nothing was changed. Try typing or pasting it again.';
      default:
        return this.message || 'Something went wrong. Nothing was lost; try again in a moment.';
    }
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getIdToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // fetch only rejects on a network failure, which is worth saying plainly
    // rather than letting it surface as "Failed to fetch".
    throw new ApiError(0, 'offline', 'Could not reach the server.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? 'unknown',
      payload?.message ?? response.statusText,
      payload?.details,
    );
  }

  return payload as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const string = search.toString();
  return string ? `?${string}` : '';
};

export const api = {
  listNotes: (options: { filter?: NoteFilter; limit?: number; cursor?: string } = {}) =>
    request<NotePage>('GET', `/notes${query(options)}`),

  searchNotes: (q: string, limit = 25) =>
    request<NotePage>('GET', `/notes${query({ q, limit })}`),

  getNote: (id: string) =>
    request<{ note: Note }>('GET', `/notes/${id}`).then((r) => r.note),

  createNote: (body: CreateNoteRequest) =>
    request<{ note: Note }>('POST', '/notes', body).then((r) => r.note),

  updateNote: (id: string, body: UpdateNoteRequest) =>
    request<{ note: Note }>('PUT', `/notes/${id}`, body).then((r) => r.note),

  deleteNote: (id: string) => request<void>('DELETE', `/notes/${id}`),

  /** Force a recompute. `mode` is subject to the account's own aiEnabled. */
  summarizeNote: (id: string, mode?: 'local' | 'llm') =>
    request<{ note: Note }>('POST', `/notes/${id}/summarize${query({ mode })}`).then((r) => r.note),

  listActions: () =>
    request<{ actions: ActionItem[] }>('GET', '/actions').then((r) => r.actions),

  getPreferences: () =>
    request<{ preferences: Preferences }>('GET', '/me/preferences').then((r) => r.preferences),

  updatePreferences: (body: PreferencesUpdate) =>
    request<{ preferences: Preferences }>('PUT', '/me/preferences', body).then(
      (r) => r.preferences,
    ),

  exportEverything: () => request<ExportResponse>('POST', '/me/export'),

  deleteAccount: () =>
    request<{ deleted: boolean; notesDeleted: number }>('DELETE', '/me', { confirm: true }),
};
