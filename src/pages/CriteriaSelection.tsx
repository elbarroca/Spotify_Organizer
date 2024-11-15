import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Music, 
  Smile, 
  Dumbbell, 
  Clock, 
  Mic2, 
  Radio,
  ArrowRight,
  Sparkles,
  Headphones
} from 'lucide-react';

const organizationOptions = [
  {
    id: 'genre',
    icon: Music,
    title: 'By Genre',
    description: 'Group songs by their musical genre',
    color: 'from-emerald-500 to-green-600',
    bgGlow: 'group-hover:shadow-emerald-500/30',
    examples: ['Rock', 'Hip-Hop', 'Electronic', 'Jazz'],
    gradient: 'from-emerald-500/20 via-green-500/10 to-transparent'
  },
  {
    id: 'mood',
    icon: Smile,
    title: 'By Mood',
    description: 'Sort songs based on mood and energy',
    color: 'from-amber-500 to-yellow-600',
    bgGlow: 'group-hover:shadow-yellow-500/30',
    examples: ['Happy', 'Chill', 'Energetic', 'Melancholic'],
    gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent'
  },
  {
    id: 'activity',
    icon: Dumbbell,
    title: 'By Activity',
    description: 'Perfect playlists for every moment',
    color: 'from-purple-500 to-violet-600',
    bgGlow: 'group-hover:shadow-purple-500/30',
    examples: ['Workout', 'Focus', 'Party', 'Sleep'],
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent'
  },
  {
    id: 'decade',
    icon: Clock,
    title: 'By Decade',
    description: 'Time travel through your music',
    color: 'from-blue-500 to-cyan-600',
    bgGlow: 'group-hover:shadow-blue-500/30',
    examples: ['80s', '90s', '2000s', '2010s'],
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent'
  },
  {
    id: 'artists',
    icon: Mic2,
    title: 'By Artist',
    description: 'Group songs by your favorite artists',
    color: 'from-pink-500 to-rose-600',
    bgGlow: 'group-hover:shadow-pink-500/30',
    examples: ['Top Artists', 'Similar Artists', 'Collaborations'],
    gradient: 'from-pink-500/20 via-rose-500/10 to-transparent'
  },
  {
    id: 'recent',
    icon: Radio,
    title: 'Recent Favorites',
    description: 'Based on your latest listening habits',
    color: 'from-red-500 to-orange-600',
    bgGlow: 'group-hover:shadow-red-500/30',
    examples: ['Last Month', 'Season Hits', 'New Discoveries'],
    gradient: 'from-red-500/20 via-orange-500/10 to-transparent'
  }
];

const CriteriaSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-purple-500/5 to-blue-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,0.7),rgba(0,0,0,0.9))]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-20 pb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="p-4 bg-emerald-500/10 rounded-2xl">
              <Headphones className="w-12 h-12 text-emerald-500" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Organize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Music</span>
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose a method below and we'll analyze your music library to create perfectly curated playlists
          </p>
        </div>

        {/* Options Grid */}
        <div className="container mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {organizationOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => navigate(`/create?criteria=${option.id}`)}
                className={`
                  group relative bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 
                  hover:bg-gray-800/50 transition-all duration-500 text-left
                  hover:scale-[1.02] ${option.bgGlow} hover:shadow-2xl
                  border border-white/5 hover:border-white/10
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3 bg-gradient-to-br ${option.color} rounded-xl bg-opacity-10 
                      group-hover:scale-110 group-hover:shadow-lg transition-all duration-500`}>
                      <option.icon className="w-8 h-8 text-white" />
                    </div>
                    <ArrowRight className={`w-6 h-6 text-white opacity-0 group-hover:opacity-100 
                      transform translate-x-0 group-hover:translate-x-2 transition-all duration-500`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent 
                    group-hover:bg-clip-text group-hover:bg-gradient-to-r ${option.color} transition-all duration-500">
                    {option.title}
                  </h3>
                  <p className="text-gray-400 mb-6 group-hover:text-gray-300 transition-colors duration-500">
                    {option.description}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {option.examples.map((example, index) => (
                      <span
                        key={index}
                        className={`text-sm px-3 py-1 rounded-full bg-gradient-to-r ${option.color} 
                          bg-opacity-10 text-white opacity-60 group-hover:opacity-100 transition-all duration-500
                          transform group-hover:scale-105`}
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Smart Mix CTA */}
        <div className="container mx-auto px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent 
              rounded-2xl p-8 backdrop-blur-sm border border-white/5 hover:border-white/10 
              transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">
                  Can't Decide? Try Smart Mix
                </h3>
                <p className="text-gray-400 mb-6">
                  Let our AI analyze your music taste and create the perfect combination of playlists
                </p>
                <button
                  onClick={() => navigate('/create?criteria=smart')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r 
                    from-emerald-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 
                    hover:to-emerald-700 transition-all duration-300 hover:scale-105 group"
                >
                  Create Smart Mix
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriteriaSelection;