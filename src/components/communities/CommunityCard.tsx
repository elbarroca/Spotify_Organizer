import { Users, Lock, Music2, Share2, Headphones, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { CommunityModal } from './CommunityModal';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  image?: string;
  tags: string[];
  isPrivate: boolean;
}

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for the modal
  const communityDetails: CommunityDetails = {
    ...community,
    recentActivity: [
      {
        type: 'playlist',
        user: 'Alex',
        content: 'shared a new playlist "Summer Vibes 2024"',
        timestamp: '2 hours ago'
      },
      {
        type: 'message',
        user: 'Sarah',
        content: 'started a discussion about indie rock bands',
        timestamp: '4 hours ago'
      },
      {
        type: 'member',
        user: 'Mike',
        content: 'joined the community',
        timestamp: '6 hours ago'
      }
    ],
    topPlaylists: [
      {
        name: 'Best of Genre',
        creator: 'Community Playlist',
        trackCount: 50,
        duration: '3h 25m'
      },
      {
        name: 'New Discoveries',
        creator: 'Alex',
        trackCount: 30,
        duration: '2h 10m'
      }
    ]
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsModalOpen(true)}
        className="group bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300 border border-white/10 relative overflow-hidden cursor-pointer"
      >
        {/* Background Animation */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] transition-transform duration-1000",
            isHovered && "translate-x-[100%]"
          )}
        />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {community.name}
                </h3>
                {community.isPrivate && (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">
                {community.description}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Music2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Users className="w-4 h-4" />
                <span>Members</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {community.memberCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Headphones className="w-4 h-4" />
                <span>Active Now</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {Math.floor(community.memberCount * 0.1).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {community.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all duration-300 text-sm font-medium hover:scale-105 active:scale-95">
              Join Community
            </button>
          </div>
        </div>
      </motion.div>

      <CommunityModal
        community={communityDetails}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
} 