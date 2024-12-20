import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForTokens } from '@/lib/auth/spotify';
import { toast } from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const storedState = localStorage.getItem('spotify_auth_state');
        const error = searchParams.get('error');

        if (error) {
          console.error('Spotify auth error:', error);
          setError('Authentication failed: ' + error);
          toast.error('Authentication failed');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        if (!code) {
          console.error('No code received from Spotify');
          setError('No authorization code received');
          toast.error('Authentication failed');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        if (state !== storedState) {
          console.error('State mismatch', { state, storedState });
          setError('State verification failed');
          toast.error('Authentication failed');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        console.log('Exchanging code for tokens...');
        const tokens = await exchangeCodeForTokens(code);
        
        // Store the access token in localStorage
        localStorage.setItem('spotify_access_token', tokens.accessToken);
        
        // Clear the state
        localStorage.removeItem('spotify_auth_state');

        toast.success('Successfully authenticated!');
        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        toast.error('Authentication failed');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <div>Redirecting to home...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="mb-4">Authenticating...</div>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
} 