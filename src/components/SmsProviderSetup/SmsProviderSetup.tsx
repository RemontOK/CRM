import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { CheckCircle, HubOutlined, LinkOff, PhoneIphoneOutlined, SmsOutlined } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { AppSettings, SmsInboxItem } from '../../types';
import { apiService, getApiErrorMessage } from '../../services/api';
import {
  SMS_PROVIDERS,
  SmsProviderId,
  getSmsProviderDefinition,
} from '../../services/smsProviders';
import { panelCardSx } from '../../styles/ui';
import { crmRadius } from '../../styles/tokens';

type Props = {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onSave: (next: AppSettings) => Promise<AppSettings>;
};

const SMS_PROVIDER_VISUALS: Record<
  Exclude<SmsProviderId, 'none'>,
  { Icon: typeof SmsOutlined; accent: string; badge?: string }
> = {
  moizvonki: { Icon: PhoneIphoneOutlined, accent: '#0ea5e9', badge: 'С телефона' },
  smsru: { Icon: SmsOutlined, accent: '#f97316', badge: 'Шлюз' },
  smsc: { Icon: SmsOutlined, accent: '#22c55e', badge: 'Шлюз' },
  smsaero: { Icon: SmsOutlined, accent: '#6366f1', badge: 'Шлюз' },
  webhook: { Icon: HubOutlined, accent: '#a855f7', badge: 'Свой backend' },
};

const SmsProviderSetup: React.FC<Props> = ({ settings, onChange, onSave }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [dialogProviderId, setDialogProviderId] = useState<Exclude<SmsProviderId, 'none'> | null>(null);
  const [draftCredentials, setDraftCredentials] = useState<Record<string, string>>({});
  const [testPhone, setTestPhone] = useState(settings.business.phone || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [incomingWebhookUrl, setIncomingWebhookUrl] = useState('');
  const [isSubscribingIncoming, setIsSubscribingIncoming] = useState(false);
  const [unmatchedSms, setUnmatchedSms] = useState<SmsInboxItem[]>([]);

  const dialogProvider = dialogProviderId ? getSmsProviderDefinition(dialogProviderId) : null;
  const isMoizvonkiActive =
    settings.integrations.smsProvider === 'moizvonki' && settings.integrations.smsConnected;

  const loadIncomingSmsMeta = async () => {
    try {
      const meta = await apiService.get<{ url?: string }>('/integrations/sms/incoming-webhook');
      setIncomingWebhookUrl(meta?.url || '');
      const inbox = await apiService.get<SmsInboxItem[]>('/integrations/sms/inbox');
      setUnmatchedSms(Array.isArray(inbox) ? inbox : []);
    } catch {
      setIncomingWebhookUrl('');
      setUnmatchedSms([]);
    }
  };

  useEffect(() => {
    if (isMoizvonkiActive) {
      void loadIncomingSmsMeta();
    }
  }, [isMoizvonkiActive]);

  const handleSubscribeIncomingSms = async () => {
    setIsSubscribingIncoming(true);
    try {
      const result = await apiService.post<{ url?: string }>('/integrations/sms/incoming-webhook/subscribe', {});
      setIncomingWebhookUrl(result?.url || incomingWebhookUrl);
      toast.success('Входящие SMS подключены — ответы клиентов будут попадать в историю заказа');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось подключить приём входящих SMS'));
    } finally {
      setIsSubscribingIncoming(false);
    }
  };

  const openProviderDialog = (providerId: Exclude<SmsProviderId, 'none'>) => {
    const definition = getSmsProviderDefinition(providerId);
    if (!definition) {
      return;
    }

    const existing = settings.integrations.smsCredentials || {};
    const nextDraft: Record<string, string> = {};
    definition.fields.forEach((field) => {
      if (field.key === 'domain') {
        const legacyUrl = existing.domain || existing.webhookUrl || settings.integrations.smsWebhookUrl || '';
        nextDraft.domain = legacyUrl.replace(/^https?:\/\//i, '').replace(/\/api\/v1\/?$/i, '');
      } else if (field.key === 'apiKey' && providerId === 'moizvonki') {
        nextDraft.apiKey = existing.apiKey || existing.webhookToken || settings.integrations.smsApiToken || '';
      } else if (field.key === 'webhookUrl') {
        nextDraft.webhookUrl = existing.webhookUrl || settings.integrations.smsWebhookUrl || '';
      } else if (field.key === 'webhookToken') {
        nextDraft.webhookToken = existing.webhookToken || settings.integrations.smsApiToken || '';
      } else if (field.key === 'webhookMethod') {
        nextDraft.webhookMethod = existing.webhookMethod || settings.integrations.smsWebhookMethod || 'POST';
      } else if (field.key === 'senderName') {
        nextDraft.senderName = existing.senderName || settings.integrations.smsSenderName || '';
      } else {
        nextDraft[field.key] = existing[field.key] || '';
      }
    });

    setDraftCredentials(nextDraft);
    setDialogProviderId(providerId);
  };

  const updateDraftField = (key: string, value: string) => {
    setDraftCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const buildNextSettings = (
    providerId: Exclude<SmsProviderId, 'none'>,
    credentials: Record<string, string>,
    connected: boolean
  ): AppSettings => ({
    ...settings,
    integrations: {
      ...settings.integrations,
      smsProvider: providerId,
      smsConnected: connected,
      smsCredentials: credentials,
      smsSenderName: credentials.senderName || settings.integrations.smsSenderName,
      smsWebhookUrl: credentials.webhookUrl || settings.integrations.smsWebhookUrl,
      smsApiToken: credentials.webhookToken || settings.integrations.smsApiToken,
      smsWebhookMethod:
        credentials.webhookMethod === 'GET' || credentials.webhookMethod === 'POST'
          ? credentials.webhookMethod
          : settings.integrations.smsWebhookMethod,
    },
  });

  const validateCredentials = (providerId: Exclude<SmsProviderId, 'none'>, credentials: Record<string, string>) => {
    const definition = getSmsProviderDefinition(providerId);
    if (!definition) {
      return 'Провайдер не найден';
    }

    for (const field of definition.fields) {
      if (!field.required) {
        continue;
      }
      if (!String(credentials[field.key] || '').trim()) {
        return `Заполните поле «${field.label}»`;
      }
    }

    return '';
  };

  const handleConnect = async () => {
    if (!dialogProviderId) {
      return;
    }

    const validationError = validateCredentials(dialogProviderId, draftCredentials);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsConnecting(true);
    try {
      const nextSettings = buildNextSettings(dialogProviderId, draftCredentials, true);
      onChange(nextSettings);
      const saved = await onSave(nextSettings);
      onChange(saved);
      setDialogProviderId(null);
      toast.success('SMS-провайдер подключен');
      if (dialogProviderId === 'moizvonki') {
        try {
          await apiService.post('/integrations/sms/incoming-webhook/subscribe', {});
          toast.success('Приём входящих SMS тоже подключён');
          await loadIncomingSmsMeta();
        } catch {
          toast('Исходящие SMS работают. Для входящих нажмите «Подключить входящие SMS» ниже.', { icon: 'ℹ️' });
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить подключение'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTest = async () => {
    if (!dialogProviderId) {
      return;
    }

    const validationError = validateCredentials(dialogProviderId, draftCredentials);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!testPhone.trim()) {
      toast.error('Укажите телефон для тестовой SMS');
      return;
    }

    setIsTesting(true);
    try {
      const nextSettings = buildNextSettings(dialogProviderId, draftCredentials, settings.integrations.smsConnected);
      onChange(nextSettings);
      await onSave(nextSettings);
      await apiService.post('/integrations/sms/test', { phone: testPhone.trim() });
      toast.success('Тестовая SMS отправлена');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить тестовую SMS'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    const nextSettings: AppSettings = {
      ...settings,
      integrations: {
        ...settings.integrations,
        smsProvider: 'none',
        smsConnected: false,
      },
    };
    onChange(nextSettings);
    try {
      const saved = await onSave(nextSettings);
      onChange(saved);
      toast.success('SMS-провайдер отключен');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отключить провайдера'));
    }
  };

  const connectedLabel = useMemo(() => {
    if (!settings.integrations.smsConnected || settings.integrations.smsProvider === 'none') {
      return null;
    }
    return getSmsProviderDefinition(settings.integrations.smsProvider)?.name || settings.integrations.smsProvider;
  }, [settings.integrations.smsConnected, settings.integrations.smsProvider]);

  return (
    <>
      <Card sx={panelCardSx}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Подключение SMS
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Выберите провайдера, введите данные подключения и нажмите «Подключить».
                </Typography>
              </Box>
              {connectedLabel ? (
                <Chip icon={<CheckCircle />} color="success" label={`Подключен: ${connectedLabel}`} />
              ) : (
                <Chip icon={<LinkOff />} label="Не подключен" variant="outlined" />
              )}
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1.75,
                width: '100%',
                minWidth: 0,
              }}
            >
              {SMS_PROVIDERS.map((provider) => {
                const isActive =
                  settings.integrations.smsProvider === provider.id && settings.integrations.smsConnected;
                const isWebhook = provider.id === 'webhook';
                const visual = SMS_PROVIDER_VISUALS[provider.id];
                const ProviderIcon = visual.Icon;

                return (
                  <Card
                    key={provider.id}
                    elevation={0}
                    sx={{
                      gridColumn: isWebhook ? { xs: 'auto', sm: '1 / -1', lg: '1 / -1' } : undefined,
                      height: '100%',
                      minWidth: 0,
                      borderRadius: `${crmRadius.lg}px`,
                      border: '1px solid',
                      borderColor: isActive
                        ? alpha(theme.palette.success.main, 0.55)
                        : alpha(theme.palette.text.primary, isDark ? 0.14 : 0.1),
                      bgcolor: isActive
                        ? alpha(theme.palette.success.main, isDark ? 0.14 : 0.08)
                        : alpha(theme.palette.background.paper, isDark ? 0.72 : 1),
                      boxShadow: isActive
                        ? `0 0 0 1px ${alpha(theme.palette.success.main, 0.22)}, var(--crm-shadow-soft)`
                        : 'var(--crm-shadow-soft)',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 'var(--crm-shadow)',
                        borderColor: isActive
                          ? alpha(theme.palette.success.main, 0.65)
                          : alpha(theme.palette.primary.main, 0.42),
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => openProviderDialog(provider.id)}
                      sx={{
                        height: '100%',
                        alignItems: 'stretch',
                        borderRadius: `${crmRadius.lg}px`,
                      }}
                    >
                      <CardContent
                        sx={{
                          minWidth: 0,
                          height: '100%',
                          p: 2,
                          display: 'flex',
                          flexDirection: isWebhook ? { xs: 'column', sm: 'row' } : 'column',
                          alignItems: isWebhook ? { xs: 'flex-start', sm: 'center' } : 'flex-start',
                          gap: isWebhook ? { xs: 1.5, sm: 2 } : 1.5,
                          '&:last-child': { pb: 2 },
                        }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: `${crmRadius.md}px`,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            bgcolor: alpha(visual.accent, isDark ? 0.22 : 0.14),
                            color: visual.accent,
                          }}
                        >
                          <ProviderIcon fontSize="small" />
                        </Box>

                        <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                            <Typography fontWeight={800} sx={{ lineHeight: 1.25 }}>
                              {provider.name}
                            </Typography>
                            {visual.badge ? (
                              <Chip
                                size="small"
                                label={visual.badge}
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  bgcolor: alpha(visual.accent, isDark ? 0.18 : 0.1),
                                  color: visual.accent,
                                  border: `1px solid ${alpha(visual.accent, 0.22)}`,
                                }}
                              />
                            ) : null}
                            {isActive ? (
                              <Chip size="small" color="success" label="Активен" sx={{ height: 22, fontSize: '0.7rem' }} />
                            ) : null}
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              lineHeight: 1.45,
                              display: isWebhook ? 'block' : '-webkit-box',
                              WebkitLineClamp: isWebhook ? undefined : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: isWebhook ? 'visible' : 'hidden',
                              minHeight: isWebhook ? undefined : '2.9em',
                            }}
                          >
                            {provider.description}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>

            {connectedLabel ? (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => openProviderDialog(settings.integrations.smsProvider as Exclude<SmsProviderId, 'none'>)}
                >
                  Изменить подключение
                </Button>
                <Button variant="text" color="error" onClick={handleDisconnect}>
                  Отключить
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {isMoizvonkiActive ? (
        <Card sx={panelCardSx}>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Входящие SMS в CRM
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ответы клиентов с телефона сотрудника попадут в историю заказа по номеру телефона.
                </Typography>
              </Box>

              <Alert severity="info">
                1. В приложении «Мои Звонки» на телефоне включите запись SMS (по умолчанию выключена).
                <br />
                2. Нажмите «Подключить входящие SMS» — CRM подпишется на события у провайдера.
                <br />
                3. Ответ клиента появится в карточке заказа как «SMS от клиента».
              </Alert>

              <TextField
                fullWidth
                label="Webhook URL для Мои Звонки"
                value={incomingWebhookUrl}
                InputProps={{ readOnly: true }}
                helperText="Этот адрес CRM передаёт в Мои Звонки автоматически при подключении"
              />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  onClick={handleSubscribeIncomingSms}
                  disabled={isSubscribingIncoming}
                >
                  {isSubscribingIncoming ? 'Подключение...' : 'Подключить входящие SMS'}
                </Button>
                <Button variant="outlined" onClick={() => void loadIncomingSmsMeta()}>
                  Обновить
                </Button>
              </Stack>

              {unmatchedSms.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    SMS без найденного заказа ({unmatchedSms.length})
                  </Typography>
                  <Stack spacing={1}>
                    {unmatchedSms.slice(0, 5).map((item) => (
                      <Card key={item.id} variant="outlined">
                        <CardContent sx={{ py: 1.25 }}>
                          <Typography variant="body2" fontWeight={700}>
                            {item.phone} {item.clientName ? `• ${item.clientName}` : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {new Date(item.createdAt).toLocaleString('ru-RU')}
                          </Typography>
                          <Typography variant="body2">{item.message}</Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(dialogProvider)} onClose={() => setDialogProviderId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogProvider ? `Подключение: ${dialogProvider.name}` : 'Подключение SMS'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialogProvider?.docsUrl ? (
              <Alert severity="info">
                Документация провайдера:{' '}
                <a href={dialogProvider.docsUrl} target="_blank" rel="noreferrer">
                  {dialogProvider.docsUrl}
                </a>
              </Alert>
            ) : null}

            {dialogProvider?.fields.map((field) =>
              field.key === 'webhookMethod' ? (
                <FormControl fullWidth key={field.key}>
                  <InputLabel>Метод webhook</InputLabel>
                  <Select
                    value={draftCredentials.webhookMethod || 'POST'}
                    label="Метод webhook"
                    onChange={(event) => updateDraftField('webhookMethod', event.target.value)}
                  >
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="GET">GET</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  key={field.key}
                  fullWidth
                  label={field.label}
                  type={field.type || 'text'}
                  value={draftCredentials[field.key] || ''}
                  placeholder={field.placeholder}
                  helperText={field.helperText}
                  onChange={(event) => updateDraftField(field.key, event.target.value)}
                />
              )
            )}

            <TextField
              fullWidth
              label="Телефон для теста"
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              helperText="На этот номер можно отправить тестовую SMS перед подключением"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogProviderId(null)}>Отмена</Button>
          <Button variant="outlined" onClick={handleTest} disabled={isTesting || isConnecting}>
            {isTesting ? 'Отправка...' : 'Проверить'}
          </Button>
          <Button variant="contained" onClick={handleConnect} disabled={isConnecting || isTesting}>
            {isConnecting ? 'Подключение...' : 'Подключить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SmsProviderSetup;
