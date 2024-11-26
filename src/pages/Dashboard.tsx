import React, { useEffect, useState } from 'react';
import { 
  Music, 
  Plus, 
  Save, 
  Search,
  Loader2,
  ArrowRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Heart,
  ListMusic,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog';
import { toast } from 'sonner';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

interface AutoPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
  isEditing: boolean;
}

interface AudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
}

interface TrackWithFeatures extends Track {
  audioFeatures?: AudioFeatures;
  added_at?: string;
}

interface CurrentlyPlaying {
  item: Track | null;
  is_playing: boolean;
  progress_ms: number;
}

interface AudioAnalysis {
  tempo: number;
  key: number;
  mode: number;
  time_signature: number;
}

const Dashboard = () => {
  const [autoPlaylists, setAutoPlaylists] = useState<AutoPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlaylist, setSavingPlaylist] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const { user, token, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackDetails, setTrackDetails] = useState<{
    audioFeatures?: AudioFeatures;
    audioAnalysis?: AudioAnalysis;
  }>({});

  useEffect(() => {
    if (token) {
      generatePersonalizedPlaylists();
    }
  }, [token]);

  const fetchCurrentlyPlaying = async () => {
    try {
      if (!token) return;

      // First, try to get the currently playing track
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      // If no track is playing (204) or other error, try to get the playback state
      if (response.status === 204) {
        const playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          if (playerData && playerData.item) {
            setCurrentlyPlaying({
              item: playerData.item,
              is_playing: playerData.is_playing,
              progress_ms: playerData.progress_ms
            });
            return;
          }
        }
        
        setCurrentlyPlaying(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data && data.item) {
          setCurrentlyPlaying({
            item: data.item,
            is_playing: data.is_playing,
            progress_ms: data.progress_ms
          });
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        refreshAuth();
      } else {
        console.error('Failed to fetch currently playing:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch currently playing:', error);
    }
  };

  useEffect(() => {
    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 500); // Check every 500ms
    return () => clearInterval(interval);
  }, [token]); // Add token as dependency

  const generatePersonalizedPlaylists = async () => {
    try {
      setIsGenerating(true);
      if (!token) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }

      // 1. Fetch user's liked tracks
      const tracksResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (tracksResponse.status === 401 || tracksResponse.status === 403) {
        // Token expired or insufficient permissions
        toast.error(
          tracksResponse.status === 401 
            ? 'Session expired. Please login again.'
            : 'Additional permissions required. Refreshing authentication...'
        );
        
        // Use the new refreshAuth method from context
        refreshAuth();
        return;
      }
      
      if (!tracksResponse.ok) {
        throw new Error(`Failed to fetch tracks: ${tracksResponse.statusText}`);
      }
      
      const tracksData = await tracksResponse.json();
      const tracks: TrackWithFeatures[] = tracksData.items.map((item: any) => ({
        ...item.track,
        added_at: item.added_at
      }));

      // 2. Get audio features for all tracks
      const featuresResponse = await fetch(
        `https://api.spotify.com/v1/audio-features?ids=${tracks.map(t => t.id).join(',')}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!featuresResponse.ok) throw new Error('Failed to fetch audio features');
      
      const featuresData = await featuresResponse.json();
      
      // Combine tracks with their audio features
      const tracksWithFeatures = tracks.map((track, index) => ({
        ...track,
        audioFeatures: featuresData.audio_features[index]
      }));

      // 3. Generate playlists
      const generatedPlaylists = [
        {
          id: 'recent',
          name: 'Recently Added',
          description: 'Your latest musical discoveries',
          tracks: tracksWithFeatures.slice(0, 20),
          isEditing: false
        },
        {
          id: 'energetic',
          name: 'High Energy Mix',
          description: 'Perfect for workouts and parties',
          tracks: tracksWithFeatures
            .filter(track => track.audioFeatures?.energy > 0.7)
            .slice(0, 20),
          isEditing: false
        },
        {
          id: 'chill',
          name: 'Chill Vibes',
          description: 'Relaxing tracks for unwinding',
          tracks: tracksWithFeatures
            .filter(track => 
              track.audioFeatures?.energy < 0.5 && 
              track.audioFeatures?.valence > 0.5
            )
            .slice(0, 20),
          isEditing: false
        }
      ];

      setAutoPlaylists(generatedPlaylists);
    } catch (error) {
      console.error('Failed to generate playlists:', error);
      toast.error('Failed to generate playlists', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

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

  const saveToSpotify = async (playlist: AutoPlaylist) => {
    try {
      setSavingPlaylist(playlist.id);
      toast.loading('Creating your playlist...', { id: 'save-playlist' });
      
      // Create playlist
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${user?.id}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlist.name,
          description: playlist.description,
          public: false
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create playlist');
      }

      const newPlaylist = await createResponse.json();
      
      // Add tracks to playlist
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: playlist.tracks.map(track => `spotify:track:${track.id}`)
        })
      });

      if (!addTracksResponse.ok) {
        throw new Error('Failed to add tracks to playlist');
      }

      // Show success toast
      toast.dismiss('save-playlist');
      toast.success('Playlist Created!', {
        description: (
          <div className="space-y-2">
            <p className="font-medium">{playlist.name}</p>
            <p className="text-sm text-gray-400">{playlist.tracks.length} tracks added</p>
            <a 
              href={`https://open.spotify.com/playlist/${newPlaylist.id}`}
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
      toast.dismiss('save-playlist');
      toast.error('Failed to Create Playlist', {
        description: 'Please try again later',
      });
    } finally {
      setSavingPlaylist(null);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!token) return;
      
      const endpoint = currentlyPlaying?.is_playing ? 'pause' : 'play';
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/${endpoint}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.ok || response.status === 204) {
        await fetchCurrentlyPlaying();
      } else if (response.status === 401) {
        refreshAuth();
      } else {
        console.error('Failed to toggle playback:', response.status, response.statusText);
        toast.error('Failed to control playback. Make sure Spotify is active.');
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      toast.error('Failed to control playback');
    }
  };

  const handleSkipNext = async () => {
    try {
      if (!token) return;
      
      const response = await fetch(
        'https://api.spotify.com/v1/me/player/next',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.ok || response.status === 204) {
        // Wait a bit for Spotify to update
        setTimeout(fetchCurrentlyPlaying, 100);
      } else if (response.status === 401) {
        refreshAuth();
      }
    } catch (error) {
      console.error('Failed to skip track:', error);
      toast.error('Failed to skip track');
    }
  };

  const handleSkipPrevious = async () => {
    try {
      if (!token) return;
      
      const response = await fetch(
        'https://api.spotify.com/v1/me/player/previous',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.ok || response.status === 204) {
        // Wait a bit for Spotify to update
        setTimeout(fetchCurrentlyPlaying, 100);
      } else if (response.status === 401) {
        refreshAuth();
      }
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
      toast.error('Failed to skip to previous track');
    }
  };

  const fetchTrackDetails = async (trackId: string) => {
    try {
      const [featuresRes, analysisRes] = await Promise.all([
        fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      const [features, analysis] = await Promise.all([
        featuresRes.json(),
        analysisRes.json()
      ]);

      setTrackDetails({
        audioFeatures: features,
        audioAnalysis: analysis
      });
    } catch (error) {
      console.error('Failed to fetch track details:', error);
    }
  };

  const handleAddToLiked = async () => {
    if (!currentlyPlaying?.item) return;
    
    try {
      // Show loading toast
      toast.loading('Adding to your Liked Songs...', { id: 'like-song' });

      const checkResponse = await fetch(
        `https://api.spotify.com/v1/me/tracks/contains?ids=${currentlyPlaying.item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const [isLiked] = await checkResponse.json();

      if (isLiked) {
        toast.dismiss('like-song');
        toast('Already in Your Library', {
          icon: '💚',
          description: 'This track is already in your Liked Songs!',
        });
        return;
      }

      const response = await fetch(
        `https://api.spotify.com/v1/me/tracks`,
        {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids: [currentlyPlaying.item.id]
          })
        }
      );

      if (response.ok) {
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
          duration: 4000,
        });
        setIsTrackModalOpen(false);
      } else {
        throw new Error('Failed to add to liked songs');
      }
    } catch (error) {
      toast.dismiss('like-song');
      toast.error('Failed to Add to Library', {
        description: 'Please try again later',
      });
    }
  };

  const handleGetSimilarSongs = async () => {
    if (!currentlyPlaying?.item) return;
    setIsTrackModalOpen(false);
    
    try {
      // Enhanced loading toast with animation
      toast.loading(
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={currentlyPlaying.item.album.images[0]?.url} 
              alt="" 
              className="w-12 h-12 rounded-lg shadow-md"
            />
            <div className="absolute inset-0 bg-emerald-500/20 rounded-lg animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-white">Finding Similar Tracks</p>
            <p className="text-sm text-gray-400">Analyzing "{currentlyPlaying.item.name}"</p>
          </div>
          <div className="ml-auto">
            <div className="w-5 h-5 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>,
        { id: 'similar-songs', duration: 10000 }
      );

      // Get audio features of current track
      const featuresResponse = await fetch(
        `https://api.spotify.com/v1/audio-features/${currentlyPlaying.item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const features = await featuresResponse.json();

      // Get recommendations with audio feature targeting
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?` + new URLSearchParams({
          seed_tracks: currentlyPlaying.item.id,
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

      // Enhanced success toast
      toast.dismiss('similar-songs');
      toast.success(
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={currentlyPlaying.item.album.images[0]?.url} 
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
              {data.tracks.length} tracks discovered based on your selection
            </p>
          </div>
        </div>,
        { duration: 3000 }
      );
      
      // Navigate to discover page with recommendations
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
      toast.dismiss('similar-songs');
      toast.error(
        <div className="flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-lg">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-white">Failed to Find Similar Tracks</p>
            <p className="text-sm text-gray-400">Please try again later</p>
          </div>
        </div>
      );
    }
  };

  const handleNowPlayingClick = (e: React.MouseEvent) => {
    // Check if the click target is a button or inside a button
    const isButton = (e.target as HTMLElement).closest('button');
    if (!isButton) {
      setIsTrackModalOpen(true);
      if (currentlyPlaying?.item) {
        fetchTrackDetails(currentlyPlaying.item.id);
      }
    }
  };

  if (loading || isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Analyzing your music taste...</p>
        </div>
      </div>
    );
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
        <div className="mb-12">
          <div 
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/60 transition-colors group cursor-pointer"
            onClick={handleNowPlayingClick}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Now Playing</h2>
            <div className="flex items-center gap-6">
              {/* Album Art */}
              <div className="relative">
                <img 
                  src={currentlyPlaying.item.album.images[0]?.url}
                  alt={currentlyPlaying.item.album.name}
                  className="w-24 h-24 rounded-lg shadow-lg group-hover:shadow-emerald-500/20"
                />
                <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Track Info */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white group-hover:text-emerald-500 transition-colors">
                  {currentlyPlaying.item.name}
                </h3>
                <p className="text-gray-400">
                  {currentlyPlaying.item.artists.map(a => a.name).join(', ')}
                </p>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipPrevious();
                  }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="w-6 h-6 text-white" />
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause();
                  }}
                  className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 transition-all"
                >
                  {currentlyPlaying.is_playing ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipNext();
                  }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <SkipForward className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 px-2">
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{ 
                    width: `${(currentlyPlaying.progress_ms / currentlyPlaying.item.duration_ms) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
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

      {/* Recently Generated Playlists */}
      <h2 className="text-2xl font-bold text-white mb-6">Recently Generated Playlists</h2>
      <div className="grid md:grid-cols-3 gap-8">
        {autoPlaylists.map((playlist) => (
          <div key={playlist.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/70 transition-all group">
            <div className="flex justify-between items-start mb-4">
              {playlist.isEditing ? (
                <input
                  type="text"
                  value={playlist.name}
                  onChange={(e) => handleNameChange(playlist.id, e.target.value)}
                  className="bg-gray-700 text-white px-3 py-1 rounded-md"
                  onBlur={() => handleNameChange(playlist.id, playlist.name)}
                  autoFocus
                />
              ) : (
                <div>
                  <h3 className="text-xl font-semibold text-white group-hover:text-emerald-500 transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">{playlist.description}</p>
                </div>
              )}
            </div>

            {/* Track Preview */}
            <div className="space-y-2 mb-4">
              {playlist.tracks.slice(0, 3).map((track) => (
                <div key={track.id} className="flex items-center gap-3">
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.album.name}
                    className="w-10 h-10 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{track.name}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {track.artists.map(a => a.name).join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => saveToSpotify(playlist)}
              disabled={savingPlaylist === playlist.id}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 ${
                savingPlaylist === playlist.id 
                  ? 'bg-emerald-700 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600'
              } text-white rounded-full transition-colors`}
            >
              {savingPlaylist === playlist.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Playlist...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save to Spotify
                </>
              )}
            </button>
          </div>
        ))}
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