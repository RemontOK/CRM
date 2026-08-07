import { apiService, getApiErrorMessage } from './api';
import { TelegramInboxItem, TelegramInboxReadPayload, TelegramInboxStatus } from '../types';

export interface TelegramConnectResult {
  id: number;
  username: string;
  firstName?: string;
  webhookUrl?: string;
}

export interface TelegramSendResult {
  order?: import('../types').Order;
  message?: string;
  chatId?: string;
}

class TelegramService {
  async connect(botToken: string): Promise<TelegramConnectResult> {
    return apiService.post<TelegramConnectResult>('/integrations/telegram/connect', { botToken });
  }

  async disconnect(): Promise<{ success: boolean }> {
    return apiService.post('/integrations/telegram/disconnect', {});
  }

  async test(chatId: string, message?: string): Promise<{ success?: boolean; message?: string }> {
    return apiService.post('/integrations/telegram/test', { chatId, message });
  }

  async sendCustomTelegram(orderId: string, message: string): Promise<TelegramSendResult> {
    return apiService.post('/integrations/telegram/send-custom', { orderId, message });
  }

  async getInbox(): Promise<TelegramInboxItem[]> {
    return apiService.get<TelegramInboxItem[]>('/integrations/telegram/inbox');
  }

  async getInboxStatus(): Promise<TelegramInboxStatus> {
    return apiService.get<TelegramInboxStatus>('/integrations/telegram/inbox/status');
  }

  async markInboxRead(payload: TelegramInboxReadPayload): Promise<{ updated: number }> {
    return apiService.post('/integrations/telegram/inbox/read', payload);
  }

  async sendToChat(chatId: string, message: string): Promise<{ message?: string; chatId?: string }> {
    return apiService.post('/integrations/telegram/send-to-chat', { chatId, message });
  }

  getErrorMessage(error: unknown, fallback: string): string {
    return getApiErrorMessage(error, fallback);
  }
}

export const telegramService = new TelegramService();
