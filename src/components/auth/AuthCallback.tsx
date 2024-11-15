import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const state = params.get('state');
          
          // Verify state to prevent CSRF attacks
          const storedState = localStorage.getItem('spotify_auth_state');
          
          if (state !== storedState) {
            throw new Error('State mismatch');
          }
          
          if (accessToken) {
            localStorage.setItem('spotify_access_token', accessToken);
            localStorage.removeItem('spotify_auth_state');
            
            // Verify token works by making a test API call
            const response = await fetch('https://api.spotify.com/v1/me', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            if (!response.ok) {
              throw new Error('Token verification failed');
            }
            
            navigate('/', { replace: true });
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        // If anything fails, redirect to login
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Connecting to Spotify...</p>
      </div>
    </div>
  );
}; 