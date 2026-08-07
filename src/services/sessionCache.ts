import { appSettingsService } from './appSettingsService';
import { cashService } from './cashService';
import { clientService } from './clientService';
import { documentService } from './documentService';
import { employeeService } from './employeeService';
import { inventoryService } from './inventoryService';
import { orderService } from './orderService';
import { taxonomyService } from './taxonomyService';
import { clearAllTenantCaches } from '../utils/tenantStorage';
import { clearSeenTelegramInboxIds } from '../utils/telegramInboxSeen';

export function clearSessionCache() {
  clearAllTenantCaches();
}

export function resetSessionData() {
  clearAllTenantCaches();
  cashService.clearSession();
  clientService.clearSession();
  employeeService.clearSession();
  inventoryService.clearSession();
  orderService.clearSession();
  taxonomyService.clearSession();
  documentService.clearSession();
  clearSeenTelegramInboxIds();
}

export async function refreshSessionData() {
  await Promise.all([
    appSettingsService.refreshFromApi(),
    cashService.refreshFromApi(),
    clientService.refreshFromApi(),
    employeeService.refreshFromApi(),
    inventoryService.refreshFromApi(),
  ]);
}
