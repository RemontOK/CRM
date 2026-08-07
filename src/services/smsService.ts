import { AppSettings, Order } from '../types';
import { apiService, getApiErrorMessage } from './api';

export interface SmsSendResult {
  success: boolean;
  skipped?: boolean;
  message: string;
  smsText?: string;
  phone?: string;
}

const legacyStatusKeyMap: Record<string, string> = {
  waiting_parts: 'waitingParts',
  waiting_client: 'waitingClient',
  in_progress: 'inProgress',
};

const isSmsTriggerEnabled = (settings: AppSettings, status: Order['status']) => {
  const triggers = settings.notifications.smsStatusTriggers || {};
  const legacyKey = legacyStatusKeyMap[status];
  return Boolean(triggers[status] || (legacyKey ? triggers[legacyKey] : false));
};

class SmsService {
  async testConnection(phone: string): Promise<SmsSendResult> {
    try {
      const result = await apiService.post<{ message?: string }>('/integrations/sms/test', { phone });
      return { success: true, message: result?.message || 'Тестовая SMS отправлена' };
    } catch (error) {
      return { success: false, message: getApiErrorMessage(error, 'Не удалось отправить тестовую SMS') };
    }
  }

  async sendStatusSms(order: Order, settings: AppSettings, debt: number): Promise<SmsSendResult> {
    if (!settings.notifications.smsNotifications) {
      return { success: false, skipped: true, message: 'SMS-уведомления отключены в настройках' };
    }

    if (!isSmsTriggerEnabled(settings, order.status)) {
      return { success: false, skipped: true, message: 'SMS для этого статуса отключены' };
    }

    if (settings.integrations.smsProvider === 'none' || !settings.integrations.smsConnected) {
      return { success: false, skipped: true, message: 'SMS-провайдер не подключен' };
    }

    if (!order.clientPhone) {
      return { success: false, skipped: true, message: 'У клиента не указан телефон' };
    }

    try {
      const result = await apiService.post<SmsSendResult>('/integrations/sms/send', {
        order,
        debt,
      });
      return {
        success: Boolean(result?.success),
        skipped: Boolean(result?.skipped),
        message: result?.message || 'SMS отправлена',
        smsText: result?.smsText,
        phone: result?.phone,
      };
    } catch (error) {
      return { success: false, message: getApiErrorMessage(error, 'Не удалось отправить SMS') };
    }
  }

  async sendReadyStatusSms(order: Order, settings: AppSettings, debt: number): Promise<SmsSendResult> {
    return this.sendStatusSms(order, settings, debt);
  }

  async sendCustomSms(orderId: string, message: string): Promise<{ order?: Order; smsText?: string; phone?: string }> {
    return apiService.post('/integrations/sms/send-custom', { orderId, message });
  }
}

export const smsService = new SmsService();
