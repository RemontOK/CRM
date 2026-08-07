import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Article,
  AssignmentTurnedIn,
  Business,
  ContentCopy,
  CreditCard,
  DarkMode,
  DeleteOutline,
  FileDownload,
  FileUpload,
  FlashOn,
  Inventory2,
  LightMode,
  LocationOn,
  Notifications,
  Palette,
  PointOfSale,
  Preview,
  ReceiptLong,
  Refresh,
  Save,
  Storefront,
  SupportAgent,
  TextFields,
  Workspaces,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { appSettingsService, migrateSmsRecordKeys, smsLegacyKeyMap } from '../../services/appSettingsService';
import { getApiErrorMessage } from '../../services/api';
import {
  ENGLISH_TO_RUSSIAN_TOKEN_MAP,
  applyTemplateTokenValues,
  migrateEnglishTokens,
} from '../../services/documentTemplateTokens';
import {
  DOCUMENT_CLIENT_DATA_TABLE_TOKEN,
  DOCUMENT_WORKS_TABLE_TOKEN,
  buildDocumentTemplateEditorInsertHtml,
  decorateDocumentTemplateForEditor,
  normalizeDocumentTemplateFromEditor,
} from '../../services/documentTemplateEditor';
import { buildSampleDocumentClientDataTableHtml } from '../../services/documentClientDataTable';
import { buildSampleDocumentWorksTableHtml } from '../../services/documentWorksTable';
import { taxonomyService } from '../../services/taxonomyService';
import { AppSettings, CrmAppearanceSettings, DocumentTemplate, OrderStatusSetting, SettingsSectionKey, TaxonomyNode } from '../../types';
import {
  APPEARANCE_PRESET_OPTIONS,
  APPEARANCE_PRESETS,
  DEFAULT_APPEARANCE,
  buildCrmGradients,
  normalizeAppearance,
  previewCrmTheme,
  resolveCrmAppearance,
} from '../../utils/crmAppearance';
import { heroCardSx, pageShellSx, panelCardSx } from '../../styles/ui';
import TinyMceEditor from '../../components/TinyMceEditor/TinyMceEditor';
import SmsProviderSetup from '../../components/SmsProviderSetup/SmsProviderSetup';
import TelegramProviderSetup from '../../components/TelegramProviderSetup/TelegramProviderSetup';
import SubscriptionPlanPicker from '../../components/SubscriptionPlanPicker/SubscriptionPlanPicker';
import QuickSaleButtonsEditor from '../../components/QuickSaleButtonsManager/QuickSaleButtonsEditor';
import { platformService } from '../../services/platformService';
import { TIMEZONE_OPTIONS } from '../../constants/timezones';
import { CURRENCY_OPTIONS } from '../../constants/currencies';
import { isSystemNewOrderStatus } from '../../constants/orderStatuses';
import { MAX_LOGO_BYTES, MAX_LOGO_LABEL } from '../../constants/logo';
import { useAuth } from '../../hooks/useAuth';
import { getSubscriptionSummary, formatDaysRemaining } from '../../utils/subscriptionSummary';
import {
  canAccessSettingsSection,
  getEmployeeVisibleSettingsSections,
  resolveSettingsSectionKey,
} from '../../utils/employeeSettingsAccess';
import { buildClientFieldPreviewValues, buildDocumentVariableGroups } from '../../utils/clientFieldUtils';

const SETTINGS_STAT_CARD_HEIGHT = 132;

const SettingsStatCard: React.FC<{
  label: string;
  value: string | number;
  caption: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ label, value, caption, onClick, disabled }) => {
  const content = (
    <CardContent
      sx={{
        minHeight: SETTINGS_STAT_CARD_HEIGHT,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Typography variant="body2" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 1, mb: 'auto', fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pt: 1.5, lineHeight: 1.35 }}>
        {caption}
      </Typography>
    </CardContent>
  );

  if (onClick) {
    return (
      <Card sx={{ ...panelCardSx, height: '100%' }}>
        <CardActionArea onClick={onClick} disabled={disabled} sx={{ height: '100%', alignItems: 'stretch' }}>
          {content}
        </CardActionArea>
      </Card>
    );
  }

  return <Card sx={{ ...panelCardSx, height: '100%' }}>{content}</Card>;
};

type SettingsGroupItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

type SettingsGroup = {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: SettingsGroupItem[];
};

const settingsSections: SettingsGroup[] = [
  {
    title: 'Компания и команда',
    description: 'Профиль сервиса, филиалы, сотрудники и подписка',
    icon: <Business />,
    items: [
      { key: 'appearance', label: 'Цвета и тема', icon: <Palette fontSize="small" /> },
      { key: 'business', label: 'Общее', icon: <Business fontSize="small" /> },
      { key: 'locations', label: 'Локации', icon: <LocationOn fontSize="small" /> },
      { key: 'employees', label: 'Сотрудники', icon: <Workspaces fontSize="small" /> },
      { key: 'license', label: 'Подписка', icon: <Storefront fontSize="small" /> },
    ],
  },
  {
    title: 'Заказы и документы',
    description: 'Сценарии ремонта, статусы, шаблоны и поля клиента',
    icon: <ReceiptLong />,
    items: [
      { key: 'orders', label: 'Общее', icon: <ReceiptLong fontSize="small" /> },
      { key: 'quickSales', label: 'Быстрые продажи', icon: <FlashOn fontSize="small" /> },
      { key: 'statuses', label: 'Статусы', icon: <Inventory2 fontSize="small" /> },
      { key: 'documents', label: 'Документы', icon: <Article fontSize="small" /> },
      { key: 'clientFields', label: 'Поля клиента', icon: <TextFields fontSize="small" /> },
    ],
  },
  {
    title: 'Финансы и связь',
    description: 'Оплата, касса, SMS, Telegram и уведомления',
    icon: <PointOfSale />,
    items: [
      { key: 'paymentCategories', label: 'Статьи движения денежных средств', icon: <PointOfSale fontSize="small" /> },
      { key: 'paymentMethods', label: 'Методы оплаты', icon: <CreditCard fontSize="small" /> },
      { key: 'integrations', label: 'Интеграции и SMS', icon: <SupportAgent fontSize="small" /> },
      { key: 'notifications', label: 'Уведомления', icon: <Notifications fontSize="small" /> },
    ],
  },
];

const documentCategoryOptions: Array<{ value: DocumentTemplate['category']; label: string }> = [
  { value: 'orders', label: 'Заказы' },
  { value: 'shop', label: 'Магазин' },
  { value: 'inventory', label: 'Склад' },
  { value: 'clients', label: 'Клиенты' },
  { value: 'finance', label: 'Финансы' },
  { value: 'other', label: 'Прочее' },
];

const documentTypeOptions: Array<{ value: DocumentTemplate['type']; label: string }> = [
  { value: 'acceptance', label: 'Акт приема' },
  { value: 'completion', label: 'Акт выполненных работ' },
  { value: 'custom', label: 'Произвольный шаблон' },
];

const migrateDocumentTemplatesTokens = (settings: AppSettings): AppSettings => {
  const migratedTemplates = settings.documents.templates.map((template) => {
    const newTemplateContent = migrateEnglishTokens(template.template);
    const newVariables = template.variables.map((v) => {
      const mapped = ENGLISH_TO_RUSSIAN_TOKEN_MAP[v];
      return mapped || v;
    });
    if (newTemplateContent === template.template && newVariables.every((v, i) => v === template.variables[i])) {
      return template;
    }
    return {
      ...template,
      template: newTemplateContent,
      variables: newVariables,
      updatedAt: new Date(),
    };
  });
  if (migratedTemplates.every((t, i) => t === settings.documents.templates[i])) {
    return settings;
  }
  return {
    ...settings,
    documents: {
      ...settings.documents,
      templates: migratedTemplates,
    },
  };
};

const smsVariableGroups: Array<{ title: string; variables: Array<{ token: string; label: string }> }> = [
  {
    title: 'Клиент',
    variables: [
      { token: '{{ФИОКлиента}}', label: 'Имя клиента' },
      { token: '{{phone}}', label: 'Телефон' },
      { token: '{{ТелефонКлиента}}', label: 'Телефон клиента (альт.)' },
    ],
  },
  {
    title: 'Заказ',
    variables: [
      { token: '{{НомерЗаказа}}', label: 'Номер заказа' },
      { token: '{{status}}', label: 'Статус заказа' },
      { token: '{{Устройство}}', label: 'Устройство' },
    ],
  },
  {
    title: 'Финансы',
    variables: [
      { token: '{{Долг}}', label: 'Остаток к оплате' },
      { token: '{{amount}}', label: 'Сумма платежа' },
      { token: '{{ИтоговаяСтоимость}}', label: 'Итоговая стоимость' },
    ],
  },
  {
    title: 'Компания',
    variables: [
      { token: '{{НазваниеКомпании}}', label: 'Название компании' },
      { token: '{{ТелефонКомпании}}', label: 'Телефон компании' },
      { token: '{{АдресКомпании}}', label: 'Адрес компании' },
    ],
  },
  {
    title: 'Telegram',
    variables: [
      { token: '{{telegramBotLink}}', label: 'Ссылка на бота' },
      { token: '{{telegramStartParam}}', label: 'Параметр start (link_…)' },
    ],
  },
];

const variableChipSx = {
  cursor: 'pointer',
  height: 'auto',
  borderRadius: 1.5,
  bgcolor: 'background.paper',
  borderColor: 'var(--crm-border)',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  '& .MuiChip-label': {
    whiteSpace: 'normal',
    py: 0.5,
    lineHeight: 1.3,
    color: 'var(--crm-color-ink)',
  },
  '&:hover': {
    bgcolor: 'var(--crm-color-primary)',
    borderColor: 'var(--crm-color-primary-dark)',
    '& .MuiChip-label': {
      color: '#ffffff',
    },
  },
} as const;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>('business');
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(appSettingsService.getSettings());
  const [newLocation, setNewLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newFormItems, setNewFormItems] = useState<Record<'clientFields', string>>({
    clientFields: '',
  });
  const tinyEditorRef = useRef<any>(null);
  const documentTemplateDraftRef = useRef<Record<string, string>>({});
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const documentPreviewDebounceRef = useRef<number | null>(null);
  const [documentPreviewTemplate, setDocumentPreviewTemplate] = useState('');
  const [documentEditorRevision, setDocumentEditorRevision] = useState(0);
  const handleDocumentEditorReady = useCallback((editor: any | null) => {
    tinyEditorRef.current = editor;
  }, []);
  const smsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedSmsStatusTemplate, setSelectedSmsStatusTemplate] = useState('ready');
  const [newPaymentMethodLabel, setNewPaymentMethodLabel] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [inventoryCategoryOptions, setInventoryCategoryOptions] = useState<string[]>([]);
  const [cashCategories, setCashCategories] = useState<TaxonomyNode[]>([]);
  const [newCashCategory, setNewCashCategory] = useState('');
  const [editingCashCategoryId, setEditingCashCategoryId] = useState<string | null>(null);
  const [editingCashCategoryName, setEditingCashCategoryName] = useState('');
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState(2290);
  const [locationSlots, setLocationSlots] = useState(1);
  const [isLocationPaymentOpen, setIsLocationPaymentOpen] = useState(false);
  const [pendingLocationName, setPendingLocationName] = useState('');

  useEffect(() => {
    const storedPending = localStorage.getItem('crm_pending_location_name')?.trim();
    if (storedPending) {
      setPendingLocationName(storedPending);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    void platformService
      .getBillingConfig()
      .then((config) => {
        setBillingEnabled(Boolean(config.enabled));
        setMonthlyPrice(Number(config.monthlyPrice || config.amount) || 2290);
        setLocationSlots(Math.max(1, Number(config.locationSlots || config.tenant?.locationSlots) || 1));
      })
      .catch(() => {
        setBillingEnabled(false);
      })
      .finally(() => setBillingLoading(false));
  }, []);

  const visibleSettingsGroups = useMemo(
    () =>
      settingsSections
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => canAccessSettingsSection(user, item.key as SettingsSectionKey)),
        }))
        .filter((group) => group.items.length > 0),
    [user]
  );

  const allowedSettingsSections = useMemo(() => getEmployeeVisibleSettingsSections(user), [user]);

  useEffect(() => {
    if (!allowedSettingsSections.length) {
      return;
    }

    if (!canAccessSettingsSection(user, activeSection)) {
      const preferred =
        user?.role !== 'admin' && allowedSettingsSections.includes('documents')
          ? 'documents'
          : allowedSettingsSections[0];
      setActiveSection(preferred);
    }
  }, [activeSection, allowedSettingsSections, user]);

  useEffect(() => {
    const requestedSection = searchParams.get('section') as SettingsSectionKey | null;
    if (!requestedSection || !canAccessSettingsSection(user, requestedSection)) {
      return;
    }

    const nextSection = resolveSettingsSectionKey(requestedSection);
    setActiveSection(nextSection);
    setIsSectionDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, user]);

  useEffect(() => {
    const load = async () => {
      const [nextSettings] = await Promise.all([
        appSettingsService.refreshFromApi(),
        taxonomyService.refreshFromApi(),
      ]);
      const migratedSettings = migrateDocumentTemplatesTokens(nextSettings);
      setSettings(migratedSettings);
      previewCrmTheme(migratedSettings);
      if (migratedSettings !== nextSettings && isAdmin) {
        try {
          await appSettingsService.saveSettings(migratedSettings);
        } catch {
          // Token migration stays in local cache even if server sync fails.
        }
      }
      setInventoryCategoryOptions(
        taxonomyService
          .getNodes('inventory')
          .map((node) => node.name.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'ru'))
      );
      setCashCategories(
        taxonomyService
          .getNodes('cash')
          .filter((node) => !node.parentId)
          .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      );
      if (migratedSettings.documents.templates.length > 0) {
        setSelectedTemplateId(migratedSettings.documents.templates[0].id);
      }
    };

    void load();
  }, []);

  useEffect(
    () => () => {
      previewCrmTheme(appSettingsService.getSettings());
    },
    []
  );

  useEffect(() => {
    if (!selectedTemplateId && settings.documents.templates.length > 0) {
      setSelectedTemplateId(settings.documents.templates[0].id);
    }
  }, [selectedTemplateId, settings.documents.templates]);

  const setCategoryValue = <T extends keyof AppSettings>(category: T, key: keyof AppSettings[T], value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const appearancePreview = useMemo(() => {
    const appearance = normalizeAppearance(settings.appearance);
    const colors = resolveCrmAppearance(appearance);
    const gradients = buildCrmGradients(colors);
    return { appearance, colors, gradients };
  }, [settings.appearance]);

  const applyLiveAppearance = (nextSettings: AppSettings) => {
    previewCrmTheme(nextSettings);
    appSettingsService.cacheSettingsLocally(nextSettings);
  };

  const applyAppearancePreset = (presetId: string) => {
    if (!APPEARANCE_PRESETS[presetId]) {
      return;
    }

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

  const setAppearanceValue = <K extends keyof CrmAppearanceSettings>(key: K, value: CrmAppearanceSettings[K]) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        appearance: normalizeAppearance({
          ...prev.appearance,
          ...(key !== 'mode' ? { preset: 'custom' } : {}),
          [key]: value,
        }),
        system: {
          ...prev.system,
          theme: key === 'mode' ? (value as AppSettings['system']['theme']) : prev.system.theme,
        },
      };
      applyLiveAppearance(next);
      return next;
    });
  };

  const handleResetAppearance = () => {
    setSettings((prev) => {
      const next = {
        ...prev,
        appearance: structuredClone(DEFAULT_APPEARANCE),
        system: {
          ...prev.system,
          theme: DEFAULT_APPEARANCE.mode,
        },
      };
      applyLiveAppearance(next);
      return next;
    });
    toast.success('Цвета и тема сброшены к значениям по умолчанию');
  };

  const setNestedCategoryValue = <T extends keyof AppSettings, K extends keyof AppSettings[T]>(
    category: T,
    key: K,
    nestedKey: string,
    value: unknown
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: {
          ...(prev[category][key] as Record<string, unknown>),
          [nestedKey]: value,
        },
      },
    }));
  };

  const handleSmsTriggerChange = (statusCode: string, enabled: boolean) => {
    setSettings((prev) => {
      const nextSettings: AppSettings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          smsNotifications: enabled ? true : prev.notifications.smsNotifications,
          smsStatusTriggers: {
            ...prev.notifications.smsStatusTriggers,
            [statusCode]: enabled,
          },
        },
      };

      void appSettingsService
        .saveSettings(nextSettings)
        .then((saved) => {
          setSettings(saved);
          toast.success(enabled ? `SMS для статуса включена и сохранена` : 'SMS-триггер сохранен');
        })
        .catch(() => toast.error('Не удалось сохранить SMS-триггер на сервере'));

      return nextSettings;
    });
  };

  const updateTemplate = (templateId: string, updater: (template: DocumentTemplate) => DocumentTemplate) => {
    setSettings((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        templates: prev.documents.templates.map((template) =>
          template.id === templateId ? updater({ ...template, updatedAt: new Date() }) : template
        ),
      },
    }));
  };

  const setPaymentMethodOptions = (nextOptions: AppSettings['payment']['paymentMethodOptions']) => {
    const normalized = nextOptions.map((item) => ({
      ...item,
      code: item.code.trim(),
      label: item.label.trim(),
    }));
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        paymentMethodOptions: normalized,
        paymentMethods: normalized.filter((item) => item.enabled).map((item) => item.code),
        installmentEnabled: normalized.some((item) => item.code === 'installment' && item.enabled),
      },
    }));
  };

  const enabledNotificationCount = useMemo(() => {
    const triggerCount = Object.values(settings.notifications.smsStatusTriggers || {}).filter(Boolean).length;
    return (settings.notifications.smsNotifications ? 1 : 0) + triggerCount;
  }, [settings.notifications]);

  const totalNotificationCount = useMemo(
    () => 1 + Object.keys(settings.notifications.smsStatusTriggers || {}).length,
    [settings.notifications.smsStatusTriggers]
  );

  const paymentMethodsCount = useMemo(
    () => settings.payment.paymentMethods.length + (settings.payment.installmentEnabled ? 1 : 0),
    [settings.payment.installmentEnabled, settings.payment.paymentMethods.length]
  );

  const locationsCount = settings.locations.items.length;
  const canAddMoreLocations = locationsCount < locationSlots;
  const locationLimitReached = billingEnabled && !canAddMoreLocations;

  const accessibleSettingsCount = useMemo(
    () => visibleSettingsGroups.flatMap((group) => group.items).length,
    [visibleSettingsGroups]
  );

  const subscriptionSummary = useMemo(
    () => getSubscriptionSummary(user?.tenant, settings.license.plan),
    [settings.license.plan, user?.tenant]
  );

  const handleOpenSubscription = () => {
    if (canAccessSettingsSection(user, 'license')) {
      setActiveSection('license');
      setIsSectionDialogOpen(true);
      return;
    }
    navigate('/subscribe');
  };

  const subscriptionStatValue =
    subscriptionSummary.daysRemaining != null ? subscriptionSummary.daysRemaining : '—';

  const subscriptionStatCaption = [
    subscriptionSummary.planName,
    subscriptionSummary.endsAtLabel ? `до ${subscriptionSummary.endsAtLabel}` : subscriptionSummary.title,
  ]
    .filter(Boolean)
    .join(' · ');

  const orderStatusOptions = useMemo(
    () => [...settings.orders.statuses].sort((a, b) => a.sortOrder - b.sortOrder),
    [settings.orders.statuses]
  );

  const smsStatusOptions = useMemo(
    () => orderStatusOptions.filter((status) => status.enabled).map((status) => ({ key: status.code, label: status.label })),
    [orderStatusOptions]
  );

  const selectedTemplate = useMemo(
    () => settings.documents.templates.find((template) => template.id === selectedTemplateId) || null,
    [selectedTemplateId, settings.documents.templates]
  );

  const documentTableVariant = selectedTemplate?.type === 'completion' ? 'completion' : 'acceptance';

  const persistCurrentDocumentEditorDraft = useCallback(() => {
    if (!selectedTemplateId || !tinyEditorRef.current) {
      return;
    }

    try {
      tinyEditorRef.current.save?.();
    } catch {
      // TinyMCE may not expose save in some builds.
    }

    documentTemplateDraftRef.current[selectedTemplateId] = normalizeDocumentTemplateFromEditor(
      tinyEditorRef.current.getContent(),
      documentTableVariant
    );
  }, [documentTableVariant, selectedTemplateId]);

  const handleSelectDocumentTemplate = useCallback(
    (templateId: string) => {
      if (templateId === selectedTemplateId) {
        return;
      }
      persistCurrentDocumentEditorDraft();
      setSelectedTemplateId(templateId);
    },
    [persistCurrentDocumentEditorDraft, selectedTemplateId]
  );

  const handleDocumentEditorChange = useCallback(
    (nextValue: string) => {
      if (!selectedTemplateId) {
        return;
      }
      const normalized = normalizeDocumentTemplateFromEditor(nextValue, documentTableVariant);
      documentTemplateDraftRef.current[selectedTemplateId] = normalized;
      if (documentPreviewDebounceRef.current) {
        window.clearTimeout(documentPreviewDebounceRef.current);
      }
      documentPreviewDebounceRef.current = window.setTimeout(() => {
        setDocumentPreviewTemplate(normalized);
      }, 300);
    },
    [documentTableVariant, selectedTemplateId]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setDocumentPreviewTemplate('');
      return;
    }
    const draft = documentTemplateDraftRef.current[selectedTemplate.id];
    setDocumentPreviewTemplate(draft ?? selectedTemplate.template);
  }, [selectedTemplate]);

  useEffect(
    () => () => {
      if (documentPreviewDebounceRef.current) {
        window.clearTimeout(documentPreviewDebounceRef.current);
      }
    },
    []
  );

  const renderSectionIntro = (text: string) => (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 2,
        bgcolor: 'rgba(37, 99, 235, 0.06)',
        border: `1px solid ${'var(--crm-border)'}`,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );

  const renderAppearanceThemePanel = () => (
    <Box
      sx={{
        px: 2,
        py: 1.75,
        borderRadius: 2,
        bgcolor: 'rgba(37, 99, 235, 0.06)',
        border: `1px solid ${'var(--crm-border)'}`,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75 }}>
        Настройте фирменные цвета CRM: акцент, боковое меню, фон страниц и режим отображения. Тема единая для всей компании — все сотрудники видят интерфейс так же, как администратор, после сохранения.
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          border: `1px solid ${'var(--crm-border)'}`,
        }}
      >
        <Typography variant="body2" fontWeight={700}>
          Режим темы
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <LightMode
            fontSize="small"
            sx={{ color: settings.appearance.mode === 'light' ? 'primary.main' : 'text.disabled' }}
          />
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                checked={settings.appearance.mode === 'dark'}
                onChange={(event) => setAppearanceValue('mode', event.target.checked ? 'dark' : 'light')}
                inputProps={{ 'aria-label': 'Тёмная тема' }}
              />
            }
            label={
              <Typography variant="body2" fontWeight={600}>
                {settings.appearance.mode === 'dark' ? 'Тёмная' : 'Светлая'}
              </Typography>
            }
            labelPlacement="end"
          />
          <DarkMode
            fontSize="small"
            sx={{ color: settings.appearance.mode === 'dark' ? 'primary.main' : 'text.disabled' }}
          />
        </Stack>
      </Box>
    </Box>
  );

  const documentCategories = useMemo(() => {
    const groups = new Map<DocumentTemplate['category'], DocumentTemplate[]>();
    documentCategoryOptions.forEach((category) => groups.set(category.value, []));

    settings.documents.templates.forEach((template) => {
      const bucket = groups.get(template.category) || [];
      bucket.push(template);
      groups.set(template.category, bucket);
    });

    return documentCategoryOptions
      .map((category) => ({
        ...category,
        items: (groups.get(category.value) || []).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      }))
      .filter((group) => group.items.length > 0);
  }, [settings.documents.templates]);

  useEffect(() => {
    const firstStatusCode = smsStatusOptions[0]?.key || 'ready';
    if (!smsStatusOptions.some((status) => status.key === selectedSmsStatusTemplate)) {
      setSelectedSmsStatusTemplate(firstStatusCode);
    }
  }, [selectedSmsStatusTemplate, smsStatusOptions]);

  useEffect(() => {
    if (activeSection === 'profile') {
      navigate('/my-profile');
      return;
    }
    if (activeSection === 'email') {
      setActiveSection('notifications');
    } else if (activeSection === 'sms') {
      setActiveSection('integrations');
    }
  }, [activeSection, navigate]);

  useEffect(() => {
    setSettings((prev) => {
      const nextTriggers = migrateSmsRecordKeys({ ...prev.notifications.smsStatusTriggers });
      const nextTemplates = migrateSmsRecordKeys({ ...prev.integrations.smsStatusTemplates });
      let hasChanges = false;

      orderStatusOptions.forEach((status) => {
        if (!(status.code in nextTriggers)) {
          nextTriggers[status.code] = false;
          hasChanges = true;
        }
        if (!(status.code in nextTemplates)) {
          nextTemplates[status.code] = '';
          hasChanges = true;
        }
      });

      Object.keys(nextTriggers).forEach((key) => {
        if (smsLegacyKeyMap[key]) {
          return;
        }
        if (!orderStatusOptions.some((status) => status.code === key)) {
          delete nextTriggers[key];
          hasChanges = true;
        }
      });

      Object.keys(nextTemplates).forEach((key) => {
        if (smsLegacyKeyMap[key]) {
          return;
        }
        if (!orderStatusOptions.some((status) => status.code === key)) {
          delete nextTemplates[key];
          hasChanges = true;
        }
      });

      const triggersChanged =
        JSON.stringify(prev.notifications.smsStatusTriggers) !== JSON.stringify(nextTriggers);
      const templatesChanged =
        JSON.stringify(prev.integrations.smsStatusTemplates) !== JSON.stringify(nextTemplates);

      if (!hasChanges && !triggersChanged && !templatesChanged) {
        return prev;
      }

      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          smsStatusTriggers: nextTriggers,
        },
        integrations: {
          ...prev.integrations,
          smsStatusTemplates: nextTemplates,
        },
      };
    });
  }, [orderStatusOptions]);

  const syncTemplateEditorContent = (): AppSettings => {
    persistCurrentDocumentEditorDraft();

    const baseSettings = settingsRef.current;
    const dirtyTemplateIds = new Set<string>([
      ...Object.keys(documentTemplateDraftRef.current),
      ...(selectedTemplateId ? [selectedTemplateId] : []),
    ]);

    let nextSettings = baseSettings;
    for (const templateId of dirtyTemplateIds) {
      const draftHtml = documentTemplateDraftRef.current[templateId];
      if (!draftHtml) {
        continue;
      }

      const currentTemplate = nextSettings.documents.templates.find((template) => template.id === templateId);
      if (!currentTemplate) {
        continue;
      }

      nextSettings = {
        ...nextSettings,
        documents: {
          ...nextSettings.documents,
          templates: nextSettings.documents.templates.map((template) =>
            template.id === templateId ? { ...template, template: draftHtml, updatedAt: new Date() } : template
          ),
        },
      };
    }

    return nextSettings;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = syncTemplateEditorContent();
      setSettings(settingsToSave);
      const saved = await appSettingsService.saveSettings(settingsToSave);
      setSettings(saved);
      saved.documents.templates.forEach((template) => {
        documentTemplateDraftRef.current[template.id] = template.template;
      });
      if (selectedTemplateId) {
        setDocumentPreviewTemplate(documentTemplateDraftRef.current[selectedTemplateId] ?? '');
      }
      previewCrmTheme(saved);
      toast.success('Настройки сохранены');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить настройки на сервере'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLocation = () => {
    const value = newLocation.trim();
    if (!value) {
      toast.error('Введите название локации');
      return;
    }

    if (settings.locations.items.includes(value)) {
      toast.error('Такая локация уже есть');
      return;
    }

    if (locationLimitReached) {
      setPendingLocationName(value);
      localStorage.setItem('crm_pending_location_name', value);
      setIsLocationPaymentOpen(true);
      return;
    }

    setSettings((prev) => ({
      ...prev,
      locations: {
        items: Array.from(new Set([...prev.locations.items, value])),
      },
    }));
    setNewLocation('');
  };

  const applyPendingLocationIfAllowed = useCallback(
    (slots: number) => {
      const pending = pendingLocationName.trim();
      if (!pending) {
        return;
      }

      setSettings((prev) => {
        if (prev.locations.items.length >= slots || prev.locations.items.includes(pending)) {
          return prev;
        }

        return {
          ...prev,
          locations: {
            items: [...prev.locations.items, pending],
          },
        };
      });
      setPendingLocationName('');
      setNewLocation('');
      localStorage.removeItem('crm_pending_location_name');
      toast.success(`Локация «${pending}» добавлена`);
    },
    [pendingLocationName]
  );

  useEffect(() => {
    if (searchParams.get('paid') !== 'location') {
      return undefined;
    }

    let cancelled = false;

    const pollLocationPayment = async () => {
      try {
        const config = await platformService.getBillingConfig();
        if (cancelled) {
          return;
        }

        const slots = Math.max(1, Number(config.locationSlots || config.tenant?.locationSlots) || 1);
        setLocationSlots(slots);
        if (config.tenant) {
          void refreshUser();
        }

        if (slots > settingsRef.current.locations.items.length) {
          applyPendingLocationIfAllowed(slots);
          setIsLocationPaymentOpen(false);
          setSearchParams((params) => {
            params.delete('paid');
            return params;
          }, { replace: true });
        }
      } catch {
        // keep polling
      }
    };

    void pollLocationPayment();
    const timer = window.setInterval(() => {
      void pollLocationPayment();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [searchParams, setSearchParams, refreshUser, applyPendingLocationIfAllowed]);

  const refreshCashCategories = () => {
    setCashCategories(
      taxonomyService
        .getNodes('cash')
        .filter((node) => !node.parentId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    );
  };

  const handleAddCashCategory = async () => {
    const name = newCashCategory.trim();
    if (!name) {
      toast.error('Введите название статьи');
      return;
    }

    try {
      await taxonomyService.addNode('cash', name);
      await taxonomyService.refreshFromApi();
      refreshCashCategories();
      setNewCashCategory('');
      toast.success('Статья добавлена');
    } catch {
      toast.error('Не удалось добавить статью');
    }
  };

  const handleSaveCashCategory = async (nodeId: string) => {
    const name = editingCashCategoryName.trim();
    if (!name) {
      toast.error('Введите название статьи');
      return;
    }

    try {
      await taxonomyService.updateNode(nodeId, name);
      await taxonomyService.refreshFromApi();
      refreshCashCategories();
      setEditingCashCategoryId(null);
      setEditingCashCategoryName('');
      toast.success('Статья обновлена');
    } catch {
      toast.error('Не удалось сохранить статью');
    }
  };

  const handleRemoveCashCategory = async (nodeId: string) => {
    try {
      await taxonomyService.deleteNode(nodeId);
      await taxonomyService.refreshFromApi();
      refreshCashCategories();
      toast.success('Статья удалена');
    } catch {
      toast.error('Не удалось удалить статью');
    }
  };

  const handleRemoveLocation = (location: string) => {
    setSettings((prev) => ({
      ...prev,
      locations: {
        items: prev.locations.items.filter((item) => item !== location),
      },
    }));
  };

  const updateFormList = <K extends keyof AppSettings['forms']>(
    listKey: K,
    updater: (items: AppSettings['forms'][K]) => AppSettings['forms'][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      forms: {
        ...prev.forms,
        [listKey]: updater(prev.forms[listKey]),
      },
    }));
  };

  const handleAddFormItem = (listKey: 'clientFields') => {
    const label = newFormItems[listKey].trim();
    if (!label) {
      toast.error('Введите название');
      return;
    }

    updateFormList(listKey, (items) => {
      const sortOrder = items.length + 1;
      const code = label
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\wа-яё]/gi, '')
        .slice(0, 40) || `custom_${Date.now()}`;
      const base = {
        id: `${listKey}_${Date.now()}`,
        code,
        label,
        enabled: true,
        sortOrder,
      };

      if (listKey === 'clientFields') {
        return [...(items as any[]), { ...base, required: false }] as AppSettings['forms'][typeof listKey];
      }

      return [...(items as any[]), base] as AppSettings['forms'][typeof listKey];
    });

    setNewFormItems((prev) => ({ ...prev, [listKey]: '' }));
  };

  const handleRemoveFormItem = (listKey: keyof AppSettings['forms'], id: string) => {
    updateFormList(listKey, (items) =>
      items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sortOrder: index + 1 })) as AppSettings['forms'][typeof listKey]
    );
  };

  const createEmptyTemplate = (): DocumentTemplate => ({
    id: `tpl_custom_${Date.now()}`,
    name: 'Новый шаблон',
    type: 'custom',
    category: 'other',
    description: 'Произвольный шаблон.',
    template:
      '<h1>{{НазваниеДокумента}}</h1><p><strong>Номер заказа:</strong> {{НомерЗаказа}}</p><p><strong>Клиент:</strong> {{ФИОКлиента}}</p><p><strong>Дата:</strong> {{Дата}}</p>',
    variables: ['{{НазваниеДокумента}}', '{{НомерЗаказа}}', '{{ФИОКлиента}}', '{{Дата}}'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const handleCreateTemplate = () => {
    const nextTemplate = createEmptyTemplate();
    setSettings((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        templates: [...prev.documents.templates, nextTemplate],
      },
    }));
    setSelectedTemplateId(nextTemplate.id);
    toast.success('Новый шаблон создан');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setSettings((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        templates: prev.documents.templates.filter((template) => template.id !== templateId),
      },
    }));

    if (selectedTemplateId === templateId) {
      const nextId = settings.documents.templates.find((template) => template.id !== templateId)?.id || '';
      setSelectedTemplateId(nextId);
    }

    toast.success('Шаблон удалён');
  };

  const handleInsertVariable = (token: string) => {
    if (!selectedTemplate) {
      return;
    }

    const insertContent = buildDocumentTemplateEditorInsertHtml(
      token,
      selectedTemplate.type === 'completion' ? 'completion' : 'acceptance'
    );

    if (tinyEditorRef.current) {
      tinyEditorRef.current.focus();
      tinyEditorRef.current.insertContent(insertContent);
      const nextValue = normalizeDocumentTemplateFromEditor(
        tinyEditorRef.current.getContent(),
        selectedTemplate.type === 'completion' ? 'completion' : 'acceptance'
      );
      documentTemplateDraftRef.current[selectedTemplate.id] = nextValue;
      setDocumentPreviewTemplate(nextValue);
      updateTemplate(selectedTemplate.id, (template) => ({
        ...template,
        variables: Array.from(new Set([...(template.variables || []), token])),
      }));
      if (token === DOCUMENT_WORKS_TABLE_TOKEN) {
        toast.success('Таблица работ вставлена. CRM подставит реальные позиции при печати акта.');
      }
      if (token === DOCUMENT_CLIENT_DATA_TABLE_TOKEN) {
        toast.success('Таблица данных клиента вставлена. Можно редактировать ячейки и подписи — при печати подставятся данные заказа.');
      }
      return;
    }

    updateTemplate(selectedTemplate.id, (template) => ({
      ...template,
      template: `${template.template}${token}`,
      variables: Array.from(new Set([...(template.variables || []), token])),
    }));
  };

  const normalizeStatusCode = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\wа-яё-]/gi, '')
      .slice(0, 40);

  const buildPaymentMethodCode = (label: string, existingCodes: string[]) => {
    const base = normalizeStatusCode(label) || `method_${Date.now()}`;
    let code = base;
    let suffix = 2;
    while (existingCodes.includes(code)) {
      code = `${base}_${suffix}`;
      suffix += 1;
    }
    return code;
  };

  const handleAddPaymentMethod = () => {
    const label = newPaymentMethodLabel.trim();
    if (!label) {
      toast.error('Укажите название способа оплаты');
      return;
    }
    const existingCodes = settings.payment.paymentMethodOptions.map((item) => item.code);
    const code = buildPaymentMethodCode(label, existingCodes);
    setPaymentMethodOptions([
      ...settings.payment.paymentMethodOptions,
      {
        code,
        label,
        enabled: true,
        registerType: 'mixed',
      },
    ]);
    setNewPaymentMethodLabel('');
  };

  const setOrderStatuses = (nextStatuses: OrderStatusSetting[]) => {
    const sorted = [...nextStatuses].sort((a, b) => a.sortOrder - b.sortOrder);
    setCategoryValue('orders', 'statuses', sorted);
  };

  const handleAddOrderStatus = () => {
    const label = newStatusName.trim();
    const code = normalizeStatusCode(label);

    if (!label || !code) {
      toast.error('Укажите название статуса');
      return;
    }

    if (settings.orders.statuses.some((status) => status.code === code)) {
      toast.error('Статус с таким кодом уже существует');
      return;
    }

    setOrderStatuses([
      ...settings.orders.statuses,
      {
        id: `status_${Date.now()}`,
        code,
        label,
        color: '#3b82f6',
        enabled: true,
        isFinal: false,
        sortOrder: settings.orders.statuses.length + 1,
      },
    ]);
    setNewStatusName('');
  };

  const handleUpdateOrderStatus = (statusId: string, patch: Partial<OrderStatusSetting>) => {
    const currentStatus = settings.orders.statuses.find((status) => status.id === statusId);
    if (!currentStatus) {
      return;
    }

    const nextPatch = isSystemNewOrderStatus(currentStatus)
      ? patch.color
        ? { color: patch.color }
        : {}
      : patch;

    if (Object.keys(nextPatch).length === 0) {
      return;
    }

    setOrderStatuses(
      settings.orders.statuses.map((status) =>
        status.id === statusId
          ? {
              ...status,
              ...nextPatch,
            }
          : status
      )
    );
  };

  const handleRemoveOrderStatus = (statusId: string) => {
    const statusToRemove = settings.orders.statuses.find((status) => status.id === statusId);
    if (!statusToRemove) {
      return;
    }
    if (isSystemNewOrderStatus(statusToRemove)) {
      toast.error('Статус «Новый» нельзя удалить');
      return;
    }

    setOrderStatuses(
      settings.orders.statuses
        .filter((status) => status.id !== statusId)
        .map((status, index) => ({ ...status, sortOrder: index + 1 }))
    );
  };

  const handleInsertSmsVariable = (token: string) => {
    const currentValue = settings.integrations.smsStatusTemplates[selectedSmsStatusTemplate] || '';
    const textarea = smsTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart ?? currentValue.length;
      const end = textarea.selectionEnd ?? currentValue.length;
      const before = currentValue.slice(0, start);
      const after = currentValue.slice(end);
      const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
      const insert = `${needsLeadingSpace ? ' ' : ''}${token}`;
      const nextValue = `${before}${insert}${after}`;

      setNestedCategoryValue('integrations', 'smsStatusTemplates', selectedSmsStatusTemplate, nextValue);

      requestAnimationFrame(() => {
        const cursor = start + insert.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
      return;
    }

    const separator = currentValue.length > 0 && !/\s$/.test(currentValue) ? ' ' : '';
    setNestedCategoryValue(
      'integrations',
      'smsStatusTemplates',
      selectedSmsStatusTemplate,
      `${currentValue}${separator}${token}`
    );
  };

  const handleCloneTemplate = () => {
    if (!selectedTemplate) {
      return;
    }

    const copy: DocumentTemplate = {
      ...selectedTemplate,
      id: `tpl_copy_${Date.now()}`,
      name: `${selectedTemplate.name} (копия)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSettings((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        templates: [...prev.documents.templates, copy],
      },
    }));
    setSelectedTemplateId(copy.id);
    toast.success('Шаблон скопирован');
  };

  const handleExportTemplates = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      templates: settings.documents.templates,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `documents-templates-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Шаблоны экспортированы');
  };

  const handleImportTemplates = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as { templates?: DocumentTemplate[] };
      if (!Array.isArray(parsed.templates)) {
        throw new Error('Некорректный файл шаблона');
      }

      const imported = parsed.templates.map((template, index) => ({
        ...template,
        id: template.id || `tpl_import_${Date.now()}_${index}`,
        createdAt: new Date(template.createdAt || new Date()),
        updatedAt: new Date(),
      }));

      setSettings((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          templates: [...prev.documents.templates, ...imported],
        },
      }));

      if (imported[0]) {
        setSelectedTemplateId(imported[0].id);
      }

      toast.success(`Импортировано шаблонов: ${imported.length}`);
    } catch (error) {
      console.error(error);
      toast.error('Не удалось импортировать шаблон');
    } finally {
      event.target.value = '';
    }
  };

  const renderDocumentsSection = () => {
    const documentVariableGroups = buildDocumentVariableGroups(settings);
    const previewHtml = applyTemplateTokenValues(documentPreviewTemplate || selectedTemplate?.template || '', {
      '{{НазваниеДокумента}}': selectedTemplate?.name || 'Новый документ',
      '{{НазваниеКомпании}}': settings.business.companyName,
      '{{ТелефонКомпании}}': settings.business.phone,
      '{{EmailКомпании}}': settings.business.email,
      '{{АдресКомпании}}': settings.business.address,
      '{{ЧасыРаботы}}': settings.business.workingHours,
      '{{НомерЗаказа}}': '000123',
      '{{ФИОКлиента}}': 'Иван Петров',
      '{{ТелефонКлиента}}': '+7 999 123-45-67',
      '{{EmailКлиента}}': 'client@example.com',
      '{{АдресКлиента}}': 'Екатеринбург',
      '{{Устройство}}': 'Apple iPhone 15 Pro Max',
      '{{БрендУстройства}}': 'Apple',
      '{{МодельУстройства}}': 'iPhone 15 Pro Max',
      '{{Цвет}}': 'Черный',
      '{{СерийныйНомер}}': 'SN-123456',
      '{{IMEI}}': '123456789012345',
      '{{Пароль}}': '1234',
      '{{Комплектация}}': 'Кабель, коробка',
      '{{ВнешнийВид}}': 'Следы эксплуатации',
      '{{ОписаниеПроблемы}}': 'Не заряжается, требуется проверка разъема',
      '{{Диагностика}}': 'Неисправен разъем питания',
      '{{ОриентировочнаяСтоимость}}': '2 500 ₽',
      '{{ИтоговаяСтоимость}}': '4 900 ₽',
      '{{Аванс}}': '1 000 ₽',
      '{{Скидка}}': '0 ₽',
      '{{СпособОплаты}}': 'Наличные',
      '{{Долг}}': '3 900 ₽',
      '{{Работы}}': 'Замена разъема питания, Диагностика устройства',
      '{{ТаблицаДанныхКлиента}}': buildSampleDocumentClientDataTableHtml(
        selectedTemplate?.type === 'completion' ? 'completion' : 'acceptance'
      ),
      '{{ТаблицаРабот}}': buildSampleDocumentWorksTableHtml(),
      '{{Запчасти}}': 'Разъем зарядки',
      '{{Мастер}}': 'Иванов Алексей',
      '{{МенеджерПриёма}}': 'Петрова Мария',
      '{{МенеджерВыдачи}}': 'Петрова Мария',
      '{{Дата}}': new Date().toLocaleDateString('ru-RU'),
      '{{ДатаСоздания}}': new Date().toLocaleDateString('ru-RU'),
      '{{ДатаЗавершения}}': new Date().toLocaleDateString('ru-RU'),
      '{{ДатаПриёма}}': new Date().toLocaleDateString('ru-RU'),
      '{{ТекстГарантии}}': settings.documents.warrantyText,
      '{{ТекстВПодвале}}': settings.documents.footerDisclaimer,
      '{{Заметки}}': 'Проверить шлейф и питание',
      '{{Рекомендации}}': 'Рекомендуется замена кабеля',
      '{{СтатусЗаказа}}': 'Диагностика',
      '{{Приоритет}}': 'Средний',
      ...buildClientFieldPreviewValues(settings),
    });

    const documentEditorMinHeight = 320;
    const documentPreviewSx = {
      width: '100%',
      overflow: 'visible',
      p: 2,
      borderRadius: 2,
      border: '1px dashed',
      borderColor: 'divider',
      bgcolor: '#ffffff',
      color: '#111111',
      boxSizing: 'border-box' as const,
      '& h1, & h2, & h3': { mt: 0, color: '#13254b' },
      '& p': { mb: 1.5, lineHeight: 1.6, color: '#111111' },
      '& table': { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
      '& td, & th': {
        border: '1px solid #d7dee7',
        padding: '8px 10px',
        wordBreak: 'break-word',
        color: '#111111',
      },
    };

    return (
      <Stack spacing={2} sx={{ pr: { xs: 0.5, md: 1 } }}>
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 2,
            bgcolor: 'rgba(37, 99, 235, 0.06)',
            border: `1px solid ${'var(--crm-border)'}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Шаблоны для заказов, продаж и склада. Нажмите на переменную справа — она вставится в редактор.
          </Typography>
        </Box>

        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} lg={3} sx={{ alignSelf: 'flex-start' }}>
            <Card sx={{ ...panelCardSx, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1px solid ${'var(--crm-border)'}`, flexShrink: 0 }}>
                <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImportTemplates} />
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                  Шаблоны
                </Typography>
                <Stack direction="row" spacing={0.75}>
                  <Tooltip title="Импорт JSON">
                    <Button size="small" variant="outlined" onClick={() => importInputRef.current?.click()} sx={{ minWidth: 0, px: 1.25 }}>
                      <FileUpload fontSize="small" />
                    </Button>
                  </Tooltip>
                  <Tooltip title="Экспорт JSON">
                    <Button size="small" variant="outlined" onClick={handleExportTemplates} sx={{ minWidth: 0, px: 1.25 }}>
                      <FileDownload fontSize="small" />
                    </Button>
                  </Tooltip>
                  <Button size="small" variant="contained" startIcon={<Add />} onClick={handleCreateTemplate} sx={{ flex: 1 }}>
                    Создать
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ overflow: 'auto', px: 1.5, py: 1.5 }}>
                <Stack spacing={2}>
                  {documentCategories.map((group) => (
                    <Box key={group.value}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {group.label}
                        </Typography>
                        <Chip size="small" label={group.items.length} sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Stack>
                      <Stack spacing={0.75}>
                        {group.items.map((template) => {
                          const isSelected = selectedTemplateId === template.id;
                          return (
                            <Box
                              key={template.id}
                              onClick={() => handleSelectDocumentTemplate(template.id)}
                              sx={{
                                p: 1.25,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: isSelected ? 'primary.main' : 'var(--crm-border)',
                                bgcolor: isSelected ? 'rgba(234, 88, 12, 0.07)' : 'background.paper',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                                '&:hover': {
                                  borderColor: isSelected ? 'primary.main' : 'primary.light',
                                  bgcolor: isSelected ? 'rgba(234, 88, 12, 0.09)' : 'rgba(234, 88, 12, 0.03)',
                                },
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary', mt: 0.25, display: 'flex' }}>
                                  {template.type === 'completion' ? <AssignmentTurnedIn fontSize="small" /> : <Article fontSize="small" />}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={700} noWrap>
                                    {template.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                                    {template.description || documentTypeOptions.find((item) => item.value === template.type)?.label}
                                  </Typography>
                                </Box>
                                {isSelected && (
                                  <Stack direction="row" spacing={0.25} onClick={(event) => event.stopPropagation()}>
                                    <Tooltip title="Дублировать">
                                      <IconButton size="small" color="primary" onClick={handleCloneTemplate}>
                                        <ContentCopy fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Удалить">
                                      <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(template.id)}>
                                        <DeleteOutline fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                )}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} lg={9}>
            {!selectedTemplate ? (
              <Card sx={{ ...panelCardSx, height: '100%' }}>
                <CardContent sx={{ py: 6, textAlign: 'center' }}>
                  <Article sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography fontWeight={700}>Выберите шаблон слева</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Или создайте новый документ кнопкой «Создать».
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={2}>
                <Card sx={panelCardSx}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Название документа"
                        value={selectedTemplate.name}
                        onChange={(event) =>
                          updateTemplate(selectedTemplate.id, (template) => ({ ...template, name: event.target.value }))
                        }
                      />
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          flexShrink: 0,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 2,
                          bgcolor: 'background.default',
                          border: `1px solid ${'var(--crm-border)'}`,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          Активен
                        </Typography>
                        <Switch
                          size="small"
                          checked={selectedTemplate.isActive}
                          onChange={(event) =>
                            updateTemplate(selectedTemplate.id, (template) => ({ ...template, isActive: event.target.checked }))
                          }
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Grid container spacing={2} alignItems="stretch" sx={{ width: '100%', m: 0 }}>
                  <Grid item xs={12} xl={8} sx={{ pl: '0 !important' }}>
                    <Card sx={{ ...panelCardSx, width: '100%', height: '100%' }}>
                      <Box sx={{ px: 2, pt: 1.75, pb: 1, borderBottom: `1px solid ${'var(--crm-border)'}` }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          HTML шаблон
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Поддерживаются HTML и переменные вида {'{{ФИОКлиента}}'}
                        </Typography>
                        {(selectedTemplate.type === 'completion' || selectedTemplate.type === 'acceptance') && (
                          <Alert severity="info" sx={{ mt: 1.25, py: 0.5 }}>
                            {selectedTemplate.type === 'completion'
                              ? 'Для таблицы работ нажмите «Таблица работ» справа. Для блока клиента/устройства/ремонта — «Таблица данных клиента». CRM подставит реальные данные при печати.'
                              : 'Для блока клиента, устройства и ремонта нажмите «Таблица данных клиента» справа — CRM подставит данные заказа при печати акта.'}
                          </Alert>
                        )}
                      </Box>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ borderRadius: 2, border: `1px solid ${'var(--crm-border)'}` }}>
                          <TinyMceEditor
                            key={`${selectedTemplate.id}-${documentEditorRevision}`}
                            initialValue={decorateDocumentTemplateForEditor(
                              documentTemplateDraftRef.current[selectedTemplate.id] ?? selectedTemplate.template,
                              selectedTemplate.type === 'completion' ? 'completion' : 'acceptance'
                            )}
                            autoResize
                            minHeight={documentEditorMinHeight}
                            onReady={handleDocumentEditorReady}
                            onChange={handleDocumentEditorChange}
                          />
                        </Box>
                        <Box sx={{ mt: 1.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Preview color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={700}>
                              Как увидит клиент
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              (примерные данные)
                            </Typography>
                          </Stack>
                          <Box sx={documentPreviewSx} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} xl={4} sx={{ pr: { xs: '8px !important', xl: '20px !important' }, pl: { xl: '8px !important' } }}>
                    <Box sx={{ pr: { xs: 1, md: 2 }, boxSizing: 'border-box', height: '100%' }}>
                      <Card
                        sx={{
                          ...panelCardSx,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          height: '100%',
                          minHeight: 320,
                        }}
                      >
                        <Box sx={{ px: 2, pr: 3, pt: 1.75, pb: 1, borderBottom: `1px solid ${'var(--crm-border)'}`, flexShrink: 0 }}>
                          <Typography variant="subtitle1" fontWeight={800}>
                            Переменные
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Клик — вставка в шаблон
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            pl: 2,
                            pr: 3,
                            py: 1.5,
                            boxSizing: 'border-box',
                            scrollbarGutter: 'stable',
                          }}
                        >
                          <Stack spacing={1.75} divider={<Divider flexItem />} sx={{ pr: 1 }}>
                            {documentVariableGroups.map((group) => (
                              <Box key={group.title} sx={{ pr: 1 }}>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  color="text.secondary"
                                  sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}
                                >
                                  {group.title}
                                </Typography>
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ maxWidth: '100%' }}>
                                  {group.variables.map((variable) => (
                                    <Tooltip key={variable.token} title={variable.token} arrow>
                                      <Chip
                                        label={variable.label}
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleInsertVariable(variable.token)}
                                        sx={{
                                          cursor: 'pointer',
                                          height: 'auto',
                                          borderRadius: 1.5,
                                          bgcolor: 'background.paper',
                                          borderColor: 'var(--crm-border)',
                                          transition: 'background-color 0.15s ease, border-color 0.15s ease',
                                          '& .MuiChip-label': {
                                            whiteSpace: 'normal',
                                            py: 0.5,
                                            lineHeight: 1.3,
                                            color: 'var(--crm-color-ink)',
                                          },
                                          '&:hover': {
                                            bgcolor: 'var(--crm-color-primary)',
                                            borderColor: 'var(--crm-color-primary-dark)',
                                            '& .MuiChip-label': {
                                              color: '#ffffff',
                                            },
                                          },
                                        }}
                                      />
                                    </Tooltip>
                                  ))}
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Card>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </Grid>
        </Grid>
      </Stack>
    );
  };

  const renderFormsEditor = (
    listKey: 'clientFields',
    options?: { withRequired?: boolean; hint?: string }
  ) => {
    const items = settings.forms[listKey];
    return (
      <Stack spacing={2}>
        {options?.hint && renderSectionIntro(options.hint)}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Новый элемент"
            value={newFormItems[listKey]}
            onChange={(event) => setNewFormItems((prev) => ({ ...prev, [listKey]: event.target.value }))}
          />
          <Button variant="contained" startIcon={<Add />} onClick={() => handleAddFormItem(listKey)}>
            Добавить
          </Button>
        </Stack>
        {items.length === 0 && (
          <Alert severity="info">Элементов пока нет. Добавьте первый через поле выше.</Alert>
        )}
        {items.length > 0 && (
        <Card sx={panelCardSx}>
          <CardContent>
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Box key={item.id} sx={{ p: 1.5, border: `1px solid ${'var(--crm-border)'}`, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
                  <TextField
                    size="small"
                    sx={{ flex: 1 }}
                    label="Название"
                    value={item.label}
                    onChange={(event) =>
                      updateFormList(listKey, (list) =>
                        list.map((entry) => (entry.id === item.id ? { ...entry, label: event.target.value } : entry)) as AppSettings['forms'][typeof listKey]
                      )
                    }
                  />
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" color="text.secondary">Включен</Typography>
                    <Switch
                      checked={item.enabled}
                      onChange={(event) =>
                        updateFormList(listKey, (list) =>
                          list.map((entry) => (entry.id === item.id ? { ...entry, enabled: event.target.checked } : entry)) as AppSettings['forms'][typeof listKey]
                        )
                      }
                    />
                  </Stack>
                  {Boolean(options?.withRequired) && 'required' in item && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" color="text.secondary">Обязательное</Typography>
                      <Switch
                        checked={Boolean((item as any).required)}
                        onChange={(event) =>
                          updateFormList(listKey, (list) =>
                            list.map((entry) =>
                              entry.id === item.id ? { ...entry, required: event.target.checked } : entry
                            ) as AppSettings['forms'][typeof listKey]
                          )
                        }
                      />
                    </Stack>
                  )}
                  <IconButton color="error" onClick={() => handleRemoveFormItem(listKey, item.id)}>
                    <DeleteOutline />
                  </IconButton>
                </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
        )}
      </Stack>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <Stack spacing={2.5}>
            {renderAppearanceThemePanel()}
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Готовые темы
                </Typography>
                <Grid container spacing={1.5}>
                  {APPEARANCE_PRESET_OPTIONS.map((preset) => {
                    const isSelected = settings.appearance.preset === preset.id;
                    return (
                      <Grid item xs={6} sm={4} md={3} key={preset.id}>
                        <Box
                          onClick={() => applyAppearancePreset(preset.id)}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 2.5,
                            border: isSelected ? `2px solid ${preset.preview}` : `1px solid ${'var(--crm-border)'}`,
                            p: 1.5,
                            bgcolor: 'background.paper',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              height: 44,
                              borderRadius: 1.5,
                              mb: 1,
                              background: `linear-gradient(135deg, ${preset.preview} 0%, ${APPEARANCE_PRESETS[preset.id]?.sidebarColor || '#0f172a'} 100%)`,
                            }}
                          />
                          <Typography fontWeight={700} fontSize={14}>
                            {preset.label}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>

            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Цвета интерфейса
                </Typography>
                <Grid container spacing={2}>
                  {([
                    ['primaryColor', 'Основной акцент'],
                    ['primaryLight', 'Светлый акцент'],
                    ['primaryDark', 'Тёмный акцент'],
                    ['secondaryColor', 'Вторичный цвет'],
                    ['sidebarColor', 'Боковое меню'],
                    ['surfaceColor', 'Фон страниц'],
                    ['inkColor', 'Основной текст'],
                  ] as const).map(([field, label]) => (
                    <Grid item xs={12} sm={6} md={4} key={field}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          component="input"
                          type="color"
                          value={settings.appearance[field]}
                          onChange={(event) => setAppearanceValue(field, event.target.value)}
                          sx={{
                            width: 48,
                            height: 48,
                            border: `1px solid ${'var(--crm-border)'}`,
                            borderRadius: 1.5,
                            p: 0.5,
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                          }}
                        />
                        <TextField
                          fullWidth
                          label={label}
                          value={settings.appearance[field]}
                          onChange={(event) => setAppearanceValue(field, event.target.value)}
                        />
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Предпросмотр
                </Typography>
                <Box
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${appearancePreview.colors.line}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '220px 1fr' },
                      minHeight: 180,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        background: appearancePreview.gradients.sidebar,
                        color: '#fff',
                      }}
                    >
                      <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                        CRM
                      </Typography>
                      <Box
                        sx={{
                          mt: 1.5,
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          background: appearancePreview.gradients.active,
                          border: `1px solid ${appearancePreview.colors.primaryLight}47`,
                        }}
                      >
                        Активный раздел
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255,255,255,0.72)' }}>
                        Боковое меню
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2.5, bgcolor: appearancePreview.colors.surface }}>
                      <Typography sx={{ color: appearancePreview.colors.ink, fontWeight: 800, mb: 1.5 }}>
                        Рабочая область
                      </Typography>
                      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                        <Button variant="contained" sx={{ bgcolor: appearancePreview.colors.primary, '&:hover': { bgcolor: appearancePreview.colors.primaryDark } }}>
                          Основная кнопка
                        </Button>
                        <Button variant="outlined" sx={{ borderColor: appearancePreview.colors.secondary, color: appearancePreview.colors.secondary }}>
                          Вторичная
                        </Button>
                        <Chip label="Акцент" sx={{ bgcolor: `${appearancePreview.colors.primary}22`, color: appearancePreview.colors.primaryDark }} />
                      </Stack>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Stack direction="row" justifyContent="flex-end">
              <Button variant="outlined" startIcon={<Refresh />} onClick={handleResetAppearance}>
                Сбросить к основной теме
              </Button>
            </Stack>
          </Stack>
        );
      case 'business':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Реквизиты компании подставляются в документы, письма клиентам и печатные формы. Email используется как контакт для клиентов.'
            )}
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Основные данные
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Box
                        sx={{
                          width: 96,
                          height: 96,
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
                          <Typography variant="caption" color="text.secondary">
                            Логотип
                          </Typography>
                        )}
                      </Box>
                      <Stack spacing={1}>
                        <Button component="label" variant="outlined" startIcon={<FileUpload />}>
                          Загрузить логотип
                          <input
                            hidden
                            accept="image/*"
                            type="file"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file || file.size > MAX_LOGO_BYTES) {
                                if (file) {
                                  toast.error(`Логотип не больше ${MAX_LOGO_LABEL}`);
                                }
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => setCategoryValue('business', 'logoUrl', String(reader.result || ''));
                              reader.readAsDataURL(file);
                              event.target.value = '';
                            }}
                          />
                        </Button>
                        {settings.business.logoUrl ? (
                          <Button color="inherit" onClick={() => setCategoryValue('business', 'logoUrl', '')}>
                            Удалить логотип
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Название компании" value={settings.business.companyName} onChange={(event) => setCategoryValue('business', 'companyName', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Телефон" value={settings.business.phone} onChange={(event) => setCategoryValue('business', 'phone', event.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Адрес" value={settings.business.address} onChange={(event) => setCategoryValue('business', 'address', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Email" value={settings.business.email} onChange={(event) => setCategoryValue('business', 'email', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Часы работы" value={settings.business.workingHours} onChange={(event) => setCategoryValue('business', 'workingHours', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Часовой пояс</InputLabel>
                      <Select value={settings.business.timezone} label="Часовой пояс" onChange={(event) => setCategoryValue('business', 'timezone', event.target.value)}>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <MenuItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        );
      case 'locations':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Локации — ваши склады и точки приёма заказов. Они используются в заказах, на складе и в быстрых продажах. Первая локация включена в подписку, каждая дополнительная оплачивается отдельно.'
            )}
            <Alert severity={locationLimitReached ? 'warning' : 'info'}>
              Использовано локаций: <strong>{locationsCount}</strong> из <strong>{locationSlots}</strong>
              {locationLimitReached
                ? '. Чтобы добавить ещё одну, оплатите подписку для дополнительной локации.'
                : billingEnabled
                  ? '. Можно добавить ещё ' + Math.max(0, locationSlots - locationsCount) + '.'
                  : '.'}
            </Alert>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Новая локация"
                value={newLocation}
                onChange={(event) => setNewLocation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleAddLocation();
                  }
                }}
              />
              <Button variant="contained" startIcon={<Add />} onClick={handleAddLocation} sx={{ flexShrink: 0 }}>
                {locationLimitReached ? 'Оплатить и добавить' : 'Добавить'}
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {settings.locations.items.length === 0 && (
                <Alert severity="info">Локаций пока нет. Добавьте первую — например «Центр» или «Филиал».</Alert>
              )}
              {settings.locations.items.map((location) => (
                <Card key={location} sx={panelCardSx}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography fontWeight={700}>{location}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Доступна в заказах и документах.
                        </Typography>
                      </Box>
                      <Button color="error" variant="outlined" onClick={() => handleRemoveLocation(location)}>
                        Убрать
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        );
      case 'employees':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Параметры по умолчанию для новых сотрудников. Права доступа к разделам CRM и настройкам задаются индивидуально в разделе «Сотрудники».'
            )}
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Тарифы и смена по умолчанию
                </Typography>
                <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="Процент за приемку" value={settings.employees.defaultIntakeRate} onChange={(event) => setCategoryValue('employees', 'defaultIntakeRate', Number(event.target.value) || 0)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="Процент за исполнение" value={settings.employees.defaultExecutionRate} onChange={(event) => setCategoryValue('employees', 'defaultExecutionRate', Number(event.target.value) || 0)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="Процент за выдачу" value={settings.employees.defaultDeliveryRate} onChange={(event) => setCategoryValue('employees', 'defaultDeliveryRate', Number(event.target.value) || 0)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="time" label="Начало рабочего дня" value={settings.employees.defaultWorkStartTime} onChange={(event) => setCategoryValue('employees', 'defaultWorkStartTime', event.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="time" label="Конец рабочего дня" value={settings.employees.defaultWorkEndTime} onChange={(event) => setCategoryValue('employees', 'defaultWorkEndTime', event.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Индивидуальные проценты задаются в разделе «Сотрудники» на странице сотрудников.
                </Typography>
              </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Alert severity="info">
              Индивидуальные права доступа (разделы CRM, разделы настроек в «Мой профиль», редактирование аватара и телефона) настраиваются в карточке каждого сотрудника.
            </Alert>
          </Stack>
        );
      case 'profile':
        return null;
      case 'documents':
        return renderDocumentsSection();
      case 'integrations':
      case 'sms':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Сначала подключите SMS-провайдера, затем настройте тексты и включите отправку по статусам заказа.'
            )}
            <SmsProviderSetup
              settings={settings}
              onChange={setSettings}
              onSave={appSettingsService.saveSettings.bind(appSettingsService)}
            />

            {settings.integrations.smsConnected && settings.integrations.smsProvider !== 'none' ? (
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Тексты SMS по статусам</Typography>
                <Grid container spacing={2}>
            <Grid item xs={12}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Typography variant="body2" color="text.secondary">
                  Включите «SMS уведомления» в разделе «Уведомления», если ещё не включены.
                </Typography>
                <Switch
                  checked={Boolean(settings.notifications.smsNotifications)}
                  onChange={(event) => setCategoryValue('notifications', 'smsNotifications', event.target.checked)}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Статус для шаблона</InputLabel>
                <Select
                  value={selectedSmsStatusTemplate}
                  label="Статус для шаблона"
                  onChange={(event) => setSelectedSmsStatusTemplate(event.target.value)}
                >
                  {smsStatusOptions.map((option) => (
                    <MenuItem key={option.key} value={option.key}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Alert severity="info">
                Выберите статус, напишите текст и нажимайте переменные ниже. CRM сама подставит значения при отправке.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                inputRef={smsTextareaRef}
                fullWidth
                multiline
                minRows={5}
                value={settings.integrations.smsStatusTemplates[selectedSmsStatusTemplate] || ''}
                onChange={(event) =>
                  setNestedCategoryValue(
                    'integrations',
                    'smsStatusTemplates',
                    selectedSmsStatusTemplate,
                    event.target.value
                  )
                }
                placeholder="Здравствуйте, {{ФИОКлиента}}. Ваш заказ {{НомерЗаказа}} готов..."
                helperText="Переменная {{telegramBotLink}} — персональная ссылка t.me для клиента. Вставьте в шаблон — подставится только при отправке. Лучше поставить в конец текста с новой строки."
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Переменные для вставки
              </Typography>
              <Stack spacing={1.5}>
                {smsVariableGroups.map((group) => (
                  <Stack key={group.title} direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="body2" sx={{ minWidth: 90 }}>
                      {group.title}:
                    </Typography>
                    {group.variables.map((item) => (
                      <Chip
                        key={`${group.title}-${item.token}`}
                        label={item.label}
                        size="small"
                        variant="outlined"
                        onClick={() => handleInsertSmsVariable(item.token)}
                        sx={variableChipSx}
                      />
                    ))}
                  </Stack>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                Отправка по статусам
              </Typography>
              <Grid container spacing={1.5}>
                {orderStatusOptions.map((status) => (
                  <Grid item xs={12} md={6} key={`sms-trigger-integrations-${status.code}`}>
                    <Box sx={{ px: 2, py: 1.5, border: `1px solid ${'var(--crm-border)'}`, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography fontWeight={700}>{status.label}</Typography>
                        <Switch
                          checked={Boolean(settings.notifications.smsStatusTriggers[status.code])}
                          onChange={(event) => handleSmsTriggerChange(status.code, event.target.checked)}
                        />
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>

                </Grid>
              </CardContent>
            </Card>
            ) : (
              <Alert severity="info">
                После подключения SMS-провайдера здесь появятся шаблоны сообщений и переключатели отправки по статусам.
              </Alert>
            )}

            <TelegramProviderSetup
              settings={settings}
              onChange={setSettings}
              onSave={appSettingsService.saveSettings.bind(appSettingsService)}
            />

            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Telegram — режим ссылки</Typography>
                <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Режим Telegram</InputLabel>
                <Select value={settings.integrations.telegramMode} label="Режим Telegram" onChange={(event) => setCategoryValue('integrations', 'telegramMode', event.target.value)}>
                  <MenuItem value="crm">Только окно CRM</MenuItem>
                  <MenuItem value="crm_and_link">CRM + внешняя ссылка</MenuItem>
                  <MenuItem value="link_only">Только внешняя ссылка</MenuItem>
                  <MenuItem value="custom">Кастомный шаблон</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Шаблон ссылки Telegram" value={settings.integrations.telegramLinkTemplate} onChange={(event) => setCategoryValue('integrations', 'telegramLinkTemplate', event.target.value)} helperText="Переменные: {{telegramBotLink}}, {{telegramStartParam}}, {{messageEncoded}}, {{siteUrl}}, {{siteUrlEncoded}}, {{НомерЗаказа}}" />
            </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Звонок</Typography>
                <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Режим звонка</InputLabel>
                <Select value={settings.integrations.callMode} label="Режим звонка" onChange={(event) => setCategoryValue('integrations', 'callMode', event.target.value)}>
                  <MenuItem value="tel">tel: ссылка</MenuItem>
                  <MenuItem value="custom">Кастомный шаблон</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Шаблон звонка" value={settings.integrations.callLinkTemplate} onChange={(event) => setCategoryValue('integrations', 'callLinkTemplate', event.target.value)} helperText="Примеры: tel:{{phone}} или deep link сервиса телефонии. Переменные: {{phone}}, {{phoneDigits}}" />
            </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        );
      case 'license':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro('Текущая подписка организации и оплата доступа к CRM.')}
            <Card sx={panelCardSx}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        {subscriptionSummary.title}
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        {subscriptionSummary.planName}
                      </Typography>
                    </Box>
                    <Chip
                      label={subscriptionSummary.statusHint}
                      color={
                        subscriptionSummary.severity === 'success'
                          ? 'success'
                          : subscriptionSummary.severity === 'warning'
                            ? 'warning'
                            : subscriptionSummary.severity === 'error'
                              ? 'error'
                              : 'info'
                      }
                    />
                  </Stack>
                  {subscriptionSummary.endsAtLabel ? (
                    <Alert severity={subscriptionSummary.severity}>
                      Подписка действует до <strong>{subscriptionSummary.endsAtLabel}</strong>
                      {subscriptionSummary.daysRemaining != null
                        ? ` (осталось ${formatDaysRemaining(subscriptionSummary.daysRemaining)})`
                        : ''}
                      .
                    </Alert>
                  ) : (
                    <Alert severity="info">{subscriptionSummary.statusHint}</Alert>
                  )}
                  {subscriptionSummary.canPay ? (
                    <SubscriptionPlanPicker
                      billingEnabled={billingEnabled}
                      isLoading={billingLoading}
                      monthlyPrice={monthlyPrice}
                      compact
                      payButtonLabel="Оплатить подписку"
                    />
                  ) : (
                    <Alert severity="error">Для возобновления доступа свяжитесь с поддержкой платформы.</Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        );
      case 'orders':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Базовые параметры оформления заказов. Дополнительные поля клиента настраиваются в разделе «Поля клиента».'
            )}
            <Card sx={panelCardSx}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Приоритет по умолчанию</InputLabel>
                      <Select value={settings.orders.defaultPriority} label="Приоритет по умолчанию" onChange={(event) => setCategoryValue('orders', 'defaultPriority', event.target.value)}>
                        <MenuItem value="low">Низкий</MenuItem>
                        <MenuItem value="medium">Средний</MenuItem>
                        <MenuItem value="high">Высокий</MenuItem>
                        <MenuItem value="urgent">Срочный</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Формат создания заказа</InputLabel>
                      <Select
                        value={settings.orders.createMode}
                        label="Формат создания заказа"
                        onChange={(event) => setCategoryValue('orders', 'createMode', event.target.value)}
                      >
                        <MenuItem value="step">Пошагово</MenuItem>
                        <MenuItem value="single">Одна форма целиком</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ minHeight: 56, px: 2, py: 1, border: `1px solid ${'var(--crm-border)'}`, borderRadius: 2, bgcolor: 'background.paper' }}
                    >
                      <Box>
                        <Typography fontWeight={700}>Автоматически открывать акт выполненных работ после оплаты</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Используется в финальном сценарии выдачи заказа.
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.orders.autoOpenCompletionAfterPayment}
                        onChange={(event) => setCategoryValue('orders', 'autoOpenCompletionAfterPayment', event.target.checked)}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        );
      case 'quickSales':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Настройте кнопки быстрых продаж на странице заказов: название, цвет, товар и цена по умолчанию.'
            )}
            <Card sx={panelCardSx}>
              <CardContent>
                <QuickSaleButtonsEditor
                  options={settings.orders.quickSaleOptions}
                  onChange={(quickSaleOptions) => setCategoryValue('orders', 'quickSaleOptions', quickSaleOptions)}
                />
              </CardContent>
            </Card>
          </Stack>
        );
      case 'statuses':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Статусы заказов в CRM: добавление, отключение, финальные статусы и цвета в списке заказов.'
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Новый статус"
                value={newStatusName}
                onChange={(event) => setNewStatusName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleAddOrderStatus();
                  }
                }}
              />
              <Button variant="contained" startIcon={<Add />} onClick={handleAddOrderStatus} sx={{ flexShrink: 0 }}>
                Добавить статус
              </Button>
            </Stack>
            <Stack spacing={1.5}>
            {orderStatusOptions.length === 0 && (
              <Alert severity="info">Статусов пока нет. Добавьте первый — например «Принят» или «В работе».</Alert>
            )}
            {orderStatusOptions.map((status) => (
                <Card key={status.id} sx={panelCardSx}>
                  <CardContent>
                    {isSystemNewOrderStatus(status) ? (
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Typography fontWeight={800}>{status.label}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Базовый статус для новых заказов. Можно изменить только цвет.
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            type="color"
                            fullWidth
                            label="Цвет"
                            value={status.color}
                            onChange={(event) => handleUpdateOrderStatus(status.id, { color: event.target.value })}
                          />
                        </Grid>
                      </Grid>
                    ) : (
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <TextField fullWidth label="Название статуса" value={status.label} onChange={(event) => handleUpdateOrderStatus(status.id, { label: event.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField type="color" fullWidth label="Цвет" value={status.color} onChange={(event) => handleUpdateOrderStatus(status.id, { color: event.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">Активен</Typography>
                          <Switch checked={status.enabled} onChange={(event) => handleUpdateOrderStatus(status.id, { enabled: event.target.checked })} />
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">Финальный</Typography>
                          <Switch checked={status.isFinal} onChange={(event) => handleUpdateOrderStatus(status.id, { isFinal: event.target.checked })} />
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md="auto">
                        <IconButton color="error" onClick={() => handleRemoveOrderStatus(status.id)}>
                          <DeleteOutline />
                        </IconButton>
                      </Grid>
                    </Grid>
                    )}
                  </CardContent>
                </Card>
            ))}
            </Stack>
          </Stack>
        );
        case 'notifications':
        case 'email':
          return (
            <Stack spacing={2}>
              {renderSectionIntro(
                'SMS-клиентам при смене статуса заказа. Тексты сообщений настраиваются в разделе «Интеграции и SMS».'
              )}
              <Card sx={panelCardSx}>
                <CardContent sx={{ py: 1.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography fontWeight={700}>SMS уведомления</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Общий выключатель автоматической и ручной отправки SMS клиентам.
                      </Typography>
                    </Box>
                    <Switch
                      checked={Boolean(settings.notifications.smsNotifications)}
                      onChange={(event) => setCategoryValue('notifications', 'smsNotifications', event.target.checked)}
                    />
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={panelCardSx}>
                <CardContent sx={{ py: 1.5 }}>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={800}>SMS по статусам заказа</Typography>
                    <Typography variant="body2" color="text.secondary">
                      При смене статуса CRM отправит SMS, если провайдер подключён и для статуса настроен текст.
                    </Typography>
                    <Grid container spacing={1.5}>
                      {orderStatusOptions.map((status) => (
                        <Grid item xs={12} md={6} key={`sms-trigger-${status.code}`}>
                          <Box sx={{ px: 2, py: 1.5, border: `1px solid ${'var(--crm-border)'}`, borderRadius: 2, bgcolor: 'background.paper' }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography fontWeight={700}>{status.label}</Typography>
                                <Switch
                                  checked={Boolean(settings.notifications.smsStatusTriggers[status.code])}
                                  onChange={(event) => handleSmsTriggerChange(status.code, event.target.checked)}
                                />
                              </Stack>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          );
      case 'paymentCategories':
        return (
          <Stack spacing={2}>
            {renderSectionIntro(
              'Статьи движения денег используются в кассе при оформлении приходов и расходов. Изменения сразу доступны в разделе «Касса».'
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Новая статья"
                value={newCashCategory}
                onChange={(event) => setNewCashCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleAddCashCategory();
                  }
                }}
              />
              <Button variant="contained" startIcon={<Add />} onClick={() => void handleAddCashCategory()} sx={{ flexShrink: 0 }}>
                Добавить
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {cashCategories.length === 0 && (
                <Alert severity="info">Пока нет статей. Добавьте первую — например «Ремонт» или «Продажи».</Alert>
              )}
              {cashCategories.map((category) => (
                <Card key={category.id} sx={panelCardSx}>
                  <CardContent sx={{ py: 1.5 }}>
                    {editingCashCategoryId === category.id ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Название статьи"
                          value={editingCashCategoryName}
                          onChange={(event) => setEditingCashCategoryName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              void handleSaveCashCategory(category.id);
                            }
                          }}
                        />
                        <Button variant="contained" onClick={() => void handleSaveCashCategory(category.id)}>
                          Сохранить
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => {
                            setEditingCashCategoryId(null);
                            setEditingCashCategoryName('');
                          }}
                        >
                          Отмена
                        </Button>
                      </Stack>
                    ) : (
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Box>
                          <Typography fontWeight={700}>{category.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Используется в операциях кассы.
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setEditingCashCategoryId(category.id);
                              setEditingCashCategoryName(category.name);
                            }}
                          >
                            Изменить
                          </Button>
                          <Button color="error" onClick={() => void handleRemoveCashCategory(category.id)}>
                            Удалить
                          </Button>
                        </Stack>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        );
      case 'paymentMethods':
        return (
          <Stack spacing={2.5}>
            {renderSectionIntro(
              'Способы оплаты для кассы, заказов и быстрых продаж. Статьи движения денег настраиваются в «Категории платежей».'
            )}
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Валюта
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Валюта</InputLabel>
                      <Select value={settings.payment.currency} label="Валюта" onChange={(event) => setCategoryValue('payment', 'currency', event.target.value)}>
                        {CURRENCY_OPTIONS.map((currency) => (
                          <MenuItem key={currency.code} value={currency.code}>
                            {currency.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="number" label="Налог, %" value={settings.payment.taxRate} onChange={(event) => setCategoryValue('payment', 'taxRate', Number(event.target.value) || 0)} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Способы оплаты
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Название способа оплаты"
                    value={newPaymentMethodLabel}
                    onChange={(event) => setNewPaymentMethodLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddPaymentMethod();
                      }
                    }}
                  />
                  <Button variant="contained" startIcon={<Add />} onClick={handleAddPaymentMethod} sx={{ flexShrink: 0 }}>
                    Добавить
                  </Button>
                </Stack>
                <Stack spacing={1.25}>
                  {settings.payment.paymentMethodOptions.length === 0 && (
                    <Alert severity="info">Способов оплаты пока нет. Добавьте наличные, терминал или перевод.</Alert>
                  )}
                  {settings.payment.paymentMethodOptions.map((method) => (
                    <Box key={method.code} sx={{ p: 1.5, border: `1px solid ${'var(--crm-border)'}`, borderRadius: 2, bgcolor: 'background.paper' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                          <TextField
                            size="small"
                            sx={{ flex: 1 }}
                            label="Название"
                            value={method.label}
                            onChange={(event) =>
                              setPaymentMethodOptions(
                                settings.payment.paymentMethodOptions.map((item) =>
                                  item.code === method.code ? { ...item, label: event.target.value } : item
                                )
                              )
                            }
                          />
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" color="text.secondary">Включен</Typography>
                            <Switch
                              checked={method.enabled}
                              onChange={(event) =>
                                setPaymentMethodOptions(
                                  settings.payment.paymentMethodOptions.map((item) =>
                                    item.code === method.code ? { ...item, enabled: event.target.checked } : item
                                  )
                                )
                              }
                            />
                          </Stack>
                          <IconButton
                            color="error"
                            onClick={() =>
                              setPaymentMethodOptions(settings.payment.paymentMethodOptions.filter((item) => item.code !== method.code))
                            }
                          >
                            <DeleteOutline />
                          </IconButton>
                        </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        );
      case 'clientFields':
        return renderFormsEditor('clientFields', {
          withRequired: true,
          hint: 'Поля клиента используются в форме создания заказа и в карточке клиента.',
        });
      default:
        return null;
    }
  };

  const resolvedActiveSection: SettingsSectionKey =
    activeSection === 'email' ? 'notifications' : activeSection === 'sms' ? 'integrations' : activeSection;

  const activeSectionMeta = visibleSettingsGroups
    .flatMap((group) => group.items)
    .find((item) => item.key === resolvedActiveSection);

  const handleOpenSectionDialog = (sectionKey: SettingsSectionKey) => {
    if (sectionKey === 'profile') {
      navigate('/my-profile');
      return;
    }
    if (!canAccessSettingsSection(user, sectionKey)) {
      toast.error('У вас нет доступа к этому разделу настроек');
      return;
    }
    const nextSection = resolveSettingsSectionKey(sectionKey);
    setActiveSection(nextSection);
    setIsSectionDialogOpen(true);
  };

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', letterSpacing: 1.4 }}>
          CRM · СИСТЕМА
        </Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 1.5, color: 'common.white' }}>
          Настройки платформы
        </Typography>
        <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)' }}>
          {isAdmin
            ? 'Единый центр настроек по компании, заказам, документам, уведомлениям, платежам и интеграциям.'
            : 'Разделы настроек, которые администратор открыл для вашей учётной записи.'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SettingsStatCard
            label="Уведомлений включено"
            value={enabledNotificationCount}
            caption={`из ${totalNotificationCount} каналов`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SettingsStatCard
            label="Локаций"
            value={locationsCount}
            caption={locationsCount === 0 ? 'добавьте первую точку' : 'активных точек'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SettingsStatCard
            label="Способов оплаты"
            value={paymentMethodsCount}
            caption={settings.payment.installmentEnabled ? 'включая рассрочку' : 'в заказах и кассе'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isAdmin ? (
            <SettingsStatCard
              label="Подписка"
              value={subscriptionStatValue}
              caption={subscriptionStatCaption}
              onClick={handleOpenSubscription}
              disabled={!subscriptionSummary.canPay}
            />
          ) : (
            <SettingsStatCard
              label="Разделов настроек"
              value={accessibleSettingsCount}
              caption="доступно вам"
            />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={3} alignItems="stretch">
        {visibleSettingsGroups.map((group) => (
          <Grid item xs={12} lg={4} key={group.title} sx={{ display: 'flex' }}>
            <Card sx={{ ...panelCardSx, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: 'action.hover',
                      color: 'primary.main',
                    }}
                  >
                    {group.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>
                      {group.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.45 }}>
                      {group.description}
                    </Typography>
                  </Box>
                </Stack>
                <Stack spacing={0.75} sx={{ flex: 1 }}>
                  {group.items.map((item) => (
                    <ListItemButton
                      key={item.key}
                      selected={resolvedActiveSection === item.key && isSectionDialogOpen}
                      onClick={() => handleOpenSectionDialog(item.key as SettingsSectionKey)}
                      sx={{
                        borderRadius: 2,
                        alignItems: 'center',
                        py: 1.25,
                        px: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&.Mui-selected': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.selected',
                        },
                        '&:hover': {
                          borderColor: 'primary.light',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'text.secondary',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ sx: { fontWeight: 600, lineHeight: 1.35, fontSize: '0.95rem' } }}
                      />
                      {item.badge ? <Chip size="small" label={item.badge} color="primary" /> : null}
                    </ListItemButton>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

        <Box sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 12, pb: 2 }}>
          Версия настроек от 27.04.2026
        </Box>

        <Dialog
          open={isSectionDialogOpen}
          onClose={() => setIsSectionDialogOpen(false)}
          fullWidth
          disableScrollLock={activeSection === 'documents'}
          maxWidth={activeSection === 'documents' ? false : activeSection === 'sms' || activeSection === 'integrations' ? 'xl' : 'lg'}
          PaperProps={{
            sx: {
              borderRadius: 3,
              ...(activeSection === 'documents'
                ? {
                    display: 'flex',
                    flexDirection: 'column',
                    width: 'min(1560px, 96vw)',
                    maxWidth: '96vw',
                    maxHeight: '92vh',
                  }
                : {}),
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
              <Box>
                <Typography variant="h5" fontWeight={800}>{activeSectionMeta?.label || 'Раздел'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Изменения сохраняются вручную и применяются после сохранения.
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              pt: 2,
              overflowX: 'hidden',
              overflowY: 'auto',
              ...(activeSection === 'documents'
                ? {
                    flex: 1,
                    minHeight: 0,
                    bgcolor: 'var(--crm-bg)',
                    pl: { xs: 2, md: 3 },
                    pr: { xs: 3, md: 4 },
                    pb: 2,
                  }
                : {}),
            }}
          >
            {renderSectionContent()}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setIsSectionDialogOpen(false)}>Закрыть</Button>
            <Button variant="contained" startIcon={<Save />} onClick={() => void handleSave()} disabled={isSaving}>
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isLocationPaymentOpen} onClose={() => setIsLocationPaymentOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>Оплата дополнительной локации</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="info">
                {pendingLocationName ? (
                  <>
                    Локация <strong>{pendingLocationName}</strong> будет добавлена после успешной оплаты.
                  </>
                ) : (
                  'Оплатите подписку, чтобы открыть ещё одну локацию.'
                )}
              </Alert>
              <SubscriptionPlanPicker
                billingEnabled={billingEnabled}
                isLoading={billingLoading}
                monthlyPrice={monthlyPrice}
                paymentPurpose="location"
                payButtonLabel="Оплатить локацию"
                compact
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsLocationPaymentOpen(false)}>Отмена</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

export default Settings;
