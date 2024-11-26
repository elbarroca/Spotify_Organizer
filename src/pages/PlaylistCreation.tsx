import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Music2 } from 'lucide-react';
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

const steps = [
  'Fetching your tracks...',
  'Analyzing song characteristics...',
  'Organizing your music...',
  'Creating your playlists...',
];

const PlaylistCreation = () => {
  const [searchParams] = useSearchParams();
  const criteria = searchParams.get('criteria');
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<string>(steps[0]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!criteria || !user) return;
    generatePlaylists();
  }, [criteria, user]);

  const updateProgress = (step: number, message: string) => {
    setCurrentStep(step);
    setProgress(message);
  };

  const generatePlaylists = async () => {
    try {
      const token = localStorage.getItem('spotify_access_token');
      if (!token || !user) return;

      // 1. Fetch tracks
      updateProgress(0, steps[0]);
      const tracks = await fetchAllLikedTracks(token);

      // 2. Get audio features if needed
      let audioFeatures: Record<string, AudioFeatures> = {};
      if (criteria === 'mood') {
        updateProgress(1, steps[1]);
        audioFeatures = await fetchAudioFeatures(token, tracks);
      }

      // 3. Group tracks based on criteria
      updateProgress(2, steps[2]);
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
      updateProgress(3, steps[3]);
      const createdPlaylists = [];

      for (const [groupName, groupTracks] of Object.entries(groupedTracks)) {
        if (groupTracks.length < 3) continue;

        try {
          await createSpotifyPlaylist(
            token,
            user.id,
            `${groupName} Mix`,
            `Auto-generated ${criteria} playlist by Eightify`,
            groupTracks
          );
          createdPlaylists.push(groupName);
        } catch (error) {
          console.error(`Failed to create playlist for ${groupName}:`, error);
        }
      }

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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 shadow-xl border border-gray-700/50 transform transition-all duration-500 hover:scale-[1.02]">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative">
              <Music2 className="w-16 h-16 text-emerald-500 mx-auto mb-6 animate-bounce" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Creating Your Perfect Playlists
          </h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`flex items-center space-x-3 transition-all duration-300 ${
                  index === currentStep ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  index < currentStep 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : index === currentStep 
                    ? 'border-emerald-500' 
                    : 'border-gray-500'
                }`}>
                  {index < currentStep ? (
                    <span className="text-white text-sm">✓</span>
                  ) : index === currentStep ? (
                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  ) : null}
                </div>
                <span className="text-gray-300">{step}</span>
              </div>
            ))}
          </div>
          
          <p className="text-emerald-500 mt-6 text-center font-medium">
            {progress}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaylistCreation;