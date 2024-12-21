import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Client, Account, Databases, Query } from 'appwrite';
import { appwriteConfig } from '@/config/appwrite';
import { getSpotifyAuthUrl, secureStorage } from '@/lib/auth/spotify';
import { toast } from 'sonner';
import { SpotifyUser } from '@/types/database';

// Constants for storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRES_AT: 'spotify_token_expires_at',
  USER_ID: 'spotify_user_id',
  AUTH_STATE: 'spotify_auth_state',
  USER_DATA: 'spotify_user_data',
  LAST_FETCH: 'spotify_last_fetch'
} as const;

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Check interval for token refresh (5 minutes)
const CHECK_INTERVAL = 5 * 60 * 1000;

// Minimum time between token refreshes (1 minute)
const MIN_REFRESH_INTERVAL = 60 * 1000;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SpotifyUser | null;
  token: string | null;
  refreshAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSpotifyToken: () => Promise<string | null>;
  spotifyApi: {
    get: (endpoint: string) => Promise<any>;
    post: (endpoint: string, body?: any) => Promise<any>;
    put: (endpoint: string, body?: any) => Promise<any>;
    delete: (endpoint: string) => Promise<any>;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SpotifyUser | null>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => 
    secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  );
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);
  const requestQueueRef = useRef<Map<string, Promise<any>>>(new Map());

  const client = useMemo(() => 
    new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId),
    []
  );

  const account = useMemo(() => new Account(client), [client]);
  const databases = useMemo(() => new Databases(client), [client]);

  const clearTokens = useCallback(() => {
    secureStorage.clearAll();
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }, []);

  const updateTokens = useCallback((accessToken: string | null, refreshToken: string | null, expiresIn: number) => {
    if (!accessToken || !refreshToken) {
      clearTokens();
      return;
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    secureStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
    setToken(accessToken);
  }, [clearTokens]);

  // Enhanced token refresh logic with rate limiting
  const refreshSpotifyToken = useCallback(async () => {
    // Check if we've refreshed recently
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL) {
      console.log('Token refresh attempted too soon, skipping');
      return token;
    }

    if (isRefreshingRef.current) {
      const existingRefresh = requestQueueRef.current.get('token_refresh');
      if (existingRefresh) return existingRefresh;
    }

    const refreshToken = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;

    const refreshPromise = (async () => {
      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${appwriteConfig.spotifyClientId}:${appwriteConfig.spotifyClientSecret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        updateTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in);
        return data.access_token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        clearTokens();
        setUser(null);
        setToken(null);
        throw error;
      } finally {
        isRefreshingRef.current = false;
        requestQueueRef.current.delete('token_refresh');
      }
    })();

    requestQueueRef.current.set('token_refresh', refreshPromise);
    return refreshPromise;
  }, [token, clearTokens, updateTokens]);

  // Move checkAuth declaration before its usage
  const checkAuth = useCallback(async (force = false) => {
    try {
      const storedToken = secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiresAt = secureStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
      const now = new Date().getTime();
      
      if (storedToken && expiresAt && new Date(expiresAt).getTime() > now && !force) {
        setToken(storedToken);
        if (!user) {
          const cachedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
            setIsLoading(false);
            return;
          }
        }
        return;
      }

      if (secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)) {
        const newToken = await refreshSpotifyToken();
        if (newToken) return;
      }

      clearTokens();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Auth check failed:', error);
      clearTokens();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshSpotifyToken, clearTokens]);

  // Enhanced initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const currentToken = secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        if (currentToken) {
          // Verify token and fetch user data
          await checkAuth();
        } else {
          // No token found, try refreshing if refresh token exists
          const refreshToken = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          if (refreshToken) {
            const newToken = await refreshSpotifyToken();
            if (newToken) {
              await checkAuth(true);
            } else {
              throw new Error('Failed to refresh token');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearTokens();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuth, refreshSpotifyToken, clearTokens]);

  // Spotify API wrapper with request deduplication and caching
  const spotifyApi = useMemo(() => {
    const baseUrl = 'https://api.spotify.com/v1';
    
    const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
      try {
        const token = await refreshSpotifyToken();
        if (!token) {
          throw new Error('No valid token available');
        }

        // Ensure endpoint starts with a forward slash if not present
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const response = await fetch(`https://api.spotify.com/v1${normalizedEndpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        // Handle different response statuses
        if (response.status === 204) {
          return null;
        }

        if (response.status === 404) {
          console.error(`Endpoint not found: ${normalizedEndpoint}`);
          throw new Error(`API endpoint not found: ${normalizedEndpoint}`);
        }

        if (response.status === 401) {
          // Token expired, try to refresh
          const newToken = await refreshSpotifyToken();
          if (!newToken) {
            throw new Error('Failed to refresh token');
          }

          // Retry with new token
          const retryResponse = await fetch(`https://api.spotify.com/v1${normalizedEndpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
              ...options.headers
            }
          });

          if (!retryResponse.ok) {
            const error = await retryResponse.json();
            throw new Error(error.error?.message || `HTTP error! status: ${retryResponse.status}`);
          }

          return retryResponse.json();
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        console.error('API call error:', error);
        throw error;
      }
    };

    const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
      try {
        return await makeApiCall(endpoint, options);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Failed to refresh token') || 
              error.message.includes('No valid token available')) {
            // Clear auth state and redirect to login
            clearTokens();
            setUser(null);
            setToken(null);
            toast.error('Session expired. Please log in again.');
            window.location.href = '/';
            return null;
          }
        }
        throw error;
      }
    };

    return {
      get: (endpoint: string) => makeRequest(endpoint),
      post: (endpoint: string, body?: any) => makeRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
      put: (endpoint: string, body?: any) => makeRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (endpoint: string) => makeRequest(endpoint, { method: 'DELETE' })
    };
  }, []);

  const login = useCallback(async () => {
    try {
      console.log('Initiating Spotify login...');
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Logging out...');
      await account.deleteSession('current');
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      clearTokens();
      setUser(null);
      setToken(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed. Please try again.');
    }
  }, [account, clearTokens]);

  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    checkAuth(true);
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    }, CHECK_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [checkAuth]);

  const value = useMemo(() => ({
    isAuthenticated: !!user && !!token,
    isLoading,
    user,
    token,
    refreshAuth: checkAuth,
    login,
    logout,
    refreshSpotifyToken,
    spotifyApi
  }), [isLoading, user, token, checkAuth, login, logout, refreshSpotifyToken, spotifyApi]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 