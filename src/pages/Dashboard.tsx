import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, Users, Calendar, Sparkles, Globe, Clock, Heart, Shuffle } from 'lucide-react';
import Layout from '../components/Layout';
import { useSpotify } from '../hooks/useSpotify';
import LoadingSpinner from '../components/LoadingSpinner';

interface TopTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

interface UserProfile {
  country: string;
  display_name: string;
  images: { url: string }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { spotifyFetch } = useSpotify();
  const [loading, setLoading] = useState(true);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<TopTrack[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, topTracksRes, recentRes] = await Promise.all([
          spotifyFetch('/me'),
          spotifyFetch('/me/top/tracks?limit=5&time_range=short_term'),
          spotifyFetch('/me/player/recently-played?limit=5')
        ]);

        if (profileRes.data) setUserProfile(profileRes.data);
        if (topTracksRes.data) setTopTracks(topTracksRes.data.items);
        if (recentRes.data) setRecentlyPlayed(recentRes.data.items.map((item: any) => item.track));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading your music profile..." />;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="relative text-center mb-16">
          <div className="absolute inset-0 -top-32 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-center mb-6">
              {userProfile?.images?.[0] && (
                <img
                  src={userProfile.images[0].url}
                  alt={userProfile.display_name}
                  className="w-20 h-20 rounded-full border-4 border-emerald-500/30"
                />
              )}
            </div>
            <h1 className="text-5xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200">
              Welcome, {userProfile?.display_name}
            </h1>
            <p className="text-xl text-emerald-200/80">
              Let's organize your music collection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-black/30 rounded-2xl p-8 border border-white/10">
            <div className="flex items-center mb-6">
              <Heart className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-2xl font-semibold text-white">Your Top Tracks</h2>
            </div>
            <div className="space-y-4">
              {topTracks.map((track) => (
                <div key={track.id} className="flex items-center space-x-4">
                  <img
                    src={track.album.images[2]?.url}
                    alt={track.name}
                    className="w-12 h-12 rounded-lg"
                  />
                  <div>
                    <p className="text-white font-medium">{track.name}</p>
                    <p className="text-emerald-200/60 text-sm">
                      {track.artists[0].name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/30 rounded-2xl p-8 border border-white/10">
            <div className="flex items-center mb-6">
              <Clock className="w-6 h-6 text-emerald-500 mr-3" />
              <h2 className="text-2xl font-semibold text-white">Recently Played</h2>
            </div>
            <div className="space-y-4">
              {recentlyPlayed.map((track) => (
                <div key={track.id} className="flex items-center space-x-4">
                  <img
                    src={track.album.images[2]?.url}
                    alt={track.name}
                    className="w-12 h-12 rounded-lg"
                  />
                  <div>
                    <p className="text-white font-medium">{track.name}</p>
                    <p className="text-emerald-200/60 text-sm">
                      {track.artists[0].name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: <Music2 className="w-7 h-7" />,
              title: 'By Genre',
              description: 'Group similar songs together',
              action: () => navigate('/criteria', { state: { type: 'genre' } })
            },
            {
              icon: <Globe className="w-7 h-7" />,
              title: 'By Country',
              description: 'Discover music from specific regions',
              action: () => navigate('/criteria', { state: { type: 'country' } })
            },
            {
              icon: <Shuffle className="w-7 h-7" />,
              title: 'Smart Mix',
              description: 'AI-powered playlist creation',
              action: () => navigate('/criteria', { state: { type: 'smart' } })
            }
          ].map((feature, index) => (
            <button
              key={index}
              onClick={feature.action}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.075] to-white/[0.035] border border-white/[0.1] p-8 hover:border-emerald-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 mb-4 group-hover:scale-110 transition-transform">
                  <div className="text-emerald-400">{feature.icon}</div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-emerald-100/60">
                  {feature.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}