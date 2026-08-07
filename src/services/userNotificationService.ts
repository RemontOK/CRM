import { UserNotification } from '../types';
import { apiService } from './api';

class UserNotificationService {
  async list(): Promise<UserNotification[]> {
    const result = await apiService.get<UserNotification[] | Record<string, UserNotification>>('/auth/notifications');
    if (Array.isArray(result)) {
      return result;
    }
    if (result && typeof result === 'object') {
      return Object.values(result);
    }
    return [];
  }

  async markRead(id: number): Promise<void> {
    await apiService.post(`/auth/notifications/${id}/read`);
  }
}

export const userNotificationService = new UserNotificationService();

export const formatDatetimeLocalValue = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const datetimeLocalToApiValue = (value: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
};
