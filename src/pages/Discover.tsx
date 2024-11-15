import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Loader2, Radio } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}

const Discover = () => {
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopArtists();
  }, []);

  const fetchTopArtists = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTopArtists(data.items);
        fetchRecommendations(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch top artists:', error);
    }
  };

  const fetchRecommendations = async (artists: Artist[]) => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      const artistIds = artists.map(artist => artist.id).join(',');
      
      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_artists=${artistIds}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.tracks);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Discover New Music</h1>

      {/* Top Artists Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-6">Your Top Artists</h2>
        <div className="grid grid-cols-5 gap-4">
          {topArtists.map((artist) => (
            <div key={artist.id} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
              <img 
                src={artist.images[0]?.url} 
                alt={artist.name}
                className="w-full aspect-square object-cover rounded-lg mb-4"
              />
              <h3 className="text-white font-medium">{artist.name}</h3>
              <p className="text-gray-400 text-sm">{artist.genres[0]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations Section */}
      <section>
        <h2 className="text-2xl font-semibold text-white mb-6">Recommended Tracks</h2>
        <div className="grid gap-2">
          {recommendations.map((track) => (
            <div 
              key={track.id}
              className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group"
            >
              <img 
                src={track.album.images[0]?.url}
                alt={track.name}
                className="w-12 h-12 rounded"
              />
              <div className="flex-1">
                <h3 className="text-white font-medium">{track.name}</h3>
                <p className="text-gray-400 text-sm">
                  {track.artists.map((a: any) => a.name).join(', ')}
                </p>
              </div>
              <Radio className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Discover; 