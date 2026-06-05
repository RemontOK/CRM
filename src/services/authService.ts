import { LoginCredentials, User } from '../types';
import { apiService } from './api';

const AUTH_USER_STORAGE_KEY = 'crm_auth_user';

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

const setStoredUser = (user: User) => {
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

const isUnauthorizedError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  (error as { response?: { status?: number } }).response?.status === 401;

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const result = await apiService.postForm<{ user: User; token: string }>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });

    if (!result?.user || !result?.token) {
      throw new Error('Сервер авторизации вернул неполный ответ. Попробуйте войти еще раз.');
    }

    setStoredUser(result.user);
    return result;
  }

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    try {
      const user = await apiService.get<User>('/auth/me');
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
