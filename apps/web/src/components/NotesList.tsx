
import React, { useState } from 'react';
import NoteCard from './NoteCard';
import { Note } from '../services/notesService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, SortAsc, SortDesc, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import useNotesFilters from '../hooks/useNotes';
import { useNotes as useNotesContext } from '../contexts/NotesContext';

interface NotesListProps {
  onNewNote: () => void;
  onEditNote: (note: Note) => void;
}

const NotesList: React.FC<NotesListProps> = ({ onNewNote, onEditNote }) => {
  const {
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
    resetFilters,
  } = useNotesFilters();

  const { getAllTags } = useNotesContext();
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);

  // All unique tags in notes
  const allTags = getAllTags();

  // Helper function to get view title
  const getViewTitle = () => {
    switch (view) {
      case 'all': return 'All Notes';
      case 'pinned': return 'Pinned Notes';
      case 'archived': return 'Archived Notes';
      case 'shared': return 'Shared Notes';
      case 'tagged': return `Tagged Notes: ${activeTag}`;
      default: return 'Notes';
    }
  };

  // Toggle the sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Select a tag to filter by
  const handleSelectTag = (tag: string) => {
    setActiveTag(tag);
    setView('tagged');
    setIsTagMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{getViewTitle()}</h2>
          <Button 
            onClick={onNewNote}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select 
            value={view}
            onValueChange={(value: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged') => {
              setView(value);
              if (value !== 'tagged') {
                setActiveTag(null);
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              <SelectItem value="pinned">Pinned</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>

            <Select 
              value={sortBy}
              onValueChange={(value: 'updatedAt' | 'createdAt' | 'title') => setSortBy(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tag filter section */}
        <div className="flex items-center mt-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
          >
            <Tag className="h-3 w-3" />
            Filter by Tag
          </Button>

          {activeTag && (
            <div className="flex items-center bg-softblue text-xs px-2 py-1 rounded-full">
              <span>{activeTag}</span>
              <button
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setActiveTag(null);
                  setView('all');
                }}
                aria-label="Clear tag filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {(activeTag || searchTerm || view !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Tag menu */}
        {isTagMenuOpen && allTags.length > 0 && (
          <div className="mt-2 p-2 border rounded-md bg-background">
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectTag(tag)}
                  className="h-6 text-xs"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No notes found</p>
            <Button 
              variant="link" 
              onClick={onNewNote}
              className="mt-2"
            >
              Create a new note
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onEdit={() => onEditNote(note)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesList;
