import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback';
import { Heart, SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Shuffle, Repeat, ListMusic, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { useSpotifyTracks } from '../hooks/useSpotifyTracks';

interface SavedTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  added_at: string;
  uri: string;
}

interface Playlist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
  };
}

interface PlaylistTrack {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
    uri: string;
  };
  added_at: string;
}

export default function Spotify() {
  const { spotifyApi } = useAuth();
  const { 
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
  } = useSpotifyPlayback();
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);
  const [likedSongs] = useLocalStorage<SavedTrack[]>('spotify_liked_songs', []);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SavedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tracks: cachedTracks, loading: tracksLoading } = useSpotifyTracks();
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try to get from cache first
        const cachedPlaylists = localStorage.getItem('spotify_playlists');
        const cachedTimestamp = localStorage.getItem('spotify_playlists_timestamp');
        
        // Use cache if it's less than 5 minutes old
        if (cachedPlaylists && cachedTimestamp && 
            Date.now() - parseInt(cachedTimestamp) < 5 * 60 * 1000) {
          setPlaylists(JSON.parse(cachedPlaylists));
          setIsLoading(false);
          // Fetch in background for next time
          fetchFromAPI();
          return;
        }

        await fetchFromAPI();
      } catch (error) {
        console.error('Error fetching playlists:', error);
        setError('Failed to load playlists. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchFromAPI = async () => {
      const response = await spotifyApi.getUserPlaylists();
      const items = response.body.items
        .filter(playlist => playlist && playlist.id)
        .map(playlist => ({
        id: playlist.id,
        name: playlist.name || 'Untitled Playlist',
          images: Array.isArray(playlist.images) ? playlist.images : [],
          tracks: {
            total: playlist.tracks?.total || 0
          }
        }));

      if (items.length === 0) {
        console.warn('No valid playlists found');
      }

      setPlaylists(items);
      // Cache the results
      localStorage.setItem('spotify_playlists', JSON.stringify(items));
      localStorage.setItem('spotify_playlists_timestamp', Date.now().toString());
    };

    fetchPlaylists();
  }, [spotifyApi]);

  useEffect(() => {
    if (selectedPlaylist) {
      const fetchPlaylistTracks = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const cacheKey = `spotify_playlist_${selectedPlaylist}`;
          const cachedTracks = localStorage.getItem(cacheKey);
          const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

          if (cachedTracks && cachedTimestamp && 
              Date.now() - parseInt(cachedTimestamp) < 5 * 60 * 1000) {
            setPlaylistTracks(JSON.parse(cachedTracks));
            setIsLoading(false);
            // Fetch in background for next time
            fetchFromAPI();
            return;
          }

          await fetchFromAPI();
        } catch (error) {
          console.error('Error fetching playlist tracks:', error);
          setError('Failed to load playlist tracks. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      const fetchFromAPI = async () => {
          const response = await spotifyApi.getPlaylistTracks(selectedPlaylist);
          const tracks = response.body.items
            .filter(item => item.track !== null)
            .map(item => {
              // Since we filtered out null tracks, we can safely assert track is non-null
              const track = item.track!;
              return {
                id: track.id,
                name: track.name,
                artists: track.artists,
                album: track.album,
                duration_ms: track.duration_ms,
                added_at: item.added_at,
                uri: track.uri
              };
            });

          setPlaylistTracks(tracks);
        
        // Cache the results
        const cacheKey = `spotify_playlist_${selectedPlaylist}`;
        localStorage.setItem(cacheKey, JSON.stringify(tracks));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      };

      fetchPlaylistTracks();
    }
  }, [selectedPlaylist, spotifyApi]);

  useEffect(() => {
    // Update progress bar
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentProgress(prev => {
          if (prev >= (currentTrack?.duration_ms || 0)) {
            return 0;
          }
          return prev + 1000;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'F9':
          handlePrevious();
          break;
        case 'F10':
          handlePlayPause();
          break;
        case 'F11':
          handleNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevious, handlePlayPause, handleNext]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? 50 : 0);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCurrentProgress(value);
    handleSeek(value);
  };

  const toggleShuffle = async () => {
    try {
      setIsShuffled(!isShuffled);
      // Implement shuffle functionality here
    } catch (error) {
      console.error('Error toggling shuffle:', error);
    }
  };

  const toggleRepeat = async () => {
    try {
      setRepeatMode((prev) => (prev + 1) % 3);
      // Implement repeat functionality here
    } catch (error) {
      console.error('Error toggling repeat:', error);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTrackPlay = async (track: SavedTrack) => {
    try {
      setPlayerError(null);
      setLoadingTrackId(track.id);
      
      // Always play the selected track, regardless of current state
      await playTrack(track.uri);
      
    } catch (error) {
      console.error('Error playing track:', error);
      if (error instanceof Error) {
        if (error.message.includes('Please open Spotify')) {
          setPlayerError('Please open Spotify on any device (phone, desktop, etc.)');
        } else {
          setPlayerError('Error playing track. Please try again.');
        }
        // Auto-dismiss error after 3 seconds
        setTimeout(() => setPlayerError(null), 3000);
      }
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handlePlaylistSelect = (playlistId: string) => {
    setSelectedPlaylist(playlistId);
    setShowPlaylists(false);
  };

  const handleBackToLiked = () => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
  };

  useEffect(() => {
    const checkPlayerReady = setInterval(() => {
      if (window.Spotify?.Player) {
        setIsPlayerReady(true);
        clearInterval(checkPlayerReady);
      }
    }, 1000);

    return () => clearInterval(checkPlayerReady);
  }, []);

  if (tracksLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your music library...</p>
        </div>
      </div>
    );
  }

  const tracksToDisplay = selectedPlaylist ? playlistTracks : cachedTracks;

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 bg-black/50 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedPlaylist && (
              <button
                onClick={handleBackToLiked}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="text-2xl font-bold">
              {selectedPlaylist ? 'Playlist' : 'Músicas de que gostaste'}
            </h1>
          </div>
          <button
            onClick={() => setShowPlaylists(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ListMusic className="w-5 h-5" />
            <span>Playlists</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto pb-24">
        {showPlaylists && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Your Playlists</h2>
                  <button 
                    onClick={() => setShowPlaylists(false)}
                    className="p-2 hover:bg-white/10 rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[calc(80vh-100px)]">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handlePlaylistSelect(playlist.id)}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="relative aspect-square mb-4">
                      <img
                        src={playlist.images?.[0]?.url || '/default-playlist.png'}
                        alt={playlist.name || 'Playlist'}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-playlist.png';
                        }}
                      />
                      <div className="absolute bottom-2 right-2 p-3 bg-green-500 rounded-full shadow-lg translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <Play className="w-6 h-6 text-black" />
                      </div>
                    </div>
                    <h3 className="font-semibold truncate">{playlist.name || 'Untitled Playlist'}</h3>
                    <p className="text-sm text-gray-400">{playlist.tracks?.total || 0} tracks</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {showPlaylists ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-white/5 animate-pulse">
                  <div className="aspect-square bg-white/10 rounded-md mb-4" />
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              ))
            ) : playlists.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                No playlists found
              </div>
            ) : (
              playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handlePlaylistSelect(playlist.id)}
                className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="relative aspect-square mb-4">
                  <img
                      src={playlist.images?.[0]?.url || '/default-playlist.png'}
                      alt={playlist.name || 'Playlist'}
                    className="w-full h-full object-cover rounded-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-playlist.png';
                      }}
                  />
                  <div className="absolute bottom-2 right-2 p-3 bg-green-500 rounded-full shadow-lg translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <Play className="w-6 h-6 text-black" />
                  </div>
                </div>
                  <h3 className="font-semibold truncate">{playlist.name || 'Untitled Playlist'}</h3>
                  <p className="text-sm text-gray-400">{playlist.tracks?.total || 0} tracks</p>
              </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {selectedPlaylist ? 'Playlist' : 'Your Library'}
              </h2>
              <p className="text-gray-400">
                {tracksToDisplay.length} tracks
              </p>
            </div>

            {tracksToDisplay.map((track) => (
              <div 
                key={track.id}
                className="flex items-center p-3 rounded-md hover:bg-white/5 transition-colors group"
              >
                <div className="w-12 h-12 relative mr-4">
                  <img 
                    src={track.album.images[0]?.url} 
                    alt={track.name}
                    className="w-full h-full rounded-md object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => handleTrackPlay(track)}
                      className="p-2 bg-green-500 rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                      disabled={!isPlayerReady}
                    >
                      {isPlaying && currentTrack?.id === track.id ? (
                        <Pause className="w-4 h-4" />
                      ) : loadingTrackId === track.id ? (
                        <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{track.name}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {track.artists.map((artist: { name: string }) => artist.name).join(', ')}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-5 h-5 text-emerald-500" fill="currentColor" />
                  </button>
                  <div className="text-sm text-gray-400 w-16 text-right">
                  {formatTime(track.duration_ms)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom player */}
      <div className="fixed left-64 right-0 bottom-0 bg-gradient-to-t from-black to-black/95 backdrop-blur-lg border-t border-white/5 p-4">
        <div className="max-w-screen-xl mx-auto grid grid-cols-3 gap-4">
          {/* Current track info */}
          <div className="flex items-center gap-4">
            {selectedPlaylist && (
              <button
                onClick={handleBackToLiked}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Back to Liked Songs"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentTrack && (
              <>
                <img 
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.name}
                  className="w-14 h-14 rounded-md"
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{currentTrack.name}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {currentTrack.artists.map(artist => artist.name).join(', ')}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Playback controls */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleShuffle}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isShuffled ? "text-green-500" : "text-gray-400 hover:text-white"
                )}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button 
                onClick={handlePrevious}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="p-3 bg-white rounded-full hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black" />
                )}
              </button>
              
              <button 
                onClick={handleNext}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button 
                onClick={toggleRepeat}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  repeatMode > 0 ? "text-green-500" : "text-gray-400 hover:text-white"
                )}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="w-full flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400 w-10 text-right">
                {formatTime(currentProgress)}
              </span>
              <input
                type="range"
                min="0"
                max={currentTrack?.duration_ms || 100}
                value={currentProgress}
                onChange={handleProgressChange}
                className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <span className="text-xs text-gray-400 w-10">
                {currentTrack ? formatTime(currentTrack.duration_ms) : '--:--'}
              </span>
            </div>
          </div>

          {/* Volume controls */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>
        </div>
      </div>
      {playerError && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          {playerError}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
} 