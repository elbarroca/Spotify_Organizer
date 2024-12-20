import { Music, Pause, Play, SkipBack, SkipForward, Heart, ListMusic } from 'lucide-react';
import { cn } from '@/utils/cn';
import { spotifyClient } from '@/lib/spotify-api';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { SpotifyTrack, SpotifyAlbum } from '@/types/spotify';

interface NowPlayingProps {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  onPlaybackChange: () => Promise<void>;
  onGetSimilar: () => Promise<void>;
  onAddToLiked: () => Promise<void>;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({
  currentTrack,
  isPlaying,
  onPlaybackChange,
  onGetSimilar,
  onAddToLiked
}) => {
  if (!currentTrack || !currentTrack.album) {
    return null;
  }

  const albumImage = currentTrack.album.images?.[0]?.url || '/album-placeholder.png';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-black/95 backdrop-blur-lg border-t border-white/5 p-4">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={albumImage}
            alt={currentTrack.name}
            className="w-14 h-14 rounded-md"
          />
          <div>
            <div className="font-medium text-white">{currentTrack.name}</div>
            <div className="text-sm text-gray-400">
              {currentTrack.artists.map(artist => artist.name).join(', ')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onPlaybackChange}
            className="p-3 bg-white rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-black" />
            )}
          </button>

          <button
            onClick={onAddToLiked}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Add to Liked Songs"
          >
            <Heart className="w-5 h-5" />
          </button>

          <button
            onClick={onGetSimilar}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Find Similar Songs"
          >
            <ListMusic className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};