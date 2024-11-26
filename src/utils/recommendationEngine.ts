import SpotifyWebApi from 'spotify-web-api-node';
// @ts-ignore
import type { SpotifyApi } from 'spotify-web-api-node';

type Response = SpotifyApi.Response;
type RecommendationsFromSeedsResponse = SpotifyApi.RecommendationsFromSeedsResponse; 
type UsersTopTracksResponse = SpotifyApi.UsersTopTracksResponse;
type UsersTopArtistsResponse = SpotifyApi.UsersTopArtistsResponse;
type AudioFeaturesResponse = SpotifyApi.AudioFeaturesResponse;
type TrackObjectFull = SpotifyApi.TrackObjectFull;
type ArtistObjectFull = SpotifyApi.ArtistObjectFull;

export interface SpotifyTag {
  id: string;
  name: string;
  category: TagCategory;
}

export type TagCategory =
  | 'genre'
  | 'audio_features'
  | 'mood'
  | 'popularity'
  | 'release_date'
  | 'activity'
  | 'languages'
  | 'time_of_day'
  | 'weather'
  | 'events'
  | 'discoverability';

export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
}

export interface RecommendationParams {
  selectedTags: SpotifyTag[];
  userPreferences: UserPreferences;
}

export interface TrackRecommendation {
  id: string;
  name: string;
  artist: string;
  album: string;
  imageUrl: string;
  previewUrl?: string;
  matchedTags: string[];
  matchScore: number;
  features: AudioFeatures;
}

export interface UserPreferences {
  topGenres?: Array<{ name: string; count: number }>;
  topTracks?: string[];
  topArtists?: string[];
}

interface SpotifyRecommendationParams {
  limit: number;
  market: string;
  seed_genres: string[];
  seed_tracks: string[];
  seed_artists: string[];
  min_popularity?: number;
  max_popularity?: number;
  target_danceability?: number;
  min_danceability?: number;
  max_danceability?: number;
  target_energy?: number;
  min_energy?: number;
  max_energy?: number;
  target_tempo?: number;
  min_tempo?: number;
  max_tempo?: number;
  target_valence?: number;
  min_valence?: number;
  max_valence?: number;
  target_instrumentalness?: number;
  target_acousticness?: number;
  languages?: string[];
  [key: string]: number | string | string[] | undefined;
}

type SpotifyResponse<T> = {
  body: T;
  headers: Record<string, string>;
  statusCode: number;
};

interface AudioFeatureRanges {
  min?: number;
  max?: number;
  target?: number;
}

// Language-specific genre mappings
const LANGUAGE_GENRE_MAPPING: Record<string, Record<string, string[]>> = {
  french: {
    'hip-hop': ['french hip hop', 'french rap', 'rap francais'],
    'rock': ['french rock', 'rock francais'],
    'pop': ['french pop', 'chanson francaise'],
    'indie': ['french indie', 'indie francais']
  },
  italian: {
    'hip-hop': ['italian hip hop', 'rap italiano'],
    'rock': ['italian rock', 'rock italiano'],
    'pop': ['italian pop', 'pop italiano'],
    'indie': ['italian indie', 'indie italiano']
  },
  spanish: {
    'hip-hop': ['latin hip hop', 'spanish hip hop', 'reggaeton'],
    'rock': ['latin rock', 'rock en espanol'],
    'pop': ['latin pop', 'pop latino'],
    'indie': ['latin alternative', 'indie latino']
  },
  korean: {
    'hip-hop': ['k-hip hop', 'korean hip hop'],
    'rock': ['k-rock', 'korean rock'],
    'pop': ['k-pop'],
    'indie': ['k-indie', 'korean indie']
  },
  japanese: {
    'hip-hop': ['j-hip hop', 'japanese hip hop'],
    'rock': ['j-rock', 'japanese rock'],
    'pop': ['j-pop'],
    'indie': ['j-indie', 'japanese indie']
  }
};

function mapLanguageSpecificGenres(
  genres: string[],
  languageTag: SpotifyTag
): string[] {
  const languageId = languageTag.id.toLowerCase();
  const genreMappings = LANGUAGE_GENRE_MAPPING[languageId] || {};

  return genres.flatMap(genre => genreMappings[genre] || [genre]);
}

async function getSeedArtistsForLanguage(
  spotifyApi: SpotifyWebApi,
  genreTags: SpotifyTag[],
  languageTag: SpotifyTag,
  market: string
): Promise<string[]> {
  try {
    const artistIds = new Set<string>();
    
    for (const genreTag of genreTags) {
      const searchQuery = `genre:"${genreTag.id}" "${languageTag.name}"`;
      console.log('Searching artists with query:', searchQuery);

      const response = await spotifyApi.searchArtists(searchQuery, { 
        limit: 5, 
        market 
      });

      if (response.body.artists?.items) {
        response.body.artists.items.forEach(artist => {
          artistIds.add(artist.id);
        });
      }
    }

    return Array.from(artistIds).slice(0, 5);
  } catch (error) {
    console.error('Error searching for language-specific artists:', error);
    return [];
  }
}

function buildCompleteSpotifyQuery(
  selectedTags: SpotifyTag[],
  userPreferences: UserPreferences
): SpotifyRecommendationParams {
  const params: SpotifyRecommendationParams = {
    limit: 100,
    market: 'US',
    seed_genres: [],
    seed_artists: [],
    seed_tracks: []
  };

  // Get genre and language tags
  const genreTags = selectedTags.filter(tag => tag.category === 'genre');
  const languageTag = selectedTags.find(tag => tag.category === 'languages');

  // Handle genres with language consideration
  if (genreTags.length > 0) {
    const baseGenres = genreTags.map(tag => tag.id);
    
    if (languageTag) {
      // Map to language-specific genres
      params.seed_genres = mapLanguageSpecificGenres(baseGenres, languageTag)
        .slice(0, 5);
    } else {
      params.seed_genres = baseGenres.slice(0, 5);
    }
  } else if (userPreferences.topGenres?.length) {
    // Fallback to user's top genres
    params.seed_genres = userPreferences.topGenres
      .map(genre => genre.name)
      .slice(0, 5);
  }

  // Process other tags for audio features
  const audioFeatures: Record<string, AudioFeatureRanges> = {};

  selectedTags.forEach(tag => {
    switch (tag.category) {
      case 'mood':
        switch (tag.id) {
          case 'happy':
            audioFeatures.valence = { target: 0.8 };
            audioFeatures.energy = { target: 0.7 };
            break;
          case 'sad':
            audioFeatures.valence = { target: 0.2 };
            audioFeatures.energy = { target: 0.4 };
            break;
          case 'energetic':
            audioFeatures.energy = { target: 0.8 };
            audioFeatures.tempo = { min: 120 };
            break;
          case 'chill':
            audioFeatures.energy = { target: 0.4 };
            audioFeatures.tempo = { max: 120 };
            break;
        }
        break;

      case 'popularity':
        switch (tag.id) {
          case 'top_hits':
            params.min_popularity = 80;
            break;
          case 'underground':
            params.max_popularity = 40;
            break;
        }
        break;

      case 'activity':
        switch (tag.id) {
          case 'workout':
            audioFeatures.energy = { target: 0.8 };
            audioFeatures.tempo = { min: 120 };
            break;
          case 'study':
            audioFeatures.instrumentalness = { target: 0.7 };
            audioFeatures.energy = { max: 0.5 };
            break;
          case 'party':
            audioFeatures.danceability = { target: 0.8 };
            audioFeatures.energy = { target: 0.8 };
            break;
        }
        break;
    }
  });

  // Apply audio features to params
  Object.entries(audioFeatures).forEach(([feature, ranges]) => {
    if (ranges.target !== undefined) {
      params[`target_${feature}`] = ranges.target;
    }
    if (ranges.min !== undefined) {
      params[`min_${feature}`] = ranges.min;
    }
    if (ranges.max !== undefined) {
      params[`max_${feature}`] = ranges.max;
    }
  });

  console.log('Final query params:', params);
  return params;
}

// Language mapping for better search results
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  italian: [
    'italiano',
    'italia',
    'italiano',
    'hip hop italiano',
    'musica italiana'
  ],
  korean: [
    'korean',
    'k-pop',
    'k-rap',
    'k-hip hop',
    'hangul'
  ],
  japanese: [
    'japanese',
    'j-pop',
    'j-rap',
    'j-hip hop',
    'nihon'
  ],
  spanish: [
    'español',
    'latina',
    'latino',
    'reggaeton',
    'música latina'
  ],
  chinese: [
    'chinese',
    'c-pop',
    'mandarin',
    'cantopop',
    'zhongwen'
  ]
};

// City mapping for additional context
const CITY_MAPPING: Record<string, string[]> = {
  italian: ['roma', 'milano', 'napoli', 'torino', 'firenze', 'bologna', 'venezia'],
  korean: ['seoul', 'busan', 'incheon', 'daegu', 'daejeon'],
  japanese: ['tokyo', 'osaka', 'kyoto', 'yokohama', 'fukuoka'],
  spanish: ['madrid', 'barcelona', 'valencia', 'sevilla', 'malaga'],
  chinese: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hong kong']
};

async function searchLanguageSpecificTracks(
  spotifyApi: SpotifyWebApi,
  genreTag: SpotifyTag | undefined,
  languageTag: SpotifyTag | undefined,
  market: string
): Promise<SpotifyApi.TrackObjectFull[]> {
  if (!languageTag || !genreTag) return [];

  try {
    const searchQuery = `genre:${genreTag.id} ${languageTag.name}`.trim();
    const searchResponse = await spotifyApi.searchTracks(searchQuery, {
      limit: 50,
      market
    });

    return searchResponse.body.tracks?.items || [];
  } catch (error) {
    console.error('Error searching for language-specific tracks:', error);
    return [];
  }
}

function getLanguageKeywords(languageTag: SpotifyTag): string[] {
  const languageId = languageTag.id.toLowerCase();
  const keywords = LANGUAGE_KEYWORDS[languageId] || [];
  const cities = CITY_MAPPING[languageId] || [];
  return [...keywords, ...cities];
}

function handlePopularityTag(
  tagId: string,
  params: SpotifyRecommendationParams
): void {
  switch (tagId) {
    case 'top_hits':
      params.min_popularity = 80;
      break;
    case 'trending':
      params.min_popularity = 60;
      break;
    case 'underground':
      params.max_popularity = 50;
      break;
    case 'rising':
      params.min_popularity = 50;
      params.max_popularity = 70;
      break;
    case 'low-plays':
      params.max_popularity = 30;
      break;
  }
}

function handleActivityTag(
  tagId: string,
  audioFeatures: Record<string, AudioFeatureRanges>
): void {
  switch (tagId) {
    case 'workout':
      audioFeatures.energy = { target: 0.8 };
      audioFeatures.tempo = { target: 130 };
      break;
    case 'party':
      audioFeatures.danceability = { target: 0.8 };
      audioFeatures.energy = { target: 0.8 };
      break;
    case 'focus':
      audioFeatures.energy = { max: 0.4 };
      audioFeatures.instrumentalness = { target: 0.8 };
      break;
    case 'sleep':
      audioFeatures.energy = { max: 0.3 };
      audioFeatures.instrumentalness = { target: 0.9 };
      break;
    case 'meditation':
      audioFeatures.energy = { max: 0.3 };
      audioFeatures.instrumentalness = { target: 0.9 };
      break;
    case 'running':
      audioFeatures.tempo = { target: 160 };
      audioFeatures.energy = { target: 0.8 };
      break;
  }
}

function handleTimeOfDayTag(
  tagId: string,
  audioFeatures: Record<string, AudioFeatureRanges>
): void {
  switch (tagId) {
    case 'morning':
      audioFeatures.energy = { target: 0.6 };
      audioFeatures.valence = { target: 0.8 };
      break;
    case 'evening':
      audioFeatures.energy = { target: 0.5 };
      audioFeatures.valence = { target: 0.6 };
      break;
    case 'night':
      audioFeatures.energy = { max: 0.5 };
      audioFeatures.valence = { target: 0.5 };
      break;
  }
}

function handleWeatherTag(
  tagId: string,
  audioFeatures: Record<string, AudioFeatureRanges>
): void {
  switch (tagId) {
    case 'rainy':
      audioFeatures.energy = { max: 0.5 };
      audioFeatures.valence = { target: 0.4 };
      break;
    case 'sunny':
      audioFeatures.valence = { target: 0.8 };
      audioFeatures.energy = { target: 0.7 };
      break;
  }
}

// Add delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function makeSpotifyRequest<T>(
  request: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await request();
    } catch (error: any) {
      if (error?.statusCode === 429) {
        const retryAfter = parseInt(error?.headers?.['retry-after'] || '1');
        const waitTime = retryAfter * 1000 || baseDelay * Math.pow(2, i);
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

export async function getRecommendations(
  spotifyApi: SpotifyWebApi,
  { selectedTags, userPreferences }: RecommendationParams
): Promise<TrackRecommendation[]> {
  try {
    console.log('=== Starting Recommendation Process ===');
    console.log('Selected tags:', JSON.stringify(selectedTags, null, 2));
    console.log('User preferences:', JSON.stringify(userPreferences, null, 2));

    // Get genre and language tags
    const genreTags = selectedTags.filter(tag => tag.category === 'genre');
    const languageTag = selectedTags.find(tag => tag.category === 'languages');

    console.log('Genre tags:', JSON.stringify(genreTags, null, 2));
    console.log('Language tag:', languageTag ? JSON.stringify(languageTag, null, 2) : 'None');

    // Get seed artists for language if applicable
    let seedArtists: string[] = [];
    if (languageTag && genreTags.length > 0) {
      console.log('Searching for language-specific artists...');
      try {
        const artistSearchResponse = await makeSpotifyRequest(() => 
          spotifyApi.searchArtists(`genre:${genreTags[0].id} ${languageTag.name}`, { 
            limit: 5, 
            market: 'US' 
          })
        );

        if (artistSearchResponse.body.artists?.items) {
          seedArtists = artistSearchResponse.body.artists.items
            .map(artist => artist.id)
            .slice(0, 2);
        }
      } catch (error) {
        console.warn('Failed to get seed artists:', error);
      }
    }

    // Build query parameters
    const params = buildCompleteSpotifyQuery(selectedTags, userPreferences);
    
    // Add seed artists if found
    if (seedArtists.length > 0) {
      params.seed_artists = seedArtists;
    }

    console.log('Final query parameters:', JSON.stringify(params, null, 2));

    // Make recommendation request with retry logic
    console.log('Requesting recommendations from Spotify...');
    const recommendationResponse = await makeSpotifyRequest(() => 
      spotifyApi.getRecommendations(params)
    );

    let allTracks = recommendationResponse.body.tracks || [];
    console.log(`Retrieved ${allTracks.length} tracks from Spotify`);

    // If we got no tracks, try a more relaxed query
    if (allTracks.length === 0) {
      console.log('No tracks found, trying with relaxed parameters...');
      const relaxedParams = {
        ...params,
        seed_genres: params.seed_genres.slice(0, 2),
        seed_artists: [],
        seed_tracks: []
      };

      console.log('Relaxed parameters:', JSON.stringify(relaxedParams, null, 2));
      const relaxedResponse = await makeSpotifyRequest(() => 
        spotifyApi.getRecommendations(relaxedParams)
      );
      allTracks = relaxedResponse.body.tracks || [];
    }

    if (allTracks.length === 0) {
      throw new Error('No matching tracks found');
    }

    // Get audio features with retry logic
    console.log('Fetching audio features...');
    const audioFeaturesResponse = await makeSpotifyRequest(() =>
      spotifyApi.getAudioFeaturesForTracks(allTracks.map(track => track.id))
    );

    const audioFeatures = audioFeaturesResponse.body.audio_features || [];
    console.log(`Got audio features for ${audioFeatures.length} tracks`);

    // Map to TrackRecommendation format
    const recommendations = allTracks.map((track, index) => {
      const features = audioFeatures[index] || {};
      return {
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        imageUrl: track.album.images[0]?.url || '',
        previewUrl: track.preview_url || undefined,
        matchedTags: selectedTags.map(tag => tag.name),
        matchScore: 100,
        features: {
          danceability: features.danceability || 0,
          energy: features.energy || 0,
          valence: features.valence || 0,
          acousticness: features.acousticness || 0,
          instrumentalness: features.instrumentalness || 0,
          tempo: features.tempo || 0
        }
      };
    });

    console.log(`Returning ${recommendations.length} recommendations`);
    return recommendations;

  } catch (error) {
    console.error('Error in getRecommendations:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get recommendations');
  }
} 