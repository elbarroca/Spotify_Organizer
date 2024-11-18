import React, { useState } from 'react';
import { X, Upload, Music, Loader2 } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (data: { name: string; description: string; imageUrl: string | null }) => Promise<void>;
  selectedTracks?: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
      name: string;
      images: { url: string }[];
    };
    duration_ms: number;
  }[];
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ isOpen, onClose, onCreatePlaylist, selectedTracks = [] }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onCreatePlaylist({
        name: name.trim(),
        description: description.trim(),
        imageUrl: imagePreview
      });
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Create New Playlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Image
            </label>
            <div className="relative">
              <div className="w-full h-48 bg-gray-700 rounded-lg overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="playlist-image"
              />
              <label
                htmlFor="playlist-image"
                className="absolute bottom-2 right-2 bg-gray-900/80 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-900"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="My Awesome Playlist"
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
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={3}
              placeholder="What's this playlist about?"
            />
          </div>

          {selectedTracks.length > 0 && (
            <div className="mt-4">
              <h4 className="text-white font-medium mb-2">Selected Tracks ({selectedTracks.length})</h4>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {selectedTracks.map(track => (
                  <div key={track.id} className="flex items-center gap-3">
                    <img
                      src={track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-10 h-10 rounded"
                    />
                    <div>
                      <p className="text-white text-sm">{track.name}</p>
                      <p className="text-gray-400 text-xs">
                        {track.artists.map(a => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${
              isLoading || !name
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600'
            } text-white transition-colors`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
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

export default CreatePlaylistModal; 