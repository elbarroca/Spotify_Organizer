import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

interface PlaylistSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, imageUrl?: string) => Promise<void>;
  defaultName?: string;
  defaultDescription?: string;
  tracksCount: number;
}

const PlaylistSaveModal: React.FC<PlaylistSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName = '',
  defaultDescription = '',
  tracksCount
}) => {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [imageUrl, setImageUrl] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(name, description, imageUrl);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Save Playlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Playlist Image
            </label>
            <div className="relative h-32 bg-gray-700/50 rounded-lg overflow-hidden">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Playlist cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Playlist Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700/50 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700/50 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={3}
            />
          </div>

          <p className="text-gray-400 text-sm">
            {tracksCount} tracks will be added to this playlist
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Playlist...
              </>
            ) : (
              'Create Playlist'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlaylistSaveModal; 