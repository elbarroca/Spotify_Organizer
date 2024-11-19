import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: import.meta.env.VITE_REDIRECT_URI
});

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
  'user-read-private',
  'user-read-email',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-top-read',
  'user-read-recently-played',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(() => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('spotify_auth_state', state);
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    const params = {
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      response_type: 'token',
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      state,
      scope: SPOTIFY_SCOPES,
      show_dialog: 'true'
    };
    
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
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
      setUser(response.body);
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
    spotifyApi
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};