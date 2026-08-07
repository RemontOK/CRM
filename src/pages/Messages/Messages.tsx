import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ForumOutlined, OpenInNewOutlined, Search, SendOutlined, Telegram } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTelegramInbox } from '../../hooks/useTelegramInbox';
import { telegramService } from '../../services/telegramService';
import { orderService } from '../../services/orderService';
import { clientService } from '../../services/clientService';
import { TelegramInboxItem, Order } from '../../types';
import { getTelegramConversationKey } from '../../utils/telegramInboxSeen';
import { normalizePhoneForCompare } from '../../utils/phone';
import { pageShellSx, panelCardSx, getChatBubbleStyles } from '../../styles/ui';

interface ConversationSummary {
  key: string;
  chatId: string;
  clientName: string;
  clientPhone: string;
  orderId: string;
  orderNumber: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  messages: TelegramInboxItem[];
}

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getConversationLabel = (conversation: ConversationSummary) =>
  conversation.clientName || conversation.clientPhone || 'Telegram';

type MessageCategory = 'orders' | 'general';

const isOrderConversation = (conversation: ConversationSummary) =>
  Boolean(conversation.orderId?.trim() || conversation.orderNumber?.trim());

const getOrderTelegramChatId = (order: Order): string => {
  if (!order.clientId) {
    return '';
  }
  return clientService.getClients().find((client) => client.id === order.clientId)?.telegramChatId?.trim() || '';
};

const findOrderForConversation = (conversation: ConversationSummary, orders: Order[]): Order | undefined => {
  const linkedOrderId = conversation.messages.find((item) => item.orderId?.trim())?.orderId?.trim();
  if (linkedOrderId) {
    return orders.find((order) => order.id === linkedOrderId);
  }

  const chatId = conversation.chatId.trim();
  const phone = normalizePhoneForCompare(conversation.clientPhone || '');

  return orders.find((order) => {
    const orderChatId = getOrderTelegramChatId(order);
    if (chatId && orderChatId === chatId) {
      return true;
    }
    const orderPhone = normalizePhoneForCompare(order.clientPhone || '');
    return phone.length >= 10 && orderPhone.length >= 10 && orderPhone === phone;
  });
};

const enrichConversationsWithOrders = (
  conversations: ConversationSummary[],
  orders: Order[]
): ConversationSummary[] =>
  conversations.map((conversation) => {
    if (isOrderConversation(conversation)) {
      return conversation;
    }
    const order = findOrderForConversation(conversation, orders);
    if (!order) {
      return conversation;
    }
    return {
      ...conversation,
      orderId: order.id,
      orderNumber: order.orderNumber || conversation.orderNumber,
    };
  });

const filterConversationsByCategory = (
  conversations: ConversationSummary[],
  category: MessageCategory
) =>
  conversations.filter((conversation) =>
    category === 'orders' ? isOrderConversation(conversation) : !isOrderConversation(conversation)
  );

const countUnread = (items: ConversationSummary[]) =>
  items.reduce((total, item) => total + item.unreadCount, 0);

const matchesConversationSearch = (conversation: ConversationSummary, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if ((conversation.clientName || '').toLowerCase().includes(normalized)) {
    return true;
  }

  const orderNumbers = new Set<string>();
  if (conversation.orderNumber?.trim()) {
    orderNumbers.add(conversation.orderNumber.trim());
  }
  conversation.messages.forEach((item) => {
    if (item.orderNumber?.trim()) {
      orderNumbers.add(item.orderNumber.trim());
    }
  });

  for (const orderNumber of orderNumbers) {
    if (orderNumber.toLowerCase().includes(normalized)) {
      return true;
    }
  }

  const queryDigits = normalized.replace(/\D/g, '');
  if (queryDigits.length >= 2) {
    for (const orderNumber of orderNumbers) {
      const orderDigits = orderNumber.replace(/\D/g, '');
      if (orderDigits.includes(queryDigits) || queryDigits.includes(orderDigits)) {
        return true;
      }
    }
  }

  return false;
};

const buildConversations = (inbox: TelegramInboxItem[]): ConversationSummary[] => {
  const grouped = new Map<string, TelegramInboxItem[]>();

  inbox.forEach((item) => {
    const key = getTelegramConversationKey(item);
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  });

  return [...grouped.entries()]
    .map(([key, messages]) => {
      const sorted = [...messages].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
      const latest = sorted[sorted.length - 1];
      const sample = sorted.find((item) => item.chatId?.trim()) ?? latest;
      const chatId = sample.chatId?.trim() || (key.startsWith('order:') ? '' : key);
      const unreadCount = sorted.filter((item) => item.direction !== 'outbound' && !item.readAt).length;

      return {
        key,
        chatId,
        clientName: latest.clientName || sample.clientName,
        clientPhone: latest.clientPhone || sample.clientPhone,
        orderId: latest.orderId || sample.orderId,
        orderNumber: latest.orderNumber || sample.orderNumber,
        lastMessage: latest.message,
        lastAt: latest.createdAt,
        unreadCount,
        messages: sorted,
      };
    })
    .sort((left, right) => new Date(right.lastAt).getTime() - new Date(left.lastAt).getTime());
};

const Messages: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdParam = searchParams.get('chatId')?.trim() || '';
  const { telegramInbox, markTelegramInboxSeen, refreshInbox } = useTelegramInbox({
    pollTier: 'active',
  });
  const [orders, setOrders] = useState<Order[]>(() => orderService.getCachedOrders());
  const [selectedKey, setSelectedKey] = useState('');
  const [category, setCategory] = useState<MessageCategory>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    void orderService.getOrders().then(setOrders).catch(() => {
      setOrders(orderService.getCachedOrders());
    });
  }, []);

  const conversations = useMemo(
    () => enrichConversationsWithOrders(buildConversations(telegramInbox), orders),
    [telegramInbox, orders]
  );

  const orderConversations = useMemo(
    () => filterConversationsByCategory(conversations, 'orders'),
    [conversations]
  );

  const generalConversations = useMemo(
    () => filterConversationsByCategory(conversations, 'general'),
    [conversations]
  );

  const categoryConversations =
    category === 'orders' ? orderConversations : generalConversations;

  const visibleConversations = useMemo(
    () => categoryConversations.filter((conversation) => matchesConversationSearch(conversation, searchQuery)),
    [categoryConversations, searchQuery]
  );

  const orderUnreadCount = useMemo(() => countUnread(orderConversations), [orderConversations]);
  const generalUnreadCount = useMemo(() => countUnread(generalConversations), [generalConversations]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.key === selectedKey) ?? null,
    [conversations, selectedKey]
  );

  useEffect(() => {
    if (visibleConversations.length === 0) {
      setSelectedKey('');
      return;
    }

    if (chatIdParam) {
      const match =
        visibleConversations.find(
          (item) => item.chatId === chatIdParam || item.key === chatIdParam
        ) ?? conversations.find((item) => item.chatId === chatIdParam || item.key === chatIdParam);
      if (match) {
        if (match.key !== selectedKey) {
          setSelectedKey(match.key);
        }
        const nextCategory = isOrderConversation(match) ? 'orders' : 'general';
        if (nextCategory !== category) {
          setCategory(nextCategory);
        }
      }
      return;
    }

    if (!selectedKey || !visibleConversations.some((item) => item.key === selectedKey)) {
      setSelectedKey(visibleConversations[0].key);
    }
  }, [category, chatIdParam, conversations, selectedKey, visibleConversations]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }
    const unreadIds = selectedConversation.messages
      .filter((item) => item.direction !== 'outbound' && !item.readAt)
      .map((item) => item.id);
    if (unreadIds.length > 0) {
      markTelegramInboxSeen({
        ids: unreadIds,
        orderId: selectedConversation.orderId,
        chatId: selectedConversation.chatId,
        phone: selectedConversation.clientPhone,
      });
    }
  }, [markTelegramInboxSeen, selectedConversation]);

  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedKey(conversation.key);
    if (conversation.chatId) {
      setSearchParams({ chatId: conversation.chatId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    const chatId = selectedConversation?.chatId?.trim();
    if (!text || !chatId) {
      return;
    }

    setIsSending(true);
    try {
      await telegramService.sendToChat(chatId, text);
      setReplyText('');
      await refreshInbox();
      toast.success('Сообщение отправлено');
    } catch (error) {
      toast.error(telegramService.getErrorMessage(error, 'Не удалось отправить сообщение'));
    } finally {
      setIsSending(false);
    }
  };

  const canReply = Boolean(selectedConversation?.chatId?.trim());

  return (
    <Box sx={pageShellSx}>
      <Box>
        <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em">
          Сообщения
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Telegram-переписка с клиентами, в том числе без активных заказов
        </Typography>
      </Box>

      <Paper sx={{ ...panelCardSx, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, minHeight: 560 }}>
        <Box sx={{ borderRight: { md: '1px solid' }, borderColor: { md: 'divider' } }}>
          <Tabs
            value={category}
            onChange={(_, value: MessageCategory) => {
              setCategory(value);
              setSelectedKey('');
              setSearchParams({}, { replace: true });
            }}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
          >
            <Tab
              value="orders"
              label={
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <span>По заказам</span>
                  {orderUnreadCount > 0 ? (
                    <Badge badgeContent={orderUnreadCount} color="error" max={99} />
                  ) : null}
                </Stack>
              }
              sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              value="general"
              label={
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <span>Без заказа</span>
                  {generalUnreadCount > 0 ? (
                    <Badge badgeContent={generalUnreadCount} color="error" max={99} />
                  ) : null}
                </Stack>
              }
              sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>

          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Поиск по ФИО или номеру заказа"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {categoryConversations.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ p: 4, minHeight: 240, color: 'text.secondary' }}>
              <ForumOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" textAlign="center">
                {category === 'orders'
                  ? 'Сообщений по заказам пока нет'
                  : 'Сообщений без заказа пока нет'}
              </Typography>
            </Stack>
          ) : visibleConversations.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ p: 4, minHeight: 240, color: 'text.secondary' }}>
              <Search sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" textAlign="center">
                Ничего не найдено по запросу «{searchQuery.trim()}»
              </Typography>
            </Stack>
          ) : (
            <List disablePadding sx={{ maxHeight: 460, overflow: 'auto' }}>
              {visibleConversations.map((conversation) => {
                const isActive = conversation.key === selectedKey;
                return (
                  <ListItemButton
                    key={conversation.key}
                    selected={isActive}
                    onClick={() => handleSelectConversation(conversation)}
                    sx={{ alignItems: 'flex-start', py: 1.5 }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                          <Typography fontWeight={700} noWrap>
                            {getConversationLabel(conversation)}
                          </Typography>
                          {conversation.unreadCount > 0 ? (
                            <Badge badgeContent={conversation.unreadCount} color="error" />
                          ) : null}
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {formatMessageTime(conversation.lastAt)}
                            {conversation.orderNumber ? ` · ${conversation.orderNumber}` : ''}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {conversation.lastMessage}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 560 }}>
          {selectedConversation ? (
            <>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Telegram sx={{ color: '#3390ec' }} />
                      <Typography fontWeight={800}>{getConversationLabel(selectedConversation)}</Typography>
                    </Stack>
                    {selectedConversation.clientPhone ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {selectedConversation.clientPhone}
                      </Typography>
                    ) : null}
                  </Box>
                  {selectedConversation.orderId ? (
                    <Button
                      size="small"
                      component={RouterLink}
                      to={`/orders?orderId=${encodeURIComponent(selectedConversation.orderId)}`}
                      endIcon={<OpenInNewOutlined />}
                    >
                      Заказ {selectedConversation.orderNumber || selectedConversation.orderId}
                    </Button>
                  ) : null}
                </Stack>
              </Box>

              <Box sx={{ p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {selectedConversation.messages.map((item) => {
                  const isOutbound = item.direction === 'outbound';
                  const bubbleStyle = getChatBubbleStyles(theme, {
                    inbound: !isOutbound,
                    channel: 'telegram',
                  });
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                        maxWidth: '78%',
                        px: 1.75,
                        py: 1.25,
                        borderRadius: 2.5,
                        bgcolor: bubbleStyle.bgcolor,
                        color: bubbleStyle.color,
                        boxShadow: bubbleStyle.boxShadow,
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'inherit' }}>
                        {item.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          color: bubbleStyle.timestampColor,
                          textAlign: isOutbound ? 'right' : 'left',
                        }}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Divider />

              <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  placeholder={canReply ? 'Напишите ответ…' : 'Нет chat_id для ответа'}
                  value={replyText}
                  disabled={!canReply || isSending}
                  onChange={(event) => setReplyText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendReply();
                    }
                  }}
                />
                <IconButton
                  color="primary"
                  disabled={!canReply || isSending || replyText.trim() === ''}
                  onClick={() => void handleSendReply()}
                >
                  {isSending ? <CircularProgress size={22} /> : <SendOutlined />}
                </IconButton>
              </Box>
            </>
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ p: 4, color: 'text.secondary' }}>
              <Typography variant="body2">Выберите переписку слева</Typography>
            </Stack>
          )}
        </Box>
      </Paper>

      {!canReply && selectedConversation ? (
        <Typography variant="caption" color="text.secondary">
          Для этого диалога нет chat_id.{' '}
          {selectedConversation.orderId ? (
            <Link component={RouterLink} to={`/orders?orderId=${encodeURIComponent(selectedConversation.orderId)}`}>
              Откройте заказ
            </Link>
          ) : (
            'Ответ возможен только для Telegram-чатов.'
          )}
        </Typography>
      ) : null}
    </Box>
  );
};

export default Messages;
