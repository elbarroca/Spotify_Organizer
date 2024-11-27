import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-node';

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  const isProd = window.location.hostname === 'spotify-organizer.vercel.app';
  return isProd 
    ? 'https://spotify-organizer.vercel.app/callback'
    : 'http://localhost:5173/callback';
};

const spotifyApi = new SpotifyWebApi({
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: getRedirectUri()
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
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [tokenExpirationTime, setTokenExpirationTime] = useState<number | null>(null);

  const handleApiError = useCallback((error: any) => {
    console.error('Spotify API Error:', error);
    const errorMessage = error.response?.body?.error?.message || error.message || 'Unknown error';
    
    if (error.statusCode === 401) {
      setError('Session expired. Please log in again.');
      logout();
    } else if (error.statusCode === 403) {
      if (errorMessage.includes('not authorized')) {
        setError('Your account is not authorized to use this app. Please contact the app administrator.');
      } else {
        setError('Access denied. Please try logging in again.');
        refreshAuth();
      }
    } else {
      setError(`An error occurred: ${errorMessage}`);
    }
  }, []);

  const login = useCallback(() => {
    try {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      if (!clientId) {
        throw new Error('Spotify Client ID is not configured');
      }

      const redirectUri = getRedirectUri();
      const state = Math.random().toString(36).substring(7);
      
      // Store the current environment's redirect URI
      localStorage.setItem('spotify_redirect_uri', redirectUri);
      localStorage.setItem('spotify_auth_state', state);
      localStorage.setItem('spotify_auth_redirect', window.location.pathname);
      
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}&show_dialog=true`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      handleApiError(error);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_auth_state');
    localStorage.removeItem('token_expiration_time');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setTokenExpirationTime(null);
    setError(null);
    spotifyApi.setAccessToken('');
    window.location.href = '/';
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setError(null);
      const storedToken = localStorage.getItem('spotify_access_token');
      const expirationTime = Number(localStorage.getItem('token_expiration_time'));
      
      if (!storedToken || (expirationTime && Date.now() >= expirationTime)) {
        setIsAuthenticated(false);
        setLoading(false);
        if (storedToken) {
          refreshAuth();
        }
        return;
      }

      spotifyApi.setAccessToken(storedToken);
      setToken(storedToken);

      const response = await spotifyApi.getMe().catch((error) => {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error;
        }
        return null;
      });

      if (!response) {
        throw new Error('Failed to fetch user data');
      }

      const spotifyUser = response.body as SpotifyUser;
      
      const userData: User = {
        id: spotifyUser.id,
        display_name: spotifyUser.display_name || 'User',
        images: spotifyUser.images
      };
      
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  const refreshAuth = useCallback(() => {
    try {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      if (!clientId) {
        throw new Error('Spotify Client ID is not configured');
      }

      const redirectUri = getRedirectUri();
      const state = Math.random().toString(36).substring(7);
      
      localStorage.setItem('spotify_redirect_uri', redirectUri);
      localStorage.setItem('spotify_auth_state', state);
      localStorage.setItem('spotify_auth_redirect', window.location.pathname);
      
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}&show_dialog=true`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      handleApiError(error);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      
      if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
        if (expiresIn) {
          const expirationTime = Date.now() + Number(expiresIn) * 1000;
          localStorage.setItem('token_expiration_time', expirationTime.toString());
          setTokenExpirationTime(expirationTime);
        }
        window.location.hash = '';
      }
    }
    checkAuth();
  }, [checkAuth]);

  // Set up token refresh timer
  useEffect(() => {
    if (tokenExpirationTime) {
      const timeUntilExpiration = tokenExpirationTime - Date.now();
      if (timeUntilExpiration > 0) {
        const refreshTimer = setTimeout(() => {
          refreshAuth();
        }, timeUntilExpiration - 60000); // Refresh 1 minute before expiration
        return () => clearTimeout(refreshTimer);
      }
    }
  }, [tokenExpirationTime, refreshAuth]);

  const value = {
    isAuthenticated,
    loading,
    user,
    token,
    login,
    logout,
    checkAuth,
    spotifyApi,
    refreshAuth,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};