import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronLeft
} from 'lucide-react';
import PlaylistSaveModal from '../components/PlaylistSaveModal';

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
}

interface CachedData<T> {
  timestamp: number;
  data: T;
}

const ONE_HOUR = 3600000; // 1 hour in milliseconds (3,600,000 ms = 1 hour)

const Discover = () => {
  const navigate = useNavigate();
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

  const fetchSimilarTracks = async (artistId: string) => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_artists=${artistId}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSimilarTracks(data.tracks);
      }
    } catch (error) {
      console.error('Failed to fetch similar tracks:', error);
    }
  };

  const fetchTopTracks = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const recentlyPlayedResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (recentlyPlayedResponse.ok && topTracksResponse.ok) {
        const recentlyPlayedData = await recentlyPlayedResponse.json();
        const topTracksData = await topTracksResponse.json();

        const recentTracks = recentlyPlayedData.items.map((item: any) => item.track);
        const allTracks = [...recentTracks, ...topTracksData.items];
        
        const uniqueTracks = Array.from(
          new Map(allTracks.map(track => [track.id, track])).values()
        ).slice(0, 100);

        const timestamp = Date.now();
        const cacheData: CachedData<TopTrack[]> = {
          timestamp,
          data: uniqueTracks
        };
        
        localStorage.setItem('cached_top_tracks', JSON.stringify(cacheData));
        setTopTracks(uniqueTracks);
      }
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
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

  const handleSavePlaylist = async (name: string, description: string, imageUrl?: string) => {
    if (!playlistModalData) return;
    
    try {
      setIsCreatingPlaylist(true);
      const token = localStorage.getItem('spotify_access_token');
      const { id: userId } = await (await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      })).json();

      // Create playlist
      const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          public: false,
        }),
      });

      const playlist = await playlistResponse.json();

      // Upload image if provided
      if (imageUrl) {
        const base64Image = imageUrl.split(',')[1];
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/images`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'image/jpeg',
          },
          body: base64Image
        });
      }

      // Add tracks
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: playlistModalData.tracks.map(track => `spotify:track:${track.id}`),
        }),
      });

      setIsModalOpen(false);
      alert('Playlist created successfully!');
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setIsCreatingPlaylist(false);
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
              setPlaylistModalData({
                name: selectedArtist 
                  ? `Similar to ${selectedArtist.name}`
                  : `Similar to ${selectedTrack?.name}`,
                description: `Generated playlist based on ${
                  selectedArtist ? selectedArtist.name : selectedTrack?.name
                }`,
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
        {/* Your Rotation Section */}
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

        {/* Two Column Layout */}
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
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 
                        group-hover:opacity-100 transition-opacity rounded"
                    >
                      <PlayCircle className="w-6 h-6 text-emerald-500" />
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
                  onClick={() => handleTrackClick(track)}
                  className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 
                    transition-all duration-300 group cursor-pointer"
                >
                  <div className="relative">
                    <img 
                      src={track.album.images[0]?.url}
                      alt={track.name}
                      className="w-16 h-16 rounded"
                    />
                    <button className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <PlayCircle className="w-8 h-8 text-emerald-500" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{track.name}</h4>
                    <p className="text-gray-400 text-sm truncate">
                      {track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowRight className="w-5 h-5 text-emerald-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PlaylistSaveModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPlaylistModalData(null);
        }}
        onSave={handleSavePlaylist}
        defaultName={playlistModalData?.name}
        defaultDescription={playlistModalData?.description}
        tracksCount={playlistModalData?.tracks.length || 0}
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