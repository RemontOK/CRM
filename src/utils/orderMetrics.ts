import { Employee, Order, OrderPart } from '../types';

type OrderPartWithMeta = OrderPart & {
  partInfo?: {
    partCost?: number;
    workCost?: number;
  };
  workType?: string;
};

export const getOrderItemsTotal = (order: Order) =>
  (order.parts || []).reduce((sum, part) => sum + Number(part.totalPrice || 0), 0);

export const getOrderTotal = (order: Order) => {
  const itemsTotal = getOrderItemsTotal(order);
  if (itemsTotal > 0) {
    return itemsTotal;
  }

  return Number(order.finalCost || order.estimatedCost || 0);
};

export const getOrderPaidAmount = (order: Order) =>
  (order.payments || [])
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

export const getOrderDebt = (order: Order) =>
  Math.max(getOrderTotal(order) - getOrderPaidAmount(order), 0);

export const getOrderPartsCost = (order: Order) => {
  const rawParts = (order.parts || []) as OrderPartWithMeta[];
  if (!rawParts.length) {
    return 0;
  }

  return rawParts.reduce((sum, item) => {
    const explicitPartCost = Number(item.partInfo?.partCost ?? 0);
    if (explicitPartCost > 0) {
      return sum + explicitPartCost;
    }

    const workType = item.workType as string | undefined;
    const isLegacyPartLine = !workType && !!item.partId;
    if (isLegacyPartLine) {
      return sum + Number(item.unitPrice || 0) * Number(item.quantity || 0);
    }

    return sum;
  }, 0);
};

export const getOrderMarginBase = (order: Order) => {
  const rawParts = (order.parts || []) as OrderPartWithMeta[];
  if (!rawParts.length) {
    return getOrderTotal(order);
  }

  const marginByItems = rawParts.reduce((sum, item) => {
    const lineTotal = Number(item.partInfo?.workCost ?? item.totalPrice ?? 0);
    const linePartCost = Number(item.partInfo?.partCost ?? 0);
    const lineMargin = Math.max(lineTotal - linePartCost, 0);
    return sum + lineMargin;
  }, 0);

  return marginByItems > 0 ? marginByItems : getOrderTotal(order);
};

const normalizeEmployeeName = (value?: string) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const pickEmployeeRate = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && value > 0 ? value : fallback;

export const employeeNamesMatch = (left?: string, right?: string) => {
  const a = normalizeEmployeeName(left);
  const b = normalizeEmployeeName(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  return a.includes(b) || b.includes(a);
};

const findEmployeeByName = (employees: Employee[], name?: string) => {
  const key = normalizeEmployeeName(name);
  if (!key) {
    return null;
  }
  return (
    employees.find((employee) => normalizeEmployeeName(employee.name) === key) ||
    employees.find((employee) => employeeNamesMatch(employee.name, name)) ||
    null
  );
};

export const isOrderTechnician = (order: Order, employee: Employee) => {
  if (order.technicianId && order.technicianId === employee.id) {
    return true;
  }
  return employeeNamesMatch(order.technicianName, employee.name);
};

export const isOrderIntakeManager = (order: Order, employee: Employee) =>
  employeeNamesMatch(order.intakeManagerName, employee.name);

export const isOrderDeliveryManager = (order: Order, employee: Employee) =>
  employeeNamesMatch(order.deliveryManagerName, employee.name);

/** Сдельный доход сотрудника по заказу — как в карточке заказа (полная маржа × %). */
export const getEmployeeOrderEarnings = (order: Order, employee: Employee) => {
  const marginBase = getOrderMarginBase(order);
  let earnings = 0;

  if (isOrderIntakeManager(order, employee)) {
    earnings += (marginBase * (Number(employee.intakeRate) || 0)) / 100;
  }
  if (isOrderTechnician(order, employee)) {
    earnings += (marginBase * (Number(employee.executionRate) || 0)) / 100;
  }
  if (isOrderDeliveryManager(order, employee)) {
    earnings += (marginBase * (Number(employee.deliveryRate) || 0)) / 100;
  }

  return earnings;
};

export interface OrderRoleRates {
  technicianRate: number;
  intakeRate: number;
  deliveryRate: number;
}

export interface OrderProfitMetrics {
  revenue: number;
  partsCost: number;
  grossMargin: number;
  employeePayouts: number;
  serviceProfit: number;
  marginBase: number;
}

export interface EmployeeRateDefaults {
  defaultIntakeRate: number;
  defaultExecutionRate: number;
  defaultDeliveryRate: number;
}

export const getOrderRoleRates = (
  order: Order,
  employees: Employee[],
  defaults: EmployeeRateDefaults
): OrderRoleRates => {
  const technician = order.technicianId
    ? employees.find((employee) => employee.id === order.technicianId) || null
    : findEmployeeByName(employees, order.technicianName);
  const intakeManager = findEmployeeByName(employees, order.intakeManagerName);
  const deliveryManager = findEmployeeByName(employees, order.deliveryManagerName);

  return {
    technicianRate: pickEmployeeRate(technician?.executionRate, defaults.defaultExecutionRate),
    intakeRate: pickEmployeeRate(intakeManager?.intakeRate, defaults.defaultIntakeRate),
    deliveryRate: pickEmployeeRate(deliveryManager?.deliveryRate, defaults.defaultDeliveryRate),
  };
};

export const getOrderProfitMetrics = (
  order: Order,
  employees: Employee[],
  defaults: EmployeeRateDefaults,
  paidAmount?: number
): OrderProfitMetrics => {
  const orderTotal = getOrderTotal(order);
  const paid = paidAmount ?? getOrderPaidAmount(order);
  const ratio = orderTotal > 0 ? Math.min(paid / orderTotal, 1) : paid > 0 ? 1 : 0;

  const revenue = paid;
  const partsCost = Math.round(getOrderPartsCost(order) * ratio);
  const grossMargin = Math.max(revenue - partsCost, 0);
  const marginBase = getOrderMarginBase(order) * ratio;
  const rates = getOrderRoleRates(order, employees, defaults);
  const employeePayouts = Math.round(
    (marginBase * rates.technicianRate) / 100 +
      (marginBase * rates.intakeRate) / 100 +
      (marginBase * rates.deliveryRate) / 100
  );
  const serviceProfit = Math.max(grossMargin - employeePayouts, 0);

  return {
    revenue: Math.round(revenue),
    partsCost,
    grossMargin: Math.round(grossMargin),
    employeePayouts,
    serviceProfit: Math.round(serviceProfit),
    marginBase: Math.round(marginBase),
  };
};

