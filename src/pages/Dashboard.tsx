import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Music, 
  Plus, 
  Search,
  Loader2,
  ArrowRight,
  Heart,
  ListMusic,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { NowPlaying } from '@/components/NowPlaying';

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
const PLAYBACK_POLL_INTERVAL = 5000; // 5 seconds
const BACKGROUND_POLL_INTERVAL = 30000; // 30 seconds

const Dashboard = () => {
  const [autoPlaylists, setAutoPlaylists] = useState<AutoPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  const { user, token, spotifyApi } = useAuth();
  const navigate = useNavigate();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundPollRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const fetchCurrentlyPlaying = useCallback(async (force = false) => {
    if (!token || isPollingRef.current) return;
    
    try {
      isPollingRef.current = true;
      const data = await spotifyApi.get('me/player');
      
      if (!data || !data.item) {
        setCurrentlyPlaying(null);
        localStorage.removeItem(CACHE_KEYS.CURRENT_TRACK);
        return;
      }

      const newState = {
        item: data.item,
        is_playing: data.is_playing,
        progress_ms: data.progress_ms
      };

      setCurrentlyPlaying(newState);
      localStorage.setItem(CACHE_KEYS.CURRENT_TRACK, JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to fetch currently playing:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [token, spotifyApi]);

  const generatePersonalizedPlaylists = useCallback(async (force = false) => {
    try {
      // Check cache first
      const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
      const cachedPlaylists = localStorage.getItem(CACHE_KEYS.RECENTLY_PLAYED);
      
      if (!force && lastFetch && cachedPlaylists) {
        const timestamp = parseInt(lastFetch);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAutoPlaylists(JSON.parse(cachedPlaylists));
          return;
        }
      }

      const tracksData = await spotifyApi.get('me/tracks?limit=50');
      const tracks = tracksData.items.map((item: any) => ({
        ...item.track,
        type: 'track',
        is_local: item.track.is_local || false,
        disc_number: item.track.disc_number || 1,
        track_number: item.track.track_number || 1,
        explicit: item.track.explicit || false,
        preview_url: item.track.preview_url || null,
        popularity: item.track.popularity || 0,
        available_markets: item.track.available_markets || [],
        external_ids: item.track.external_ids || {},
        external_urls: item.track.external_urls || { spotify: '' },
        href: item.track.href || '',
        uri: item.track.uri || '',
        album: {
          ...item.track.album,
          type: 'album',
          album_type: item.track.album.album_type || 'album',
          release_date_precision: item.track.album.release_date_precision || 'day',
          total_tracks: item.track.album.total_tracks || 1,
          uri: item.track.album.uri || '',
          href: item.track.album.href || '',
          external_urls: item.track.album.external_urls || { spotify: '' },
          artists: item.track.album.artists.map((artist: any) => ({
            ...artist,
            type: 'artist',
            uri: artist.uri || '',
            href: artist.href || '',
            external_urls: artist.external_urls || { spotify: '' }
          }))
        },
        artists: item.track.artists.map((artist: any) => ({
          ...artist,
          type: 'artist',
          uri: artist.uri || '',
          href: artist.href || '',
          external_urls: artist.external_urls || { spotify: '' }
        }))
      }));

      const generatedPlaylists = [
        {
          id: 'recent',
          name: 'Recently Added',
          description: 'Your latest musical discoveries',
          tracks: tracks.slice(0, 20),
          isEditing: false
        }
      ];

      setAutoPlaylists(generatedPlaylists);
      
      // Update cache
      localStorage.setItem(CACHE_KEYS.RECENTLY_PLAYED, JSON.stringify(generatedPlaylists));
      localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
    } catch (error) {
      console.error('Failed to generate playlists:', error);
      toast.error('Failed to load your music data');
    }
  }, [spotifyApi]);

  // Initial data load
  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const initializeDashboard = async () => {
      setLoading(true);
      try {
        await Promise.all([
          generatePersonalizedPlaylists(),
          fetchCurrentlyPlaying(true)
        ]);
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [token, navigate, generatePersonalizedPlaylists, fetchCurrentlyPlaying]);

  // Set up polling
  useEffect(() => {
    if (!token) return;

    // Active tab polling
    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCurrentlyPlaying();
      }
    }, PLAYBACK_POLL_INTERVAL);

    // Background polling
    backgroundPollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        generatePersonalizedPlaylists();
      }
    }, BACKGROUND_POLL_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCurrentlyPlaying(true);
        generatePersonalizedPlaylists();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (backgroundPollRef.current) clearInterval(backgroundPollRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, fetchCurrentlyPlaying, generatePersonalizedPlaylists]);

  const handlePlaybackChange = useCallback(async () => {
    await fetchCurrentlyPlaying(true);
  }, [fetchCurrentlyPlaying]);

  const handleEditName = (playlistId: string) => {
    setAutoPlaylists(playlists => 
      playlists.map(p => 
        p.id === playlistId ? { ...p, isEditing: true } : p
      )
    );
  };

  const handleNameChange = (playlistId: string, newName: string) => {
    setAutoPlaylists(playlists =>
      playlists.map(p =>
        p.id === playlistId ? { ...p, name: newName, isEditing: false } : p
      )
    );
  };

  const showToast = (
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
  };

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
      await spotifyApi.post('me/player/next');
      setTimeout(() => fetchCurrentlyPlaying(true), 100);
    } catch (error) {
      console.error('Failed to skip track:', error);
      toast.error('Failed to skip track');
    }
  };

  const handleSkipPrevious = async () => {
    if (!token) return;
    
    try {
      await spotifyApi.post('me/player/previous');
      setTimeout(() => fetchCurrentlyPlaying(true), 100);
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
      toast.error('Failed to skip to previous track');
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

      {/* Now Playing Section */}
      {currentlyPlaying?.item && (
        <NowPlaying
          currentTrack={currentlyPlaying.item}
          isPlaying={currentlyPlaying.is_playing}
          onPlaybackChange={handlePlaybackChange}
          onGetSimilar={handleGetSimilarSongs}
          onAddToLiked={handleAddToLiked}
        />
      )}

      {!currentlyPlaying && (
        <div className="mb-12 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Playback Status</h2>
          <p className="text-gray-400">
            No track currently playing. Make sure:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-2">
            <li>Spotify is open and playing music</li>
            <li>You're using the same Spotify account</li>
            <li>Your device is active and online</li>
          </ul>
        </div>
      )}

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