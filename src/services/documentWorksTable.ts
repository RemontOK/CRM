import { collapseRepeatedToken, replaceEditorTokenBlocks } from './documentEditorBlocks';

export const DOCUMENT_WORKS_TABLE_TOKEN = '{{ТаблицаРабот}}';
const WORKS_EDITOR_TOKEN = 'ТаблицаРабот';

export interface DocumentWorksTableItem {
  name: string;
  warrantyDays?: number;
  cost: number;
  quantity: number;
  totalCost: number;
}

export interface DocumentPartsTableItem {
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value?: number) => String(Number(value || 0)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ');

export const SAMPLE_DOCUMENT_WORKS: DocumentWorksTableItem[] = [
  { name: 'Замена разъема питания', cost: 2500, quantity: 1, totalCost: 2500, warrantyDays: 90 },
  { name: 'Диагностика устройства', cost: 900, quantity: 1, totalCost: 900, warrantyDays: 30 },
];

export const SAMPLE_DOCUMENT_PARTS: DocumentPartsTableItem[] = [
  { name: 'Разъем зарядки', unitPrice: 1500, quantity: 1, totalPrice: 1500 },
];

export const buildDocumentWorksTableHtml = (
  works: DocumentWorksTableItem[],
  parts: DocumentPartsTableItem[],
  warrantyDays = 0,
  total = 0
) => {
  const baseCellStyle = 'border:1px solid #8da0a6; padding:6px 4px; vertical-align:middle; font-size:11px; line-height:1.2;';
  const centerCellStyle = `${baseCellStyle} text-align:center;`;
  const rightCellStyle = `${baseCellStyle} text-align:right;`;
  const headerCellStyle =
    'border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;';

  const rows = [
    ...works.map((work) => ({
      name: work.name,
      warranty: Number(work.warrantyDays ?? warrantyDays) || 0,
      price: work.cost,
      quantity: work.quantity,
      total: work.totalCost,
    })),
    ...parts.map((part) => ({
      name: part.name,
      warranty: warrantyDays,
      price: part.unitPrice,
      quantity: part.quantity,
      total: part.totalPrice,
    })),
  ];

  const bodyRows = rows
    .map(
      (row, index) =>
        `<tr><td style="${centerCellStyle}">${index + 1}</td><td style="${baseCellStyle}">${escapeHtml(row.name)}</td><td style="${centerCellStyle}">${row.warranty}</td><td style="${rightCellStyle}">${formatMoney(
          row.price
        )}</td><td style="${centerCellStyle}">${row.quantity}</td><td style="${rightCellStyle}">${formatMoney(row.total)}</td></tr>`
    )
    .join('');

  return `<table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:28px;">
    <colgroup>
      <col style="width:36px;">
      <col>
      <col style="width:92px;">
      <col style="width:82px;">
      <col style="width:92px;">
      <col style="width:90px;">
    </colgroup>
    <thead>
      <tr>
        <th style="${headerCellStyle}">№</th>
        <th style="${headerCellStyle}">Наименование работы</th>
        <th style="${headerCellStyle}">Гарантия,<br>дн.</th>
        <th style="${headerCellStyle}">Цена, ₽</th>
        <th style="${headerCellStyle}">Количество</th>
        <th style="${headerCellStyle}">Сумма, ₽</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
      <tr>
        <td colspan="5" style="${baseCellStyle} text-align:right; font-weight:700;">Сумма, ₽</td>
        <td style="${rightCellStyle} font-weight:700;">${formatMoney(total)}</td>
      </tr>
    </tbody>
  </table>`;
};

export const buildSampleDocumentWorksTableHtml = () =>
  buildDocumentWorksTableHtml(SAMPLE_DOCUMENT_WORKS, SAMPLE_DOCUMENT_PARTS, 90, 4900);

const buildWorksPreviewBlock = () => {
  const sampleTable = buildSampleDocumentWorksTableHtml();
  return `<div class="mceNonEditable" data-crm-token="${WORKS_EDITOR_TOKEN}" contenteditable="false" style="border:1px dashed #2563eb;background:#f8fbff;padding:8px;border-radius:8px;margin:12px 0;">${sampleTable}</div>`;
};

export const decorateDocumentTemplateForEditor = (html: string): string => {
  const normalized = replaceEditorTokenBlocks(html, WORKS_EDITOR_TOKEN, DOCUMENT_WORKS_TABLE_TOKEN);
  if (!normalized.includes(DOCUMENT_WORKS_TABLE_TOKEN)) {
    return normalized;
  }

  return normalized.replaceAll(DOCUMENT_WORKS_TABLE_TOKEN, buildWorksPreviewBlock());
};

export const normalizeDocumentTemplateFromEditor = (html: string): string =>
  replaceEditorTokenBlocks(html, WORKS_EDITOR_TOKEN, DOCUMENT_WORKS_TABLE_TOKEN);

export const buildWorksTableEditorInsertHtml = () => buildWorksPreviewBlock();

const hasManualWorksTable = (html: string) => /<table[\s\S]*?Наименование работы[\s\S]*?<\/table>/i.test(html);

export const removeDuplicateManualWorksTable = (html: string): string => {
  if (!html.includes(DOCUMENT_WORKS_TABLE_TOKEN) || !hasManualWorksTable(html)) {
    return html;
  }

  let result = html.replace(/<table[\s\S]*?Наименование работы[\s\S]*?<\/table>/gi, (match) => {
    if (match.includes(DOCUMENT_WORKS_TABLE_TOKEN)) {
      return DOCUMENT_WORKS_TABLE_TOKEN;
    }
    return '';
  });

  result = result.replace(/(\s*\{\{ТаблицаРабот\}\}\s*)+/g, `\n${DOCUMENT_WORKS_TABLE_TOKEN}\n`);
  return result.trim();
};
