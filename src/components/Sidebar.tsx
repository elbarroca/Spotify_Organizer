import { useAuth } from '@/contexts/AuthContext';
import { ListMusic, LogOut, Home, Search, Library, BarChart3, Music, Plus, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { NowPlaying } from './NowPlaying';
import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const { 
    currentTrack, 
    isPlaying, 
    handlePlayPause, 
    handleNext, 
    handlePrevious,
    playerError 
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

  const showPlayerError = playerError && (
    <div className="px-4 py-2 text-red-400 text-sm">
      <p>Player Error: Please open Spotify app</p>
    </div>
  );

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
      <NowPlaying
        currentTrack={currentTrack ? {
          title: currentTrack.name,
          artist: currentTrack.artists[0].name,
          imageUrl: currentTrack.album.images[0].url
        } : null}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPauseWithError}
        onNext={handleNextWithError}
        onPrevious={handlePreviousWithError}
      />

      {/* User Profile Section */}
      {user && (
        <div className="p-4 border-t border-white/10 bg-gradient-to-b from-black/40 to-black/60 backdrop-blur-xl">
          <div className="group space-y-3">
            {/* Profile Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all duration-300 cursor-pointer backdrop-blur-sm">
              {user.images?.[0]?.url ? (
                <div className="relative">
                  <img
                    src={user.images[0].url}
                    alt="Profile"
                    className="w-12 h-12 rounded-full ring-2 ring-emerald-500/30 group-hover:ring-emerald-400/50 transition-all duration-300 object-cover shadow-lg shadow-emerald-500/20"
                  />
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-300/30 to-emerald-500/30 flex items-center justify-center ring-2 ring-emerald-500/30 group-hover:ring-emerald-400/50 transition-all duration-300 shadow-lg shadow-emerald-500/20">
                  <span className="text-emerald-300 text-lg font-semibold">
                    {user.display_name?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate group-hover:text-emerald-300 transition-colors duration-300">
                  {user.display_name}
                </p>
                <p className="text-xs text-gray-500 truncate group-hover:text-emerald-400/70 transition-colors duration-300">
                  @{user.id}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => logout()}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium",
                "bg-gradient-to-r from-red-500/10 to-red-400/5 text-red-400",
                "hover:from-red-500/15 hover:to-red-400/10 hover:text-red-300",
                "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                "relative overflow-hidden group shadow-lg shadow-red-500/5"
              )}
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