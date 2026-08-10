import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/AppShell';
import { FocusModeProvider } from '@/components/FocusMode';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { Actions } from '@/pages/Actions';
import { Notes } from '@/pages/Notes';
import { Settings } from '@/pages/Settings';
import { SignIn } from '@/pages/SignIn';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetching on every window focus is exactly the kind of small
      // unexplained movement this product is meant not to do.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Preferences load before anything is shown, so the first paint is already in
 * the right theme, font and size. Landing in the wrong one and having it
 * change underneath you is a jolt, and jolts are the thing.
 */
function Routed() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground" role="status">
          Just a moment…
        </p>
      </div>
    );
  }

  if (status === 'signed-out') return <SignIn />;

  return (
    <FocusModeProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Notes />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </FocusModeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
            <TooltipProvider>
              <Toaster />
              <Routed />
            </TooltipProvider>
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
