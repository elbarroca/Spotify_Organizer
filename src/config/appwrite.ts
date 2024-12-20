const requiredEnvVars = {
  VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_USERS_COLLECTION_ID: import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID,
  VITE_SPOTIFY_CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  VITE_SPOTIFY_CLIENT_SECRET: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
  VITE_SPOTIFY_REDIRECT_URI: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
} as const;

// Check for missing environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

export const appwriteConfig = {
  endpoint: requiredEnvVars.VITE_APPWRITE_ENDPOINT,
  projectId: requiredEnvVars.VITE_APPWRITE_PROJECT_ID,
  databaseId: requiredEnvVars.VITE_APPWRITE_DATABASE_ID,
  usersCollectionId: requiredEnvVars.VITE_APPWRITE_USERS_COLLECTION_ID,
  spotifyClientId: requiredEnvVars.VITE_SPOTIFY_CLIENT_ID,
  spotifyClientSecret: requiredEnvVars.VITE_SPOTIFY_CLIENT_SECRET,
  redirectUri: requiredEnvVars.VITE_SPOTIFY_REDIRECT_URI,
} as const;