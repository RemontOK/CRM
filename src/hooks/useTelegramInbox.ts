import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  bindTelegramInboxPolling,
  getTelegramInboxUnread,
  isTelegramItemUnread,
  markTelegramInboxRead,
  refreshTelegramInbox,
  subscribeTelegramInbox,
  TelegramInboxPollTier,
  getTelegramInboxSnapshot,
} from '../services/telegramInboxStore';
import { TelegramInboxItem, TelegramInboxReadPayload } from '../types';

export type { TelegramInboxPollTier };
export { TELEGRAM_INBOX_UPDATED_EVENT, isTelegramItemUnread } from '../services/telegramInboxStore';

interface UseTelegramInboxOptions {
  enabled?: boolean;
  pollTier?: TelegramInboxPollTier;
  onNewMessages?: (items: TelegramInboxItem[]) => void;
}

export const useTelegramInbox = (options: UseTelegramInboxOptions = {}) => {
  const { enabled = true, pollTier = 'idle', onNewMessages } = options;
  const inbox = useSyncExternalStore(subscribeTelegramInbox, getTelegramInboxSnapshot, () => []);
  const lastKnownIdsRef = useRef<Set<string>>(new Set());
  const isFirstPollRef = useRef(true);
  const onNewMessagesRef = useRef(onNewMessages);
  onNewMessagesRef.current = onNewMessages;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    return bindTelegramInboxPolling({ enabled: true, pollTier });
  }, [enabled, pollTier]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const inboundNew = inbox.filter(
      (item) =>
        item.direction !== 'outbound' &&
        !lastKnownIdsRef.current.has(item.id) &&
        isTelegramItemUnread(item)
    );
    if (!isFirstPollRef.current && inboundNew.length > 0) {
      onNewMessagesRef.current?.(inboundNew);
    }
    lastKnownIdsRef.current = new Set(inbox.map((item) => item.id));
    isFirstPollRef.current = false;
  }, [enabled, inbox]);

  const unreadTelegramMessages = useMemo(() => getTelegramInboxUnread(), [inbox]);

  const markTelegramInboxSeen = useCallback((criteria: TelegramInboxReadPayload | string | string[]) => {
    void markTelegramInboxRead(criteria);
  }, []);

  const refreshInbox = useCallback(async () => {
    await refreshTelegramInbox();
  }, []);

  return {
    telegramInbox: inbox,
    unreadTelegramMessages,
    markTelegramInboxSeen,
    refreshInbox,
  };
};
