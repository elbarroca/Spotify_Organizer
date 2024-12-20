import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  uri: string;
}

interface SpotifyResponse {
  items: Array<{
    track: SpotifyTrack;
    added_at: string;
  }>;
}

export function useSpotifyTracks() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, refreshAuth } = useAuth();

  useEffect(() => {
    const fetchTracks = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          await refreshAuth();
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch tracks: ${response.statusText}`);
        }

        const data: SpotifyResponse = await response.json();
        setTracks(data.items.map(item => item.track));
      } catch (error) {
        console.error('Failed to fetch tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [token, refreshAuth]);

  return { tracks, loading };
} 