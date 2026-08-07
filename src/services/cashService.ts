import { CashOperation } from '../types';
import { apiService } from './api';
import { getStoredTenantId, tenantStorageKey } from '../utils/tenantStorage';

const CASH_STORAGE_BASE = 'crm_cash_operations';

const normalizeOperation = (operation: CashOperation): CashOperation => ({
  ...operation,
  paymentMethod: operation.paymentMethod || 'cash',
  registerType:
    operation.registerType ||
    (operation.paymentMethod === 'card'
      ? 'bank_terminal'
      : operation.paymentMethod === 'transfer'
        ? 'online'
        : 'cashbox'),
  source: operation.source || 'manual',
  processedAt: new Date(operation.processedAt),
});

class CashService {
  private operations: CashOperation[] = [];
  private cacheTenantId: number | null = null;

  private storageKey() {
    return tenantStorageKey(CASH_STORAGE_BASE, this.cacheTenantId ?? getStoredTenantId());
  }

  private loadFromCache() {
    const tenantId = getStoredTenantId();
    this.cacheTenantId = tenantId;
    const saved = localStorage.getItem(this.storageKey());
    if (!saved) {
      this.operations = [];
      return;
    }

    try {
      this.operations = JSON.parse(saved).map((operation: CashOperation) => normalizeOperation(operation));
    } catch {
      this.operations = [];
    }
  }

  private saveToCache() {
    if (!localStorage.getItem('token')) {
      return;
    }
    localStorage.setItem(this.storageKey(), JSON.stringify(this.operations));
  }

  clearSession() {
    this.operations = [];
    this.cacheTenantId = null;
    localStorage.removeItem(tenantStorageKey(CASH_STORAGE_BASE, getStoredTenantId()));
    localStorage.removeItem(CASH_STORAGE_BASE);
  }

  async refreshFromApi() {
    if (!localStorage.getItem('token')) {
      this.operations = [];
      return [];
    }

    const tenantId = getStoredTenantId();
    if (this.cacheTenantId !== tenantId) {
      this.operations = [];
      this.cacheTenantId = tenantId;
    }

    try {
      const operations = await apiService.get<CashOperation[]>('/cash/operations');
      this.operations = operations.map((operation) => normalizeOperation(operation));
      this.saveToCache();
    } catch {
      this.loadFromCache();
    }

    return [...this.operations];
  }

  getOperations() {
    const tenantId = getStoredTenantId();
    if (this.cacheTenantId !== tenantId) {
      this.loadFromCache();
    }
    return [...this.operations];
  }

  getOperationById(id: string) {
    return this.operations.find((operation) => operation.id === id) || null;
  }

  async addOperation(operationData: Omit<CashOperation, 'id' | 'processedAt'> & { processedAt?: Date }) {
    const payload = {
      ...operationData,
      processedAt:
        operationData.processedAt instanceof Date
          ? operationData.processedAt.toISOString()
          : operationData.processedAt || new Date().toISOString(),
      paymentMethod: operationData.paymentMethod || 'cash',
      registerType:
        operationData.registerType ||
        (operationData.paymentMethod === 'card'
          ? 'bank_terminal'
          : operationData.paymentMethod === 'transfer'
            ? 'online'
            : 'cashbox'),
      source: operationData.source || 'manual',
    };
    const created = normalizeOperation(await apiService.post<CashOperation>('/cash/operations', payload));
    this.operations = [created, ...this.operations.filter((item) => item.id !== created.id)];
    this.saveToCache();
    return created;
  }

  async deleteOperation(id: string) {
    await apiService.delete(`/cash/operations/${id}`);
    this.operations = this.operations.filter((operation) => operation.id !== id);
    this.saveToCache();
  }

  getStats() {
    const incomeOperations = this.operations.filter((operation) => operation.type === 'income');
    const expenseOperations = this.operations.filter((operation) => operation.type === 'expense');

    const totalIncome = incomeOperations.reduce((sum, operation) => sum + operation.amount, 0);
    const totalExpense = expenseOperations.reduce((sum, operation) => sum + operation.amount, 0);

    const cashIncome = incomeOperations
      .filter((operation) => operation.paymentMethod === 'cash')
      .reduce((sum, operation) => sum + operation.amount, 0);
    const cardIncome = incomeOperations
      .filter((operation) => operation.paymentMethod === 'card')
      .reduce((sum, operation) => sum + operation.amount, 0);
    const transferIncome = incomeOperations
      .filter((operation) => operation.paymentMethod === 'transfer')
      .reduce((sum, operation) => sum + operation.amount, 0);

    const cashExpense = expenseOperations
      .filter((operation) => operation.paymentMethod === 'cash')
      .reduce((sum, operation) => sum + operation.amount, 0);
    const cardExpense = expenseOperations
      .filter((operation) => operation.paymentMethod === 'card')
      .reduce((sum, operation) => sum + operation.amount, 0);
    const transferExpense = expenseOperations
      .filter((operation) => operation.paymentMethod === 'transfer')
      .reduce((sum, operation) => sum + operation.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      operationsCount: this.operations.length,
      cashboxBalance: cashIncome - cashExpense,
      terminalBalance: cardIncome - cardExpense,
      transferBalance: transferIncome - transferExpense,
      incomeByMethod: {
        cash: cashIncome,
        card: cardIncome,
        transfer: transferIncome,
        installment: incomeOperations
          .filter((operation) => operation.paymentMethod === 'installment')
          .reduce((sum, operation) => sum + operation.amount, 0),
      },
      expenseByMethod: {
        cash: cashExpense,
        card: cardExpense,
        transfer: transferExpense,
        installment: expenseOperations
          .filter((operation) => operation.paymentMethod === 'installment')
          .reduce((sum, operation) => sum + operation.amount, 0),
      },
    };
  }
}

export const cashService = new CashService();
