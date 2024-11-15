import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CriteriaSelection from './pages/CriteriaSelection';
import PlaylistCreation from './pages/PlaylistCreation';
import Review from './pages/Review';
import { AuthCallback } from './components/auth/AuthCallback';
import Discover from './pages/Discover';
import UserPlaylists from './pages/UserPlaylists';
import Organize from './pages/Organize';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, login } = useAuth();
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('spotify_access_token');
        if (!token) {
          throw new Error('No token');
        }

        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Token invalid');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('spotify_access_token');
        login(); // Re-authenticate
      } finally {
        setCheckingToken(false);
      }
    };

    verifyToken();
  }, [login]);

  if (loading || checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/criteria"
        element={
          <PrivateRoute>
            <CriteriaSelection />
          </PrivateRoute>
        }
      />
      <Route
        path="/create"
        element={
          <PrivateRoute>
            <PlaylistCreation />
          </PrivateRoute>
        }
      />
      <Route
        path="/review"
        element={
          <PrivateRoute>
            <Review />
          </PrivateRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <PrivateRoute>
            <Discover />
          </PrivateRoute>
        }
      />
      <Route
        path="/playlists"
        element={
          <PrivateRoute>
            <UserPlaylists />
          </PrivateRoute>
        }
      />
      <Route
        path="/organize"
        element={
          <PrivateRoute>
            <Organize />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;