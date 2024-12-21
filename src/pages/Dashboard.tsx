import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Music, 
  Plus, 
  Search,
  Loader2,
  ArrowRight,
  Heart,
  ListMusic,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog';
import { toast } from 'sonner';

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  href: string;
  external_urls: { spotify: string };
  type: 'artist';
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
  href: string;
  external_urls: { spotify: string };
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  album_type: 'album' | 'single' | 'compilation';
  type: 'album';
  artists: SpotifyArtist[];
  total_tracks: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
  href: string;
  external_ids: { [key: string]: string };
  external_urls: { spotify: string };
  popularity: number;
  disc_number: number;
  track_number: number;
  explicit: boolean;
  preview_url: string | null;
  is_local: boolean;
  type: 'track';
  available_markets: string[];
  restrictions?: { reason: string };
}

interface CurrentlyPlaying {
  item: SpotifyTrack | null;
  is_playing: boolean;
  progress_ms: number | null;
}

interface AudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
}

interface AudioAnalysis {
  tempo: number;
  key: number;
  mode: number;
  time_signature: number;
}

interface AutoPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: SpotifyTrack[];
  isEditing: boolean;
}

interface NowPlayingProps {
  currentTrack: SpotifyTrack;
  isPlaying: boolean;
  onPlaybackChange: () => Promise<void>;
  onGetSimilar: () => Promise<void>;
  onAddToLiked: () => Promise<void>;
}

interface PlaylistModalData {
  name: string;
  description: string;
  tracks: SpotifyTrack[];
}

const CACHE_KEYS = {
  CURRENT_TRACK: 'spotify_current_track',
  TOP_GENRES: 'spotify_top_genres',
  RECENTLY_PLAYED: 'spotify_recently_played',
  LAST_FETCH: 'spotify_dashboard_last_fetch'
} as const;

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const POLLING_INTERVAL = 10000; // 10 seconds
const BACKGROUND_POLLING_INTERVAL = 30000; // 30 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

class RequestQueue {
  private queue: Map<string, {
    promise: Promise<any>;
    timestamp: number;
    controller: AbortController;
  }>;

  constructor() {
    this.queue = new Map();
  }

  async enqueue(
    key: string,
    requestFn: () => Promise<any>,
    options: {
      timeout?: number;
      minInterval?: number;
      force?: boolean;
    } = {}
  ) {
    const {
      timeout = REQUEST_TIMEOUT,
      minInterval = 1000,
      force = false
    } = options;

    try {
      // Check if there's an existing request and it's not forced
      const existing = this.queue.get(key);
      if (existing && !force) {
        const timeSinceLastRequest = Date.now() - existing.timestamp;
        if (timeSinceLastRequest < minInterval) {
          console.log(`Skipping request for ${key}, too soon since last request`);
          return existing.promise;
        }
        // Abort existing request if it's still pending
        existing.controller.abort();
        this.queue.delete(key);
      }

      // Create new request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.queue.delete(key);
      }, timeout);

      const promise = (async () => {
        try {
          const result = await requestFn();
          clearTimeout(timeoutId);
          this.queue.delete(key);
          return result;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log(`Request ${key} aborted`);
            return null;
          }
          throw error;
        } finally {
          clearTimeout(timeoutId);
          this.queue.delete(key);
        }
      })();

      this.queue.set(key, {
        promise,
        timestamp: Date.now(),
        controller
      });

      return await promise;
    } catch (error) {
      this.queue.delete(key);
      throw error;
    }
  }

  clear() {
    this.queue.forEach(({ controller }) => {
      try {
        controller.abort();
      } catch (error) {
        console.error('Error aborting request:', error);
      }
    });
    this.queue.clear();
  }
}

const Dashboard = () => {
  // 1. All useState hooks
  const [autoPlaylists, setAutoPlaylists] = useState<AutoPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(() => {
    const cached = localStorage.getItem(CACHE_KEYS.CURRENT_TRACK);
    return cached ? JSON.parse(cached) : null;
  });
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackDetails, setTrackDetails] = useState<{
    audioFeatures?: AudioFeatures;
    audioAnalysis?: AudioAnalysis;
  }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [playlistModalData, setPlaylistModalData] = useState<PlaylistModalData | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);

  // 2. All useContext hooks (from useAuth)
  const { user, token, spotifyApi, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 3. All useRef hooks
  const requestQueueRef = useRef<RequestQueue>(new RequestQueue());
  const pollingEnabledRef = useRef<boolean>(true);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // 4. All useCallback hooks
  const queuedFetch = useCallback(async (
    key: string,
    requestFn: () => Promise<any>,
    options: {
      timeout?: number;
      minInterval?: number;
      force?: boolean;
      maxRetries?: number;
    } = {}
  ) => {
    const {
      maxRetries = MAX_RETRIES,
      ...fetchOptions
    } = options;

    const retryCount = retryCountRef.current.get(key) || 0;
    if (retryCount >= maxRetries) {
      console.error(`Max retries reached for ${key}`);
      pollingEnabledRef.current = false;
      toast.error('Too many errors occurred. Polling disabled.');
      return null;
    }

    try {
      const result = await requestQueueRef.current.enqueue(key, requestFn, fetchOptions);
      retryCountRef.current.delete(key);
      return result;
    } catch (error) {
      retryCountRef.current.set(key, retryCount + 1);
      console.error(`Request failed (${retryCount + 1}/${maxRetries}):`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
        return queuedFetch(key, requestFn, options);
      }
      
      throw error;
    }
  }, []);

  const fetchCurrentlyPlaying = useCallback(async (force = false) => {
    if (!token || !pollingEnabledRef.current) return;

    try {
      const data = await queuedFetch(
        'currently-playing',
        async () => {
          const response = await spotifyApi.get('me/player/currently-playing');
          
          if (!response || response === null || response === '') {
            console.log('No active playback session');
            try {
              const playerState = await spotifyApi.get('me/player');
              if (playerState && playerState.item) {
                return playerState;
              }
            } catch (playerError) {
              console.log('Failed to get player state:', playerError);
            }
            return null;
          }
          
          return response;
        },
        { 
          minInterval: force ? 0 : POLLING_INTERVAL / 2,
          force,
          timeout: REQUEST_TIMEOUT
        }
      );

      if (!data) {
        if (currentlyPlaying) {
          console.log('No active playback, clearing state');
          setCurrentlyPlaying(null);
          localStorage.removeItem(CACHE_KEYS.CURRENT_TRACK);
        }
        return;
      }

      if (!data.item) {
        console.log('No track data in response');
        if (currentlyPlaying) {
          setCurrentlyPlaying(null);
          localStorage.removeItem(CACHE_KEYS.CURRENT_TRACK);
        }
        return;
      }

      const newState = {
        item: data.item,
        is_playing: data.is_playing,
        progress_ms: data.progress_ms
      };

      if (!currentlyPlaying || 
          currentlyPlaying.item?.id !== newState.item.id || 
          currentlyPlaying.is_playing !== newState.is_playing) {
        console.log('Updating currently playing state:', newState);
        setCurrentlyPlaying(newState);
        localStorage.setItem(CACHE_KEYS.CURRENT_TRACK, JSON.stringify(newState));
      }
    } catch (error) {
      console.error('Failed to fetch currently playing:', error);
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('401')) {
          toast.error('Session expired. Please log in again.');
          return;
        }
        if (message.includes('403')) {
          pollingEnabledRef.current = false;
          toast.error('Insufficient permissions', {
            description: 'Please log out and log in again to grant the required permissions.'
          });
          return;
        }
        if (message.includes('429')) {
          pollingEnabledRef.current = false;
          setTimeout(() => {
            pollingEnabledRef.current = true;
          }, 60000);
          toast.error('Too many requests. Waiting before trying again.');
          return;
        }
        if (message.includes('not found') || message.includes('404')) {
          console.log('Player endpoint not available, will retry later');
          return;
        }
      }
      
      if (!force) {
        toast.error('Failed to update playback status');
      }
    }
  }, [token, spotifyApi, queuedFetch, currentlyPlaying]);

  const generatePersonalizedPlaylists = useCallback(async (force = false) => {
    if (!pollingEnabledRef.current) return;

    try {
      const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
      const cachedPlaylists = localStorage.getItem(CACHE_KEYS.RECENTLY_PLAYED);
      
      if (!force && lastFetch && cachedPlaylists) {
        const timestamp = parseInt(lastFetch);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAutoPlaylists(JSON.parse(cachedPlaylists));
          return;
        }
      }

      const recentlyPlayed = await queuedFetch(
        'recently-played',
        () => spotifyApi.get('me/player/recently-played'),
        { 
          minInterval: force ? 0 : CACHE_DURATION / 2,
          force,
          maxRetries: force ? 1 : MAX_RETRIES
        }
      );

      if (!recentlyPlayed?.items) {
        console.log('No recently played tracks, trying saved tracks');
        const savedTracks = await queuedFetch(
          'saved-tracks',
          () => spotifyApi.get('me/tracks?limit=50'),
          { force: true, maxRetries: 1 }
        );

        if (!savedTracks?.items) {
          console.log('No saved tracks available');
          return;
        }

        const tracks = savedTracks.items.map((item: any) => item.track);
        const generatedPlaylists = [
          {
            id: 'saved',
            name: 'Saved Tracks',
            description: 'Your liked songs',
            tracks: tracks.slice(0, 20),
            isEditing: false
          }
        ];

        setAutoPlaylists(generatedPlaylists);
        localStorage.setItem(CACHE_KEYS.RECENTLY_PLAYED, JSON.stringify(generatedPlaylists));
        localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
        return;
      }

      const tracks = recentlyPlayed.items.map((item: any) => item.track);
      const generatedPlaylists = [
        {
          id: 'recent',
          name: 'Recently Played',
          description: 'Your latest musical journey',
          tracks: tracks.slice(0, 20),
          isEditing: false
        }
      ];

      setAutoPlaylists(generatedPlaylists);
      localStorage.setItem(CACHE_KEYS.RECENTLY_PLAYED, JSON.stringify(generatedPlaylists));
      localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
    } catch (error) {
      console.error('Failed to generate playlists:', error);
      if (!force) {
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes('403')) {
            toast.error('Insufficient permissions. Please log in again.');
          } else if (message.includes('429')) {
            toast.error('Too many requests. Please try again later.');
          } else if (message.includes('not found') || message.includes('404')) {
            console.log('Playlist endpoints not available, will retry later');
          } else {
            toast.error('Failed to load your music data');
          }
        } else {
          toast.error('Failed to load your music data');
        }
      }
    }
  }, [spotifyApi, queuedFetch]);

  const handlePlaybackChange = useCallback(async () => {
    await fetchCurrentlyPlaying(true);
  }, [fetchCurrentlyPlaying]);

  const handleEditName = useCallback((playlistId: string) => {
    setAutoPlaylists(playlists => 
      playlists.map(p => 
        p.id === playlistId ? { ...p, isEditing: true } : p
      )
    );
  }, []);

  const handleNameChange = useCallback((playlistId: string, newName: string) => {
    setAutoPlaylists(playlists =>
      playlists.map(p =>
        p.id === playlistId ? { ...p, name: newName, isEditing: false } : p
      )
    );
  }, []);

  const showToast = useCallback((
    type: 'success' | 'error' | 'loading',
    message: string,
    description?: string | React.ReactNode
  ) => {
    const id = `toast-${Date.now()}`;
    
    switch (type) {
      case 'loading':
        toast.loading(message, { id, description });
        break;
      case 'success':
        toast.success(message, { id, description });
        break;
      case 'error':
        toast.error(message, { id, description });
        break;
    }
    
    return id;
  }, []);

  // 5. All useEffect hooks
  useEffect(() => {
    if (authLoading) return;

    if (!token || !user) {
      navigate('/');
      return;
    }

    const initializeDashboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [playlistsResult, currentTrack] = await Promise.allSettled([
          generatePersonalizedPlaylists(true),
          fetchCurrentlyPlaying(true)
        ]);

        if (playlistsResult.status === 'rejected') {
          console.error('Failed to load playlists:', playlistsResult.reason);
          toast.error('Failed to load your playlists');
        }

        if (currentTrack.status === 'rejected') {
          console.error('Failed to load current track:', currentTrack.reason);
          toast.error('Failed to load current playback');
        }

      } catch (error) {
        console.error('Dashboard initialization error:', error);
        setError('Failed to load dashboard data');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [token, user, authLoading, navigate, generatePersonalizedPlaylists, fetchCurrentlyPlaying]);

  useEffect(() => {
    if (!token || !user) return;

    let pollInterval: NodeJS.Timeout;
    let backgroundPollInterval: NodeJS.Timeout;

    const setupPolling = () => {
      pollingEnabledRef.current = true;
      retryCountRef.current.clear();
      requestQueueRef.current.clear();

      if (pollInterval) clearInterval(pollInterval);
      if (backgroundPollInterval) clearInterval(backgroundPollInterval);

      if (document.visibilityState === 'visible') {
        Promise.allSettled([
          fetchCurrentlyPlaying(true),
          generatePersonalizedPlaylists(true)
        ]).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`Initial fetch ${index} failed:`, result.reason);
            }
          });
        });

        pollInterval = setInterval(() => {
          if (pollingEnabledRef.current && document.visibilityState === 'visible') {
            fetchCurrentlyPlaying().catch(error => {
              console.error('Player polling failed:', error);
              if (error instanceof Error && error.message.includes('429')) {
                pollingEnabledRef.current = false;
                setTimeout(() => {
                  pollingEnabledRef.current = true;
                }, 60000);
              }
            });
          }
        }, POLLING_INTERVAL);

        backgroundPollInterval = setInterval(() => {
          if (pollingEnabledRef.current && document.visibilityState === 'visible') {
            generatePersonalizedPlaylists().catch(error => {
              console.error('Playlist polling failed:', error);
            });
          }
        }, BACKGROUND_POLLING_INTERVAL);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setupPolling();
      } else {
        if (pollInterval) clearInterval(pollInterval);
        if (backgroundPollInterval) clearInterval(backgroundPollInterval);
        requestQueueRef.current.clear();
      }
    };

    setupPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollInterval) clearInterval(pollInterval);
      if (backgroundPollInterval) clearInterval(backgroundPollInterval);
      requestQueueRef.current.clear();
    };
  }, [token, user, fetchCurrentlyPlaying, generatePersonalizedPlaylists]);

  // Loading state UI
  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-spotify-green" />
        <span className="ml-2 text-lg font-medium">Loading your music...</span>
      </div>
    );
  }

  // Error state UI
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <X className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-spotify-green px-6 py-2 font-medium text-white hover:bg-spotify-green/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const handleSavePlaylist = async () => {
    const loadingToastId = showToast('loading', 'Creating playlist...', 'Please wait while we set everything up');

    try {
      if (!token || !user?.id) {
        toast.dismiss(loadingToastId);
        showToast('error', 'Authentication Error', 'Please log in to save playlists');
        return;
      }

      // Create playlist
      const playlistData = await spotifyApi.post(`users/${user.id}/playlists`, {
        name: playlistModalData?.name || 'Discovered Tracks',
        description: playlistModalData?.description || 'Generated playlist based on your music taste',
        public: false
      });

      // Add tracks to playlist
      const trackUris = tracks.map((track: SpotifyTrack) => `spotify:track:${track.id}`);
      await spotifyApi.post(`playlists/${playlistData.id}/tracks`, {
        uris: trackUris
      });

      // Show success toast
      toast.dismiss(loadingToastId);
      toast.success('Playlist Created!', {
        description: (
          <div className="space-y-2">
            <p className="font-medium">{playlistData.name}</p>
            <p className="text-sm text-gray-400">{trackUris.length} tracks added</p>
            <a 
              href={`https://open.spotify.com/playlist/${playlistData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Open in Spotify →
            </a>
          </div>
        ),
        duration: 5000,
      });
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error('Failed to Create Playlist', {
        description: 'Please try again later',
      });
    }
  };

  const handlePlayPause = async () => {
    if (!token) return;
    
    try {
      const endpoint = currentlyPlaying?.is_playing ? 'me/player/pause' : 'me/player/play';
      await spotifyApi.put(endpoint);
      await fetchCurrentlyPlaying(true);
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      toast.error('Failed to control playback');
    }
  };

  const handleSkipNext = async () => {
    if (!token) return;
    
    try {
      await spotifyApi.post('me/player/next', {});
      // Wait for Spotify API to update
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchCurrentlyPlaying(true);
    } catch (error) {
      console.error('Failed to skip track:', error);
      toast.error('Failed to skip track', {
        description: 'Please try again or check your Spotify connection'
      });
    }
  };

  const handleSkipPrevious = async () => {
    if (!token) return;
    
    try {
      await spotifyApi.post('me/player/previous', {});
      // Wait for Spotify API to update
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchCurrentlyPlaying(true);
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
      toast.error('Failed to skip to previous track', {
        description: 'Please try again or check your Spotify connection'
      });
    }
  };

  const fetchTrackDetails = async (trackId: string) => {
    if (!token) return;
    
    try {
      const [features, analysis] = await Promise.all([
        spotifyApi.get(`audio-features/${trackId}`),
        spotifyApi.get(`audio-analysis/${trackId}`)
      ]);

      setTrackDetails({
        audioFeatures: features,
        audioAnalysis: analysis
      });
    } catch (error) {
      console.error('Failed to fetch track details:', error);
      toast.error('Failed to load track details');
    }
  };

  const handleAddToLiked = async () => {
    if (!currentlyPlaying?.item || !token) return;
    
    try {
      toast.loading('Adding to your Liked Songs...', { id: 'like-song' });

      const [isLiked] = await spotifyApi.get(`me/tracks/contains?ids=${currentlyPlaying.item.id}`);

      if (isLiked) {
        toast.dismiss('like-song');
        toast('Already in Your Library', {
          icon: '💚',
          description: 'This track is already in your Liked Songs!'
        });
        return;
      }

      await spotifyApi.put('me/tracks', {
        ids: [currentlyPlaying.item.id]
      });

      toast.dismiss('like-song');
      toast.success('Added to Your Library', {
        icon: '🎵',
        description: (
          <div className="flex items-center gap-3">
            <img 
              src={currentlyPlaying.item.album.images[0]?.url} 
              alt="" 
              className="w-10 h-10 rounded"
            />
            <div>
              <p className="font-medium">{currentlyPlaying.item.name}</p>
              <p className="text-sm text-gray-400">{currentlyPlaying.item.artists[0].name}</p>
            </div>
          </div>
        ),
        duration: 4000
      });
      setIsTrackModalOpen(false);
    } catch (error) {
      toast.dismiss('like-song');
      toast.error('Failed to Add to Library', {
        description: 'Please try again later'
      });
    }
  };

  const renderLoadingState = () => (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Analyzing your music taste...</p>
      </div>
    </div>
  );

  const renderSimilarSongsToast = (currentTrack: SpotifyTrack) => (
    <div className="flex items-center gap-4">
      <div className="relative">
        <img 
          src={currentTrack.album.images[0]?.url} 
          alt="" 
          className="w-12 h-12 rounded-lg shadow-md"
        />
        <div className="absolute inset-0 bg-emerald-500/20 rounded-lg animate-pulse" />
      </div>
      <div>
        <p className="font-semibold text-white">Finding Similar Tracks</p>
        <p className="text-sm text-gray-400">Analyzing "{currentTrack.name}"</p>
      </div>
      <div className="ml-auto">
        <div className="w-5 h-5 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const renderSuccessToast = (currentTrack: SpotifyTrack, tracksCount: number) => (
    <div className="flex items-center gap-4">
      <div className="relative">
        <img 
          src={currentTrack.album.images[0]?.url} 
          alt="" 
          className="w-12 h-12 rounded-lg shadow-md"
        />
        <div className="absolute bottom-0 right-0 bg-emerald-500 rounded-full p-1">
          <ListMusic className="w-3 h-3 text-white" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-white">Found Similar Tracks!</p>
        <p className="text-sm text-gray-400">
          {tracksCount} tracks discovered based on your selection
        </p>
      </div>
    </div>
  );

  const handleGetSimilarSongs = async () => {
    if (!currentlyPlaying?.item || !token) return;
    setIsTrackModalOpen(false);
    
    try {
      toast.loading(
        renderSimilarSongsToast(currentlyPlaying.item),
        { id: 'similar-songs', duration: 10000 }
      );

      // Get audio features of current track
      const features = await spotifyApi.get(`audio-features/${currentlyPlaying.item.id}`);

      // Get recommendations
      const data = await spotifyApi.get(
        `recommendations?${new URLSearchParams({
          seed_tracks: currentlyPlaying.item.id,
          target_energy: features.energy.toString(),
          target_danceability: features.danceability.toString(),
          target_valence: features.valence.toString(),
          limit: '100'
        })}`
      );

      toast.dismiss('similar-songs');
      toast.success(
        renderSuccessToast(currentlyPlaying.item, data.tracks.length),
        { duration: 3000 }
      );

      navigate('/discover', { 
        state: { 
          seedTrack: currentlyPlaying.item,
          recommendations: data.tracks,
          mode: 'similar',
          title: `Similar to "${currentlyPlaying.item.name}"`,
          description: `Songs similar to ${currentlyPlaying.item.name} by ${currentlyPlaying.item.artists[0].name}`
        } 
      });
    } catch (error) {
      console.error('Failed to get similar songs:', error);
      toast.dismiss('similar-songs');
      toast.error('Failed to find similar tracks. Please try again later.');
    }
  };

  const handleNowPlayingClick = (e: React.MouseEvent) => {
    const isButton = (e.target as HTMLElement).closest('button');
    if (!isButton) {
      setIsTrackModalOpen(true);
      if (currentlyPlaying?.item) {
        fetchTrackDetails(currentlyPlaying.item.id);
      }
    }
  };

  if (loading || isGenerating) {
    return renderLoadingState();
  }

  console.log('Currently Playing:', currentlyPlaying);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
      {/* Welcome Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome back, {user?.display_name}! 👋
        </h1>
        <p className="text-gray-300 text-lg">
          Here are your personalized playlists based on your recent activity
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        <button
          onClick={() => navigate('/create')}
          className="p-6 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <Plus className="w-8 h-8 text-emerald-500" />
            <ArrowRight className="w-6 h-6 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-semibold text-white text-left">Create New Playlist</h3>
          <p className="text-gray-400 text-sm text-left mt-2">
            Organize your music into custom playlists
          </p>
        </button>

        <button
          onClick={() => navigate('/discover')}
          className="p-6 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <Search className="w-8 h-8 text-purple-500" />
            <ArrowRight className="w-6 h-6 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-semibold text-white text-left">Discover New Music</h3>
          <p className="text-gray-400 text-sm text-left mt-2">
            Find similar artists and tracks
          </p>
        </button>

        <button
          onClick={() => navigate('/organize')}
          className="p-6 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <Music className="w-8 h-8 text-blue-500" />
            <ArrowRight className="w-6 h-6 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-semibold text-white text-left">Organize Library</h3>
          <p className="text-gray-400 text-sm text-left mt-2">
            Clean up and sort your music collection
          </p>
        </button>
      </div>

      {/* Now Playing Card */}
      <div className="w-full mb-12">
        {currentlyPlaying?.item ? (
          <div 
            key={currentlyPlaying.item.id}
            onClick={() => setIsTrackModalOpen(true)}
            className="w-full p-8 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-emerald-400/5 hover:from-emerald-500/10 hover:via-emerald-500/15 hover:to-emerald-400/10 rounded-2xl backdrop-blur-sm border border-emerald-500/10 hover:border-emerald-500/20 transition-all duration-500 cursor-pointer group shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
          >
            <div className="flex items-center gap-8 max-w-7xl mx-auto">
              {/* Album Art with Enhanced Animation */}
              <div className="relative flex-shrink-0">
                <img 
                  src={currentlyPlaying.item.album.images[0]?.url}
                  alt={currentlyPlaying.item.album.name}
                  className="w-32 h-32 rounded-lg shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-emerald-500/20 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700" />
              </div>

              {/* Track Info with Enhanced Typography */}
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white mb-2 line-clamp-1 group-hover:text-emerald-300 transition-colors duration-300">
                  {currentlyPlaying.item.name}
                </h3>
                <p className="text-lg text-gray-400 mb-6 line-clamp-1 group-hover:text-emerald-400/70 transition-colors duration-300">
                  {currentlyPlaying.item.artists.map(a => a.name).join(', ')}
                </p>

                {/* Playback Controls with Enhanced Animation */}
                <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleSkipPrevious}
                    className="p-3 text-gray-400 hover:text-emerald-400 transition-all duration-300 hover:scale-110 hover:bg-emerald-500/10 rounded-full"
                    aria-label="Previous track"
                  >
                    <SkipBack className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={handlePlayPause}
                    className="p-4 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white rounded-full hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 transform-gpu"
                    aria-label={currentlyPlaying.is_playing ? "Pause" : "Play"}
                  >
                    {currentlyPlaying.is_playing ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  
                  <button
                    onClick={handleSkipNext}
                    className="p-3 text-gray-400 hover:text-emerald-400 transition-all duration-300 hover:scale-110 hover:bg-emerald-500/10 rounded-full"
                    aria-label="Next track"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Action Buttons with Enhanced Hover Effects */}
              <div className="flex gap-4" onClick={e => e.stopPropagation()}>
                <button
                  onClick={handleGetSimilarSongs}
                  className="p-3 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20 border border-emerald-500/20"
                  aria-label="Find similar songs"
                >
                  <ListMusic className="w-6 h-6" />
                </button>
                <button
                  onClick={handleAddToLiked}
                  className="p-3 text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/20 border border-pink-500/20"
                  aria-label="Add to liked songs"
                >
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full p-8 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-emerald-400/5 rounded-2xl backdrop-blur-sm border border-emerald-500/10 shadow-lg shadow-emerald-500/10">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-emerald-300 mb-2">No Track Playing</h2>
              <p className="text-gray-400 text-lg">
                Start playing something on Spotify to see it here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Track Details Modal */}
      <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50" />
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800/90 rounded-2xl shadow-2xl z-50 border border-white/10 overflow-hidden">
          <div className="overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="p-10">
              <div className="animate-in slide-in-from-bottom duration-300">
                {currentlyPlaying?.item && (
                  <>
                    {/* Enhanced Header */}
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                          Track Analysis
                        </h2>
                        <p className="text-gray-400">Discover the musical characteristics</p>
                      </div>
                      <button 
                        onClick={() => setIsTrackModalOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:rotate-90"
                      >
                        <X className="w-6 h-6 text-gray-400" />
                      </button>
                    </div>

                    {/* Enhanced Track Info Section */}
                    <div className="flex gap-8 mb-8 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
                      <div className="relative group">
                        <img 
                          src={currentlyPlaying.item.album.images[0]?.url}
                          alt={currentlyPlaying.item.album.name}
                          className="w-48 h-48 rounded-lg shadow-xl transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-bold text-white mb-3 line-clamp-2">
                          {currentlyPlaying.item.name}
                        </h3>
                        <p className="text-xl text-gray-300 mb-4">
                          {currentlyPlaying.item.artists.map(a => a.name).join(', ')}
                        </p>
                        <div className="space-y-2">
                          <p className="text-gray-400">
                            <span className="text-gray-500">Album:</span> {currentlyPlaying.item.album.name}
                          </p>
                          <p className="text-gray-400">
                            <span className="text-gray-500">Duration:</span> {Math.floor(currentlyPlaying.item.duration_ms / 60000)}:{String(Math.floor((currentlyPlaying.item.duration_ms % 60000) / 1000)).padStart(2, '0')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Audio Features Grid */}
                    {trackDetails.audioFeatures && (
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        {/* Energy Meter */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-6 rounded-xl backdrop-blur-sm border border-white/10">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                            <h4 className="text-sm font-medium text-gray-400">Energy</h4>
                              <p className="text-xs text-gray-500">Track's intensity and activity</p>
                            </div>
                            <span className="text-2xl font-bold text-white">
                              {Math.round(trackDetails.audioFeatures.energy * 100)}%
                            </span>
                          </div>
                          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${trackDetails.audioFeatures.energy * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Danceability Meter */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-6 rounded-xl backdrop-blur-sm border border-white/10">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">Danceability</h4>
                              <p className="text-xs text-gray-500">How suitable for dancing</p>
                            </div>
                            <span className="text-2xl font-bold text-white">
                              {Math.round(trackDetails.audioFeatures.danceability * 100)}%
                            </span>
                          </div>
                          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${trackDetails.audioFeatures.danceability * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Valence (Mood) Meter */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-6 rounded-xl backdrop-blur-sm border border-white/10">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">Valence (Mood)</h4>
                              <p className="text-xs text-gray-500">Musical positiveness</p>
                            </div>
                            <span className="text-2xl font-bold text-white">
                              {Math.round(trackDetails.audioFeatures.valence * 100)}%
                            </span>
                          </div>
                          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${trackDetails.audioFeatures.valence * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Tempo Display */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-6 rounded-xl backdrop-blur-sm border border-white/10">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">Tempo</h4>
                              <p className="text-xs text-gray-500">Track speed (BPM)</p>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-white">
                                {Math.round(trackDetails.audioFeatures.tempo)}
                              </span>
                              <span className="text-sm text-gray-400 ml-1">BPM</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Action Buttons */}
                    <div className="flex gap-4 mt-8">
                      <button
                        onClick={handleAddToLiked}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-200 hover:scale-[1.02] group border border-white/10"
                      >
                        <Heart className="w-5 h-5 group-hover:text-pink-500 transition-colors" />
                        <span>Add to Liked Songs</span>
                      </button>
                      
                      <button
                        onClick={handleGetSimilarSongs}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl transition-all duration-200 hover:scale-[1.02] group shadow-lg shadow-emerald-500/20"
                      >
                        <ListMusic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>Discover Similar</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;