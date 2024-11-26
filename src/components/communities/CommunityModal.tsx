import { useState } from 'react';
import { cn } from '@/utils/cn';
import { type Community } from '@/types/community';

interface CommunityModalProps {
  community: Community;
  isOpen: boolean;
  onClose: () => void;
}

export function CommunityModal({ community, isOpen, onClose }: CommunityModalProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'playlists'>('activity');

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
        'transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <div className="relative w-full max-w-4xl rounded-xl bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">{community.name}</h2>
          <div className="flex items-center gap-4 text-gray-400">
            <span>{community.memberCount.toLocaleString()} members</span>
            {community.isPrivate && (
              <span className="flex items-center gap-1">
                <span>Private</span>
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'activity'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Recent Activity
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'playlists'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Top Playlists
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About</h3>
            <p className="text-gray-300">{community.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {community.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'activity' ? (
              <div className="space-y-4">
                {community.recentActivity.map((activity, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 rounded-lg bg-gray-800/50 p-4"
                  >
                    <div className="flex-1">
                      <p className="text-gray-300">
                        <span className="font-medium text-white">
                          {activity.user}
                        </span>{' '}
                        {activity.content}
                      </p>
                      <span className="text-sm text-gray-400">
                        {activity.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {community.topPlaylists.map((playlist, index: number) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-lg bg-gray-800/50 p-4"
                  >
                    <h4 className="font-medium text-white">{playlist.name}</h4>
                    <p className="text-sm text-gray-400">
                      Created by {playlist.creator}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{playlist.trackCount} tracks</span>
                      <span>{playlist.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
} 