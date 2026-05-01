import { useState, useEffect } from 'react';
import { api, AppUser, UserRole } from '@/lib/api';
import { logActivity } from '@/utils/activityLogger';

interface AuthState {
  user: AppUser | null;
  session: { token: string } | null;
  role: UserRole | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isSuperAdmin: false,
  });

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    api.auth.session()
      .then(({ user }) => {
        setAuthState({
          user,
          session: { token },
          role: user.role,
          isSuperAdmin: user.role === 'super_admin',
          isLoading: false,
        });
      })
      .catch(() => {
        api.clearToken();
        setAuthState(prev => ({ ...prev, isLoading: false, user: null, session: null, role: null, isSuperAdmin: false }));
      });
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { token, user } = await api.auth.login(email, password);
      api.setToken(token);
      setAuthState({
        user,
        session: { token },
        role: user.role,
        isSuperAdmin: user.role === 'super_admin',
        isLoading: false,
      });
      await logActivity('login', { email });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Validate email domain
    if (!email.toLowerCase().endsWith('@nadenterprise.com')) {
      return { error: { message: 'Apenas emails @nadenterprise.com são permitidos' } };
    }

    try {
      await api.auth.signup({ email, password, fullName });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await logActivity('logout');
    api.clearToken();
    setAuthState({
      user: null,
      session: null,
      role: null,
      isLoading: false,
      isSuperAdmin: false,
    });
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    try {
      await api.auth.requestReset({ corporateEmail: email, personalEmail: '' });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    return { error: { message: 'Use o fluxo com token de recuperação.' } };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
}
