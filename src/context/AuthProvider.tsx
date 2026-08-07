import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, LoginCredentials, RegisterCredentials, RegisterResponse } from '../types';
import { authService } from '../services/authService';
import { platformService } from '../services/platformService';
import { resetSessionData, refreshSessionData } from '../services/sessionCache';
import { prepareSessionForTenant } from '../utils/tenantStorage';
import { getResolvedTenant, SUBSCRIPTION_BLOCKED_EVENT } from '../utils/tenantAccess';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<RegisterResponse>;
  completeOAuthLogin: (user: User, token: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = await authService.getCurrentUser();
          prepareSessionForTenant(userData.tenantId ?? null);
          await refreshSessionData();
          setUser({
            ...userData,
            tenant: getResolvedTenant(userData.tenant),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'Session expired' || message === 'No token found') {
          localStorage.removeItem('token');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      setIsLoading(true);
      setError(null);
      resetSessionData();
      const { user: userData, token } = await authService.login(credentials);
      localStorage.setItem('token', token);
      prepareSessionForTenant(userData.tenantId ?? null);
      await refreshSessionData();
      setUser({
        ...userData,
        tenant: getResolvedTenant(userData.tenant),
      });
      return userData;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка входа в систему';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<RegisterResponse> => {
    try {
      setError(null);
      resetSessionData();
      return await platformService.register(credentials);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка регистрации';
      setError(message);
      throw error;
    }
  };

  const completeOAuthLogin = async (userData: User, token: string) => {
    try {
      setIsLoading(true);
      setError(null);
      resetSessionData();
      localStorage.setItem('token', token);
      authService.persistUser(userData);
      prepareSessionForTenant(userData.tenantId ?? null);
      await refreshSessionData();
      setUser({
        ...userData,
        tenant: getResolvedTenant(userData.tenant),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка входа через OAuth';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void authService.logout().finally(() => {
      localStorage.removeItem('token');
      authService.clearStoredUser();
      resetSessionData();
      setUser(null);
      setError(null);
    });
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const nextUser = { ...user, ...userData };
      if (userData.tenant) {
        nextUser.tenant = getResolvedTenant(userData.tenant);
      }
      setUser(nextUser);
      authService.persistUser(nextUser);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser({
        ...userData,
        tenant: getResolvedTenant(userData.tenant),
      });
      authService.persistUser({
        ...userData,
        tenant: getResolvedTenant(userData.tenant),
      });
    } catch {
      // keep current session user when API is slow or unavailable
    }
  }, []);

  useEffect(() => {
    if (!user?.tenantId || user.isPlatformAdmin) {
      return undefined;
    }

    const handleFocus = () => {
      void refreshUser();
    };

    const handleSubscriptionBlocked = (event: Event) => {
      const detail = (event as CustomEvent<{ tenant?: User['tenant'] }>).detail;
      if (detail?.tenant) {
        updateUser({ tenant: detail.tenant });
      } else {
        void refreshUser();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, handleSubscriptionBlocked as EventListener);
    const timer = window.setInterval(() => {
      void refreshUser();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, handleSubscriptionBlocked as EventListener);
      window.clearInterval(timer);
    };
  }, [user?.tenantId, user?.isPlatformAdmin, refreshUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    completeOAuthLogin,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
