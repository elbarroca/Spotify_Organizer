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
  Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

const Dashboard = () => {
  const [autoPlaylists, setAutoPlaylists] = useState<AutoPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlaylist, setSavingPlaylist] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);

  useEffect(() => {
    generatePersonalizedPlaylists();
  }, []);

  const fetchCurrentlyPlaying = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentlyPlaying(data);
      }
    } catch (error) {
      console.error('Failed to fetch currently playing:', error);
    }
  };

  useEffect(() => {
    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 5000);
    return () => clearInterval(interval);
  }, []);

  const generatePersonalizedPlaylists = async () => {
    try {
      setIsGenerating(true);
      const token = localStorage.getItem('spotify_access_token');

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
        <div className="mb-12 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/60 transition-colors group">
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