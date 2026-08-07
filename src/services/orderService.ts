import { Device, Order, Payment } from '../types';
import { apiService } from './api';
import { normalizePhoneForStorage } from '../utils/phone';

const ORDERS_CACHE_KEY = 'crm_orders_cache_v1';

const normalizeOrder = (order: Order): Order => ({
  ...order,
  clientPhone: normalizePhoneForStorage(order.clientPhone || ''),
});

const readOrdersCache = (): Order[] => {
  try {
    const raw = localStorage.getItem(ORDERS_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((order) => normalizeOrder(order as Order)) : [];
  } catch {
    return [];
  }
};

const writeOrdersCache = (orders: Order[]) => {
  try {
    localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders));
  } catch {
    // ignore quota errors
  }
};

const clearOrdersCache = () => {
  localStorage.removeItem(ORDERS_CACHE_KEY);
};

class OrderService {
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    return normalizeOrder(await apiService.post<Order>('/orders', {
      ...orderData,
      ...(orderData.clientPhone !== undefined ? { clientPhone: normalizePhoneForStorage(orderData.clientPhone) } : {}),
    }));
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    return normalizeOrder(await apiService.put<Order>(`/orders/${id}`, {
      ...updates,
      ...(updates.clientPhone !== undefined ? { clientPhone: normalizePhoneForStorage(updates.clientPhone) } : {}),
    }));
  }

  async deleteOrder(id: string): Promise<void> {
    await apiService.delete(`/orders/${id}`);
  }

  getCachedOrders(): Order[] {
    return readOrdersCache();
  }

  clearSession() {
    clearOrdersCache();
  }

  async getOrders(options?: { lite?: boolean }): Promise<Order[]> {
    const lite = options?.lite !== false;
    const query = lite ? '?lite=1' : '';
    try {
      const orders = (await apiService.get<Order[]>(`/orders${query}`)).map((order) => normalizeOrder(order));
      if (lite) {
        writeOrdersCache(orders);
      }
      return orders;
    } catch {
      if (lite) {
        return this.getCachedOrders();
      }
      throw new Error('Не удалось загрузить заказы');
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      return normalizeOrder(await apiService.get<Order>(`/orders/${id}`));
    } catch {
      return null;
    }
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const orders = await this.getOrders();
    return orders.filter((order) => order.status === status);
  }

  async createDevice(deviceData: Partial<Device>): Promise<Device> {
    return apiService.post<Device>('/devices', deviceData);
  }

  async getOrderStats() {
    const orders = await this.getOrders();
    const totalOrders = orders.length;
    const completedOrders = orders.filter((order) => order.status === 'completed').length;
    const pendingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'new').length;
    const inProgressOrders = orders.filter((order) => order.status === 'in_progress').length;
    const waitingPartsOrders = orders.filter((order) => order.status === 'waiting_parts').length;

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      inProgressOrders,
      waitingPartsOrders,
    };
  }

  async getOverdueOrders(): Promise<Order[]> {
    const now = new Date();
    const orders = await this.getOrders();

    return orders.filter((order) => {
      if (order.status === 'completed' || order.status === 'cancelled') {
        return false;
      }

      const estimatedCompletion = new Date(order.createdAt);
      estimatedCompletion.setHours(estimatedCompletion.getHours() + (order.estimatedDays || 1) * 24);

      return estimatedCompletion < now;
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    return apiService.put<Order>(`/orders/${id}`, { status });
  }

  async addPayment(orderId: string, payment: { amount: number; method: Payment['method']; processedBy: string; notes?: string }): Promise<Order> {
    return normalizeOrder(await apiService.post<Order>(`/orders/${orderId}/payments`, payment));
  }
}

export const orderService = new OrderService();
