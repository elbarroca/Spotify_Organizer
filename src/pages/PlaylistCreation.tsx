import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, PlayCircle, Music } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

interface PlaylistPreview {
  name: string;
  songCount: number;
  songs: SpotifyApi.TrackObjectFull[];
}

export default function PlaylistCreation() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PlaylistPreview[]>([]);
  const criteria = location.state?.criteria;

  useEffect(() => {
    const fetchLikedSongs = async () => {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        
        const groupedSongs = groupSongsByCriteria(data.items.map((item: any) => item.track), criteria);
        setPlaylists(groupedSongs);
      } catch (error) {
        console.error('Error fetching liked songs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchLikedSongs();
    }
  }, [token, criteria]);

  const handleCreatePlaylists = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await userResponse.json();
      
      // Create playlists
      const createdPlaylists = await Promise.all(
        playlists.map(async (playlist) => {
          const createResponse = await fetch(
            `https://api.spotify.com/v1/users/${userData.id}/playlists`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: playlist.name,
                description: `Created by SpotOrganize - ${criteria} playlist`,
                public: false,
              }),
            }
          );
          const newPlaylist = await createResponse.json();
          
          // Add tracks to playlist
          await fetch(
            `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: playlist.songs.map((song) => song.uri),
              }),
            }
          );
          
          return newPlaylist;
        })
      );
      
      navigate('/review', { state: { playlists: createdPlaylists } });
    } catch (error) {
      console.error('Error creating playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupSongsByCriteria = (songs: SpotifyApi.TrackObjectFull[], criteria: string) => {
    const grouped: { [key: string]: SpotifyApi.TrackObjectFull[] } = {};
    
    songs.forEach(song => {
      let key = '';
      switch (criteria) {
        case 'genre':
          key = 'Pop'; // We'd need additional API calls for actual genres
          break;
        case 'artist':
          key = song.artists[0].name;
          break;
        case 'year':
          key = new Date(song.album.release_date).getFullYear().toString();
          break;
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(song);
    });

    return Object.entries(grouped)
      .filter(([_, songs]) => songs.length >= 3) // Only create playlists with 3 or more songs
      .map(([name, songs]) => ({
        name: `${name} ${criteria === 'year' ? 'Hits' : 'Mix'}`,
        songCount: songs.length,
        songs,
      }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          <p className="mt-4 text-white">Analyzing your music...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            Preview Your New Playlists
          </h1>
          <p className="text-gray-400">
            We'll create the following playlists based on your liked songs
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          {playlists.map((playlist) => (
            <div
              key={playlist.name}
              className="bg-black/20 border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Music className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-white">
                    {playlist.name}
                  </h3>
                </div>
                <span className="text-sm text-gray-400">
                  {playlist.songCount} songs
                </span>
              </div>
              <div className="space-y-2">
                {playlist.songs.slice(0, 3).map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center text-gray-300 text-sm"
                  >
                    <PlayCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">
                      {song.name} - {song.artists[0].name}
                    </span>
                  </div>
                ))}
                {playlist.songCount > 3 && (
                  <p className="text-sm text-gray-500">
                    And {playlist.songCount - 3} more songs...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate('/criteria')}
            className="px-6 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5"
          >
            Back
          </button>
          <button
            onClick={handleCreatePlaylists}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
          >
            Create Playlists
          </button>
        </div>
      </div>
    </Layout>
  );
}