import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import CriteriaSelection from './pages/CriteriaSelection';
import PlaylistCreation from './pages/PlaylistCreation';
import { AuthCallback } from './components/auth/AuthCallback';
import Discover from './pages/Discover';
import UserPlaylists from './pages/UserPlaylists';
import Organize from './pages/Organize';
import { Sidebar } from './components/Sidebar';
import Landing from './pages/Landing';
import { Toaster } from 'sonner';

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

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/callback" element={<AuthCallback />} />
      
      {/* Public routes */}
      <Route 
        path="/" 
        element={isAuthenticated ? (
          <Layout>
            <Dashboard />
          </Layout>
        ) : (
          <Landing />
        )} 
      />

      {/* Protected routes */}
      <Route
        path="/criteria"
        element={
          <PrivateRoute>
            <Layout>
              <CriteriaSelection />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/create"
        element={
          <PrivateRoute>
            <Layout>
              <PlaylistCreation />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <PrivateRoute>
            <Layout>
              <Discover />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/playlists"
        element={
          <PrivateRoute>
            <Layout>
              <UserPlaylists />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/organize"
        element={
          <PrivateRoute>
            <Layout>
              <Organize />
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default App;