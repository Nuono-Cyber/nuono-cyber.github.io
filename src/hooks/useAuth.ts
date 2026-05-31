import { useState, useEffect } from 'react';
import { api, AppUser, UserRole } from '@/lib/api';
export type { UserRole };
import { logActivity } from '@/utils/activityLogger';

type SignInResult = {
  error: any;
  requiresPasswordChange?: boolean;
  resetPath?: string;
  resetToken?: string;
};

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
      if (response.requiresPasswordChange) {
        api.clearToken();
        return {
          error: null,
          requiresPasswordChange: true,
          resetPath: response.resetPath,
          resetToken: response.resetToken,
        } as SignInResult;
      }

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
      return { error: null } as SignInResult;
    } catch (error: any) {
      return { error } as SignInResult;
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

  const resetPassword = async (email: string) => {
    try {
      await api.auth.requestReset({ corporateEmail: email });
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
