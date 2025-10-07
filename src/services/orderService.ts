import { Order, Client, Device, Payment } from '../types';

class OrderService {
  private orders: Order[] = [];
  private clients: Client[] = [];
  private devices: Device[] = [];
  private nextOrderNumber = 1;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedOrders = localStorage.getItem('crm_orders');
    const savedClients = localStorage.getItem('crm_clients');
    const savedDevices = localStorage.getItem('crm_devices');
    const savedOrderNumber = localStorage.getItem('crm_next_order_number');

    if (savedOrders) {
      this.orders = JSON.parse(savedOrders).map((order: any) => ({
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
      }));
    }

    if (savedClients) {
      this.clients = JSON.parse(savedClients).map((client: any) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
        lastVisit: client.lastVisit ? new Date(client.lastVisit) : undefined,
      }));
    }

    if (savedDevices) {
      this.devices = JSON.parse(savedDevices).map((device: any) => ({
        ...device,
        createdAt: new Date(device.createdAt),
      }));
    }

    if (savedOrderNumber) {
      this.nextOrderNumber = parseInt(savedOrderNumber);
    }
  }

  private saveToStorage() {
    localStorage.setItem('crm_orders', JSON.stringify(this.orders));
    localStorage.setItem('crm_clients', JSON.stringify(this.clients));
    localStorage.setItem('crm_devices', JSON.stringify(this.devices));
    localStorage.setItem('crm_next_order_number', this.nextOrderNumber.toString());
  }

  // Управление заказами
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const orderNumber = `#${String(this.nextOrderNumber).padStart(6, '0')}`;
    this.nextOrderNumber++;

    // Получаем данные клиента и устройства для отображения
    const client = this.clients.find(c => c.id === orderData.clientId);
    const device = this.devices.find(d => d.id === orderData.deviceId);

    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber,
      clientId: orderData.clientId || '',
      deviceId: orderData.deviceId || '',
      technicianId: orderData.technicianId || '',
      status: orderData.status || 'diagnosis',
      priority: orderData.priority || 'medium',
      description: orderData.description || '',
      diagnosis: orderData.diagnosis || '',
      estimatedCost: orderData.estimatedCost || 0,
      finalCost: orderData.finalCost || 0,
      estimatedDays: orderData.estimatedDays || 3,
      actualDays: orderData.actualDays || 0,
      parts: orderData.parts || [],
      payments: orderData.payments || [],
      isPaid: orderData.isPaid || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: orderData.completedAt,
      
      // Дополнительные поля для отображения
      clientName: client ? `${client.firstName} ${client.lastName}` : '',
      clientPhone: client?.phone || '',
      deviceBrand: device?.brand || '',
      deviceModel: device?.model || '',
      deviceSerial: device?.serialNumber || '',
      deviceImei: device?.imei || '',
      deviceColor: device?.color || '',
      deviceCondition: device?.condition || 'good',
      deviceExternalCondition: device?.externalCondition || '',
    };

    this.orders.push(newOrder);
    this.saveToStorage();
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const index = this.orders.findIndex(order => order.id === id);
    if (index === -1) {
      throw new Error('Заказ не найден');
    }

    const order = this.orders[index];
    
    // Обновляем заказ
    this.orders[index] = {
      ...order,
      ...updates,
      updatedAt: new Date(),
    };

    // Если обновляются данные клиента, обновляем клиента
    if (updates.clientName || updates.clientPhone) {
      const clientIndex = this.clients.findIndex(c => c.id === order.clientId);
      if (clientIndex !== -1) {
        const nameParts = (updates.clientName || order.clientName || '').split(' ');
        this.clients[clientIndex] = {
          ...this.clients[clientIndex],
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          phone: updates.clientPhone || order.clientPhone || this.clients[clientIndex].phone,
          updatedAt: new Date(),
        };
      }
    }

    // Если обновляются данные устройства, обновляем устройство
    if (updates.deviceBrand || updates.deviceModel || updates.deviceSerial || 
        updates.deviceImei || updates.deviceColor || updates.deviceCondition || 
        updates.deviceExternalCondition) {
      const deviceIndex = this.devices.findIndex(d => d.id === order.deviceId);
      if (deviceIndex !== -1) {
        this.devices[deviceIndex] = {
          ...this.devices[deviceIndex],
          brand: updates.deviceBrand || order.deviceBrand || this.devices[deviceIndex].brand,
          model: updates.deviceModel || order.deviceModel || this.devices[deviceIndex].model,
          serialNumber: updates.deviceSerial || order.deviceSerial || this.devices[deviceIndex].serialNumber,
          imei: updates.deviceImei || order.deviceImei || this.devices[deviceIndex].imei,
          color: updates.deviceColor || order.deviceColor || this.devices[deviceIndex].color,
          condition: (updates.deviceCondition || order.deviceCondition || this.devices[deviceIndex].condition) as any,
          externalCondition: updates.deviceExternalCondition || order.deviceExternalCondition || this.devices[deviceIndex].externalCondition,
        };
      }
    }

    this.saveToStorage();
    return this.orders[index];
  }

  async deleteOrder(id: string): Promise<void> {
    const index = this.orders.findIndex(order => order.id === id);
    if (index === -1) {
      throw new Error('Заказ не найден');
    }

    this.orders.splice(index, 1);
    this.saveToStorage();
  }

  async getOrders(): Promise<Order[]> {
    return [...this.orders];
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.orders.find(order => order.id === id) || null;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.orders.filter(order => order.status === status);
  }

  // Управление клиентами
  async createClient(clientData: Partial<Client>): Promise<Client> {
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
      lastVisit: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clients.push(newClient);
    this.saveToStorage();
    return newClient;
  }

  async findClientByPhone(phone: string): Promise<Client | null> {
    return this.clients.find(client => client.phone === phone) || null;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const index = this.clients.findIndex(client => client.id === id);
    if (index === -1) {
      throw new Error('Клиент не найден');
    }

    this.clients[index] = {
      ...this.clients[index],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveToStorage();
    return this.clients[index];
  }

  // Управление устройствами
  async createDevice(deviceData: Partial<Device>): Promise<Device> {
    const newDevice: Device = {
      id: Date.now().toString(),
      type: deviceData.type || 'other',
      brand: deviceData.brand || '',
      model: deviceData.model || '',
      serialNumber: deviceData.serialNumber || '',
      imei: deviceData.imei || '',
      color: deviceData.color || '',
      condition: deviceData.condition || 'good',
      clientId: deviceData.clientId || '',
      createdAt: new Date(),
    };

    this.devices.push(newDevice);
    this.saveToStorage();
    return newDevice;
  }

  // Получение статистики
  async getOrderStats() {
    const totalOrders = this.orders.length;
    const completedOrders = this.orders.filter(order => order.status === 'completed').length;
    const pendingOrders = this.orders.filter(order => order.status === 'pending').length;
    const inProgressOrders = this.orders.filter(order => order.status === 'in_progress').length;
    const waitingPartsOrders = this.orders.filter(order => order.status === 'waiting_parts').length;

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      inProgressOrders,
      waitingPartsOrders,
    };
  }

  // Проверка просроченных заказов
  async getOverdueOrders(): Promise<Order[]> {
    const now = new Date();
    return this.orders.filter(order => {
      if (order.status === 'completed' || order.status === 'cancelled') return false;
      
      const estimatedCompletion = new Date(order.createdAt);
      estimatedCompletion.setHours(estimatedCompletion.getHours() + (order.estimatedDays || 1) * 24);
      
      return estimatedCompletion < now;
    });
  }

  // Обновление статуса заказа
  async updateOrderStatus(id: string, status: string): Promise<Order> {
    return this.updateOrder(id, { status: status as any });
  }

  // Добавление платежа
  async addPayment(orderId: string, payment: any): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error('Заказ не найден');
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      orderId,
      amount: payment.amount,
      method: payment.method,
      status: 'completed',
      processedBy: payment.processedBy,
      processedAt: new Date(),
      notes: payment.notes || '',
    };

    order.payments.push(newPayment);
    order.finalCost = order.payments.reduce((sum, p) => sum + p.amount, 0);

    // Если оплата завершена, помечаем как оплаченный
    if (order.finalCost >= order.estimatedCost) {
      order.isPaid = true;
    }

    return this.updateOrder(orderId, order);
  }
}

export const orderService = new OrderService();
