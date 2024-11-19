import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        const state = params.get('state');
        const storedState = localStorage.getItem('spotify_auth_state');

        if (state === null || state !== storedState) {
          console.error('State mismatch');
          navigate('/');
          return;
        }

        if (accessToken) {
          localStorage.setItem('spotify_access_token', accessToken);
          localStorage.removeItem('spotify_auth_state');
          await checkAuth();
          navigate('/dashboard');
        }
      } else {
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, checkAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="text-xl text-white">Authenticating...</div>
    </div>
  );
} 