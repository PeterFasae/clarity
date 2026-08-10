
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNotes } from '../contexts/NotesContext';
import { 
  LayoutDashboard, 
  Pin, 
  Archive, 
  Share2, 
  Tag, 
  Settings, 
  Info, 
  HelpCircle, 
  Menu,
  PenSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface SidebarProps {
  onNewNote: () => void;
  onSelectView: (view: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged') => void;
  activeView: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  onNewNote,
  onSelectView,
  activeView,
  isCollapsed,
  onToggleCollapse,
  className = ""
}) => {
  const { notes, pinnedNotes, archivedNotes, sharedNotes, getAllTags } = useNotes();
  const tags = getAllTags();

  const handleSettings = () => {
    toast.info("Settings feature coming soon!");
  };

  const handleHelp = () => {
    toast.info("Help center coming soon!");
  };

  const handleAbout = () => {
    toast.info("Clarity: A note-taking app designed for neurodiverse users");
  };

  return (
    <div className={`bg-sidebar min-h-screen flex flex-col ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="text-xl font-bold text-lavender-ink">Clarity</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-sidebar-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-2">
        <Button 
          variant="default" 
          className={`w-full justify-start gap-2 bg-lavender-ink hover:bg-lavender-dark ${isCollapsed ? 'px-2' : ''}`}
          onClick={onNewNote}
        >
          <PenSquare className="h-5 w-5" />
          {!isCollapsed && <span>New Note</span>}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <Button
          variant={activeView === 'all' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
          onClick={() => onSelectView('all')}
        >
          <LayoutDashboard className="h-5 w-5" />
          {!isCollapsed && (
            <span className="flex-1 text-left">All Notes <span className="text-xs ml-1">({notes.length})</span></span>
          )}
        </Button>

        <Button
          variant={activeView === 'pinned' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
          onClick={() => onSelectView('pinned')}
        >
          <Pin className="h-5 w-5" />
          {!isCollapsed && (
            <span className="flex-1 text-left">Pinned <span className="text-xs ml-1">({pinnedNotes.length})</span></span>
          )}
        </Button>

        <Button
          variant={activeView === 'archived' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
          onClick={() => onSelectView('archived')}
        >
          <Archive className="h-5 w-5" />
          {!isCollapsed && (
            <span className="flex-1 text-left">Archived <span className="text-xs ml-1">({archivedNotes.length})</span></span>
          )}
        </Button>

        <Button
          variant={activeView === 'shared' ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
          onClick={() => onSelectView('shared')}
        >
          <Share2 className="h-5 w-5" />
          {!isCollapsed && (
            <span className="flex-1 text-left">Shared <span className="text-xs ml-1">({sharedNotes.length})</span></span>
          )}
        </Button>

        {!isCollapsed && tags.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="text-xs uppercase text-muted-foreground px-2 py-1">Tags</div>
            <div className="max-h-40 overflow-y-auto">
              {tags.slice(0, 8).map(tag => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start mb-1 px-2 text-sm gap-2"
                  onClick={() => {
                    onSelectView('tagged');
                    // We need to pass the tag information separately as it's not part of the view type
                    // This would be handled in your parent component
                  }}
                >
                  <Tag className="h-3 w-3" />
                  <span className="truncate">{tag}</span>
                </Button>
              ))}
              {tags.length > 8 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                >
                  + {tags.length - 8} more tags
                </Button>
              )}
            </div>
          </>
        )}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
            onClick={handleSettings}
          >
            <Settings className="h-5 w-5" />
            {!isCollapsed && <span>Settings</span>}
          </Button>
          
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
            onClick={handleHelp}
          >
            <HelpCircle className="h-5 w-5" />
            {!isCollapsed && <span>Help</span>}
          </Button>
          
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${isCollapsed ? 'px-2' : ''}`}
            onClick={handleAbout}
          >
            <Info className="h-5 w-5" />
            {!isCollapsed && <span>About</span>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
