import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  ArrowForward,
  BusinessOutlined,
  CategoryOutlined,
  CheckCircleOutline,
  CloudUploadOutlined,
  DeleteOutline,
  PaletteOutlined,
  ReceiptLongOutlined,
  StorefrontOutlined,
  SupportAgentOutlined,
  WarehouseOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { appSettingsService } from '../../services/appSettingsService';
import { taxonomyService } from '../../services/taxonomyService';
import { useAuth } from '../../hooks/useAuth';
import { AppSettings, Warehouse } from '../../types';
import { APPEARANCE_PRESETS, APPEARANCE_PRESET_OPTIONS, normalizeAppearance, previewCrmTheme } from '../../utils/crmAppearance';
import { useCrmAppearance } from '../../context/CrmThemeProvider';
import { crmRadius } from '../../styles/tokens';
import { TIMEZONE_OPTIONS } from '../../constants/timezones';
import { CURRENCY_OPTIONS } from '../../constants/currencies';
import { MAX_LOGO_BYTES, MAX_LOGO_LABEL } from '../../constants/logo';
import SmsProviderSetup from '../../components/SmsProviderSetup/SmsProviderSetup';
import TelegramProviderSetup from '../../components/TelegramProviderSetup/TelegramProviderSetup';
import { platformService } from '../../services/platformService';
import SubscriptionPlanPicker from '../../components/SubscriptionPlanPicker/SubscriptionPlanPicker';

const STEPS = [
  { key: 'welcome', label: 'Старт' },
  { key: 'company', label: 'Компания' },
  { key: 'branding', label: 'Логотип и тема' },
  { key: 'locations', label: 'Локации' },
  { key: 'warehouses', label: 'Склады' },
  { key: 'inventoryCategories', label: 'Категории склада' },
  { key: 'payments', label: 'Оплата' },
  { key: 'integrations', label: 'Интеграции' },
  { key: 'finish', label: 'Готово' },
] as const;

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gradients } = useCrmAppearance();
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => appSettingsService.getSettings());
  const [newLocation, setNewLocation] = useState('');
  const [newWarehouse, setNewWarehouse] = useState('');
  const [newInventoryCategory, setNewInventoryCategory] = useState('');
  const [inventoryCategories, setInventoryCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedIntegration, setExpandedIntegration] = useState<'sms' | 'telegram' | null>(null);
  const appearanceTouchedRef = useRef(false);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState(2290);
  const [locationSlots, setLocationSlots] = useState(1);
  const [showLocationPayment, setShowLocationPayment] = useState(false);

  useEffect(() => {
    void platformService
      .getBillingConfig()
      .then((config) => {
        setBillingEnabled(Boolean(config.enabled));
        setMonthlyPrice(Number(config.monthlyPrice || config.amount) || 2290);
        setLocationSlots(Math.max(1, Number(config.locationSlots || config.tenant?.locationSlots) || 1));
      })
      .catch(() => setBillingEnabled(false))
      .finally(() => setBillingLoading(false));
  }, []);

  const applyLiveAppearance = (nextSettings: AppSettings) => {
    previewCrmTheme(nextSettings);
    appSettingsService.cacheSettingsLocally(nextSettings);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const remote = await appSettingsService.refreshFromApi({ notify: false, persist: false });
        setSettings((prev) => {
          if (appearanceTouchedRef.current) {
            return {
              ...remote,
              appearance: prev.appearance,
              system: {
                ...remote.system,
                theme: prev.system.theme,
              },
            };
          }

          applyLiveAppearance(remote);
          return remote;
        });
      } catch {
        // keep cached settings
      }
    };

    void load();
  }, []);

  useEffect(
    () => () => {
      if (!appearanceTouchedRef.current) {
        previewCrmTheme(appSettingsService.getSettings());
      }
    },
    []
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    setSettings((prev) => ({
      ...prev,
      business: {
        ...prev.business,
        companyName: prev.business.companyName || user.tenant?.name || '',
        email: prev.business.email || user.email || user.loginEmail || '',
        phone: prev.business.phone || user.phone || '',
      },
      profile: {
        ...prev.profile,
        name: prev.profile.name || user.name || '',
        email: prev.profile.email || user.email || '',
        phone: prev.profile.phone || user.phone || '',
      },
    }));
  }, [user]);

  const progress = useMemo(() => ((activeStep + 1) / STEPS.length) * 100, [activeStep]);

  const patchSettings = (updater: (prev: AppSettings) => AppSettings) => {
    setSettings((prev) => updater(prev));
  };

  const saveProgress = async (nextSettings: AppSettings) => {
    setIsSaving(true);
    try {
      const saved = await appSettingsService.saveSettings(nextSettings);
      setSettings(saved);
      return saved;
    } catch {
      toast.error('Не удалось сохранить настройки');
      throw new Error('save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Загрузите изображение (PNG, JPG, SVG)');
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast.error(`Логотип не больше ${MAX_LOGO_LABEL}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      patchSettings((prev) => ({
        ...prev,
        business: {
          ...prev.business,
          logoUrl: String(reader.result || ''),
        },
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAddLocation = () => {
    const value = newLocation.trim();
    if (!value) {
      return;
    }

    if (settings.locations.items.includes(value)) {
      toast.error('Такая локация уже есть');
      return;
    }

    if (billingEnabled && settings.locations.items.length >= locationSlots) {
      localStorage.setItem('crm_pending_location_name', value);
      setShowLocationPayment(true);
      return;
    }

    patchSettings((prev) => ({
      ...prev,
      locations: {
        items: [...prev.locations.items, value],
      },
    }));
    setNewLocation('');
  };

  const handleAddWarehouse = () => {
    const name = newWarehouse.trim();
    if (!name) {
      return;
    }

    const warehouse: Warehouse = {
      id: `warehouse_${Date.now()}`,
      name,
      description: '',
      enabled: true,
      sortOrder: settings.orders.warehouses.length + 1,
    };

    patchSettings((prev) => ({
      ...prev,
      orders: {
        ...prev.orders,
        warehouses: [...prev.orders.warehouses, warehouse],
      },
    }));
    setNewWarehouse('');
  };

  const refreshInventoryCategories = async () => {
    await taxonomyService.refreshFromApi();
    setInventoryCategories(
      taxonomyService
        .getRoots('inventory')
        .map((node) => ({ id: node.id, name: node.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    );
  };

  useEffect(() => {
    void refreshInventoryCategories();
  }, []);

  const handleAddInventoryCategory = async () => {
    const name = newInventoryCategory.trim();
    if (!name) {
      return;
    }

    try {
      await taxonomyService.addNode('inventory', name);
      await refreshInventoryCategories();
      setNewInventoryCategory('');
    } catch {
      toast.error('Не удалось добавить категорию');
    }
  };

  const handleRemoveInventoryCategory = async (nodeId: string) => {
    try {
      await taxonomyService.deleteNode(nodeId);
      await refreshInventoryCategories();
    } catch {
      toast.error('Не удалось удалить категорию');
    }
  };

  const handleAppearancePreset = (presetId: string) => {
    if (!APPEARANCE_PRESETS[presetId]) {
      return;
    }

    appearanceTouchedRef.current = true;
    setSettings((prev) => {
      const next = {
        ...prev,
        appearance: normalizeAppearance({
          preset: presetId,
          mode: prev.appearance.mode,
        }),
      };
      applyLiveAppearance(next);
      return next;
    });
  };

  const goNext = async () => {
    try {
      await saveProgress(settings);
      setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
    } catch {
      // toast already shown
    }
  };

  const goBack = () => {
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const skipStep = async () => {
    await goNext();
  };

  const finishOnboarding = async () => {
    try {
      const completed = {
        ...settings,
        system: {
          ...settings.system,
          onboardingCompleted: true,
        },
      };
      await saveProgress(completed);
      toast.success('CRM настроена! Добро пожаловать.');
      navigate('/dashboard', { replace: true });
    } catch {
      // toast already shown
    }
  };

  const renderStepContent = () => {
    switch (STEPS[activeStep].key) {
      case 'welcome':
        return (
          <Stack spacing={2.5} alignItems="flex-start">
            <Typography variant="h4" fontWeight={800}>
              Добро пожаловать в CRM
            </Typography>
            <Typography color="text.secondary">
              За несколько минут настроим ваш сервис: реквизиты, логотип, склады и оплату.
              Всё можно изменить позже в разделе «Настройки».
            </Typography>
            <Alert severity="info" sx={{ width: '100%' }}>
              У вас активен пробный период — 14 дней полного доступа ко всем модулям.
            </Alert>
          </Stack>
        );

      case 'company':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Данные компании
            </Typography>
            <Typography color="text.secondary">
              Эти данные попадут в документы, SMS и печатные формы для клиентов.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Название компании"
                  value={settings.business.companyName}
                  onChange={(event) =>
                    patchSettings((prev) => ({
                      ...prev,
                      business: { ...prev.business, companyName: event.target.value },
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Телефон"
                  value={settings.business.phone}
                  onChange={(event) =>
                    patchSettings((prev) => ({
                      ...prev,
                      business: { ...prev.business, phone: event.target.value },
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Адрес"
                  value={settings.business.address}
                  onChange={(event) =>
                    patchSettings((prev) => ({
                      ...prev,
                      business: { ...prev.business, address: event.target.value },
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={settings.business.email}
                  onChange={(event) =>
                    patchSettings((prev) => ({
                      ...prev,
                      business: { ...prev.business, email: event.target.value },
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Часы работы"
                  placeholder="10:00 - 19:00"
                  value={settings.business.workingHours}
                  onChange={(event) =>
                    patchSettings((prev) => ({
                      ...prev,
                      business: { ...prev.business, workingHours: event.target.value },
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Часовой пояс</InputLabel>
                  <Select
                    label="Часовой пояс"
                    value={settings.business.timezone}
                    onChange={(event) =>
                      patchSettings((prev) => ({
                        ...prev,
                        business: { ...prev.business, timezone: event.target.value },
                      }))
                    }
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        );

      case 'branding':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Логотип и оформление
            </Typography>
            <Typography color="text.secondary">
              Логотип отображается в меню CRM. Цветовая тема применяется для всей организации.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  bgcolor: 'background.default',
                }}
              >
                {settings.business.logoUrl ? (
                  <Box component="img" src={settings.business.logoUrl} alt="Логотип" sx={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                  <BusinessOutlined color="disabled" sx={{ fontSize: 40 }} />
                )}
              </Box>
              <Stack spacing={1}>
                <Button component="label" variant="outlined" startIcon={<CloudUploadOutlined />}>
                  Загрузить логотип
                  <input hidden accept="image/*" type="file" onChange={handleLogoUpload} />
                </Button>
                {settings.business.logoUrl ? (
                  <Button
                    color="inherit"
                    onClick={() =>
                      patchSettings((prev) => ({
                        ...prev,
                        business: { ...prev.business, logoUrl: '' },
                      }))
                    }
                  >
                    Удалить логотип
                  </Button>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG или SVG до {MAX_LOGO_LABEL}
                </Typography>
              </Stack>
            </Stack>
            <Typography fontWeight={700}>Цветовая тема</Typography>
            <Grid container spacing={1.5}>
              {APPEARANCE_PRESET_OPTIONS.map((preset) => {
                const selected = settings.appearance.preset === preset.id;
                const colors = APPEARANCE_PRESETS[preset.id];
                return (
                  <Grid item xs={6} sm={4} md={3} key={preset.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        borderColor: selected ? 'primary.main' : 'divider',
                        borderWidth: selected ? 2 : 1,
                      }}
                      onClick={() => handleAppearancePreset(preset.id)}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: colors?.primaryColor || preset.preview }} />
                          <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: colors?.secondaryColor || 'divider' }} />
                        </Stack>
                        <Typography variant="body2" fontWeight={selected ? 700 : 500} sx={{ mt: 1 }}>
                          {preset.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.appearance.mode === 'dark'}
                  onChange={(event) => {
                    const mode = event.target.checked ? 'dark' : 'light';
                    appearanceTouchedRef.current = true;
                    setSettings((prev) => {
                      const next = {
                        ...prev,
                        appearance: normalizeAppearance({
                          ...prev.appearance,
                          mode,
                        }),
                        system: {
                          ...prev.system,
                          theme: mode,
                        },
                      };
                      applyLiveAppearance(next);
                      return next;
                    });
                  }}
                />
              }
              label="Тёмная тема"
            />
          </Stack>
        );

      case 'locations':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Локации сервиса
            </Typography>
            <Typography color="text.secondary">
              Точки приёма и выдачи заказов. Первая локация включена в подписку, каждая дополнительная оплачивается отдельно.
            </Typography>
            <Alert severity="info">
              Использовано: {settings.locations.items.length} из {locationSlots}
            </Alert>
            {showLocationPayment ? (
              <SubscriptionPlanPicker
                billingEnabled={billingEnabled}
                isLoading={billingLoading}
                monthlyPrice={monthlyPrice}
                paymentPurpose="location"
                payButtonLabel="Оплатить локацию"
                compact
              />
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label="Новая локация"
                  value={newLocation}
                  onChange={(event) => setNewLocation(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddLocation();
                    }
                  }}
                />
                <Button variant="contained" startIcon={<Add />} onClick={handleAddLocation}>
                  {billingEnabled && settings.locations.items.length >= locationSlots ? 'Оплатить и добавить' : 'Добавить'}
                </Button>
              </Stack>
            )}
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {settings.locations.items.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  onDelete={() =>
                    patchSettings((prev) => ({
                      ...prev,
                      locations: {
                        items: prev.locations.items.filter((location) => location !== item),
                      },
                    }))
                  }
                />
              ))}
              {settings.locations.items.length === 0 && (
                <Alert severity="info" sx={{ width: '100%' }}>
                  Добавьте хотя бы одну локацию или пропустите шаг.
                </Alert>
              )}
            </Stack>
          </Stack>
        );

      case 'warehouses':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Склады
            </Typography>
            <Typography color="text.secondary">
              Склады используются для учёта товаров и быстрых продаж — например «Товары» или «Защитные стёкла».
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="Название склада"
                value={newWarehouse}
                onChange={(event) => setNewWarehouse(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddWarehouse();
                  }
                }}
              />
              <Button variant="contained" startIcon={<Add />} onClick={handleAddWarehouse}>
                Добавить
              </Button>
            </Stack>
            <Stack spacing={1.25}>
              {settings.orders.warehouses.map((warehouse) => (
                <Box
                  key={warehouse.id}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    label="Название"
                    value={warehouse.name}
                    onChange={(event) =>
                      patchSettings((prev) => ({
                        ...prev,
                        orders: {
                          ...prev.orders,
                          warehouses: prev.orders.warehouses.map((item) =>
                            item.id === warehouse.id ? { ...item, name: event.target.value } : item
                          ),
                        },
                      }))
                    }
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      patchSettings((prev) => ({
                        ...prev,
                        orders: {
                          ...prev.orders,
                          warehouses: prev.orders.warehouses.filter((item) => item.id !== warehouse.id),
                        },
                      }))
                    }
                  >
                    <DeleteOutline />
                  </IconButton>
                </Box>
              ))}
              {settings.orders.warehouses.length === 0 && (
                <Alert severity="info">
                  Добавьте склад или пропустите шаг — настроить можно позже в настройках.
                </Alert>
              )}
            </Stack>
          </Stack>
        );

      case 'inventoryCategories':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Категории склада
            </Typography>
            <Typography color="text.secondary">
              Группы для запчастей и товаров — например «Экраны», «Аккумуляторы» или «Аксессуары». Можно добавить позже на странице «Склад».
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="Новая категория"
                value={newInventoryCategory}
                onChange={(event) => setNewInventoryCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddInventoryCategory();
                  }
                }}
              />
              <Button variant="contained" startIcon={<Add />} onClick={() => void handleAddInventoryCategory()}>
                Добавить
              </Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {inventoryCategories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  onDelete={() => void handleRemoveInventoryCategory(category.id)}
                />
              ))}
              {inventoryCategories.length === 0 && (
                <Alert severity="info" sx={{ width: '100%' }}>
                  Категорий пока нет. Добавьте свои или пропустите шаг.
                </Alert>
              )}
            </Stack>
          </Stack>
        );

      case 'payments':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Оплата и касса
            </Typography>
            <Typography color="text.secondary">
              Базовые настройки для финансового учёта и приёма платежей.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Валюта</InputLabel>
                  <Select
                    value={settings.payment.currency}
                    label="Валюта"
                    onChange={(event) =>
                      patchSettings((prev) => ({
                        ...prev,
                        payment: { ...prev.payment, currency: event.target.value },
                      }))
                    }
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Typography fontWeight={700}>Способы оплаты</Typography>
            <Stack spacing={1}>
              {settings.payment.paymentMethodOptions.map((method) => (
                <FormControlLabel
                  key={method.code}
                  control={
                    <Switch
                      checked={method.enabled}
                      onChange={(event) =>
                        patchSettings((prev) => ({
                          ...prev,
                          payment: {
                            ...prev.payment,
                            paymentMethodOptions: prev.payment.paymentMethodOptions.map((item) =>
                              item.code === method.code ? { ...item, enabled: event.target.checked } : item
                            ),
                          },
                        }))
                      }
                    />
                  }
                  label={method.label}
                />
              ))}
            </Stack>
          </Stack>
        );

      case 'integrations':
        return (
          <Stack spacing={2.5}>
            <Typography variant="h5" fontWeight={800}>
              Интеграции
            </Typography>
            <Typography color="text.secondary">
              SMS и Telegram можно подключить прямо сейчас. Если хотите — пропустите шаг, все интеграции доступны и позже в «Настройки».
            </Typography>
            <Alert severity="info" sx={{ whiteSpace: 'pre-line' }}>
              {'Нажмите на карточку ниже, чтобы развернуть пошаговую настройку.\nВнутри будут подробные инструкции и поля для подключения прямо из онбординга.'}
            </Alert>

            <Card
              variant="outlined"
              sx={{ borderColor: expandedIntegration === 'sms' ? 'primary.main' : 'divider', borderWidth: expandedIntegration === 'sms' ? 2 : 1 }}
            >
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SupportAgentOutlined color="primary" />
                    <Box>
                      <Typography fontWeight={700}>SMS</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Уведомления о готовности заказа и статусах ремонта.
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant={expandedIntegration === 'sms' ? 'contained' : 'outlined'}
                    onClick={() => setExpandedIntegration((prev) => (prev === 'sms' ? null : 'sms'))}
                  >
                    {expandedIntegration === 'sms' ? 'Скрыть настройку' : 'Настроить SMS'}
                  </Button>
                </Stack>
                {expandedIntegration === 'sms' ? (
                  <Box sx={{ mt: 2 }}>
                    <SmsProviderSetup
                      settings={settings}
                      onChange={(next) => setSettings(next)}
                      onSave={async (next) => saveProgress(next)}
                    />
                  </Box>
                ) : null}
              </CardContent>
            </Card>

            <Card
              variant="outlined"
              sx={{ borderColor: expandedIntegration === 'telegram' ? 'primary.main' : 'divider', borderWidth: expandedIntegration === 'telegram' ? 2 : 1 }}
            >
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SupportAgentOutlined color="primary" />
                    <Box>
                      <Typography fontWeight={700}>Telegram</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Переписка с клиентами и уведомления в CRM.
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant={expandedIntegration === 'telegram' ? 'contained' : 'outlined'}
                    onClick={() => setExpandedIntegration((prev) => (prev === 'telegram' ? null : 'telegram'))}
                  >
                    {expandedIntegration === 'telegram' ? 'Скрыть настройку' : 'Настроить Telegram'}
                  </Button>
                </Stack>
                {expandedIntegration === 'telegram' ? (
                  <Box sx={{ mt: 2 }}>
                    <TelegramProviderSetup
                      settings={settings}
                      onChange={(next) => setSettings(next)}
                      onSave={async (next) => saveProgress(next)}
                    />
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Stack>
        );

      case 'finish':
        return (
          <Stack spacing={2.5} alignItems="flex-start">
            <CheckCircleOutline color="success" sx={{ fontSize: 56 }} />
            <Typography variant="h4" fontWeight={800}>
              Всё готово!
            </Typography>
            <Typography color="text.secondary">
              Основные настройки сохранены. Можно начинать работу: создавать заказы, вести склад и принимать оплаты.
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">• Компания: {settings.business.companyName || '—'}</Typography>
              <Typography variant="body2">• Локаций: {settings.locations.items.length}</Typography>
              <Typography variant="body2">• Складов: {settings.orders.warehouses.length}</Typography>
              <Typography variant="body2">• Категорий склада: {inventoryCategories.length}</Typography>
              <Typography variant="body2">• Способов оплаты: {settings.payment.paymentMethodOptions.filter((m) => m.enabled).length}</Typography>
            </Stack>
          </Stack>
        );

      default:
        return null;
    }
  };

  const stepIcons = [
    undefined,
    <BusinessOutlined />,
    <PaletteOutlined />,
    <StorefrontOutlined />,
    <WarehouseOutlined />,
    <CategoryOutlined />,
    <ReceiptLongOutlined />,
    <SupportAgentOutlined />,
    <CheckCircleOutline />,
  ];

  const isLastStep = activeStep === STEPS.length - 1;
  const isFirstStep = activeStep === 0;
  const canSkip = !isFirstStep && !isLastStep;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 3, md: 5 },
        background: gradients.appBackground,
        color: 'text.primary',
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Первичная настройка CRM
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              {STEPS[activeStep].label}
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, borderRadius: 99, height: 8 }} />
          </Box>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: 'none', md: 'flex' } }}>
            {STEPS.map((step, index) => (
              <Step key={step.key} completed={index < activeStep}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Card sx={{ borderRadius: crmRadius.md }}>
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, display: { md: 'none' } }}>
                {stepIcons[activeStep]}
                <Typography variant="body2" color="text.secondary">
                  Шаг {activeStep + 1} из {STEPS.length}
                </Typography>
              </Stack>
              {renderStepContent()}
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="space-between">
            <Button startIcon={<ArrowBack />} disabled={isFirstStep || isSaving} onClick={goBack}>
              Назад
            </Button>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {canSkip ? (
                <Button color="secondary" disabled={isSaving} onClick={() => void skipStep()}>
                  Пропустить
                </Button>
              ) : null}
              {isLastStep ? (
                <Button variant="contained" size="large" disabled={isSaving} onClick={() => void finishOnboarding()}>
                  Перейти в CRM
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  disabled={isSaving}
                  onClick={() => void goNext()}
                >
                  {isFirstStep ? 'Начать настройку' : 'Далее'}
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Onboarding;
