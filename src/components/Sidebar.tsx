import { useAuth } from '@/contexts/AuthContext';
import { ListMusic, LogOut, Home, Search, Library, BarChart3, Music, Plus, Users, SkipBack, SkipForward, Pause, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { NowPlaying } from './NowPlaying';
import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { SpotifyTrack } from '@/types/spotify';

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const { 
    currentTrack, 
    isPlaying, 
    handlePlayPause, 
    handleNext, 
    handlePrevious,
     
  } = useSpotifyPlayback();

  const isActivePath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const handlePlayerControl = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      toast.error('Playback control failed. Please ensure Spotify is active.');
    }
  }, []);

  const handlePlayPauseWithError = useCallback(() => {
    handlePlayerControl(handlePlayPause);
  }, [handlePlayPause, handlePlayerControl]);

  const handleNextWithError = useCallback(() => {
    handlePlayerControl(handleNext);
  }, [handleNext, handlePlayerControl]);

  const handlePreviousWithError = useCallback(() => {
    handlePlayerControl(handlePrevious);
  }, [handlePrevious, handlePlayerControl]);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const showPlayerError = playerError && (
    <div className="px-4 py-2 text-red-400 text-sm">
      <p>Player Error: Please open Spotify app</p>
    </div>
  );

  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Plus, label: 'Create Playlist', path: '/create' },
    { icon: Search, label: 'Discover', path: '/discover' },
    { icon: Library, label: 'Organize Library', path: '/organize' },
    { icon: Users, label: 'Find Alikes', path: '/find-alikes' },
    { icon: BarChart3, label: 'Profile Analytics', path: '/profile' },
    { icon: Music, label: 'Spotify Player', path: '/spotify' },
  ];

  return (
    <div className="flex flex-col h-full w-64 bg-black/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl">
      {/* Logo Section */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300 cursor-pointer group">
          <div className="relative">
            <ListMusic className="h-8 w-8 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
            <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full group-hover:bg-emerald-400/40 transition-all duration-300" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent group-hover:from-emerald-200 group-hover:via-emerald-300 group-hover:to-emerald-400 transition-all duration-500">
            Eightify
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300",
                "hover:bg-emerald-500/15 hover:scale-[1.02] active:scale-[0.98]",
                "group relative overflow-hidden backdrop-blur-sm",
                isActivePath(item.path)
                  ? "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-500/20"
                  : "text-gray-400 hover:text-emerald-300"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-300",
                isActivePath(item.path) ? "text-emerald-300" : "text-gray-400 group-hover:text-emerald-300"
              )} />
              <span className="text-sm font-medium tracking-wide">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      {/* Now Playing Section with Error Handling */}
      {showPlayerError}
      {currentTrack && (
        <div className="px-4 py-3 border-t border-emerald-500/10 bg-gradient-to-b from-black/40 to-black/60 backdrop-blur-xl">
          <div className="group space-y-3">
            {/* Mini Player */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-300 cursor-pointer backdrop-blur-sm border border-emerald-500/10 hover:border-emerald-500/20">
              {/* Album Art */}
              <div className="relative">
                <img
                  src={currentTrack.album.images[0]?.url}
                  alt={currentTrack.album.name}
                  className="w-12 h-12 rounded-lg shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
              </div>
              
              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate group-hover:text-emerald-300 transition-colors duration-300">
                  {currentTrack.name}
                </p>
                <p className="text-xs text-gray-500 truncate group-hover:text-emerald-400/70 transition-colors duration-300">
                  {currentTrack.artists[0].name}
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handlePreviousWithError}
                className="p-2 text-gray-400 hover:text-emerald-400 transition-all duration-300 hover:scale-110"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button
                onClick={handlePlayPauseWithError}
                className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white rounded-full hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={handleNextWithError}
                className="p-2 text-gray-400 hover:text-emerald-400 transition-all duration-300 hover:scale-110"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Section */}
      {user && (
        <div className="p-4 border-t border-emerald-500/10 bg-gradient-to-b from-black/40 to-black/60 backdrop-blur-xl">
          <div className="group">
            {/* Profile Info */}
            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-emerald-500/10 transition-all duration-300 cursor-pointer backdrop-blur-sm">
              {/* Profile Image/Avatar */}
              {user.images?.[0]?.url ? (
                <div className="relative">
                  <img
                    src={user.images[0].url}
                    alt={user.display_name || ''}
                    className="w-12 h-12 rounded-xl ring-2 ring-emerald-500/30 group-hover:ring-emerald-400/50 transition-all duration-300 object-cover"
                  />
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/20 flex items-center justify-center ring-2 ring-emerald-500/30 group-hover:ring-emerald-400/50 transition-all duration-300">
                  <span className="text-lg font-semibold text-emerald-400">
                    {user.display_name?.[0]?.toUpperCase() || '@'}
                  </span>
                </div>
              )}

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-white/90 truncate group-hover:text-emerald-300 transition-colors duration-300">
                    {user.display_name || 'Spotify User'}
                  </p>
                  {user.product === 'premium' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-400 text-white rounded-full">
                      PREMIUM
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate group-hover:text-emerald-400/70 transition-colors duration-300">
                  @{user.id}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => logout()}
              className="mt-3 w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-red-500/10 to-red-400/5 text-red-400 hover:from-red-500/15 hover:to-red-400/10 hover:text-red-300 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-400/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};