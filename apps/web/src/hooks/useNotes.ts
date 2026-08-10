import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateNoteRequest, NoteFilter, UpdateNoteRequest } from '@clarity/core';
import { api, type NotePage, type ScoredNote } from '@/lib/api';

/**
 * Every read and write of a note goes through here.
 *
 * Notes are the only thing the app caches, and one key namespace covers them,
 * so a write invalidates everything that could have shown the old version —
 * the list, the search, the actions. Getting that wrong is how a note ends up
 * looking edited in one view and not another.
 */

export const noteKeys = {
  all: ['notes'] as const,
  list: (filter?: NoteFilter) => ['notes', 'list', filter ?? 'all'] as const,
  search: (query: string) => ['notes', 'search', query] as const,
  one: (id: string) => ['notes', 'one', id] as const,
  actions: ['actions'] as const,
};

export function useNoteList(filter?: NoteFilter) {
  return useQuery({
    queryKey: noteKeys.list(filter),
    queryFn: () => api.listNotes({ filter, limit: 50 }),
  });
}

export function useNoteSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: noteKeys.search(trimmed),
    queryFn: () => api.searchNotes(trimmed),
    enabled: trimmed.length > 0,
    // A search is a fresh judgement about relevance every time the corpus
    // changes, so it is not worth holding on to for long.
    staleTime: 15_000,
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: noteKeys.one(id ?? ''),
    queryFn: () => api.getNote(id as string),
    enabled: Boolean(id),
  });
}

export function useActions() {
  return useQuery({ queryKey: noteKeys.actions, queryFn: api.listActions });
}

/** Anything that changed a note invalidates every view of notes. */
function useNoteInvalidation() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: noteKeys.all });
    void client.invalidateQueries({ queryKey: noteKeys.actions });
  };
}

export function useCreateNote() {
  const invalidate = useNoteInvalidation();
  return useMutation({
    mutationFn: (body: CreateNoteRequest) => api.createNote(body),
    onSuccess: invalidate,
  });
}

export function useUpdateNote() {
  const client = useQueryClient();
  const invalidate = useNoteInvalidation();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateNoteRequest & { id: string }) => api.updateNote(id, body),
    onSuccess: (note) => {
      // Seed the single-note cache so reopening it is instant and correct,
      // then let everything else refetch.
      client.setQueryData(noteKeys.one(note.id), note);
      invalidate();
    },
  });
}

export function useDeleteNote() {
  const invalidate = useNoteInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: invalidate,
  });
}

export function useSummarizeNote() {
  const client = useQueryClient();
  const invalidate = useNoteInvalidation();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode?: 'local' | 'llm' }) =>
      api.summarizeNote(id, mode),
    onSuccess: (note) => {
      client.setQueryData(noteKeys.one(note.id), note);
      invalidate();
    },
  });
}

export type { NotePage, ScoredNote };
