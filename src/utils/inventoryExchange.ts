import { Part } from '../types';
import { inventoryService } from '../services/inventoryService';
import {
  ColumnDef,
  SheetRow,
  cellToString,
  mapRowsByColumns,
  toExportRows,
} from './sheetIO';

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export const INVENTORY_EXCHANGE_COLUMNS: ColumnDef[] = [
  { key: 'partNumber', header: 'Артикул', aliases: ['partnumber', 'sku', 'код', 'код товара'] },
  { key: 'name', header: 'Название', required: true, aliases: ['name', 'товар', 'запчасть', 'наименование'] },
  { key: 'partType', header: 'Тип', aliases: ['parttype', 'type', 'вид'] },
  { key: 'category', header: 'Категория', aliases: ['category', 'группа'] },
  { key: 'subcategory', header: 'Подкатегория', aliases: ['subcategory'] },
  { key: 'brand', header: 'Бренд', aliases: ['brand', 'производитель', 'марка'] },
  { key: 'model', header: 'Модель', aliases: ['model'] },
  { key: 'description', header: 'Описание', aliases: ['description', 'комментарий'] },
  { key: 'quantity', header: 'Количество', aliases: ['quantity', 'qty', 'остаток', 'кол-во', 'колво'] },
  { key: 'minQuantity', header: 'Мин. остаток', aliases: ['minquantity', 'мин остаток', 'минимум'] },
  { key: 'unitPrice', header: 'Цена', aliases: ['unitprice', 'price', 'розница', 'цена продажи'] },
  { key: 'wholesalePrice', header: 'Опт. цена', aliases: ['wholesaleprice', 'опт', 'закуп', 'себестоимость'] },
  { key: 'supplier', header: 'Поставщик', aliases: ['supplier'] },
  { key: 'location', header: 'Ячейка', aliases: ['location', 'место', 'локация', 'склад'] },
];

const PART_TYPE_MAP: Record<string, Part['partType']> = {
  spare_part: 'spare_part',
  'spare-part': 'spare_part',
  запчасть: 'spare_part',
  запчасти: 'spare_part',
  accessory: 'accessory',
  аксессуар: 'accessory',
  аксессуары: 'accessory',
  product: 'product',
  товар: 'product',
  товары: 'product',
};

const parseNumber = (value: string, fallback = 0): number => {
  if (!value.trim()) return fallback;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
};

const normalizePartType = (value: string): NonNullable<Part['partType']> => {
  const key = value.trim().toLowerCase();
  return PART_TYPE_MAP[key] || 'spare_part';
};

const partKey = (part: Pick<Part, 'partNumber' | 'name' | 'brand' | 'model'>) => {
  const sku = part.partNumber.trim().toLowerCase();
  if (sku) return `sku:${sku}`;
  return `name:${part.name.trim().toLowerCase()}|${part.brand.trim().toLowerCase()}|${part.model.trim().toLowerCase()}`;
};

export const partsToExchangeRows = (parts: Part[]): SheetRow[] =>
  parts.map((part) => ({
    partNumber: cellToString(part.partNumber),
    name: cellToString(part.name),
    partType: cellToString(part.partType || 'spare_part'),
    category: cellToString(part.category),
    subcategory: cellToString(part.subcategory || ''),
    brand: cellToString(part.brand),
    model: cellToString(part.model),
    description: cellToString(part.description || ''),
    quantity: cellToString(part.quantity),
    minQuantity: cellToString(part.minQuantity),
    unitPrice: cellToString(part.unitPrice),
    wholesalePrice: cellToString(part.wholesalePrice ?? part.unitPrice),
    supplier: cellToString(part.supplier),
    location: cellToString(part.location),
  }));

export const exportInventoryRows = (parts: Part[]) =>
  toExportRows(partsToExchangeRows(parts), INVENTORY_EXCHANGE_COLUMNS);

export const inventoryTemplateSamples = (): SheetRow[] => [
  {
    partNumber: 'SCR-IP14-OLED',
    name: 'Дисплей iPhone 14 OLED',
    partType: 'запчасть',
    category: 'Дисплеи',
    subcategory: 'iPhone',
    brand: 'Apple',
    model: 'iPhone 14',
    description: 'Оригинал',
    quantity: '5',
    minQuantity: '2',
    unitPrice: '8900',
    wholesalePrice: '7200',
    supplier: 'ОптСнаб',
    location: 'A-01',
  },
];

export const normalizeInventoryImportRows = (rawRows: SheetRow[]): SheetRow[] =>
  mapRowsByColumns(rawRows, INVENTORY_EXCHANGE_COLUMNS);

export async function importInventoryRows(
  rawRows: SheetRow[],
  options: { updateExisting: boolean }
): Promise<ImportResult> {
  const rows = normalizeInventoryImportRows(rawRows);
  const existing = inventoryService.getParts();
  const byKey = new Map(existing.map((part) => [partKey(part), part]));

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNo = index + 2;
    const name = (row.name || '').trim();
    if (!name) {
      result.skipped += 1;
      result.errors.push(`Строка ${rowNo}: не указано название`);
      continue;
    }

    const payload = {
      name,
      partNumber: (row.partNumber || '').trim(),
      partType: normalizePartType(row.partType || ''),
      category: (row.category || '').trim() || 'Без категории',
      subcategory: (row.subcategory || '').trim(),
      brand: (row.brand || '').trim(),
      model: (row.model || '').trim(),
      description: (row.description || '').trim(),
      quantity: Math.max(0, parseNumber(row.quantity || '0')),
      minQuantity: Math.max(0, parseNumber(row.minQuantity || '0')),
      unitPrice: Math.max(0, parseNumber(row.unitPrice || '0')),
      wholesalePrice: Math.max(0, parseNumber(row.wholesalePrice || row.unitPrice || '0')),
      supplier: (row.supplier || '').trim(),
      location: (row.location || '').trim(),
      alertThreshold: Math.max(0, parseNumber(row.minQuantity || '0')),
      notificationsEnabled: false,
      warehouseId: '',
    };

    const key = partKey(payload);
    const match = byKey.get(key);

    try {
      if (match && options.updateExisting) {
        const updated = await inventoryService.updatePart(match.id, payload);
        byKey.set(partKey(updated), updated);
        result.updated += 1;
      } else if (match && !options.updateExisting) {
        result.skipped += 1;
      } else {
        const created = await inventoryService.addPart(payload);
        byKey.set(partKey(created), created);
        result.created += 1;
      }
    } catch (error) {
      result.errors.push(
        `Строка ${rowNo}: ${error instanceof Error ? error.message : 'не удалось сохранить'}`
      );
      result.skipped += 1;
    }
  }

  return result;
}
