import { SpotifyTrack } from '@/types/spotify';
import { Heart, ListMusic, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface TrackDetailsModalProps {
  track: SpotifyTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToLiked: () => Promise<void>;
  onGetSimilar: () => Promise<void>;
  audioFeatures?: {
    energy: number;
    danceability: number;
    valence: number;
    tempo: number;
  };
}

export const TrackDetailsModal: React.FC<TrackDetailsModalProps> = ({
  track,
  isOpen,
  onClose,
  onAddToLiked,
  onGetSimilar,
  audioFeatures
}) => {
  if (!track) return null;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800/90 rounded-2xl shadow-2xl z-50 border border-white/10 overflow-hidden">
          <div className="overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="p-10">
              <div className="animate-in slide-in-from-bottom duration-300">
                {/* Enhanced Header */}
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                      Track Analysis
                    </h2>
                    <p className="text-gray-400">Discover the musical characteristics</p>
                  </div>
                  <Dialog.Close className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:rotate-90">
                    <X className="w-6 h-6 text-gray-400" />
                  </Dialog.Close>
                </div>

                {/* Enhanced Track Info Section */}
                <div className="flex gap-8 mb-8 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="relative group">
                    <img 
                      src={track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-48 h-48 rounded-lg shadow-xl transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-white mb-3 line-clamp-2">
                      {track.name}
                    </h3>
                    <p className="text-xl text-gray-300 mb-4">
                      {track.artists.map(a => a.name).join(', ')}
                    </p>
                    <div className="space-y-2">
                      <p className="text-gray-400">
                        <span className="text-gray-500">Album:</span> {track.album.name}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Duration:</span> {formatTime(track.duration_ms)}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Popularity:</span> {track.popularity}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enhanced Audio Features Grid */}
                {audioFeatures && (
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Energy Meter */}
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-6 rounded-xl backdrop-blur-sm border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-400">Energy</h4>
                          <p className="text-xs text-gray-500">Track's intensity and activity</p>
                        </div>
                        <span className="text-2xl font-bold text-white">
                          {Math.round(audioFeatures.energy * 100)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${audioFeatures.energy * 100}%` }}
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
                          {Math.round(audioFeatures.danceability * 100)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${audioFeatures.danceability * 100}%` }}
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
                          {Math.round(audioFeatures.valence * 100)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${audioFeatures.valence * 100}%` }}
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
                            {Math.round(audioFeatures.tempo)}
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
                    onClick={onAddToLiked}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all duration-200 hover:scale-[1.02] group border border-white/10"
                  >
                    <Heart className="w-5 h-5 group-hover:text-pink-500 transition-colors" />
                    <span>Add to Liked Songs</span>
                  </button>
                  
                  <button
                    onClick={onGetSimilar}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl transition-all duration-200 hover:scale-[1.02] group shadow-lg shadow-emerald-500/20"
                  >
                    <ListMusic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Discover Similar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 