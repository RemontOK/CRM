import { SettingsSectionKey } from '../types';
import type { User } from '../types';

export const SELF_EDITABLE_FIELD_OPTIONS = [
  { key: 'avatar' as const, label: 'Аватар' },
  { key: 'phone' as const, label: 'Телефон' },
  { key: 'name' as const, label: 'Имя' },
];

export type SelfEditableField = (typeof SELF_EDITABLE_FIELD_OPTIONS)[number]['key'];

export const SETTINGS_SECTION_OPTIONS: Array<{ key: SettingsSectionKey; label: string }> = [
  { key: 'documents', label: 'Документы' },
  { key: 'business', label: 'Общее' },
  { key: 'locations', label: 'Локации' },
  { key: 'employees', label: 'Сотрудники' },
  { key: 'integrations', label: 'Интеграции и SMS' },
  { key: 'orders', label: 'Заказы — общее' },
  { key: 'quickSales', label: 'Быстрые продажи' },
  { key: 'statuses', label: 'Статусы' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'paymentCategories', label: 'Статьи ДДС' },
  { key: 'paymentMethods', label: 'Методы оплаты' },
  { key: 'clientFields', label: 'Поля клиента' },
];

export const DEFAULT_EMPLOYEE_VISIBLE_SECTIONS: SettingsSectionKey[] = [
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
];

/** @deprecated Use DEFAULT_EMPLOYEE_VISIBLE_SECTIONS */
export const DEFAULT_VISIBLE_SECTIONS: SettingsSectionKey[] = [...DEFAULT_EMPLOYEE_VISIBLE_SECTIONS];

export const DEFAULT_SELF_EDITABLE_FIELDS: SelfEditableField[] = ['avatar', 'phone'];

const HIDDEN_SETTINGS_SECTIONS = new Set<SettingsSectionKey>(['license', 'profile', 'sms', 'email']);

const ALL_SETTINGS_SECTION_KEYS: SettingsSectionKey[] = [
  'business',
  'locations',
  'employees',
  'profile',
  'documents',
  'integrations',
  'license',
  'orders',
  'quickSales',
  'statuses',
  'notifications',
  'email',
  'sms',
  'paymentCategories',
  'paymentMethods',
  'clientFields',
];

const isLegacyMinimalVisibleSections = (sections?: SettingsSectionKey[] | null): boolean =>
  Array.isArray(sections) && sections.length === 1 && sections[0] === 'profile';

export const normalizeVisibleSections = (sections?: SettingsSectionKey[] | null): SettingsSectionKey[] => {
  if (isLegacyMinimalVisibleSections(sections) || !Array.isArray(sections) || sections.length === 0) {
    return [...DEFAULT_EMPLOYEE_VISIBLE_SECTIONS];
  }
  const allowed = new Set(ALL_SETTINGS_SECTION_KEYS.filter((key) => !HIDDEN_SETTINGS_SECTIONS.has(key)));
  const normalized = sections
    .map((key) => (key === ('warehouse' as SettingsSectionKey) ? 'locations' : key))
    .filter((key): key is SettingsSectionKey => allowed.has(key));
  let result = normalized.length > 0 ? normalized : [...DEFAULT_EMPLOYEE_VISIBLE_SECTIONS];

  if (!result.includes('quickSales') && result.some((key) => key === 'orders' || key === 'statuses')) {
    result = [...result];
    const ordersIndex = result.indexOf('orders');
    if (ordersIndex >= 0) {
      result.splice(ordersIndex + 1, 0, 'quickSales');
    } else {
      result.push('quickSales');
    }
  }

  return result;
};

export const normalizeSelfEditableFields = (fields?: string[] | null): SelfEditableField[] => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return [...DEFAULT_SELF_EDITABLE_FIELDS];
  }
  const allowed = new Set<SelfEditableField>(['avatar', 'phone', 'name']);
  const normalized = fields.filter((field): field is SelfEditableField => allowed.has(field as SelfEditableField));
  return normalized.length > 0 ? normalized : [...DEFAULT_SELF_EDITABLE_FIELDS];
};

const LEGACY_SECTION_MAP: Partial<Record<SettingsSectionKey, SettingsSectionKey>> = {
  email: 'notifications',
  sms: 'integrations',
};

const ADMIN_ONLY_SETTINGS_SECTIONS = new Set<SettingsSectionKey>(['appearance', 'license', 'profile']);

export const resolveSettingsSectionKey = (section: SettingsSectionKey): SettingsSectionKey =>
  LEGACY_SECTION_MAP[section] ?? section;

export const getEmployeeVisibleSettingsSections = (user: User | null): SettingsSectionKey[] => {
  if (!user || user.role === 'admin') {
    return ALL_SETTINGS_SECTION_KEYS.filter((key) => !HIDDEN_SETTINGS_SECTIONS.has(key));
  }

  const keys = new Set<SettingsSectionKey>();
  for (const key of normalizeVisibleSections(user.employeeAccess?.visibleSections)) {
    if (ADMIN_ONLY_SETTINGS_SECTIONS.has(key)) {
      continue;
    }
    keys.add(resolveSettingsSectionKey(key));
  }

  return Array.from(keys);
};

export const hasEmployeeSettingsAccess = (user: User | null): boolean => {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return getEmployeeVisibleSettingsSections(user).length > 0;
};

export const canAccessSettingsSection = (user: User | null, section: SettingsSectionKey): boolean => {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }

  const resolved = resolveSettingsSectionKey(section);
  if (ADMIN_ONLY_SETTINGS_SECTIONS.has(resolved)) {
    return false;
  }

  return getEmployeeVisibleSettingsSections(user).includes(resolved);
};
