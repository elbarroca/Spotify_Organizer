import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog';
import { Users, Lock, Music2, Share2, Headphones, MessageCircle, X, PlayCircle, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/utils/cn';

interface CommunityDetails extends Community {
  recentActivity: {
    type: 'playlist' | 'message' | 'member';
    user: string;
    content: string;
    timestamp: string;
  }[];
  topPlaylists: {
    name: string;
    creator: string;
    trackCount: number;
    duration: string;
  }[];
}

interface CommunityModalProps {
  community: CommunityDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function CommunityModal({ community, isOpen, onClose }: CommunityModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'playlists' | 'members'>('overview');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/90 backdrop-blur-md z-50" />
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-gray-900/95 via-gray-900/98 to-gray-800/95 rounded-2xl shadow-2xl z-50 border border-white/10 overflow-hidden">
        <div className="overflow-y-auto max-h-[90vh] custom-scrollbar">
          {/* Enhanced Header with Background Pattern */}
          <div className="relative h-56 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent">
              <div className="absolute inset-0 opacity-30" 
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310B981' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{community.name}</h2>
                  <div className="flex items-center gap-4 text-gray-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{community.memberCount.toLocaleString()} members</span>
                    </div>
                    {community.isPrivate && (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Private Community</span>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors backdrop-blur-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs */}
          <div className="px-6 border-b border-white/10 bg-black/20">
            <div className="flex gap-8">
              {(['overview', 'playlists', 'members'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-4 px-2 text-sm font-medium border-b-2 transition-all relative",
                    activeTab === tab 
                      ? "text-emerald-400 border-emerald-400" 
                      : "text-gray-400 border-transparent hover:text-white hover:border-white/20"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-emerald-500/10 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">About</h3>
                      <p className="text-gray-300">{community.description}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {community.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                      <div className="space-y-4">
                        {community.recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              {activity.type === 'playlist' && <Music2 className="w-4 h-4 text-emerald-400" />}
                              {activity.type === 'message' && <MessageCircle className="w-4 h-4 text-emerald-400" />}
                              {activity.type === 'member' && <Users className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm">
                                <span className="font-medium text-emerald-400">{activity.user}</span>
                                {' '}{activity.content}
                              </p>
                              <p className="text-xs text-gray-400">{activity.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'playlists' && (
                  <div className="grid gap-4">
                    {community.topPlaylists.map((playlist, index) => (
                      <div key={index} className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PlayCircle className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">{playlist.name}</h4>
                            <p className="text-sm text-gray-400">Created by {playlist.creator}</p>
                          </div>
                          <div className="text-right text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                              <Music2 className="w-4 h-4" />
                              <span>{playlist.trackCount} tracks</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{playlist.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-emerald-400 font-medium">
                              {String.fromCharCode(65 + index)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium">User {index + 1}</h4>
                            <p className="text-sm text-gray-400">Member since {new Date().toLocaleDateString()}</p>
                          </div>
                          <button className="px-3 py-1 text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors">
                            Follow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* New Footer Actions */}
          <div className="sticky bottom-0 p-4 bg-gray-900/95 border-t border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
              <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all duration-300 font-medium hover:scale-105 active:scale-95">
                Join Community
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 