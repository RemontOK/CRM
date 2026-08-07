import { Order } from '../types';
import { clientService } from '../services/clientService';
import { orderService } from '../services/orderService';
import { normalizePhoneForStorage } from './phone';
import {
  ColumnDef,
  SheetRow,
  cellToString,
  mapRowsByColumns,
  toExportRows,
} from './sheetIO';
import type { ImportResult } from './inventoryExchange';

export const ORDER_EXCHANGE_COLUMNS: ColumnDef[] = [
  { key: 'orderNumber', header: 'Номер заказа', aliases: ['ordernumber', 'номер', 'order', '№'] },
  { key: 'clientName', header: 'Клиент', required: true, aliases: ['client', 'clientname', 'фио', 'имя клиента'] },
  { key: 'clientPhone', header: 'Телефон', required: true, aliases: ['phone', 'clientphone', 'тел'] },
  { key: 'deviceBrand', header: 'Бренд', aliases: ['brand', 'devicebrand', 'производитель'] },
  { key: 'deviceModel', header: 'Модель', aliases: ['model', 'devicemodel', 'устройство'] },
  { key: 'deviceImei', header: 'IMEI', aliases: ['imei'] },
  { key: 'deviceSerial', header: 'S/N', aliases: ['serial', 'deviceserial', 'серийный номер', 'sn'] },
  { key: 'status', header: 'Статус', aliases: ['status'] },
  { key: 'priority', header: 'Приоритет', aliases: ['priority'] },
  { key: 'description', header: 'Неисправность', aliases: ['description', 'проблема', 'жалоба', 'описание'] },
  { key: 'diagnosis', header: 'Диагностика', aliases: ['diagnosis'] },
  { key: 'estimatedCost', header: 'Ориентир. стоимость', aliases: ['estimatedcost', 'оценка', 'ориентировочная стоимость'] },
  { key: 'finalCost', header: 'Итоговая стоимость', aliases: ['finalcost', 'итого', 'сумма'] },
  { key: 'isPaid', header: 'Оплачен', aliases: ['ispaid', 'оплата', 'paid'] },
  { key: 'technicianName', header: 'Исполнитель', aliases: ['technician', 'technicianname', 'мастер'] },
  { key: 'intakeManagerName', header: 'Принял', aliases: ['intake', 'intakemanagername', 'приемщик'] },
  { key: 'deliveryManagerName', header: 'Выдает', aliases: ['delivery', 'deliverymanagername'] },
  { key: 'createdAt', header: 'Создан', aliases: ['createdat', 'дата создания', 'дата'] },
  { key: 'completedAt', header: 'Завершен', aliases: ['completedat', 'дата завершения'] },
];

const PRIORITY_MAP: Record<string, Order['priority']> = {
  low: 'low',
  низкий: 'low',
  medium: 'medium',
  средний: 'medium',
  high: 'high',
  высокий: 'high',
  urgent: 'urgent',
  срочный: 'urgent',
  срочно: 'urgent',
};

const parseNumber = (value: string, fallback = 0): number => {
  if (!value.trim()) return fallback;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
};

const parseBool = (value: string): boolean => {
  const key = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'да', 'y', 'оплачен', '+'].includes(key);
};

const normalizePriority = (value: string): Order['priority'] => {
  const key = value.trim().toLowerCase();
  return PRIORITY_MAP[key] || 'medium';
};

const splitClientName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Клиент',
    lastName: parts.slice(1).join(' '),
  };
};

export const ordersToExchangeRows = (orders: Order[]): SheetRow[] =>
  orders.map((order) => ({
    orderNumber: cellToString(order.orderNumber),
    clientName: cellToString(order.clientName || ''),
    clientPhone: cellToString(order.clientPhone || ''),
    deviceBrand: cellToString(order.deviceBrand || ''),
    deviceModel: cellToString(order.deviceModel || ''),
    deviceImei: cellToString(order.deviceImei || ''),
    deviceSerial: cellToString(order.deviceSerial || ''),
    status: cellToString(order.status),
    priority: cellToString(order.priority),
    description: cellToString(order.description || ''),
    diagnosis: cellToString(order.diagnosis || ''),
    estimatedCost: cellToString(order.estimatedCost ?? 0),
    finalCost: cellToString(order.finalCost ?? ''),
    isPaid: order.isPaid ? 'да' : 'нет',
    technicianName: cellToString(order.technicianName || ''),
    intakeManagerName: cellToString(order.intakeManagerName || ''),
    deliveryManagerName: cellToString(order.deliveryManagerName || ''),
    createdAt: cellToString(order.createdAt),
    completedAt: cellToString(order.completedAt || ''),
  }));

export const exportOrderRows = (orders: Order[]) =>
  toExportRows(ordersToExchangeRows(orders), ORDER_EXCHANGE_COLUMNS);

export const orderTemplateSamples = (): SheetRow[] => [
  {
    orderNumber: '',
    clientName: 'Иван Петров',
    clientPhone: '79001234567',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 14',
    deviceImei: '',
    deviceSerial: '',
    status: '',
    priority: 'средний',
    description: 'Не включается',
    diagnosis: '',
    estimatedCost: '3500',
    finalCost: '',
    isPaid: 'нет',
    technicianName: '',
    intakeManagerName: '',
    deliveryManagerName: '',
    createdAt: '',
    completedAt: '',
  },
];

export const normalizeOrderImportRows = (rawRows: SheetRow[]): SheetRow[] =>
  mapRowsByColumns(rawRows, ORDER_EXCHANGE_COLUMNS);

export async function importOrderRows(
  rawRows: SheetRow[],
  options: {
    updateExisting: boolean;
    defaultStatus: string;
    intakeManagerName?: string;
  }
): Promise<ImportResult> {
  const rows = normalizeOrderImportRows(rawRows);
  await clientService.refreshFromApi();
  const existingOrders = await orderService.getOrders({ lite: true });
  const byNumber = new Map(
    existingOrders
      .filter((order) => order.orderNumber)
      .map((order) => [order.orderNumber.trim().toLowerCase(), order])
  );

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNo = index + 2;
    const clientName = (row.clientName || '').trim();
    const clientPhone = normalizePhoneForStorage(row.clientPhone || '');
    const description = (row.description || row.diagnosis || '').trim();

    if (!clientName && !clientPhone) {
      result.skipped += 1;
      result.errors.push(`Строка ${rowNo}: укажите клиента или телефон`);
      continue;
    }
    if (!clientPhone) {
      result.skipped += 1;
      result.errors.push(`Строка ${rowNo}: нужен телефон клиента`);
      continue;
    }

    const orderNumber = (row.orderNumber || '').trim();
    const match = orderNumber ? byNumber.get(orderNumber.toLowerCase()) : undefined;

    try {
      if (match && options.updateExisting) {
        const updates: Partial<Order> = {
          clientName: clientName || match.clientName,
          clientPhone,
          deviceBrand: (row.deviceBrand || '').trim() || match.deviceBrand,
          deviceModel: (row.deviceModel || '').trim() || match.deviceModel,
          deviceImei: (row.deviceImei || '').trim() || match.deviceImei,
          deviceSerial: (row.deviceSerial || '').trim() || match.deviceSerial,
          priority: normalizePriority(row.priority || match.priority),
          description: description || match.description,
          diagnosis: (row.diagnosis || '').trim() || match.diagnosis,
          estimatedCost: row.estimatedCost ? parseNumber(row.estimatedCost) : match.estimatedCost,
          technicianName: (row.technicianName || '').trim() || match.technicianName,
          intakeManagerName: (row.intakeManagerName || '').trim() || match.intakeManagerName,
          deliveryManagerName: (row.deliveryManagerName || '').trim() || match.deliveryManagerName,
          isPaid: row.isPaid ? parseBool(row.isPaid) : match.isPaid,
        };
        if (row.status?.trim()) {
          updates.status = row.status.trim();
        }
        if (row.finalCost?.trim()) {
          updates.finalCost = parseNumber(row.finalCost);
        }
        const updated = await orderService.updateOrder(match.id, updates);
        byNumber.set(updated.orderNumber.trim().toLowerCase(), updated);
        result.updated += 1;
        continue;
      }

      if (match && !options.updateExisting) {
        result.skipped += 1;
        continue;
      }

      const names = splitClientName(clientName || 'Клиент');
      const client = await clientService.findOrCreateClientByPhone(clientPhone, {
        firstName: names.firstName,
        lastName: names.lastName,
      });

      const device = await orderService.createDevice({
        type: 'phone',
        brand: (row.deviceBrand || '').trim(),
        model: (row.deviceModel || '').trim() || 'Не указано',
        serialNumber: (row.deviceSerial || '').trim(),
        imei: (row.deviceImei || '').trim(),
        color: '',
        condition: 'good',
        externalCondition: '',
        clientId: client.id,
      });

      const created = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: '',
        technicianName: (row.technicianName || '').trim(),
        intakeManagerName:
          (row.intakeManagerName || '').trim() || options.intakeManagerName || 'Импорт',
        deliveryManagerName: (row.deliveryManagerName || '').trim(),
        status: (row.status || '').trim() || options.defaultStatus,
        priority: normalizePriority(row.priority || ''),
        description: description || 'Импортированный заказ',
        diagnosis: (row.diagnosis || '').trim(),
        estimatedCost: parseNumber(row.estimatedCost || '0'),
        finalCost: row.finalCost?.trim() ? parseNumber(row.finalCost) : undefined,
        estimatedDays: 1,
        parts: [],
        payments: [],
        isPaid: parseBool(row.isPaid || ''),
        clientName: `${client.firstName} ${client.lastName}`.trim(),
        clientPhone,
        deviceBrand: (row.deviceBrand || '').trim(),
        deviceModel: (row.deviceModel || '').trim(),
        deviceImei: (row.deviceImei || '').trim(),
        deviceSerial: (row.deviceSerial || '').trim(),
        ...(orderNumber ? { orderNumber } : {}),
      } as Partial<Order>);

      byNumber.set(created.orderNumber.trim().toLowerCase(), created);
      result.created += 1;
    } catch (error) {
      result.errors.push(
        `Строка ${rowNo}: ${error instanceof Error ? error.message : 'не удалось сохранить'}`
      );
      result.skipped += 1;
    }
  }

  return result;
}
