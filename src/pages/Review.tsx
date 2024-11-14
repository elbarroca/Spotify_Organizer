import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Music, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

interface PlaylistState {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
}

export default function Review() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistState[]>(
    location.state?.playlists || []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRename = async (playlistId: string) => {
    try {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName }),
      });

      setPlaylists(
        playlists.map((p) =>
          p.id === playlistId ? { ...p, name: editName } : p
        )
      );
      setEditingId(null);
    } catch (error) {
      console.error('Error renaming playlist:', error);
    }
  };

  const handleDelete = async (playlistId: string) => {
    try {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPlaylists(playlists.filter((p) => p.id !== playlistId));
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Your Playlists Are Ready!
          </h1>
          <p className="text-gray-400">
            Your new playlists have been created. You can now rename or remove them
            as needed.
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="bg-black/20 border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-grow">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Music className="w-6 h-6 text-green-500" />
                  </div>
                  {editingId === playlist.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRename(playlist.id);
                        }
                      }}
                      className="ml-3 bg-black/30 text-white px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      autoFocus
                    />
                  ) : (
                    <h3 className="ml-3 text-lg font-medium text-white">
                      {playlist.name}
                    </h3>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {editingId === playlist.id ? (
                    <button
                      onClick={() => handleRename(playlist.id)}
                      className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                    >
                      Save
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(playlist.id);
                          setEditName(playlist.name);
                        }}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(playlist.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <a
                href={playlist.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm text-green-500 hover:text-green-400"
              >
                Open in Spotify →
              </a>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate('/criteria')}
            className="px-6 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5"
          >
            Create More Playlists
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Layout>
  );
}