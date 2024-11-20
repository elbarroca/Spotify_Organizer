import React, { useEffect, useState } from 'react';
import { 
  Music, 
  Loader2, 
  Search, 
  CheckSquare, 
  Square,
  Trash2,
  RefreshCw,
  Combine,
  Filter,
  Info,
  X,
  Plus,
  ArrowLeft,
  Home,
  PlayCircle,
  Edit2,
  BookmarkIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { toast } from 'sonner';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: {
    total: number;
    href: string;
    items?: { track: Track }[];
  };
  owner: {
    display_name: string;
  };
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTracks: Track[];
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string) => Promise<void>;
}

const AddToPlaylistModal: React.FC<ModalProps> = ({ isOpen, onClose, selectedTracks, playlists, onAddToPlaylist }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Add to Playlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-400 mb-4">
          Selected tracks: {selectedTracks.length}
        </p>
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => onAddToPlaylist(playlist.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <img 
                src={playlist.images[0]?.url || '/playlist-placeholder.png'}
                alt={playlist.name}
                className="w-12 h-12 rounded"
              />
              <div className="text-left">
                <h4 className="text-white font-medium">{playlist.name}</h4>
                <p className="text-gray-400 text-sm">{playlist.tracks.total} tracks</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ 
  playlist, 
  onConfirm, 
  onClose 
}: { 
  playlist: Playlist | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  if (!playlist) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Delete Playlist?</h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete Playlist
          </button>
        </div>
      </div>
    </div>
  );
};

const SuccessModal = ({ 
  playlist, 
  onClose,
  onOpenSpotify 
}: { 
  playlist: { name: string; id: string } | null;
  onClose: () => void;
  onOpenSpotify: () => void;
}) => {
  if (!playlist) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 animate-fadeIn">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="w-8 h-8 text-white animate-scaleIn" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 animate-slideUp">
            Now "{playlist.name}" is live on your Spotify
          </h3>
          <p className="text-gray-300 mb-8 animate-slideUp delay-100">
            Listen with joy
          </p>
          <div className="flex items-center justify-center gap-4 animate-slideUp delay-200">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={onOpenSpotify}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Open in Spotify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Organize = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'tracks'>('grid');
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [newPlaylist, setNewPlaylist] = useState<{ name: string; id: string } | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);

  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('spotify_access_token');
      
      if (!token || !isAuthenticated) return;

      // Fetch all user playlists with pagination
      const getAllPlaylists = async () => {
        let allPlaylists: Playlist[] = [];
        let nextUrl = 'https://api.spotify.com/v1/me/playlists?limit=50'; // Increased limit to 50

        while (nextUrl) {
          const response = await fetch(nextUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            if (response.status === 401) {
              localStorage.removeItem('spotify_access_token');
              navigate('/');
              return null;
            }
            throw new Error('Failed to fetch playlists');
          }

          const data = await response.json();
          allPlaylists = [...allPlaylists, ...data.items];
          nextUrl = data.next; // Will be null when no more pages
        }

        return allPlaylists;
      };

      // Fetch all playlists
      const allPlaylists = await getAllPlaylists();
      
      if (!allPlaylists) return;

      // Filter user's own playlists and saved playlists
      const ownPlaylists = allPlaylists.filter(
        playlist => playlist.owner.display_name === user?.display_name
      );
      
      const otherPlaylists = allPlaylists.filter(
        playlist => playlist.owner.display_name !== user?.display_name
      );

      // Sort by most recently modified
      const sortByRecent = (a: Playlist, b: Playlist) => {
        return new Date(b.tracks.href).getTime() - new Date(a.tracks.href).getTime();
      };

      setUserPlaylists(ownPlaylists.sort(sortByRecent));
      setSavedPlaylists(otherPlaylists.sort(sortByRecent));
      setPlaylists([...ownPlaylists, ...otherPlaylists]);
      setFilteredPlaylists([...ownPlaylists, ...otherPlaylists]);

      // Log counts for verification
      console.log('Total playlists fetched:', allPlaylists.length);
      console.log('User created playlists:', ownPlaylists.length);
      console.log('Saved/followed playlists:', otherPlaylists.length);

    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      toast.error('Failed to load playlists', {
        description: 'Please try refreshing the page or logging in again'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add dependency to useEffect
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPlaylists();
    }
  }, [isAuthenticated, user]);

  // Search effect
  useEffect(() => {
    if (!playlists.length) return;
    
    if (searchTerm.trim() === '') {
      setFilteredPlaylists(playlists);
    } else {
      const filtered = playlists.filter(playlist => 
        playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPlaylists(filtered);
    }
  }, [searchTerm, playlists]);

  // Cleanup audio preview
  useEffect(() => {
    return () => {
      if (audioPreview) {
        audioPreview.pause();
        audioPreview.src = '';
      }
    };
  }, [audioPreview]);

  const fetchPlaylistTracks = async (playlistId: string) => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const playlist = playlists.find(p => p.id === playlistId);
      
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlaylist({
          ...playlist!,
          tracks: {
            ...playlist!.tracks,
            items: data.items
          }
        });
        setViewMode('tracks');
      }
    } catch (error) {
      console.error('Failed to fetch playlist tracks:', error);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTrackSelect = (trackId: string) => {
    setSelectedTracks(prev => 
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const addTracksToPlaylist = async (playlistId: string) => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const selectedTrackUris = activePlaylist?.tracks.items
        ?.filter(({ track }) => selectedTracks.includes(track.id))
        .map(({ track }) => `spotify:track:${track.id}`);

      if (!selectedTrackUris?.length) return;

      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: selectedTrackUris
        })
      });

      setIsModalOpen(false);
      setSelectedTracks([]);
      alert('Tracks added successfully!');
    } catch (error) {
      console.error('Failed to add tracks:', error);
      alert('Failed to add tracks. Please try again.');
    }
  };

  const handleCreatePlaylist = async (data: { name: string; description: string; imageUrl: string | null }) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('spotify_access_token');
      
      if (!user?.id || !token) {
        throw new Error('User ID or token not found');
      }

      // Create playlist
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || '',
          public: false
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create playlist');
      }

      const newPlaylist = await createResponse.json();

      // If there's an image, upload it
      if (data.imageUrl) {
        try {
          const base64Image = data.imageUrl.split(',')[1];
          await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/images`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'image/jpeg',
            },
            body: base64Image
          });
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
        }
      }

      // Add selected tracks if any
      if (selectedTracks.length > 0) {
        const tracksToAdd = activePlaylist?.tracks.items
          ?.filter(({ track }) => selectedTracks.includes(track.id))
          .map(({ track }) => `spotify:track:${track.id}`);

        if (tracksToAdd?.length) {
          await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: tracksToAdd })
          });
        }
      }

      // Refresh playlists and show success
      await fetchPlaylists();
      setNewPlaylist({ name: data.name, id: newPlaylist.id });
      setIsCreateModalOpen(false);
      alert('Playlist created successfully!');
      
    } catch (error) {
      console.error('Create playlist error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create playlist');
    } finally {
      setIsProcessing(false);
    }
  };

  const playPreview = async (track: Track) => {
    if (audioPreview) {
      audioPreview.pause();
      audioPreview.src = '';
    }

    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(`https://api.spotify.com/v1/tracks/${track.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.preview_url) {
          const audio = new Audio(data.preview_url);
          audio.play();
          setAudioPreview(audio);
        }
      }
    } catch (error) {
      console.error('Failed to play preview:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchPlaylists(); // Refresh playlists
        setPlaylistToDelete(null); // Close confirmation modal
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      alert('Failed to delete playlist. Please try again.');
    }
  };

  useEffect(() => {
    console.log('Playlists:', playlists);
    console.log('Filtered Playlists:', filteredPlaylists);
    console.log('Loading:', loading);
  }, [playlists, filteredPlaylists, loading]);

  const LoadingState = () => (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
      <p className="text-gray-400">Loading your playlists...</p>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>Please log in to view your playlists</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!playlists.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>No playlists found</p>
          <button 
            onClick={fetchPlaylists}
            className="mt-4 px-4 py-2 bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Header */}
        <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </button>
              <span className="text-gray-500">/</span>
              <h1 className="text-white font-semibold">Organize Music</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Playlist
              </button>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search playlists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-800/50 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
                />
              </div>
              <button
                onClick={() => fetchPlaylists()}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Refresh playlists"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto px-6 py-8">
          {viewMode === 'grid' ? (
            <div className="space-y-8">
              {/* Your Playlists Section */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Music className="w-6 h-6" />
                  Your Created Playlists
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {userPlaylists.map((playlist) => {
                    if (!playlist || !playlist.images) return null;

                    const imageUrl = playlist.images?.[0]?.url || '/playlist-placeholder.png';
                    const playlistName = playlist.name || 'Untitled Playlist';
                    const trackCount = playlist.tracks?.total || 0;

                    return (
                      <div
                        key={playlist.id}
                        className="group relative bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800/70 transition-all duration-300"
                      >
                        <div className="relative aspect-square">
                          <img
                            src={imageUrl}
                            alt={playlistName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                              onClick={() => fetchPlaylistTracks(playlist.id)}
                              className="p-2 bg-emerald-500 rounded-full hover:bg-emerald-600 transition-colors"
                              title="View Tracks"
                            >
                              <Music className="w-5 h-5 text-white" />
                            </button>
                            {playlist.owner.display_name === user?.display_name && (
                              <button
                                onClick={() => setPlaylistToDelete(playlist)}
                                className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                title="Delete Playlist"
                              >
                                <Trash2 className="w-5 h-5 text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="text-white font-medium text-sm truncate">
                            {playlistName}
                          </h3>
                          <p className="text-gray-400 text-xs">
                            {trackCount} tracks
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Saved Playlists Section */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <BookmarkIcon className="w-6 h-6" />
                  Saved Playlists
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {savedPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="group relative bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800/70 transition-all duration-300"
                    >
                      <div className="relative aspect-square">
                        <img
                          src={playlist.images[0]?.url || '/playlist-placeholder.png'}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() => fetchPlaylistTracks(playlist.id)}
                            className="p-2 bg-emerald-500 rounded-full hover:bg-emerald-600 transition-colors"
                            title="View Tracks"
                          >
                            <Music className="w-5 h-5 text-white" />
                          </button>
                          {playlist.owner.display_name === user?.display_name && (
                            <button
                              onClick={() => setPlaylistToDelete(playlist)}
                              className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                              title="Delete Playlist"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-white font-medium text-sm truncate">
                          {playlist.name}
                        </h3>
                        <p className="text-gray-400 text-xs">
                          {playlist.tracks.total} tracks
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            // Tracks View
            <div className="bg-gray-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Playlists
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    {selectedTracks.length} tracks selected
                  </span>
                  {selectedTracks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Playlist
                      </button>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Playlist
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {activePlaylist?.tracks.items?.map(({ track }) => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-4 p-4 rounded-lg hover:bg-gray-700/50 transition-colors ${
                      selectedTracks.includes(track.id) ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={track.album.images[0]?.url}
                        alt={track.album.name}
                        className="w-12 h-12 rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{track.name}</h4>
                      <p className="text-gray-400 text-sm truncate">
                        {track.artists.map(a => a.name).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        {formatDuration(track.duration_ms)}
                      </span>
                      <button
                        onClick={() => handleTrackSelect(track.id)}
                        className="p-1 rounded-md hover:bg-gray-600/50 transition-colors"
                      >
                        {selectedTracks.includes(track.id) ? (
                          <CheckSquare className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => playPreview(track)}
                        className="p-2 rounded-full hover:bg-gray-600/50 transition-colors"
                      >
                        <PlayCircle className="w-5 h-5 text-emerald-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddToPlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedTracks={
          activePlaylist?.tracks.items
            ?.filter(({ track }) => selectedTracks.includes(track.id))
            .map(({ track }) => track) || []
        }
        playlists={playlists}
        onAddToPlaylist={addTracksToPlaylist}
      />

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <DeleteConfirmationModal
        playlist={playlistToDelete}
        onConfirm={() => {
          if (playlistToDelete) {
            handleDeletePlaylist(playlistToDelete.id);
          }
        }}
        onClose={() => setPlaylistToDelete(null)}
      />

      <SuccessModal
        playlist={newPlaylist}
        onClose={() => {
          setNewPlaylist(null);
          navigate('/');
        }}
        onOpenSpotify={() => {
          if (newPlaylist) {
            window.open(`https://open.spotify.com/playlist/${newPlaylist.id}`, '_blank');
          }
        }}
      />
    </>
  );
};

export default Organize; 