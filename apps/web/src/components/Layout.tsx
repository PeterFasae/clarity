
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useNotes } from '../contexts/NotesContext';
import { useIsMobile } from '../hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
  onNewNote: () => void;
  onSelectView: (view: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged') => void;
  activeView: 'all' | 'pinned' | 'archived' | 'shared' | 'tagged';
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onNewNote, 
  onSelectView, 
  activeView 
}) => {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - hidden by default on mobile unless toggled */}
      {(!isMobile || mobileSidebarOpen) && (
        <Sidebar
          onNewNote={onNewNote}
          onSelectView={(view) => {
            onSelectView(view);
            if (isMobile) setMobileSidebarOpen(false);
          }}
          activeView={activeView}
          isCollapsed={!isMobile && sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          className={isMobile ? "fixed z-50 shadow-lg" : ""}
        />
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header with menu button */}
        {isMobile && (
          <div className="p-4 border-b flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="ml-4 text-xl font-bold text-lavender-ink">Clarity</div>
          </div>
        )}
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      
      {/* Overlay to close sidebar on mobile when clicked outside */}
      {isMobile && mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40" 
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default Layout;
