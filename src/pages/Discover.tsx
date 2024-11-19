import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Music, 
  Loader2, 
  Radio, 
  Home, 
  PlayCircle, 
  Plus, 
  Sparkles, 
  ArrowRight,
  ChevronRight,
  Save,
  Clock,
  RefreshCw,
  Search,
  ChevronLeft,
  Pause,
  XCircle
} from 'lucide-react';
import PlaylistSaveModal from '../components/PlaylistSaveModal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import type { Track } from '../types/spotify';

interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}

interface TopTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
  preview_url?: string;
  played_at?: number;
}

interface CachedData<T> {
  timestamp: number;
  data: T;
}

const ONE_HOUR = 3600000; // 1 hour in milliseconds (3,600,000 ms = 1 hour)

interface LocationState {
  seedTrack?: Track;
  recommendations?: Track[];
  mode?: 'similar' | 'discover';
  title?: string;
  description?: string;
}

const Discover = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [selectedArtistTracks, setSelectedArtistTracks] = useState<any[]>([]);
  const [similarTracks, setSimilarTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TopTrack | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlistModalData, setPlaylistModalData] = useState<{
    name: string;
    description: string;
    tracks: any[];
  } | null>(null);
  const [selectionType, setSelectionType] = useState<'artist' | 'track'>('artist');
  const [artistSearch, setArtistSearch] = useState('');
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number>(0);
  const { token } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [shouldShowResults, setShouldShowResults] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredArtists = topArtists.filter(artist => 
    artist.name.toLowerCase().includes(artistSearch.toLowerCase()) ||
    artist.genres.some(genre => genre.toLowerCase().includes(artistSearch.toLowerCase()))
  );

  const shouldRefreshData = () => {
    const now = Date.now();
    return now - lastFetchTimestamp >= ONE_HOUR;
  };

  useEffect(() => {
    const initializeData = async () => {
      const cachedArtists = localStorage.getItem('cached_top_artists');
      const cachedTracks = localStorage.getItem('cached_top_tracks');
      
      if (cachedArtists && cachedTracks) {
        const artistsData: CachedData<Artist[]> = JSON.parse(cachedArtists);
        const tracksData: CachedData<TopTrack[]> = JSON.parse(cachedTracks);
        
        if (!shouldRefreshData()) {
          setTopArtists(artistsData.data);
          setTopTracks(tracksData.data);
          setLastFetchTimestamp(artistsData.timestamp);
          setLoading(false);
          return;
        }
      }
      
      await Promise.all([fetchTopArtists(), fetchTopTracks()]);
    };

    initializeData();
  }, []);

  useEffect(() => {
    const initializeDiscoverPage = async () => {
      setLoading(true);
      
      if (state?.recommendations) {
        setTracks(state.recommendations);
        toast.success(`Found ${state.recommendations.length} similar tracks!`);
      } else {
        try {
          if (!token) throw new Error('No token available');
        const discoveredTracks = await fetchDiscoverTracks(token);
        setTracks(discoveredTracks);
        } catch (error) {
          console.error('Error initializing discover page:', error);
          toast.error('Failed to load recommendations');
        }
      }
      
      setLoading(false);
    };

    initializeDiscoverPage();
  }, [state, token]);

  useEffect(() => {
    if (state?.mode === 'similar' && state.recommendations) {
      setSelectedArtistTracks(state.recommendations);
      setSelectedTrack({
        id: state.seedTrack?.id || '',
        name: state.seedTrack?.name || '',
        artists: state.seedTrack?.artists || [],
        album: {
          images: state.seedTrack?.album.images || []
        }
      });
    }
  }, [state]);

  const fetchTopArtists = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const timestamp = Date.now();
        
        const cacheData: CachedData<Artist[]> = {
          timestamp,
          data: data.items
        };
        
        localStorage.setItem('cached_top_artists', JSON.stringify(cacheData));
        setTopArtists(data.items);
        setLastFetchTimestamp(timestamp);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch top artists:', error);
      setLoading(false);
    }
  };

  const fetchSimilarTracks = async (trackId: string) => {
    try {
      // First get the track's audio features and details
      const [trackResponse, featuresResponse] = await Promise.all([
        fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const trackData = await trackResponse.json();
      const features = await featuresResponse.json();

      // Get artist details for genre information
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${trackData.artists[0].id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const artistData = await artistResponse.json();

      // Use all this information for better recommendations
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?` + new URLSearchParams({
          seed_tracks: trackId,
          seed_artists: trackData.artists[0].id,
          seed_genres: artistData.genres[0] || '',
          target_energy: features.energy.toString(),
          target_danceability: features.danceability.toString(),
          target_valence: features.valence.toString(),
          min_popularity: '20',
          limit: '100'
        }),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to get recommendations');
      
      const data = await response.json();
      setTracks(data.tracks);
      
    } catch (error) {
      console.error('Failed to fetch similar tracks:', error);
      toast.error('Failed to find similar tracks');
    }
  };

  const fetchTopTracks = async () => {
    try {
      if (!token) return;
      
      // Get current timestamp in milliseconds for 'before' parameter
      const currentTimestamp = Date.now();
      
      // Fetch last 50 recently played tracks
      const recentlyPlayedResponse = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=50`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      // Also fetch user's top tracks
      const topTracksResponse = await fetch(
        'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term',
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!recentlyPlayedResponse.ok || !topTracksResponse.ok) {
        throw new Error('Failed to fetch tracks');
      }

      const recentlyPlayedData = await recentlyPlayedResponse.json();
      const topTracksData = await topTracksResponse.json();

      // Process recently played tracks with proper timestamp handling
      const recentTracks = recentlyPlayedData.items.map((item: any) => ({
        ...item.track,
        played_at: new Date(item.played_at).getTime(),
        isRecent: true // Flag to identify recent tracks
      }));

      // Sort recent tracks by most recent first
      recentTracks.sort((a: any, b: any) => b.played_at - a.played_at);

      // Process top tracks
      const topTracks = topTracksData.items.map((track: any) => ({
        ...track,
        isTop: true // Flag to identify top tracks
      }));

      // Combine tracks with priority
      const seenIds = new Set();
      const uniqueTracks: TopTrack[] = [];

      // First add recent tracks
      for (const track of recentTracks) {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          uniqueTracks.push({
            id: track.id,
            name: track.name,
            artists: track.artists,
            album: track.album,
            preview_url: track.preview_url,
            played_at: track.played_at // Keep timestamp for recent tracks
          });
        }
      }

      // Then add top tracks if we have space
      for (const track of topTracks) {
        if (!seenIds.has(track.id) && uniqueTracks.length < 50) {
          seenIds.add(track.id);
          uniqueTracks.push({
            id: track.id,
            name: track.name,
            artists: track.artists,
            album: track.album,
            preview_url: track.preview_url
          });
        }
      }

      // Update cache with timestamp
      const cacheData: CachedData<TopTrack[]> = {
        timestamp: currentTimestamp,
        data: uniqueTracks.slice(0, 50)
      };

      localStorage.setItem('cached_top_tracks', JSON.stringify(cacheData));
      setTopTracks(uniqueTracks.slice(0, 50));

      // Log for verification
      console.log(`Fetched ${recentTracks.length} recent tracks and ${topTracks.length} top tracks`);
      console.log(`Combined into ${uniqueTracks.length} unique tracks`);

    } catch (error) {
      console.error('Failed to fetch tracks:', error);
      if (error instanceof Error && error.message.includes('401')) {
        window.location.href = '/login';
      }
    }
  };

  const shuffleRecommendations = async () => {
    if (!selectedArtist && !selectedTrack) return;
    
    setSelectedArtistTracks([]); // Clear current tracks while loading
    
    try {
      const token = localStorage.getItem('spotify_access_token');
      const endpoint = selectionType === 'artist' 
        ? `recommendations?seed_artists=${selectedArtist?.id}`
        : `recommendations?seed_tracks=${selectedTrack?.id}`;
      
      const response = await fetch(
        `https://api.spotify.com/v1/${endpoint}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSelectedArtistTracks(data.tracks);
      }
    } catch (error) {
      console.error('Failed to fetch new recommendations:', error);
    }
  };

  const handleArtistClick = async (artist: Artist) => {
    setSelectionType('artist');
    setSelectedArtist(artist);
    setSelectedTrack(null);
    setSelectedArtistTracks([]); // Clear current tracks while loading
    
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_artists=${artist.id}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSelectedArtistTracks(data.tracks);
      }
    } catch (error) {
      console.error('Failed to fetch similar tracks:', error);
    }
  };

  const handleTrackClick = async (track: TopTrack) => {
    setSelectionType('track');
    setSelectedTrack(track);
    setSelectedArtist(null);
    setSelectedArtistTracks([]); // Clear current tracks while loading
    
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_tracks=${track.id}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSelectedArtistTracks(data.tracks);
      }
    } catch (error) {
      console.error('Failed to fetch similar tracks:', error);
    }
  };

  const showToast = (
    type: 'success' | 'error' | 'loading', 
    message: string, 
    description?: string | { description: string; icon?: React.ReactNode; style?: React.CSSProperties }
  ) => {
    const getToastStyles = (type: 'success' | 'error' | 'loading') => {
      switch (type) {
        case 'success':
          return {
            className: `
              rounded-xl border shadow-2xl backdrop-blur-md
              animate-slideIn transition-all duration-300
              hover:translate-y-[-2px]
              bg-emerald-900/90 border-emerald-500/20
              hover:shadow-emerald-500/10
            `,
            icon: <Sparkles className="w-5 h-5 text-emerald-400" />
          };
        case 'error':
          return {
            className: `
              rounded-xl border shadow-2xl backdrop-blur-md
              animate-slideIn transition-all duration-300
              hover:translate-y-[-2px]
              bg-red-950/90 border-red-500/20
              hover:shadow-red-500/10
            `,
            icon: <XCircle className="w-5 h-5 text-red-400" />
          };
        case 'loading':
          return {
            className: `
              rounded-xl border shadow-2xl backdrop-blur-md
              animate-slideIn transition-all duration-300
              bg-gray-900/90 border-white/10
            `,
            icon: <Loader2 className="w-5 h-5 text-white animate-spin" />
          };
      }
    };

    const toastStyles = getToastStyles(type);
    const toastConfig = {
      ...toastStyles,
      descriptionClassName: `text-${type === 'success' ? 'emerald' : type === 'error' ? 'red' : 'gray'}-200 font-medium`,
      duration: 3000, // Set a fixed duration for all toasts
      position: "bottom-right" as const,
      dismissible: true,
      closeButton: true,
    };

    // Create a unique ID for loading toasts
    const toastId = `toast-${type}-${Date.now()}`;

    if (type === 'loading') {
      // For loading toasts, return the ID so we can dismiss it later
      return toast.loading(message, {
        ...toastConfig,
        id: toastId,
        description: description as string
      });
    } else {
      // For success/error, automatically dismiss any loading toasts
      toast.dismiss();
      
      if (typeof description === 'object') {
        toast[type](message, {
          ...toastConfig,
          ...description,
          style: {
            ...description.style,
            transform: 'scale(1)',
            transition: 'all 0.2s ease'
          }
        });
      } else {
        toast[type](message, {
          ...toastConfig,
          description,
        });
      }
    }

    return toastId;
  };

  const handleSavePlaylist = async () => {
    const loadingToastId = showToast('loading', 'Creating playlist...', 'Please wait while we set everything up');

    try {
      if (!token) {
        toast.dismiss(loadingToastId);
        showToast('error', 'Authentication Error', 'Please log in to save playlists');
        return;
      }

      // Get user ID first
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const userData = await userResponse.json();

      // Create playlist with better error handling
      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: playlistModalData?.name || 'Discovered Tracks',
            description: playlistModalData?.description || 'Generated playlist based on your music taste',
            public: false
          })
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error?.message || 'Failed to create playlist');
      }

      const playlist = await createResponse.json();

      // Add tracks in smaller chunks to avoid API limits
      const tracksToAdd = tracks.map(track => `spotify:track:${track.id}`);
      const chunkSize = 50; // Reduced from 100 to be safer
      
      for (let i = 0; i < tracksToAdd.length; i += chunkSize) {
        const chunk = tracksToAdd.slice(i, i + chunkSize);
        const addTracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: chunk })
          }
        );

        if (!addTracksResponse.ok) {
          throw new Error(`Failed to add tracks chunk ${i / chunkSize + 1}`);
        }
      }

      // On success, dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      showToast('success', 'Playlist Created!', {
        description: 'Your new playlist has been saved to Spotify',
        style: {
          background: 'linear-gradient(to right, rgb(6, 95, 70), rgb(17, 24, 39))',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '1rem',
        }
      });
    } catch (error) {
      // On error, dismiss loading toast and show error
      toast.dismiss(loadingToastId);
      showToast('error', 'Failed to create playlist', {
        description: error instanceof Error ? error.message : 'Please try again later',
        style: {
          background: 'linear-gradient(to right, rgb(127, 29, 29), rgb(17, 24, 39))',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '1rem',
        }
      });
    }
  };

  const renderSimilarTracksHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-white">
          {selectedArtist 
            ? `Similar to ${selectedArtist.name}`
            : selectedTrack 
              ? `Similar to ${selectedTrack.name}`
              : 'Select an Artist or Track'}
        </h3>
        <p className="text-gray-400 text-sm">
          {selectedArtistTracks.length} similar tracks found
        </p>
      </div>
      <div className="flex items-center gap-3">
        {(selectedArtist || selectedTrack) && (
          <button
            onClick={shuffleRecommendations}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-full 
              hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Shuffle Again
          </button>
        )}
        {selectedArtistTracks.length > 0 && (
          <button
            onClick={() => {
              const name = selectedArtist 
                ? `Similar to ${selectedArtist.name}`
                : selectedTrack 
                  ? `Similar to ${selectedTrack.name}`
                  : 'Similar Tracks';
                  
              const description = `Generated playlist based on ${
                selectedArtist ? selectedArtist.name : selectedTrack?.name
              }`;

              setPlaylistModalData({
                name,
                description,
                tracks: selectedArtistTracks
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full 
              hover:bg-emerald-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save as Playlist
          </button>
        )}
      </div>
    </div>
  );

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = 600; // Adjust this value to control scroll distance
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchTopArtists(), fetchTopTracks()]);
  };

  const handleSaveAsPlaylist = async () => {
    try {
      toast.loading('Creating playlist...', { id: 'create-playlist' });

      // First create the playlist
      const createResponse = await fetch(`https://api.spotify.com/v1/me/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: state?.title || 'Discovered Tracks',
          description: state?.description || 'Generated playlist based on your music taste',
          public: false
        })
      });

      if (!createResponse.ok) throw new Error('Failed to create playlist');
      
      const playlist = await createResponse.json();

      // Then add tracks to it
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: tracks.map(track => `spotify:track:${track.id}`)
        })
      });

      if (!addTracksResponse.ok) throw new Error('Failed to add tracks');

      toast.dismiss('create-playlist');
      toast.success('Playlist Created!', {
        description: 'Your new playlist has been saved to your Spotify account'
      });

    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast.dismiss('create-playlist');
      toast.error('Failed to create playlist', {
        description: 'Please try again later'
      });
    }
  };

  const fetchDiscoverTracks = async (token: string) => {
    try {
      // Get user's top tracks for seeds
      const topTracksRes = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!topTracksRes.ok) throw new Error('Failed to fetch top tracks');
      const topTracks = await topTracksRes.json();
      
      // Use top tracks as seeds for recommendations
      const seedTracks = topTracks.items.map((track: Track) => track.id).join(',');
      const recommendationsRes = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!recommendationsRes.ok) throw new Error('Failed to fetch recommendations');
      const recommendations = await recommendationsRes.json();
      return recommendations.tracks;
    } catch (error) {
      console.error('Error fetching discover tracks:', error);
      return [];
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim() || !token) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to search');
      
      const data = await response.json();
      setSearchResults(data.tracks.items);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleGetSimilarSongs = async (trackId: string) => {
    try {
      toast.loading('Finding similar songs...', { id: 'similar-songs' });

      // Get audio features
      const featuresResponse = await fetch(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const features = await featuresResponse.json();

      // Get recommendations
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?` + new URLSearchParams({
          seed_tracks: trackId,
          target_energy: features.energy.toString(),
          target_danceability: features.danceability.toString(),
          target_valence: features.valence.toString(),
          limit: '100'
        }),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to get recommendations');
      
      const data = await response.json();
      setTracks(data.tracks);
      toast.dismiss('similar-songs');
      toast.success(`Found ${data.tracks.length} similar tracks!`);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      toast.error('Failed to get similar songs');
    }
  };

  const handleSearchResultClick = (track: Track) => {
    // Reset search state
    setSearchQuery('');
    setSearchResults([]);
    setShouldShowResults(false);
    
    // Navigate to similar tracks
    navigate('/discover', {
      state: {
        seedTrack: track,
        mode: 'similar',
        title: `Similar to "${track.name}"`,
        description: `Songs similar to ${track.name} by ${track.artists[0].name}`
      },
      replace: true
    });
    handleGetSimilarSongs(track.id);
  };

  useEffect(() => {
    setShouldShowResults(true);
  }, [location.pathname]);

  const handlePreviewPlay = (e: React.MouseEvent, trackPreviewUrl: string | null, track: Track) => {
    e.stopPropagation(); // Prevent card click event
    
    if (!trackPreviewUrl) {
      toast.error('No preview available for this track');
      return;
    }

    if (previewUrl === trackPreviewUrl && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPreviewUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPreviewUrl(trackPreviewUrl);
      setIsPlaying(true);
      
      // Create new audio instance
      const audio = new Audio(trackPreviewUrl);
      audioRef.current = audio;
      
      audio.play();
      audio.onended = () => {
        setIsPlaying(false);
        setPreviewUrl(null);
        
        // Update recent tracks when preview ends
        updateRecentTracks(track);
      };
    }
  };

  const updateRecentTracks = (newTrack: Track) => {
    setTopTracks(prevTracks => {
      // Create new track with current timestamp
      const trackWithTimestamp: TopTrack = {
        id: newTrack.id,
        name: newTrack.name,
        artists: newTrack.artists,
        album: newTrack.album,
        preview_url: newTrack.preview_url || undefined, // Convert null to undefined
        played_at: Date.now()
      };

      // Remove any existing instance of this track
      const filteredTracks = prevTracks.filter(t => t.id !== newTrack.id);

      // Add the new track at the beginning
      return [trackWithTimestamp, ...filteredTracks].slice(0, 50);
    });
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Enhanced modal styles
  const modalStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      animation: 'modalFadeIn 0.3s ease-out',
    },
    content: {
      background: 'linear-gradient(to bottom right, rgb(6, 95, 70), rgb(17, 24, 39))',
      borderRadius: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '2rem',
      maxWidth: '90%',
      width: '500px',
      animation: 'modalSlideIn 0.3s ease-out',
    }
  };

  // Add these animations to your global CSS
  const modalAnimations = `
  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalSlideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  `;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-emerald-950 via-gray-900 to-emerald-950">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-emerald-500 transition-colors"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </button>
              <span className="text-gray-500">/</span>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-semibold">Discover</h1>
                <button 
                  onClick={handleManualRefresh}
                  className="p-1.5 rounded-full hover:bg-gray-800/50 transition-colors"
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Global Search Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Quick Search</h2>
              <p className="text-gray-400">Find any song and discover similar tracks</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative max-w-2xl mb-4">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShouldShowResults(true);
                }}
                onFocus={() => setShouldShowResults(true)}
                placeholder="Search for any song..."
                className="w-full bg-gray-800/50 text-white pl-12 pr-4 py-3 rounded-full 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 
                  placeholder-gray-500 text-lg"
              />
              {isSearching && (
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin absolute right-4 top-1/2 transform -translate-y-1/2" />
              )}
            </div>

            {/* New Compact Search Results */}
            {searchResults.length > 0 && shouldShowResults && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
                {searchResults.map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => handleSearchResultClick(track)}
                    className="group bg-gray-800/30 rounded-lg overflow-hidden hover:bg-gray-800/50 
                      transition-all duration-300 cursor-pointer hover:scale-[1.02] relative"
                  >
                    <div className="aspect-square relative w-full">
                      <img 
                        src={track.album.images[0]?.url}
                        alt={track.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent 
                        opacity-90 transition-opacity" />
                      
                      {/* Preview Button */}
                      <button
                        onClick={(e) => handlePreviewPlay(e, track.preview_url, track)}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="bg-emerald-500 rounded-full p-2 transform scale-0 group-hover:scale-100 
                          transition-transform duration-200 hover:bg-emerald-600">
                          {previewUrl === track.preview_url && isPlaying ? (
                            <Pause className="w-4 h-4 text-white" />
                          ) : (
                            <PlayCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>
                    </div>
                    
                    <div className="p-2">
                      <h4 className="text-white font-medium text-xs truncate group-hover:text-emerald-500 
                        transition-colors">
                        {track.name}
                      </h4>
                      <p className="text-gray-400 text-[10px] truncate mt-0.5">
                        {track.artists.map(a => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Only show Artists section if NOT in similar mode */}
        {!state?.mode && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Your All-Time Artists</h2>
                <p className="text-gray-400">Artists you've listened to most overall</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                    placeholder="Search artists..."
                    className="bg-gray-800/50 text-white pl-10 pr-4 py-2 rounded-full text-sm 
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 
                      placeholder-gray-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">{filteredArtists.length} artists</span>
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>
            
            {/* Artists Grid with Navigation Buttons */}
            <div className="relative">
              {/* Left Navigation Button */}
              <button
                onClick={() => handleScroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10
                  w-12 h-12 bg-emerald-500/90 rounded-full flex items-center justify-center
                  hover:bg-emerald-600 transition-colors shadow-lg backdrop-blur-sm
                  hover:scale-110 transform duration-200 group"
              >
                <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </button>

              {/* Artists Container */}
              <div 
                ref={scrollContainerRef}
                className="overflow-x-hidden py-4"
              >
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {filteredArtists.map((artist) => (
                    <div 
                      key={artist.id} 
                      onClick={() => handleArtistClick(artist)}
                      className="group/card relative w-[200px] flex-shrink-0 bg-gray-800/30 
                        rounded-xl overflow-hidden hover:bg-gray-800/50 transition-all duration-300 
                        cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10"
                    >
                      <div className="aspect-square">
                        <img 
                          src={artist.images[0]?.url} 
                          alt={artist.name}
                          className="w-full h-full object-cover transform transition-transform 
                            duration-300 group-hover/card:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent 
                          opacity-60 group-hover/card:opacity-80 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 
                        group-hover/card:translate-y-0 transition-transform">
                        <h3 className="text-white font-medium text-lg truncate mb-1 
                          group-hover/card:text-emerald-500 transition-colors">
                          {artist.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 opacity-0 group-hover/card:opacity-100 
                          transition-opacity duration-200">
                          {artist.genres.slice(0, 2).map((genre, idx) => (
                            <span 
                              key={idx}
                              className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 
                        transition-opacity">
                        <div className="bg-emerald-500 rounded-full p-2">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Navigation Button */}
              <button
                onClick={() => handleScroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10
                  w-12 h-12 bg-emerald-500/90 rounded-full flex items-center justify-center
                  hover:bg-emerald-600 transition-colors shadow-lg backdrop-blur-sm
                  hover:scale-110 transform duration-200 group"
              >
                <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {state?.mode === 'similar' ? (
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {state.title || 'Similar Songs'}
                </h2>
                <p className="text-gray-400">
                  {state.description || 'Songs you might like based on your selection'}
                </p>
              </div>
              
              <button
                onClick={() => {
                  setPlaylistModalData({
                    name: state.title || 'Similar Songs',
                    description: state.description || 'Generated playlist based on your selection',
                    tracks: tracks
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 
                  text-white rounded-full transition-colors"
              >
                <Save className="w-5 h-5" />
                Save as Playlist
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tracks.map((track) => (
                <div 
                  key={track.id}
                  className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 
                    transition-colors group"
                >
                  <div className="relative aspect-square mb-4">
                    <img 
                      src={track.album.images[0]?.url}
                      alt={track.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button 
                      onClick={(e) => handlePreviewPlay(e, track.preview_url, track)}
                      className="absolute inset-0 flex items-center justify-center 
                        bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity 
                        rounded-lg"
                    >
                      {previewUrl === track.preview_url && isPlaying ? (
                        <Pause className="w-12 h-12 text-emerald-500" />
                      ) : (
                        <PlayCircle className="w-12 h-12 text-emerald-500" />
                      )}
                    </button>
                  </div>
                  <h3 className="text-white font-medium truncate mb-1">
                    {track.name}
                  </h3>
                  <p className="text-gray-400 text-sm truncate">
                    {track.artists.map(a => a.name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Original two-column layout
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Similar Tracks Column */}
            <div className="bg-gray-800/30 rounded-xl p-6">
              {renderSimilarTracksHeader()}
              
              <div className="h-[600px] overflow-y-auto pr-4 space-y-2">
                {selectedArtistTracks.map((track) => (
                  <div 
                    key={track.id}
                    className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 
                      transition-all duration-300 group"
                  >
                    <div className="relative">
                      <img 
                        src={track.album.images[0]?.url}
                        alt={track.name}
                        className="w-12 h-12 rounded"
                      />
                      <button 
                        onClick={(e) => handlePreviewPlay(e, track.preview_url, track)}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 
                          opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      >
                        {previewUrl === track.preview_url && isPlaying ? (
                          <Pause className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <PlayCircle className="w-6 h-6 text-emerald-500" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate">{track.name}</h4>
                      <p className="text-gray-400 text-xs truncate">
                        {track.artists.map((a: any) => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Played Tracks Column */}
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Your Music Activity</h3>
                  <p className="text-gray-400 text-sm">Recent plays & top tracks combined</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-gray-400">{topTracks.length} tracks</span>
                </div>
              </div>
              
              <div className="h-[600px] overflow-y-auto pr-4 space-y-2">
                {topTracks.map((track) => (
                  <div 
                    key={track.id}
                    className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 
                      transition-all duration-300 group cursor-pointer"
                  >
                    <div className="relative">
                      <img 
                        src={track.album.images[0]?.url}
                        alt={track.name}
                        className="w-16 h-16 rounded"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent track selection when clicking play
                          handlePreviewPlay(e, track.preview_url, track);
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 
                          opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      >
                        {previewUrl === track.preview_url && isPlaying ? (
                          <Pause className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <PlayCircle className="w-8 h-8 text-emerald-500" />
                        )}
                      </button>
                    </div>
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleTrackClick(track)} // Keep track selection functionality
                    >
                      <h4 className="text-white font-medium truncate">{track.name}</h4>
                      <p className="text-gray-400 text-sm truncate">
                        {track.artists.map((a: any) => a.name).join(', ')}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleTrackClick(track)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <ArrowRight className="w-5 h-5 text-emerald-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <PlaylistSaveModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPlaylistModalData(null);
        }}
        onSave={async (name: string, description: string, imageUrl?: string) => {
          try {
            if (!token) throw new Error('No token available');
            
            const loadingToastId = showToast('loading', 'Creating playlist...', 'Please wait while we set everything up');

            // Get user ID first
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!userResponse.ok) throw new Error('Failed to fetch user details');
            const userData = await userResponse.json();

            // Create playlist
            const createResponse = await fetch(
              `https://api.spotify.com/v1/users/${userData.id}/playlists`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name,
                  description,
                  public: false
                })
              }
            );

            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              throw new Error(errorData.error?.message || 'Failed to create playlist');
            }
            
            const playlist = await createResponse.json();

            // Make sure we're using the correct tracks array
            const tracksToAdd = playlistModalData?.tracks?.map(track => `spotify:track:${track.id}`) || [];
            
            if (tracksToAdd.length === 0) {
              throw new Error('No tracks available to add to playlist');
            }

            // Add tracks in chunks
            const chunkSize = 50;
            for (let i = 0; i < tracksToAdd.length; i += chunkSize) {
              const chunk = tracksToAdd.slice(i, i + chunkSize);
              const addTracksResponse = await fetch(
                `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ uris: chunk })
                }
              );

              if (!addTracksResponse.ok) {
                throw new Error('Failed to add tracks to playlist');
              }
            }

            toast.dismiss(loadingToastId);
            showToast('success', 'Playlist Created!', {
              description: 'Your new playlist has been saved to your Spotify account',
              style: {
                background: 'linear-gradient(to right, rgb(6, 95, 70), rgb(17, 24, 39))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '1rem',
              }
            });

            setIsModalOpen(false);
          } catch (error) {
            console.error('Playlist creation error:', error);
            showToast('error', 'Failed to create playlist', {
              description: error instanceof Error ? error.message : 'Please try again later',
              style: {
                background: 'linear-gradient(to right, rgb(127, 29, 29), rgb(17, 24, 39))',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '1rem',
              }
            });
          }
        }}
        defaultName={playlistModalData?.name}
        defaultDescription={playlistModalData?.description}
        tracksCount={playlistModalData?.tracks?.length || 0}
      />
    </div>
  );
};

// Add this CSS to your global styles or as a style tag
const styles = `
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

export default Discover; 