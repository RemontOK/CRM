import { AppSettings, DocumentTemplate, OrderStatusSetting } from '../types';
import { apiService } from './api';
import {
  getBuiltInDocumentTemplates as getFixedBuiltInDocumentTemplates,
  hasLegacyDocumentTemplates as hasLegacyDocumentTemplatesFixed,
  upgradeBuiltInDocumentTemplate as upgradeBuiltInTemplateFixed,
} from './documentTemplateDefaults';

const SETTINGS_STORAGE_KEY = 'nek_crm_app_settings';
const SETTINGS_UPDATED_EVENT = 'crm:settings-updated';

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
      sortOrder: status.sortOrder ?? index + 1,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return normalized.length > 0 ? normalized : structuredClone(defaultOrderStatuses);
};

export const getEnabledOrderStatuses = (settings: AppSettings) =>
  settings.orders.statuses.filter((status) => status.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

export const getOrderStatusDefinition = (statusCode: string, settings: AppSettings) =>
  settings.orders.statuses.find((status) => status.code === statusCode) ||
  defaultOrderStatuses.find((status) => status.code === statusCode) || {
    id: `status_${statusCode}`,
    code: statusCode,
    label: settings.orders.statusLabels[statusCode] || statusCode,
    color: settings.orders.statusColors[statusCode] || '#6b7280',
    enabled: true,
    isFinal: false,
    sortOrder: 999,
  };

export const getDefaultOpenOrderStatus = (settings: AppSettings) =>
  getEnabledOrderStatuses(settings).find((status) => !status.isFinal)?.code ||
  getEnabledOrderStatuses(settings)[0]?.code ||
  'diagnosis';

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
    email: 'admin@nekservice.ru',
    phone: '+7 (999) 123-45-67',
    avatar: '',
  },
  locations: {
    items: ['Основной сервис', 'Пункт приема'],
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
    tasks: [],
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderUpdates: true,
    paymentReminders: true,
    lowStockAlerts: true,
    smsOnReadyStatus: true,
    smsStatusTriggers: {
      diagnosis: false,
      waitingParts: false,
      waitingClient: false,
      inProgress: false,
      ready: true,
      completed: false,
      cancelled: false,
    },
  },
  business: {
    companyName: 'НЭК Сервис',
    address: 'Екатеринбург, ул. Примерная, д. 1',
    phone: '+7 (938) 309-18-77',
    email: 'info@nekservice.ru',
    workingHours: '10:00 - 19:00',
    timezone: 'Asia/Yekaterinburg',
  },
  orders: {
    defaultPriority: 'medium',
    autoOpenCompletionAfterPayment: true,
    createMode: 'step',
    quickSaleOptions: [
      {
        id: 'quick_sale_screen_protection',
        label: 'Защита экрана',
        category: 'Защита экрана',
        saleMode: 'single',
        enabled: true,
        sortOrder: 1,
      },
      {
        id: 'quick_sale_accessory',
        label: 'Продать аксессуар',
        category: 'Аксессуары',
        saleMode: 'quantity',
        enabled: true,
        sortOrder: 2,
      },
      {
        id: 'quick_sale_product',
        label: 'Продажа товара',
        category: 'Товары',
        saleMode: 'quantity',
        enabled: true,
        sortOrder: 3,
      },
    ],
    statuses: structuredClone(defaultOrderStatuses),
    statusLabels: buildStatusMaps(defaultOrderStatuses).labels,
    statusColors: buildStatusMaps(defaultOrderStatuses).colors,
  },
  documents: {
    acceptanceActTitle: 'Акт приема-передачи',
    completionActTitle: 'Акт выполненных работ',
    warrantyText:
      'Клиент согласен с тем, что использование устройства без защитного аксессуара лишает гарантии на экран и иные чувствительные элементы.',
    footerDisclaimer: 'Документ сформирован в CRM НЭК Сервис.',
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
  },
  integrations: {
    smsProvider: 'none',
    smsWebhookUrl: '',
    smsApiToken: '',
    smsSenderName: 'НЭК Сервис',
    smsWebhookMethod: 'POST',
    smsTemplateReady:
      'Здравствуйте, {{clientName}}. Ваш заказ {{orderNumber}} готов к выдаче в {{companyName}}. Остаток к оплате: {{debt}} ₽. Телефон: {{companyPhone}}.',
    smsStatusTemplates: {
      diagnosis: 'Здравствуйте, {{clientName}}. Заказ {{orderNumber}} принят в диагностику в {{companyName}}. Устройство: {{device}}. Телефон: {{companyPhone}}.',
      waitingParts: 'Здравствуйте, {{clientName}}. По заказу {{orderNumber}} ожидаются запчасти. Как только они поступят, мы сообщим. {{companyName}}, {{companyPhone}}.',
      waitingClient: 'Здравствуйте, {{clientName}}. По заказу {{orderNumber}} требуется ваше уточнение или действие. Свяжитесь с {{companyName}}: {{companyPhone}}.',
      inProgress: 'Здравствуйте, {{clientName}}. Заказ {{orderNumber}} сейчас в работе. Устройство: {{device}}. {{companyName}}, {{companyPhone}}.',
      ready: 'Здравствуйте, {{clientName}}. Ваш заказ {{orderNumber}} готов к выдаче в {{companyName}}. Остаток к оплате: {{debt}} ₽. Телефон: {{companyPhone}}.',
      completed: 'Здравствуйте, {{clientName}}. Заказ {{orderNumber}} завершен. Спасибо, что выбрали {{companyName}}.',
      cancelled: 'Здравствуйте, {{clientName}}. Заказ {{orderNumber}} отменен. Если нужна помощь, свяжитесь с {{companyName}}: {{companyPhone}}.',
    },
    whatsappMode: 'crm_and_link',
    whatsappLinkTemplate: 'https://wa.me/{{phoneDigits}}?text={{messageEncoded}}',
    telegramMode: 'crm',
    telegramLinkTemplate: 'https://t.me/share/url?url={{siteUrlEncoded}}&text={{messageEncoded}}',
    callMode: 'tel',
    callLinkTemplate: 'tel:{{phone}}',
  },
  license: {
    plan: 'Базовый тариф',
    key: '',
  },
});

const normalizeTemplate = (template: Partial<DocumentTemplate>, index: number): DocumentTemplate => ({
  id: template.id || `document_template_${index + 1}`,
  name:
    (hasBrokenEncoding(template.name)
      ? getBuiltInTemplateById(template.id)?.name
      : decodeMojibake(template.name)) || `Шаблон ${index + 1}`,
  type: template.type || getBuiltInTemplateById(template.id)?.type || 'custom',
  category: template.category || getBuiltInTemplateById(template.id)?.category || 'other',
  description:
    (hasBrokenEncoding(template.description)
      ? getBuiltInTemplateById(template.id)?.description
      : decodeMojibake(template.description)) || '',
  template:
    (hasBrokenEncoding(template.template) ? getBuiltInTemplateById(template.id)?.template : template.template) ||
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

const upgradeLegacyTemplate = (template: DocumentTemplate): DocumentTemplate => {
  const builtIn = getBuiltInTemplateById(template.id);

  if (builtIn && (template.id === 'tpl_acceptance_act' || template.id === 'tpl_completion_act')) {
    return {
      ...builtIn,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: new Date(),
    };
  }

  return upgradeBuiltInTemplateFixed(template);
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
    clientFields: (input.forms?.clientFields || defaultSettings.forms.clientFields)
      .map((item, index) => ({
        ...item,
        label: decodeMojibake(item.label) || defaultSettings.forms.clientFields[index]?.label || item.code,
        required: Boolean(item.required),
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
    ...defaultSettings.notifications,
    ...input.notifications,
    smsStatusTriggers: {
      ...defaultSettings.notifications.smsStatusTriggers,
      ...input.notifications?.smsStatusTriggers,
    },
  },
  business: {
    ...defaultSettings.business,
    ...input.business,
    companyName: decodeMojibake(input.business?.companyName) || defaultSettings.business.companyName,
    address: decodeMojibake(input.business?.address) || defaultSettings.business.address,
    phone: decodeMojibake(input.business?.phone) || defaultSettings.business.phone,
    email: decodeMojibake(input.business?.email) || defaultSettings.business.email,
    workingHours: decodeMojibake(input.business?.workingHours) || defaultSettings.business.workingHours,
  },
  orders: {
    ...defaultSettings.orders,
    ...input.orders,
    createMode: input.orders?.createMode === 'single' ? 'single' : 'step',
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
        ? 'Документ сформирован в CRM НЭК Сервис.'
        : decodeMojibake(input.documents?.footerDisclaimer)) || 'Документ сформирован в CRM НЭК Сервис.',
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
  },
  integrations: {
    ...defaultSettings.integrations,
    ...input.integrations,
    smsWebhookUrl: decodeMojibake(input.integrations?.smsWebhookUrl) || defaultSettings.integrations.smsWebhookUrl,
    smsApiToken: decodeMojibake(input.integrations?.smsApiToken) || defaultSettings.integrations.smsApiToken,
    smsSenderName: decodeMojibake(input.integrations?.smsSenderName) || defaultSettings.integrations.smsSenderName,
    smsTemplateReady: decodeMojibake(input.integrations?.smsTemplateReady) || defaultSettings.integrations.smsTemplateReady,
    smsStatusTemplates: {
      ...defaultSettings.integrations.smsStatusTemplates,
      ...input.integrations?.smsStatusTemplates,
      diagnosis: decodeMojibake(input.integrations?.smsStatusTemplates?.diagnosis) || defaultSettings.integrations.smsStatusTemplates.diagnosis,
      waitingParts: decodeMojibake(input.integrations?.smsStatusTemplates?.waitingParts) || defaultSettings.integrations.smsStatusTemplates.waitingParts,
      waitingClient: decodeMojibake(input.integrations?.smsStatusTemplates?.waitingClient) || defaultSettings.integrations.smsStatusTemplates.waitingClient,
      inProgress: decodeMojibake(input.integrations?.smsStatusTemplates?.inProgress) || defaultSettings.integrations.smsStatusTemplates.inProgress,
      ready: decodeMojibake(input.integrations?.smsStatusTemplates?.ready) || defaultSettings.integrations.smsStatusTemplates.ready,
      completed: decodeMojibake(input.integrations?.smsStatusTemplates?.completed) || defaultSettings.integrations.smsStatusTemplates.completed,
      cancelled: decodeMojibake(input.integrations?.smsStatusTemplates?.cancelled) || defaultSettings.integrations.smsStatusTemplates.cancelled,
    },
    smsWebhookMethod: input.integrations?.smsWebhookMethod || defaultSettings.integrations.smsWebhookMethod,
    whatsappMode: input.integrations?.whatsappMode || defaultSettings.integrations.whatsappMode,
    whatsappLinkTemplate:
      decodeMojibake(input.integrations?.whatsappLinkTemplate) || defaultSettings.integrations.whatsappLinkTemplate,
    telegramMode: input.integrations?.telegramMode || defaultSettings.integrations.telegramMode,
    telegramLinkTemplate:
      decodeMojibake(input.integrations?.telegramLinkTemplate) || defaultSettings.integrations.telegramLinkTemplate,
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
});
}

class AppSettingsService {
  private notifyUpdate(settings: AppSettings) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: settings }));
    }
  }

  getDefaults(): AppSettings {
    return structuredClone(defaultSettings);
  }

  getSettings(): AppSettings {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) {
      const defaults = this.getDefaults();
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }

    try {
      const normalized = normalizeSettings(JSON.parse(saved) as Partial<AppSettings>);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      const defaults = this.getDefaults();
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
  }

  async refreshFromApi(): Promise<AppSettings> {
    try {
      const remote = await apiService.get<Partial<AppSettings>>('/settings');
      const normalized = normalizeSettings(remote);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      this.notifyUpdate(normalized);
      if (hasLegacyDocumentTemplatesFixed(remote.documents?.templates)) {
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
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    this.notifyUpdate(normalized);

    try {
      await apiService.put('/settings', normalized);
    } catch {
      // Keep local cache if API is temporarily unavailable.
    }

    return normalized;
  }

  async resetSettings(): Promise<AppSettings> {
    const defaults = this.getDefaults();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
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
