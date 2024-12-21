import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Constants for API management
const ACTIVE_POLLING_INTERVAL = 5000; // 5 seconds when playing
const INACTIVE_POLLING_INTERVAL = 30000; // 30 seconds when not playing
const RATE_LIMIT_WINDOW = 30000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 50; // Maximum requests per window
const CACHE_DURATION = 3000; // 3 seconds cache duration
const BACKOFF_MULTIPLIER = 2; // Exponential backoff multiplier
const MAX_BACKOFF = 60000; // Maximum backoff time (1 minute)
const MIN_POLLING_INTERVAL = 3000; // Minimum 3 seconds between polls

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
}

interface PlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack;
  device: {
    id: string;
    is_active: boolean;
    name: string;
  };
}

interface CachedResponse<T> {
  data: T;
  timestamp: number;
}

export function useSpotifyPlayback() {
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { token, refreshAuth, spotifyApi } = useAuth();

  // Refs for rate limiting and caching
  const requestCountRef = useRef<number>(0);
  const lastWindowStartRef = useRef<number>(Date.now());
  const backoffTimeRef = useRef<number>(MIN_POLLING_INTERVAL);
  const cacheRef = useRef<Map<string, CachedResponse<any>>>(new Map());
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const lastPlaybackStateRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);
  const isPollingPausedRef = useRef<boolean>(false);
  const lastSuccessfulFetchRef = useRef<number>(0);

  const getCurrentPlayback = useCallback(async (force = false): Promise<PlaybackState | null> => {
    if (!token) return null;

    // Don't fetch if we've fetched recently and it's not forced
    const now = Date.now();
    if (!force && now - lastSuccessfulFetchRef.current < MIN_POLLING_INTERVAL) {
      return null;
    }

    try {
      const response = await spotifyApi.get('me/player');
      lastSuccessfulFetchRef.current = now;
      
      // Transform the response to match our SpotifyTrack interface
      if (response && response.item) {
        const transformedTrack = {
          ...response.item,
          external_urls: response.item.external_urls || { spotify: '' },
          external_ids: response.item.external_ids || { isrc: '' },
          href: response.item.href || '',
          popularity: response.item.popularity || 0,
          preview_url: response.item.preview_url || null,
          type: response.item.type || 'track',
          is_playable: response.item.is_playable || true,
          is_local: response.item.is_local || false
        };
        return {
          ...response,
          item: transformedTrack
        };
      }
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        isPollingPausedRef.current = true;
        retryCountRef.current++;
        
        if (retryCountRef.current >= 3) {
          console.warn('Too many rate limit errors, pausing polling for 1 minute');
          setTimeout(() => {
            isPollingPausedRef.current = false;
            retryCountRef.current = 0;
          }, 60000);
        } else {
          setTimeout(() => {
            isPollingPausedRef.current = false;
          }, backoffTimeRef.current);
        }
      }
      return null;
    }
  }, [token, spotifyApi]);

  const updatePlaybackState = useCallback(async (force = false) => {
    if (isPollingPausedRef.current) return;

    const playbackState = await getCurrentPlayback(force);
    
    // Create a state string to compare changes
    const newStateString = playbackState ? 
      `${playbackState.item?.id}-${playbackState.is_playing}-${playbackState.progress_ms}` : 
      'no-playback';
    
    // Only update if state has changed or forced
    if (force || newStateString !== lastPlaybackStateRef.current) {
      if (playbackState) {
        setCurrentTrack(playbackState.item);
        setIsPlaying(playbackState.is_playing);
        setProgress(playbackState.progress_ms);
      } else {
        // Only clear state if we're sure there's no playback
        if (force || !currentTrack) {
          setCurrentTrack(null);
          setIsPlaying(false);
          setProgress(0);
        }
      }
      lastPlaybackStateRef.current = newStateString;
    }
  }, [getCurrentPlayback, currentTrack]);

  const scheduleNextUpdate = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    if (!isInitialized || isPollingPausedRef.current) return;

    // Determine polling interval based on playback state
    const interval = isPlaying ? 
      Math.max(ACTIVE_POLLING_INTERVAL, backoffTimeRef.current) : 
      Math.max(INACTIVE_POLLING_INTERVAL, backoffTimeRef.current);

    pollingTimeoutRef.current = setTimeout(() => {
      if (!isPollingPausedRef.current) {
        updatePlaybackState().then(() => {
          scheduleNextUpdate();
        });
      }
    }, interval);
  }, [updatePlaybackState, isPlaying, isInitialized]);

  // Playback control functions
  const handlePlayPause = useCallback(async () => {
    if (!token) return;

    try {
      const endpoint = isPlaying ? 'pause' : 'play';
      await spotifyApi.put(`me/player/${endpoint}`);
      setIsPlaying(!isPlaying);
      await updatePlaybackState(true);
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  }, [token, isPlaying, spotifyApi, updatePlaybackState]);
  const handleNext = useCallback(async () => {
    if (!token) return;

    try {
      await spotifyApi.post('me/player/next', {});
      // Wait for Spotify API to update
      await new Promise(resolve => setTimeout(resolve, 300));
      await updatePlaybackState(true);
    } catch (error) {
      console.error('Failed to skip track:', error);
      toast.error('Failed to skip track', {
        description: 'Please try again or check your Spotify connection'
      });
    }
  }, [token, spotifyApi, updatePlaybackState]);

  const handlePrevious = useCallback(async () => {
    if (!token) return;

    try {
      await spotifyApi.post('me/player/previous', {});
      // Wait for Spotify API to update
      await new Promise(resolve => setTimeout(resolve, 300));
      await updatePlaybackState(true);
    } catch (error) {
      console.error('Failed to go to previous track:', error);
      toast.error('Failed to skip to previous track', {
        description: 'Please try again or check your Spotify connection'
      });
    }
  }, [token, spotifyApi, updatePlaybackState]);

  const handleSeek = useCallback(async (position: number) => {
    if (!token) return;

    try {
      await spotifyApi.put('me/player/seek', {
        position_ms: position
      });
      setProgress(position);
    } catch (error) {
      console.error('Failed to seek:', error);
      toast.error('Failed to seek position');
    }
  }, [token, spotifyApi]);

  const playTrack = useCallback(async (trackUri: string) => {
    if (!token) return;

    try {
      await spotifyApi.put('me/player/play', {
        uris: [trackUri]
      });
      // Wait for Spotify API to update
      await new Promise(resolve => setTimeout(resolve, 300));
      await updatePlaybackState(true);
    } catch (error) {
      console.error('Failed to play track:', error);
      toast.error('Failed to play track');
    }
  }, [token, spotifyApi, updatePlaybackState]);

  // Effect for initial setup and polling
  useEffect(() => {
    if (!token) return;

    const initializePlayback = async () => {
      isPollingPausedRef.current = false;
      retryCountRef.current = 0;
      await updatePlaybackState(true);
      setIsInitialized(true);
      scheduleNextUpdate();
    };

    initializePlayback();

    return () => {
      isPollingPausedRef.current = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [token, updatePlaybackState, scheduleNextUpdate]);

  // Effect for progress updates - only when playing
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= currentTrack.duration_ms) {
          return 0;
        }
        return prev + 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  return {
    currentTrack,
    isPlaying,
    progress,
    error,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    playTrack,
    setCurrentTrack,
    setIsPlaying,
  };
}