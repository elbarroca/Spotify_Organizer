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

export function useSpotifyPlayback() {
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const { token, refreshAuth } = useAuth();

  const handlePlayPause = async () => {
    if (!token) return;

    try {
      const endpoint = isPlaying ? 'pause' : 'play';
      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await refreshAuth();
        return handlePlayPause();
      }

      if (!response.ok) {
        throw new Error('Failed to toggle playback');
      }

      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const handleNext = async () => {
    if (!token) return;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await refreshAuth();
        return handleNext();
      }

      if (!response.ok) {
        throw new Error('Failed to skip to next track');
      }
    } catch (error) {
      console.error('Failed to skip to next track:', error);
    }
  };

  const handlePrevious = async () => {
    if (!token) return;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await refreshAuth();
        return handlePrevious();
      }

      if (!response.ok) {
        throw new Error('Failed to skip to previous track');
      }
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
    }
  };

  const handleSeek = async (position: number) => {
    if (!token) return;

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${position}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await refreshAuth();
        return handleSeek(position);
      }

      if (!response.ok) {
        throw new Error('Failed to seek to position');
      }
    } catch (error) {
      console.error('Failed to seek to position:', error);
    }
  };

  const playTrack = async (trackUri: string) => {
    if (!token) return;

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?track_uri=${trackUri}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await refreshAuth();
        return playTrack(trackUri);
      }

      if (!response.ok) {
        throw new Error('Failed to play track');
      }
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  };

  useEffect(() => {
    const getCurrentPlayback = async () => {
      if (!token) return;

      try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          await refreshAuth();
          return getCurrentPlayback();
        }

        if (!response.ok) {
          throw new Error('Failed to get current playback');
        }

        const data = await response.json();
        setCurrentTrack(data.item);
        setIsPlaying(data.is_playing);
        setProgress(data.progress_ms);
      } catch (error) {
        console.error('Failed to get current playback:', error);
      }
    };

    getCurrentPlayback();
    const interval = setInterval(() => {
      if (isPlaying) {
        setProgress(prev => prev + 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token, isPlaying]);

  return {
    currentTrack,
    isPlaying,
    progress,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    playTrack,
    setCurrentTrack,
    setIsPlaying
  };
}