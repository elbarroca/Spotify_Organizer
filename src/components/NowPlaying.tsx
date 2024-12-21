import { Music, Pause, Play, SkipBack, SkipForward, Heart, ListMusic, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { SpotifyTrack } from '@/types/spotify';

interface NowPlayingProps {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  onPlaybackChange: () => Promise<void>;
  onGetSimilar: () => Promise<void>;
  onAddToLiked: () => Promise<void>;
  onShowDetails: () => void;
}

const NowPlayingComponent: React.FC<NowPlayingProps> = ({
  currentTrack,
  isPlaying,
  onPlaybackChange,
  onGetSimilar,
  onAddToLiked,
  onShowDetails
}) => {
  // Early return if no track
  if (!currentTrack || !currentTrack.album) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-black/95 backdrop-blur-lg border-t border-white/5 p-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-center text-gray-400">
          <Music className="w-5 h-5 mr-2" />
          <span>No track currently playing</span>
        </div>
      </div>
    );
  }

  const albumImage = currentTrack.album.images?.[0]?.url || '/album-placeholder.png';
  const artistNames = currentTrack.artists.map(artist => artist.name).join(', ');

  // Memoized handlers with loading states
  const handlePlaybackChange = useCallback(async () => {
    try {
      await onPlaybackChange();
    } catch (error) {
      console.error('Failed to change playback:', error);
      toast.error('Failed to control playback');
    }
  }, [onPlaybackChange]);

  const handleGetSimilar = useCallback(async () => {
    try {
      await onGetSimilar();
      toast.success('Finding similar tracks...');
    } catch (error) {
      console.error('Failed to get similar tracks:', error);
      toast.error('Failed to find similar tracks');
    }
  }, [onGetSimilar]);

  const handleAddToLiked = useCallback(async () => {
    try {
      await onAddToLiked();
      toast.success('Added to Liked Songs');
    } catch (error) {
      console.error('Failed to add to liked songs:', error);
      toast.error('Failed to add to Liked Songs');
    }
  }, [onAddToLiked]);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-black/95 backdrop-blur-lg border-t border-white/5">
      <div className="max-w-screen-xl mx-auto h-full flex items-center justify-between px-4">
        {/* Track Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div 
            className="relative group cursor-pointer"
            onClick={onShowDetails}
          >
            <img 
              src={albumImage}
              alt={currentTrack.name}
              className="w-14 h-14 rounded-md transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-white truncate">{currentTrack.name}</div>
            <div className="text-sm text-gray-400 truncate">{artistNames}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddToLiked}
            className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Add to Liked Songs"
          >
            <Heart className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={handlePlaybackChange}
            className={cn(
              "p-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20",
              isPlaying 
                ? "bg-white hover:bg-white/90" 
                : "bg-emerald-500 hover:bg-emerald-600"
            )}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={handleGetSimilar}
            className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Find Similar Songs"
          >
            <ListMusic className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const NowPlaying = memo(NowPlayingComponent);