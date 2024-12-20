import { Models } from 'appwrite';

export interface SpotifyUser extends Models.Document {
  userId: string;
  spotifyId: string;
  name: string;
  email: string;
  spotifyAccessToken: string;
  spotifyRefreshToken: string;
  spotifyTokenExpiresAt: string;
  createdAt: string;
  updatedAt: string;
}