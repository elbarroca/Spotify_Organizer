import { useState, useEffect } from 'react';
import { LikedTrack } from '../types/spotify'; // Create this type if not exists

export const useSpotifyTracks = () => {
  const [tracks, setTracks] = useState<LikedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const metadata = localStorage.getItem('spotify_liked_songs_metadata');
        if (!metadata) {
          setLoading(false);
          return;
        }

        const { chunks: chunkCount } = JSON.parse(metadata);
        let allTracks: LikedTrack[] = [];

        for (let i = 0; i < chunkCount; i++) {
          const chunk = localStorage.getItem(`spotify_liked_songs_chunk_${i}`);
          if (chunk) {
            allTracks = [...allTracks, ...JSON.parse(chunk)];
          }
        }

        setTracks(allTracks);
      } catch (error) {
        console.error('Error loading tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, []);

  return { tracks, loading };
}; 