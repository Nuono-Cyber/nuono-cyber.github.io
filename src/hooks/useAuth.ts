import { useState, useEffect } from 'react';
import { api, AppUser, UserRole } from '@/lib/api';
export type { UserRole };
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
      const response = await api.auth.login(email, password);
      const { token, user } = response;
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
    void email;
    void password;
    void fullName;
    return { error: { message: 'Cadastro público desativado.' } };
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

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
}
