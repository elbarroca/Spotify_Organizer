import { useState } from 'react';
import { Music2, Share2, MessageCircle, BarChart3, ExternalLink, UserPlus, Check, Play, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Friend {
  id: string;
  name: string;
  image?: string;
  currentTrack?: {
    name: string;
    artist: string;
  };
  metrics: {
    similarityScore: number;
    playlistCount: number;
    followersCount: number;
    monthlyListeners?: number;
    topGenres: string[];
    recentlyPlayed?: number;
  };
  relationship: {
    isFollowingMe: boolean;
    isFollowedByMe: boolean;
    mutualFriends: number;
  };
  spotifyUrl: string;
}

interface FriendCardProps {
  friend: Friend;
}

export function FriendCard({ friend }: FriendCardProps) {
  const [isFollowing, setIsFollowing] = useState(friend.relationship.isFollowingMe);
  const { spotifyApi } = useAuth();

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await spotifyApi.unfollowUsers([friend.id]);
        setIsFollowing(false);
        toast.success(`Unfollowed ${friend.name}`);
      } else {
        await spotifyApi.followUsers([friend.id]);
        setIsFollowing(true);
        toast.success(`Now following ${friend.name}`);
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const handlePlayTrack = async () => {
    if (!friend.currentTrack) return;
    try {
      // Get track ID and play it
      const searchResult = await spotifyApi.searchTracks(
        `${friend.currentTrack.name} ${friend.currentTrack.artist}`
      );
      const trackUri = searchResult.body.tracks?.items[0]?.uri;
      if (trackUri) {
        await spotifyApi.play({ uris: [trackUri] });
        toast.success(`Playing ${friend.currentTrack.name}`);
      }
    } catch (error) {
      toast.error('Failed to play track');
    }
  };

  const openSpotifyProfile = () => {
    if (friend.spotifyUrl) {
      window.open(friend.spotifyUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300 border border-white/10"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          {friend.image ? (
            <img
              src={friend.image}
              alt={friend.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-lg font-semibold">
                {friend.name[0]}
              </span>
            </div>
          )}
          {friend.relationship.isFollowingMe && friend.relationship.isFollowedByMe && (
            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1">
              <Users className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
            {friend.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              {friend.relationship.isFollowingMe && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  Follows you
                </span>
              )}
              {friend.relationship.isFollowedByMe && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  Following
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Match Score</p>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-semibold text-white">
              {friend.metrics.similarityScore}%
            </span>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Followers</p>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-semibold text-white">
              {friend.metrics.followersCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Top Genres */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {friend.metrics.topGenres.map((genre, index) => (
            <span
              key={index}
              className="text-xs bg-white/5 text-gray-300 px-2 py-1 rounded-full"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Enhanced Currently Playing Section */}
      {friend.currentTrack && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg group/track cursor-pointer"
             onClick={handlePlayTrack}>
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover/track:bg-emerald-500/30 transition-colors">
              <Music2 className="w-4 h-4 text-emerald-400 group-hover/track:hidden" />
              <Play className="w-4 h-4 text-emerald-400 hidden group-hover/track:block" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {friend.currentTrack.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {friend.currentTrack.artist}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Playlists</p>
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-semibold text-white">
              {friend.metrics.playlistCount}
            </span>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Recently Played</p>
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-semibold text-white">
              {friend.metrics.recentlyPlayed}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button 
            onClick={openSpotifyProfile}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={handleFollow}
          className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium flex items-center gap-2
            ${isFollowing 
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
        >
          {isFollowing ? (
            <>
              <Check className="w-4 h-4" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Follow
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
} 