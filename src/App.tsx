import React from 'react';
import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CriteriaSelection from './pages/Create';
import PlaylistCreation from './pages/PlaylistCreation';
import Discover from './pages/Discover';
import UserPlaylists from './components/UserPlaylists';
import Organize from './pages/Organize';
import { Sidebar } from './components/Sidebar';
import Landing from './pages/Landing';
import { Toaster } from 'sonner';
import Profile from './pages/Profile';
import FindAlikes from './pages/FindAlikes';
import Spotify from './pages/Spotify';
import SpotifyCallback from './pages/SpotifyCallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

// Root layout that provides auth context
function RootLayout() {
  return (
    <AuthProvider>
      <main className="min-h-screen bg-black text-white">
        <Outlet />
      </main>
      <Toaster position="top-center" />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/callback",
        element: <SpotifyCallback />,
      },
      {
        path: "/",
        element: <AuthWrapper><Landing /></AuthWrapper>
      },
      {
        path: "/",
        element: <AuthWrapper><Landing error="Authentication failed. Please try again." /></AuthWrapper>
      },
      {
        path: "/dashboard",
        element: (
          <AuthGuard>
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          </AuthGuard>
        )
      },
      {
        path: "/spotify",
        element: (
          <PrivateRoute>
            <Layout>
              <Spotify />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/create",
        element: (
          <PrivateRoute>
            <Layout>
              <CriteriaSelection />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/create",
        element: (
          <PrivateRoute>
            <Layout>
              <PlaylistCreation />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/discover",
        element: (
          <PrivateRoute>
            <Layout>
              <Discover />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/playlists",
        element: (
          <PrivateRoute>
            <Layout>
              <UserPlaylists />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/organize",
        element: (
          <PrivateRoute>
            <Layout>
              <Organize />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/profile",
        element: (
          <PrivateRoute>
            <Layout>
              <Profile />
            </Layout>
          </PrivateRoute>
        )
      },
      {
        path: "/find-alikes",
        element: (
          <PrivateRoute>
            <Layout>
              <FindAlikes />
            </Layout>
          </PrivateRoute>
        )
      }
    ]
  }
]);

// Wrapper component to handle auth state for landing page
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;