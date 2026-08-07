import { Client } from '../types';
import { apiService } from './api';
import { normalizePhoneForCompare, normalizePhoneForStorage } from '../utils/phone';
import { getStoredTenantId, tenantStorageKey } from '../utils/tenantStorage';

const CLIENT_STORAGE_BASE = 'crm_clients';

const normalizeClient = (client: Client): Client => ({
  ...client,
  firstName: client.firstName || '',
  lastName: client.lastName || '',
  phone: normalizePhoneForStorage(client.phone || ''),
  email: client.email || '',
  address: client.address || '',
  notes: client.notes || '',
  customFields: client.customFields || {},
});

class ClientService {
  private clients: Client[] = [];
  private cacheTenantId: number | null = null;

  private storageKey() {
    return tenantStorageKey(CLIENT_STORAGE_BASE, this.cacheTenantId ?? getStoredTenantId());
  }

  private loadFromCache() {
    const tenantId = getStoredTenantId();
    this.cacheTenantId = tenantId;
    const saved = localStorage.getItem(this.storageKey());
    if (!saved) {
      this.clients = [];
      return;
    }

    try {
      this.clients = JSON.parse(saved).map((client: Client) => normalizeClient(client));
    } catch {
      this.clients = [];
    }
  }

  private saveToCache() {
    if (!localStorage.getItem('token')) {
      return;
    }
    localStorage.setItem(this.storageKey(), JSON.stringify(this.clients));
  }

  clearSession() {
    this.clients = [];
    this.cacheTenantId = null;
    localStorage.removeItem(tenantStorageKey(CLIENT_STORAGE_BASE, getStoredTenantId()));
    localStorage.removeItem(CLIENT_STORAGE_BASE);
  }

  async refreshFromApi() {
    if (!localStorage.getItem('token')) {
      this.clients = [];
      return [];
    }

    const tenantId = getStoredTenantId();
    if (this.cacheTenantId !== tenantId) {
      this.clients = [];
      this.cacheTenantId = tenantId;
    }

    try {
      const clients = await apiService.get<Client[]>('/clients');
      this.clients = clients.map((client) => normalizeClient(client));
      this.saveToCache();
    } catch {
      this.loadFromCache();
    }
    return [...this.clients];
  }

  getClients(): Client[] {
    const tenantId = getStoredTenantId();
    if (this.cacheTenantId !== tenantId) {
      this.loadFromCache();
    }
    return [...this.clients];
  }

  findClientByPhone(phone: string): Client | null {
    const normalizedPhone = normalizePhoneForCompare(phone);
    return this.clients.find((client) => normalizePhoneForCompare(client.phone) === normalizedPhone) || null;
  }

  searchClientsByPhone(query: string, limit = 8): Client[] {
    const normalizedQuery = normalizePhoneForCompare(query);
    if (normalizedQuery.length < 3) {
      return [];
    }

    return this.clients
      .filter((client) => normalizePhoneForCompare(client.phone).includes(normalizedQuery))
      .slice(0, limit);
  }

  async createClient(clientData: Partial<Client>): Promise<Client> {
    const payload = {
      ...clientData,
      firstName: clientData.firstName || '',
      lastName: clientData.lastName || '',
      phone: normalizePhoneForStorage(clientData.phone || ''),
      email: clientData.email || '',
      address: clientData.address || '',
      notes: clientData.notes || '',
      customFields: clientData.customFields || {},
      totalOrders: clientData.totalOrders ?? 0,
      totalSpent: clientData.totalSpent ?? 0,
      lastOrderDate: clientData.lastOrderDate ?? null,
    };

    const created = normalizeClient(await apiService.post<Client>('/clients', payload));
    this.clients = [created, ...this.clients.filter((item) => item.id !== created.id)];
    this.saveToCache();
    return created;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const payload = {
      ...updates,
      ...(updates.phone !== undefined ? { phone: normalizePhoneForStorage(updates.phone) } : {}),
    };
    const updated = normalizeClient(await apiService.put<Client>(`/clients/${id}`, payload));
    this.clients = this.clients.map((client) => (client.id === id ? updated : client));
    this.saveToCache();
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    await apiService.delete(`/clients/${id}`);
    this.clients = this.clients.filter((client) => client.id !== id);
    this.saveToCache();
  }

  async findOrCreateClientByPhone(phone: string, defaults: Partial<Client> = {}): Promise<Client> {
    const existing = this.findClientByPhone(phone);
    if (existing) {
      return existing;
    }

    return this.createClient({
      ...defaults,
      phone,
    });
  }
}

export const clientService = new ClientService();
