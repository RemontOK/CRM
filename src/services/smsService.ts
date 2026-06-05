import { AppSettings, Order } from '../types';
import { normalizePhoneForStorage } from '../utils/phone';

export interface SmsSendResult {
  success: boolean;
  skipped?: boolean;
  message: string;
}

const buildTemplateMessage = (template: string, order: Order, settings: AppSettings, debt: number) => {
  const replacements: Record<string, string> = {
    clientName: order.clientName || 'клиент',
    orderNumber: order.orderNumber,
    companyName: settings.business.companyName,
    companyPhone: settings.business.phone,
    debt: debt.toLocaleString('ru-RU'),
    total: (order.finalCost || order.estimatedCost || 0).toLocaleString('ru-RU'),
    device: [order.deviceBrand, order.deviceModel].filter(Boolean).join(' '),
  };

  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => replacements[key.trim()] ?? '');
};

const statusToTriggerKey = (status: Order['status']) => {
  switch (status) {
    case 'diagnosis':
      return 'diagnosis';
    case 'waiting_parts':
      return 'waitingParts';
    case 'waiting_client':
      return 'waitingClient';
    case 'in_progress':
      return 'inProgress';
    case 'ready':
      return 'ready';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return null;
  }
};

class SmsService {
  async sendStatusSms(order: Order, settings: AppSettings, debt: number): Promise<SmsSendResult> {
    const triggerKey = statusToTriggerKey(order.status);
    if (!triggerKey) {
      return { success: false, skipped: true, message: 'Для этого статуса SMS не настроены' };
    }

    if (!settings.notifications.smsNotifications) {
      return { success: false, skipped: true, message: 'SMS-уведомления отключены в настройках' };
    }

    if (!settings.notifications.smsStatusTriggers?.[triggerKey]) {
      return { success: false, skipped: true, message: 'SMS для этого статуса отключены' };
    }

    if (settings.integrations.smsProvider === 'none') {
      return { success: false, skipped: true, message: 'SMS-шлюз не настроен' };
    }

    if (!order.clientPhone) {
      return { success: false, skipped: true, message: 'У клиента не указан телефон' };
    }

    if (settings.integrations.smsProvider === 'webhook') {
      const webhookUrl = settings.integrations.smsWebhookUrl.trim();
      if (!webhookUrl) {
        return { success: false, skipped: true, message: 'Не указан URL SMS webhook' };
      }

      const template =
        settings.integrations.smsStatusTemplates?.[triggerKey] ||
        settings.integrations.smsTemplateReady;
      const message = buildTemplateMessage(template, order, settings, debt);
      const payload = {
        provider: 'webhook',
        event: `order_${order.status}`,
        phone: normalizePhoneForStorage(order.clientPhone),
        message,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        sender: settings.integrations.smsSenderName,
        meta: {
          status: order.status,
          debt,
          companyName: settings.business.companyName,
        },
      };

      const method = settings.integrations.smsWebhookMethod || 'POST';
      const response =
        method === 'GET'
          ? await fetch(
              `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}payload=${encodeURIComponent(JSON.stringify(payload))}`,
              {
                method: 'GET',
                headers: settings.integrations.smsApiToken
                  ? { Authorization: `Bearer ${settings.integrations.smsApiToken}` }
                  : undefined,
              }
            )
          : await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(settings.integrations.smsApiToken
                  ? { Authorization: `Bearer ${settings.integrations.smsApiToken}` }
                  : {}),
              },
              body: JSON.stringify(payload),
            });

      if (!response.ok) {
        throw new Error(`SMS webhook ответил с кодом ${response.status}`);
      }

      return { success: true, message: 'SMS отправлена' };
    }

    return { success: false, skipped: true, message: 'Неизвестный SMS-провайдер' };
  }

  async sendReadyStatusSms(order: Order, settings: AppSettings, debt: number): Promise<SmsSendResult> {
    return this.sendStatusSms(order, settings, debt);
  }
}

export const smsService = new SmsService();
