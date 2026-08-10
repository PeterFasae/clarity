import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ListChecks, Menu, NotebookPen, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReminders } from '@/hooks/useReminders';

/**
 * The frame: a skip link, three places to be, and the page.
 *
 * Three, and not more. Every extra destination is another decision on the way
 * to writing something down, and the whole argument of this product is that
 * those decisions are what costs people their notes.
 */

const PLACES = [
  { to: '/', label: 'Notes', icon: NotebookPen },
  { to: '/actions', label: 'Things to do', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useReminders(true);

  const showNav = !isMobile || menuOpen;

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        Skip to the page
      </a>

      <div className="flex items-center gap-3 border-b border-border p-3 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="app-nav"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <span className="text-xl font-bold text-primary">Clarity</span>
      </div>

      {showNav && (
        <nav
          id="app-nav"
          aria-label="Clarity"
          className="shrink-0 border-b border-border bg-sidebar p-3 md:w-56 md:border-b-0 md:border-r"
        >
          <span className="mb-6 hidden px-2 text-xl font-bold text-primary md:block">Clarity</span>

          <ul className="flex gap-1 md:flex-col">
            {PLACES.map(({ to, label, icon: Icon }) => (
              <li key={to} className="flex-1 md:flex-none">
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 font-bold ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
