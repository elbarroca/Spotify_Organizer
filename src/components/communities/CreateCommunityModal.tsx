import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog';
import { X, Music2, Lock, Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (tags.length < 5) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl z-50 p-6">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Create Community</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form className="space-y-6">
            {/* Community Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Community Name
              </label>
              <input
                type="text"
                className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="e.g., Indie Rock Enthusiasts"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                rows={3}
                placeholder="Describe your community..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags (up to 5)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="Add tags and press Enter..."
                  disabled={tags.length >= 5}
                />
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Privacy
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all',
                    !isPrivate
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-gray-800/50 border-white/10 text-gray-400 hover:bg-gray-800'
                  )}
                >
                  <Globe className="w-5 h-5" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all',
                    isPrivate
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-gray-800/50 border-white/10 text-gray-400 hover:bg-gray-800'
                  )}
                >
                  <Lock className="w-5 h-5" />
                  Private
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              Create Community
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 