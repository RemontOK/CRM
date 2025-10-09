import { Client } from '../types';

const CLIENT_STORAGE_KEY = 'crm_clients';

// Получить всех клиентов
export const getClients = (): Client[] => {
  try {
    const stored = localStorage.getItem(CLIENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Ошибка при получении клиентов:', error);
    return [];
  }
};

// Сохранить клиента
export const saveClient = (client: Client): Client => {
  try {
    const clients = getClients();
    const existingClientIndex = clients.findIndex(c => c.id === client.id);
    
    if (existingClientIndex >= 0) {
      // Обновить существующего клиента
      clients[existingClientIndex] = client;
    } else {
      // Добавить нового клиента
      clients.push(client);
    }
    
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
    return client;
  } catch (error) {
    console.error('Ошибка при сохранении клиента:', error);
    throw error;
  }
};

// Создать нового клиента
export const createClient = (clientData: Partial<Client>): Client => {
  const newClient: Client = {
    id: Date.now().toString(),
    firstName: clientData.firstName || '',
    lastName: clientData.lastName || '',
    phone: clientData.phone || '',
    email: clientData.email || '',
    address: clientData.address || '',
    notes: clientData.notes || '',
    totalOrders: 0,
    totalSpent: 0,
    lastOrderDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return saveClient(newClient);
};

// Найти клиента по телефону
export const findClientByPhone = (phone: string): Client | null => {
  const clients = getClients();
  return clients.find(client => client.phone === phone) || null;
};

// Обновить клиента
export const updateClient = (id: string, updates: Partial<Client>): Client | null => {
  try {
    const clients = getClients();
    const clientIndex = clients.findIndex(c => c.id === id);
    
    if (clientIndex >= 0) {
      clients[clientIndex] = {
        ...clients[clientIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
      return clients[clientIndex];
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при обновлении клиента:', error);
    throw error;
  }
};

// Удалить клиента
export const deleteClient = (id: string): boolean => {
  try {
    const clients = getClients();
    const filteredClients = clients.filter(c => c.id !== id);
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(filteredClients));
    return true;
  } catch (error) {
    console.error('Ошибка при удалении клиента:', error);
    return false;
  }
};

// Обновить статистику клиента при создании заказа
export const updateClientStats = (clientId: string, orderAmount: number): void => {
  try {
    const clients = getClients();
    const clientIndex = clients.findIndex(c => c.id === clientId);
    
    if (clientIndex >= 0) {
      clients[clientIndex].totalOrders += 1;
      clients[clientIndex].totalSpent += orderAmount;
      clients[clientIndex].lastOrderDate = new Date().toISOString();
      clients[clientIndex].updatedAt = new Date().toISOString();
      
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
    }
  } catch (error) {
    console.error('Ошибка при обновлении статистики клиента:', error);
  }
};

export const clientService = {
  getClients,
  saveClient,
  createClient,
  findClientByPhone,
  updateClient,
  deleteClient,
  updateClientStats,
};