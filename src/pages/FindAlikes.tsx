import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Search, Plus, Music2, Share2, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCommunityModal } from '@/components/communities/CreateCommunityModal';
import { CommunityCard } from '@/components/communities/CommunityCard';
import { FriendCard } from '@/components/friends/FriendCard';
import { toast } from 'sonner';

type Tab = 'communities' | 'friends';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  image?: string;
  tags: string[];
  isPrivate: boolean;
}

interface Friend {
  id: string;
  name: string;
  image?: string;
  currentTrack?: {
    name: string;
    artist: string;
  };
  metrics: {
    similarityScore: number;
    playlistCount: number;
    followersCount: number;
    monthlyListeners?: number;
    topGenres: string[];
    recentlyPlayed?: number;
  };
  relationship: {
    isFollowingMe: boolean;
    isFollowedByMe: boolean;
    mutualFriends: number;
  };
  spotifyUrl: string;
}

export default function FindAlikes() {
  const [activeTab, setActiveTab] = useState<Tab>('communities');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const { user, spotifyApi } = useAuth();

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else {
      fetchCommunities();
    }
  }, [activeTab, spotifyApi]);

  const calculateSimilarity = async (userTopTracks: SpotifyApi.TrackObjectFull[], friendTopTracks: SpotifyApi.TrackObjectFull[]) => {
    // Calculate shared artists
    const userArtists = new Set(userTopTracks.map(track => track.artists[0].id));
    const friendArtists = new Set(friendTopTracks.map(track => track.artists[0].id));
    const sharedArtists = new Set([...userArtists].filter(x => friendArtists.has(x)));

    // Calculate shared genres (from artists)
    const [userArtistDetails, friendArtistDetails] = await Promise.all([
      spotifyApi.getArtists([...userArtists]),
      spotifyApi.getArtists([...friendArtists])
    ]);

    const userGenres = new Set(userArtistDetails.body.artists.flatMap(artist => artist.genres));
    const friendGenres = new Set(friendArtistDetails.body.artists.flatMap(artist => artist.genres));
    const sharedGenres = new Set([...userGenres].filter(x => friendGenres.has(x)));

    // Calculate similarity score (weighted average)
    const artistScore = (sharedArtists.size / Math.min(userArtists.size, friendArtists.size)) * 100;
    const genreScore = (sharedGenres.size / Math.min(userGenres.size, friendGenres.size)) * 100;

    return Math.round((artistScore * 0.6) + (genreScore * 0.4));
  };

  const fetchFriends = async () => {
    try {
      setIsLoading(true);

      // Get user's profile and following/followers
      const [userProfile, following, followers] = await Promise.all([
        spotifyApi.getMe(),
        spotifyApi.getFollowed('artist'), // Get followed users
        spotifyApi.getFollowers(userProfile.body.id) // Get followers
      ]);

      // Create sets for quick lookup
      const followingIds = new Set(following.body.artists.items.map(user => user.id));
      const followerIds = new Set(followers.body.items.map(user => user.id));

      // Get user's top items for similarity comparison
      const [userTopTracks, userTopArtists] = await Promise.all([
        spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' }),
        spotifyApi.getMyTopArtists({ limit: 50, time_range: 'medium_term' })
      ]);

      // Process each user (following and followers)
      const allUserIds = new Set([...followingIds, ...followerIds]);
      
      const friendPromises = Array.from(allUserIds).map(async (userId) => {
        try {
          const [userData, userPlaylists, topArtists, recentTracks] = await Promise.all([
            spotifyApi.getUser(userId),
            spotifyApi.getUserPlaylists(userId, { limit: 50 }),
            spotifyApi.getArtists([userId]),
            spotifyApi.getRecentlyPlayedTracks({ limit: 20 })
          ]);

          // Calculate similarity score
          const similarity = await calculateSimilarity(
            userTopTracks.body.items,
            recentTracks.body.items.map(item => item.track)
          );

          // Get current playback if available
          let currentTrack;
          try {
            const playback = await spotifyApi.getMyCurrentPlayingTrack();
            if (playback.body?.item && 'artists' in playback.body.item) {
              currentTrack = {
                name: playback.body.item.name,
                artist: playback.body.item.artists[0].name
              };
            }
          } catch (error) {
            console.log('No current playback for user');
          }

          // Extract top genres
          const userGenres = topArtists.body.artists
            .flatMap(artist => artist.genres)
            .reduce((acc, genre) => {
              acc[genre] = (acc[genre] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

          const topGenres = Object.entries(userGenres)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([genre]) => genre);

          return {
            id: userData.body.id,
            name: userData.body.display_name || userData.body.id,
            image: userData.body.images?.[0]?.url,
            currentTrack,
            metrics: {
              similarityScore: similarity,
              playlistCount: userPlaylists.body.total,
              followersCount: userData.body.followers.total,
              monthlyListeners: topArtists.body.artists[0]?.followers.total,
              topGenres,
              recentlyPlayed: recentTracks.body.items.length
            },
            relationship: {
              isFollowingMe: followerIds.has(userId),
              isFollowedByMe: followingIds.has(userId),
              mutualFriends: 0 // We'll calculate this later
            },
            spotifyUrl: userData.body.external_urls.spotify
          };
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
          return null;
        }
      });

      const friendsData = (await Promise.all(friendPromises))
        .filter((friend): friend is Friend => friend !== null)
        .sort((a, b) => b.metrics.similarityScore - a.metrics.similarityScore);

      setFriends(friendsData);

    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommunities = async () => {
    try {
      setIsLoading(true);
      
      // Get user's top genres to suggest relevant communities
      const topArtists = await spotifyApi.getMyTopArtists({ limit: 50 });
      const genres = topArtists.body.items.flatMap(artist => artist.genres);
      
      // Count genre occurrences
      const genreCounts = genres.reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Sort genres by frequency
      const topGenres = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([genre]) => genre);

      // Create mock communities based on user's top genres
      const suggestedCommunities: Community[] = topGenres.map((genre, index) => ({
        id: `community-${index}`,
        name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Enthusiasts`,
        description: `A community for ${genre} music lovers. Share playlists, discover new artists, and connect with fellow fans.`,
        memberCount: Math.floor(Math.random() * 10000) + 1000,
        tags: [genre, ...topGenres.filter(g => g !== genre).slice(0, 2)],
      isPrivate: false,
      }));

      setCommunities(suggestedCommunities);

    } catch (error) {
      console.error('Error fetching communities:', error);
      toast.error('Failed to load communities data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Find Alikes</h1>
          <p className="text-gray-400">
            Connect with people who share your music taste
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl mb-8 max-w-md">
          {(['communities', 'friends'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === tab
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              {tab === 'communities' ? (
                <Users className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search and Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-gray-800/50 backdrop-blur-sm text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="bg-gray-800/50 backdrop-blur-sm text-white px-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
            >
              <option value="all">All Connections</option>
              <option value="following">Following</option>
              <option value="followers">Followers</option>
              <option value="mutual">Mutual</option>
            </select>
            <select
              className="bg-gray-800/50 backdrop-blur-sm text-white px-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
            >
              <option value="similarity">Sort by Similarity</option>
              <option value="recent">Recently Active</option>
              <option value="followers">Most Followers</option>
            </select>
          </div>
          {activeTab === 'communities' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors duration-200 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-5 h-5" />
              Create Community
            </button>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">
                  {activeTab === 'friends' 
                    ? 'Analyzing music connections...' 
                    : 'Discovering communities...'}
                </p>
              </div>
            </div>
          ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'communities' ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Suggested Communities</h2>
                    <p className="text-gray-400">Based on your music taste</p>
                  </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {communities.map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </div>
                </>
            ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Music Soulmates</h2>
                    <p className="text-gray-400">People who share your taste in music</p>
                  </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {friends.map((friend) => (
                  <FriendCard key={friend.id} friend={friend} />
                ))}
              </div>
                </>
            )}
          </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
} 