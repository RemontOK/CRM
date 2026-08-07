import { AppSettings, DocumentTemplate, OrderStatusSetting } from '../types';
import {
  SYSTEM_NEW_ORDER_STATUS_CODE,
  SYSTEM_NEW_ORDER_STATUS_COLOR,
  buildSystemNewOrderStatus,
  isSystemNewOrderStatus,
  matchesLegacyNewOrderStatus,
} from '../constants/orderStatuses';
import { apiService } from './api';
import { isStoredUserAdmin } from './authService';
import { DEFAULT_APPEARANCE, normalizeAppearance } from '../utils/crmAppearance';
import { getStoredTenantId, tenantStorageKey } from '../utils/tenantStorage';
import {
  getBuiltInDocumentTemplates as getFixedBuiltInDocumentTemplates,
  hasLegacyDocumentTemplates as hasLegacyDocumentTemplatesFixed,
  upgradeBuiltInDocumentTemplate as upgradeBuiltInTemplateFixed,
} from './documentTemplateDefaults';

export const SETTINGS_UPDATED_EVENT = 'crm:settings-updated';

const SETTINGS_STORAGE_BASE = 'nek_crm_app_settings';

const hasBrokenEncoding = (value?: string) => {
  if (!value) {
    return false;
  }

  if (value.includes('в‚Ѕ') || /\?{2,}/.test(value)) {
    return true;
  }

  return /[РС][^\s]{1,}/.test(value);
};

const decodeMojibake = (value?: string) => {
  if (!value) {
    return value || '';
  }

  if (!/[РС]/.test(value) && !value.includes('в‚Ѕ')) {
    return value;
  }

  try {
    return decodeURIComponent(escape(value.replace(/в‚Ѕ/g, '₽')));
  } catch {
    return value.replace(/в‚Ѕ/g, '₽');
  }
};

const deepDecodeStrings = <T,>(value: T): T => {
  if (typeof value === 'string') {
    return decodeMojibake(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepDecodeStrings(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, deepDecodeStrings(item)])
    ) as T;
  }

  return value;
};

const builtInTemplates = getFixedBuiltInDocumentTemplates();
const getBuiltInTemplateById = (id?: string) => builtInTemplates.find((template) => template.id === id);

export const defaultOrderStatuses: OrderStatusSetting[] = deepDecodeStrings([
  buildSystemNewOrderStatus(),
  { id: 'status_diagnosis', code: 'diagnosis', label: 'Диагностика', color: '#3b82f6', enabled: true, isFinal: false, sortOrder: 1 },
  { id: 'status_waiting_parts', code: 'waiting_parts', label: 'Ожидание запчастей', color: '#f59e0b', enabled: true, isFinal: false, sortOrder: 2 },
  { id: 'status_waiting_client', code: 'waiting_client', label: 'Ожидание клиента', color: '#f59e0b', enabled: true, isFinal: false, sortOrder: 3 },
  { id: 'status_in_progress', code: 'in_progress', label: 'В работе', color: '#2563eb', enabled: true, isFinal: false, sortOrder: 4 },
  { id: 'status_ready', code: 'ready', label: 'Готов', color: '#16a34a', enabled: true, isFinal: false, sortOrder: 5 },
  { id: 'status_completed', code: 'completed', label: 'Завершен', color: '#15803d', enabled: true, isFinal: true, sortOrder: 6 },
  { id: 'status_cancelled', code: 'cancelled', label: 'Отменен', color: '#dc2626', enabled: true, isFinal: true, sortOrder: 7 },
]);

const buildStatusMaps = (statuses: OrderStatusSetting[]) => ({
  labels: statuses.reduce<Record<string, string>>((acc, status) => {
    acc[status.code] = status.label;
    return acc;
  }, {}),
  colors: statuses.reduce<Record<string, string>>((acc, status) => {
    acc[status.code] = status.color;
    return acc;
  }, {}),
});

const normalizeStatusCode = (value?: string) =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\wа-яё-]/gi, '')
    .slice(0, 40);

const legacyStatusKeyMap: Record<string, string> = {
  diagnosis: 'diagnosis',
  waiting_parts: 'waitingParts',
  waiting_client: 'waitingClient',
  in_progress: 'inProgress',
  ready: 'ready',
  completed: 'completed',
  cancelled: 'cancelled',
  pending: 'pending',
  new: 'pending',
};

/** camelCase-ключи SMS → коды статусов заказа (snake_case). */
export const smsLegacyKeyMap: Record<string, string> = {
  waitingParts: 'waiting_parts',
  waitingClient: 'waiting_client',
  inProgress: 'in_progress',
};

export const migrateSmsRecordKeys = <T>(record: Record<string, T>): Record<string, T> => {
  const result = { ...record };
  Object.entries(smsLegacyKeyMap).forEach(([legacy, modern]) => {
    if (legacy in result) {
      if (!(modern in result)) {
        result[modern] = result[legacy];
      }
      delete result[legacy];
    }
  });
  return result;
};

const ensureSystemNewOrderStatus = (statuses: OrderStatusSetting[]): OrderStatusSetting[] => {
  const candidateIndex = statuses.findIndex(
    (status) => isSystemNewOrderStatus(status) || matchesLegacyNewOrderStatus(status)
  );

  let systemStatus: OrderStatusSetting;
  let rest: OrderStatusSetting[];

  if (candidateIndex >= 0) {
    const candidate = statuses[candidateIndex];
    systemStatus = {
      ...candidate,
      ...buildSystemNewOrderStatus(candidate.color || SYSTEM_NEW_ORDER_STATUS_COLOR),
      sortOrder: 0,
    };
    rest = statuses.filter((_, index) => index !== candidateIndex);
  } else {
    systemStatus = buildSystemNewOrderStatus();
    rest = statuses;
  }

  return [
    systemStatus,
    ...rest.map((status, index) => ({
      ...status,
      sortOrder: index + 1,
    })),
  ];
};

const normalizeOrderStatuses = (statuses?: OrderStatusSetting[], legacy?: Partial<AppSettings['orders']>): OrderStatusSetting[] => {
  const source = Array.isArray(statuses) && statuses.length > 0
    ? statuses
    : defaultOrderStatuses.map((status) => ({
        ...status,
        label: legacy?.statusLabels?.[legacyStatusKeyMap[status.code]] || status.label,
        color: legacy?.statusColors?.[legacyStatusKeyMap[status.code]] || status.color,
      }));

  const normalized = source
    .map((status, index) => ({
      ...status,
      id: status.id || `status_${Date.now()}_${index}`,
      code: normalizeStatusCode(status.code || status.label) || `status_${index + 1}`,
      label: decodeMojibake(status.label) || `Статус ${index + 1}`,
      color: status.color || defaultOrderStatuses.find((item) => item.code === status.code)?.color || '#6b7280',
      enabled: status.enabled !== false,
      isFinal: Boolean(status.isFinal),
      isSystem: Boolean(status.isSystem),
      sortOrder: status.sortOrder ?? index + 1,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const withSystemStatus = ensureSystemNewOrderStatus(normalized);
  return withSystemStatus.length > 0 ? withSystemStatus : [buildSystemNewOrderStatus()];
};

export const getEnabledOrderStatuses = (settings: AppSettings) =>
  settings.orders.statuses.filter((status) => status.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

export const getOrderStatusDefinition = (statusCode: string, settings: AppSettings) => {
  if (statusCode === 'pending' || statusCode === SYSTEM_NEW_ORDER_STATUS_CODE) {
    const systemStatus = settings.orders.statuses.find((status) => isSystemNewOrderStatus(status));
    if (systemStatus) {
      return { ...systemStatus, code: statusCode };
    }
  }

  return (
    settings.orders.statuses.find((status) => status.code === statusCode) ||
    defaultOrderStatuses.find((status) => status.code === statusCode) || {
    id: `status_${statusCode}`,
    code: statusCode,
    label: settings.orders.statusLabels[statusCode] || statusCode,
    color: settings.orders.statusColors[statusCode] || '#6b7280',
    enabled: true,
    isFinal: false,
    sortOrder: 999,
  });
};

export const getDefaultOpenOrderStatus = (settings: AppSettings) => {
  const enabled = getEnabledOrderStatuses(settings);
  const systemNew = enabled.find((status) => isSystemNewOrderStatus(status));
  if (systemNew) {
    return systemNew.code;
  }

  return (
    enabled.find((status) => status.code === SYSTEM_NEW_ORDER_STATUS_CODE)?.code ||
    enabled.find((status) => !status.isFinal)?.code ||
    enabled[0]?.code ||
    SYSTEM_NEW_ORDER_STATUS_CODE
  );
};

export const getReadyOrderStatus = (settings: AppSettings) =>
  getEnabledOrderStatuses(settings).find((status) => status.code === 'ready')?.code ||
  getEnabledOrderStatuses(settings).find((status) => /готов/i.test(status.label))?.code ||
  getDefaultOpenOrderStatus(settings);

export const getCompletedOrderStatus = (settings: AppSettings) =>
  getEnabledOrderStatuses(settings).find((status) => status.code === 'completed')?.code ||
  getEnabledOrderStatuses(settings).find((status) => status.isFinal)?.code ||
  'completed';

export const getCancelledOrderStatus = (settings: AppSettings) =>
  getEnabledOrderStatuses(settings).find((status) => status.code === 'cancelled')?.code ||
  defaultOrderStatuses.find((status) => status.code === 'cancelled')?.code ||
  'cancelled';

export const isFinalOrderStatus = (statusCode: string, settings: AppSettings) =>
  Boolean(getOrderStatusDefinition(statusCode, settings).isFinal);

// Document template defaults are centralized in documentTemplateDefaults.ts

const defaultSettings: AppSettings = deepDecodeStrings({
  forms: {
    orderTypes: [
      { id: 'ot_repair', code: 'repair', label: 'Ремонт', enabled: true, sortOrder: 1 },
      { id: 'ot_diagnostics', code: 'diagnostics', label: 'Диагностика', enabled: true, sortOrder: 2 },
      { id: 'ot_accessories', code: 'accessories', label: 'Продажа аксессуаров', enabled: true, sortOrder: 3 },
      { id: 'ot_warranty', code: 'warranty', label: 'Гарантийное обращение', enabled: true, sortOrder: 4 },
    ],
    clientTypes: [
      { id: 'ct_individual', code: 'individual', label: 'Физическое лицо', enabled: true, sortOrder: 1 },
      { id: 'ct_company', code: 'company', label: 'Компания', enabled: true, sortOrder: 2 },
    ],
    orderFields: [
      { id: 'of_client_name', code: 'clientName', label: 'ФИО клиента', enabled: true, required: true, sortOrder: 1 },
      { id: 'of_phone', code: 'phone', label: 'Телефон', enabled: true, required: true, sortOrder: 2 },
      { id: 'of_model', code: 'model', label: 'Модель', enabled: true, required: false, sortOrder: 3 },
      { id: 'of_color', code: 'color', label: 'Цвет', enabled: true, required: true, sortOrder: 4 },
      { id: 'of_serial', code: 'serialNumber', label: 'Серийный номер', enabled: true, required: true, sortOrder: 5 },
      { id: 'of_imei', code: 'imei', label: 'IMEI / идентификатор', enabled: true, required: true, sortOrder: 6 },
      { id: 'of_reason', code: 'reasonForContact', label: 'Причина обращения', enabled: true, required: true, sortOrder: 7 },
      { id: 'of_appearance', code: 'appearance', label: 'Внешний вид', enabled: true, required: false, sortOrder: 8 },
      { id: 'of_password', code: 'password', label: 'Пароль / код блокировки', enabled: true, required: true, sortOrder: 9 },
      { id: 'of_completeness', code: 'completeness', label: 'Комплектация', enabled: true, required: true, sortOrder: 10 },
      { id: 'of_notes', code: 'receptionistNotes', label: 'Заметки приемщика', enabled: true, required: false, sortOrder: 11 },
      { id: 'of_estimated', code: 'estimatedPrice', label: 'Ориентировочная стоимость', enabled: true, required: false, sortOrder: 12 },
      { id: 'of_recommend', code: 'recommendations', label: 'Рекомендации', enabled: true, required: false, sortOrder: 13 },
    ],
    clientFields: [
      { id: 'cf_email', code: 'email', label: 'Email', enabled: true, required: false, sortOrder: 1 },
      { id: 'cf_source', code: 'howDidYouKnow', label: 'Источник обращения', enabled: true, required: false, sortOrder: 2 },
      { id: 'cf_comment', code: 'clientComment', label: 'Заметка по клиенту', enabled: true, required: false, sortOrder: 3 },
      { id: 'cf_discount', code: 'discount', label: 'Скидка', enabled: true, required: false, sortOrder: 4 },
      { id: 'cf_birthday', code: 'birthday', label: 'Дата рождения', enabled: true, required: false, sortOrder: 5 },
      {
        id: 'cf_inn',
        code: 'inn',
        label: 'ИНН',
        enabled: true,
        required: true,
        sortOrder: 6,
        clientTypes: ['company'],
      },
      {
        id: 'cf_bank_account',
        code: 'bankAccount',
        label: 'Расчётный счёт',
        enabled: true,
        required: true,
        sortOrder: 7,
        clientTypes: ['company'],
      },
    ],
    directories: [
      { id: 'dir_order_statuses', code: 'order_statuses', label: 'Статусы заказов', enabled: true, sortOrder: 1 },
      { id: 'dir_inventory_categories', code: 'inventory_categories', label: 'Категории склада', enabled: true, sortOrder: 2 },
      { id: 'dir_positions', code: 'employee_positions', label: 'Должности сотрудников', enabled: true, sortOrder: 3 },
      { id: 'dir_departments', code: 'employee_departments', label: 'Отделы сотрудников', enabled: true, sortOrder: 4 },
      { id: 'dir_cash_categories', code: 'cash_categories', label: 'Категории кассы', enabled: true, sortOrder: 5 },
      { id: 'dir_work_types', code: 'work_types', label: 'Типы работ', enabled: true, sortOrder: 6 },
    ],
  },
  profile: {
    name: 'Администратор',
    email: 'admin@example.com',
    phone: '+7 (999) 123-45-67',
    avatar: '',
  },
  locations: {
    items: [],
  },
  employees: {
    defaultIntakeRate: 5,
    defaultExecutionRate: 10,
    defaultDeliveryRate: 3,
    defaultWorkStartTime: '10:00',
    defaultWorkEndTime: '19:00',
  },
  employeeWork: {
    schedules: [],
    rosterEntries: [],
    rosterHiddenEntries: [],
    tasks: [],
  },
  notifications: {
    smsNotifications: false,
    smsStatusTriggers: {
      new: false,
      diagnosis: false,
      waiting_parts: false,
      waiting_client: false,
      in_progress: false,
      ready: true,
      completed: false,
      cancelled: false,
    },
  },
  business: {
    companyName: '',
    address: '',
    phone: '',
    email: '',
    workingHours: '10:00 - 19:00',
    timezone: 'Europe/Moscow',
    logoUrl: '',
  },
  appearance: structuredClone(DEFAULT_APPEARANCE),
  orders: {
    defaultPriority: 'medium',
    autoOpenCompletionAfterPayment: true,
    createMode: 'step',
    warehouses: [],
    quickSaleOptions: [],
    statuses: structuredClone(defaultOrderStatuses),
    statusLabels: buildStatusMaps(defaultOrderStatuses).labels,
    statusColors: buildStatusMaps(defaultOrderStatuses).colors,
  },
  documents: {
    acceptanceActTitle: 'Акт приема-передачи',
    completionActTitle: 'Акт выполненных работ',
    warrantyText:
      'Клиент согласен с тем, что использование устройства без защитного аксессуара лишает гарантии на экран и иные чувствительные элементы.',
    footerDisclaimer: 'Документ сформирован в CRM.',
    templates: builtInTemplates,
  },
  payment: {
    currency: 'RUB',
    taxRate: 0,
    paymentMethods: ['cash', 'card', 'transfer'],
    paymentMethodOptions: [
      { code: 'cash', label: 'Наличные', enabled: true, registerType: 'cashbox' },
      { code: 'card', label: 'Безнал / карта', enabled: true, registerType: 'bank_terminal' },
      { code: 'transfer', label: 'Перевод', enabled: true, registerType: 'online' },
      { code: 'installment', label: 'Рассрочка', enabled: false, registerType: 'mixed' },
    ],
    installmentEnabled: true,
    cashRegisterName: 'Основная касса',
    terminalName: 'Основной терминал',
  },
  system: {
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: 365,
    language: 'ru',
    theme: 'light',
    onboardingCompleted: true,
  },
  integrations: {
    smsProvider: 'none',
    smsConnected: false,
    smsCredentials: {},
    smsWebhookUrl: '',
    smsApiToken: '',
    smsSenderName: '',
    smsWebhookMethod: 'POST',
    smsTemplateReady:
      'Здравствуйте, {{ФИОКлиента}}. Ваш заказ {{НомерЗаказа}} готов к выдаче в {{НазваниеКомпании}}. Остаток к оплате: {{Долг}} ₽. Telegram: {{telegramBotLink}} Телефон: {{ТелефонКомпании}}.',
    smsStatusTemplates: {
      diagnosis:
        'Здравствуйте, {{ФИОКлиента}}. Заказ {{НомерЗаказа}} принят в диагностику в {{НазваниеКомпании}}. Устройство: {{Устройство}}. Телефон: {{ТелефонКомпании}}. Чат в Telegram: {{telegramBotLink}}',
      waiting_parts:
        'Здравствуйте, {{ФИОКлиента}}. По заказу {{НомерЗаказа}} ожидаются запчасти. Как только они поступят, мы сообщим. {{НазваниеКомпании}}, {{ТелефонКомпании}}. Чат в Telegram: {{telegramBotLink}}',
      waiting_client:
        'Здравствуйте, {{ФИОКлиента}}. По заказу {{НомерЗаказа}} требуется ваше уточнение или действие. Свяжитесь с {{НазваниеКомпании}}: {{ТелефонКомпании}}. Чат в Telegram: {{telegramBotLink}}',
      in_progress:
        'Здравствуйте, {{ФИОКлиента}}. Заказ {{НомерЗаказа}} сейчас в работе. Устройство: {{Устройство}}. {{НазваниеКомпании}}, {{ТелефонКомпании}}. Чат в Telegram: {{telegramBotLink}}',
      ready:
        'Здравствуйте, {{ФИОКлиента}}! Заказ {{НомерЗаказа}} готов к выдаче. Остаток: {{Долг}} ₽. {{НазваниеКомпании}}, {{ТелефонКомпании}}. {{telegramBotLink}}',
      completed:
        'Здравствуйте, {{ФИОКлиента}}. Заказ {{НомерЗаказа}} завершен. Спасибо, что выбрали {{НазваниеКомпании}}. Чат в Telegram: {{telegramBotLink}}',
      cancelled:
        'Здравствуйте, {{ФИОКлиента}}. Заказ {{НомерЗаказа}} отменен. Если нужна помощь, свяжитесь с {{НазваниеКомпании}}: {{ТелефонКомпании}}. Чат в Telegram: {{telegramBotLink}}',
    },
    telegramMode: 'crm',
    telegramLinkTemplate: 'https://t.me/share/url?url={{siteUrlEncoded}}&text={{messageEncoded}}',
    telegramConnected: false,
    telegramBotToken: '',
    telegramBotUsername: '',
    callMode: 'tel',
    callLinkTemplate: 'tel:{{phone}}',
  },
  license: {
    plan: 'Базовый тариф',
    key: '',
  },
  employeeAccess: {
    visibleSections: [
      'documents',
      'business',
      'locations',
      'employees',
      'integrations',
      'orders',
      'quickSales',
      'statuses',
      'notifications',
      'paymentCategories',
      'paymentMethods',
      'clientFields',
    ],
    selfEditableFields: ['avatar', 'phone'],
  },
});

const normalizeTemplate = (template: Partial<DocumentTemplate>, index: number): DocumentTemplate => ({
  id: template.id || `document_template_${index + 1}`,
  name: template.name || getBuiltInTemplateById(template.id)?.name || `Шаблон ${index + 1}`,
  type: template.type || getBuiltInTemplateById(template.id)?.type || 'custom',
  category: template.category || getBuiltInTemplateById(template.id)?.category || 'other',
  description: template.description || '',
  template: template.template ||
    getBuiltInTemplateById(template.id)?.template ||
    '',
  variables:
    Array.isArray(template.variables) && template.variables.length
      ? template.variables
      : getBuiltInTemplateById(template.id)?.variables || [],
  isActive: template.isActive ?? true,
  createdAt: new Date(template.createdAt || new Date()),
  updatedAt: new Date(template.updatedAt || new Date()),
});

const upgradeLegacyTemplate = (template: DocumentTemplate): DocumentTemplate =>
  upgradeBuiltInTemplateFixed(template);

const mergeFormListByCode = <T extends { code: string; sortOrder?: number }>(
  saved: T[],
  defaults: T[]
): T[] => {
  const byCode = new Map(saved.map((item) => [item.code, item]));

  for (const item of defaults) {
    if (!byCode.has(item.code)) {
      byCode.set(item.code, item);
    }
  }

  return Array.from(byCode.values()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

const normalizeSettings = (input: Partial<AppSettings>): AppSettings => {
  const normalizedStatuses = normalizeOrderStatuses(input.orders?.statuses, input.orders);
  const normalizedStatusMaps = buildStatusMaps(normalizedStatuses);
  const now = new Date().toISOString();

  return ({
  ...structuredClone(defaultSettings),
  ...input,
  forms: {
    orderTypes: (input.forms?.orderTypes || defaultSettings.forms.orderTypes)
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || defaultSettings.forms.orderTypes[index]?.label || item.code,
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    clientTypes: (input.forms?.clientTypes || defaultSettings.forms.clientTypes)
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || defaultSettings.forms.clientTypes[index]?.label || item.code,
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    orderFields: (input.forms?.orderFields || defaultSettings.forms.orderFields)
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || defaultSettings.forms.orderFields[index]?.label || item.code,
        required: Boolean(item.required),
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    clientFields: mergeFormListByCode(
      input.forms?.clientFields || defaultSettings.forms.clientFields,
      defaultSettings.forms.clientFields
    )
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || defaultSettings.forms.clientFields[index]?.label || item.code,
        required: Boolean(item.required),
        clientTypes: Array.isArray(item.clientTypes) ? item.clientTypes : undefined,
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    directories: (input.forms?.directories || defaultSettings.forms.directories)
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || defaultSettings.forms.directories[index]?.label || item.code,
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  },
  profile: {
    ...defaultSettings.profile,
    ...input.profile,
    name: decodeMojibake(input.profile?.name) || defaultSettings.profile.name,
    email: decodeMojibake(input.profile?.email) || defaultSettings.profile.email,
    phone: decodeMojibake(input.profile?.phone) || defaultSettings.profile.phone,
    avatar: input.profile?.avatar || defaultSettings.profile.avatar,
  },
  locations: {
    ...defaultSettings.locations,
    ...input.locations,
    items: (input.locations?.items || defaultSettings.locations.items).map((item) => decodeMojibake(item)),
  },
  employees: {
    ...defaultSettings.employees,
    ...input.employees,
    defaultWorkStartTime: input.employees?.defaultWorkStartTime || defaultSettings.employees.defaultWorkStartTime,
    defaultWorkEndTime: input.employees?.defaultWorkEndTime || defaultSettings.employees.defaultWorkEndTime,
  },
  employeeWork: {
    schedules: (input.employeeWork?.schedules || []).map((entry, index) => ({
      id: entry.id || `schedule_${Date.now()}_${index}`,
      employeeId: String(entry.employeeId || ''),
      date: String(entry.date || new Date().toISOString().slice(0, 10)),
      startTime: String(entry.startTime || '10:00'),
      endTime: String(entry.endTime || '19:00'),
      location: decodeMojibake(entry.location) || '',
      note: decodeMojibake(entry.note) || '',
      isDayOff: Boolean(entry.isDayOff),
      updatedAt: entry.updatedAt || now,
    })).filter((entry) => entry.employeeId),
    rosterEntries: (input.employeeWork?.rosterEntries || []).map((entry, index) => ({
      id: entry.id || `schedule_roster_${Date.now()}_${index}`,
      employeeId: String(entry.employeeId || ''),
      month: String(entry.month || now.slice(0, 7)),
      updatedAt: entry.updatedAt || now,
    })).filter((entry) => entry.employeeId && /^\d{4}-\d{2}$/.test(entry.month)),
    rosterHiddenEntries: (input.employeeWork?.rosterHiddenEntries || []).map((entry, index) => ({
      id: entry.id || `schedule_hidden_${Date.now()}_${index}`,
      employeeId: String(entry.employeeId || ''),
      month: String(entry.month || now.slice(0, 7)),
      updatedAt: entry.updatedAt || now,
    })).filter((entry) => entry.employeeId && /^\d{4}-\d{2}$/.test(entry.month)),
    tasks: (input.employeeWork?.tasks || []).map((task, index) => {
      const status = ['todo', 'in_progress', 'done', 'blocked'].includes(task.status) ? task.status : 'todo';
      const progress = Math.max(0, Math.min(100, Number(task.progress || 0)));

      return {
        id: task.id || `task_${Date.now()}_${index}`,
        employeeId: String(task.employeeId || ''),
        title: decodeMojibake(task.title) || `Задача ${index + 1}`,
        description: decodeMojibake(task.description) || '',
        dueDate: task.dueDate || '',
        status,
        priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
        progress: status === 'done' ? 100 : progress,
        createdAt: task.createdAt || now,
        updatedAt: task.updatedAt || now,
        completedAt: task.completedAt || (status === 'done' ? now : undefined),
      };
    }).filter((task) => task.employeeId && task.title),
  },
  notifications: {
    smsNotifications: Boolean(input.notifications?.smsNotifications ?? defaultSettings.notifications.smsNotifications),
    smsStatusTriggers: migrateSmsRecordKeys({
      ...defaultSettings.notifications.smsStatusTriggers,
      ...input.notifications?.smsStatusTriggers,
    }),
  },
  business: {
    ...defaultSettings.business,
    ...input.business,
    companyName: decodeMojibake(input.business?.companyName) || defaultSettings.business.companyName,
    address: decodeMojibake(input.business?.address) || defaultSettings.business.address,
    phone: decodeMojibake(input.business?.phone) || defaultSettings.business.phone,
    email: decodeMojibake(input.business?.email) || defaultSettings.business.email,
    workingHours: decodeMojibake(input.business?.workingHours) || defaultSettings.business.workingHours,
    logoUrl: typeof input.business?.logoUrl === 'string' ? input.business.logoUrl : defaultSettings.business.logoUrl,
  },
  appearance: normalizeAppearance({
    ...defaultSettings.appearance,
    ...input.appearance,
    mode:
      input.appearance?.mode ||
      (input.system?.theme === 'dark' ? 'dark' : defaultSettings.appearance.mode),
  }),
  orders: {
    ...defaultSettings.orders,
    ...input.orders,
    createMode: input.orders?.createMode === 'single' ? 'single' : 'step',
    warehouses: (input.orders?.warehouses || defaultSettings.orders.warehouses)
      .map((item, index) => ({
        ...item,
        name: decodeMojibake(item.name) || `Склад ${index + 1}`,
        description: decodeMojibake(item.description) || '',
        enabled: item.enabled ?? true,
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    quickSaleOptions: (input.orders?.quickSaleOptions || defaultSettings.orders.quickSaleOptions)
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || `Быстрая продажа ${index + 1}`,
        category: decodeMojibake(item.category) || '',
        saleMode: (item.saleMode === 'single' ? 'single' : 'quantity') as 'single' | 'quantity',
        enabled: item.enabled ?? true,
        sortOrder: item.sortOrder ?? index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    statuses: normalizedStatuses,
    statusLabels: normalizedStatusMaps.labels,
    statusColors: normalizedStatusMaps.colors,
  },
  documents: {
    ...defaultSettings.documents,
    ...input.documents,
    acceptanceActTitle:
      (hasBrokenEncoding(input.documents?.acceptanceActTitle)
        ? 'Акт приема-передачи'
        : decodeMojibake(input.documents?.acceptanceActTitle)) || 'Акт приема-передачи',
    completionActTitle:
      (hasBrokenEncoding(input.documents?.completionActTitle)
        ? 'Акт выполненных работ'
        : decodeMojibake(input.documents?.completionActTitle)) || 'Акт выполненных работ',
    warrantyText:
      (hasBrokenEncoding(input.documents?.warrantyText)
        ? 'Клиент согласен с тем, что использование устройства без защитного аксессуара лишает гарантии на экран и иные чувствительные элементы.'
        : decodeMojibake(input.documents?.warrantyText)) ||
      'Клиент согласен с тем, что использование устройства без защитного аксессуара лишает гарантии на экран и иные чувствительные элементы.',
    footerDisclaimer:
      (hasBrokenEncoding(input.documents?.footerDisclaimer)
        ? 'Документ сформирован в CRM.'
        : decodeMojibake(input.documents?.footerDisclaimer)) || 'Документ сформирован в CRM.',
    templates: (input.documents?.templates || defaultSettings.documents.templates)
      .map(normalizeTemplate)
      .map(upgradeLegacyTemplate),
  },
  payment: {
    ...defaultSettings.payment,
    ...input.payment,
    paymentMethodOptions: (input.payment?.paymentMethodOptions || defaultSettings.payment.paymentMethodOptions).map(
      (item, index) => ({
        code: item.code || `method_${index + 1}`,
        label: decodeMojibake(item.label) || item.code || `Способ ${index + 1}`,
        enabled: item.enabled ?? true,
        registerType: item.registerType || 'cashbox',
      })
    ),
    paymentMethods:
      input.payment?.paymentMethodOptions && input.payment.paymentMethodOptions.length > 0
        ? input.payment.paymentMethodOptions.filter((item) => item.enabled !== false).map((item) => item.code)
        : Array.isArray(input.payment?.paymentMethods) && input.payment.paymentMethods.length > 0
          ? input.payment.paymentMethods
          : defaultSettings.payment.paymentMethodOptions.filter((item) => item.enabled).map((item) => item.code),
    cashRegisterName: decodeMojibake(input.payment?.cashRegisterName) || defaultSettings.payment.cashRegisterName,
    terminalName: decodeMojibake(input.payment?.terminalName) || defaultSettings.payment.terminalName,
  },
  system: {
    ...defaultSettings.system,
    ...input.system,
    onboardingCompleted: input.system?.onboardingCompleted ?? defaultSettings.system.onboardingCompleted ?? true,
    theme: normalizeAppearance({
      ...defaultSettings.appearance,
      ...input.appearance,
      mode:
        input.appearance?.mode ||
        (input.system?.theme === 'dark' ? 'dark' : defaultSettings.appearance.mode),
    }).mode,
  },
  integrations: {
    ...defaultSettings.integrations,
    ...input.integrations,
    smsProvider: input.integrations?.smsProvider || defaultSettings.integrations.smsProvider,
    smsConnected: Boolean(input.integrations?.smsConnected),
    smsCredentials: {
      ...defaultSettings.integrations.smsCredentials,
      ...(input.integrations?.smsCredentials || {}),
    },
    smsWebhookUrl: decodeMojibake(input.integrations?.smsWebhookUrl) || defaultSettings.integrations.smsWebhookUrl,
    smsApiToken: decodeMojibake(input.integrations?.smsApiToken) || defaultSettings.integrations.smsApiToken,
    smsSenderName: decodeMojibake(input.integrations?.smsSenderName) || defaultSettings.integrations.smsSenderName,
    smsTemplateReady: decodeMojibake(input.integrations?.smsTemplateReady) || defaultSettings.integrations.smsTemplateReady,
    smsStatusTemplates: migrateSmsRecordKeys({
      ...defaultSettings.integrations.smsStatusTemplates,
      ...input.integrations?.smsStatusTemplates,
      diagnosis:
        decodeMojibake(input.integrations?.smsStatusTemplates?.diagnosis) ||
        defaultSettings.integrations.smsStatusTemplates.diagnosis,
      waiting_parts:
        decodeMojibake(input.integrations?.smsStatusTemplates?.waiting_parts) ||
        decodeMojibake(input.integrations?.smsStatusTemplates?.waitingParts) ||
        defaultSettings.integrations.smsStatusTemplates.waiting_parts,
      waiting_client:
        decodeMojibake(input.integrations?.smsStatusTemplates?.waiting_client) ||
        decodeMojibake(input.integrations?.smsStatusTemplates?.waitingClient) ||
        defaultSettings.integrations.smsStatusTemplates.waiting_client,
      in_progress:
        decodeMojibake(input.integrations?.smsStatusTemplates?.in_progress) ||
        decodeMojibake(input.integrations?.smsStatusTemplates?.inProgress) ||
        defaultSettings.integrations.smsStatusTemplates.in_progress,
      ready:
        decodeMojibake(input.integrations?.smsStatusTemplates?.ready) ||
        defaultSettings.integrations.smsStatusTemplates.ready,
      completed:
        decodeMojibake(input.integrations?.smsStatusTemplates?.completed) ||
        defaultSettings.integrations.smsStatusTemplates.completed,
      cancelled:
        decodeMojibake(input.integrations?.smsStatusTemplates?.cancelled) ||
        defaultSettings.integrations.smsStatusTemplates.cancelled,
    }),
    smsWebhookMethod: input.integrations?.smsWebhookMethod || defaultSettings.integrations.smsWebhookMethod,
    telegramMode: input.integrations?.telegramMode || defaultSettings.integrations.telegramMode,
    telegramLinkTemplate:
      decodeMojibake(input.integrations?.telegramLinkTemplate) || defaultSettings.integrations.telegramLinkTemplate,
    telegramConnected: Boolean(input.integrations?.telegramConnected),
    telegramBotToken: decodeMojibake(input.integrations?.telegramBotToken) || '',
    telegramBotUsername: decodeMojibake(input.integrations?.telegramBotUsername) || '',
    callMode: input.integrations?.callMode || defaultSettings.integrations.callMode,
    callLinkTemplate:
      decodeMojibake(input.integrations?.callLinkTemplate) || defaultSettings.integrations.callLinkTemplate,
  },
  license: {
    ...defaultSettings.license,
    ...input.license,
    plan: decodeMojibake(input.license?.plan) || defaultSettings.license.plan,
    key: decodeMojibake(input.license?.key) || defaultSettings.license.key,
  },
  employeeAccess: {
    ...defaultSettings.employeeAccess,
    ...input.employeeAccess,
    visibleSections: (() => {
      const saved = input.employeeAccess?.visibleSections;
      if (
        !Array.isArray(saved) ||
        saved.length === 0 ||
        (saved.length === 1 && saved[0] === 'profile')
      ) {
        return defaultSettings.employeeAccess.visibleSections;
      }
      return saved;
    })(),
    selfEditableFields: Array.isArray(input.employeeAccess?.selfEditableFields)
      ? input.employeeAccess!.selfEditableFields.filter((field) =>
          ['avatar', 'phone', 'name'].includes(field)
        )
      : defaultSettings.employeeAccess.selfEditableFields,
  },
});
}

class AppSettingsService {
  private storageKey() {
    return tenantStorageKey(SETTINGS_STORAGE_BASE, getStoredTenantId());
  }

  private notifyUpdate(settings: AppSettings) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: settings }));
    }
  }

  getDefaults(): AppSettings {
    return structuredClone(defaultSettings);
  }

  getSettings(): AppSettings {
    const saved = localStorage.getItem(this.storageKey());
    if (!saved) {
      return this.getDefaults();
    }

    try {
      const normalized = normalizeSettings(JSON.parse(saved) as Partial<AppSettings>);
      localStorage.setItem(this.storageKey(), JSON.stringify(normalized));
      return normalized;
    } catch {
      return this.getDefaults();
    }
  }

  cacheSettingsLocally(settings: AppSettings): AppSettings {
    const normalized = normalizeSettings(settings);
    localStorage.setItem(this.storageKey(), JSON.stringify(normalized));
    return normalized;
  }

  async refreshFromApi(options?: { notify?: boolean; persist?: boolean }): Promise<AppSettings> {
    const notify = options?.notify !== false;
    const persist = options?.persist !== false;

    try {
      const remote = await apiService.get<Partial<AppSettings>>('/settings');
      const normalized = normalizeSettings(remote);
      if (persist) {
        localStorage.setItem(this.storageKey(), JSON.stringify(normalized));
      }
      if (notify) {
        this.notifyUpdate(normalized);
      }
      if (isStoredUserAdmin() && hasLegacyDocumentTemplatesFixed(remote.documents?.templates)) {
        try {
          await apiService.put('/settings', normalized);
        } catch {
          // Keep upgraded settings locally even if persistence fails temporarily.
        }
      }
      return normalized;
    } catch {
      return this.getSettings();
    }
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const normalized = normalizeSettings(settings);
    localStorage.setItem(this.storageKey(), JSON.stringify(normalized));
    this.notifyUpdate(normalized);

    await apiService.put('/settings', normalized);

    // Keep the payload we just saved. Re-normalizing the PUT response can reset
    // appearance.mode to light and rewrite document templates via server migrations.
    localStorage.setItem(this.storageKey(), JSON.stringify(normalized));
    this.notifyUpdate(normalized);

    return normalized;
  }

  async resetSettings(): Promise<AppSettings> {
    const defaults = this.getDefaults();
    localStorage.setItem(this.storageKey(), JSON.stringify(defaults));
    this.notifyUpdate(defaults);

    try {
      await apiService.put('/settings', defaults);
    } catch {
      // Keep defaults locally as fallback.
    }

    return defaults;
  }
}

export const appSettingsService = new AppSettingsService();

export const isOnboardingRequired = (settings: AppSettings) => settings.system?.onboardingCompleted === false;
