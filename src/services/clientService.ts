import { Client } from '../types';
import { apiService } from './api';
import { normalizePhoneForCompare, normalizePhoneForStorage } from '../utils/phone';

const CLIENT_STORAGE_KEY = 'crm_clients';

const normalizeClient = (client: Client): Client => ({
  ...client,
  firstName: client.firstName || '',
  lastName: client.lastName || '',
  phone: normalizePhoneForStorage(client.phone || ''),
  email: client.email || '',
  address: client.address || '',
  notes: client.notes || '',
});

class ClientService {
  private clients: Client[] = [];

  constructor() {
    this.loadFromCache();
    void this.refreshFromApi();
  }

  private loadFromCache() {
    const saved = localStorage.getItem(CLIENT_STORAGE_KEY);
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
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(this.clients));
  }

  async refreshFromApi() {
    try {
      const clients = await apiService.get<Client[]>('/clients');
      this.clients = clients.map((client) => normalizeClient(client));
      this.saveToCache();
    } catch {
      // keep cache if API unavailable
    }
    return [...this.clients];
  }

  getClients(): Client[] {
    return [...this.clients];
  }

  findClientByPhone(phone: string): Client | null {
    const normalizedPhone = normalizePhoneForCompare(phone);
    return this.clients.find((client) => normalizePhoneForCompare(client.phone) === normalizedPhone) || null;
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
      totalOrders: clientData.totalOrders ?? 0,
      totalSpent: clientData.totalSpent ?? 0,
      lastOrderDate: clientData.lastOrderDate ?? null,
    };

    const created = normalizeClient(await apiService.post<Client>('/clients', payload));
    this.clients = [created, ...this.clients.filter((item) => item.id !== created.id)];
    this.saveToCache();
    return created;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    try {
      const updated = normalizeClient(
        await apiService.put<Client>(`/clients/${id}`, {
          ...updates,
          ...(updates.phone !== undefined ? { phone: normalizePhoneForStorage(updates.phone) } : {}),
        })
      );
      this.clients = this.clients.map((item) => (item.id === id ? updated : item));
      this.saveToCache();
      return updated;
    } catch {
      return null;
    }
  }

  async saveClient(client: Client): Promise<Client> {
    if (this.clients.some((item) => item.id === client.id)) {
      const updated = await this.updateClient(client.id, client);
      if (!updated) {
        throw new Error('Не удалось обновить клиента');
      }
      return updated;
    }

    return this.createClient(client);
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      await apiService.delete(`/clients/${id}`);
      this.clients = this.clients.filter((client) => client.id !== id);
      this.saveToCache();
      return true;
    } catch {
      return false;
    }
  }

  async updateClientStats(clientId: string, orderAmount: number): Promise<void> {
    const client = this.clients.find((item) => item.id === clientId);
    if (!client) {
      return;
    }

    await this.updateClient(clientId, {
      totalOrders: (client.totalOrders || 0) + 1,
      totalSpent: (client.totalSpent || 0) + orderAmount,
      lastOrderDate: new Date().toISOString(),
    });
  }
}

export const clientService = new ClientService();
