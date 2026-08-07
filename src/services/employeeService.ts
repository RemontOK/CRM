import { Employee } from '../types';
import { apiService } from './api';
import { normalizeAllowedModules } from '../utils/employeeModuleAccess';
import {
  normalizeSelfEditableFields,
  normalizeVisibleSections,
} from '../utils/employeeSettingsAccess';
import { normalizePhoneForStorage } from '../utils/phone';

const EMPLOYEES_STORAGE_KEY = 'crm_employees';

const decodeMojibake = (value?: string) => {
  if (!value) {
    return value;
  }

  if (!/[РСЃв‚]/.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
};

const normalizeEmployee = (employee: Employee): Employee => ({
  ...employee,
  name: decodeMojibake(employee.name) || '',
  email: decodeMojibake(employee.email) || '',
  phone: normalizePhoneForStorage(decodeMojibake(employee.phone) || ''),
  loginEmail: decodeMojibake(employee.loginEmail) || decodeMojibake(employee.email) || '',
  password: employee.password || '',
  canLogin: employee.canLogin ?? true,
  department: decodeMojibake(employee.department) || '',
  position: decodeMojibake(employee.position) || '',
  intakeRate: Number(employee.intakeRate) || 0,
  executionRate: Number(employee.executionRate) || 0,
  deliveryRate: Number(employee.deliveryRate) || 0,
  hireDate: new Date(employee.hireDate),
  lastLogin: new Date(employee.lastLogin),
  access: {
    allowedModules: normalizeAllowedModules(employee.access?.allowedModules),
    visibleSections: normalizeVisibleSections(employee.access?.visibleSections),
    selfEditableFields: normalizeSelfEditableFields(employee.access?.selfEditableFields),
  },
});

const mapApiUserToEmployee = (user: any): Employee =>
  normalizeEmployee({
    id: String(user.id),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    loginEmail: user.loginEmail || user.email || '',
    password: '',
    canLogin: user.canLogin ?? true,
    role: (user.role || 'manager') as Employee['role'],
    department: user.department || '',
    position: user.position || '',
    salary: Number(user.salary || 0),
    intakeRate: Number(user.intakeRate || 0),
    executionRate: Number(user.executionRate || 0),
    deliveryRate: Number(user.deliveryRate || 0),
    rating: Number(user.rating || 0),
    totalOrders: Number(user.totalOrders || 0),
    completedOrders: Number(user.completedOrders || 0),
    totalEarnings: Number(user.totalEarnings || 0),
    isActive: user.isActive ?? true,
    hireDate: new Date(user.hireDate || user.createdAt || new Date()),
    lastLogin: new Date(user.lastLogin || user.updatedAt || new Date()),
    access: {
      allowedModules: normalizeAllowedModules(user.access?.allowedModules),
      visibleSections: normalizeVisibleSections(user.access?.visibleSections),
      selfEditableFields: normalizeSelfEditableFields(user.access?.selfEditableFields),
    },
  });

class EmployeeService {
  private employees: Employee[] = [];

  constructor() {
    this.loadFromCache();
    void this.refreshFromApi();
  }

  private loadFromCache() {
    const saved = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!saved) {
      this.employees = [];
      return;
    }

    try {
      this.employees = JSON.parse(saved).map((employee: Employee) => normalizeEmployee(employee));
    } catch {
      this.employees = [];
    }
  }

  private saveToCache() {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(this.employees));
  }

  clearSession() {
    this.employees = [];
    localStorage.removeItem(EMPLOYEES_STORAGE_KEY);
  }

  async refreshFromApi() {
    try {
      const users = await apiService.get<any[]>('/users');
      this.employees = users.map(mapApiUserToEmployee);
      this.saveToCache();
    } catch {
      // keep cached list when API is temporarily unavailable
    }
    return [...this.employees];
  }

  getEmployees() {
    return [...this.employees];
  }

  getEmployeesByRole(role: Employee['role']) {
    return this.employees.filter((employee) => employee.role === role && employee.isActive);
  }

  async addEmployee(
    employeeData: Omit<Employee, 'id' | 'hireDate' | 'lastLogin'> & { hireDate?: Date; lastLogin?: Date }
  ) {
    const payload = {
      ...employeeData,
      phone: normalizePhoneForStorage(employeeData.phone),
      hireDate: (employeeData.hireDate || new Date()).toISOString(),
      lastLogin: (employeeData.lastLogin || new Date()).toISOString(),
    };
    const created = await apiService.post<any>('/users', payload);
    const employee = mapApiUserToEmployee(created);
    this.employees = [employee, ...this.employees.filter((item) => item.id !== employee.id)];
    this.saveToCache();
    return employee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>) {
    const payload = {
      ...updates,
      ...(updates.phone !== undefined ? { phone: normalizePhoneForStorage(updates.phone) } : {}),
      hireDate:
        updates.hireDate instanceof Date
          ? updates.hireDate.toISOString()
          : updates.hireDate,
      lastLogin:
        updates.lastLogin instanceof Date
          ? updates.lastLogin.toISOString()
          : updates.lastLogin,
    };
    const updated = await apiService.put<any>(`/users/${id}`, payload);
    const employee = mapApiUserToEmployee(updated);
    this.employees = this.employees.map((item) => (item.id === id ? employee : item));
    this.saveToCache();
    return employee;
  }

  async deleteEmployee(id: string) {
    await apiService.delete(`/users/${id}`);
    this.employees = this.employees.filter((employee) => employee.id !== id);
    this.saveToCache();
  }
}

export const employeeService = new EmployeeService();
