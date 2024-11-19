import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import { motion } from "framer-motion"
import SpotifyWebApi from "spotify-web-api-node"

interface TopGenre {
  name: string
  count: number
}

interface AudioFeatures {
  danceability: number
  energy: number
  valence: number
  acousticness: number
  instrumentalness: number
}

interface SpotifyArtist {
  genres?: string[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-sm p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-emerald-400 font-medium">{`${label}`}</p>
        <p className="text-white font-bold">{`${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const CustomTimeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-sm p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-emerald-400 font-medium">{`${label}:00`}</p>
        <p className="text-white font-bold">{`${payload[0].value} plays`}</p>
      </div>
    );
  }
  return null;
};

interface StyleScore {
  score: number;
  description: string;
  traits: string[];
}

const calculateStyleScore = (audioFeatures: AudioFeatures): StyleScore => {
  const traits: string[] = [];
  let score = 50; // Base score

  if (audioFeatures.danceability > 0.7) {
    score += 10;
    traits.push("Dance Enthusiast");
  }
  if (audioFeatures.energy > 0.7) {
    score += 10;
    traits.push("Energy Seeker");
  }
  if (audioFeatures.valence > 0.7) {
    score += 10;
    traits.push("Mood Lifter");
  }
  if (audioFeatures.acousticness > 0.7) {
    score += 10;
    traits.push("Acoustic Lover");
  }
  if (audioFeatures.instrumentalness > 0.7) {
    score += 10;
    traits.push("Instrumental Explorer");
  }

  let description = "";
  if (score >= 90) {
    description = "Musical Virtuoso - Your taste spans multiple dimensions of music!";
  } else if (score >= 70) {
    description = "Eclectic Explorer - You appreciate diverse musical elements";
  } else if (score >= 50) {
    description = "Focused Listener - You know what you like and stick to it";
  } else {
    description = "Selective Connoisseur - You have specific musical preferences";
  }

  return { score, description, traits };
};

export default function Profile() {
  const { spotifyApi } = useAuth()
  const [topGenres, setTopGenres] = useState<TopGenre[]>([])
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [styleScore, setStyleScore] = useState<StyleScore | null>(null)

  useEffect(() => {
    async function fetchMusicData() {
      if (!spotifyApi.getAccessToken()) {
        setError("Not authenticated")
        setIsLoading(false)
        return
      }

      try {
        // Fetch top artists instead of tracks for better genre data
        const topArtistsResponse = await spotifyApi.getMyTopArtists({ limit: 50, time_range: 'medium_term' })
        
        // Calculate top genres from artists
        const genres = topArtistsResponse.body.items
          .flatMap(artist => artist.genres || [])
          .filter(Boolean)
        
        const genreCounts = genres.reduce<Record<string, number>>((acc, genre) => {
          acc[genre] = (acc[genre] || 0) + 1
          return acc
        }, {})

        const topGenresList = Object.entries(genreCounts)
          .map(([name, count]): TopGenre => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8) // Show more genres

        setTopGenres(topGenresList)

        // Fetch top tracks for audio features
        const topTracksResponse = await spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' })
        const trackIds = topTracksResponse.body.items.map(track => track.id)
        
        // Fetch audio features for tracks
        const featuresResponse = await spotifyApi.getAudioFeaturesForTracks(trackIds)
        
        // Calculate average audio features
        const validFeatures = featuresResponse.body.audio_features.filter(Boolean)
        const avgFeatures = validFeatures.reduce<AudioFeatures>(
          (acc, curr) => ({
            danceability: acc.danceability + curr.danceability,
            energy: acc.energy + curr.energy,
            valence: acc.valence + curr.valence,
            acousticness: acc.acousticness + curr.acousticness,
            instrumentalness: acc.instrumentalness + curr.instrumentalness,
          }),
          {
            danceability: 0,
            energy: 0,
            valence: 0,
            acousticness: 0,
            instrumentalness: 0,
          }
        )

        const count = validFeatures.length
        Object.keys(avgFeatures).forEach((key) => {
          const k = key as keyof AudioFeatures
          avgFeatures[k] = avgFeatures[k] / count
        })

        setAudioFeatures(avgFeatures)
        if (avgFeatures) {
          setStyleScore(calculateStyleScore(avgFeatures))
        }
      } catch (error) {
        console.error("Error fetching music data:", error)
        setError("Failed to load music profile")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMusicData()
  }, [spotifyApi])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl animate-pulse">Loading your music profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    )
  }

  const radarData = audioFeatures
    ? [
        {
          subject: "Danceability",
          value: audioFeatures.danceability * 100,
        },
        {
          subject: "Energy",
          value: audioFeatures.energy * 100,
        },
        {
          subject: "Positivity",
          value: audioFeatures.valence * 100,
        },
        {
          subject: "Acoustic",
          value: audioFeatures.acousticness * 100,
        },
        {
          subject: "Instrumental",
          value: audioFeatures.instrumentalness * 100,
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-center mb-12 text-white"
        >
          Your Music Profile
        </motion.h1>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-xl"
          >
            <h2 className="text-2xl font-semibold mb-2 text-white">Your Music Style</h2>
            {styleScore && (
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 60}`}
                      strokeDashoffset={`${2 * Math.PI * 60 * (1 - styleScore.score / 100)}`}
                      className="text-emerald-500 transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white">
                    {styleScore.score}
                  </span>
                </div>
                <p className="text-lg text-white font-medium mb-2">{styleScore.description}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {styleScore.traits.map((trait, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:bg-gray-800/60 transition-all duration-300"
          >
            <h2 className="text-2xl font-semibold mb-2 text-white">Genre Breakdown</h2>
            <p className="text-gray-400 mb-6">Your musical universe at a glance</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topGenres} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#fff" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  className="hover:opacity-80 transition-opacity duration-300"
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:bg-gray-800/60 transition-all duration-300"
          >
            <h2 className="text-2xl font-semibold mb-2 text-white">Music Characteristics</h2>
            <p className="text-gray-400 mb-2">Your music's DNA</p>
            {audioFeatures && (
              <div className="mb-4 text-sm text-gray-400 space-y-2">
                {Object.entries({
                  danceability: (value: number) => `Danceability: ${Math.round(value * 100)}%`,
                  energy: (value: number) => `Energy: ${Math.round(value * 100)}%`,
                  valence: (value: number) => `Positivity: ${Math.round(value * 100)}%`,
                  acousticness: (value: number) => `Acoustic Elements: ${Math.round(value * 100)}%`,
                  instrumentalness: (value: number) => `Instrumental Content: ${Math.round(value * 100)}%`
                }).map(([key, getDescription]) => (
                  <p key={key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {getDescription(audioFeatures[key as keyof AudioFeatures])}
                  </p>
                ))}
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#444" />
                <PolarAngleAxis dataKey="subject" stroke="#fff" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#fff" />
                <Radar
                  name="Music Profile"
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                  className="hover:fill-opacity-70 transition-opacity duration-300"
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 