import { useEffect, useRef, useState } from 'react';
import { Archive, Bell, Loader2, Maximize2, Pin, Plus, Trash2, Volume2, X } from 'lucide-react';
import type { Note } from '@clarity/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SummaryPanel } from '@/components/SummaryPanel';
import { useFocusMode } from '@/components/FocusMode';
import { useDeleteNote, useUpdateNote } from '@/hooks/useNotes';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { ApiError } from '@/lib/api';

/**
 * One open note.
 *
 * The summary sits above the body and the body is the user's text, unedited by
 * anything but them. Everything else — pin, archive, tags, reminders — is a
 * control on the side rather than a step you have to complete.
 *
 * Saving is explicit and also automatic on blur. Autosave alone is a bad fit
 * here: not knowing whether something saved is its own low-grade anxiety, so
 * there is a button, and it always says what just happened.
 */
export function NoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const [draft, setDraft] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const [tagDraft, setTagDraft] = useState('');
  const [reminderDraft, setReminderDraft] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const update = useUpdateNote();
  const remove = useDeleteNote();
  const focusMode = useFocusMode();
  const speech = useSpeechSynthesis();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // A different note in the same slot is a different document.
  useEffect(() => {
    setDraft(note.content);
    setTitle(note.title);
    setStatus('');
    setError(null);
    setConfirmingDelete(false);
  }, [note.id, note.content, note.title]);

  const dirty = draft !== note.content || title !== note.title;

  function save(patch?: Partial<{ pinned: boolean; archived: boolean; tags: string[]; reminders: string[] }>) {
    const body = {
      id: note.id,
      ...(patch ?? {}),
      ...(patch ? {} : { content: draft, title }),
    };

    setError(null);
    update.mutate(body, {
      onSuccess: () => {
        setStatus('Saved');
        window.setTimeout(() => setStatus(''), 2500);
      },
      onError: (caught) =>
        setError(caught instanceof ApiError ? caught.readable : 'Could not save that.'),
    });
  }

  function addTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || note.tags.includes(tag)) return;
    setTagDraft('');
    save({ tags: [...note.tags, tag] });
  }

  function addReminder() {
    if (!reminderDraft) return;
    const iso = new Date(reminderDraft).toISOString();
    setReminderDraft('');
    save({ reminders: [...note.reminders, iso].sort() });
  }

  return (
    <article aria-labelledby="note-title" className="flex h-full flex-col">
      <header className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="note-title" className="sr-only">
            Note title
          </label>
          <input
            id="note-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => dirty && save()}
            className="w-full rounded border-0 bg-transparent text-2xl font-bold outline-none"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Last changed <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleString()}</time>
          </p>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close this note">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={note.pinned ? 'default' : 'outline'}
          size="sm"
          onClick={() => save({ pinned: !note.pinned })}
          aria-pressed={note.pinned}
        >
          <Pin className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {note.pinned ? 'Pinned' : 'Pin'}
        </Button>

        <Button
          type="button"
          variant={note.archived ? 'default' : 'outline'}
          size="sm"
          onClick={() => save({ archived: !note.archived })}
          aria-pressed={note.archived}
        >
          <Archive className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {note.archived ? 'Archived' : 'Archive'}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={() => focusMode.enter(note)}>
          <Maximize2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Focus mode
        </Button>

        {speech.supported && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (speech.speaking ? speech.stop() : speech.speak(note.content))}
            aria-pressed={speech.speaking}
          >
            <Volume2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {speech.speaking ? 'Stop reading' : 'Read aloud'}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {update.isPending ? 'Saving…' : status}
          </span>
          <Button type="button" size="sm" onClick={() => save()} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </p>
      )}

      <SummaryPanel note={note} />

      <label htmlFor="note-body" className="sr-only">
        The note
      </label>
      <textarea
        id="note-body"
        ref={bodyRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => dirty && save()}
        spellCheck
        className="min-h-[16rem] flex-1 w-full resize-none rounded-lg border border-input bg-background p-4 text-base leading-relaxed outline-none"
      />

      <section aria-labelledby="tags-heading" className="mt-5">
        <h2 id="tags-heading" className="mb-2 text-base">
          Tags
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {note.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
              {tag}
              <button
                type="button"
                onClick={() => save({ tags: note.tags.filter((other) => other !== tag) })}
                aria-label={`Remove the tag ${tag}`}
                className="rounded"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}

          <label htmlFor="new-tag" className="sr-only">
            Add a tag
          </label>
          <Input
            id="new-tag"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag"
            className="h-9 w-40"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!tagDraft.trim()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Add tag</span>
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Optional. Search finds this note by what it says, with or without tags.
        </p>
      </section>

      <section aria-labelledby="reminders-heading" className="mt-5">
        <h2 id="reminders-heading" className="mb-2 text-base">
          Reminders
        </h2>

        <ul className="mb-2 space-y-1">
          {note.reminders.map((reminder) => (
            <li key={reminder} className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <time dateTime={reminder}>{new Date(reminder).toLocaleString()}</time>
              <button
                type="button"
                onClick={() => save({ reminders: note.reminders.filter((other) => other !== reminder) })}
                aria-label={`Remove the reminder for ${new Date(reminder).toLocaleString()}`}
                className="rounded text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="new-reminder" className="sr-only">
            Remind me at
          </label>
          <Input
            id="new-reminder"
            type="datetime-local"
            value={reminderDraft}
            onChange={(event) => setReminderDraft(event.target.value)}
            className="h-9 w-56"
          />
          <Button type="button" variant="outline" size="sm" onClick={addReminder} disabled={!reminderDraft}>
            Add reminder
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Reminders show as a browser notification while Clarity is open in a tab. They are not
          push notifications yet, and they will not reach your phone.
        </p>
      </section>

      <section className="mt-8 border-t border-border pt-4">
        {confirmingDelete ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">Delete this note? It does not go to a bin.</p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove.mutate(note.id, { onSuccess: onClose })}
            >
              {remove.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Yes, delete it
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Delete this note
          </Button>
        )}
      </section>
    </article>
  );
}
