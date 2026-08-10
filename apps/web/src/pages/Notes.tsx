
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Note } from '../services/notesService';
import { useNotes as useNotesContext } from '../contexts/NotesContext';
import Layout from '../components/Layout';
import NotesList from '../components/NotesList';
import NoteEditor from '../components/NoteEditor';
import useNotesFilters from '../hooks/useNotes';

const Notes: React.FC = () => {
  const { 
    fetchNotes, 
    fetchPinnedNotes, 
    fetchArchivedNotes, 
    fetchSharedNotes 
  } = useNotesContext();
  
  const {
    view,
    setView,
    setActiveTag
  } = useNotesFilters();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchNotes(),
          fetchPinnedNotes(),
          fetchArchivedNotes(),
          fetchSharedNotes()
        ]);
      } catch (error) {
        console.error('Error loading notes data', error);
        toast.error('Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchNotes, fetchPinnedNotes, fetchArchivedNotes, fetchSharedNotes]);

  // Handle creating a new note
  const handleNewNote = () => {
    setSelectedNote(undefined);
    setIsEditorOpen(true);
  };

  // Handle editing an existing note
  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  // Handle selecting a view in the sidebar
  const handleSelectView = (newView: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged') => {
    setView(newView);
    
    // Reset tag selection if not tagged view
    if (newView !== 'tagged') {
      setActiveTag(null);
    }
  };

  return (
    <Layout 
      onNewNote={handleNewNote}
      onSelectView={handleSelectView}
      activeView={view}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lavender-ink mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your notes...</p>
          </div>
        </div>
      ) : (
        <NotesList 
          onNewNote={handleNewNote}
          onEditNote={handleEditNote}
        />
      )}

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl h-[90vh] p-0">
          <NoteEditor 
            note={selectedNote}
            onClose={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Notes;
