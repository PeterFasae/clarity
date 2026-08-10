import type { ActionItem, Note } from './types';

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

export const api = {
  list: (query: string) =>
    fetch(`/api/notes?q=${encodeURIComponent(query)}`).then(json<{ notes: Note[]; query: string }>),

  actions: () => fetch('/api/actions').then(json<{ actions: ActionItem[] }>),

  create: (body: string) =>
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    }).then(json<{ note: Note }>),

  update: (id: string, body: string) =>
    fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    }).then(json<{ note: Note }>),

  remove: (id: string) => fetch(`/api/notes/${id}`, { method: 'DELETE' }),
};
