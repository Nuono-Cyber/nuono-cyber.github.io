import { useState, useEffect } from 'react';
import { api, AppUser, UserRole, AUTH_BYPASS_ENABLED } from '@/lib/api';
import { logActivity } from '@/utils/activityLogger';

interface AuthState {
  user: AppUser | null;
  session: { token: string } | null;
  role: UserRole | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

const DEMO_USER: AppUser = {
  id: 'demo-super-admin',
  email: 'demo@nadenterprise.com',
  role: 'super_admin',
  full_name: 'Demo Admin',
  isSuperAdmin: true,
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isSuperAdmin: false,
  });

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) {
      setAuthState({
        user: DEMO_USER,
        session: { token: 'demo-session-token' },
        role: DEMO_USER.role,
        isSuperAdmin: true,
        isLoading: false,
      });
      return;
    }

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
    if (AUTH_BYPASS_ENABLED) {
      setAuthState({
        user: DEMO_USER,
        session: { token: 'demo-session-token' },
        role: DEMO_USER.role,
        isSuperAdmin: true,
        isLoading: false,
      });
      return { error: null };
    }

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
    if (AUTH_BYPASS_ENABLED) {
      return { error: null };
    }

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
    if (AUTH_BYPASS_ENABLED) {
      setAuthState({
        user: DEMO_USER,
        session: { token: 'demo-session-token' },
        role: DEMO_USER.role,
        isLoading: false,
        isSuperAdmin: true,
      });
      return { error: null };
    }

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
    if (AUTH_BYPASS_ENABLED) {
      return { error: null };
    }

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
