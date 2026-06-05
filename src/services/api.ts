import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '../types';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const apiBaseUrl =
  env?.VITE_API_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

const technicalErrorTranslations: Array<[RegExp, string]> = [
  [/network error/i, 'Нет связи с сервером. Проверьте интернет и попробуйте еще раз.'],
  [/timeout|exceeded timeout/i, 'Сервер слишком долго отвечает. Попробуйте еще раз через несколько секунд.'],
  [/request failed with status code 400/i, 'Данные заполнены некорректно. Проверьте обязательные поля и попробуйте еще раз.'],
  [/request failed with status code 401/i, 'Сессия истекла. Войдите в CRM заново.'],
  [/request failed with status code 403/i, 'Недостаточно прав для этого действия. Обратитесь к администратору.'],
  [/request failed with status code 404/i, 'Нужная запись не найдена. Обновите страницу и попробуйте еще раз.'],
  [/request failed with status code 409/i, 'Такая запись уже существует или конфликтует с текущими данными.'],
  [/request failed with status code 422/i, 'Проверьте заполнение формы: часть данных не прошла проверку.'],
  [/request failed with status code 500/i, 'Ошибка сервера. Данные не сохранены, попробуйте еще раз или сообщите администратору.'],
  [/err_bad_request/i, 'Данные заполнены некорректно. Проверьте обязательные поля и попробуйте еще раз.'],
  [/err_network/i, 'Нет связи с сервером. Проверьте интернет и попробуйте еще раз.'],
];

export const getApiErrorMessage = (error: unknown, fallback = 'Не удалось выполнить действие') => {
  if (axios.isAxiosError(error)) {
    const statusMessages: Record<number, string> = {
      400: 'Данные заполнены некорректно. Проверьте обязательные поля и попробуйте еще раз.',
      401: 'Сессия истекла. Войдите в CRM заново.',
      403: 'Недостаточно прав для этого действия. Обратитесь к администратору.',
      404: 'Нужная запись не найдена. Обновите страницу и попробуйте еще раз.',
      409: 'Такая запись уже существует или конфликтует с текущими данными.',
      422: 'Проверьте заполнение формы: часть данных не прошла проверку.',
      500: 'Ошибка сервера. Данные не сохранены, попробуйте еще раз или сообщите администратору.',
    };
    const apiMessage = (error.response?.data as any)?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      const looksGarbled = /Р[ РЎ]/.test(apiMessage) || /Р.{0,2}Р.{0,2}Р/.test(apiMessage);
      if (!looksGarbled) {
        return apiMessage;
      }
    }

    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'Сервер слишком долго отвечает. Попробуйте еще раз через несколько секунд.'
        : 'Нет связи с сервером. Проверьте интернет и попробуйте еще раз.';
    }

    return statusMessages[error.response.status] || fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    const translated = technicalErrorTranslations.find(([pattern]) => pattern.test(error.message));
    return translated?.[1] || error.message;
  }

  return fallback;
};

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: apiBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401 && !String(error.config?.url || '').includes('/auth/login')) {
          localStorage.removeItem('token');
          localStorage.removeItem('crm_auth_user');
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private unwrapResponse<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
    const payload = response.data as ApiResponse<T> | T | undefined;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as ApiResponse<T>).data;
    }

    return payload as T;
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<ApiResponse<T> | T>(url, { params });
    return this.unwrapResponse<T>(response);
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<ApiResponse<T> | T>(url, data);
    return this.unwrapResponse<T>(response);
  }

  async postForm<T>(url: string, data: Record<string, string>): Promise<T> {
    const body = new URLSearchParams(data);
    const response = await this.api.post<ApiResponse<T> | T>(url, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return this.unwrapResponse<T>(response);
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<ApiResponse<T> | T>(url, data);
    return this.unwrapResponse<T>(response);
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<ApiResponse<T> | T>(url);
    return this.unwrapResponse<T>(response);
  }

  async getPaginated<T>(url: string, params?: any): Promise<PaginatedResponse<T>> {
    const response = await this.api.get<ApiResponse<PaginatedResponse<T>> | PaginatedResponse<T>>(url, { params });
    return this.unwrapResponse<PaginatedResponse<T>>(response);
  }
}

export const apiService = new ApiService();
