import { appwriteConfig } from './appwrite';

export const SPOTIFY_CONFIG = {
  clientId: appwriteConfig.spotifyClientId,
  clientSecret: appwriteConfig.spotifyClientSecret,
  redirectUri: appwriteConfig.redirectUri,
  scopes: [
    'user-read-email',
    'user-read-private',
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-recently-played'
  ]
} as const;

export const SPOTIFY_SCOPES = SPOTIFY_CONFIG.scopes;