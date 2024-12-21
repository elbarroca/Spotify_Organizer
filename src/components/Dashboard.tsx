import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SpotifyTrack } from '@/types/spotify';
import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback';
import { Music, Plus, Search, Library } from 'lucide-react';
import { toast } from 'sonner';
import { NowPlaying } from './NowPlaying';
import { TrackDetailsModal } from './TrackDetailsModal';

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    progress,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    playTrack
  } = useSpotifyPlayback();
  const [showTrackDetails, setShowTrackDetails] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState<{
    energy: number;
    danceability: number;
    valence: number;
    tempo: number;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleGetSimilar = useCallback(async () => {
    if (!currentTrack) return;
    navigate(`/discover?track=${currentTrack.id}`);
  }, [currentTrack, navigate]);

  const handleAddToLiked = useCallback(async () => {
    // Implement add to liked songs functionality
    toast.info('Adding to liked songs...');
  }, []);

  // Fetch audio features when track changes
  useEffect(() => {
    const fetchAudioFeatures = async () => {
      if (!currentTrack) return;
      // TODO: Implement fetching audio features from Spotify API
      // For now, using mock data
      setAudioFeatures({
        energy: Math.random(),
        danceability: Math.random(),
        valence: Math.random(),
        tempo: 120 + Math.random() * 60
      });
    };

    fetchAudioFeatures();
  }, [currentTrack]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header Section */}
      <header className="sticky top-0 z-10 bg-black/50 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-screen-xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Welcome back{user?.display_name ? `, ${user.display_name}` : ''}! 👋</h1>
            {user && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  {user.images?.[0]?.url ? (
                    <img
                      src={user.images[0].url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-500 font-medium">
                        {user.display_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-white font-medium hidden sm:block">{user.display_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/create-playlist')}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="p-3 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
              <Plus className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-white">Create New Playlist</h3>
              <p className="text-sm text-gray-400">Organize your music</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/discover')}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="p-3 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
              <Search className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-white">Discover New Music</h3>
              <p className="text-sm text-gray-400">Find similar artists</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/library')}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="p-3 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <Library className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-white">Organize Library</h3>
              <p className="text-sm text-gray-400">Clean up your collection</p>
            </div>
          </button>
        </div>

        {/* Currently Playing Section */}
        <div className="mb-8">
          {currentTrack ? (
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-start gap-6">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => setShowTrackDetails(true)}
                >
                  <img
                    src={currentTrack.album.images[0]?.url}
                    alt={currentTrack.name}
                    className="w-32 h-32 rounded-lg shadow-lg group-hover:shadow-emerald-500/20 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Music className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">Now Playing</h2>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-1">{currentTrack.name}</h3>
                    <p className="text-gray-400">{currentTrack.artists.map(a => a.name).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      className={`px-6 py-2 rounded-full transition-colors ${
                        isPlaying 
                          ? 'bg-white text-black hover:bg-white/90' 
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button
                      onClick={handleGetSimilar}
                      className="px-6 py-2 rounded-full bg-purple-500/20 text-purple-500 hover:bg-purple-500/30 transition-colors"
                    >
                      Find Similar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
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
        </div>
      </main>

      {/* Now Playing Bar */}
      <NowPlaying
        currentTrack={currentTrack as SpotifyTrack}
        isPlaying={isPlaying}
        onPlaybackChange={handlePlayPause}
        onGetSimilar={handleGetSimilar}
        onAddToLiked={handleAddToLiked}
        onShowDetails={() => setShowTrackDetails(true)}
      />

      {/* Track Details Modal */}
      <TrackDetailsModal
        track={currentTrack as SpotifyTrack}
        isOpen={showTrackDetails}
        onClose={() => setShowTrackDetails(false)}
        onAddToLiked={handleAddToLiked}
        onGetSimilar={handleGetSimilar}
        audioFeatures={audioFeatures || undefined}
      />
    </div>
  );
};

export default Dashboard;