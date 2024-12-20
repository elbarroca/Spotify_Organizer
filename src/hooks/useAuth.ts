import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { restoreSession, redirectToLogin } from '@/lib/auth/appwrite';

export const useAuth = () => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await restoreSession();
        setUser(session);
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (redirectUrl?: string) => {
    redirectToLogin('spotify');
  };

  return {
    user,
    loading,
    login,
    isAuthenticated: !!user,
  };
};

export default useAuth;
