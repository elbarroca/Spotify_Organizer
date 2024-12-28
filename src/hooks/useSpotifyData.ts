import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SpotifyTrack, AudioFeatures } from '@/types/spotify';

interface TrackDetails {
  isLoading: boolean;
  error: string | null;
  audioFeatures: AudioFeatures | null;
}

interface CurrentlyPlaying {
  is_playing: boolean;
  item: SpotifyTrack;
}

export function useSpotifyData() {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [trackDetails, setTrackDetails] = useState<TrackDetails>({
    isLoading: false,
    error: null,
    audioFeatures: null
  });

  const { spotifyToken } = useAuth();
  const audioFeaturesCache = useRef<Map<string, AudioFeatures>>(new Map());
  const hasAudioFeaturesScope = useRef<boolean | null>(null);

  const refreshPlayback = useCallback(async () => {
    if (!spotifyToken) return;

    try {
      // Get current playback
      const playbackResponse = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      });

      if (playbackResponse.status === 204) {
        setCurrentlyPlaying(null);
        return;
      }

      if (!playbackResponse.ok) {
        throw new Error(`Failed to fetch playback: ${playbackResponse.status}`);
      }

      const playbackState = await playbackResponse.json();
      
      if (playbackState && playbackState.item) {
        setCurrentlyPlaying({
          is_playing: playbackState.is_playing,
          item: playbackState.item
        });

        // Check if we have cached audio features
        const cachedFeatures = audioFeaturesCache.current.get(playbackState.item.id);
        if (cachedFeatures) {
          setTrackDetails(prev => ({
            ...prev,
            audioFeatures: cachedFeatures
          }));
          return;
        }

        // Only try to get audio features if we haven't determined we don't have access
        if (hasAudioFeaturesScope.current !== false) {
          try {
            const featuresResponse = await fetch(
              `https://api.spotify.com/v1/audio-features/${playbackState.item.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${spotifyToken}`
                }
              }
            );

            if (featuresResponse.ok) {
              const features = await featuresResponse.json();
              audioFeaturesCache.current.set(playbackState.item.id, features);
              setTrackDetails(prev => ({
                ...prev,
                audioFeatures: features
              }));
              hasAudioFeaturesScope.current = true;
            } else if (featuresResponse.status === 403) {
              // We don't have the necessary scope, remember this
              hasAudioFeaturesScope.current = false;
              console.debug('No access to audio features API');
            }
          } catch (error) {
            // Silently fail for audio features
            console.debug('Failed to fetch audio features:', error);
          }
        }
      } else {
        setCurrentlyPlaying(null);
      }
    } catch (error) {
      console.error('Failed to refresh playback:', error);
      setCurrentlyPlaying(null);
      
      if (error instanceof Error && error.message.includes('401')) {
        toast.error('Session expired. Please log in again.');
      }
    }
  }, [spotifyToken]);

  useEffect(() => {
    if (!spotifyToken) return;

    refreshPlayback();

    // Poll for playback state every 5 seconds
    const interval = setInterval(refreshPlayback, 5000);

    return () => {
      clearInterval(interval);
      // Clear cache on unmount
      audioFeaturesCache.current.clear();
    };
  }, [refreshPlayback, spotifyToken]);

  return {
    currentlyPlaying,
    trackDetails,
    refreshPlayback
  };
} 