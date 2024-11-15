import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  SpotifyTrack,
  AudioFeatures,
  fetchAllLikedTracks,
  fetchAudioFeatures,
  createSpotifyPlaylist,
  groupTracksByGenre,
  groupTracksByDecade,
  groupTracksByMood,
} from '../utils/spotifyHelpers';

const PlaylistCreation = () => {
  const [searchParams] = useSearchParams();
  const criteria = searchParams.get('criteria');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string>('Fetching your tracks...');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!criteria || !user) return;
    generatePlaylists();
  }, [criteria, user]);

  const generatePlaylists = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      if (!token || !user) return;

      // 1. Fetch tracks
      setProgress('Fetching your liked songs...');
      const tracks = await fetchAllLikedTracks(token);

      // 2. Get audio features if needed
      let audioFeatures: Record<string, AudioFeatures> = {};
      if (criteria === 'mood') {
        setProgress('Analyzing song characteristics...');
        audioFeatures = await fetchAudioFeatures(token, tracks);
      }

      // 3. Group tracks based on criteria
      setProgress('Organizing your music...');
      let groupedTracks: Record<string, SpotifyTrack[]> = {};

      switch (criteria) {
        case 'genre':
          groupedTracks = groupTracksByGenre(tracks);
          break;
        case 'decade':
          groupedTracks = groupTracksByDecade(tracks);
          break;
        case 'mood':
          groupedTracks = groupTracksByMood(tracks, audioFeatures);
          break;
        default:
          throw new Error('Invalid criteria');
      }

      // 4. Create playlists
      setProgress('Creating your playlists...');
      const createdPlaylists = [];

      for (const [groupName, groupTracks] of Object.entries(groupedTracks)) {
        if (groupTracks.length < 3) continue; // Skip if too few tracks

        try {
          await createSpotifyPlaylist(
            token,
            user.id,
            `${groupName} Mix`,
            `Auto-generated ${criteria} playlist by SpotOrganize`,
            groupTracks
          );
          createdPlaylists.push(groupName);
        } catch (error) {
          console.error(`Failed to create playlist for ${groupName}:`, error);
        }
      }

      // 5. Navigate to success page
      navigate('/review', { 
        state: { 
          createdPlaylists,
          criteria 
        } 
      });

    } catch (error) {
      console.error('Failed to generate playlists:', error);
      alert('Failed to generate playlists. Please try again.');
      navigate('/criteria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Organizing Your Music</h2>
        <p className="text-gray-400">{progress}</p>
      </div>
    </div>
  );
};

export default PlaylistCreation;