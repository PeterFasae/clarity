
import { useNotes as useNotesContext } from '../contexts/NotesContext';
import { useState } from 'react';
import { Note } from '../services/notesService';

export interface UseNotesHook {
  view: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged';
  searchTerm: string;
  activeTag: string | null;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
  filteredNotes: Note[];
  setView: (view: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged') => void;
  setSearchTerm: (term: string) => void;
  setActiveTag: (tag: string | null) => void;
  setSortBy: (field: 'updatedAt' | 'createdAt' | 'title') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  resetFilters: () => void;
}

const useNotesFilters = (): UseNotesHook => {
  const notesContext = useNotesContext();
  const [view, setView] = useState<'all' | 'pinned' | 'archived' | 'shared' | 'tagged'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get the appropriate notes based on current view
  const getViewNotes = (): Note[] => {
    switch (view) {
      case 'pinned':
        return notesContext.pinnedNotes;
      case 'archived':
        return notesContext.archivedNotes;
      case 'shared':
        return notesContext.sharedNotes;
      case 'tagged':
        return activeTag ? notesContext.getFilteredNotes(activeTag) : [];
      case 'all':
      default:
        return notesContext.notes;
    }
  };

  // Apply search filter
  const applySearchFilter = (notes: Note[]): Note[] => {
    if (!searchTerm) return notes;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(lowerCaseSearch) || 
      note.content.toLowerCase().includes(lowerCaseSearch) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch)))
    );
  };

  // Apply sorting
  const applySorting = (notes: Note[]): Note[] => {
    return [...notes].sort((a, b) => {
      if (sortBy === 'title') {
        const comparison = a.title.localeCompare(b.title);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const dateA = new Date(a[sortBy]).getTime();
        const dateB = new Date(b[sortBy]).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
  };

  // Get filtered and sorted notes
  const filteredNotes = applySorting(applySearchFilter(getViewNotes()));

  // Reset all filters
  const resetFilters = () => {
    setView('all');
    setSearchTerm('');
    setActiveTag(null);
    setSortBy('updatedAt');
    setSortOrder('desc');
  };

  return {
    view,
    searchTerm,
    activeTag,
    sortBy,
    sortOrder,
    filteredNotes,
    setView,
    setSearchTerm,
    setActiveTag,
    setSortBy,
    setSortOrder,
    resetFilters
  };
};

export default useNotesFilters;
