import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecommendations, type TagCategory } from '@/utils/recommendationEngine';
import type { TrackRecommendation as ImportedTrackRecommendation } from '@/utils/recommendationEngine';
import { 
  Music, 
  Smile, 
  Dumbbell, 
  Clock, 
  Mic2, 
  Radio,
  ArrowRight,
  Sparkles,
  Headphones,
  Home,
  X,
  ChevronLeft,
  Filter,
  Zap,
  Heart,
  Sun,
  Moon,
  Flame,
  Coffee,
  Waves,
  Disc,
  Shuffle,
  Globe,
  Mic,
  Star,
  TrendingUp,
  Volume2,
  Music2,
  Calendar,
  Play,
  GraduationCap,
  Cake,
  CloudRain,
  CloudSun,
  Cloud,
  Snowflake,
  Languages,
  FileAudio,
  VolumeX,
  Volume1,
  Volume,
  Clock3,
  Clock12,
  Clock9,
  Clock6,
  Sunrise,
  Sunset,
  BedDouble,
  Car,
  Utensils,
  BookOpen,
  PartyPopper,
  Trophy,
  Rocket,
  Glasses,
  Eye,
  Search,
  Share2,
  TrendingDown,
  Users,
  Award,
  Drum,
  Guitar,
  Film,
  Gift,
  Skull,
  Pause,
  RefreshCw,
} from 'lucide-react';
import SpotifyWebApi from 'spotify-web-api-node';
import toast from 'react-hot-toast';

// Define icon type
type IconType = React.ComponentType<{ className?: string }>;

// Define interfaces
interface SpotifyTag {
  id: string;
  name: string;
  category: string;
  icon: IconType;
  description?: string;
}

interface CategoryStyle {
  color: string;
  bgLight: string;
  bgHover: string;
  border: string;
  text: string;
}

// Add new interfaces for playlist creation
interface PlaylistTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  imageUrl: string;
  previewUrl?: string;
  matchedTags: string[];
}

interface PlaylistModal {
  isOpen: boolean;
  tracks: PlaylistTrack[];
  isLoading: boolean;
}

// Add new interfaces for recommendation engine
interface UserPreferences {
  topGenres: { name: string; count: number }[];
  audioFeatures: {
    danceability: number;
    energy: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
  };
  traits: string[];
}

interface RecommendationParams {
  selectedTags: SpotifyTag[];
  userPreferences: UserPreferences;
}

interface LocalTrackRecommendation {
  id: string;
  name: string;
  artist: string;
  album: string;
  imageUrl: string;
  previewUrl?: string;
  matchedTags: string[];
  matchScore: number;
  features: {
    danceability: number;
    energy: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
  };
}

// Comprehensive Spotify API filter options
const spotifyTags: Record<string, SpotifyTag[]> = {
  genre: [
    { 
      id: 'hip-hop', 
      name: 'Hip-Hop', 
      category: 'genre', 
      icon: Mic2,
      description: 'Urban beats and rhythmic poetry for the soul'
    },
    { 
      id: 'rap', 
      name: 'Rap', 
      category: 'genre', 
      icon: Mic,
      description: 'Lyrical storytelling with powerful beats'
    },
    { 
      id: 'pop', 
      name: 'Pop', 
      category: 'genre', 
      icon: Music2,
      description: 'Catchy melodies and contemporary hits'
    },
    { 
      id: 'rock', 
      name: 'Rock', 
      category: 'genre', 
      icon: Guitar,
      description: 'Electric guitar-driven music with powerful energy'
    },
    { 
      id: 'r-n-b', 
      name: 'R&B', 
      category: 'genre', 
      icon: Mic2,
      description: 'Smooth rhythms and soulful vocals'
    },
    { 
      id: 'latin', 
      name: 'Latin', 
      category: 'genre', 
      icon: Globe,
      description: 'Vibrant rhythms from Latin American cultures'
    },
    { 
      id: 'edm', 
      name: 'EDM', 
      category: 'genre', 
      icon: Zap,
      description: 'Electronic dance music for high-energy moments'
    },
    { 
      id: 'country', 
      name: 'Country', 
      category: 'genre', 
      icon: Guitar,
      description: 'Storytelling through American folk traditions'
    },
    { 
      id: 'folk', 
      name: 'Folk', 
      category: 'genre', 
      icon: Guitar,
      description: 'Traditional acoustic music with rich storytelling'
    },
    { 
      id: 'jazz', 
      name: 'Jazz', 
      category: 'genre', 
      icon: Music2,
      description: 'Improvisational and sophisticated harmonies'
    },
    { 
      id: 'classical', 
      name: 'Classical', 
      category: 'genre', 
      icon: Music,
      description: 'Timeless orchestral and chamber music'
    },
    { 
      id: 'reggae', 
      name: 'Reggae', 
      category: 'genre', 
      icon: Sun,
      description: 'Laid-back Jamaican rhythms and positive vibes'
    },
    { 
      id: 'blues', 
      name: 'Blues', 
      category: 'genre', 
      icon: Music,
      description: 'Soulful expressions of life\'s ups and downs'
    },
    { 
      id: 'indie', 
      name: 'Indie', 
      category: 'genre', 
      icon: Guitar,
      description: 'Independent and alternative music scene'
    },
    { 
      id: 'k-pop', 
      name: 'K-pop', 
      category: 'genre', 
      icon: Mic2,
      description: 'High-energy, catchy tracks from the vibrant Korean pop scene'
    },
    { 
      id: 'bollywood', 
      name: 'Bollywood', 
      category: 'genre', 
      icon: Film,
      description: 'Energetic songs from Indian cinema, mixing traditional and modern beats'
    },
    { 
      id: 'afrobeat', 
      name: 'Afrobeat', 
      category: 'genre', 
      icon: Drum,
      description: 'Rhythmic and vibrant African-inspired beats for lively moments'
    },
    { 
      id: 'flamenco', 
      name: 'Flamenco', 
      category: 'genre', 
      icon: Guitar,
      description: 'Passionate Spanish guitar-driven tracks with vibrant vocals'
    },
    { 
      id: 'bossa-nova', 
      name: 'Bossa Nova', 
      category: 'genre', 
      icon: Music2,
      description: 'Smooth Brazilian jazz with soft, calming rhythms'
    },
    { 
      id: 'chinese-traditional', 
      name: 'Chinese Traditional', 
      category: 'genre', 
      icon: Music2,
      description: 'Instrumental and vocal tracks inspired by Chinese culture'
    },
    { 
      id: 'j-pop', 
      name: 'J-Pop', 
      category: 'genre', 
      icon: Mic2,
      description: 'Upbeat and eclectic pop music from Japan'
    },
    { 
      id: 'synthwave', 
      name: 'Synthwave', 
      category: 'genre', 
      icon: Waves,
      description: 'Retro-inspired electronic music with futuristic vibes'
    },
    { 
      id: 'lofi-hiphop', 
      name: 'Lo-fi Hip Hop', 
      category: 'genre', 
      icon: Headphones,
      description: 'Chill beats perfect for studying or relaxing'
    },
    { 
      id: 'reggaeton', 
      name: 'Reggaeton', 
      category: 'genre', 
      icon: Music2,
      description: 'Latin urban music with infectious beats and rhythmic grooves'
    },
    { 
      id: 'ambient', 
      name: 'Ambient', 
      category: 'genre', 
      icon: Waves,
      description: 'Atmospheric and meditative soundscapes'
    },
    { 
      id: 'progressive-rock', 
      name: 'Progressive Rock', 
      category: 'genre', 
      icon: Guitar,
      description: 'Complex rock tracks with a focus on musical storytelling'
    },
    { 
      id: 'vaporwave', 
      name: 'Vaporwave', 
      category: 'genre', 
      icon: Cloud,
      description: 'Dreamy, surreal electronic music with nostalgic undertones'
    },
    { 
      id: 'chillwave', 
      name: 'Chillwave', 
      category: 'genre', 
      icon: Waves,
      description: 'Relaxed, ambient electronic music with a summery feel'
    },
    { 
      id: 'psytrance', 
      name: 'Psytrance', 
      category: 'genre', 
      icon: Zap,
      description: 'High-energy electronic music with hypnotic rhythms'
    },
  ],
  audio_features: [
    { 
      id: 'danceability', 
      name: 'Danceability', 
      category: 'audio_features', 
      icon: Disc,
      description: 'Perfect for getting your groove on'
    },
    { 
      id: 'energy', 
      name: 'Energy', 
      category: 'audio_features', 
      icon: Zap,
      description: 'High-powered tracks that energize'
    },
    { 
      id: 'valence', 
      name: 'Positiveness', 
      category: 'audio_features', 
      icon: Sun,
      description: 'Uplifting vibes to brighten your mood'
    },
    { 
      id: 'instrumentalness', 
      name: 'Instrumental', 
      category: 'audio_features', 
      icon: Music,
      description: 'Pure instrumental tracks without vocals'
    },
    { 
      id: 'acousticness', 
      name: 'Acoustic', 
      category: 'audio_features', 
      icon: Music,
      description: 'Natural, unplugged sound experience'
    },
    { 
      id: 'loudness', 
      name: 'Loudness', 
      category: 'audio_features', 
      icon: Volume2,
      description: 'Turn up the volume and feel the power'
    },
    { 
      id: 'tempo', 
      name: 'Tempo', 
      category: 'audio_features', 
      icon: Clock,
      description: 'Set your pace with the perfect rhythm'
    },
    { 
      id: 'high-tempo', 
      name: 'High Tempo', 
      category: 'audio_features', 
      icon: Zap,
      description: 'Fast-paced songs (>150 BPM) for running or intense activities'
    },
    { 
      id: 'low-tempo', 
      name: 'Low Tempo', 
      category: 'audio_features', 
      icon: Coffee,
      description: 'Slow, calming tracks (<80 BPM) for unwinding'
    },
    { 
      id: 'high-energy-dance', 
      name: 'High Energy + Danceable', 
      category: 'audio_features', 
      icon: Disc,
      description: 'Club-ready anthems for parties'
    },
    { 
      id: 'low-energy-instrumental', 
      name: 'Low Energy + Instrumental', 
      category: 'audio_features', 
      icon: Music,
      description: 'Perfect for background focus music'
    },
  ],
  mood: [
    { 
      id: 'happy', 
      name: 'Happy', 
      category: 'mood', 
      icon: Sun,
      description: 'Upbeat and cheerful songs to brighten your day'
    },
    { 
      id: 'energetic', 
      name: 'Energetic', 
      category: 'mood', 
      icon: Zap,
      description: 'High-energy tracks to get you moving'
    },
    { 
      id: 'chill', 
      name: 'Chill', 
      category: 'mood', 
      icon: Waves,
      description: 'Relaxed vibes for laid-back moments'
    },
    { 
      id: 'sad', 
      name: 'Sad', 
      category: 'mood', 
      icon: Moon,
      description: 'Melancholic songs for emotional reflection'
    },
    { 
      id: 'romantic', 
      name: 'Romantic', 
      category: 'mood', 
      icon: Heart,
      description: 'Love songs and tender melodies for intimate moments'
    },
    { 
      id: 'peaceful', 
      name: 'Peaceful', 
      category: 'mood', 
      icon: Coffee,
      description: 'Calming music for relaxation and tranquility'
    },
    { 
      id: 'intense', 
      name: 'Intense', 
      category: 'mood', 
      icon: Flame,
      description: 'Powerful and dramatic music that captivates'
    },
    { 
      id: 'motivational', 
      name: 'Motivational', 
      category: 'mood', 
      icon: Trophy,
      description: 'Inspiring tracks to fuel productivity or workouts'
    },
    { 
      id: 'nostalgic', 
      name: 'Nostalgic', 
      category: 'mood', 
      icon: Clock,
      description: 'Songs that take you back in time'
    },
  ],
  popularity: [
    { 
      id: 'top_hits', 
      name: 'Top Hits', 
      category: 'popularity', 
      icon: Star,
      description: 'The most popular songs right now'
    },
    { 
      id: 'trending', 
      name: 'Trending', 
      category: 'popularity', 
      icon: TrendingUp,
      description: 'Songs gaining popularity fast'
    },
    { 
      id: 'underground', 
      name: 'Underground', 
      category: 'popularity', 
      icon: Shuffle,
      description: 'Lesser known but amazing tracks'
    },
    { 
      id: 'rising', 
      name: 'Rising', 
      category: 'popularity', 
      icon: Flame,
      description: 'Up and coming hits climbing the charts'
    },
    { 
      id: 'low-plays', 
      name: 'Songs <1M Plays', 
      category: 'popularity', 
      icon: Play,
      description: 'Tracks waiting to be discovered'
    },
  ],
  release_date: [
    { 
      id: 'new_releases', 
      name: 'New Releases', 
      category: 'release_date', 
      icon: Sparkles,
      description: 'Fresh tracks hot off the press'
    },
    { 
      id: 'this_month', 
      name: 'This Month', 
      category: 'release_date', 
      icon: Calendar,
      description: 'The best new music from this month'
    },
    { 
      id: 'this_year', 
      name: 'This Year', 
      category: 'release_date', 
      icon: Calendar,
      description: 'Top releases from the current year'
    },
    { 
      id: 'classics', 
      name: 'Classics', 
      category: 'release_date', 
      icon: Star,
      description: 'Timeless songs that never get old'
    },

    { 
      id: '2020s', 
      name: '2020s', 
      category: 'release_date', 
      icon: Disc,
      description: 'Latest hits from the 2020s'
    },
    { 
      id: '2010s', 
      name: '2010s', 
      category: 'release_date', 
      icon: Disc,
      description: 'Hits from the 2010s decade'
    },
    { 
      id: '2000s', 
      name: '2000s', 
      category: 'release_date', 
      icon: Disc,
      description: 'Nostalgic tracks from the 2000s'
    },
    { 
      id: '90s', 
      name: '90s', 
      category: 'release_date', 
      icon: Disc,
      description: 'Classic hits from the 1990s'
    },
    { 
      id: '80s', 
      name: '80s', 
      category: 'release_date', 
      icon: Disc,
      description: 'Iconic songs from the 1980s'
    },
    { 
      id: '70s', 
      name: '70s', 
      category: 'release_date', 
      icon: Disc,
      description: 'Timeless hits from the 1970s'
    },
  ],
  activity: [
    { 
      id: 'workout', 
      name: 'Workout', 
      category: 'activity', 
      icon: Dumbbell,
      description: 'High-energy tracks to power through your exercise'
    },
    { 
      id: 'party', 
      name: 'Party', 
      category: 'activity', 
      icon: Sparkles,
      description: 'Upbeat dance music to keep the party going'
    },
    { 
      id: 'focus', 
      name: 'Focus', 
      category: 'activity', 
      icon: Coffee,
      description: 'Ambient sounds to help you stay concentrated'
    },
    { 
      id: 'sleep', 
      name: 'Sleep', 
      category: 'activity', 
      icon: Moon,
      description: 'Calming melodies to help you drift off to sleep'
    },
    { 
      id: 'meditation', 
      name: 'Meditation', 
      category: 'activity', 
      icon: Waves,
      description: 'Peaceful sounds for mindfulness and relaxation'
    },
    { 
      id: 'running', 
      name: 'Running', 
      category: 'activity', 
      icon: Zap,
      description: 'Motivating beats to keep your pace up'
    },
    { 
      id: 'night-driving', 
      name: 'Driving at Night', 
      category: 'activity', 
      icon: Car,
      description: 'Chill tracks with a touch of mystery'
    },
    { 
      id: 'sunset-watching', 
      name: 'Sunset Watching', 
      category: 'activity', 
      icon: Sunset,
      description: 'Dreamy, atmospheric music for golden hour'
    },
    { 
      id: 'morning-vibes', 
      name: 'Morning Vibes', 
      category: 'activity', 
      icon: Sunrise,
      description: 'Energizing tracks to start your day'
    },
    { 
      id: 'relaxing-home', 
      name: 'Relaxing at Home', 
      category: 'activity', 
      icon: BedDouble,
      description: 'Chill music for a cozy atmosphere'
    },
  ],
  languages: [
    { 
      id: 'english', 
      name: 'English (US)', 
      category: 'languages', 
      icon: Languages,
      description: 'Universal hits and popular songs across all genres'
    },
    {
      id: 'english-uk',
      name: 'English (UK)', 
      category: 'languages',
      icon: Languages, 
      description: 'British artists and UK chart-toppers'
    },
    { 
      id: 'italian', 
      name: 'Italian', 
      category: 'languages', 
      icon: Globe,
      description: 'Soulful songs sung in Italian'
    },
    { 
      id: 'spanish', 
      name: 'Spanish', 
      category: 'languages', 
      icon: Globe,
      description: 'Romantic ballads to lively Latin pop'
    },
    { 
      id: 'portuguese', 
      name: 'Portuguese', 
      category: 'languages', 
      icon: Globe,
      description: 'Bossa Nova, Fado, and modern Portuguese hits'
    },
    { 
      id: 'korean', 
      name: 'Korean', 
      category: 'languages', 
      icon: Globe,
      description: 'Popular K-pop and indie Korean tracks'
    },
    { 
      id: 'japanese', 
      name: 'Japanese', 
      category: 'languages', 
      icon: Globe,
      description: 'Enchanting ballads and anime-inspired hits'
    },
    { 
      id: 'hindi', 
      name: 'Hindi', 
      category: 'languages', 
      icon: Globe,
      description: 'Indian pop and Bollywood classics'
    },
    { 
      id: 'french', 
      name: 'French', 
      category: 'languages', 
      icon: Globe,
      description: 'Romantic chansons and modern French pop'
    },
    { 
      id: 'mandarin', 
      name: 'Mandarin', 
      category: 'languages', 
      icon: Globe,
      description: 'Traditional Chinese and Mandopop hits'
    },
  ],
  time_of_day: [
    { 
      id: 'morning', 
      name: 'Morning', 
      category: 'time_of_day', 
      icon: Sunrise,
      description: 'Uplifting tracks to start your day right'
    },
    { 
      id: 'evening', 
      name: 'Evening', 
      category: 'time_of_day', 
      icon: Sunset,
      description: 'Nostalgic and mellow tracks to unwind'
    },
    { 
      id: 'night', 
      name: 'Night', 
      category: 'time_of_day', 
      icon: Moon,
      description: 'Lo-fi and chill beats for late-night listening'
    },
  ],
  weather: [
    { 
      id: 'rainy', 
      name: 'Rainy Day', 
      category: 'weather', 
      icon: CloudRain,
      description: 'Calm, introspective music for rainy vibes'
    },
    { 
      id: 'sunny', 
      name: 'Sunny', 
      category: 'weather', 
      icon: CloudSun,
      description: 'Upbeat and happy tracks for sunny days'
    },
  ],
  events: [
    { 
      id: 'birthday', 
      name: 'Birthday', 
      category: 'events', 
      icon: Cake,
      description: 'Fun and celebratory tunes for special days'
    },
    { 
      id: 'christmas', 
      name: 'Christmas', 
      category: 'events', 
      icon: Gift,
      description: 'Festive classics and holiday hits'
    },
    { 
      id: 'valentines', 
      name: 'Valentine\'s Day', 
      category: 'events', 
      icon: Heart,
      description: 'Romantic ballads and love songs'
    },
    { 
      id: 'new-year', 
      name: 'New Year\'s Party', 
      category: 'events', 
      icon: PartyPopper,
      description: 'High-energy tracks to celebrate the new year'
    },
  ],
  discoverability: [
    { 
      id: 'viral-tracks', 
      name: 'Viral Tracks', 
      category: 'discoverability', 
      icon: TrendingUp,
      description: 'Songs that are blowing up on social media'
    },
    { 
      id: 'underrated', 
      name: 'Underrated Artists', 
      category: 'discoverability', 
      icon: Star,
      description: 'Amazing music that deserves more attention'
    },
  ],
};

// Category styles with proper typing
const categoryStyles: Record<string, CategoryStyle> = {
  genre: {
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-500/10',
    bgHover: 'hover:bg-emerald-500/20',
    border: 'border-emerald-500/20',
    text: 'text-emerald-500',
  },
  audio_features: {
    color: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-500/10',
    bgHover: 'hover:bg-blue-500/20',
    border: 'border-blue-500/20',
    text: 'text-blue-500',
  },
  mood: {
    color: 'from-amber-500 to-yellow-600',
    bgLight: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/20',
    border: 'border-amber-500/20',
    text: 'text-amber-500',
  },
  popularity: {
    color: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-500/10',
    bgHover: 'hover:bg-purple-500/20',
    border: 'border-purple-500/20',
    text: 'text-purple-500',
  },
  release_date: {
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-500/10',
    bgHover: 'hover:bg-pink-500/20',
    border: 'border-pink-500/20',
    text: 'text-pink-500',
  },
  activity: {
    color: 'from-orange-500 to-red-600',
    bgLight: 'bg-orange-500/10',
    bgHover: 'hover:bg-orange-500/20',
    border: 'border-orange-500/20',
    text: 'text-orange-500',
  },
  languages: {
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-500/10',
    bgHover: 'hover:bg-sky-500/20',
    border: 'border-sky-500/20',
    text: 'text-sky-500',
  },
  time_of_day: {
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/20',
    border: 'border-amber-500/20',
    text: 'text-amber-500',
  },
  weather: {
    color: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-500/10',
    bgHover: 'hover:bg-cyan-500/20',
    border: 'border-cyan-500/20',
    text: 'text-cyan-500',
  },
  events: {
    color: 'from-rose-500 to-pink-600',
    bgLight: 'bg-rose-500/10',
    bgHover: 'hover:bg-rose-500/20',
    border: 'border-rose-500/20',
    text: 'text-rose-500',
  },
  discoverability: {
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-500/10',
    bgHover: 'hover:bg-violet-500/20',
    border: 'border-violet-500/20',
    text: 'text-violet-500',
  },
};

// Update the categoryOrder array
const categoryOrder = [
  'genre',
  'languages',
  'mood',
  'activity',
  'audio_features',
  'time_of_day',
  'weather',
  'release_date',
  'popularity',
  'events',
  'discoverability'
];

// Add this interface for audio preview state
interface AudioPreview {
  trackId: string | null;
  isPlaying: boolean;
}

const CriteriaSelection = () => {
  const navigate = useNavigate();
  const { spotifyApi } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<SpotifyTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playlistModal, setPlaylistModal] = useState<{
    isOpen: boolean;
    tracks: ImportedTrackRecommendation[];
    isLoading: boolean;
  }>({
    isOpen: false,
    tracks: [],
    isLoading: false
  });
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Fetch user preferences on mount
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        // Get top artists for genres
        const topArtists = await spotifyApi.getMyTopArtists({ limit: 50, time_range: 'medium_term' });
        const genres = topArtists.body.items
          .flatMap(artist => artist.genres || [])
          .filter(Boolean);
        
        const genreCounts = genres.reduce<Record<string, number>>((acc, genre) => {
          acc[genre] = (acc[genre] || 0) + 1;
          return acc;
        }, {});

        const topGenres = Object.entries(genreCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // Get top tracks for audio features
        const topTracks = await spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' });
        const trackIds = topTracks.body.items.map(track => track.id);
        
        const featuresResponse = await spotifyApi.getAudioFeaturesForTracks(trackIds);
        const validFeatures = featuresResponse.body.audio_features.filter(Boolean);
        
        const avgFeatures = validFeatures.reduce((acc, curr) => ({
          danceability: acc.danceability + curr.danceability,
          energy: acc.energy + curr.energy,
          valence: acc.valence + curr.valence,
          acousticness: acc.acousticness + curr.acousticness,
          instrumentalness: acc.instrumentalness + curr.instrumentalness,
        }), {
          danceability: 0,
          energy: 0,
          valence: 0,
          acousticness: 0,
          instrumentalness: 0,
        });

        const count = validFeatures.length;
        Object.keys(avgFeatures).forEach((key) => {
          avgFeatures[key as keyof typeof avgFeatures] /= count;
        });

        // Calculate traits
        const traits: string[] = [];
        if (avgFeatures.danceability > 0.7) traits.push('Dance Enthusiast');
        if (avgFeatures.energy > 0.7) traits.push('Energy Seeker');
        if (avgFeatures.valence > 0.7) traits.push('Mood Lifter');
        if (avgFeatures.acousticness > 0.7) traits.push('Acoustic Lover');
        if (avgFeatures.instrumentalness > 0.7) traits.push('Instrumental Explorer');

        setUserPreferences({
          topGenres,
          audioFeatures: avgFeatures,
          traits
        });
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };

    if (spotifyApi.getAccessToken()) {
      fetchUserPreferences();
    }
  }, [spotifyApi]);

  const handleCreatePlaylist = async () => {
    if (selectedTags.length === 0 || !userPreferences) {
      toast.error('Please select at least one tag');
      return;
    }
    
    setPlaylistModal(prev => ({ ...prev, isOpen: true, isLoading: true }));
    
    try {
      console.log('Creating playlist with tags:', selectedTags.map(t => t.name));
      
      const recommendations = await getRecommendations(spotifyApi, {
        selectedTags: selectedTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          category: tag.category as TagCategory
        })),
        userPreferences
      });

      if (recommendations.length === 0) {
        throw new Error('No matching tracks found');
      }

      console.log(`Got ${recommendations.length} recommendations`);
      
      setPlaylistModal(prev => ({ 
        ...prev, 
        tracks: recommendations,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get recommendations. Please try again.');
      setPlaylistModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSavePlaylist = async () => {
    if (!playlistModal.tracks.length) return;

    setPlaylistModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      const meResponse = await spotifyApi.getMe();
      const userId = meResponse.body.id;

      const playlistResponse = await spotifyApi.createPlaylist(userId, {
        name: `Custom Mix - ${selectedTags.map(t => t.name).join(', ')}`,
        description: `Created with your preferences and tags: ${selectedTags.map(t => t.name).join(', ')}`,
        public: false
      } as any);
      
      const playlistId = playlistResponse.body.id;

      const trackUris = playlistModal.tracks.map(track => `spotify:track:${track.id}`);
      for (let i = 0; i < trackUris.length; i += 50) {
        const batch = trackUris.slice(i, i + 50);
        await spotifyApi.addTracksToPlaylist(playlistId, batch);
      }

      console.log('Added tracks to playlist');

      setPlaylistModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      setSelectedOption(null);
      setSelectedTags([]);

    } catch (error) {
      console.error('Error saving playlist:', error);
      setPlaylistModal(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Failed to save playlist. Please try again.' 
      }));
    }
  };

  // Modify tag selection to auto-progress
  const handleTagSelection = (tag: SpotifyTag) => {
    setSelectedTags(prevTags => {
      // Remove any existing tags from the same category
      const filteredTags = prevTags.filter(t => t.category !== tag.category);
      const newTags = [...filteredTags, tag];
      
      // Auto-progress to next category
      const currentIndex = categoryOrder.indexOf(selectedOption!);
      if (currentIndex < categoryOrder.length - 1) {
        setSelectedOption(categoryOrder[currentIndex + 1]);
        setCurrentCategoryIndex(currentIndex + 1);
      }
      
      return newTags;
    });
  };

  // Add navigation functions
  const handlePrevCategory = () => {
    const newIndex = Math.max(0, currentCategoryIndex - 1);
    setCurrentCategoryIndex(newIndex);
    setSelectedOption(categoryOrder[newIndex]);
  };

  const handleNextCategory = () => {
    const newIndex = Math.min(categoryOrder.length - 1, currentCategoryIndex + 1);
    setCurrentCategoryIndex(newIndex);
    setSelectedOption(categoryOrder[newIndex]);
  };

  // Render category card
  const CategoryCard: React.FC<{
    category: string;
    tags: SpotifyTag[];
    style: CategoryStyle;
  }> = ({ category, tags, style }) => {
    const Icon = tags[0]?.icon;
    const formattedName = category.replace('_', ' ').charAt(0).toUpperCase() + 
                         category.slice(1).replace('_', ' ');
    
    // Get 6 preview tags
    const previewTags = tags.slice(0, 6);

    return (
      <button
        onClick={() => setSelectedOption(category)}
        disabled={isLoading}
        className={`
          relative p-6 rounded-xl transition-all duration-300
          ${style.bgLight} ${style.bgHover}
          border ${style.border}
          hover:scale-105 group
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          {Icon && <Icon className={`w-6 h-6 ${style.text}`} />}
          <h3 className="text-xl font-semibold text-white">
            {formattedName}
          </h3>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">
          {tags.length} options
        </p>

        {/* Preview Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {previewTags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-300"
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 6 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-300">
              +{tags.length - 6} more
            </span>
          )}
        </div>

        {/* Hover Arrow */}
        <ArrowRight 
          className={`
            absolute right-4 top-1/2 -translate-y-1/2
            w-5 h-5 ${style.text} opacity-0 
            group-hover:opacity-100 group-hover:translate-x-1
            transition-all duration-300
          `}
        />
      </button>
    );
  };

  // Render tag card
  const TagCard: React.FC<{
    tag: SpotifyTag;
    style: CategoryStyle;
  }> = ({ tag, style }) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    
    return (
      <button
        onClick={() => setSelectedTags(prevTags => {
          const exists = prevTags.some(t => t.id === tag.id);
          return exists 
            ? prevTags.filter(t => t.id !== tag.id)
            : [...prevTags, tag];
        })}
        className={`
          p-4 rounded-xl text-left transition-all duration-300
          ${isSelected ? 'bg-white/20 shadow-lg scale-105' : 'bg-white/5 hover:bg-white/10 hover:scale-105'}
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          {tag.icon && <tag.icon className={`w-5 h-5 ${isSelected ? 'text-white' : style.text}`} />}
          <h3 className="text-lg font-medium text-white">
            {tag.name}
          </h3>
        </div>
        {tag.description && (
          <p className="text-sm text-gray-400">
            {tag.description}
          </p>
        )}
      </button>
    );
  };

  // Render sidebar section
  const SidebarSection = ({ category, tags }: { category: string; tags: SpotifyTag[] }) => {
    const style = categoryStyles[category as keyof typeof categoryStyles];
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          {tags.length > 0 && tags[0].icon && React.createElement(tags[0].icon, { className: `w-4 h-4 ${style.text}` })}
          {category.replace(/_/g, ' ').charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTags(prevTags => {
                const exists = prevTags.some(t => t.id === tag.id);
                return exists 
                  ? prevTags.filter(t => t.id !== tag.id)
                  : [...prevTags, tag];
              })}
              className={`
                px-3 py-1 rounded-full text-sm transition-all duration-300
                ${selectedTags.some(t => t.id === tag.id)
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}
              `}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Playlist Modal
  const PlaylistModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tracks: ImportedTrackRecommendation[];
    isLoading: boolean;
    onSave: () => void;
    onRefresh: () => void;
  }> = ({ isOpen, onClose, tracks, isLoading, onSave, onRefresh }) => {
    const [audioPreview, setAudioPreview] = useState<AudioPreview>({
      trackId: null,
      isPlaying: false
    });
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlayPreview = (trackId: string, previewUrl?: string) => {
      if (!previewUrl) return;

      if (audioPreview.trackId === trackId && audioPreview.isPlaying) {
        // Pause current track
        audioRef.current?.pause();
        setAudioPreview({ trackId: null, isPlaying: false });
      } else {
        // Play new track
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(previewUrl);
        audioRef.current.play();
        audioRef.current.onended = () => {
          setAudioPreview({ trackId: null, isPlaying: false });
        };
        setAudioPreview({ trackId, isPlaying: true });
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
          {/* Modal Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Custom Playlist</h2>
                <p className="text-gray-400 mt-1">
                  {tracks.length} tracks perfectly matched to your taste
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onRefresh}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 
                    transition-colors text-gray-400 hover:text-white"
                  title="Get new recommendations"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 
                    transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 
                  rounded-full animate-spin mb-4" />
                <p className="text-gray-400">Creating your perfect playlist...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-white/5 
                      hover:bg-white/10 transition-colors group"
                  >
                    {/* Track Image */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img
                        src={track.imageUrl}
                        alt={track.name}
                        className="w-full h-full rounded-md object-cover"
                      />
                      {track.previewUrl && (
                        <button
                          onClick={() => handlePlayPreview(track.id, track.previewUrl)}
                          className="absolute inset-0 bg-black/60 opacity-0 
                            group-hover:opacity-100 transition-opacity flex 
                            items-center justify-center rounded-md"
                        >
                          {audioPreview.trackId === track.id && audioPreview.isPlaying ? (
                            <Pause className="w-8 h-8 text-white" />
                          ) : (
                            <Play className="w-8 h-8 text-white" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{track.name}</h4>
                      <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {track.matchedTags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 
                        rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                        {Math.round(track.matchScore)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-white/10">
            <button
              onClick={onSave}
              disabled={isLoading}
              className="w-full px-6 py-3 rounded-full bg-emerald-500 
                hover:bg-emerald-600 text-white font-medium transition-colors 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center 
                justify-center gap-2"
            >
              {isLoading ? 'Creating...' : 'Save to Spotify'}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="flex items-center h-14 px-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          {selectedOption ? (
            <button
              onClick={() => {
                setSelectedOption(null);
                setSelectedTags([]);
              }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}
          <span className="mx-1.5 text-gray-600">/</span>
          <span className="text-white font-medium">
            {selectedOption ? 'Select Tags' : 'Create Playlist'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Headphones className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-4xl font-bold text-white">
              {selectedOption 
                ? `Select ${selectedOption.replace('_', ' ')} Tags`
                : 'Choose Category'}
            </h1>
          </div>
          
          {/* Add this row of category buttons */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto py-1 scrollbar-hide">
            {categoryOrder.map((category, index) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedOption(category);
                  setCurrentCategoryIndex(index);
                }}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                  transition-all duration-300
                  ${selectedOption === category 
                    ? `bg-gradient-to-r ${categoryStyles[category].color} text-white` 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                `}
              >
                {category.replace('_', ' ').charAt(0).toUpperCase() + 
                 category.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <p className="text-base text-gray-400 max-w-2xl">
            {selectedOption 
              ? 'Select one tag to continue to the next category'
              : 'Choose a method below and we\'ll analyze your music library'}
          </p>
        </div>

        {/* Options Grid */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {!selectedOption ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(spotifyTags).map(([category, tags]) => (
                  <CategoryCard
                    key={category}
                    category={category}
                    tags={tags}
                    style={categoryStyles[category]}
                  />
                ))}
              </div>
            ) : (
              // Show selected category tags in main content
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {spotifyTags[selectedOption].map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagSelection(tag)}
                    className={`
                      p-4 rounded-xl text-left transition-all duration-300
                      ${selectedTags.some(t => t.id === tag.id)
                        ? `bg-gradient-to-r ${categoryStyles[selectedOption].color} text-white`
                        : 'bg-white/5 hover:bg-white/10'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {tag.icon && (
                        <tag.icon 
                          className={`
                            w-5 h-5
                            ${selectedTags.some(t => t.id === tag.id)
                              ? 'text-white'
                              : categoryStyles[selectedOption].text}
                          `}
                        />
                      )}
                      <h3 className="text-lg font-medium text-white">
                        {tag.name}
                      </h3>
                    </div>
                    {tag.description && (
                      <p className="text-sm text-gray-400">
                        {tag.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          {selectedTags.length > 0 && (
            <div className="w-72 shrink-0">
              <div className="sticky top-20 bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                <h2 className="text-xl font-bold text-white mb-6">Selected Tags</h2>
                
                {/* Selected Tags List */}
                {categoryOrder.map((category) => {
                  const selectedTag = selectedTags.find(t => t.category === category);
                  if (!selectedTag) return null;
                  
                  return (
                    <div key={category} className="mb-4">
                      <h3 className="text-sm text-gray-400 mb-2">
                        {category.replace('_', ' ').charAt(0).toUpperCase() + 
                         category.slice(1).replace('_', ' ')}
                      </h3>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2">
                          {selectedTag.icon && (
                            <selectedTag.icon className={`w-4 h-4 ${categoryStyles[category].text}`} />
                          )}
                          <span className="text-white">{selectedTag.name}</span>
                        </div>
                        <button
                          onClick={() => setSelectedTags(prevTags => 
                            prevTags.filter(t => t.id !== selectedTag.id)
                          )}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Create Playlist Button */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={isLoading || !userPreferences}
                    className={`
                      w-full px-6 py-3 rounded-full font-medium
                      transition-all duration-300
                      flex items-center justify-center gap-2
                      bg-gradient-to-r from-emerald-500 to-green-600
                      hover:from-emerald-600 hover:to-green-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-white shadow-lg shadow-emerald-500/20
                    `}
                  >
                    {isLoading ? 'Creating...' : 'Create Playlist'}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playlist Creation Modal */}
      <PlaylistModal
        isOpen={playlistModal.isOpen}
        onClose={() => setPlaylistModal(prev => ({ ...prev, isOpen: false }))}
        tracks={playlistModal.tracks}
        isLoading={playlistModal.isLoading}
        onSave={handleSavePlaylist}
        onRefresh={handleCreatePlaylist}
      />
    </div>
  );
};

export default CriteriaSelection;