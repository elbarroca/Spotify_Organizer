import React from 'react';
import { Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex flex-col items-center">
          <div className="bg-green-500 p-3 rounded-full">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-white">
            SpotOrganize
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Organize your Spotify likes into beautiful playlists
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={login}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
          >
            Connect with Spotify
          </button>
        </div>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">
                Features
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-black bg-opacity-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white">Smart Organization</h3>
              <p className="mt-2 text-sm text-gray-300">
                Automatically organize your liked songs by genre, artist, or year
              </p>
            </div>
            <div className="bg-black bg-opacity-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white">Custom Playlists</h3>
              <p className="mt-2 text-sm text-gray-300">
                Create and manage playlists directly in your Spotify account
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}