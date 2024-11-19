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
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackDetails, setTrackDetails] = useState<{
    audioFeatures?: AudioFeatures;
    audioAnalysis?: AudioAnalysis;
  }>({});

  useEffect(() => {
    generatePersonalizedPlaylists();
  }, []);

  const fetchCurrentlyPlaying = async () => {
    try {
      if (!token) return;

      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (response.status === 204) {
        // No track currently playing
        setCurrentlyPlaying(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCurrentlyPlaying({
          item: data.item,
          is_playing: data.is_playing,
          progress_ms: data.progress_ms
        });
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('spotify_access_token');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Failed to fetch currently playing:', error);
    }
  };

  useEffect(() => {
    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 1000);
    return () => clearInterval(interval);
  }, []);

  const generatePersonalizedPlaylists = async () => {
    try {
      setIsGenerating(true);
      if (!token) return;

      // 1. Fetch user's liked tracks
      const tracksResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!tracksResponse.ok) throw new Error('Failed to fetch tracks');
      
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
      const token = localStorage.getItem('spotify_access_token');
      
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

      // Show success state
      alert('Playlist created successfully!');

    } catch (error) {
      console.error('Failed to save playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setSavingPlaylist(null);
    }
  };

  const handlePlayPause = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const method = currentlyPlaying?.is_playing ? 'PUT' : 'PUT';
      const endpoint = currentlyPlaying?.is_playing ? 'pause' : 'play';
      
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/${endpoint}`,
        {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setCurrentlyPlaying(prev => prev ? {
          ...prev,
          is_playing: !prev.is_playing
        } : null);
        
        await fetchCurrentlyPlaying();
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const handleSkipNext = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(
        'https://api.spotify.com/v1/me/player/next',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setTimeout(() => {
          fetchCurrentlyPlaying();
        }, 300);
      }
    } catch (error) {
      console.error('Failed to skip track:', error);
    }
  };

  const handleSkipPrevious = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(
        'https://api.spotify.com/v1/me/player/previous',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setTimeout(() => {
          fetchCurrentlyPlaying();
        }, 300);
      }
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
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
      // First check if the track is already liked
      const checkResponse = await fetch(
        `https://api.spotify.com/v1/me/tracks/contains?ids=${currentlyPlaying.item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const [isLiked] = await checkResponse.json();

      if (isLiked) {
        toast.info('This track is already in your Liked Songs!');
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
        toast.success('Added to your Liked Songs!', {
          description: `${currentlyPlaying.item.name} by ${currentlyPlaying.item.artists[0].name} has been added to your library`,
        });
        setIsTrackModalOpen(false);
      } else {
        throw new Error('Failed to add to liked songs');
      }
    } catch (error) {
      console.error('Failed to add to liked songs:', error);
      toast.error('Failed to add to Liked Songs', {
        description: 'Please try again later',
      });
    }
  };

  const handleGetSimilarSongs = async () => {
    if (!currentlyPlaying?.item) return;
    setIsTrackModalOpen(false);
    
    try {
      // Show loading toast
      toast.loading('Finding similar songs...', { id: 'similar-songs' });

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

      // Dismiss loading toast
      toast.dismiss('similar-songs');
      
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
      console.error('Failed to get recommendations:', error);
      toast.error('Failed to get similar songs', {
        description: 'Please try again later',
      });
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
          onClick={() => navigate('/criteria')}
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

      {currentlyPlaying?.item && (
        <>
          <div 
            className="mb-12 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/60 transition-colors group cursor-pointer"
            onClick={handleNowPlayingClick}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Now Playing</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  src={currentlyPlaying.item.album.images[0]?.url}
                  alt={currentlyPlaying.item.album.name}
                  className="w-24 h-24 rounded-lg shadow-lg group-hover:shadow-emerald-500/20"
                />
                <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white group-hover:text-emerald-500 transition-colors">
                  {currentlyPlaying.item.name}
                </h3>
                <p className="text-gray-400">
                  {currentlyPlaying.item.artists.map(a => a.name).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleSkipPrevious}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="w-6 h-6 text-white" />
                </button>
                <button 
                  onClick={handlePlayPause}
                  className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 transition-all"
                >
                  {currentlyPlaying.is_playing ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
                <button 
                  onClick={handleSkipNext}
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

          <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
            <DialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gray-900 rounded-xl p-6 shadow-xl z-50">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">Track Details</h2>
                <button 
                  onClick={() => setIsTrackModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex gap-6 mb-6">
                <img 
                  src={currentlyPlaying.item.album.images[0]?.url}
                  alt={currentlyPlaying.item.name}
                  className="w-40 h-40 rounded-lg shadow-lg"
                />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {currentlyPlaying.item.name}
                  </h3>
                  <p className="text-lg text-gray-300 mb-4">
                    {currentlyPlaying.item.artists.map(a => a.name).join(', ')}
                  </p>
                  <p className="text-gray-400">
                    Album: {currentlyPlaying.item.album.name}
                  </p>
                </div>
              </div>

              {trackDetails.audioFeatures && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Energy</h4>
                    <div className="h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${trackDetails.audioFeatures.energy * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Danceability</h4>
                    <div className="h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${trackDetails.audioFeatures.danceability * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    handleGetSimilarSongs();
                    setIsTrackModalOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors"
                >
                  <ListMusic className="w-5 h-5" />
                  Get Similar Songs
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Auto-generated Playlists */}
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
    </div>
  );
};

export default Dashboard;