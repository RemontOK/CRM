import {
  AdminTenantInfo,
  AdminTenantUser,
  RegisterCredentials,
  RegisterResponse,
  ResendVerificationResponse,
  TenantActivityItem,
  VerifyEmailResponse,
} from '../types';
import { apiService, getApiErrorMessage } from './api';

/** PHP иногда отдаёт списки как JSON-объект с числовыми ключами — приводим к массиву. */
function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, T>);
  }
  return [];
}

class PlatformService {
  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    try {
      const result = await apiService.post<RegisterResponse>('/platform/register', {
        companyName: credentials.companyName.trim(),
        email: credentials.email.trim(),
        password: credentials.password,
        phone: credentials.phone?.trim() || '',
        name: credentials.name?.trim() || '',
      });

      if (!result?.email) {
        throw new Error('Сервер вернул неполный ответ при регистрации.');
      }

      return result;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Не удалось зарегистрироваться'));
    }
  }

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    try {
      return await apiService.get<VerifyEmailResponse>('/platform/auth/verify-email', { token });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Не удалось подтвердить email'));
    }
  }

  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    try {
      return await apiService.post<ResendVerificationResponse>('/platform/auth/resend-verification', {
        email: email.trim(),
      });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Не удалось отправить письмо'));
    }
  }

  async listTenants(): Promise<AdminTenantInfo[]> {
    const result = await apiService.get<AdminTenantInfo[] | Record<string, AdminTenantInfo>>(
      '/platform/admin/tenants'
    );
    return asArray<AdminTenantInfo>(result);
  }

  async updateTenant(
    tenantId: number,
    payload: { status?: string; extendTrialDays?: number; subscriptionEndsAt?: string }
  ): Promise<AdminTenantInfo> {
    return apiService.put<AdminTenantInfo>(`/platform/admin/tenants/${tenantId}`, payload);
  }

  async listTenantUsers(tenantId: number): Promise<AdminTenantUser[]> {
    const result = await apiService.get<AdminTenantUser[] | Record<string, AdminTenantUser>>(
      `/platform/admin/tenants/${tenantId}/users`
    );
    return asArray<AdminTenantUser>(result);
  }

  async deleteTenant(tenantId: number): Promise<{ deleted: boolean; tenantId: number }> {
    return apiService.delete<{ deleted: boolean; tenantId: number }>(`/platform/admin/tenants/${tenantId}`);
  }

  async listActivity(limit = 50): Promise<TenantActivityItem[]> {
    const result = await apiService.get<TenantActivityItem[] | Record<string, TenantActivityItem>>(
      '/platform/admin/activity',
      { limit }
    );
    return asArray<TenantActivityItem>(result);
  }

  async getBillingConfig(): Promise<{
    enabled: boolean;
    wallet: string;
    amount: number;
    monthlyPrice: number;
    currency: string;
    plans: Array<{
      months: number;
      amount: number;
      monthlyEquivalent: number;
      savings: number;
      discountPercent: number;
    }>;
    tenant?: import('../types').TenantInfo;
    locationSlots?: number;
    locationsCount?: number;
    canAddLocation?: boolean;
    includedLocationSlots?: number;
  }> {
    return apiService.get('/platform/billing/config');
  }

  async createYoomoneyPayment(months = 1): Promise<{
    paymentUrl: string;
    amount: number;
    months: number;
    label: string;
    currency: string;
    paymentType?: string;
  }> {
    return apiService.post('/platform/billing/yoomoney/create', { months });
  }

  async createYoomoneyLocationPayment(months = 1): Promise<{
    paymentUrl: string;
    amount: number;
    months: number;
    label: string;
    currency: string;
    paymentType?: string;
  }> {
    return apiService.post('/platform/billing/yoomoney/create-location', { months });
  }

  async getMaintenanceSettings(): Promise<PlatformMaintenanceSettings> {
    return apiService.get<PlatformMaintenanceSettings>('/platform/admin/maintenance');
  }

  async saveMaintenanceSettings(scheduledAt: string): Promise<PlatformMaintenanceSettings> {
    return apiService.put<PlatformMaintenanceSettings>('/platform/admin/maintenance', { scheduledAt });
  }

  async sendMaintenanceNotification(scheduledAt?: string): Promise<{
    sent: number;
    scheduledAt: string;
    title: string;
    message: string;
  }> {
    return apiService.post('/platform/admin/maintenance/notify', scheduledAt ? { scheduledAt } : {});
  }
}

export interface PlatformMaintenanceSettings {
  scheduledAt: string;
  lastNotifiedAt: string;
  lastRecipients: number;
}

export const platformService = new PlatformService();
