const ACTIVE_TENANT_KEY = 'crm_active_tenant_id';
const AUTH_USER_KEY = 'crm_auth_user';

export function getStoredTenantId(): number | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw) as { tenantId?: number };
      if (typeof user.tenantId === 'number' && user.tenantId > 0) {
        return user.tenantId;
      }
    }
  } catch {
    // ignore malformed cache
  }

  const active = localStorage.getItem(ACTIVE_TENANT_KEY);
  if (!active) {
    return null;
  }

  const tenantId = Number(active);
  return Number.isFinite(tenantId) && tenantId > 0 ? tenantId : null;
}

export function setActiveTenantId(tenantId: number | null) {
  if (tenantId && tenantId > 0) {
    localStorage.setItem(ACTIVE_TENANT_KEY, String(tenantId));
    return;
  }
  localStorage.removeItem(ACTIVE_TENANT_KEY);
}

export function tenantStorageKey(baseKey: string, tenantId?: number | null): string {
  const id = tenantId ?? getStoredTenantId();
  return id ? `${baseKey}_t${id}` : baseKey;
}

const LEGACY_CACHE_KEYS = [
  'crm_cash_operations',
  'crm_clients',
  'crm_employees',
  'crm_taxonomy_nodes',
  'nek_crm_app_settings',
  'crm_orders_cache_v1',
  'crm_inventory_parts',
  'crm_inventory_movements',
  'crm_acceptance_acts',
  'crm_work_completion_acts',
  'crm_document_storage',
  'crm_auth_user',
] as const;

export function clearAllTenantCaches() {
  LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));

  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) {
      continue;
    }
    if (key.startsWith('crm_') && /_t\d+$/.test(key)) {
      keysToRemove.push(key);
    }
    if (key.startsWith('nek_crm_app_settings_t')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(ACTIVE_TENANT_KEY);
}

export function prepareSessionForTenant(tenantId: number | null) {
  const previousTenantId = getStoredTenantId();
  const activeTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);

  if (
    tenantId &&
    ((previousTenantId && previousTenantId !== tenantId) ||
      (activeTenantId && Number(activeTenantId) !== tenantId))
  ) {
    clearAllTenantCaches();
  }

  setActiveTenantId(tenantId);
}
