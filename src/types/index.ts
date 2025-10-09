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

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  deviceId: string;
  technicianId: string;
  status: 'diagnosis' | 'waiting_parts' | 'waiting_client' | 'in_progress' | 'completed' | 'cancelled' | 'pending';
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
  deviceCondition?: string;
  deviceExternalCondition?: string;
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
  name: string;
  partNumber: string;
  category: string;
  brand: string;
  model: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  supplier: string;
  supplierContact?: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'installment';
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
  orderId?: string;
  processedBy: string;
  processedAt: Date;
  notes?: string;
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
  type: 'acceptance' | 'completion';
  template: string; // HTML template
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
