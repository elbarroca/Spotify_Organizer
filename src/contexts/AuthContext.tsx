import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: import.meta.env.VITE_REDIRECT_URI
});

interface SpotifyUser {
  id: string;
  display_name: string | null;
  images: { url: string }[];
}

interface User {
  id: string;
  display_name: string;
  images: { url: string }[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  spotifyApi: SpotifyWebApi;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const SPOTIFY_SCOPES = [
  'ugc-image-upload',
  'user-read-playback-state',
  'user-modify-playback-state', 
  'user-read-currently-playing',
  'app-remote-control',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-follow-modify',
  'user-follow-read',
  'user-read-playback-position',
  'user-top-read',
  'user-read-recently-played',
  'user-library-modify',
  'user-library-read',
  'user-read-email',
  'user-read-private'
].join(' ');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(() => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = `${window.location.origin}/callback`;
    
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}`;
    
    window.location.href = authUrl;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_auth_state');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    spotifyApi.setAccessToken('');
    window.location.href = '/';
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('spotify_access_token');
      
      if (!storedToken) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      spotifyApi.setAccessToken(storedToken);
      setToken(storedToken);

      const response = await spotifyApi.getMe();
      const spotifyUser = response.body as SpotifyUser;
      
      const userData: User = {
        id: spotifyUser.id,
        display_name: spotifyUser.display_name || 'User',
        images: spotifyUser.images
      };
      
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('spotify_access_token');
      setToken(null);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(() => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = `${window.location.origin}/callback`;
    const state = Math.random().toString(36).substring(7);
    
    localStorage.setItem('spotify_auth_state', state);
    localStorage.setItem('spotify_auth_redirect', window.location.pathname);
    
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}`;
    
    window.location.href = authUrl;
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    isAuthenticated,
    loading,
    user,
    token,
    login,
    logout,
    checkAuth,
    spotifyApi,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};