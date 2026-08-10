
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pin, Archive, Share, Trash2, Tag, Edit } from 'lucide-react';
import { Note } from '../services/notesService';
import { toast } from 'sonner';
import { useNotes } from '../contexts/NotesContext';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  compact?: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, compact = false }) => {
  const { updateNote, deleteNote } = useNotes();

  // Calculate the time since the note was updated
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };
  
  // Truncate text to a specific length
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Toggle pinned status
  const togglePin = async () => {
    try {
      await updateNote(note.id, { isPinned: !note.isPinned });
      toast.success(note.isPinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      console.error('Error toggling pin status', error);
    }
  };

  // Toggle archived status
  const toggleArchive = async () => {
    try {
      await updateNote(note.id, { isArchived: !note.isArchived });
      toast.success(note.isArchived ? 'Note unarchived' : 'Note archived');
    } catch (error) {
      console.error('Error toggling archive status', error);
    }
  };

  // Toggle shared status
  const toggleShare = async () => {
    try {
      await updateNote(note.id, { isShared: !note.isShared });
      toast.success(note.isShared ? 'Note unshared' : 'Note shared');
    } catch (error) {
      console.error('Error toggling share status', error);
    }
  };

  // Delete the note
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      try {
        await deleteNote(note.id);
        toast.success('Note deleted');
      } catch (error) {
        console.error('Error deleting note', error);
      }
    }
  };

  return (
    <Card className={`group transition-all ${note.isPinned ? 'border-lavender-ink' : ''} ${compact ? 'h-[180px]' : ''}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium truncate">
            {note.title || 'Untitled Note'}
          </CardTitle>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${note.isPinned ? 'text-lavender-ink' : 'text-muted-foreground'}`}
            onClick={togglePin}
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {getTimeAgo(note.updatedAt)}
        </div>
      </CardHeader>
      
      <CardContent 
        className={`p-4 pt-2 ${compact ? 'max-h-[70px] overflow-hidden' : ''}`}
      >
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {truncateText(note.content, compact ? 100 : 300)}
        </p>
        
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map(tag => (
              <div 
                key={tag} 
                className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-softblue"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-2 flex justify-between border-t">
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(note)}
            aria-label="Edit note"
            title="Edit note"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${note.isArchived ? 'text-lavender-ink' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={toggleArchive}
            aria-label={note.isArchived ? 'Unarchive note' : 'Archive note'}
            title={note.isArchived ? 'Unarchive note' : 'Archive note'}
          >
            <Archive className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${note.isShared ? 'text-lavender-ink' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={toggleShare}
            aria-label={note.isShared ? 'Unshare note' : 'Share note'}
            title={note.isShared ? 'Unshare note' : 'Share note'}
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          aria-label="Delete note"
          title="Delete note"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NoteCard;
