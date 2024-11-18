export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
    genres?: string[];
  }>;
  album: {
    id: string;
    name: string;
    release_date: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  preview_url?: string;
}

export interface AudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
  instrumentalness: number;
}

export interface GeneratedPlaylist {
  id?: string;
  name: string;
  description: string;
  tracks: SpotifyTrack[];
  type: 'genre' | 'mood' | 'activity' | 'decade' | 'artist' | 'smart';
  tags: string[];
  imageUrl?: string;
}

export async function fetchAllLikedTracks(token: string): Promise<SpotifyTrack[]> {
  let tracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch tracks');

    const data = await response.json();
    tracks = [...tracks, ...data.items.map((item: any) => item.track)];
    
    hasMore = data.items.length === limit;
    offset += limit;
  }

  return tracks;
}

export async function fetchAudioFeatures(token: string, tracks: SpotifyTrack[]): Promise<Record<string, AudioFeatures>> {
  const features: Record<string, AudioFeatures> = {};
  const chunks = [];

  // Split track IDs into chunks of 100 (Spotify API limit)
  for (let i = 0; i < tracks.length; i += 100) {
    chunks.push(tracks.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const ids = chunk.map(track => track.id).join(',');
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${ids}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch audio features');

    const data = await response.json();
    data.audio_features.forEach((feature: AudioFeatures, index: number) => {
      if (feature) {
        features[chunk[index].id] = feature;
      }
    });
  }

  return features;
}

export async function createSpotifyPlaylist(
  token: string, 
  userId: string, 
  name: string, 
  description: string, 
  tracks: SpotifyTrack[]
): Promise<void> {
  console.log('Creating playlist:', { name, description, tracksCount: tracks.length });
  
  // Create playlist
  const createResponse = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.json();
    console.error('Playlist creation failed:', error);
    throw new Error(`Failed to create playlist: ${error.error?.message || 'Unknown error'}`);
  }

  const playlist = await createResponse.json();
  console.log('Playlist created:', playlist.id);

  // Add tracks in chunks of 100
  const trackUris = tracks.map(track => `spotify:track:${track.id}`);
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    const addTracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: chunk }),
      }
    );

    if (!addTracksResponse.ok) {
      const error = await addTracksResponse.json();
      console.error('Failed to add tracks:', error);
      throw new Error('Failed to add tracks to playlist');
    }
  }

  console.log('Tracks added successfully');
}

export function groupTracksByGenre(tracks: SpotifyTrack[]): Record<string, SpotifyTrack[]> {
  const genres: Record<string, SpotifyTrack[]> = {};
  
  tracks.forEach(track => {
    const genre = track.artists[0]?.name || 'Unknown';
    if (!genres[genre]) {
      genres[genre] = [];
    }
    genres[genre].push(track);
  });

  return genres;
}

export function groupTracksByDecade(tracks: SpotifyTrack[]): Record<string, SpotifyTrack[]> {
  const decades: Record<string, SpotifyTrack[]> = {};
  
  tracks.forEach(track => {
    const year = parseInt(track.album.release_date.split('-')[0]);
    const decade = Math.floor(year / 10) * 10;
    const decadeLabel = `${decade}s Music`;
    
    if (!decades[decadeLabel]) {
      decades[decadeLabel] = [];
    }
    decades[decadeLabel].push(track);
  });

  return Object.fromEntries(
    Object.entries(decades)
      .filter(([_, tracks]) => tracks.length >= 5)
      .sort((a, b) => b[0].localeCompare(a[0]))
  );
}

export function groupTracksByMood(tracks: SpotifyTrack[], audioFeatures: Record<string, AudioFeatures>): Record<string, SpotifyTrack[]> {
  const moods: Record<string, SpotifyTrack[]> = {
    'Happy Vibes': [],
    'Chill & Relaxed': [],
    'High Energy': [],
    'Melancholic': [],
    'Party Mode': [],
    'Focus Time': [],
  };

  tracks.forEach(track => {
    const features = audioFeatures[track.id];
    if (!features) return;

    if (features.valence > 0.7 && features.energy > 0.5) {
      moods['Happy Vibes'].push(track);
    }
    if (features.energy < 0.4 && features.valence > 0.3) {
      moods['Chill & Relaxed'].push(track);
    }
    if (features.energy > 0.8) {
      moods['Party Mode'].push(track);
    }
    if (features.valence < 0.3) {
      moods['Melancholic'].push(track);
    }
    if (features.energy > 0.6 && features.tempo > 120) {
      moods['High Energy'].push(track);
    }
    if (features.valence > 0.5 && features.energy < 0.7 && features.tempo < 120) {
      moods['Focus Time'].push(track);
    }
  });

  // Remove empty moods
  return Object.fromEntries(
    Object.entries(moods).filter(([_, tracks]) => tracks.length >= 5)
  );
}

export function groupTracksByActivity(tracks: SpotifyTrack[], audioFeatures: Record<string, AudioFeatures>): Record<string, SpotifyTrack[]> {
  const activities: Record<string, SpotifyTrack[]> = {
    'Workout': [],
    'Study & Focus': [],
    'Meditation': [],
    'Running': [],
    'Party': [],
    'Sleep': [],
  };

  tracks.forEach(track => {
    const features = audioFeatures[track.id];
    if (!features) return;

    if (features.energy > 0.7 && features.tempo > 120) {
      activities['Workout'].push(track);
    }
    if (features.energy < 0.5 && features.valence > 0.5) {
      activities['Study & Focus'].push(track);
    }
    if (features.energy < 0.3) {
      activities['Meditation'].push(track);
    }
    if (features.tempo > 140 && features.energy > 0.6) {
      activities['Running'].push(track);
    }
    if (features.danceability > 0.7 && features.energy > 0.7) {
      activities['Party'].push(track);
    }
    if (features.energy < 0.4 && features.valence > 0.3 && features.tempo < 100) {
      activities['Sleep'].push(track);
    }
  });

  return Object.fromEntries(
    Object.entries(activities).filter(([_, tracks]) => tracks.length >= 5)
  );
}

export function groupTracksByLanguage(tracks: SpotifyTrack[]): Record<string, SpotifyTrack[]> {
  // This is a simplified version - you might want to use a language detection API
  const languages: Record<string, SpotifyTrack[]> = {
    'English': [],
    'Spanish': [],
    'Portuguese': [],
    'French': [],
    'Italian': [],
    'Other': [],
  };

  // You would need to implement proper language detection here
  // For now, this is just a placeholder
  tracks.forEach(track => {
    // Add logic to detect language based on track metadata
    languages['English'].push(track);
  });

  return Object.fromEntries(
    Object.entries(languages).filter(([_, tracks]) => tracks.length >= 5)
  );
}

export async function getRecommendations(token: string, tracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
  const seedTracks = tracks
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map(track => track.id)
    .join(',');

  const response = await fetch(
    `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error('Failed to get recommendations');

  const data = await response.json();
  return data.tracks;
}

interface ArtistDetails {
  id: string;
  name: string;
  genres: string[];
}

export async function getArtistDetails(token: string, artistIds: string[]): Promise<ArtistDetails[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch artist details');
  const data = await response.json();
  return data.artists;
}

export async function getRecentlyPlayedTracks(token: string): Promise<SpotifyTrack[]> {
  const response = await fetch(
    'https://api.spotify.com/v1/me/player/recently-played?limit=50',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error('Failed to fetch recent tracks');
  const data = await response.json();
  return data.items.map((item: any) => item.track);
}

export async function generateSmartPlaylists(
  token: string,
  tracks: SpotifyTrack[],
  criteria: string
): Promise<GeneratedPlaylist[]> {
  const enhancedTracks = await getDetailedTrackInfo(token, tracks);
  const audioFeatures = await fetchAudioFeatures(token, tracks);
  
  switch (criteria) {
    case 'genre':
      return generateGenrePlaylists(enhancedTracks);
    case 'mood':
      return generateMoodPlaylists(enhancedTracks, audioFeatures);
    case 'activity':
      return generateActivityPlaylists(enhancedTracks, audioFeatures);
    case 'decade':
      return generateDecadePlaylists(enhancedTracks);
    case 'artist':
      return generateArtistPlaylists(enhancedTracks);
    case 'smart':
      return generateMixedPlaylists(enhancedTracks, audioFeatures);
    default:
      throw new Error('Invalid criteria');
  }
}

function generateGenrePlaylists(tracks: SpotifyTrack[]): GeneratedPlaylist[] {
  const genreMap = new Map<string, SpotifyTrack[]>();
  
  tracks.forEach(track => {
    const genres = track.artists.flatMap(artist => artist.genres || []);
    genres.forEach(genre => {
      if (!genreMap.has(genre)) {
        genreMap.set(genre, []);
      }
      genreMap.get(genre)?.push(track);
    });
  });

  return Array.from(genreMap.entries())
    .filter(([_, tracks]) => tracks.length >= 10)
    .map(([genre, tracks]) => ({
      name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Mix`,
      description: `A collection of your favorite ${genre} tracks`,
      tracks,
      type: 'genre' as const,
      tags: [genre, 'auto-generated'],
    }));
}

export function generateMoodPlaylists(
  tracks: SpotifyTrack[],
  audioFeatures: Record<string, AudioFeatures>
): GeneratedPlaylist[] {
  const moodCategories = {
    'Feel Good Vibes': (f: AudioFeatures) => f.valence > 0.7 && f.energy > 0.5,
    'Chill & Relax': (f: AudioFeatures) => f.energy < 0.4 && f.valence > 0.3,
    'High Energy': (f: AudioFeatures) => f.energy > 0.8 && f.tempo > 120,
    'Focus Zone': (f: AudioFeatures) => f.valence > 0.4 && f.energy < 0.6,
    'Party Mode': (f: AudioFeatures) => f.danceability > 0.7 && f.energy > 0.7,
    'Melancholic Moods': (f: AudioFeatures) => f.valence < 0.3 && f.energy < 0.5
  };

  const playlists: GeneratedPlaylist[] = [];

  Object.entries(moodCategories).forEach(([mood, condition]) => {
    const moodTracks = tracks.filter(track => {
      const features = audioFeatures[track.id];
      return features && condition(features);
    });

    if (moodTracks.length >= 10) {
      playlists.push({
        name: mood,
        description: `A ${mood.toLowerCase()} playlist based on your music taste`,
        tracks: moodTracks,
        type: 'mood',
        tags: [mood.toLowerCase(), 'mood-based', 'auto-generated'],
        imageUrl: moodTracks[0]?.album.images[0]?.url
      });
    }
  });

  return playlists;
}

export function generateActivityPlaylists(
  tracks: SpotifyTrack[],
  audioFeatures: Record<string, AudioFeatures>
): GeneratedPlaylist[] {
  const activityCategories = {
    'Workout Intensity': (f: AudioFeatures) => f.energy > 0.8 && f.tempo > 120,
    'Study & Focus': (f: AudioFeatures) => f.energy < 0.5 && f.valence > 0.4 && f.instrumentalness > 0.3,
    'Morning Energy': (f: AudioFeatures) => f.valence > 0.6 && f.energy > 0.5 && f.tempo > 100,
    'Evening Chill': (f: AudioFeatures) => f.energy < 0.4 && f.valence > 0.3 && f.tempo < 100,
    'Power Hour': (f: AudioFeatures) => f.energy > 0.9 && f.tempo > 130,
    'Meditation': (f: AudioFeatures) => f.energy < 0.3 && f.instrumentalness > 0.5
  };

  const playlists: GeneratedPlaylist[] = [];

  Object.entries(activityCategories).forEach(([activity, condition]) => {
    const activityTracks = tracks.filter(track => {
      const features = audioFeatures[track.id];
      return features && condition(features);
    });

    if (activityTracks.length >= 10) {
      playlists.push({
        name: activity,
        description: `Perfect for ${activity.toLowerCase()}`,
        tracks: activityTracks,
        type: 'activity',
        tags: [activity.toLowerCase(), 'activity-based', 'auto-generated'],
        imageUrl: activityTracks[0]?.album.images[0]?.url || ''
      });
    }
  });

  return playlists;
}

export function generateDecadePlaylists(tracks: SpotifyTrack[]): GeneratedPlaylist[] {
  const decadeMap = new Map<string, SpotifyTrack[]>();
  
  tracks.forEach(track => {
    const year = parseInt(track.album.release_date.split('-')[0]);
    const decade = Math.floor(year / 10) * 10;
    const decadeKey = `${decade}s`;
    
    if (!decadeMap.has(decadeKey)) {
      decadeMap.set(decadeKey, []);
    }
    decadeMap.get(decadeKey)?.push(track);
  });

  return Array.from(decadeMap.entries())
    .filter(([_, tracks]) => tracks.length >= 10)
    .map(([decade, tracks]) => ({
      name: `${decade} Collection`,
      description: `Your favorite tracks from the ${decade}`,
      tracks,
      type: 'decade',
      tags: [decade, 'era', 'auto-generated'],
      imageUrl: tracks[0]?.album.images[0]?.url
    }));
}

export function generateArtistPlaylists(tracks: SpotifyTrack[]): GeneratedPlaylist[] {
  const artistMap = new Map<string, SpotifyTrack[]>();
  
  tracks.forEach(track => {
    const mainArtist = track.artists[0];
    if (!mainArtist) return;
    
    if (!artistMap.has(mainArtist.id)) {
      artistMap.set(mainArtist.id, []);
    }
    artistMap.get(mainArtist.id)?.push(track);
  });

  return Array.from(artistMap.entries())
    .filter(([_, tracks]) => tracks.length >= 5)
    .map(([_, tracks]) => {
      const artist = tracks[0].artists[0];
      return {
        name: `${artist.name} Collection`,
        description: `Your favorite tracks by ${artist.name}`,
        tracks,
        type: 'artist',
        tags: [artist.name, 'artist-collection', 'auto-generated'],
        imageUrl: tracks[0]?.album.images[0]?.url
      };
    });
}

export function generateMixedPlaylists(
  tracks: SpotifyTrack[],
  audioFeatures: Record<string, AudioFeatures>
): GeneratedPlaylist[] {
  return [
    ...generateMoodPlaylists(tracks, audioFeatures),
    ...generateActivityPlaylists(tracks, audioFeatures),
    ...generateGenrePlaylists(tracks),
    ...generateDecadePlaylists(tracks),
    ...generateArtistPlaylists(tracks)
  ];
}

// Add this function to save playlist to Spotify
export async function savePlaylistToSpotify(
  token: string,
  userId: string,
  playlist: GeneratedPlaylist
): Promise<string> {
  // Create playlist
  const createResponse = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlist.name,
        description: `${playlist.description}\nTags: ${playlist.tags.join(', ')}`,
        public: false,
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error('Failed to create playlist');
  }

  const newPlaylist = await createResponse.json();
  const playlistId = newPlaylist.id;

  // Add tracks in chunks
  const trackUris = playlist.tracks.map(track => `spotify:track:${track.id}`);
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: chunk }),
      }
    );
  }

  return playlistId;
}

// Add this function to get detailed track analysis
export async function getDetailedTrackInfo(token: string, tracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
  // Get artist details for better genre information
  const artistIds = Array.from(new Set(
    tracks.flatMap(track => track.artists.map(artist => artist.id))
  )).filter(Boolean);

  const artistChunks = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    artistChunks.push(artistIds.slice(i, i + 50));
  }

  const artistDetails = new Map();
  
  for (const chunk of artistChunks) {
    const response = await fetch(
      `https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      data.artists.forEach((artist: any) => {
        artistDetails.set(artist.id, artist.genres || []);
      });
    }
  }

  // Enhance tracks with artist genres
  return tracks.map(track => ({
    ...track,
    artists: track.artists.map(artist => ({
      ...artist,
      genres: artistDetails.get(artist.id) || []
    }))
  }));
}

export async function updatePlaylist(
  token: string,
  playlistId: string,
  updates: {
    name?: string;
    description?: string;
    tracks?: string[];
  }
): Promise<void> {
  // Update playlist details
  if (updates.name || updates.description) {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: updates.name,
        description: updates.description,
      }),
    });
  }

  // Update tracks if provided
  if (updates.tracks) {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: updates.tracks.map(id => `spotify:track:${id}`),
      }),
    });
  }
} 