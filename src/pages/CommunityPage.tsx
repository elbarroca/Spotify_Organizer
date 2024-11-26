import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, Music2, MessageCircle, Share2, Plus, 
  Heart, Play, MoreHorizontal, Clock 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface CommunityPost {
  id: string;
  type: 'playlist' | 'track' | 'discussion';
  user: {
    name: string;
    image?: string;
  };
  content: {
    title: string;
    description?: string;
    image?: string;
    trackCount?: number;
    duration?: string;
  };
  likes: number;
  comments: number;
  timestamp: string;
}

export default function CommunityPage() {
  const { communityId } = useParams();
  const { spotifyApi } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeMembers, setActiveMembers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // ... Add necessary state and effects

  const handleCreatePost = () => {
    // Implement post creation logic
  };

  const handleSharePlaylist = async () => {
    // Implement playlist sharing logic
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Community Header */}
      <div className="h-64 relative bg-gradient-to-b from-emerald-500/20 to-transparent">
        {/* ... Community header content ... */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Feed Section */}
          <div className="col-span-2 space-y-6">
            {/* Create Post */}
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              {/* ... Post creation form ... */}
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10"
                >
                  {/* ... Post content ... */}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              {/* ... Stats content ... */}
            </div>

            {/* Active Now */}
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              {/* ... Active members section ... */}
            </div>

            {/* Top Playlists */}
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              {/* ... Top playlists section ... */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 