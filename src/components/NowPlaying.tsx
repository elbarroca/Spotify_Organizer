import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NowPlayingProps {
  currentTrack: {
    title: string;
    artist: string;
    imageUrl: string;
  } | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const NowPlaying = ({
  currentTrack,
  isPlaying = false,
  onPlayPause,
  onNext,
  onPrevious,
}: NowPlayingProps) => {
  if (!currentTrack) return null;

  return (
    <div className="px-4 py-3 border-t border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {/* Album Art */}
        <div className="relative flex-shrink-0">
          {currentTrack.imageUrl ? (
            <img
              src={currentTrack.imageUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-lg object-cover shadow-lg shadow-emerald-500/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Music className="w-6 h-6 text-emerald-400" />
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">
            {currentTrack.title}
          </h4>
          <p className="text-xs text-gray-400 truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-300 transition-all duration-300"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={onPlayPause}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              "bg-emerald-500/10 hover:bg-emerald-500/20",
              "text-emerald-300 hover:text-emerald-200"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-300 transition-all duration-300"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}; 