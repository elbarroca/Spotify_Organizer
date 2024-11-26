import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import CriteriaSelection from './pages/Create';
import PlaylistCreation from './pages/PlaylistCreation';
import { AuthCallback } from './components/auth/AuthCallback';
import Discover from './pages/Discover';
import UserPlaylists from './pages/UserPlaylists';
import Organize from './pages/Organize';
import { Sidebar } from './components/Sidebar';
import Landing from './pages/Landing';
import { Toaster } from 'sonner';
import Profile from "@/pages/Profile"
import FindAlikes from './pages/FindAlikes';

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
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

const router = createBrowserRouter([
  {
    path: "/callback",
    element: <AuthCallback />
  },
  {
    path: "/",
    element: <AuthWrapper><Landing /></AuthWrapper>
  },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <Layout>
          <Dashboard />
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
]);

// Wrapper component to handle auth state for landing page
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;