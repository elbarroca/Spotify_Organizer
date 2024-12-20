import { Account, Client, ID } from 'appwrite';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { appwriteConfig } from '@/config/appwrite';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  display_name?: string;
  spotifyId?: string;
  spotifyToken?: string;
  spotifyRefreshToken?: string;
}

class AuthService {
  private client: Client;
  private account: Account;
  private spotifyApi: SpotifyApi | null = null;

  constructor() {
    this.client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
    
    this.account = new Account(this.client);
  }

  async loginWithSpotify(): Promise<AuthUser> {
    try {
      // First authenticate with Spotify
      const spotifyAuth = await this.spotifyLogin();
      // Then create/update Appwrite user
      const session = await this.account.createOAuth2Session(
        'spotify' as any, // TODO: Update Appwrite types
        `${window.location.origin}/callback`,
        `${window.location.origin}/`,
        ['user-read-email', 'user-library-read', 'playlist-modify-public', 'playlist-modify-private']
      );

      // Get user details from Appwrite
      const user = await this.account.get();

      // Type guard for spotifyAuth
      if (!spotifyAuth || 
          typeof spotifyAuth !== 'object' ||
          !('accessToken' in spotifyAuth) ||
          !('refreshToken' in spotifyAuth) ||
          !('expiresIn' in spotifyAuth) ||
          !('userId' in spotifyAuth)) {
        throw new Error('Invalid Spotify auth response');
      }

      // Store tokens securely
      await this.storeTokens({
        accessToken: spotifyAuth.accessToken as string,
        refreshToken: spotifyAuth.refreshToken as string,
        expiresAt: new Date(Date.now() + (spotifyAuth.expiresIn as number) * 1000).toISOString()
      });

      return {
        id: user.$id,
        email: user.email,
        name: user.name,
        spotifyId: spotifyAuth.userId as string,
        spotifyToken: spotifyAuth.accessToken as string
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async refreshTokens(): Promise<void> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens?.refreshToken) throw new Error('No refresh token available');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${appwriteConfig.spotifyClientId}:${appwriteConfig.spotifyClientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
        }),
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const data = await response.json();
      
      await this.storeTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString()
      });

      // Update Spotify API instance
      if (this.spotifyApi) {
        this.spotifyApi.getAccessToken = data.access_token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  private async storeTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  }): Promise<void> {
    // Store tokens in Appwrite
    await this.account.updatePrefs({
      spotify_tokens: tokens
    });
  }

  private async getStoredTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  } | null> {
    try {
      const prefs = await this.account.getPrefs();
      return prefs.spotify_tokens || null;
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.account.deleteSession('current');
      this.spotifyApi = null;
      localStorage.removeItem('spotify_access_token');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async getUser(): Promise<AuthUser | null> {
    try {
      const user = await this.account.get();
      const tokens = await this.getStoredTokens();
      
      if (!tokens) return null;

      return {
        id: user.$id,
        email: user.email,
        name: user.name,
        spotifyToken: tokens.accessToken
      };
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  getSpotifyApi(): SpotifyApi | null {
    return this.spotifyApi;
  }

  private async spotifyLogin() {
    // Implement Spotify OAuth flow
    const state = ID.unique();
    const codeVerifier = ID.unique();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: appwriteConfig.spotifyClientId,
      response_type: 'code',
      redirect_uri: `${window.location.origin}/callback`,
      state,
      scope: 'user-read-email user-library-read playlist-modify-public playlist-modify-private',
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    
    // This will redirect to callback URL
    // The actual token exchange happens in the callback component
    return new Promise((resolve) => {
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
          resolve(event.data.auth);
        }
      });
    });
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}

export const authService = new AuthService(); 