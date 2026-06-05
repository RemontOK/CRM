import { Part, StockMovement } from '../types';
import { apiService } from './api';

const PARTS_STORAGE_KEY = 'crm_inventory_parts';
const STOCK_MOVEMENTS_STORAGE_KEY = 'crm_inventory_movements';

const normalizePart = (part: Part): Part => ({
  ...part,
  partType: part.partType || 'spare_part',
  wholesalePrice: typeof part.wholesalePrice === 'number' ? part.wholesalePrice : part.unitPrice,
  alertThreshold: typeof part.alertThreshold === 'number' ? part.alertThreshold : part.minQuantity,
  notificationsEnabled: part.notificationsEnabled ?? true,
  createdAt: new Date(part.createdAt),
  updatedAt: new Date(part.updatedAt),
});

const normalizeMovement = (movement: StockMovement): StockMovement => ({
  ...movement,
  createdAt: new Date(movement.createdAt),
});

class InventoryService {
  private parts: Part[] = [];
  private movements: StockMovement[] = [];

  constructor() {
    this.loadFromCache();
    void this.refreshFromApi();
  }

  private loadFromCache() {
    const savedParts = localStorage.getItem(PARTS_STORAGE_KEY);
    const savedMovements = localStorage.getItem(STOCK_MOVEMENTS_STORAGE_KEY);

    try {
      this.parts = savedParts ? JSON.parse(savedParts).map((part: Part) => normalizePart(part)) : [];
    } catch {
      this.parts = [];
    }

    try {
      this.movements = savedMovements
        ? JSON.parse(savedMovements).map((movement: StockMovement) => normalizeMovement(movement))
        : [];
    } catch {
      this.movements = [];
    }
  }

  private saveToCache() {
    localStorage.setItem(PARTS_STORAGE_KEY, JSON.stringify(this.parts));
    localStorage.setItem(STOCK_MOVEMENTS_STORAGE_KEY, JSON.stringify(this.movements));
  }

  async refreshFromApi() {
    try {
      const [parts, movements] = await Promise.all([
        apiService.get<Part[]>('/inventory/parts'),
        apiService.get<StockMovement[]>('/inventory/movements'),
      ]);
      this.parts = parts.map((part) => normalizePart(part));
      this.movements = movements.map((movement) => normalizeMovement(movement));
      this.saveToCache();
    } catch {
      // keep cache as fallback
    }

    return {
      parts: [...this.parts],
      movements: [...this.movements],
    };
  }

  getParts() {
    return [...this.parts];
  }

  getPartById(id: string) {
    return this.parts.find((part) => part.id === id) || null;
  }

  async addPart(partData: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiService.post<Part>('/inventory/parts', partData);
    const part = normalizePart(created);
    this.parts = [part, ...this.parts.filter((item) => item.id !== part.id)];
    await this.refreshMovementsOnly();
    this.saveToCache();
    return part;
  }

  async updatePart(id: string, updates: Partial<Part>) {
    const updated = await apiService.put<Part>(`/inventory/parts/${id}`, updates);
    const part = normalizePart(updated);
    this.parts = this.parts.map((item) => (item.id === id ? part : item));
    this.saveToCache();
    return part;
  }

  async deletePart(id: string) {
    await apiService.delete(`/inventory/parts/${id}`);
    this.parts = this.parts.filter((part) => part.id !== id);
    await this.refreshMovementsOnly();
    this.saveToCache();
  }

  async deductStock(id: string, quantity: number) {
    if (quantity <= 0) {
      throw new Error('Количество должно быть больше нуля');
    }

    const updated = await apiService.post<Part>(`/inventory/parts/${id}/deduct-stock`, { quantity });
    const part = normalizePart(updated);
    this.parts = this.parts.map((item) => (item.id === id ? part : item));
    await this.refreshMovementsOnly();
    this.saveToCache();
    return part;
  }

  async addStock(
    id: string,
    quantity: number,
    reason = 'Оприходование на склад',
    processedBy?: string,
    unitCost?: number,
    documentNumber?: string
  ) {
    if (quantity <= 0) {
      throw new Error('Количество должно быть больше нуля');
    }

    const updated = await apiService.post<Part>(`/inventory/parts/${id}/add-stock`, {
      quantity,
      reason,
      processedBy,
      unitCost,
      documentNumber,
    });
    const part = normalizePart(updated);
    this.parts = this.parts.map((item) => (item.id === id ? part : item));
    await this.refreshMovementsOnly();
    this.saveToCache();
    return part;
  }

  async registerOutgoingMovement(
    id: string,
    quantity: number,
    reason: string,
    orderNumber?: string,
    processedBy?: string
  ) {
    if (quantity <= 0) {
      throw new Error('Количество должно быть больше нуля');
    }

    const updated = await apiService.post<Part>(`/inventory/parts/${id}/deduct-stock`, {
      quantity,
      reason,
      orderNumber,
      processedBy,
    });
    const part = normalizePart(updated);
    this.parts = this.parts.map((item) => (item.id === id ? part : item));
    await this.refreshMovementsOnly();
    this.saveToCache();
    return part;
  }

  getMovements(partId?: string) {
    return partId ? this.movements.filter((movement) => movement.partId === partId) : [...this.movements];
  }

  isLowStock(part: Part) {
    if (!part.notificationsEnabled) {
      return false;
    }
    const threshold = typeof part.alertThreshold === 'number' ? part.alertThreshold : part.minQuantity;
    return part.quantity <= threshold;
  }

  getLowStockParts() {
    return this.parts.filter((part) => this.isLowStock(part));
  }

  private async refreshMovementsOnly() {
    try {
      const movements = await apiService.get<StockMovement[]>('/inventory/movements');
      this.movements = movements.map((movement) => normalizeMovement(movement));
    } catch {
      // noop
    }
  }
}

export const inventoryService = new InventoryService();
