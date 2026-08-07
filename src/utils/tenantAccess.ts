import { TenantAccessStatus, TenantInfo, User } from '../types';

export const SUBSCRIPTION_BLOCKED_EVENT = 'crm:subscription-blocked';

export const resolveTenantAccessStatus = (tenant?: TenantInfo | null): TenantAccessStatus => {
  if (!tenant) {
    return 'expired';
  }

  const status = tenant.status;
  if (status === 'suspended' || tenant.accessStatus === 'suspended') {
    return 'suspended';
  }
  if (status === 'expired' || tenant.accessStatus === 'expired') {
    return 'expired';
  }

  const now = Date.now();

  if (status === 'active' || tenant.accessStatus === 'active') {
    const subscriptionEndsAt = tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).getTime() : NaN;
    if (!Number.isNaN(subscriptionEndsAt) && subscriptionEndsAt < now) {
      return 'expired';
    }
    return 'active';
  }

  if (status === 'trial' || tenant.accessStatus === 'trial') {
    const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt).getTime() : NaN;
    if (!Number.isNaN(trialEndsAt) && trialEndsAt < now) {
      return 'expired';
    }
    return 'trial';
  }

  return 'expired';
};

export const getResolvedTenant = (tenant?: TenantInfo | null): TenantInfo | undefined => {
  if (!tenant) {
    return undefined;
  }

  return {
    ...tenant,
    accessStatus: resolveTenantAccessStatus(tenant),
  };
};

export const isCrmAccessBlocked = (user?: User | null) => {
  if (!user || user.isPlatformAdmin) {
    return false;
  }

  const accessStatus = resolveTenantAccessStatus(user.tenant);
  return accessStatus === 'expired' || accessStatus === 'suspended';
};

export const isSubscriptionPaymentRequired = (user?: User | null) =>
  isCrmAccessBlocked(user) && resolveTenantAccessStatus(user?.tenant) === 'expired';

export const dispatchSubscriptionBlocked = (tenant?: TenantInfo, message?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SUBSCRIPTION_BLOCKED_EVENT, {
      detail: { tenant, message },
    })
  );
};

export const isSubscriptionBlockedApiError = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false;
  }

  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } }).response;
  if (response?.status !== 403) {
    return false;
  }

  const data = response.data || {};
  const message = String(data.error || data.message || '');
  const nested = data.data as { tenant?: TenantInfo } | undefined;

  return Boolean(nested?.tenant) || /подписк|пробн|истек|истёк|оформите подписку/i.test(message);
};

export const extractBlockedTenantFromApiError = (error: unknown): TenantInfo | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }

  const data = (error as { response?: { data?: { data?: { tenant?: TenantInfo } } } }).response?.data;
  return data?.data?.tenant;
};
