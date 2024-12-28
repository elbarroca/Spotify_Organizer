import { supabase } from './supabase';

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

class SpotifyAPI {
  private static instance: SpotifyAPI;
  private tokens: SpotifyTokens | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<SpotifyTokens> | null = null;

  private constructor() {
    // Load tokens from localStorage on initialization
    const access_token = localStorage.getItem('spotify_access_token');
    const refresh_token = localStorage.getItem('spotify_refresh_token');
    const expires_at = localStorage.getItem('spotify_token_expires_at');

    if (access_token && refresh_token && expires_at) {
      this.tokens = { access_token, refresh_token, expires_at };
    }
  }

  public static getInstance(): SpotifyAPI {
    if (!SpotifyAPI.instance) {
      SpotifyAPI.instance = new SpotifyAPI();
    }
    return SpotifyAPI.instance;
  }

  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return new Date(this.tokens.expires_at) <= new Date();
  }

  private async refreshTokens(): Promise<SpotifyTokens> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        if (!session) throw new Error('No session after refresh');

        const tokens: SpotifyTokens = {
          access_token: session.provider_token!,
          refresh_token: session.provider_refresh_token!,
          expires_at: new Date(Date.now() + (session.expires_in || 3600) * 1000).toISOString()
        };

        // Update stored tokens
        localStorage.setItem('spotify_access_token', tokens.access_token);
        localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
        localStorage.setItem('spotify_token_expires_at', tokens.expires_at);

        // Update database
        const { error: upsertError } = await supabase
          .from('users')
          .update({
            spotify_access_token: tokens.access_token,
            spotify_refresh_token: tokens.refresh_token,
            spotify_token_expires_at: tokens.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);

        if (upsertError) throw upsertError;

        this.tokens = tokens;
        return tokens;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public async getValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available. User must authenticate first.');
    }

    if (this.isTokenExpired()) {
      const tokens = await this.refreshTokens();
      return tokens.access_token;
    }

    return this.tokens.access_token;
  }

  public async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = await this.getValidToken();
    
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);

    return fetch(input, {
      ...init,
      headers
    });
  }

  // Helper methods for common Spotify API endpoints
  public async getCurrentUser() {
    const response = await this.fetch('https://api.spotify.com/v1/me');
    if (!response.ok) throw new Error('Failed to get user profile');
    return response.json();
  }

  public async getUserPlaylists(limit = 50, offset = 0) {
    const response = await this.fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error('Failed to get user playlists');
    return response.json();
  }

  public async createPlaylist(userId: string, name: string, description?: string, isPublic = true) {
    const response = await this.fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          public: isPublic
        })
      }
    );
    if (!response.ok) throw new Error('Failed to create playlist');
    return response.json();
  }

  public async addTracksToPlaylist(playlistId: string, uris: string[]) {
    const response = await this.fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: 'POST',
        body: JSON.stringify({
          uris
        })
      }
    );
    if (!response.ok) throw new Error('Failed to add tracks to playlist');
    return response.json();
  }
}

// Export singleton instance
export const spotifyApi = SpotifyAPI.getInstance(); 