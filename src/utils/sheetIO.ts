import * as XLSX from 'xlsx';

export type SheetRow = Record<string, string>;

const normalizeHeader = (value: unknown): string =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const cellToString = (value: unknown): string => {
  if (value == null) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const rowsToWorksheet = (rows: Record<string, unknown>[], sheetName = 'Данные') => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return workbook;
};

export const downloadXlsx = (rows: Record<string, unknown>[], filename: string, sheetName = 'Данные') => {
  const workbook = rowsToWorksheet(rows, sheetName);
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  );
};

export const downloadCsv = (rows: Record<string, unknown>[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  const withBom = `\uFEFF${csv}`;
  downloadBlob(new Blob([withBom], { type: 'text/csv;charset=utf-8' }), filename.endsWith('.csv') ? filename : `${filename}.csv`);
};

export const rowsToTsv = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => cellToString(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  const lines = [headers.join('\t'), ...rows.map((row) => headers.map((key) => escape(row[key])).join('\t'))];
  return lines.join('\n');
};

const sheetToRows = (worksheet: XLSX.WorkSheet): SheetRow[] => {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  if (!matrix.length) return [];

  const headerCells = (matrix[0] || []).map((cell) => cellToString(cell));
  const headerIndexes = headerCells
    .map((header, index) => ({ header, index }))
    .filter((item) => item.header);

  if (!headerIndexes.length) return [];

  return matrix.slice(1).reduce<SheetRow[]>((acc, cells) => {
    const row: SheetRow = {};
    let hasValue = false;
    headerIndexes.forEach(({ header, index }) => {
      const value = cellToString(cells?.[index]);
      row[header] = value;
      if (value) hasValue = true;
    });
    if (hasValue) acc.push(row);
    return acc;
  }, []);
};

export const parseWorkbookArrayBuffer = (buffer: ArrayBuffer): SheetRow[] => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  return sheetToRows(workbook.Sheets[firstSheetName]);
};

export const parseWorkbookFile = async (file: File): Promise<SheetRow[]> => {
  const buffer = await file.arrayBuffer();
  return parseWorkbookArrayBuffer(buffer);
};

export const parseDelimitedText = (text: string): SheetRow[] => {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const workbook = XLSX.read(cleaned, { type: 'string', raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  return sheetToRows(workbook.Sheets[firstSheetName]);
};

export type ColumnDef = {
  key: string;
  header: string;
  required?: boolean;
  aliases?: string[];
};

export const mapRowsByColumns = (rawRows: SheetRow[], columns: ColumnDef[]): SheetRow[] => {
  const aliasToKey = new Map<string, string>();
  columns.forEach((column) => {
    const aliases = [column.header, column.key, ...(column.aliases || [])];
    aliases.forEach((alias) => {
      aliasToKey.set(normalizeHeader(alias), column.key);
    });
  });

  return rawRows.map((raw) => {
    const mapped: SheetRow = {};
    Object.entries(raw).forEach(([header, value]) => {
      const key = aliasToKey.get(normalizeHeader(header));
      if (key) {
        mapped[key] = value;
      }
    });
    return mapped;
  });
};

export const emptyTemplateRows = (columns: ColumnDef[], samples: SheetRow[] = []): Record<string, string>[] => {
  if (samples.length) {
    return samples.map((sample) => {
      const row: Record<string, string> = {};
      columns.forEach((column) => {
        row[column.header] = sample[column.key] ?? '';
      });
      return row;
    });
  }

  const row: Record<string, string> = {};
  columns.forEach((column) => {
    row[column.header] = '';
  });
  return [row];
};

export const toExportRows = (rows: SheetRow[], columns: ColumnDef[]): Record<string, string>[] =>
  rows.map((item) => {
    const row: Record<string, string> = {};
    columns.forEach((column) => {
      row[column.header] = item[column.key] ?? '';
    });
    return row;
  });
