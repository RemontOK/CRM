import toast from 'react-hot-toast';
import { appSettingsService, getOrderStatusDefinition } from '../services/appSettingsService';
import { Order, OrderCommunicationEntry } from '../types';

const getStatusLabel = (status: Order['status']) =>
  getOrderStatusDefinition(status, appSettingsService.getSettings()).label;

const isRecentCommunicationEntry = (entry: OrderCommunicationEntry, sinceMs: number) => {
  const created = new Date(entry.createdAt).getTime();
  return !Number.isNaN(created) && created >= sinceMs;
};

/** SMS-запись, добавленная сервером при смене статуса на указанный. */
export const isAutoStatusSmsEntry = (entry: OrderCommunicationEntry, status: Order['status']) => {
  if (entry.channel !== 'sms') {
    return false;
  }

  const statusLabel = getStatusLabel(status);
  return (
    entry.message.includes(`при смене статуса на «${statusLabel}»`) ||
    entry.message.includes(`Авто-SMS при смене статуса на «${statusLabel}»`)
  );
};

/**
 * Показывает toast только для SMS, реально добавленных при текущей смене статуса.
 * Не сравнивает длину history (lite-загрузка заказов отдаёт пустую history).
 */
export const notifyAutoStatusSmsToasts = (order: Order, sinceMs: number) => {
  const entries = (order.communicationHistory || []).filter(
    (entry) => isAutoStatusSmsEntry(entry, order.status) && isRecentCommunicationEntry(entry, sinceMs)
  );

  entries.forEach((entry) => {
    if (entry.message.includes('SMS отправлено')) {
      toast.success('Клиенту отправлена SMS по статусу заказа');
      return;
    }
    if (entry.message.includes('не отправлено')) {
      toast(entry.message);
    }
  });
};
