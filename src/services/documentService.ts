import { 
  AcceptanceAct, 
  WorkCompletionAct, 
  ElectronicSignature, 
  DocumentStorage,
  Order,
  Client,
  Device,
  WorkItem,
  PartItem
} from '../types';

class DocumentService {
  private acceptanceActs: AcceptanceAct[] = [];
  private workCompletionActs: WorkCompletionAct[] = [];
  private documentStorage: DocumentStorage[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedAcceptanceActs = localStorage.getItem('crm_acceptance_acts');
    const savedWorkCompletionActs = localStorage.getItem('crm_work_completion_acts');
    const savedDocumentStorage = localStorage.getItem('crm_document_storage');

    if (savedAcceptanceActs) {
      this.acceptanceActs = JSON.parse(savedAcceptanceActs).map((act: any) => ({
        ...act,
        acceptanceDate: new Date(act.acceptanceDate),
        createdAt: new Date(act.createdAt),
        updatedAt: new Date(act.updatedAt),
        printedAt: act.printedAt ? new Date(act.printedAt) : undefined,
        clientSignature: act.clientSignature ? {
          ...act.clientSignature,
          signedAt: new Date(act.clientSignature.signedAt)
        } : undefined,
        masterSignature: act.masterSignature ? {
          ...act.masterSignature,
          signedAt: new Date(act.masterSignature.signedAt)
        } : undefined,
      }));
    }

    if (savedWorkCompletionActs) {
      this.workCompletionActs = JSON.parse(savedWorkCompletionActs).map((act: any) => ({
        ...act,
        completionDate: new Date(act.completionDate),
        createdAt: new Date(act.createdAt),
        updatedAt: new Date(act.updatedAt),
        printedAt: act.printedAt ? new Date(act.printedAt) : undefined,
        clientSignature: act.clientSignature ? {
          ...act.clientSignature,
          signedAt: new Date(act.clientSignature.signedAt)
        } : undefined,
        masterSignature: act.masterSignature ? {
          ...act.masterSignature,
          signedAt: new Date(act.masterSignature.signedAt)
        } : undefined,
      }));
    }

    if (savedDocumentStorage) {
      this.documentStorage = JSON.parse(savedDocumentStorage).map((storage: any) => ({
        ...storage,
        createdAt: new Date(storage.createdAt)
      }));
    }
  }

  private saveToStorage() {
    localStorage.setItem('crm_acceptance_acts', JSON.stringify(this.acceptanceActs));
    localStorage.setItem('crm_work_completion_acts', JSON.stringify(this.workCompletionActs));
    localStorage.setItem('crm_document_storage', JSON.stringify(this.documentStorage));
  }

  // Создание акта приема-передачи
  async createAcceptanceAct(
    order: Order,
    client: Client,
    device: Device,
    problemDescription: string,
    preliminaryCost: number,
    acceptedBy: string,
    conditions: string = 'Устройство принимается на диагностику и ремонт. В случае отказа от ремонта взимается плата за диагностику.'
  ): Promise<AcceptanceAct> {
    const documentNumber = `АП-${Date.now()}`;
    
    const acceptanceAct: AcceptanceAct = {
      id: Date.now().toString(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      client,
      device,
      problemDescription,
      preliminaryCost,
      acceptanceDate: new Date(),
      acceptedBy,
      conditions,
      documentNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.acceptanceActs.push(acceptanceAct);
    this.saveToStorage();
    
    return acceptanceAct;
  }

  // Создание акта выполненных работ
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
    const documentNumber = `АВР-${Date.now()}`;
    
    const workCompletionAct: WorkCompletionAct = {
      id: Date.now().toString(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      client,
      device,
      worksPerformed,
      partsUsed,
      totalCost,
      warrantyPeriod,
      completionDate: new Date(),
      completedBy,
      documentNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workCompletionActs.push(workCompletionAct);
    this.saveToStorage();
    
    return workCompletionAct;
  }

  // Добавление электронной подписи
  async addSignature(
    documentId: string,
    documentType: 'acceptance' | 'completion',
    signatureData: string,
    signerName: string,
    signerRole: 'client' | 'master' | 'manager',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const signature: ElectronicSignature = {
      id: Date.now().toString(),
      signerName,
      signerRole,
      signatureData,
      signedAt: new Date(),
      ipAddress,
      userAgent,
    };

    if (documentType === 'acceptance') {
      const act = this.acceptanceActs.find(a => a.id === documentId);
      if (act) {
        if (signerRole === 'client') {
          act.clientSignature = signature;
        } else {
          act.masterSignature = signature;
        }
        act.updatedAt = new Date();
      }
    } else {
      const act = this.workCompletionActs.find(a => a.id === documentId);
      if (act) {
        if (signerRole === 'client') {
          act.clientSignature = signature;
        } else {
          act.masterSignature = signature;
        }
        act.updatedAt = new Date();
      }
    }

    this.saveToStorage();
  }

  // Получение акта приема-передачи по ID заказа
  async getAcceptanceActByOrderId(orderId: string): Promise<AcceptanceAct | null> {
    return this.acceptanceActs.find(act => act.orderId === orderId) || null;
  }

  // Получение акта выполненных работ по ID заказа
  async getWorkCompletionActByOrderId(orderId: string): Promise<WorkCompletionAct | null> {
    return this.workCompletionActs.find(act => act.orderId === orderId) || null;
  }

  // Получение всех актов приема-передачи
  async getAcceptanceActs(): Promise<AcceptanceAct[]> {
    return this.acceptanceActs;
  }

  // Получение всех актов выполненных работ
  async getWorkCompletionActs(): Promise<WorkCompletionAct[]> {
    return this.workCompletionActs;
  }

  // Отметка о печати документа
  async markDocumentAsPrinted(documentId: string, documentType: 'acceptance' | 'completion'): Promise<void> {
    if (documentType === 'acceptance') {
      const act = this.acceptanceActs.find(a => a.id === documentId);
      if (act) {
        act.printedAt = new Date();
        act.updatedAt = new Date();
      }
    } else {
      const act = this.workCompletionActs.find(a => a.id === documentId);
      if (act) {
        act.printedAt = new Date();
        act.updatedAt = new Date();
      }
    }

    this.saveToStorage();
  }

  // Сохранение документа в хранилище
  async saveDocumentToStorage(
    orderId: string,
    documentType: 'acceptance' | 'completion',
    documentId: string,
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<void> {
    const storage: DocumentStorage = {
      id: Date.now().toString(),
      orderId,
      documentType,
      documentId,
      filePath,
      fileSize,
      mimeType,
      createdAt: new Date(),
    };

    this.documentStorage.push(storage);
    this.saveToStorage();
  }

  // Получение документов по заказу
  async getDocumentsByOrderId(orderId: string): Promise<DocumentStorage[]> {
    return this.documentStorage.filter(doc => doc.orderId === orderId);
  }
}

export const documentService = new DocumentService();
