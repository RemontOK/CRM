import { apiService, getApiErrorMessage } from './api';

export type YandexAuthMode = 'register' | 'login';

class YandexAuthService {
  async getConfig(): Promise<{ enabled: boolean; redirectUri: string }> {
    return apiService.get<{ enabled: boolean; redirectUri: string }>('/platform/auth/yandex/config');
  }

  async start(mode: YandexAuthMode, companyName = ''): Promise<{ url: string; state: string }> {
    const params = new URLSearchParams({ mode });
    if (companyName.trim()) {
      params.set('companyName', companyName.trim());
    }

    return apiService.get<{ url: string; state: string }>(`/platform/auth/yandex/url?${params.toString()}`);
  }

  async complete(payload: {
    code: string;
    state: string;
    companyName?: string;
  }): Promise<{ user: import('../types').User; token: string }> {
    try {
      const result = await apiService.post<{ user: import('../types').User; token: string }>(
        '/platform/auth/yandex/complete',
        payload
      );

      if (!result?.user || !result?.token) {
        throw new Error('Сервер вернул неполный ответ при авторизации через Яндекс.');
      }

      return result;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Не удалось войти через Яндекс'));
    }
  }
}

export const yandexAuthService = new YandexAuthService();

export const YANDEX_AUTH_STATE_KEY = 'crm_yandex_oauth_state';
export const YANDEX_AUTH_MODE_KEY = 'crm_yandex_oauth_mode';
export const YANDEX_AUTH_COMPANY_KEY = 'crm_yandex_oauth_company';
