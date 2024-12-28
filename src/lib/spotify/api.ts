import { spotifyAuth } from '../auth/spotify';
import { toast } from '@/components/ui/use-toast';

interface RequestOptions {
  timeout?: number;
  retryCount?: number;
  showToast?: boolean;
}

class SpotifyApi {
  private baseUrl = 'https://api.spotify.com/v1';
  private requestQueue: Map<string, Promise<any>> = new Map();
  private retryCount: Map<string, number> = new Map();
  private maxRetries = 3;
  private requestTimeout = 100000; // 100 seconds

  private async getHeaders(): Promise<HeadersInit> {
    const token = await spotifyAuth.getValidToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async handleRequest<T>(
    key: string,
    requestFn: () => Promise<Response>,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.requestTimeout,
      retryCount: maxRetries = this.maxRetries,
      showToast = true
    } = options;

    // Check if request is already in progress
    const existingRequest = this.requestQueue.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    const currentRetryCount = this.retryCount.get(key) || 0;
    if (currentRetryCount >= maxRetries) {
      this.retryCount.delete(key);
      throw new Error('Max retries reached');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const request = (async () => {
      try {
        const response = await requestFn();

        if (response.status === 401) {
          // Token expired, clear it and retry once
          localStorage.removeItem('spotify_access_token');
          const headers = await this.getHeaders();
          const retryResponse = await fetch(response.url, {
            ...response,
            headers,
            signal: controller.signal
          });
          
          if (!retryResponse.ok) {
            throw new Error(`API request failed: ${retryResponse.status}`);
          }

          const text = await retryResponse.text();
          if (!text) return null;
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse JSON response:', e);
            return null;
          }
        }

        if (response.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          this.retryCount.set(key, currentRetryCount + 1);
          return this.handleRequest<T>(key, requestFn, options);
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        // Handle empty responses
        const text = await response.text();
        if (!text) return null;
        
        try {
          const data = JSON.parse(text);
          this.retryCount.delete(key);
          return data;
        } catch (e) {
          console.error('Failed to parse JSON response:', e);
          return null;
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }

          if (showToast) {
            if (error.message.includes('401')) {
              toast({
                title: 'Session Expired',
                description: 'Please log in again to continue.',
                variant: 'destructive',
              });
            } else if (error.message.includes('429')) {
              toast({
                title: 'Too Many Requests',
                description: 'Please wait a moment before trying again.',
                variant: 'destructive',
              });
            } else if (error.message.includes('timeout')) {
              toast({
                title: 'Request Timeout',
                description: 'The server is taking too long to respond.',
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Request Failed',
                description: 'Please try again later.',
                variant: 'destructive',
              });
            }
          }
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        this.requestQueue.delete(key);
      }
    })();

    this.requestQueue.set(key, request);
    return request;
  }

  public async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    return this.handleRequest<T>(
      `GET:${endpoint}`,
      () => fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'GET',
        headers
      }),
      options
    );
  }

  public async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    return this.handleRequest<T>(
      `POST:${endpoint}`,
      () => fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined
      }),
      options
    );
  }

  public async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    return this.handleRequest<T>(
      `PUT:${endpoint}`,
      () => fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined
      }),
      options
    );
  }

  public async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const headers = await this.getHeaders();
    return this.handleRequest<T>(
      `DELETE:${endpoint}`,
      () => fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'DELETE',
        headers
      }),
      options
    );
  }

  // Helper method for Dashboard to get current playback state
  public async getCurrentPlayback(options?: RequestOptions) {
    try {
      const response = await this.get<any>('me/player', {
        ...options,
        showToast: false // Don't show toasts for polling requests
      });
      
      // Handle empty response (no active playback)
      if (!response) {
        return null;
      }
      
      // Handle 204 No Content response
      if (response === '') {
        return null;
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('timeout')) {
        console.error('Failed to get playback state:', error);
      }
      return null;
    }
  }

  // Helper method for Dashboard to get user's playlists
  public async getUserPlaylists(options?: RequestOptions) {
    return this.get('me/playlists', {
      ...options,
      timeout: 15000 // Longer timeout for playlist fetching
    });
  }

  // Helper method for Dashboard to control playback
  public async controlPlayback(action: 'play' | 'pause' | 'next' | 'previous', options?: RequestOptions) {
    const endpoint = `me/player/${action}`;
    try {
      await this.put(endpoint, undefined, options);
      return true;
    } catch (error) {
      console.error(`Failed to ${action} playback:`, error);
      return false;
    }
  }
}

export const spotifyApi = new SpotifyApi(); 