import { getStoredTenantId, tenantStorageKey } from './tenantStorage';

const SEEN_BASE_KEY = 'crm_telegram_inbox_seen';

const storageKey = () => tenantStorageKey(SEEN_BASE_KEY, getStoredTenantId());

export const getTelegramConversationKey = (item: { chatId?: string; orderId?: string; id: string }): string => {
  const chatId = item.chatId?.trim();
  if (chatId) {
    return chatId;
  }
  const orderId = item.orderId?.trim();
  if (orderId) {
    return `order:${orderId}`;
  }
  return item.id;
};

export const loadSeenTelegramInboxIds = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(storageKey());
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
};

export const saveSeenTelegramInboxIds = (ids: Set<string>) => {
  sessionStorage.setItem(storageKey(), JSON.stringify([...ids]));
};

export const clearSeenTelegramInboxIds = () => {
  sessionStorage.removeItem(storageKey());
  sessionStorage.removeItem(SEEN_BASE_KEY);
};

export const markTelegramInboxItemsSeen = (ids: string[]): Set<string> => {
  const next = loadSeenTelegramInboxIds();
  ids.forEach((id) => next.add(id));
  saveSeenTelegramInboxIds(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm:telegram-inbox-seen', { detail: { ids: [...next] } }));
  }
  return next;
};
