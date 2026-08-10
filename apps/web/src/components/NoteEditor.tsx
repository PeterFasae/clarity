
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Sparkles } from 'lucide-react';
import { Note, CreateNoteDto, UpdateNoteDto } from '../services/notesService';
import { useNotes } from '../contexts/NotesContext';
import TagsManager from './TagsManager';
import SpeechToText from './SpeechToText';
import { toast } from 'sonner';

interface NoteEditorProps {
  note?: Note;
  onClose: () => void;
  afterSave?: (note: Note) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onClose, afterSave }) => {
  const { createNote, updateNote, summarizeNote } = useNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSpeechToTextVisible, setIsSpeechToTextVisible] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load note data when editing an existing note
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags || []);
    } else {
      // Default values for new note
      setTitle('');
      setContent('');
      setTags([]);
    }
  }, [note]);

  // Handle saving the note
  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      toast.error('Note must have a title or content');
      return;
    }

    setIsSaving(true);
    try {
      if (note) {
        // Update existing note
        const updateData: UpdateNoteDto = {
          title: title.trim() || 'Untitled Note',
          content,
          tags
        };
        
        const updatedNote = await updateNote(note.id, updateData);
        toast.success('Note updated successfully');
        
        if (afterSave) {
          afterSave(updatedNote);
        }
      } else {
        // Create new note
        const newNoteData: CreateNoteDto = {
          title: title.trim() || 'Untitled Note',
          content,
          tags
        };
        
        const newNote = await createNote(newNoteData);
        toast.success('Note created successfully');
        
        if (afterSave) {
          afterSave(newNote);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving note', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle generating a summary of the note content
  const handleSummarize = async () => {
    if (content.trim().length < 50) {
      toast.info('Please add more content to summarize (at least 50 characters)');
      return;
    }

    setIsSummarizing(true);
    try {
      const summary = await summarizeNote(content);
      setContent(summary);
      toast.success('Content summarized successfully');
    } catch (error) {
      console.error('Error summarizing content', error);
      toast.error('Failed to summarize content');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle speech to text transcript
  const handleTranscriptReady = (transcript: string) => {
    if (content) {
      setContent(prevContent => prevContent + '\n\n' + transcript);
    } else {
      setContent(transcript);
    }
    setIsSpeechToTextVisible(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-xl font-semibold">
          {note ? 'Edit Note' : 'Create Note'}
        </h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          aria-label="Close editor"
        >
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Input
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-medium"
        />

        <Textarea
          placeholder="Write your note here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] text-base dyslexic-text"
          rows={10}
        />

        <TagsManager
          selectedTags={tags}
          onChange={setTags}
        />

        {isSpeechToTextVisible && (
          <SpeechToText 
            onTranscriptReady={handleTranscriptReady}
          />
        )}
      </div>

      <div className="border-t p-4 flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSpeechToTextVisible(!isSpeechToTextVisible)}
            aria-label={isSpeechToTextVisible ? "Hide speech to text" : "Show speech to text"}
          >
            {isSpeechToTextVisible ? "Hide Speech Input" : "Use Speech Input"}
          </Button>

          <Button
            variant="outline"
            onClick={handleSummarize}
            disabled={content.length < 50 || isSummarizing}
            className="gap-2"
            aria-label="Summarize content"
          >
            <Sparkles className="h-4 w-4" />
            {isSummarizing ? "Summarizing..." : "Summarize"}
          </Button>
        </div>

        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Note"}
        </Button>
      </div>
    </div>
  );
};

export default NoteEditor;
