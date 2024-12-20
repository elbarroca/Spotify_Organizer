import { appwriteConfig } from '@/config/appwrite';
import { SPOTIFY_CONFIG } from '@/config/spotify';
import { account, databases } from './appwrite';
import { ID, Query, AppwriteException } from 'appwrite';
import { SpotifyUser } from '@/types/database';

const USERS_DATABASE_ID = appwriteConfig.databaseId;
const USERS_COLLECTION_ID = appwriteConfig.usersCollectionId;

// Constants for storage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRES_AT: 'spotify_token_expires_at',
  USER_ID: 'spotify_user_id',
  AUTH_STATE: 'spotify_auth_state',
  USER_DATA: 'spotify_user_data',
  LAST_FETCH: 'spotify_last_fetch'
} as const;

// Constants for storage with expiry buffer
const TOKEN_EXPIRY_BUFFER = 300; // 5 minutes in seconds
const TOKEN_CHECK_INTERVAL = 60000; // 1 minute in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Utility functions
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Secure token storage utilities with improved caching
const tokenCache = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  expiresAt: null as Date | null
};

// Basic encryption/decryption for state and tokens
const encryptToken = (token: string): string => {
  return btoa(token);
};

const decryptToken = (encryptedToken: string): string => {
  return atob(encryptedToken);
};

// Generate random state string for OAuth
function generateRandomString(length: number) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// State management functions
function storeAuthState(state: string): boolean {
  try {
    // Store state in both storages without encryption for OAuth flow
    localStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);
    sessionStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);
    
    // Double check storage was successful
    const localStored = localStorage.getItem(STORAGE_KEYS.AUTH_STATE) === state;
    const sessionStored = sessionStorage.getItem(STORAGE_KEYS.AUTH_STATE) === state;
    
    if (!localStored || !sessionStored) {
      console.error('Failed to verify stored state:', {
        localStored,
        sessionStored,
        state: state.substring(0, 10) + '...'
      });
      return false;
    }
    
    console.log('Successfully stored auth state:', {
      state: state.substring(0, 10) + '...',
      localStored,
      sessionStored
    });
    
    return true;
  } catch (error) {
    console.error('Failed to store auth state:', error);
    return false;
  }
}

function getAuthState(): string | null {
  try {
    // Try both storages
    const sessionState = sessionStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    const localState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    
    // Log state presence
    console.log('Auth state check:', {
      hasSessionState: !!sessionState,
      hasLocalState: !!localState,
      sessionState: sessionState?.substring(0, 10) + '...',
      localState: localState?.substring(0, 10) + '...'
    });

    // Return first available state
    const state = sessionState || localState;
    if (!state) {
      console.log('No auth state found in any storage');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to get auth state:', error);
    return null;
  }
}

function clearAuthState() {
  try {
    const hadSessionState = !!sessionStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    const hadLocalState = !!localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    
    console.log('Cleared auth state:', {
      hadSessionState,
      hadLocalState
    });
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
}

// Main auth functions
export const getSpotifyAuthUrl = async () => {
  try {
    // Clear any existing state first
    clearAuthState();
    
    // Generate new state
    const state = generateRandomString(32);
    console.log('Generated new auth state:', state.substring(0, 10) + '...');
    
    // Store state
    const stored = storeAuthState(state);
    if (!stored) {
      throw new Error('Failed to store auth state');
    }
    
    // Verify state was stored
    const verifiedState = getAuthState();
    if (!verifiedState) {
      throw new Error('Failed to verify stored state');
    }
    
    if (verifiedState !== state) {
      console.error('State verification failed:', {
        original: state.substring(0, 10) + '...',
        verified: verifiedState.substring(0, 10) + '...'
      });
      throw new Error('State verification failed');
    }
    
    // Create auth URL
    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      scope: SPOTIFY_CONFIG.scopes.join(' '),
      state: state,
      show_dialog: 'true'
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('Generated Spotify auth URL with state');
    return url;
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    clearAuthState(); // Clean up on error
    throw error;
  }
};

export const verifyState = (state: string | null): boolean => {
  if (!state) {
    console.error('No state parameter received in callback');
    return false;
  }

  console.log('Verifying state:', state.substring(0, 10) + '...');
  
  const storedState = getAuthState();
  if (!storedState) {
    console.error('No stored state found during verification');
    return false;
  }

  const isValid = state === storedState;
  console.log('State verification result:', {
    received: state.substring(0, 10) + '...',
    stored: storedState.substring(0, 10) + '...',
    isValid
  });

  if (isValid) {
    // Only clear state after successful verification
    clearAuthState();
  }

  return isValid;
};

// Ensure the collection exists with proper structure
async function ensureCollection() {
  try {
    console.log('Checking if collection exists...');
    try {
      // Try to list documents to verify collection exists
      const result = await databases.listDocuments(
        USERS_DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.limit(1)] // Just check one document to verify access
      );
      console.log('Collection exists and is accessible');
      
      // Skip schema validation if there are no documents yet
      if (result.documents.length === 0) {
        console.log('Collection is empty, skipping schema validation');
        return;
      }
      
      // Get the first document to check its structure
      const doc = result.documents[0];
      console.log('Checking document structure:', doc);
      
      // Define required fields with their expected types
      const requiredFields = {
        Email: 'string',
        Name: 'string',
        userId: 'string'
      };
      
      // Define optional fields that should be strings when present
      const optionalFields = [
        'spotifyUri',
        'spotifyUrl',
        'spotifyAccessToken',
        'spotifyRefreshToken',
        'spotifyTokenExpiresAt',
        'createdAt',
        'updatedAt'
      ];
      
      // Check required fields
      const missingFields = [];
      for (const [field, expectedType] of Object.entries(requiredFields)) {
        if (!(field in doc)) {
          missingFields.push(field);
        } else if (typeof doc[field] !== expectedType && doc[field] !== null) {
          missingFields.push(`${field} (expected ${expectedType}, got ${typeof doc[field]})`);
        }
      }
      
      // Check optional fields - they should be either strings or null
      for (const field of optionalFields) {
        if (field in doc && doc[field] !== null && typeof doc[field] !== 'string') {
          missingFields.push(`${field} (expected string or null, got ${typeof doc[field]})`);
        }
      }
      
      if (missingFields.length > 0) {
        console.error('Schema validation failed:', missingFields);
        throw new Error(
          `Collection schema is invalid. Issues with fields: ${missingFields.join(', ')}`
        );
      }
      
      console.log('Collection schema is valid');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Collection validation error:', error.message);
        throw new Error(
          `Unable to validate collection schema: ${error.message}`
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error ensuring collection:', error);
    throw error;
  }
}

// Define the user document structure to match Appwrite schema
interface SpotifyUserDocument {
  userId: string;
  email: string;
  name: string;
  spotifyId: string; // Changed from spotify_id to match schema
  spotifyUri: string | null;
  spotifyUrl: string | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyTokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const secureStorage = {
  setItem: (key: string, value: string) => {
    try {
      const encrypted = encryptToken(value);
      sessionStorage.setItem(key, encrypted);
      localStorage.setItem(key, encrypted); // Backup storage
      
      // Update cache if it's a token
      if (key === STORAGE_KEYS.ACCESS_TOKEN) {
        tokenCache.accessToken = value;
      } else if (key === STORAGE_KEYS.REFRESH_TOKEN) {
        tokenCache.refreshToken = value;
      } else if (key === STORAGE_KEYS.EXPIRES_AT) {
        tokenCache.expiresAt = new Date(value);
      }
      
      console.log(`Stored encrypted value for key: ${key}`);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      // Check cache first for tokens
      if (key === STORAGE_KEYS.ACCESS_TOKEN && tokenCache.accessToken) {
        return tokenCache.accessToken;
      }
      if (key === STORAGE_KEYS.REFRESH_TOKEN && tokenCache.refreshToken) {
        return tokenCache.refreshToken;
      }
      if (key === STORAGE_KEYS.EXPIRES_AT && tokenCache.expiresAt) {
        return tokenCache.expiresAt.toISOString();
      }

      // Try sessionStorage first, then fallback to localStorage
      let encrypted = sessionStorage.getItem(key);
      if (!encrypted) {
        encrypted = localStorage.getItem(key);
      }
      
      if (!encrypted) {
        return null;
      }
      
      const decrypted = decryptToken(encrypted);
      
      // Update cache for tokens
      if (key === STORAGE_KEYS.ACCESS_TOKEN) {
        tokenCache.accessToken = decrypted;
      } else if (key === STORAGE_KEYS.REFRESH_TOKEN) {
        tokenCache.refreshToken = decrypted;
      } else if (key === STORAGE_KEYS.EXPIRES_AT) {
        tokenCache.expiresAt = new Date(decrypted);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  },
  
  removeItem: (key: string) => {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      
      // Clear cache for tokens
      if (key === STORAGE_KEYS.ACCESS_TOKEN) {
        tokenCache.accessToken = null;
      } else if (key === STORAGE_KEYS.REFRESH_TOKEN) {
        tokenCache.refreshToken = null;
      } else if (key === STORAGE_KEYS.EXPIRES_AT) {
        tokenCache.expiresAt = null;
      }
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
  
  clearAll: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      
      // Clear all cache
      tokenCache.accessToken = null;
      tokenCache.refreshToken = null;
      tokenCache.expiresAt = null;
      
      console.log('Cleared all stored values');
    } catch (error) {
      console.error('Error clearing all tokens:', error);
    }
  },
  
  isTokenExpired: (): boolean => {
    try {
      const expiresAt = tokenCache.expiresAt || new Date(secureStorage.getItem(STORAGE_KEYS.EXPIRES_AT) || '');
      if (!expiresAt || isNaN(expiresAt.getTime())) return true;
      
      const now = new Date();
      const expiryWithBuffer = new Date(expiresAt.getTime() - TOKEN_EXPIRY_BUFFER * 1000);
      return now >= expiryWithBuffer;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  },
  
  shouldRefreshToken: (): boolean => {
    try {
      const accessToken = secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const expiresAt = tokenCache.expiresAt || new Date(secureStorage.getItem(STORAGE_KEYS.EXPIRES_AT) || '');
      
      if (!accessToken || !refreshToken || !expiresAt || isNaN(expiresAt.getTime())) {
        return true;
      }
      
      const now = new Date();
      const refreshTime = new Date(expiresAt.getTime() - TOKEN_EXPIRY_BUFFER * 1000);
      return now >= refreshTime;
    } catch (error) {
      console.error('Error checking if token should refresh:', error);
      return true;
    }
  }
};

// Define the required schema attributes
const REQUIRED_ATTRIBUTES = [
  'spotifyId',
  'email',
  'name',
  'spotifyUri',
  'spotifyUrl',
  'spotifyAccessToken',
  'spotifyRefreshToken',
  'spotifyTokenExpiresAt',
  'createdAt',
  'updatedAt'
] as const;

// Validate Appwrite schema
async function validateAppwriteSchema() {
  try {
    // Try to list one document to verify collection exists and check schema
    const result = await databases.listDocuments(
      USERS_DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.limit(1)]
    );

    // Get collection attributes from a sample document
    const sampleDoc = result.documents[0];
    if (sampleDoc) {
      const missingAttributes = REQUIRED_ATTRIBUTES.filter(attr => !(attr in sampleDoc));
      if (missingAttributes.length > 0) {
        console.error('Missing required attributes in Appwrite schema:', missingAttributes);
        throw new Error(`Missing required attributes in schema: ${missingAttributes.join(', ')}`);
      }
    }

    return true;
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (error.type === 'collection_not_found') {
        throw new Error('Collection not found. Please create the collection first.');
      }
      if (error.message.includes('Attribute not found')) {
        throw new Error('Schema validation failed. Please update your collection schema.');
      }
    }
    throw error;
  }
}

export async function storeSpotifyUserData(accessToken: string) {
  try {
    // Validate schema first
    await validateAppwriteSchema();

    // Get Spotify profile
    const profile = await getSpotifyProfile(accessToken);
    console.log('Got Spotify profile:', profile);

    // Get current Appwrite session
    try {
      await account.get();
    } catch (error) {
      console.log('No session exists, creating anonymous session...');
      await account.createAnonymousSession();
    }

    // Get current user after ensuring session exists
    const currentUser = await account.get();
    console.log('Current user:', currentUser);

    // Prepare the document data using camelCase to match schema
    const documentData: SpotifyUserDocument = {
      userId: currentUser.$id,
      email: profile.email || '',
      name: profile.display_name || profile.id,
      spotifyId: profile.id,
      spotifyUri: profile.uri || null,
      spotifyUrl: profile.external_urls?.spotify || null,
      spotifyAccessToken: accessToken,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Document data to be stored:', documentData);

    try {
      // Check if user exists using spotifyId
      const existingDocs = await databases.listDocuments(
        USERS_DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('spotifyId', profile.id)]
      );

      if (existingDocs.documents.length > 0) {
        // Update existing document
        const doc = await databases.updateDocument(
          USERS_DATABASE_ID,
          USERS_COLLECTION_ID,
          existingDocs.documents[0].$id,
          {
            email: profile.email || '',
            name: profile.display_name || profile.id,
            spotifyUri: profile.uri || null,
            spotifyUrl: profile.external_urls?.spotify || null,
            spotifyAccessToken: accessToken,
            updatedAt: new Date().toISOString()
          }
        );
        console.log('Updated existing user document');
        return doc.$id;
      } else {
        // Create new document
        const doc = await databases.createDocument(
          USERS_DATABASE_ID,
          USERS_COLLECTION_ID,
          ID.unique(),
          documentData
        );
        console.log('Created new user document');
        return doc.$id;
      }
    } catch (error) {
      if (error instanceof AppwriteException) {
        console.error('Appwrite error details:', {
          type: error.type,
          message: error.message,
          code: error.code
        });
        
        if (error.message.includes('Attribute not found')) {
          throw new Error(
            'Database schema is not properly configured. Please check the collection attributes. ' +
            'Required attributes: ' + REQUIRED_ATTRIBUTES.join(', ')
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error storing user data:', error);
    throw error;
  }
}

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const exchangeCodeForTokens = async (code: string, retryCount = 0): Promise<SpotifyTokens> => {
  console.log('Exchanging code for tokens...', { retryCount });
  
  // Validate configuration
  if (!SPOTIFY_CONFIG.clientId || !SPOTIFY_CONFIG.clientSecret || !SPOTIFY_CONFIG.redirectUri) {
    console.error('Missing Spotify configuration:', {
      hasClientId: !!SPOTIFY_CONFIG.clientId,
      hasClientSecret: !!SPOTIFY_CONFIG.clientSecret,
      redirectUri: SPOTIFY_CONFIG.redirectUri
    });
    throw new Error('Invalid Spotify configuration');
  }

  const credentials = btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`);
  
  try {
    // Log the complete request details for debugging
    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
    });

    console.log('Token exchange request:', {
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials.substring(0, 10)}...`,
      },
      body: requestBody.toString(),
      redirect_uri: SPOTIFY_CONFIG.redirectUri // Log separately for clarity
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Token exchange error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestBody: requestBody.toString()
      });

      // If we get a 5xx error or network error, retry
      if ((response.status >= 500 || !response.status) && retryCount < MAX_RETRIES) {
        console.log(`Retrying token exchange (${retryCount + 1}/${MAX_RETRIES})...`);
        await wait(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
        return exchangeCodeForTokens(code, retryCount + 1);
      }

      if (errorData.error === 'invalid_grant') {
        throw new Error('Authorization expired. Please try logging in again.');
      }

      throw new Error(
        errorData.error_description || 
        errorData.error || 
        `Failed to exchange token: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in
    });

    // Validate the response data
    if (!data.access_token || !data.refresh_token) {
      console.error('Invalid token response:', {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        responseData: data
      });
      throw new Error('Invalid token response: missing required tokens');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

export const getSpotifyProfile = async (accessToken: string) => {
  console.log('Fetching Spotify profile...');
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to get Spotify profile:', error);
    throw new Error('Failed to get Spotify profile');
  }

  const profile = await response.json();
  console.log('Spotify profile fetched successfully');
  return profile;
}; 