import { useEffect, useState, useCallback, useRef } from 'react';
import { spotifyClient } from '@/lib/spotify-api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NowPlaying } from '@/components/NowPlaying';
import { SpotifyTrack } from '@/types/spotify';

interface CurrentlyPlaying {
  item: SpotifyApi.TrackObjectFull | null;
  is_playing: boolean;
  progress_ms: number | null;
}

const Dashboard = () => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const FETCH_COOLDOWN = 1000; // 1 second cooldown between fetches

  const fetchCurrentlyPlaying = useCallback(async (force = false) => {
    // Prevent concurrent fetches and respect cooldown
    const now = Date.now();
    if (
      isFetchingRef.current || 
      (!force && now - lastFetchTimeRef.current < FETCH_COOLDOWN)
    ) {
      return;
    }

    isFetchingRef.current = true;
    try {
      const response = await spotifyClient.getCurrentPlayback();
      if (!response || !response.item || response.item.type !== 'track') {
        setCurrentlyPlaying(null);
        return;
      }

      setCurrentlyPlaying((prev) => {
        if (
          !prev ||
          prev.item?.id !== response.item?.id ||
          prev.is_playing !== response.is_playing ||
          Math.abs((prev.progress_ms || 0) - (response.progress_ms || 0)) > 2000
        ) {
          // Only log when there's a meaningful change
          if (process.env.NODE_ENV === 'development') {
            console.log('Playback state updated:', response);
          }
          return {
            item: response.item as SpotifyApi.TrackObjectFull,
            is_playing: response.is_playing,
            progress_ms: response.progress_ms
          };
        }
        return prev;
      });
    } catch (error) {
      if (error instanceof Error && !error.message.includes('No active device found')) {
        console.error('Failed to fetch currently playing:', error);
      }
      setCurrentlyPlaying(null);
    } finally {
      isFetchingRef.current = false;
      lastFetchTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Initial fetch
    fetchCurrentlyPlaying(true);

    // Set up polling interval for playback state
    const interval = setInterval(() => {
      fetchCurrentlyPlaying();
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, navigate, fetchCurrentlyPlaying]);

  const handlePlaybackChange = useCallback(() => {
    fetchCurrentlyPlaying(true);
  }, [fetchCurrentlyPlaying]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
      {/* Now Playing Section */}
      {currentlyPlaying?.item && (
        <div className="mb-12">
          <NowPlaying
            currentTrack={currentlyPlaying.item as SpotifyTrack}
            isPlaying={currentlyPlaying.is_playing}
            onPlaybackChange={async () => await handlePlaybackChange()}
            onGetSimilar={async () => {}}
            onAddToLiked={async () => {}}
          />
        </div>
      )}

      {!currentlyPlaying && (
        <div className="mb-12 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Playback Status</h2>
          <p className="text-gray-400">
            No track currently playing. Make sure:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-2">
            <li>Spotify is open and playing music</li>
            <li>You're using the same Spotify account</li>
            <li>Your device is active and online</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 