import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music, Shuffle, ListMusic, ArrowRight, Github, Settings } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-32 pb-20 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Music className="h-12 w-12 text-emerald-500" />
          <h1 className="text-3xl font-bold text-white">SpotOrganize</h1>
        </div>
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Your Music, Untangled <span className="text-emerald-500">🎶</span>
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          If your saved songs on Spotify feel like a chaotic mess, we get it. Sifting through hundreds—maybe 
          thousands—of tracks to create playlists is overwhelming. That's why we built SpotOrganize: the fastest 
          way to sort and curate your liked songs into playlists you'll actually enjoy.
        </p>
        <button
          onClick={login}
          className="px-8 py-4 bg-emerald-500 text-white rounded-full text-lg font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2 mx-auto"
        >
          Stop Scrolling, Start Organizing <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* Pain Points Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-8">We Know the Struggle:</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl">
            <p className="text-gray-300 text-lg">
              You've been saving songs for years. That perfect chill playlist? Never got around to making it. 
              Your workout jams? Buried under your guilty-pleasure tracks. Sound familiar?
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl">
            <p className="text-gray-300 text-lg">
              The problem isn't your music taste—it's the tools. Spotify makes it easy to save songs but leaves 
              the organizing to you. And let's be real, who has time to manually create playlists?
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl hover:bg-gray-800/70 transition-colors">
              <feature.icon className="w-12 h-12 text-emerald-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emotional Appeal Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Rediscover the Joy of Your Music</h2>
          <p className="text-xl text-gray-300 mb-8">
            Your Spotify library is more than just songs—it's memories, moods, and moments waiting to be replayed. 
            Don't let disorganization hold you back. With SpotOrganize, you can finally enjoy your music the way 
            it was meant to be: curated, personal, and stress-free.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 backdrop-blur-sm rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Music Library?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Stop letting your saved tracks gather dust. With SpotOrganize, you can bring order to the chaos 
            and create playlists that match your mood, your moments, and your life.
          </p>
          <button
            onClick={login}
            className="px-8 py-4 bg-emerald-500 text-white rounded-full text-lg font-semibold hover:bg-emerald-600 transition-colors"
          >
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Music className="h-6 w-6 text-emerald-500" />
            <span className="text-white">SpotOrganize</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/elbarroca/spotorganize"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-6 h-6" />
            </a>
            <span className="text-gray-400">© 2024 SpotOrganize. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: Music,
    title: 'Fetch Liked Songs',
    description: 'Instantly pull in all your saved tracks from Spotify—no endless scrolling required.',
  },
  {
    icon: Shuffle,
    title: 'Smart Sorting',
    description: 'Automatically organize your music into playlists by genre, artist, or release year.',
  },
  {
    icon: ListMusic,
    title: 'Seamless Creation',
    description: 'Create and update playlists directly in your Spotify account with one click.',
  },
  {
    icon: Settings,
    title: 'Review & Edit',
    description: 'Fine-tune your playlists, rename them, or tweak the tracklist to make them perfect.',
  },
];

export default Login;