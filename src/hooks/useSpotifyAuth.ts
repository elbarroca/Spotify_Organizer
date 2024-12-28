import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SpotifyTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
}

export function useSpotifyAuth() {
  const [tokens, setTokens] = useState<SpotifyTokens>({
    accessToken: localStorage.getItem('spotify_access_token'),
    refreshToken: localStorage.getItem('spotify_refresh_token'),
    expiresAt: localStorage.getItem('spotify_token_expires_at')
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkTokenExpiration = async () => {
      if (!tokens.accessToken || !tokens.expiresAt) return;

      const expiresAt = new Date(tokens.expiresAt);
      const now = new Date();

      // Refresh token if it expires in less than 5 minutes
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        await refreshTokens();
      }
    };

    checkTokenExpiration();
  }, [tokens]);

  const refreshTokens = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      if (!session) throw new Error('No session after refresh');

      const { provider_token, provider_refresh_token, expires_in } = session;
      
      if (!provider_token) {
        throw new Error('No access token received');
      }

      // Update tokens in state and localStorage
      const newTokens = {
        accessToken: provider_token,
        refreshToken: provider_refresh_token || tokens.refreshToken,
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
      };

      setTokens(newTokens);
      
      localStorage.setItem('spotify_access_token', provider_token);
      if (provider_refresh_token) {
        localStorage.setItem('spotify_refresh_token', provider_refresh_token);
      }
      localStorage.setItem('spotify_token_expires_at', newTokens.expiresAt);

      // Update database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          spotify_access_token: provider_token,
          spotify_refresh_token: provider_refresh_token || tokens.refreshToken,
          spotify_token_expires_at: newTokens.expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      toast.error('Failed to refresh Spotify access token');
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  const getValidToken = async (): Promise<string | null> => {
    if (!tokens.accessToken || !tokens.expiresAt) return null;

    const expiresAt = new Date(tokens.expiresAt);
    const now = new Date();

    // Refresh token if it expires in less than 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    return tokens.accessToken;
  };

  return {
    tokens,
    isRefreshing,
    refreshTokens,
    getValidToken
  };
} 