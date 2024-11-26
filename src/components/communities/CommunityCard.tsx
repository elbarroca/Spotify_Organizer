import { useState } from 'react';
import { cn } from '@/utils/cn';
import { type Community } from '@/types/community';
import { CommunityModal } from './CommunityModal';

interface CommunityCardProps {
  community: Community;
  onClick?: () => void;
}

export function CommunityCard({ community, onClick }: CommunityCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
    onClick?.();
  };

  return (
    <>
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl bg-gray-800/50 p-4 transition-all duration-300',
          'hover:bg-gray-800/70 hover:shadow-lg',
          isHovered && 'scale-[1.02]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">{community.name}</h3>
          <p className="mt-1 text-sm text-gray-400">
            {community.memberCount.toLocaleString()} members
          </p>
        </div>

        <p className="mb-4 text-sm text-gray-300 line-clamp-2">
          {community.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {community.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-700/50 px-2 py-1 text-xs text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {community.isPrivate && (
          <div className="absolute right-4 top-4">
            <span className="rounded-full bg-gray-700/50 px-2 py-1 text-xs text-gray-300">
              Private
            </span>
          </div>
        )}
      </div>

      <CommunityModal
        community={community}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
} 