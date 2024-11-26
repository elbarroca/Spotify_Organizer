import { useState, useEffect } from 'react';

interface SpotifyTrack {
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
}

interface PlaybackState {
  currentTrack: {
    title: string;
    artist: string;
    imageUrl: string;
  } | null;
  isPlaying: boolean;
}

export const useSpotifyPlayback = () => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentTrack: null,
    isPlaying: false,
  });

  const fetchCurrentPlayback = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
        },
      });

      if (response.status === 204) {
        return null;
      }

      const data = await response.json();
      const track = data.item as SpotifyTrack;

      return {
        currentTrack: {
          title: track.name,
          artist: track.artists.map(artist => artist.name).join(', '),
          imageUrl: track.album.images[0]?.url,
        },
        isPlaying: data.is_playing,
      };
    } catch (error) {
      console.error('Error fetching playback state:', error);
      return null;
    }
  };

  const handlePlayPause = async () => {
    const endpoint = playbackState.isPlaying ? 'pause' : 'play';
    try {
      await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
        },
      });
      // Update local state after successful API call
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: !prev.isPlaying,
      }));
    } catch (error) {
      console.error(`Error ${endpoint}ing playback:`, error);
    }
  };

  const handleNext = async () => {
    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
        },
      });
      // Fetch updated playback state after skipping
      const newState = await fetchCurrentPlayback();
      if (newState) setPlaybackState(newState);
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
        },
      });
      // Fetch updated playback state after going back
      const newState = await fetchCurrentPlayback();
      if (newState) setPlaybackState(newState);
    } catch (error) {
      console.error('Error going to previous track:', error);
    }
  };

  useEffect(() => {
    const updatePlaybackState = async () => {
      const state = await fetchCurrentPlayback();
      if (state) setPlaybackState(state);
    };

    // Initial fetch
    updatePlaybackState();

    // Poll for updates every 3 seconds
    const interval = setInterval(updatePlaybackState, 3000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...playbackState,
    handlePlayPause,
    handleNext,
    handlePrevious,
  };
}; 