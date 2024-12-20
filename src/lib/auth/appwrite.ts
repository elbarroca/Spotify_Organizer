import { Client, Account, Databases } from 'appwrite';
import { appwriteConfig } from '@/config/appwrite';
import { OAuthProvider } from 'appwrite';

// Initialize Appwrite client
const client = new Client();

// Set up the client
client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);

// Export client for use in other parts of the app
export default client;

// Define supported OAuth providers
export type SupportedOAuthProvider = 'spotify';

// Session management functions
export const restoreSession = async () => {
  try {
    // First try to get the current session
    const session = await account.get();
    
    if (!session) {
      console.log('No session found');
      return null;
    }

    // Validate the session
    try {
      const currentSession = await account.getSession('current');
      console.log('Session is valid:', currentSession);
      return session;
    } catch (sessionError) {
      console.log('Session is invalid, clearing session');
      // Session is invalid, clear it
      await account.deleteSession('current');
      return null;
    }

  } catch (error) {
    console.error('Error restoring session:', error);
    // Clear any invalid session data
    try {
      await account.deleteSession('current');
    } catch (deleteError) {
      console.error('Error clearing invalid session:', deleteError);
    }
    return null;
  }
};

export const redirectToLogin = async (
  provider: SupportedOAuthProvider = 'spotify',
  redirectUrl: string = '/'
) => {
  try {
    // Clear any existing sessions first
    try {
      await account.deleteSession('current');
    } catch (error) {
      // Ignore errors when clearing session
      console.log('No existing session to clear');
    }

    // Map provider to Appwrite OAuthProvider
    const oauthProvider = provider === 'spotify' 
      ? OAuthProvider.Spotify 
      : OAuthProvider.Github;
    // Create new OAuth session with specified provider
    return await account.createOAuth2Session(
      oauthProvider,
      redirectUrl,
      redirectUrl // failureUrl is same as success for now
    );
  } catch (error) {
    console.error(`Failed to redirect to ${provider} login:`, error);
    throw error;
  }
};

// Get current session provider
export const getCurrentProvider = async (): Promise<SupportedOAuthProvider | null> => {
  try {
    const session = await account.getSession('current');
    return session.provider as SupportedOAuthProvider;
  } catch (error) {
    console.error('Error getting current provider:', error);
    return null;
  }
};

// Create anonymous session for guests
export const createGuestSession = async () => {
  try {
    return await account.createAnonymousSession();
  } catch (error) {
    console.error('Failed to create guest session:', error);
    throw error;
  }
};

// Database constants
export const USERS_DATABASE_ID = appwriteConfig.databaseId;
export const USERS_COLLECTION_ID = appwriteConfig.usersCollectionId;

// User management functions
export const createOrUpdateUser = async (userData: {
  id: string;
  email: string;
  name: string;
  spotifyUri: string;
  spotifyUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}) => {
  try {
    // Try to get existing user
    await databases.getDocument(
      USERS_DATABASE_ID,
      USERS_COLLECTION_ID,
      userData.id
    );
    
    // Update existing user
    return await databases.updateDocument(
      USERS_DATABASE_ID,
      USERS_COLLECTION_ID,
      userData.id,
      {
        email: userData.email,
        name: userData.name,
        spotifyUri: userData.spotifyUri,
        spotifyUrl: userData.spotifyUrl,
        spotifyAccessToken: userData.accessToken,
        spotifyRefreshToken: userData.refreshToken,
        spotifyTokenExpiresAt: userData.expiresAt,
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    // Create new user if doesn't exist
    return await databases.createDocument(
      USERS_DATABASE_ID,
      USERS_COLLECTION_ID,
      userData.id,
      {
        email: userData.email,
        name: userData.name,
        spotifyUri: userData.spotifyUri,
        spotifyUrl: userData.spotifyUrl,
        spotifyAccessToken: userData.accessToken,
        spotifyRefreshToken: userData.refreshToken,
        spotifyTokenExpiresAt: userData.expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }
};

// Get user tokens
export const getUserTokens = async (userId: string) => {
  try {
    const user = await databases.getDocument(
      USERS_DATABASE_ID,
      USERS_COLLECTION_ID,
      userId
    );
    
    return {
      accessToken: user.spotifyAccessToken,
      refreshToken: user.spotifyRefreshToken,
      expiresAt: new Date(user.spotifyTokenExpiresAt),
    };
  } catch (error) {
    console.error('Error getting user tokens:', error);
    throw error;
  }
};

// Update user tokens
export const updateUserTokens = async (
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) => {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  try {
    await databases.updateDocument(
      USERS_DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyTokenExpiresAt: expiresAt,
      }
    );
  } catch (error) {
    console.error('Error updating user tokens:', error);
    throw error;
  }
}; 