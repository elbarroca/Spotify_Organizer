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
  const requestQueueRef = useRef<Map<string, Promise<any>>>(new Map());

  const client = useMemo(() => 
    new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId),
    []
  );

  const account = useMemo(() => new Account(client), [client]);
  const databases = useMemo(() => new Databases(client), [client]);

  // Spotify API wrapper with request deduplication and caching
  const spotifyApi = useMemo(() => {
    const baseUrl = 'https://api.spotify.com/v1';
    
    const makeRequest = async (
      method: string,
      endpoint: string,
      body?: any,
      forceRefresh = false
    ) => {
      const cacheKey = `${method}:${endpoint}`;
      const now = Date.now();
      const lastFetch = localStorage.getItem(`${STORAGE_KEYS.LAST_FETCH}:${cacheKey}`);
      const cachedData = localStorage.getItem(`cache:${cacheKey}`);

      // Return cached data if valid and not forcing refresh
      if (
        !forceRefresh &&
        lastFetch &&
        cachedData &&
        now - parseInt(lastFetch) < CACHE_DURATION
      ) {
        return JSON.parse(cachedData);
      }

      // Check if there's already a request in progress for this endpoint
      const existingRequest = requestQueueRef.current.get(cacheKey);
      if (existingRequest) {
        return existingRequest;
      }

      const makeApiCall = async (retryCount = 0): Promise<any> => {
        try {
          let currentToken = secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          
          // If no token or token is expired, try to refresh
          if (!currentToken || secureStorage.shouldRefreshToken()) {
            console.log('Token missing or expired, attempting refresh...');
            currentToken = await refreshSpotifyToken();
          }

          if (!currentToken) {
            console.error('No valid token available after refresh attempt');
            throw new Error('No valid token');
          }

          const response = await fetch(`${baseUrl}${endpoint}`, {
            method,
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            },
            ...(body ? { body: JSON.stringify(body) } : {})
          });

          if (!response.ok) {
            if (response.status === 401 && retryCount < 1) {
              console.log('Token expired during request, refreshing...');
              currentToken = await refreshSpotifyToken();
              if (currentToken) {
                return makeApiCall(retryCount + 1);
              }
            }

            if (response.status === 429) {
              const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              return makeApiCall(retryCount);
            }

            throw new Error(`API call failed: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Cache successful GET requests
          if (method === 'GET') {
            localStorage.setItem(`cache:${cacheKey}`, JSON.stringify(data));
            localStorage.setItem(`${STORAGE_KEYS.LAST_FETCH}:${cacheKey}`, now.toString());
          }

          return data;
        } catch (error) {
          console.error('API call error:', error);
          throw error;
        }
      };

      const request = makeApiCall();
      requestQueueRef.current.set(cacheKey, request);

      try {
        return await request;
      } finally {
        requestQueueRef.current.delete(cacheKey);
      }
    };

    return {
      get: (endpoint: string) => makeRequest('GET', endpoint),
      post: (endpoint: string, body?: any) => makeRequest('POST', endpoint, body),
      put: (endpoint: string, body?: any) => makeRequest('PUT', endpoint, body),
      delete: (endpoint: string) => makeRequest('DELETE', endpoint)
    };
  }, []);

  const clearTokens = useCallback(() => {
    secureStorage.clearAll();
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

  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Schedule refresh 5 minutes before expiration
    const refreshDelay = Math.max(0, (expiresIn - 300) * 1000);
    refreshTimeoutRef.current = setTimeout(() => {
      if (secureStorage.shouldRefreshToken()) {
        refreshSpotifyToken();
      }
    }, refreshDelay);
  }, []);

  const refreshSpotifyToken = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('Token refresh already in progress');
      // Wait for the current refresh to complete
      while (isRefreshingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }

    const refreshToken = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      console.log('No refresh token available');
      clearTokens();
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      isRefreshingRef.current = true;
      console.log('Refreshing Spotify token...');

      const credentials = btoa(`${appwriteConfig.spotifyClientId}:${appwriteConfig.spotifyClientSecret}`);
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Token refresh failed:', error);
        throw new Error(error.error_description || 'Failed to refresh token');
      }

      const data = await response.json();
      console.log('Token refresh successful');
      
      // Update tokens
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token || refreshToken;
      const expiresIn = data.expires_in;
      
      updateTokens(
        newAccessToken,
        newRefreshToken,
        expiresIn
      );
      
      // Update the user document if we have one
      if (user?.$id) {
        try {
          const updatedUser = await databases.updateDocument<SpotifyUser>(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            user.$id,
            {
              spotifyAccessToken: newAccessToken,
              spotifyTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
              updatedAt: new Date().toISOString()
            }
          );
          setUser(updatedUser);
        } catch (error) {
          console.error('Failed to update user document:', error);
          // Continue even if user document update fails
        }
      }

      scheduleTokenRefresh(expiresIn);
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      setUser(null);
      setToken(null);
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [user, databases, scheduleTokenRefresh, updateTokens, clearTokens]);

  const checkAuth = useCallback(async (force = false) => {
    try {
      const storedToken = secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiresAt = secureStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
      const now = new Date().getTime();
      
      // Check if token exists and is not expired
      if (storedToken && expiresAt && new Date(expiresAt).getTime() > now && !force) {
        if (!user) {
          const cachedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
            setToken(storedToken);
            setIsLoading(false);
            return;
          }

          // Fetch user data if not cached
          const currentUser = await account.get();
          const userDocs = await databases.listDocuments<SpotifyUser>(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [Query.equal('userId', currentUser.$id)]
          );

          if (userDocs.documents.length > 0) {
            const userData = userDocs.documents[0];
            setUser(userData);
            setToken(storedToken);
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          }
        }
        return;
      }

      // Token is expired or force refresh is requested
      if (secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)) {
        const newToken = await refreshSpotifyToken();
        if (newToken) {
          // Schedule next token refresh
          const newExpiresAt = secureStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
          if (newExpiresAt) {
            const expiresIn = Math.floor((new Date(newExpiresAt).getTime() - now) / 1000);
            scheduleTokenRefresh(expiresIn);
          }
          return;
        }
      }

      // Clear auth state if no valid credentials
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
  }, [account, databases, refreshSpotifyToken, user, scheduleTokenRefresh, clearTokens]);

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
    
    // Set up periodic checks
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
    refreshAuth,
    login,
    logout,
    refreshSpotifyToken,
    spotifyApi
  }), [isLoading, user, token, refreshAuth, login, logout, refreshSpotifyToken, spotifyApi]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 