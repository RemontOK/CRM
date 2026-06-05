export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'technician' | 'cashier';
  avatar?: string;
  phone?: string;
  rating: number;
  totalEarnings: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  type: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other';
  brand: string;
  model: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  externalCondition?: string; // Сколы, потертости, скрытые дефекты
  clientId: string;
  createdAt: string;
}

export interface OrderStatusSetting {
  id: string;
  code: string;
  label: string;
  color: string;
  enabled: boolean;
  isFinal: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  deviceId: string;
  technicianId: string;
  technicianName?: string;
  intakeManagerName?: string;
  deliveryManagerName?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  diagnosis?: string;
  estimatedCost: number;
  finalCost?: number;
  estimatedDays?: number; // срок выполнения в днях
  actualDays?: number; // фактический срок в днях
  estimatedTime?: string; // добавлено поле estimatedTime
  parts: OrderPart[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isPaid: boolean; // оплачен ли заказ
  
  // Дополнительные поля для отображения в таблице
  clientName?: string;
  clientPhone?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
  deviceImei?: string;
  deviceColor?: string;
  devicePassword?: string;
  deviceCondition?: string;
  deviceExternalCondition?: string;
  communicationHistory?: OrderCommunicationEntry[];
}

export interface OrderCommunicationEntry {
  id: string;
  channel: 'whatsapp' | 'telegram' | 'sms' | 'system' | 'internal' | 'payment';
  author: string;
  message: string;
  createdAt: string;
}

export interface OrderPart {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isUsed: boolean;
}

export interface Part {
  id: string;
  partType?: 'spare_part' | 'accessory' | 'product';
  name: string;
  partNumber: string;
  category: string;
  subcategory?: string;
  brand: string;
  model: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  alertThreshold?: number;
  notificationsEnabled?: boolean;
  unitPrice: number;
  wholesalePrice?: number;
  supplier: string;
  supplierContact?: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  loginEmail?: string;
  password?: string;
  canLogin?: boolean;
  role: 'admin' | 'manager' | 'technician' | 'cashier';
  department: string;
  position: string;
  salary: number;
  intakeRate: number;
  executionRate: number;
  deliveryRate: number;
  rating: number;
  totalOrders: number;
  completedOrders: number;
  totalEarnings: number;
  isActive: boolean;
  hireDate: Date;
  lastLogin: Date;
}

export type EmployeeTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface EmployeeScheduleEntry {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  note?: string;
  isDayOff?: boolean;
  updatedAt: string;
}

export interface EmployeeScheduleRosterEntry {
  id: string;
  employeeId: string;
  month: string;
  updatedAt: string;
}

export interface EmployeeTask {
  id: string;
  employeeId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: EmployeeTaskStatus;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface StockMovement {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
  direction: 'in' | 'out' | 'adjustment';
  reason: string;
  unitCost?: number;
  totalCost?: number;
  supplier?: string;
  documentNumber?: string;
  orderNumber?: string;
  processedBy?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedBy: string;
  processedAt: Date;
  notes?: string;
}

export interface CashOperation {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  paymentMethod?: string;
  registerType?: 'cashbox' | 'bank_terminal' | 'online' | 'mixed';
  source?: 'order_payment' | 'manual' | 'inventory_receipt' | 'inventory_writeoff' | 'salary' | 'other';
  orderId?: string;
  processedBy: string;
  processedAt: Date;
  notes?: string;
}

export interface PaymentMethodOption {
  code: string;
  label: string;
  enabled: boolean;
  registerType: 'cashbox' | 'bank_terminal' | 'online' | 'mixed';
}

export interface QuickSaleOption {
  id: string;
  label: string;
  category: string;
  saleMode: 'single' | 'quantity';
  enabled: boolean;
  sortOrder: number;
}

export interface AppSettings {
  forms: {
    orderTypes: Array<{
      id: string;
      code: string;
      label: string;
      enabled: boolean;
      sortOrder: number;
    }>;
    clientTypes: Array<{
      id: string;
      code: string;
      label: string;
      enabled: boolean;
      sortOrder: number;
    }>;
    orderFields: Array<{
      id: string;
      code: string;
      label: string;
      enabled: boolean;
      required: boolean;
      sortOrder: number;
    }>;
    clientFields: Array<{
      id: string;
      code: string;
      label: string;
      enabled: boolean;
      required: boolean;
      sortOrder: number;
    }>;
    directories: Array<{
      id: string;
      code: string;
      label: string;
      enabled: boolean;
      sortOrder: number;
    }>;
  };
  profile: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  locations: {
    items: string[];
  };
  employees: {
    defaultIntakeRate: number;
    defaultExecutionRate: number;
    defaultDeliveryRate: number;
    defaultWorkStartTime: string;
    defaultWorkEndTime: string;
  };
  employeeWork: {
    schedules: EmployeeScheduleEntry[];
    rosterEntries: EmployeeScheduleRosterEntry[];
    tasks: EmployeeTask[];
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    orderUpdates: boolean;
    paymentReminders: boolean;
    lowStockAlerts: boolean;
    smsOnReadyStatus: boolean;
    smsStatusTriggers: Record<string, boolean>;
  };
  business: {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    workingHours: string;
    timezone: string;
  };
  orders: {
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
    autoOpenCompletionAfterPayment: boolean;
    createMode: 'single' | 'step';
    quickSaleOptions: QuickSaleOption[];
    statuses: OrderStatusSetting[];
    statusLabels: Record<string, string>;
    statusColors: Record<string, string>;
  };
  documents: {
    acceptanceActTitle: string;
    completionActTitle: string;
    warrantyText: string;
    footerDisclaimer: string;
    templates: DocumentTemplate[];
  };
  payment: {
    currency: string;
    taxRate: number;
    paymentMethods: string[];
    paymentMethodOptions: PaymentMethodOption[];
    installmentEnabled: boolean;
    cashRegisterName: string;
    terminalName: string;
  };
  system: {
    autoBackup: boolean;
    backupFrequency: string;
    dataRetention: number;
    language: string;
    theme: string;
  };
    integrations: {
      smsProvider: 'none' | 'webhook';
      smsWebhookUrl: string;
      smsApiToken: string;
      smsSenderName: string;
      smsTemplateReady: string;
      smsStatusTemplates: Record<string, string>;
      smsWebhookMethod: 'POST' | 'GET';
      whatsappMode: 'crm' | 'crm_and_link' | 'link_only' | 'custom';
      whatsappLinkTemplate: string;
    telegramMode: 'crm' | 'crm_and_link' | 'link_only' | 'custom';
    telegramLinkTemplate: string;
    callMode: 'tel' | 'custom';
    callLinkTemplate: string;
  };
  license: {
    plan: string;
    key: string;
  };
}

export interface TaxonomyNode {
  id: string;
  scope: 'inventory' | 'cash' | 'employee_departments' | 'employee_positions';
  name: string;
  parentId?: string | null;
  createdAt: Date;
}

export interface Statistics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  totalClients: number;
  newClientsThisMonth: number;
  averageOrderValue: number;
  topTechnicians: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
    rating: number;
  }>;
  topParts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface DashboardData {
  statistics: Statistics;
  recentOrders: Order[];
  lowStockParts: Part[];
  upcomingAppointments: any[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Документооборот
export interface ElectronicSignature {
  id: string;
  signerName: string;
  signerRole: 'client' | 'master' | 'manager';
  signatureData: string; // Base64 encoded signature image
  signedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'acceptance' | 'completion' | 'custom';
  category: 'orders' | 'shop' | 'inventory' | 'clients' | 'finance' | 'other';
  description?: string;
  template: string;
  variables?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcceptanceAct {
  id: string;
  orderId: string;
  orderNumber: string;
  client: Client;
  device: Device;
  problemDescription: string;
  preliminaryCost: number;
  advancePayment?: number;
  acceptanceDate: Date;
  acceptedBy: string; // мастер
  conditions: string; // условия хранения
  clientSignature?: ElectronicSignature;
  masterSignature?: ElectronicSignature;
  documentNumber: string;
  printedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  quantity: number;
  totalCost: number;
  warrantyDays?: number;
}

export interface PartItem {
  id: string;
  partId: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WorkCompletionAct {
  id: string;
  orderId: string;
  orderNumber: string;
  client: Client;
  device: Device;
  worksPerformed: WorkItem[];
  partsUsed: PartItem[];
  totalCost: number;
  warrantyPeriod: number; // в днях
  completionDate: Date;
  completedBy: string;
  clientSignature?: ElectronicSignature;
  masterSignature?: ElectronicSignature;
  documentNumber: string;
  printedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentStorage {
  id: string;
  orderId: string;
  documentType: 'acceptance' | 'completion';
  documentId: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}
