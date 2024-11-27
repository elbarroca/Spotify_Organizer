import { useState, useEffect, useRef } from 'react';
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

export interface SpotifyPlaybackHook {
  currentTrack: any;
  isPlaying: boolean;
  progress: number;
  handlePlayPause: () => Promise<void>;
  handleNext: () => Promise<void>;
  handlePrevious: () => Promise<void>;
  handleSeek: (position: number) => Promise<void>;
  playTrack: (uri: string) => Promise<void>;
  setCurrentTrack: (track: any) => void;
  setIsPlaying: (playing: boolean) => void;
  isPlayerReady: boolean;
}

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export function useSpotifyPlayback() {
  const { spotifyApi } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const initializationRef = useRef<Promise<void> | null>(null);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const playerCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCurrentPlayback = async () => {
      try {
        const response = await spotifyApi.getMyCurrentPlaybackState();
        if (response.body && response.body.item) {
          setCurrentTrack(response.body.item as SpotifyTrack);
          setIsPlaying(response.body.is_playing);
          setProgress(response.body.progress_ms || 0);
        }
      } catch (error) {
        console.error('Error fetching playback state:', error);
      }
    };

    // Initial fetch
    fetchCurrentPlayback();

    // Poll for updates every 1 second
    const interval = setInterval(fetchCurrentPlayback, 1000);

    return () => clearInterval(interval);
  }, [spotifyApi]);

  useEffect(() => {
    // Define SDK Ready callback before loading script
    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsSDKReady(true);
    };

    if (!window.Spotify?.Player) {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        if (playerCheckInterval.current) {
          clearInterval(playerCheckInterval.current);
        }
      };
    } else {
      setIsSDKReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isSDKReady) return;

      const player = new window.Spotify.Player({
        name: 'Web Playback SDK',
        getOAuthToken: (cb: (token: string) => void) => {
          const token = localStorage.getItem('spotify_access_token');
          cb(token || '');
        },
        volume: 0.5
      });

    // Enhanced error handling
    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('Failed to initialize:', message);
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Failed to authenticate:', message);
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      console.error('Failed to validate Spotify account:', message);
    });

    player.addListener('playback_error', ({ message }: { message: string }) => {
      console.error('Failed to perform playback:', message);
    });

    player.addListener('ready', async ({ device_id }: { device_id: string }) => {
      console.log('Ready with Device ID', device_id);
      setDeviceId(device_id);
      
      // Wait a bit before transferring playback to ensure device is fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        await spotifyApi.transferMyPlayback([device_id], { play: false });
        setIsInitialized(true);
      } catch (error) {
        console.error('Error transferring playback:', error);
      }
    });

    // Add state change listener
    player.addListener('player_state_changed', (state: any) => {
      if (!state) return;

      setCurrentTrack(state.track_window.current_track);
      setIsPlaying(!state.paused);
      setProgress(state.position);
    });

    player.connect()
      .then((success: boolean) => {
        if (success) {
          console.log('Connected to Spotify!');
          setPlayer(player);
        }
      })
      .catch((error: Error) => {
        console.error('Failed to connect to Spotify:', error);
      });

    return () => {
      player.disconnect();
    };
  }, [isSDKReady, spotifyApi]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await spotifyApi.pause();
      } else {
        await spotifyApi.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleNext = async () => {
    try {
      await spotifyApi.skipToNext();
      // Fetch updated state after skipping
      const response = await spotifyApi.getMyCurrentPlaybackState();
      if (response.body && response.body.item) {
        setCurrentTrack(response.body.item as SpotifyTrack);
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await spotifyApi.skipToPrevious();
      // Fetch updated state after skipping
      const response = await spotifyApi.getMyCurrentPlaybackState();
      if (response.body && response.body.item) {
        setCurrentTrack(response.body.item as SpotifyTrack);
      }
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };

  const handleSeek = async (positionMs: number) => {
    try {
      await spotifyApi.seek(positionMs);
      setProgress(positionMs);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const playTrack = async (uri: string) => {
    try {
      if (!deviceId) {
        throw new Error('Please open Spotify on any device');
      }

      // First ensure we have an active device
      const devices = await spotifyApi.getMyDevices();
      const isDeviceActive = devices.body.devices.some(
        device => device.id === deviceId && device.is_active
      );

      if (!isDeviceActive) {
        await spotifyApi.transferMyPlayback([deviceId], { play: false });
        // Wait for device transfer
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Stop current playback if any
      if (isPlaying) {
        try {
          await spotifyApi.pause();
        } catch (error) {
          console.warn('Error pausing current track:', error);
          // Continue anyway as we'll start the new track
        }
      }

      // Now play the new track
      await spotifyApi.play({
        device_id: deviceId,
        uris: [uri]
      });
      
      // Update state optimistically
      setIsPlaying(true);
      
      // Fetch track details for immediate UI update
      const trackId = uri.split(':')[2];
      const trackDetails = await spotifyApi.getTrack(trackId);
      if (trackDetails.body) {
        setCurrentTrack(trackDetails.body);
      }
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  };

  const setVolume = async (volumePercent: number) => {
    try {
      await spotifyApi.setVolume(volumePercent);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const toggleShuffle = async (state: boolean) => {
    try {
      await spotifyApi.setShuffle(state);
    } catch (error) {
      console.error('Error toggling shuffle:', error);
    }
  };

  const setRepeatMode = async (mode: 'off' | 'track' | 'context') => {
    try {
      await spotifyApi.setRepeat(mode);
    } catch (error) {
      console.error('Error setting repeat mode:', error);
    }
  };

  useEffect(() => {
    if (queue.length > 0 && !isPlaying) {
      playTrack(queue[0])
        .then(() => setQueue(prev => prev.slice(1)))
        .catch(console.error);
    }
  }, [queue, isPlaying]);

  return {
    currentTrack,
    isPlaying,
    progress,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    playTrack,
    setVolume,
    toggleShuffle,
    setRepeatMode,
    setCurrentTrack,
    setIsPlaying,
    isPlayerReady: isSDKReady && isInitialized,
  };
} 