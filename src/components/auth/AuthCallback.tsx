import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the hash fragment from the URL
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');

      if (accessToken) {
        // Store the token
        localStorage.setItem('spotify_access_token', accessToken);
        // Verify the token and update auth state
        await checkAuth();
        // Redirect to dashboard
        navigate('/', { replace: true });
      } else {
        // If no token, redirect to landing
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, checkAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );
} 