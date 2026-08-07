import { telegramService } from './telegramService';
import { TelegramInboxItem, TelegramInboxReadPayload, TelegramInboxStatus } from '../types';

export type TelegramInboxPollTier = 'active' | 'idle';

const POLL_BASE_MS: Record<TelegramInboxPollTier, { visible: number; hidden: number }> = {
  active: { visible: 10_000, hidden: 60_000 },
  idle: { visible: 45_000, hidden: 120_000 },
};

const POLL_MAX_MS: Record<TelegramInboxPollTier, number> = {
  active: 30_000,
  idle: 120_000,
};

export const TELEGRAM_INBOX_UPDATED_EVENT = 'crm:telegram-inbox-updated';

type Listener = () => void;

let inbox: TelegramInboxItem[] = [];
let status: TelegramInboxStatus | null = null;
let statusApiSupported = true;
let tierRefs = 0;
let activeTierRefs = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollInFlight = false;
let stablePolls = 0;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TELEGRAM_INBOX_UPDATED_EVENT, { detail: { items: inbox } }));
  }
};

export const isTelegramItemUnread = (item: TelegramInboxItem): boolean =>
  item.direction !== 'outbound' && !item.readAt;

export const getTelegramInboxSnapshot = () => inbox;

export const getTelegramInboxUnread = () => inbox.filter(isTelegramItemUnread);

export const subscribeTelegramInbox = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const deriveStatusFromList = (list: TelegramInboxItem[]): TelegramInboxStatus => {
  const latest = [...list].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];

  return {
    latestId: latest?.id ?? '',
    latestAt: latest?.createdAt ?? null,
    unreadCount: list.filter(isTelegramItemUnread).length,
  };
};

const normalizeReadPayload = (
  criteria: TelegramInboxReadPayload | string | string[]
): TelegramInboxReadPayload => {
  if (typeof criteria === 'string') {
    return { ids: [criteria] };
  }
  if (Array.isArray(criteria)) {
    return { ids: criteria };
  }
  return criteria;
};

const matchesReadCriteria = (item: TelegramInboxItem, payload: TelegramInboxReadPayload): boolean => {
  if (payload.markAll) {
    return isTelegramItemUnread(item);
  }

  if (payload.ids?.includes(item.id)) {
    return true;
  }
  if (payload.orderId && item.orderId === payload.orderId) {
    return true;
  }
  if (payload.chatId && item.chatId === payload.chatId) {
    return true;
  }
  if (payload.clientId && item.clientId === payload.clientId) {
    return true;
  }
  if (payload.phone) {
    const left = payload.phone.replace(/\D/g, '').slice(-10);
    const right = (item.clientPhone || '').replace(/\D/g, '').slice(-10);
    if (left.length >= 10 && left === right) {
      return true;
    }
  }
  return false;
};

const effectiveTier = (): TelegramInboxPollTier => (activeTierRefs > 0 ? 'active' : 'idle');

const getDelayMs = () => {
  const tier = effectiveTier();
  const base = document.hidden ? POLL_BASE_MS[tier].hidden : POLL_BASE_MS[tier].visible;
  const max = POLL_MAX_MS[tier];
  if (stablePolls >= 3) {
    return Math.min(max, Math.round(base * Math.pow(1.4, Math.min(stablePolls - 2, 4))));
  }
  return base;
};

const schedulePoll = (delayMs?: number) => {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
  if (tierRefs <= 0) {
    return;
  }
  pollTimer = setTimeout(() => {
    void runPoll();
  }, delayMs ?? getDelayMs());
};

const applyInbox = (list: TelegramInboxItem[], nextStatus?: TelegramInboxStatus | null) => {
  const prevLatestId = status?.latestId ?? '';
  const prevUnread = status?.unreadCount ?? -1;
  const prevLength = inbox.length;
  inbox = list;
  status = nextStatus ?? deriveStatusFromList(list);
  const changed =
    prevLatestId !== status.latestId ||
    prevUnread !== status.unreadCount ||
    list.length !== prevLength;
  stablePolls = changed ? 0 : stablePolls + 1;
  notify();
};

const fetchInboxSnapshot = async (): Promise<{ list: TelegramInboxItem[]; status: TelegramInboxStatus }> => {
  if (statusApiSupported) {
    try {
      const nextStatus = await telegramService.getInboxStatus();
      const unchanged =
        status &&
        nextStatus.latestId === status.latestId &&
        nextStatus.unreadCount === status.unreadCount;
      if (unchanged && inbox.length > 0) {
        return { list: inbox, status: nextStatus };
      }
      const list = await telegramService.getInbox();
      return { list: Array.isArray(list) ? list : [], status: nextStatus };
    } catch {
      statusApiSupported = false;
    }
  }

  const list = await telegramService.getInbox();
  const normalized = Array.isArray(list) ? list : [];
  return { list: normalized, status: deriveStatusFromList(normalized) };
};

const runPoll = async () => {
  if (tierRefs <= 0 || pollInFlight) {
    schedulePoll();
    return;
  }
  pollInFlight = true;
  try {
    const snapshot = await fetchInboxSnapshot();
    applyInbox(snapshot.list, snapshot.status);
  } catch {
    stablePolls = 0;
  } finally {
    pollInFlight = false;
    schedulePoll();
  }
};

export const refreshTelegramInbox = async () => {
  if (tierRefs <= 0) {
    return;
  }
  try {
    const snapshot = await fetchInboxSnapshot();
    applyInbox(snapshot.list, snapshot.status);
  } catch {
    // ignore
  }
};

export const markTelegramInboxRead = async (
  criteria: TelegramInboxReadPayload | string | string[]
) => {
  const payload = normalizeReadPayload(criteria);
  const hasTarget =
    payload.markAll ||
    (payload.ids?.length ?? 0) > 0 ||
    Boolean(payload.orderId || payload.chatId || payload.clientId || payload.phone);
  if (!hasTarget) {
    return;
  }

  const readAt = new Date().toISOString();
  inbox = inbox.map((item) =>
    matchesReadCriteria(item, payload) ? { ...item, readAt: item.readAt || readAt } : item
  );
  status = deriveStatusFromList(inbox);
  notify();

  try {
    await telegramService.markInboxRead(payload);
    await refreshTelegramInbox();
  } catch {
    await refreshTelegramInbox();
  }
};

export const bindTelegramInboxPolling = (options: {
  enabled: boolean;
  pollTier?: TelegramInboxPollTier;
}) => {
  if (!options.enabled) {
    return () => undefined;
  }

  tierRefs += 1;
  if ((options.pollTier ?? 'idle') === 'active') {
    activeTierRefs += 1;
    stablePolls = 0;
  }

  void refreshTelegramInbox();
  schedulePoll(500);

  const handleVisibility = () => {
    stablePolls = 0;
    if (!document.hidden) {
      void refreshTelegramInbox();
    }
    schedulePoll(300);
  };

  const handleFocus = () => {
    stablePolls = 0;
    void refreshTelegramInbox();
    schedulePoll(300);
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);

  return () => {
    tierRefs = Math.max(0, tierRefs - 1);
    if ((options.pollTier ?? 'idle') === 'active') {
      activeTierRefs = Math.max(0, activeTierRefs - 1);
    }
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', handleFocus);
    if (tierRefs <= 0) {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      inbox = [];
      status = null;
      stablePolls = 0;
      notify();
    } else {
      schedulePoll(300);
    }
  };
};
