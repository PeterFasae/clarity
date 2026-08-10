
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Note, 
  CreateNoteDto, 
  UpdateNoteDto,
  notesService 
} from '../services/notesService';
import { toast } from 'sonner';

interface NotesContextType {
  notes: Note[];
  pinnedNotes: Note[];
  archivedNotes: Note[];
  sharedNotes: Note[];
  selectedNote: Note | null;
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  fetchPinnedNotes: () => Promise<void>;
  fetchArchivedNotes: () => Promise<void>;
  fetchSharedNotes: () => Promise<void>;
  createNote: (noteData: CreateNoteDto) => Promise<Note>;
  updateNote: (id: string, noteData: UpdateNoteDto) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  summarizeNote: (content: string) => Promise<string>;
  selectNote: (note: Note | null) => void;
  getAllTags: () => string[];
  getFilteredNotes: (tag: string) => Note[];
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all notes
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await notesService.getAllNotes();
      setNotes(fetchedNotes);
      setError(null);
    } catch (error) {
      setError('Failed to fetch notes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pinned notes
  const fetchPinnedNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await notesService.getPinnedNotes();
      setPinnedNotes(fetchedNotes);
      setError(null);
    } catch (error) {
      setError('Failed to fetch pinned notes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch archived notes
  const fetchArchivedNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await notesService.getArchivedNotes();
      setArchivedNotes(fetchedNotes);
      setError(null);
    } catch (error) {
      setError('Failed to fetch archived notes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch shared notes
  const fetchSharedNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await notesService.getSharedNotes();
      setSharedNotes(fetchedNotes);
      setError(null);
    } catch (error) {
      setError('Failed to fetch shared notes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new note
  const createNote = async (noteData: CreateNoteDto) => {
    setLoading(true);
    try {
      const newNote = await notesService.createNote(noteData);
      setNotes(prevNotes => [...prevNotes, newNote]);
      toast.success('Note created successfully');
      return newNote;
    } catch (error) {
      const errorMessage = 'Failed to create note';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing note
  const updateNote = async (id: string, noteData: UpdateNoteDto) => {
    setLoading(true);
    try {
      const updatedNote = await notesService.updateNote(id, noteData);
      
      // Update the note in the appropriate lists
      setNotes(prevNotes => 
        prevNotes.map(note => note.id === id ? updatedNote : note)
      );
      
      if (updatedNote.isPinned) {
        setPinnedNotes(prev => {
          // Remove the note if it exists
          const filtered = prev.filter(note => note.id !== id);
          // Add the updated note
          return [...filtered, updatedNote];
        });
      } else {
        // Remove from pinned if unpinned
        setPinnedNotes(prev => prev.filter(note => note.id !== id));
      }
      
      if (updatedNote.isArchived) {
        setArchivedNotes(prev => {
          // Remove the note if it exists
          const filtered = prev.filter(note => note.id !== id);
          // Add the updated note
          return [...filtered, updatedNote];
        });
      } else {
        // Remove from archived if unarchived
        setArchivedNotes(prev => prev.filter(note => note.id !== id));
      }
      
      if (updatedNote.isShared) {
        setSharedNotes(prev => {
          // Remove the note if it exists
          const filtered = prev.filter(note => note.id !== id);
          // Add the updated note
          return [...filtered, updatedNote];
        });
      } else {
        // Remove from shared if unshared
        setSharedNotes(prev => prev.filter(note => note.id !== id));
      }
      
      // If the selected note is the one being updated, update it
      if (selectedNote && selectedNote.id === id) {
        setSelectedNote(updatedNote);
      }
      
      toast.success('Note updated successfully');
      return updatedNote;
    } catch (error) {
      const errorMessage = 'Failed to update note';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete a note
  const deleteNote = async (id: string) => {
    setLoading(true);
    try {
      await notesService.deleteNote(id);
      
      // Remove the note from all lists
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      setPinnedNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      setArchivedNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      setSharedNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      
      // If the selected note is the one being deleted, clear it
      if (selectedNote && selectedNote.id === id) {
        setSelectedNote(null);
      }
      
      toast.success('Note deleted successfully');
    } catch (error) {
      const errorMessage = 'Failed to delete note';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Summarize note content
  const summarizeNote = async (content: string) => {
    setLoading(true);
    try {
      const summary = await notesService.summarizeNote(content);
      return summary;
    } catch (error) {
      const errorMessage = 'Failed to summarize note';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Select a note for viewing or editing
  const selectNote = (note: Note | null) => {
    setSelectedNote(note);
  };

  // Get all unique tags from notes
  const getAllTags = () => {
    const allTags = notes.reduce((tags: string[], note) => {
      return [...tags, ...(note.tags || [])];
    }, []);
    
    // Return unique tags
    return [...new Set(allTags)];
  };

  // Filter notes by tag
  const getFilteredNotes = (tag: string) => {
    return notes.filter(note => note.tags && note.tags.includes(tag));
  };

  // Initialize data when the component mounts
  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <NotesContext.Provider
      value={{
        notes,
        pinnedNotes,
        archivedNotes,
        sharedNotes,
        selectedNote,
        loading,
        error,
        fetchNotes,
        fetchPinnedNotes,
        fetchArchivedNotes,
        fetchSharedNotes,
        createNote,
        updateNote,
        deleteNote,
        summarizeNote,
        selectNote,
        getAllTags,
        getFilteredNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

// Custom hook to use the Notes context
export const useNotes = () => {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
