import { createClient } from '@supabase/supabase-js';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabaseUrl = 'https://tkzprshzojselqsezmmy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrenByc2h6b2pzZWxxc2V6bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMTIxNzcsImV4cCI6MjA1MDg4ODE3N30.nUlIZMnTiyLSmzoWpq-PLBm_XI8L56xvQnJLFVcs7hw';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'spotify-auth-token'
  },
});

// Set up auth state change listener
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  console.log('Auth state changed:', event, session);
  if (event === 'SIGNED_IN' && session?.provider_token) {
    localStorage.setItem('spotify_access_token', session.provider_token);
    if (session.provider_refresh_token) {
      localStorage.setItem('spotify_refresh_token', session.provider_refresh_token);
    }
    const expiresAt = new Date(Date.now() + (session.expires_in || 3600) * 1000).toISOString();
    localStorage.setItem('spotify_token_expires_at', expiresAt);
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
  }
});

// Auth helper functions
export const signInWithSpotify = async () => {
  console.log('Starting Spotify OAuth flow...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'spotify',
    options: {
      redirectTo: `${window.location.origin}/callback`,
      scopes: [
        'user-read-email',
        'user-read-private',
        'playlist-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-read',
        'user-library-modify',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-recently-played'
      ].join(' ')
    }
  });

  if (error) {
    console.error('OAuth error:', error);
    throw error;
  }

  console.log('OAuth flow initiated:', data);
  return data;
};

export const signOut = async () => {
  console.log('Signing out...');
  const { error } = await supabase.auth.signOut({
    scope: 'local'
  });
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
  console.log('Successfully signed out');
  
  // Clear any stored tokens
  localStorage.removeItem('spotify-auth-token');
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
};

export const getCurrentUser = async () => {
  console.log('Getting current user...');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Get user error:', error);
    throw error;
  }
  console.log('Current user:', user);
  return user;
};

export const getSession = async () => {
  console.log('Getting session...');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    throw error;
  }
  console.log('Current session:', session);
  return session;
};

// Database helper functions
export const createOrUpdateUser = async (userData: {
  id: string;
  email: string;
  name: string;
  spotify_id?: string;
  spotify_access_token?: string;
  spotify_refresh_token?: string;
  spotify_token_expires_at?: string;
}) => {
  console.log('Creating/updating user:', userData);
  
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        spotify_id: userData.spotify_id,
        spotify_access_token: userData.spotify_access_token,
        spotify_refresh_token: userData.spotify_refresh_token,
        spotify_token_expires_at: userData.spotify_token_expires_at,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    console.error('User upsert error:', error);
    throw error;
  }
  
  console.log('User created/updated:', data);
  return data;
};

export const getUser = async (userId: string) => {
  console.log('Getting user by ID:', userId);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Get user error:', error);
    throw error;
  }
  
  console.log('User found:', data);
  return data;
}; 