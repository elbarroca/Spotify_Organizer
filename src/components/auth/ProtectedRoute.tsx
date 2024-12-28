import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, spotifyToken } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Loading...</h2>
            <p className="text-sm text-gray-400">Please wait while we verify your session.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !spotifyToken) {
    console.log('Not authenticated or no Spotify token, redirecting to login');
    // Redirect to login but save the attempted location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
} 