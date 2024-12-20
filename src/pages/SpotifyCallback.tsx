import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Account, Databases, Query } from 'appwrite';
import { appwriteConfig } from '@/config/appwrite';
import { toast } from 'sonner';
import { SpotifyUser } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { secureStorage, exchangeCodeForTokens, verifyState } from '@/lib/auth/spotify';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRES_AT: 'spotify_token_expires_at',
  USER_ID: 'spotify_user_id',
  AUTH_STATE: 'spotify_auth_state'
} as const;

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Initializing authentication...');
  const isProcessingRef = useRef(false);
  const tokensRef = useRef<{ accessToken: string; refreshToken: string; expiresAt: string } | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      if (isProcessingRef.current) {
        console.log('Callback processing already in progress');
        return;
      }

      try {
        isProcessingRef.current = true;
        console.log('Starting callback processing...');
        
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        console.log('Callback parameters:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          state: state?.substring(0, 10) + '...'
        });

        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!state) {
          throw new Error('No state parameter received');
        }

        // Step 1: Verify state
        setStatus('Verifying security state...');
        console.log('Verifying state parameter...');
        const isStateValid = verifyState(state);
        
        if (!isStateValid) {
          console.error('State verification failed');
          throw new Error('Security verification failed. Please try logging in again.');
        }
        
        console.log('State verification successful');

        // Step 2: Exchange code for tokens
        setStatus('Exchanging authorization code...');
        console.log('Exchanging code for tokens...');
        const tokens = await exchangeCodeForTokens(code);
        console.log('Token exchange successful');

        // Store tokens in ref to prevent loss during state updates
        tokensRef.current = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        };

        // Step 3: Store tokens
        setStatus('Storing tokens...');
        console.log('Storing tokens in secure storage...');
        secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        secureStorage.setItem(
          STORAGE_KEYS.EXPIRES_AT,
          tokensRef.current.expiresAt
        );
        console.log('Tokens stored successfully');

        // Step 4: Update auth context
        setStatus('Updating authentication...');
        console.log('Refreshing auth context...');
        await refreshAuth();
        console.log('Auth context updated');

        // Step 5: Fetch user profile using stored tokens
        setStatus('Fetching user profile...');
        console.log('Fetching Spotify profile...');
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${tokensRef.current.accessToken}`
          }
        });

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const profileData = await profileResponse.json();
        console.log('Profile fetch successful');

        // Store user ID
        secureStorage.setItem(STORAGE_KEYS.USER_ID, profileData.id);

        // Step 6: Store user data
        setStatus('Storing user data...');
        console.log('Initializing Appwrite client...');
        const client = new Client()
          .setEndpoint(appwriteConfig.endpoint)
          .setProject(appwriteConfig.projectId);
        
        const account = new Account(client);
        const databases = new Databases(client);

        try {
          await account.get();
        } catch {
          console.log('Creating anonymous session...');
          await account.createAnonymousSession();
        }

        const currentUser = await account.get();
        console.log('Got Appwrite user');

        const userDocs = await databases.listDocuments<SpotifyUser>(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [Query.equal('spotifyId', profileData.id)]
        );

        const userData = {
          userId: currentUser.$id,
          spotifyId: profileData.id,
          name: profileData.display_name || '',
          email: profileData.email,
          spotifyUri: profileData.uri,
          spotifyUrl: profileData.external_urls?.spotify,
          spotifyAccessToken: tokensRef.current.accessToken,
          spotifyRefreshToken: tokensRef.current.refreshToken,
          spotifyTokenExpiresAt: tokensRef.current.expiresAt,
          updatedAt: new Date().toISOString()
        };

        if (userDocs.documents.length > 0) {
          console.log('Updating existing user document...');
          await databases.updateDocument<SpotifyUser>(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            userDocs.documents[0].$id,
            userData
          );
        } else {
          console.log('Creating new user document...');
          await databases.createDocument<SpotifyUser>(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            'unique()',
            {
              ...userData,
              createdAt: new Date().toISOString()
            }
          );
        }
        console.log('User data stored successfully');

        // Step 7: Final auth refresh and navigation
        await refreshAuth();
        console.log('Authentication complete, navigating to dashboard...');
        toast.success('Successfully authenticated!');
        navigate('/dashboard');
      } catch (err) {
        console.error('Authentication callback failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);

        // Only clear tokens if we don't have valid ones in the ref
        if (!tokensRef.current) {
          console.log('Cleaning up stored data due to error...');
          Object.values(STORAGE_KEYS).forEach(key => {
            secureStorage.removeItem(key);
          });
        }

        toast.error('Authentication failed', {
          description: errorMessage
        });

        console.log('Redirecting to home page...');
        setTimeout(() => navigate('/'), 3000);
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleCallback();
  }, [navigate, refreshAuth]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg mb-4">{error}</div>
          <p className="text-gray-400">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{status}</p>
      </div>
    </div>
  );
}