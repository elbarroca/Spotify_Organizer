import React, { useState, useEffect } from 'react';
import { X, Music, Loader2 } from 'lucide-react';

interface PlaylistSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, imageUrl?: string) => void;
  defaultName?: string;
  defaultDescription?: string;
  tracksCount?: number;
  customStyles?: any;
}

const PlaylistSaveModal: React.FC<PlaylistSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName = '',
  defaultDescription = '',
  tracksCount = 0,
  customStyles
}) => {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [imageUrl, setImageUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(name, description, imageUrl);
      onClose(); // Close modal after successful save
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn">
      {/* Enhanced Backdrop with blur and animation */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        style={{animation: 'fadeIn 0.2s ease-out'}}
      />
      
      {/* Modal with enhanced visibility and animations */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div 
          className="w-full max-w-md transform overflow-hidden rounded-2xl 
            bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-left 
            shadow-2xl transition-all border border-white/10 animate-slideIn"
          style={{
            boxShadow: '0 0 50px rgba(16, 185, 129, 0.1)',
            animation: 'slideIn 0.3s ease-out'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Enhanced header with gradient text */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-emerald-400 
              bg-clip-text text-transparent">
              Save New Playlist
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 
                hover:scale-110 group"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white 
                transition-colors" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enhanced input fields */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Playlist Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg 
                  text-white placeholder-gray-500 focus:outline-none focus:ring-2 
                  focus:ring-emerald-500 focus:border-transparent transition-all
                  hover:bg-gray-800/70"
                placeholder="Enter playlist name..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg 
                  text-white placeholder-gray-500 focus:outline-none focus:ring-2 
                  focus:ring-emerald-500 focus:border-transparent transition-all
                  hover:bg-gray-800/70"
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {/* Enhanced footer */}
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 text-gray-400 bg-gray-800/30 
                px-3 py-1.5 rounded-full">
                <Music className="w-5 h-5 text-emerald-500" />
                <span>{tracksCount} tracks</span>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium
                  hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 
                  focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 
                  disabled:cursor-not-allowed transition-all flex items-center gap-2
                  hover:scale-105 active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Playlist'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Add these animations to your global CSS or tailwind.config.js
const styles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}
`;

export default PlaylistSaveModal; 