import { User } from '../types';
import { hasEmployeeSettingsAccess } from './employeeSettingsAccess';

export const DEFAULT_EMPLOYEE_ALLOWED_MODULES = [
  '/dashboard',
  '/orders',
  '/messages',
  '/clients',
  '/inventory',
  '/employees',
  '/cash-register',
  '/reports',
  '/my-profile',
] as const;

export type CrmModulePath = (typeof DEFAULT_EMPLOYEE_ALLOWED_MODULES)[number];

export const CRM_MODULE_OPTIONS: Array<{ path: CrmModulePath; label: string }> = [
  { path: '/dashboard', label: 'Дашборд' },
  { path: '/orders', label: 'Заказы' },
  { path: '/messages', label: 'Сообщения' },
  { path: '/clients', label: 'Клиенты' },
  { path: '/inventory', label: 'Склад' },
  { path: '/employees', label: 'Сотрудники' },
  { path: '/cash-register', label: 'Финансы' },
  { path: '/reports', label: 'Отчеты' },
  { path: '/my-profile', label: 'Мой профиль' },
];

export const normalizeAllowedModules = (modules?: string[] | null): CrmModulePath[] => {
  if (!Array.isArray(modules) || modules.length === 0) {
    return [...DEFAULT_EMPLOYEE_ALLOWED_MODULES];
  }

  const allowed = new Set<string>(DEFAULT_EMPLOYEE_ALLOWED_MODULES);
  const normalized = modules.filter((path): path is CrmModulePath => allowed.has(path));
  return normalized.length > 0 ? normalized : [...DEFAULT_EMPLOYEE_ALLOWED_MODULES];
};

export const getAllowedModules = (user: User | null): CrmModulePath[] => {
  if (!user) {
    return [];
  }
  if (user.role === 'admin') {
    return [...DEFAULT_EMPLOYEE_ALLOWED_MODULES];
  }
  return normalizeAllowedModules(user.employeeAccess?.allowedModules);
};

export const isModuleAllowed = (user: User | null, path: string): boolean => {
  if (path === '/settings') {
    return hasEmployeeSettingsAccess(user);
  }
  if (user?.role === 'admin') {
    return true;
  }
  return getAllowedModules(user).includes(path as CrmModulePath);
};

export const getFirstAllowedRoute = (user: User | null): string => {
  if (user?.role === 'admin') {
    return '/dashboard';
  }
  const allowed = getAllowedModules(user);
  for (const path of DEFAULT_EMPLOYEE_ALLOWED_MODULES) {
    if (allowed.includes(path)) {
      return path;
    }
  }
  if (hasEmployeeSettingsAccess(user)) {
    return '/settings';
  }
  return '/my-profile';
};

export { hasEmployeeSettingsAccess };

export const isCompanyAdmin = (user: Pick<User, 'role'> | null | undefined): boolean =>
  user?.role === 'admin';

export const employeeNeedsAccessSettings = (employee: Pick<User, 'role'>): boolean =>
  employee.role !== 'admin';
