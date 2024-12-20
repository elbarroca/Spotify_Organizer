import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { exchangeCodeForTokens, verifyState, storeSpotifyUserData, secureStorage } from '@/lib/auth/spotify';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRES_AT: 'spotify_token_expires_at'
} as const;

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        console.log('Auth callback initiated', {
          hasCode: !!code,
          hasError: !!error,
          hasState: !!state
        });

        if (error) {
          console.error('Authentication error from Spotify:', error);
          toast.error('Authentication Failed', {
            description: 'Spotify authentication was denied or failed.'
          });
          setError('Authentication was denied or failed');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          toast.error('Authentication Failed', {
            description: 'No authorization code received from Spotify.'
          });
          setError('No authorization code received');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Verify the state parameter
        if (!verifyState(state)) {
          console.error('State verification failed');
          toast.error('Authentication Failed', {
            description: 'Security verification failed. Please try again.'
          });
          setError('Security verification failed');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        setStatus('Exchanging code for access tokens...');
        console.log('Exchanging authorization code for tokens...');
        
        // Exchange the code for tokens
        const tokens = await exchangeCodeForTokens(code);
        if (!tokens) {
          throw new Error('No tokens received from Spotify');
        }

        console.log('Successfully received tokens');
        
        // Store tokens securely
        secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        secureStorage.setItem(
          STORAGE_KEYS.EXPIRES_AT,
          new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        );

        setStatus('Storing user data...');
        console.log('Storing user data in Appwrite...');
        
        try {
          // Store user data in Appwrite
          await storeSpotifyUserData(tokens.accessToken);
          console.log('Successfully stored user data');
        } catch (error) {
          console.error('Failed to store user data:', error);
          // Continue with authentication even if storing user data fails
          // We'll try again on the next auth check
        }

        setStatus('Verifying authentication...');
        console.log('Refreshing authentication state...');
        
        // Wait for the auth context to update with the new session
        await refreshAuth();
        
        // Add a small delay to ensure everything is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Authentication successful');
        toast.success('Successfully Logged In', {
          description: 'Welcome to Spotify Organizer!'
        });
        navigate('/dashboard');
      } catch (error) {
        console.error('Authentication error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate';
        setError(errorMessage);
        toast.error('Authentication Failed', {
          description: errorMessage
        });
        
        // Clear any partial authentication state
        Object.values(STORAGE_KEYS).forEach(key => {
          secureStorage.removeItem(key);
        });
        
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshAuth]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 border border-red-500/20">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Authentication Failed</h2>
              <p className="text-red-400 mb-4">{error}</p>
              <p className="text-sm text-gray-400">Redirecting to home page...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 border border-emerald-500/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Authenticating...</h2>
            <p className="text-sm text-gray-400">{status}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 