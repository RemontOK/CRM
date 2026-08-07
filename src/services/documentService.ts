import {
  AcceptanceAct,
  Client,
  Device,
  DocumentStorage,
  ElectronicSignature,
  Order,
  PartItem,
  WorkCompletionAct,
  WorkItem,
} from '../types';
import { apiService } from './api';
import { calcEstimatedCompletionDate } from '../utils/orderDates';

const ACCEPTANCE_CACHE_KEY = 'crm_acceptance_acts';
const COMPLETION_CACHE_KEY = 'crm_work_completion_acts';
const STORAGE_CACHE_KEY = 'crm_document_storage';

const normalizeSignature = (signature?: ElectronicSignature | null): ElectronicSignature | undefined =>
  signature
    ? {
        ...signature,
        signedAt: new Date(signature.signedAt),
      }
    : undefined;

const normalizeAcceptanceAct = (act: AcceptanceAct): AcceptanceAct => ({
  ...act,
  estimatedDays: act.estimatedDays ? Number(act.estimatedDays) : undefined,
  estimatedCompletionDate: act.estimatedCompletionDate ? String(act.estimatedCompletionDate) : undefined,
  acceptanceDate: new Date(act.acceptanceDate),
  createdAt: new Date(act.createdAt),
  updatedAt: new Date(act.updatedAt),
  printedAt: act.printedAt ? new Date(act.printedAt) : undefined,
  clientSignature: normalizeSignature(act.clientSignature),
  masterSignature: normalizeSignature(act.masterSignature),
});

const normalizeCompletionAct = (act: WorkCompletionAct): WorkCompletionAct => ({
  ...act,
  completionDate: new Date(act.completionDate),
  createdAt: new Date(act.createdAt),
  updatedAt: new Date(act.updatedAt),
  printedAt: act.printedAt ? new Date(act.printedAt) : undefined,
  clientSignature: normalizeSignature(act.clientSignature),
  masterSignature: normalizeSignature(act.masterSignature),
});

const normalizeStorage = (item: DocumentStorage): DocumentStorage => ({
  ...item,
  createdAt: new Date(item.createdAt),
});

class DocumentService {
  private acceptanceActs: AcceptanceAct[] = [];
  private workCompletionActs: WorkCompletionAct[] = [];
  private documentStorage: DocumentStorage[] = [];

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const acceptance = localStorage.getItem(ACCEPTANCE_CACHE_KEY);
      const completion = localStorage.getItem(COMPLETION_CACHE_KEY);
      const storage = localStorage.getItem(STORAGE_CACHE_KEY);

      this.acceptanceActs = acceptance ? JSON.parse(acceptance).map(normalizeAcceptanceAct) : [];
      this.workCompletionActs = completion ? JSON.parse(completion).map(normalizeCompletionAct) : [];
      this.documentStorage = storage ? JSON.parse(storage).map(normalizeStorage) : [];
    } catch {
      this.acceptanceActs = [];
      this.workCompletionActs = [];
      this.documentStorage = [];
    }
  }

  private saveCache() {
    localStorage.setItem(ACCEPTANCE_CACHE_KEY, JSON.stringify(this.acceptanceActs));
    localStorage.setItem(COMPLETION_CACHE_KEY, JSON.stringify(this.workCompletionActs));
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(this.documentStorage));
  }

  clearSession() {
    this.acceptanceActs = [];
    this.workCompletionActs = [];
    this.documentStorage = [];
    localStorage.removeItem(ACCEPTANCE_CACHE_KEY);
    localStorage.removeItem(COMPLETION_CACHE_KEY);
    localStorage.removeItem(STORAGE_CACHE_KEY);
  }

  private syncAcceptance(acts: AcceptanceAct[]) {
    this.acceptanceActs = acts.map(normalizeAcceptanceAct);
    this.saveCache();
  }

  private syncCompletion(acts: WorkCompletionAct[]) {
    this.workCompletionActs = acts.map(normalizeCompletionAct);
    this.saveCache();
  }

  private syncStorage(items: DocumentStorage[]) {
    this.documentStorage = items.map(normalizeStorage);
    this.saveCache();
  }

  async createAcceptanceAct(
    order: Order,
    client: Client,
    device: Device,
    problemDescription: string,
    preliminaryCost: number,
    acceptedBy: string,
    conditions = 'Устройство принимается на бесплатную диагностику и ремонт.',
    advancePayment = 0
  ): Promise<AcceptanceAct> {
    const acceptanceDate = new Date().toISOString();
    const estimatedDays = Math.max(1, Number(order.estimatedDays) || 1);
    const estimatedCompletionDate = calcEstimatedCompletionDate(
      order.createdAt || acceptanceDate,
      estimatedDays
    ).toISOString();

    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      client,
      device,
      problemDescription,
      preliminaryCost,
      advancePayment,
      estimatedDays,
      estimatedCompletionDate,
      acceptanceDate,
      acceptedBy,
      conditions,
    };

    const created = normalizeAcceptanceAct(await apiService.post<AcceptanceAct>('/documents/acceptance-acts', payload));
    this.acceptanceActs = [created, ...this.acceptanceActs.filter((item) => item.id !== created.id)];
    this.saveCache();
    return created;
  }

  async createWorkCompletionAct(
    order: Order,
    client: Client,
    device: Device,
    worksPerformed: WorkItem[],
    partsUsed: PartItem[],
    totalCost: number,
    warrantyPeriod: number,
    completedBy: string
  ): Promise<WorkCompletionAct> {
    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      client,
      device,
      worksPerformed,
      partsUsed,
      totalCost,
      warrantyPeriod,
      completionDate: new Date().toISOString(),
      completedBy,
    };

    const created = normalizeCompletionAct(await apiService.post<WorkCompletionAct>('/documents/completion-acts', payload));
    this.workCompletionActs = [created, ...this.workCompletionActs.filter((item) => item.id !== created.id)];
    this.saveCache();
    return created;
  }

  async addSignature(
    documentId: string,
    documentType: 'acceptance' | 'completion',
    signatureData: string,
    signerName: string,
    signerRole: 'client' | 'master' | 'manager',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const signature = {
      signerName,
      signerRole,
      signatureData,
      ipAddress,
      userAgent,
    };

    if (documentType === 'acceptance') {
      const updated = normalizeAcceptanceAct(
        await apiService.post<AcceptanceAct>(`/documents/acceptance-acts/${documentId}/signature`, signature)
      );
      this.acceptanceActs = this.acceptanceActs.map((item) => (item.id === updated.id ? updated : item));
    } else {
      const updated = normalizeCompletionAct(
        await apiService.post<WorkCompletionAct>(`/documents/completion-acts/${documentId}/signature`, signature)
      );
      this.workCompletionActs = this.workCompletionActs.map((item) => (item.id === updated.id ? updated : item));
    }

    this.saveCache();
  }

  async getAcceptanceActByOrderId(orderId: string): Promise<AcceptanceAct | null> {
    try {
      const act = await apiService.get<AcceptanceAct | null>('/documents/acceptance-acts', { orderId });
      if (!act) {
        return null;
      }

      const normalized = normalizeAcceptanceAct(act);
      this.acceptanceActs = [normalized, ...this.acceptanceActs.filter((item) => item.id !== normalized.id)];
      this.saveCache();
      return normalized;
    } catch {
      return this.acceptanceActs.find((item) => item.orderId === orderId) || null;
    }
  }

  async getWorkCompletionActByOrderId(orderId: string): Promise<WorkCompletionAct | null> {
    try {
      const act = await apiService.get<WorkCompletionAct | null>('/documents/completion-acts', { orderId });
      if (!act) {
        return null;
      }

      const normalized = normalizeCompletionAct(act);
      this.workCompletionActs = [normalized, ...this.workCompletionActs.filter((item) => item.id !== normalized.id)];
      this.saveCache();
      return normalized;
    } catch {
      return this.workCompletionActs.find((item) => item.orderId === orderId) || null;
    }
  }

  async getAcceptanceActs(): Promise<AcceptanceAct[]> {
    try {
      const acts = await apiService.get<AcceptanceAct[]>('/documents/acceptance-acts');
      this.syncAcceptance(acts);
    } catch {
      // Fallback to cache
    }

    return this.acceptanceActs;
  }

  async getWorkCompletionActs(): Promise<WorkCompletionAct[]> {
    try {
      const acts = await apiService.get<WorkCompletionAct[]>('/documents/completion-acts');
      this.syncCompletion(acts);
    } catch {
      // Fallback to cache
    }

    return this.workCompletionActs;
  }

  async markDocumentAsPrinted(documentId: string, documentType: 'acceptance' | 'completion'): Promise<void> {
    if (documentType === 'acceptance') {
      const updated = normalizeAcceptanceAct(
        await apiService.post<AcceptanceAct>(`/documents/acceptance-acts/${documentId}/printed`)
      );
      this.acceptanceActs = this.acceptanceActs.map((item) => (item.id === updated.id ? updated : item));
    } else {
      const updated = normalizeCompletionAct(
        await apiService.post<WorkCompletionAct>(`/documents/completion-acts/${documentId}/printed`)
      );
      this.workCompletionActs = this.workCompletionActs.map((item) => (item.id === updated.id ? updated : item));
    }

    this.saveCache();
  }

  async saveDocumentToStorage(
    orderId: string,
    documentType: 'acceptance' | 'completion',
    documentId: string,
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<void> {
    const created = normalizeStorage(
      await apiService.post<DocumentStorage>('/documents/storage', {
        orderId,
        documentType,
        documentId,
        filePath,
        fileSize,
        mimeType,
      })
    );

    this.documentStorage = [created, ...this.documentStorage.filter((item) => item.id !== created.id)];
    this.saveCache();
  }

  async getDocumentsByOrderId(orderId: string): Promise<DocumentStorage[]> {
    try {
      const items = await apiService.get<DocumentStorage[]>('/documents/storage', { orderId });
      this.syncStorage(items);
    } catch {
      // Fallback to cache
    }

    return this.documentStorage.filter((item) => item.orderId === orderId);
  }
}

export const documentService = new DocumentService();
