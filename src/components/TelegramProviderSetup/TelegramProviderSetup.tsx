import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, LinkOff, Telegram } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { AppSettings } from '../../types';
import { getApiErrorMessage } from '../../services/api';
import { telegramService } from '../../services/telegramService';
import { panelCardSx } from '../../styles/ui';

type Props = {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onSave: (next: AppSettings) => Promise<AppSettings>;
};

const TelegramProviderSetup: React.FC<Props> = ({ settings, onChange, onSave }) => {
  const [botToken, setBotToken] = useState(settings.integrations.telegramBotToken || '');
  const [testChatId, setTestChatId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const isConnected = Boolean(settings.integrations.telegramConnected);
  const botUsername = settings.integrations.telegramBotUsername?.replace(/^@/, '') || '';

  const handleConnect = async () => {
    const token = botToken.trim();
    if (!token) {
      toast.error('Укажите токен бота от @BotFather');
      return;
    }

    setIsConnecting(true);
    try {
      const result = await telegramService.connect(token);
      const nextSettings: AppSettings = {
        ...settings,
        integrations: {
          ...settings.integrations,
          telegramConnected: true,
          telegramBotToken: token,
          telegramBotUsername: result.username || '',
        },
      };
      onChange(nextSettings);
      const saved = await onSave(nextSettings);
      onChange(saved);
      toast.success(result.username ? `Telegram-бот @${result.username} подключен` : 'Telegram-бот подключен');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось подключить Telegram-бота'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await telegramService.disconnect();
      const nextSettings: AppSettings = {
        ...settings,
        integrations: {
          ...settings.integrations,
          telegramConnected: false,
          telegramBotToken: '',
          telegramBotUsername: '',
        },
      };
      onChange(nextSettings);
      const saved = await onSave(nextSettings);
      onChange(saved);
      setBotToken('');
      toast.success('Telegram-бот отключен');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отключить Telegram-бота'));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTest = async () => {
    const chatId = testChatId.trim();
    if (!chatId) {
      toast.error('Укажите chat_id для тестового сообщения');
      return;
    }
    if (chatId.startsWith('@')) {
      toast.error('Нужен ваш числовой chat_id из @userinfobot, а не @имя_бота');
      return;
    }
    if (!/^-?\d+$/.test(chatId)) {
      toast.error('Chat ID — только цифры, например 5366188895');
      return;
    }

    setIsTesting(true);
    try {
      await telegramService.test(chatId);
      toast.success('Тестовое сообщение отправлено');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить тестовое сообщение'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card sx={panelCardSx}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Подключение Telegram-бота
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Отправляйте сообщения клиентам прямо из CRM после привязки их Telegram к номеру телефона.
              </Typography>
            </Box>
            {isConnected ? (
              <Chip
                icon={<CheckCircle />}
                color="success"
                label={botUsername ? `Подключен: @${botUsername}` : 'Подключен'}
              />
            ) : (
              <Chip icon={<LinkOff />} label="Не подключен" variant="outlined" />
            )}
          </Stack>

          <Alert severity="info" icon={<Telegram />}>
            1. Создайте бота через @BotFather и скопируйте токен.
            <br />
            2. Нажмите «Подключить» — CRM настроит webhook для входящих сообщений.
            <br />
            3. Отправьте клиенту ссылку из заказа или SMS:{' '}
            <code>https://t.me/бот?start=link_9002165134</code> — клиент нажимает Start, контакт отправлять не нужно.
            <br />
            4. После привязки сообщения из карточки заказа будут уходить в Telegram автоматически.
          </Alert>

          <TextField
            fullWidth
            label="Токен бота"
            type="password"
            value={botToken}
            onChange={(event) => setBotToken(event.target.value)}
            placeholder="123456789:ABCdefGHI..."
            helperText="Получите у @BotFather. Хранится в настройках CRM."
            disabled={isConnected && !botToken}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {!isConnected ? (
              <Button variant="contained" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? 'Подключение...' : 'Подключить'}
              </Button>
            ) : (
              <>
                <Button variant="outlined" onClick={handleConnect} disabled={isConnecting || !botToken.trim()}>
                  {isConnecting ? 'Обновление...' : 'Обновить подключение'}
                </Button>
                <Button variant="text" color="error" onClick={handleDisconnect} disabled={isDisconnecting}>
                  {isDisconnecting ? 'Отключение...' : 'Отключить'}
                </Button>
              </>
            )}
          </Stack>

          {isConnected ? (
            <>
              {botUsername ? (
                <Typography variant="body2" color="text.secondary">
                  Бот:{' '}
                  <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                    @{botUsername}
                  </a>
                </Typography>
              ) : null}

              <TextField
                fullWidth
                label="Ваш chat ID для теста"
                value={testChatId}
                onChange={(event) => setTestChatId(event.target.value)}
                placeholder="5366188895"
                helperText={
                  botUsername
                    ? `1) Напишите /start боту @${botUsername}. 2) Узнайте id у @userinfobot. 3) Вставьте число сюда (не @${botUsername}).`
                    : 'Узнайте свой числовой id у @userinfobot и сначала нажмите /start у вашего бота'
                }
              />

              <Button variant="outlined" onClick={handleTest} disabled={isTesting}>
                {isTesting ? 'Отправка...' : 'Отправить тест'}
              </Button>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TelegramProviderSetup;
