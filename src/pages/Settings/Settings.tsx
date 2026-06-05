import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  Article,
  AssignmentTurnedIn,
  Business,
  ContentCopy,
  CreditCard,
  DeleteOutline,
  FileDownload,
  FileUpload,
  FormatListBulleted,
  Inventory,
  HelpOutline,
  Inventory2,
  LocationOn,
  Notifications,
  Person,
  People,
  PointOfSale,
  PostAdd,
  Preview,
  ReceiptLong,
  Refresh,
  Save,
  Sms,
  Storefront,
  SupportAgent,
  TextFields,
  Workspaces,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { appSettingsService } from '../../services/appSettingsService';
import { taxonomyService } from '../../services/taxonomyService';
import { AppSettings, DocumentTemplate, OrderStatusSetting } from '../../types';
import { heroCardSx, pageShellSx, panelCardSx } from '../../styles/ui';
import TinyMceEditor from '../../components/TinyMceEditor/TinyMceEditor';

const settingsSections = [
  {
    title: 'Компания',
    items: [
      { key: 'business', label: 'Общее', icon: <Business /> },
      { key: 'locations', label: 'Локации', icon: <LocationOn /> },
      { key: 'employees', label: 'Сотрудники', icon: <Workspaces /> },
      { key: 'profile', label: 'Ваш профиль', icon: <Person /> },
      { key: 'documents', label: 'Документы', icon: <Article /> },
      { key: 'integrations', label: 'Интеграции', icon: <SupportAgent /> },
      { key: 'license', label: 'Купить лицензию', icon: <Storefront /> },
    ],
  },
  {
    title: 'Заказы',
    items: [
      { key: 'orders', label: 'Общее', icon: <ReceiptLong /> },
      { key: 'statuses', label: 'Статусы', icon: <Inventory2 /> },
      { key: 'quickSales', label: 'Быстрые продажи', icon: <Storefront /> },
    ],
  },
  {
    title: 'Уведомления',
    items: [
      { key: 'notifications', label: 'Ваши уведомления', icon: <Notifications />, badge: 'Новое' },
      { key: 'email', label: 'E-mail клиентам', icon: <Notifications /> },
      { key: 'sms', label: 'SMS клиентам', icon: <Sms /> },
    ],
  },
  {
    title: 'Платежи',
    items: [
      { key: 'paymentCategories', label: 'Статьи движения денежных средств', icon: <PointOfSale /> },
      { key: 'paymentMethods', label: 'Методы оплаты', icon: <CreditCard /> },
    ],
  },
  {
    title: 'Формы',
    items: [
      { key: 'orderTypes', label: 'Типы заказа', icon: <PostAdd /> },
      { key: 'orderFields', label: 'Поля заказа', icon: <FormatListBulleted /> },
      { key: 'clientTypes', label: 'Типы клиента', icon: <People /> },
      { key: 'clientFields', label: 'Поля клиента', icon: <TextFields /> },
      { key: 'directories', label: 'Справочники', icon: <Inventory /> },
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

const documentVariableGroups = [
  { title: 'Компания', variables: ['{{companyName}}', '{{companyPhone}}', '{{companyEmail}}', '{{companyAddress}}', '{{workingHours}}'] },
  { title: 'Заказ', variables: ['{{documentTitle}}', '{{orderNumber}}', '{{orderStatus}}', '{{priority}}', '{{estimatedCost}}', '{{totalCost}}', '{{advancePayment}}'] },
  { title: 'Клиент', variables: ['{{clientName}}', '{{clientPhone}}', '{{clientEmail}}', '{{clientAddress}}'] },
  { title: 'Устройство', variables: ['{{device}}', '{{deviceBrand}}', '{{deviceModel}}', '{{color}}', '{{serialNumber}}', '{{imei}}', '{{password}}', '{{completeness}}', '{{appearance}}'] },
  { title: 'Финансы', variables: ['{{works}}', '{{parts}}', '{{discount}}', '{{paymentMethod}}', '{{debt}}', '{{warrantyText}}', '{{footerDisclaimer}}'] },
  { title: 'Сотрудники', variables: ['{{technician}}', '{{intakeManager}}', '{{deliveryManager}}'] },
  { title: 'Дата', variables: ['{{date}}', '{{createdAt}}', '{{completedAt}}'] },
  { title: 'Дополнительно', variables: ['{{problemDescription}}', '{{diagnosis}}', '{{notes}}', '{{recommendations}}'] },
];

const smsVariableGroups: Array<{ title: string; variables: Array<{ token: string; label: string }> }> = [
  {
    title: 'Клиент',
    variables: [
      { token: '{{clientName}}', label: 'Имя клиента' },
      { token: '{{phone}}', label: 'Телефон' },
      { token: '{{clientPhone}}', label: 'Телефон клиента (альт.)' },
    ],
  },
  {
    title: 'Заказ',
    variables: [
      { token: '{{orderNumber}}', label: 'Номер заказа' },
      { token: '{{status}}', label: 'Статус заказа' },
      { token: '{{device}}', label: 'Устройство' },
    ],
  },
  {
    title: 'Финансы',
    variables: [
      { token: '{{debt}}', label: 'Остаток к оплате' },
      { token: '{{amount}}', label: 'Сумма платежа' },
      { token: '{{totalCost}}', label: 'Итоговая стоимость' },
    ],
  },
  {
    title: 'Компания',
    variables: [
      { token: '{{companyName}}', label: 'Название компании' },
      { token: '{{companyPhone}}', label: 'Телефон компании' },
      { token: '{{companyAddress}}', label: 'Адрес компании' },
    ],
  },
];

type SettingsSectionKey =
  | 'business'
  | 'locations'
  | 'employees'
  | 'profile'
  | 'documents'
  | 'integrations'
  | 'license'
  | 'orders'
  | 'statuses'
  | 'quickSales'
  | 'notifications'
  | 'email'
  | 'sms'
  | 'paymentCategories'
  | 'paymentMethods'
  | 'orderTypes'
  | 'orderFields'
  | 'clientTypes'
  | 'clientFields'
  | 'directories';

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>('business');
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(appSettingsService.getSettings());
  const [newLocation, setNewLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newFormItems, setNewFormItems] = useState<Record<'orderTypes' | 'orderFields' | 'clientTypes' | 'clientFields' | 'directories', string>>({
    orderTypes: '',
    orderFields: '',
    clientTypes: '',
    clientFields: '',
    directories: '',
  });
  const tinyEditorRef = useRef<any>(null);
  const smsEditorRef = useRef<any>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedSmsStatusTemplate, setSelectedSmsStatusTemplate] = useState('ready');
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    code: '',
    label: '',
    registerType: 'cashbox' as 'cashbox' | 'bank_terminal' | 'online' | 'mixed',
  });
  const [newQuickSale, setNewQuickSale] = useState({
    label: '',
    category: '',
    saleMode: 'quantity' as 'single' | 'quantity',
  });
  const [newStatusName, setNewStatusName] = useState('');
  const [inventoryCategoryOptions, setInventoryCategoryOptions] = useState<string[]>([]);

  const handleProfileAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCategoryValue('profile', 'avatar', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  useEffect(() => {
    const load = async () => {
      const [nextSettings] = await Promise.all([
        appSettingsService.refreshFromApi(),
        taxonomyService.refreshFromApi(),
      ]);
      setSettings(nextSettings);
      setInventoryCategoryOptions(
        taxonomyService
          .getNodes('inventory')
          .map((node) => node.name.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'ru'))
      );
      if (nextSettings.documents.templates.length > 0) {
        setSelectedTemplateId(nextSettings.documents.templates[0].id);
      }
    };

    void load();
  }, []);

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

  const enabledNotificationCount = useMemo(
    () => Object.values(settings.notifications).filter(Boolean).length,
    [settings.notifications]
  );

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
    setSettings((prev) => {
      const nextTriggers = { ...prev.notifications.smsStatusTriggers };
      const nextTemplates = { ...prev.integrations.smsStatusTemplates };
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
        if (!orderStatusOptions.some((status) => status.code === key)) {
          delete nextTriggers[key];
          hasChanges = true;
        }
      });

      Object.keys(nextTemplates).forEach((key) => {
        if (!orderStatusOptions.some((status) => status.code === key)) {
          delete nextTemplates[key];
          hasChanges = true;
        }
      });

      if (!hasChanges) {
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await appSettingsService.saveSettings(settings);
      setSettings(saved);
      toast.success('????????? ?????????');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const defaults = await appSettingsService.resetSettings();
      setSettings(defaults);
      setNewLocation('');
      setSelectedTemplateId(defaults.documents.templates[0]?.id || '');
      toast.success('????????? ????????');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error('Введите название локации');
      return;
    }

    setSettings((prev) => ({
      ...prev,
      locations: {
        items: Array.from(new Set([...prev.locations.items, newLocation.trim()])),
      },
    }));
    setNewLocation('');
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

  const handleAddFormItem = (listKey: 'orderTypes' | 'orderFields' | 'clientTypes' | 'clientFields' | 'directories') => {
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

      if (listKey === 'orderFields' || listKey === 'clientFields') {
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
    name: '????? ????????',
    type: 'custom',
    category: 'other',
    description: '???????????????? ??????.',
    template:
      '<h1>{{documentTitle}}</h1><p><strong>????? ??????:</strong> {{orderNumber}}</p><p><strong>??????:</strong> {{clientName}}</p><p><strong>????:</strong> {{date}}</p>',
    variables: ['{{documentTitle}}', '{{orderNumber}}', '{{clientName}}', '{{date}}'],
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
    toast.success('????? ???????? ????????');
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

    toast.success('?????? ??????');
  };

  const handleInsertVariable = (token: string) => {
    if (!selectedTemplate) {
      return;
    }

    if (tinyEditorRef.current) {
      tinyEditorRef.current.focus();
      tinyEditorRef.current.insertContent(token);
      const nextValue = tinyEditorRef.current.getContent();
      updateTemplate(selectedTemplate.id, (template) => ({
        ...template,
        template: nextValue,
        variables: Array.from(new Set([...(template.variables || []), token])),
      }));
      return;
    }

    updateTemplate(selectedTemplate.id, (template) => ({
      ...template,
      template: `${template.template}${token}`,
      variables: Array.from(new Set([...(template.variables || []), token])),
    }));
  };

  const handleAddPaymentMethod = () => {
    const code = newPaymentMethod.code.trim().toLowerCase().replace(/\s+/g, '_');
    const label = newPaymentMethod.label.trim();
    if (!code || !label) {
      toast.error('Укажите код и название способа оплаты');
      return;
    }
    if (settings.payment.paymentMethodOptions.some((item) => item.code === code)) {
      toast.error('Такой код способа оплаты уже существует');
      return;
    }
    setPaymentMethodOptions([
      ...settings.payment.paymentMethodOptions,
      {
        code,
        label,
        enabled: true,
        registerType: newPaymentMethod.registerType,
      },
    ]);
    setNewPaymentMethod({ code: '', label: '', registerType: 'cashbox' });
  };

  const handleAddQuickSale = () => {
    const label = newQuickSale.label.trim();
    const category = newQuickSale.category.trim();
    if (!label || !category) {
      toast.error('Укажите название кнопки и категорию склада');
      return;
    }
    setCategoryValue('orders', 'quickSaleOptions', [
      ...settings.orders.quickSaleOptions,
      {
        id: `quick_sale_${Date.now()}`,
        label,
        category,
        saleMode: newQuickSale.saleMode,
        enabled: true,
        sortOrder: settings.orders.quickSaleOptions.length + 1,
      },
    ]);
    setNewQuickSale({ label: '', category: '', saleMode: 'quantity' });
  };

  const normalizeStatusCode = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\wа-яё-]/gi, '')
      .slice(0, 40);

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
    setOrderStatuses(
      settings.orders.statuses.map((status) =>
        status.id === statusId
          ? {
              ...status,
              ...patch,
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

    setOrderStatuses(
      settings.orders.statuses
        .filter((status) => status.id !== statusId)
        .map((status, index) => ({ ...status, sortOrder: index + 1 }))
    );
  };

  const handleInsertSmsVariable = (token: string) => {
    if (smsEditorRef.current) {
      smsEditorRef.current.focus();
      smsEditorRef.current.insertContent(token);
      const nextValue = smsEditorRef.current.getContent({ format: 'text' });
      setNestedCategoryValue('integrations', 'smsStatusTemplates', selectedSmsStatusTemplate, nextValue);
      return;
    }

    const currentValue = settings.integrations.smsStatusTemplates[selectedSmsStatusTemplate] || '';
    const separator = currentValue.trim().length > 0 ? ' ' : '';
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
      name: `${selectedTemplate.name} (?????)`,
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
    toast.success('?????? ??????????');
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
    toast.success('??????? ??????????????');
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
        throw new Error('???????? ?????? ?????');
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

      toast.success(`????????????? ????????: ${imported.length}`);
    } catch (error) {
      console.error(error);
      toast.error('?? ??????? ????????????? ???????');
    } finally {
      event.target.value = '';
    }
  };

  const renderDocumentsSection = () => {
    const previewHtml = (selectedTemplate?.template || '')
      .replaceAll('{{documentTitle}}', selectedTemplate?.name || 'Новый документ')
      .replaceAll('{{companyName}}', settings.business.companyName)
      .replaceAll('{{companyPhone}}', settings.business.phone)
      .replaceAll('{{companyEmail}}', settings.business.email)
      .replaceAll('{{companyAddress}}', settings.business.address)
      .replaceAll('{{workingHours}}', settings.business.workingHours)
      .replaceAll('{{orderNumber}}', '000123')
      .replaceAll('{{clientName}}', 'Иван Петров')
      .replaceAll('{{clientPhone}}', '+7 999 123-45-67')
      .replaceAll('{{clientEmail}}', 'client@example.com')
      .replaceAll('{{clientAddress}}', 'Екатеринбург')
      .replaceAll('{{device}}', 'Apple iPhone 15 Pro Max')
      .replaceAll('{{deviceBrand}}', 'Apple')
      .replaceAll('{{deviceModel}}', 'iPhone 15 Pro Max')
      .replaceAll('{{color}}', 'Черный')
      .replaceAll('{{serialNumber}}', 'SN-123456')
      .replaceAll('{{imei}}', '123456789012345')
      .replaceAll('{{password}}', '1234')
      .replaceAll('{{completeness}}', 'Кабель, коробка')
      .replaceAll('{{appearance}}', 'Следы эксплуатации')
      .replaceAll('{{problemDescription}}', 'Не заряжается, требуется проверка разъема')
      .replaceAll('{{diagnosis}}', 'Неисправен разъем питания')
      .replaceAll('{{estimatedCost}}', '2 500 ₽')
      .replaceAll('{{totalCost}}', '4 900 ₽')
      .replaceAll('{{advancePayment}}', '1 000 ₽')
      .replaceAll('{{discount}}', '0 ₽')
      .replaceAll('{{paymentMethod}}', 'Наличные')
      .replaceAll('{{debt}}', '3 900 ₽')
      .replaceAll('{{works}}', 'Замена разъема питания')
      .replaceAll('{{parts}}', 'Разъем зарядки')
      .replaceAll('{{technician}}', 'Иванов Алексей')
      .replaceAll('{{intakeManager}}', 'Петрова Мария')
      .replaceAll('{{deliveryManager}}', 'Петрова Мария')
      .replaceAll('{{date}}', new Date().toLocaleDateString('ru-RU'))
      .replaceAll('{{createdAt}}', new Date().toLocaleDateString('ru-RU'))
      .replaceAll('{{completedAt}}', new Date().toLocaleDateString('ru-RU'))
      .replaceAll('{{warrantyText}}', settings.documents.warrantyText)
      .replaceAll('{{footerDisclaimer}}', settings.documents.footerDisclaimer)
      .replaceAll('{{notes}}', 'Проверить шлейф и питание')
      .replaceAll('{{recommendations}}', 'Рекомендуется замена кабеля')
      .replaceAll('{{orderStatus}}', 'Диагностика')
      .replaceAll('{{priority}}', 'Средний');

    return (
      <Stack spacing={3}>
        <Alert severity="info">
          Создавайте и редактируйте шаблоны документов для заказов, продаж, склада и других разделов.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3.5}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImportTemplates} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" fontWeight={800}>Шаблоны документов</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<FileUpload />} onClick={() => importInputRef.current?.click()}>Импорт</Button>
                      <Button size="small" variant="outlined" startIcon={<FileDownload />} onClick={handleExportTemplates}>Экспорт</Button>
                      <Button size="small" variant="contained" startIcon={<Add />} onClick={handleCreateTemplate}>Создать документ</Button>
                    </Stack>
                  </Stack>

                  {documentCategories.map((group) => (
                    <Box key={group.value}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">{group.label}</Typography>
                        <Chip size="small" label={group.items.length} />
                      </Stack>
                      <Stack spacing={1}>
                        {group.items.map((template) => (
                          <Card
                            key={template.id}
                            variant="outlined"
                            sx={{
                              borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                              bgcolor: selectedTemplateId === template.id ? 'rgba(255,122,26,0.06)' : 'transparent',
                            }}
                          >
                            <CardContent sx={{ py: 1.5 }}>
                              <Stack direction="row" spacing={1} alignItems="flex-start">
                                <ListItemButton
                                  selected={selectedTemplateId === template.id}
                                  onClick={() => setSelectedTemplateId(template.id)}
                                  sx={{ borderRadius: 2, px: 1, py: 0.5, alignItems: 'flex-start' }}
                                >
                                  <ListItemIcon sx={{ minWidth: 32, mt: 0.2 }}>
                                    {template.type === 'completion' ? <AssignmentTurnedIn fontSize="small" /> : <Article fontSize="small" />}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={template.name}
                                    secondary={template.description || documentTypeOptions.find((item) => item.value === template.type)?.label}
                                  />
                                </ListItemButton>
                                {selectedTemplateId === template.id && (
                                  <IconButton color="primary" onClick={handleCloneTemplate}>
                                    <ContentCopy />
                                  </IconButton>
                                )}
                                <IconButton color="error" onClick={() => handleDeleteTemplate(template.id)}>
                                  <DeleteOutline />
                                </IconButton>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8.5}>
            {!selectedTemplate ? (
              <Alert severity="warning">Создай или выбери шаблон слева для редактирования.</Alert>
            ) : (
              <Stack spacing={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Название документа" value={selectedTemplate.name} onChange={(event) => updateTemplate(selectedTemplate.id, (template) => ({ ...template, name: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Категория</InputLabel>
                          <Select value={selectedTemplate.category} label="Категория" onChange={(event) => updateTemplate(selectedTemplate.id, (template) => ({ ...template, category: event.target.value as DocumentTemplate['category'] }))}>
                            {documentCategoryOptions.map((option) => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Тип</InputLabel>
                          <Select value={selectedTemplate.type} label="Тип" onChange={(event) => updateTemplate(selectedTemplate.id, (template) => ({ ...template, type: event.target.value as DocumentTemplate['type'] }))}>
                            {documentTypeOptions.map((option) => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={9}>
                        <TextField fullWidth label="Описание" value={selectedTemplate.description || ''} onChange={(event) => updateTemplate(selectedTemplate.id, (template) => ({ ...template, description: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 56, px: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Typography fontWeight={700}>Активен</Typography>
                          <Switch checked={selectedTemplate.isActive} onChange={(event) => updateTemplate(selectedTemplate.id, (template) => ({ ...template, isActive: event.target.checked }))} />
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography variant="h6" fontWeight={800}>HTML шаблон</Typography>
                          <TinyMceEditor
                            value={selectedTemplate.template}
                            onReady={(editor) => {
                              tinyEditorRef.current = editor;
                            }}
                            onChange={(nextValue) =>
                              updateTemplate(selectedTemplate.id, (template) => ({
                                ...template,
                                template: nextValue,
                              }))
                            }
                            height={720}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Можно использовать HTML и переменные вида {'{{clientName}}'}.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography variant="h6" fontWeight={800}>Переменные</Typography>
                          {documentVariableGroups.map((group) => (
                            <Box key={group.title}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{group.title}</Typography>
                              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {group.variables.map((variable) => (
                                  <Chip key={variable} label={variable} onClick={() => handleInsertVariable(variable)} sx={{ cursor: 'pointer' }} />
                                ))}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Preview color="primary" />
                        <Typography variant="h6" fontWeight={800}>Предпросмотр</Typography>
                      </Stack>
                      <Box
                        sx={{
                          minHeight: 280,
                          p: 3,
                          borderRadius: 3,
                          border: '1px dashed',
                          borderColor: 'divider',
                          bgcolor: '#fff',
                          '& h1, & h2, & h3': { mt: 0, color: '#13254b' },
                          '& p': { mb: 1.5, lineHeight: 1.6 },
                          '& table': { width: '100%', borderCollapse: 'collapse' },
                          '& td, & th': { border: '1px solid #d7dee7', padding: '8px 10px' },
                        }}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}
          </Grid>
        </Grid>
      </Stack>
    );
  };

  const renderFormsEditor = (
    listKey: 'orderTypes' | 'orderFields' | 'clientTypes' | 'clientFields' | 'directories',
    options?: { withRequired?: boolean; hint?: string }
  ) => {
    const items = settings.forms[listKey];
    return (
      <Stack spacing={2}>
        {options?.hint && <Alert severity="info">{options.hint}</Alert>}
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
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Stack key={item.id} direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
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
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'business':
        return (
          <Grid container spacing={2}>
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
                  <MenuItem value="Asia/Yekaterinburg">Екатеринбург</MenuItem>
                  <MenuItem value="Europe/Moscow">Москва</MenuItem>
                  <MenuItem value="Asia/Almaty">Алматы</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 'locations':
        return (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField fullWidth label="Новая локация" value={newLocation} onChange={(event) => setNewLocation(event.target.value)} />
              <Button variant="contained" startIcon={<Add />} onClick={handleAddLocation}>Добавить</Button>
            </Stack>
            <Stack spacing={1.5}>
              {settings.locations.items.map((location) => (
                <Card key={location} variant="outlined">
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography fontWeight={700}>{location}</Typography>
                        <Typography variant="body2" color="text.secondary">Доступна в заказах и документах.</Typography>
                      </Box>
                      <Button color="error" onClick={() => handleRemoveLocation(location)}>Убрать</Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        );
      case 'employees':
        return (
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
              <Alert severity="info">Это значения по умолчанию для новых сотрудников и стандартной смены в графике. Индивидуальные проценты задаются в разделе «Сотрудники».</Alert>
            </Grid>
          </Grid>
        );
      case 'profile':
          return (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Avatar
                    src={settings.profile.avatar || undefined}
                    sx={{ width: 88, height: 88, fontSize: 36, bgcolor: 'primary.main' }}
                  >
                    <Person />
                  </Avatar>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<FileUpload />}
                      onClick={() => profileAvatarInputRef.current?.click()}
                    >
                      Загрузить фото
                    </Button>
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<DeleteOutline />}
                      onClick={() => setCategoryValue('profile', 'avatar', '')}
                      disabled={!settings.profile.avatar}
                    >
                      Удалить фото
                    </Button>
                  </Stack>
                  <input
                    ref={profileAvatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleProfileAvatarChange}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Имя" value={settings.profile.name} onChange={(event) => setCategoryValue('profile', 'name', event.target.value)} />
              </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Email" value={settings.profile.email} onChange={(event) => setCategoryValue('profile', 'email', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Телефон" value={settings.profile.phone} onChange={(event) => setCategoryValue('profile', 'phone', event.target.value)} />
            </Grid>
          </Grid>
        );
      case 'documents':
        return renderDocumentsSection();
      case 'integrations':
      case 'sms':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info">
                Здесь настраиваются SMS, открытие WhatsApp/Telegram и телефония. Для внешних сервисов можно использовать свой URL-шаблон.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={800}>SMS</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>SMS провайдер</InputLabel>
                <Select value={settings.integrations.smsProvider} label="SMS провайдер" onChange={(event) => setCategoryValue('integrations', 'smsProvider', event.target.value)}>
                  <MenuItem value="none">Не подключен</MenuItem>
                  <MenuItem value="webhook">Webhook / backend</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Метод webhook</InputLabel>
                <Select value={settings.integrations.smsWebhookMethod} label="Метод webhook" onChange={(event) => setCategoryValue('integrations', 'smsWebhookMethod', event.target.value)}>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="GET">GET</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Имя отправителя" value={settings.integrations.smsSenderName} onChange={(event) => setCategoryValue('integrations', 'smsSenderName', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Webhook URL" value={settings.integrations.smsWebhookUrl} onChange={(event) => setCategoryValue('integrations', 'smsWebhookUrl', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="API токен" value={settings.integrations.smsApiToken} onChange={(event) => setCategoryValue('integrations', 'smsApiToken', event.target.value)} />
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
              <TinyMceEditor
                value={settings.integrations.smsStatusTemplates[selectedSmsStatusTemplate] || ''}
                onChange={(nextValue) =>
                  setNestedCategoryValue(
                    'integrations',
                    'smsStatusTemplates',
                    selectedSmsStatusTemplate,
                    nextValue
                  )
                }
                onReady={(editor) => {
                  smsEditorRef.current = editor;
                }}
                outputFormat="text"
                height={280}
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
                        variant="outlined"
                        onClick={() => handleInsertSmsVariable(item.token)}
                      />
                    ))}
                  </Stack>
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={800}>WhatsApp</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Режим WhatsApp</InputLabel>
                <Select value={settings.integrations.whatsappMode} label="Режим WhatsApp" onChange={(event) => setCategoryValue('integrations', 'whatsappMode', event.target.value)}>
                  <MenuItem value="crm">Только окно CRM</MenuItem>
                  <MenuItem value="crm_and_link">CRM + внешняя ссылка</MenuItem>
                  <MenuItem value="link_only">Только внешняя ссылка</MenuItem>
                  <MenuItem value="custom">Кастомный шаблон</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Шаблон ссылки WhatsApp" value={settings.integrations.whatsappLinkTemplate} onChange={(event) => setCategoryValue('integrations', 'whatsappLinkTemplate', event.target.value)} helperText="Переменные: {{phone}}, {{phoneDigits}}, {{message}}, {{messageEncoded}}, {{clientName}}, {{orderNumber}}" />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={800}>Telegram</Typography>
            </Grid>
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
              <TextField fullWidth label="Шаблон ссылки Telegram" value={settings.integrations.telegramLinkTemplate} onChange={(event) => setCategoryValue('integrations', 'telegramLinkTemplate', event.target.value)} helperText="Переменные: {{messageEncoded}}, {{siteUrl}}, {{siteUrlEncoded}}, {{orderNumber}}" />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={800}>Звонок</Typography>
            </Grid>
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
        );
      case 'license':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Текущий план" value={settings.license.plan} onChange={(event) => setCategoryValue('license', 'plan', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Лицензионный ключ" value={settings.license.key} onChange={(event) => setCategoryValue('license', 'key', event.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">Здесь можно хранить параметры лицензии и данные доступа.</Alert>
            </Grid>
          </Grid>
        );
      case 'orders':
        return (
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
            <Grid item xs={12} md={8}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 56, px: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box>
                  <Typography fontWeight={700}>Автоматически открывать акт выполненных работ после оплаты</Typography>
                  <Typography variant="body2" color="text.secondary">Используется в финальном сценарии выдачи заказа.</Typography>
                </Box>
                <Switch checked={settings.orders.autoOpenCompletionAfterPayment} onChange={(event) => setCategoryValue('orders', 'autoOpenCompletionAfterPayment', event.target.checked)} />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Администратор сам выбирает сценарий создания заказа: пошаговый мастер или одна полная форма. Поля формы дополнительно управляются в разделах «Поля заказа» и «Поля клиента».
              </Alert>
            </Grid>
          </Grid>
        );
      case 'statuses':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info">
                Только эти статусы используются в заказах. Здесь можно добавить статус, убрать, отключить, отметить как финальный и назначить ему цвет.
              </Alert>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Новый статус" value={newStatusName} onChange={(event) => setNewStatusName(event.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button variant="contained" startIcon={<Add />} fullWidth onClick={handleAddOrderStatus}>Добавить статус</Button>
            </Grid>
            {orderStatusOptions.map((status) => (
              <Grid item xs={12} key={status.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Название статуса" value={status.label} onChange={(event) => handleUpdateOrderStatus(status.id, { label: event.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Код"
                          value={status.code}
                          onChange={(event) => handleUpdateOrderStatus(status.id, { code: normalizeStatusCode(event.target.value) || status.code })}
                          helperText="Служебный код CRM"
                        />
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
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
        case 'notifications':
          return (
            <Stack spacing={1.5}>
              {[
                ['emailNotifications', 'Email уведомления'],
                ['smsNotifications', 'SMS уведомления'],
              ['pushNotifications', 'Push уведомления'],
              ['orderUpdates', 'Обновления по заказам'],
              ['paymentReminders', 'Напоминания по оплате'],
                ['lowStockAlerts', 'Низкий остаток запчастей'],
                ['smsOnReadyStatus', 'SMS при статусе Готов'],
              ].map(([key, label]) => (
              <Card key={key} variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography fontWeight={700}>{label}</Typography>
                    <Switch checked={Boolean(settings.notifications[key as keyof AppSettings['notifications']])} onChange={(event) => setCategoryValue('notifications', key as keyof AppSettings['notifications'], event.target.checked)} />
                  </Stack>
                </CardContent>
                </Card>
              ))}
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={800}>SMS-триггеры по статусам</Typography>
                    <Grid container spacing={1.5}>
                      {orderStatusOptions.map((status) => (
                        <Grid item xs={12} md={6} key={`sms-trigger-${status.code}`}>
                          <Card variant="outlined">
                            <CardContent sx={{ py: 1.5 }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography fontWeight={700}>{status.label}</Typography>
                                <Switch
                                  checked={Boolean(settings.notifications.smsStatusTriggers[status.code])}
                                  onChange={(event) =>
                                    setNestedCategoryValue(
                                      'notifications',
                                      'smsStatusTriggers',
                                      status.code,
                                      event.target.checked
                                    )
                                  }
                                />
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          );
      case 'email':
        return <Alert severity="info">Письма клиентам будут использовать реквизиты компании и шаблоны уведомлений.</Alert>;
      case 'paymentCategories':
        return <Alert severity="info">Статьи движения денег используются для учета операций в кассе.</Alert>;
      case 'paymentMethods':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Название кассы" value={settings.payment.cashRegisterName} onChange={(event) => setCategoryValue('payment', 'cashRegisterName', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Название терминала" value={settings.payment.terminalName} onChange={(event) => setCategoryValue('payment', 'terminalName', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Валюта</InputLabel>
                <Select value={settings.payment.currency} label="Валюта" onChange={(event) => setCategoryValue('payment', 'currency', event.target.value)}>
                  <MenuItem value="RUB">Рубль (₽)</MenuItem>
                  <MenuItem value="USD">Доллар ($)</MenuItem>
                  <MenuItem value="EUR">Евро (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="Налог, %" value={settings.payment.taxRate} onChange={(event) => setCategoryValue('payment', 'taxRate', Number(event.target.value) || 0)} />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">Администратор может сам добавлять способы оплаты. Эти способы потом используются в кассе, заказах и быстрых продажах.</Alert>
              </Grid>
              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField fullWidth label="Код способа оплаты" value={newPaymentMethod.code} onChange={(event) => setNewPaymentMethod((prev) => ({ ...prev, code: event.target.value }))} />
                  <TextField fullWidth label="Название для сотрудников" value={newPaymentMethod.label} onChange={(event) => setNewPaymentMethod((prev) => ({ ...prev, label: event.target.value }))} />
                  <FormControl fullWidth>
                    <InputLabel>Тип кассы</InputLabel>
                    <Select value={newPaymentMethod.registerType} label="Тип кассы" onChange={(event) => setNewPaymentMethod((prev) => ({ ...prev, registerType: event.target.value as 'cashbox' | 'bank_terminal' | 'online' | 'mixed' }))}>
                      <MenuItem value="cashbox">Наличные / касса</MenuItem>
                      <MenuItem value="bank_terminal">Терминал</MenuItem>
                      <MenuItem value="online">Онлайн / перевод</MenuItem>
                      <MenuItem value="mixed">Смешанный</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="contained" startIcon={<Add />} onClick={handleAddPaymentMethod}>Добавить</Button>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  {settings.payment.paymentMethodOptions.map((method) => (
                    <Card key={method.code} variant="outlined">
                      <CardContent sx={{ py: 1.5 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                          <TextField
                            size="small"
                            label="Код"
                            value={method.code}
                            onChange={(event) =>
                              setPaymentMethodOptions(
                                settings.payment.paymentMethodOptions.map((item) =>
                                  item.code === method.code ? { ...item, code: event.target.value.toLowerCase().replace(/\s+/g, '_') } : item
                                )
                              )
                            }
                          />
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
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Тип кассы</InputLabel>
                            <Select
                              value={method.registerType}
                              label="Тип кассы"
                              onChange={(event) =>
                                setPaymentMethodOptions(
                                  settings.payment.paymentMethodOptions.map((item) =>
                                    item.code === method.code ? { ...item, registerType: event.target.value as 'cashbox' | 'bank_terminal' | 'online' | 'mixed' } : item
                                  )
                                )
                              }
                            >
                              <MenuItem value="cashbox">Наличные / касса</MenuItem>
                              <MenuItem value="bank_terminal">Терминал</MenuItem>
                              <MenuItem value="online">Онлайн / перевод</MenuItem>
                              <MenuItem value="mixed">Смешанный</MenuItem>
                            </Select>
                          </FormControl>
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
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          );
        case 'quickSales':
          return (
            <Stack spacing={2}>
              <Alert severity="info">
                Здесь можно настроить кнопки быстрых продаж на странице заказов: название, категорию склада и режим продажи.
              </Alert>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField fullWidth label="Название кнопки" value={newQuickSale.label} onChange={(event) => setNewQuickSale((prev) => ({ ...prev, label: event.target.value }))} />
                <FormControl fullWidth>
                  <InputLabel>Категория склада</InputLabel>
                  <Select
                    value={newQuickSale.category}
                    label="Категория склада"
                    onChange={(event) => setNewQuickSale((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    {inventoryCategoryOptions.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Режим продажи</InputLabel>
                  <Select value={newQuickSale.saleMode} label="Режим продажи" onChange={(event) => setNewQuickSale((prev) => ({ ...prev, saleMode: event.target.value as 'single' | 'quantity' }))}>
                    <MenuItem value="single">Одна штука</MenuItem>
                    <MenuItem value="quantity">С выбором количества</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddQuickSale}>Добавить</Button>
              </Stack>
              <Stack spacing={1.25}>
                {settings.orders.quickSaleOptions.map((option) => (
                  <Card key={option.id} variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <TextField
                          size="small"
                          sx={{ flex: 1 }}
                          label="Название кнопки"
                          value={option.label}
                          onChange={(event) =>
                            setCategoryValue(
                              'orders',
                              'quickSaleOptions',
                              settings.orders.quickSaleOptions.map((item) =>
                                item.id === option.id ? { ...item, label: event.target.value } : item
                              )
                            )
                          }
                        />
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <InputLabel>Категория склада</InputLabel>
                          <Select
                            value={option.category}
                            label="Категория склада"
                            onChange={(event) =>
                              setCategoryValue(
                                'orders',
                                'quickSaleOptions',
                                settings.orders.quickSaleOptions.map((item) =>
                                  item.id === option.id ? { ...item, category: event.target.value } : item
                                )
                              )
                            }
                          >
                            {inventoryCategoryOptions.map((category) => (
                              <MenuItem key={category} value={category}>
                                {category}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel>Режим</InputLabel>
                          <Select
                            value={option.saleMode}
                            label="Режим"
                            onChange={(event) =>
                              setCategoryValue(
                                'orders',
                                'quickSaleOptions',
                                settings.orders.quickSaleOptions.map((item) =>
                                  item.id === option.id ? { ...item, saleMode: event.target.value as 'single' | 'quantity' } : item
                                )
                              )
                            }
                          >
                            <MenuItem value="single">Одна штука</MenuItem>
                            <MenuItem value="quantity">С количеством</MenuItem>
                          </Select>
                        </FormControl>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" color="text.secondary">Показывать</Typography>
                          <Switch
                            checked={option.enabled}
                            onChange={(event) =>
                              setCategoryValue(
                                'orders',
                                'quickSaleOptions',
                                settings.orders.quickSaleOptions.map((item) =>
                                  item.id === option.id ? { ...item, enabled: event.target.checked } : item
                                )
                              )
                            }
                          />
                        </Stack>
                        <IconButton
                          color="error"
                          onClick={() =>
                            setCategoryValue(
                              'orders',
                              'quickSaleOptions',
                              settings.orders.quickSaleOptions
                                .filter((item) => item.id !== option.id)
                                .map((item, index) => ({ ...item, sortOrder: index + 1 }))
                            )
                          }
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Stack>
          );
        case 'orderTypes':
        return renderFormsEditor('orderTypes', {
          hint: 'Добавляйте, отключайте и переименовывайте типы заказов. Эти типы используются в форме создания заказа.',
        });
      case 'orderFields':
        return renderFormsEditor('orderFields', {
          withRequired: true,
          hint: 'Управление полями карточки заказа. Можно включать/отключать поле и отмечать его обязательным.',
        });
      case 'clientTypes':
        return renderFormsEditor('clientTypes', {
          hint: 'Типы клиентов используются в форме приема и помогают точнее вести клиентскую базу.',
        });
      case 'clientFields':
        return renderFormsEditor('clientFields', {
          withRequired: true,
          hint: 'Поля клиента используются в форме создания заказа и в карточке клиента.',
        });
      case 'directories':
        return renderFormsEditor('directories', {
          hint: 'Справочники CRM. Здесь можно включать, отключать и переименовывать наборы данных.',
        });
      default:
        return null;
    }
  };

  const activeSectionMeta = settingsSections.flatMap((group) => group.items).find((item) => item.key === activeSection);

  const handleOpenSectionDialog = (sectionKey: SettingsSectionKey) => {
    setActiveSection(sectionKey);
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
          Единый центр настроек по компании, заказам, документам, уведомлениям, платежам и интеграциям.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Уведомлений включено</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>{enabledNotificationCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Локаций</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>{settings.locations.items.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Способов оплаты</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>{settings.payment.paymentMethods.length + (settings.payment.installmentEnabled ? 1 : 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">План</Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 800 }}>{settings.license.plan}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ ...panelCardSx, p: 0 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={800}>Настройки</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>Разделы настроек вынесены в отдельный каталог, как в нормальной рабочей CRM.</Typography>
            </Box>
            <Button variant="outlined" startIcon={<HelpOutline />}>Справка</Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3} alignItems="flex-start">
        {settingsSections.map((group) => (
          <Grid item xs={12} md={6} key={group.title}>
            <Card sx={panelCardSx}>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 1.5 }}>{group.title}</Typography>
                <List disablePadding>
                  {group.items.map((item, index) => (
                      <React.Fragment key={item.key}>
                        <ListItemButton selected={activeSection === item.key && isSectionDialogOpen} onClick={() => handleOpenSectionDialog(item.key as SettingsSectionKey)} sx={{ borderRadius: 2 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.label} />
                          {item.badge && <Chip size="small" label={item.badge} color="primary" />}
                        </ListItemButton>
                      {index < group.items.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
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
          maxWidth={activeSection === 'documents' || activeSection === 'sms' || activeSection === 'integrations' ? 'xl' : 'lg'}
          PaperProps={{
            sx: {
              borderRadius: 3,
              minHeight: activeSection === 'documents' ? '85vh' : undefined,
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
              <Stack direction="row" spacing={1.5}>
                <IconButton onClick={() => void handleReset()} disabled={isSaving}><Refresh /></IconButton>
              </Stack>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            {renderSectionContent()}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setIsSectionDialogOpen(false)}>Закрыть</Button>
            <Button variant="contained" startIcon={<Save />} onClick={() => void handleSave()} disabled={isSaving}>
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

export default Settings;
