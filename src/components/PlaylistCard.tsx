import React from 'react';
import { Music, PlayCircle } from 'lucide-react';

interface Song {
  id: string;
  name: string;
  artists: { name: string }[];
}

interface PlaylistCardProps {
  name: string;
  songCount: number;
  songs: Song[];
  preview?: boolean;
}

export default function PlaylistCard({ name, songCount, songs, preview = false }: PlaylistCardProps) {
  return (
    <div className="bg-black/20 border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-green-500/20 p-2 rounded-lg">
            <Music className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="ml-3 text-lg font-medium text-white">
            {name}
          </h3>
        </div>
        <span className="text-sm text-gray-400">
          {songCount} songs
        </span>
      </div>
      <div className="space-y-2">
        {songs.slice(0, 3).map((song) => (
          <div
            key={song.id}
            className="flex items-center text-gray-300 text-sm"
          >
            <PlayCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {song.name} - {song.artists[0].name}
            </span>
          </div>
        ))}
        {songCount > 3 && (
          <p className="text-sm text-gray-500">
            And {songCount - 3} more songs...
          </p>
        )}
      </div>
    </div>
  );
}