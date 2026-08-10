import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { ActionItem, Note } from './types';

type View = 'notes' | 'actions';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('notes');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const captureRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async (q: string) => {
    const [list, actionList] = await Promise.all([api.list(q), api.actions()]);
    setNotes(list.notes);
    setActions(actionList.actions);
  }, []);

  useEffect(() => {
    // Debounced so typing does not fire a request per keystroke.
    const id = window.setTimeout(() => {
      refresh(query).catch(console.error);
    }, 140);
    return () => window.clearTimeout(id);
  }, [query, refresh]);

  // Capture has to be one keystroke away or it does not get used.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'n' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        captureRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const capture = async () => {
    const body = draft.trim();
    if (!body || busy) return;

    setBusy(true);
    try {
      await api.create(body);
      setDraft('');
      await refresh(query);
    } finally {
      setBusy(false);
    }
  };

  const selected = notes.find((note) => note.id === selectedId) ?? null;

  return (
    <div className="app">
      <header className="head">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <h1>Clarity</h1>
        </div>
        <input
          className="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by what it was about…"
          aria-label="Search notes"
        />
      </header>

      <section className="capture">
        <textarea
          ref={captureRef}
          className="capture-box"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) capture();
          }}
          placeholder="Dump it here. Summary and actions are worked out on save."
          rows={3}
          aria-label="New note"
        />
        <div className="capture-row">
          <span className="hint">
            <kbd>⌘</kbd><kbd>N</kbd> to focus · <kbd>⌘</kbd><kbd>↵</kbd> to save
          </span>
          <button className="primary" onClick={capture} disabled={!draft.trim() || busy}>
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </section>

      <nav className="tabs" aria-label="Views">
        <button className="tab" data-active={view === 'notes'} onClick={() => setView('notes')}>
          Notes <span className="count">{notes.length}</span>
        </button>
        <button className="tab" data-active={view === 'actions'} onClick={() => setView('actions')}>
          Actions <span className="count">{actions.length}</span>
        </button>
      </nav>

      {view === 'notes' ? (
        <NoteList
          notes={notes}
          query={query}
          selected={selected}
          onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
          onDelete={async (id) => {
            await api.remove(id);
            if (selectedId === id) setSelectedId(null);
            await refresh(query);
          }}
        />
      ) : (
        <ActionList actions={actions} onJump={(noteId) => { setView('notes'); setSelectedId(noteId); }} />
      )}
    </div>
  );
}

function NoteList({
  notes,
  query,
  selected,
  onSelect,
  onDelete,
}: {
  notes: Note[];
  query: string;
  selected: Note | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (notes.length === 0) {
    return (
      <p className="empty">
        {query ? `Nothing matches “${query}”.` : 'No notes yet. Write the first one above.'}
      </p>
    );
  }

  return (
    <ul className="notes">
      {notes.map((note) => {
        const open = selected?.id === note.id;
        return (
          <li key={note.id} className="note" data-open={open}>
            <button className="note-head" onClick={() => onSelect(note.id)} aria-expanded={open}>
              <span className="note-title">{note.title}</span>
              {/* The summary is what you read when scanning, so it is the thing
                  shown in the list rather than the first line of the body. */}
              <span className="note-summary">{note.summary}</span>
              <span className="note-meta">
                {note.actions.length > 0 && (
                  <span className="badge">
                    {note.actions.length} action{note.actions.length === 1 ? '' : 's'}
                  </span>
                )}
                {note.score !== undefined && <span className="score">match {note.score.toFixed(2)}</span>}
                <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
              </span>
            </button>

            {open && (
              <div className="note-body">
                <pre>{note.body}</pre>
                {note.actions.length > 0 && (
                  <div className="note-actions">
                    <h3>Actions</h3>
                    <ul>
                      {note.actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button className="danger" onClick={() => onDelete(note.id)}>
                  Delete note
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ActionList({
  actions,
  onJump,
}: {
  actions: ActionItem[];
  onJump: (noteId: string) => void;
}) {
  if (actions.length === 0) {
    return <p className="empty">No actions found. Try a line starting with “TODO:”.</p>;
  }

  return (
    <ul className="actions">
      {actions.map((action, index) => (
        <li key={`${action.noteId}-${index}`}>
          <span className="tick" aria-hidden="true" />
          <span className="action-text">{action.text}</span>
          <button className="from" onClick={() => onJump(action.noteId)}>
            {action.noteTitle}
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
}
