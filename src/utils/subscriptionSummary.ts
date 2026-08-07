import { TenantInfo } from '../types';
import { resolveTenantAccessStatus } from './tenantAccess';

export interface SubscriptionSummary {
  title: string;
  planName: string;
  daysRemaining: number | null;
  endsAtLabel: string | null;
  statusHint: string;
  canPay: boolean;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const formatRuDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const computeDaysUntil = (value?: string) => {
  if (!value) {
    return null;
  }

  const end = new Date(value);
  if (Number.isNaN(end.getTime())) {
    return null;
  }

  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
};

export const formatDaysRemaining = (days: number) => {
  const mod10 = days % 10;
  const mod100 = days % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return `${days} дней`;
  }

  if (mod10 === 1) {
    return `${days} день`;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return `${days} дня`;
  }

  return `${days} дней`;
};

export const getSubscriptionSummary = (
  tenant?: TenantInfo | null,
  fallbackPlanName = 'Базовый тариф'
): SubscriptionSummary => {
  const planName = fallbackPlanName.trim() || 'Базовый тариф';
  const resolvedTenant = tenant ? { ...tenant, accessStatus: resolveTenantAccessStatus(tenant) } : null;

  if (!resolvedTenant) {
    return {
      title: 'Подписка',
      planName,
      daysRemaining: null,
      endsAtLabel: null,
      statusHint: 'Данные о подписке загружаются',
      canPay: true,
      severity: 'info',
    };
  }

  if (resolvedTenant.accessStatus === 'suspended') {
    return {
      title: 'Подписка',
      planName,
      daysRemaining: null,
      endsAtLabel: null,
      statusHint: 'Доступ приостановлен администратором',
      canPay: false,
      severity: 'error',
    };
  }

  if (resolvedTenant.accessStatus === 'trial') {
    const daysRemaining =
      resolvedTenant.trialDaysRemaining ?? computeDaysUntil(resolvedTenant.trialEndsAt);
    const endsAtLabel = formatRuDate(resolvedTenant.trialEndsAt);

    return {
      title: 'Пробный период',
      planName,
      daysRemaining,
      endsAtLabel,
      statusHint:
        daysRemaining != null
          ? `Осталось ${formatDaysRemaining(daysRemaining)}`
          : 'Пробный доступ активен',
      canPay: true,
      severity: daysRemaining != null && daysRemaining <= 1 ? 'warning' : 'info',
    };
  }

  if (resolvedTenant.accessStatus === 'active') {
    const daysRemaining = computeDaysUntil(resolvedTenant.subscriptionEndsAt);
    const endsAtLabel = formatRuDate(resolvedTenant.subscriptionEndsAt);

    return {
      title: 'Активная подписка',
      planName,
      daysRemaining,
      endsAtLabel,
      statusHint:
        daysRemaining != null
          ? `Осталось ${formatDaysRemaining(daysRemaining)}`
          : 'Подписка активна',
      canPay: true,
      severity: daysRemaining != null && daysRemaining <= 7 ? 'warning' : 'success',
    };
  }

  return {
    title: 'Подписка истекла',
    planName,
    daysRemaining: 0,
    endsAtLabel: formatRuDate(resolvedTenant.subscriptionEndsAt || resolvedTenant.trialEndsAt),
    statusHint: 'Оплатите подписку, чтобы продолжить работу',
    canPay: true,
    severity: 'error',
  };
};
