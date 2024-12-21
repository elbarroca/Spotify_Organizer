import { SPOTIFY_CONFIG } from '@/config/spotify';
import { toast } from 'sonner';

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class SpotifyClient {
  private static instance: SpotifyClient;
  private tokens: SpotifyTokens | null = null;
  private refreshPromise: Promise<string> | null = null;
  private tokenRefreshThreshold = 60000; // 1 minute before expiration

  private constructor() {
    this.loadTokensFromStorage();
    // Check token validity on initialization
    if (this.tokens && this.isTokenExpired()) {
      this.refreshAccessToken().catch(console.error);
    }
  }

  private loadTokensFromStorage(): void {
    try {
      const accessToken = localStorage.getItem('spotify_access_token');
      const refreshToken = localStorage.getItem('spotify_refresh_token');
      const expiresAt = localStorage.getItem('spotify_token_expires_at');

      if (accessToken && refreshToken && expiresAt) {
        this.tokens = {
          accessToken,
          refreshToken,
          expiresAt: parseInt(expiresAt)
        };
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
      this.tokens = null;
    }
  }

  public static getInstance(): SpotifyClient {
    if (!SpotifyClient.instance) {
      SpotifyClient.instance = new SpotifyClient();
    }
    return SpotifyClient.instance;
  }

  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt - this.tokenRefreshThreshold;
  }

  public setTokens(tokens: SpotifyTokens): void {
    this.tokens = tokens;
    try {
      localStorage.setItem('spotify_access_token', tokens.accessToken);
      localStorage.setItem('spotify_refresh_token', tokens.refreshToken);
      localStorage.setItem('spotify_token_expires_at', tokens.expiresAt.toString());
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  public clearTokens(): void {
    this.tokens = null;
    try {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.removeItem('spotify_token_expires_at');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Return existing refresh promise if one is in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        console.log('Refreshing Spotify access token...');
        const credentials = btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`);
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.tokens?.refreshToken || ''
          })
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Token refresh failed:', error);
          throw new Error(error.error_description || 'Failed to refresh token');
        }

        const data = await response.json();
        const newTokens: SpotifyTokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || this.tokens?.refreshToken || '',
          expiresAt: Date.now() + data.expires_in * 1000
        };

        this.setTokens(newTokens);
        console.log('Successfully refreshed Spotify access token');
        return newTokens.accessToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.clearTokens(); // Clear invalid tokens
        this.redirectToLogin();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private redirectToLogin() {
    toast.error('Session expired. Please log in again.');
    window.location.href = '/';
  }

  private async getValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }

    if (this.isTokenExpired()) {
      return this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.getValidToken();
      const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return null as T;
      }

      // Handle 404 Not Found
      if (response.status === 404) {
        console.log(`Resource not found: ${endpoint}`);
        return null as T;
      }

      if (response.status === 401) {
        // Token might have expired during the request
        console.log('Token expired during request, refreshing...');
        const newToken = await this.refreshAccessToken();
        
        if (!newToken) {
          throw new Error('Failed to refresh token');
        }

        const retryResponse = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        // Handle 204 and 404 for retry request
        if (retryResponse.status === 204) {
          return null as T;
        }

        if (retryResponse.status === 404) {
          console.log(`Resource not found after token refresh: ${endpoint}`);
          return null as T;
        }

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
      console.error('Spotify API request failed:', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        if (error.message.includes('Not authenticated') || 
            error.message.includes('Failed to refresh token') ||
            error.message.includes('The access token expired')) {
          this.clearTokens();
          this.redirectToLogin();
        }
      }
      
      throw error;
    }
  }

  // Utility methods for common Spotify API endpoints
  public async getCurrentUser() {
    try {
      return await this.request<SpotifyApi.CurrentUsersProfileResponse>('me');
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  public async getUserPlaylists(limit = 50) {
    try {
      return await this.request<SpotifyApi.ListOfUsersPlaylistsResponse>(`me/playlists?limit=${limit}`);
    } catch (error) {
      console.error('Failed to get user playlists:', error);
      throw error;
    }
  }

  public async getPlaylistTracks(playlistId: string, limit = 100) {
    try {
      return await this.request<SpotifyApi.PlaylistTrackResponse>(
        `playlists/${playlistId}/tracks?limit=${limit}`
      );
    } catch (error) {
      console.error('Failed to get playlist tracks:', error);
      throw error;
    }
  }

  public async getCurrentPlayback() {
    try {
      const response = await this.request<SpotifyApi.CurrentPlaybackResponse>('me/player');
      // Handle no active playback
      if (!response) {
        console.log('No active playback session');
        return null;
      }
      return response;
    } catch (error) {
      // Handle expected errors
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          console.log('No active player found');
          return null;
        }
        if (error.message.includes('The access token expired')) {
          throw error; // Let auth context handle token refresh
        }
      }
      console.error('Failed to get current playback:', error);
      throw error;
    }
  }

  public async createPlaylist(userId: string, name: string, description?: string) {
    return this.request<SpotifyApi.CreatePlaylistResponse>(
      `users/${userId}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          public: false
        })
      }
    );
  }

  public async addTracksToPlaylist(playlistId: string, uris: string[]) {
    return this.request<SpotifyApi.AddTracksToPlaylistResponse>(
      `playlists/${playlistId}/tracks`,
      {
        method: 'POST',
        body: JSON.stringify({ uris })
      }
    );
  }

  public async getAudioFeatures(trackIds: string[]) {
    return this.request<SpotifyApi.MultipleAudioFeaturesResponse>(
      `audio-features?ids=${trackIds.join(',')}`
    );
  }

  public async controlPlayback(command: 'play' | 'pause' | 'next' | 'previous') {
    const endpoint = command === 'play' || command === 'pause'
      ? `me/player/${command}`
      : `me/player/${command === 'next' ? 'next' : 'previous'}`;

    return this.request(endpoint, { method: 'POST' });
  }
}

export const spotifyClient = SpotifyClient.getInstance(); 