import axios from 'axios';
import { LoginCredentials, User } from '../types';
import { apiService, getApiErrorMessage } from './api';

const AUTH_USER_STORAGE_KEY = 'crm_auth_user';

export class AuthError extends Error {
  code?: string;
  email?: string;

  constructor(message: string, code?: string, email?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.email = email;
  }
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const isStoredUserAdmin = (): boolean => getStoredUser()?.role === 'admin';

const setStoredUser = (user: User) => {
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

const isRetryableServerError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  [500, 502, 503, 504].includes((error as { response?: { status?: number } }).response?.status ?? 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isUnauthorizedError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  (error as { response?: { status?: number } }).response?.status === 401;

const parseAuthError = (error: unknown, fallback: string): AuthError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as {
      error?: string;
      message?: string;
      data?: { code?: string; email?: string };
    } | undefined;
    const code = responseData?.data?.code;
    const email = responseData?.data?.email;
    const message = responseData?.error || responseData?.message || getApiErrorMessage(error, fallback);
    if (code) {
      return new AuthError(message, code, email);
    }
  }

  return new AuthError(getApiErrorMessage(error, fallback));
};

class AuthService {
  persistUser(user: User) {
    setStoredUser(user);
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      const result = await apiService.post<{ user: User; token: string }>('/auth/login', {
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (!result?.user || !result?.token) {
        throw new Error('Сервер авторизации вернул неполный ответ. Попробуйте войти еще раз.');
      }

      setStoredUser(result.user);
      return result;
    } catch (error) {
      throw parseAuthError(error, 'Не удалось войти в систему');
    }
  }

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    try {
      let user: User | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          user = await apiService.get<User>('/auth/me');
          break;
        } catch (error) {
          if (attempt < 2 && isRetryableServerError(error)) {
            await sleep(400 * (attempt + 1));
            continue;
          }
          throw error;
        }
      }

      if (!user?.id) {
        throw new Error('User not found');
      }
      setStoredUser(user);
      return user;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        localStorage.removeItem('token');
        this.clearStoredUser();
        throw new Error('Session expired');
      }

      const fallbackUser = getStoredUser();
      if (fallbackUser) {
        return fallbackUser;
      }
      localStorage.removeItem('token');
      throw new Error('User not found');
    }
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      await apiService.post('/auth/logout');
    } catch {
      return;
    }
  }

  clearStoredUser() {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }
}

export const authService = new AuthService();
