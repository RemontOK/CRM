import { collapseRepeatedToken, unwrapEditorTokenBlocks } from './documentEditorBlocks';

export const DOCUMENT_CLIENT_DATA_TABLE_TOKEN = '{{ТаблицаДанныхКлиента}}';
const CLIENT_DATA_EDITOR_TOKEN = 'ТаблицаДанныхКлиента';

export type DocumentClientDataTableVariant = 'acceptance' | 'completion';

export interface DocumentClientDataTableInput {
  clientName: string;
  clientPhone: string;
  notes?: string;
  completeness?: string;
  device: string;
  password?: string;
  color?: string;
  imei?: string;
  serialNumber?: string;
  appearance?: string;
  estimatedCost?: string;
  advance?: string;
  completionDate?: string;
  problemDescription?: string;
  warrantyText?: string;
  variant?: DocumentClientDataTableVariant;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const cellBlock = (label: string, value: string, withTopGap = false) =>
  `<p style="margin:${withTopGap ? '8px 0 0' : '0'};"><strong>${label}</strong><br>${escapeHtml(value || '')}</p>`;

const tokenCellBlock = (label: string, token: string, withTopGap = false) =>
  `<p style="margin:${withTopGap ? '8px 0 0' : '0'};"><strong>${label}</strong><br>${token}</p>`;

export const buildDocumentClientDataTableHtml = ({
  clientName,
  clientPhone,
  notes = '',
  completeness = '',
  device,
  password = '',
  color = '',
  imei = '',
  serialNumber = '',
  appearance = '',
  estimatedCost = '',
  advance = '',
  completionDate = '',
  problemDescription = '',
  warrantyText = '',
  variant = 'acceptance',
}: DocumentClientDataTableInput) => {
  const thStyle = 'border:1px solid #8da0a6; padding:10px; font-size:14px;';
  const tdStyle = 'border:1px solid #8da0a6; padding:8px; vertical-align:top;';

  const clientCells =
    variant === 'acceptance'
      ? [
          cellBlock('ФИО клиента:', clientName),
          cellBlock('Номер телефона клиента:', clientPhone, true),
          cellBlock('Комплектация:', completeness, true),
          cellBlock('Заметки:', notes, true),
        ]
      : [
          cellBlock('ФИО клиента:', clientName),
          cellBlock('Номер телефона клиента:', clientPhone, true),
          cellBlock('Комплектация:', completeness, true),
        ];

  const deviceCells = [
    cellBlock('Устройство:', device),
    cellBlock('пароль:', password, true),
    cellBlock('Цвет:', color, true),
    cellBlock('IMEI:', imei, true),
    cellBlock('S/N:', serialNumber, true),
    cellBlock('Внешний вид устройства:', appearance, true),
  ];

  const repairCells =
    variant === 'acceptance'
      ? [
          cellBlock('Ориентировочная стоимость:', estimatedCost),
          cellBlock('Аванс:', advance, true),
          cellBlock('Ориентировочный срок ремонта:', completionDate, true),
          cellBlock('Заявленные неисправности:', problemDescription, true),
        ]
      : [
          cellBlock('Аванс:', advance),
          cellBlock('Заявленные неисправности:', problemDescription, true),
        ];

  const warrantyRow =
    variant === 'completion' && warrantyText
      ? `<tr>
      <td colspan="3" style="${tdStyle} font-size:12px;">
        <strong>Условия гарантии:</strong><br>${escapeHtml(warrantyText)}
      </td>
    </tr>`
      : '';

  return `<table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:${variant === 'acceptance' ? '18' : '16'}px;">
    <tr>
      <th style="${thStyle}">Клиент</th>
      <th style="${thStyle}">Устройство</th>
      <th style="${thStyle}">Ремонт</th>
    </tr>
    <tr>
      <td style="${tdStyle}">${clientCells.join('')}</td>
      <td style="${tdStyle}">${deviceCells.join('')}</td>
      <td style="${tdStyle}">${repairCells.join('')}</td>
    </tr>
    ${warrantyRow}
  </table>`;
};

/** Редактируемая таблица с переменными CRM — подставляются при печати акта. */
export const buildClientDataTableEditableHtml = (variant: DocumentClientDataTableVariant = 'acceptance') => {
  const thStyle = 'border:1px solid #8da0a6; padding:10px; font-size:14px;';
  const tdStyle = 'border:1px solid #8da0a6; padding:8px; vertical-align:top;';

  const clientCells =
    variant === 'acceptance'
      ? [
          tokenCellBlock('ФИО клиента:', '{{ФИОКлиента}}'),
          tokenCellBlock('Номер телефона клиента:', '{{ТелефонКлиента}}', true),
          tokenCellBlock('Комплектация:', '{{Комплектация}}', true),
          tokenCellBlock('Заметки:', '{{Заметки}}', true),
        ]
      : [
          tokenCellBlock('ФИО клиента:', '{{ФИОКлиента}}'),
          tokenCellBlock('Номер телефона клиента:', '{{ТелефонКлиента}}', true),
          tokenCellBlock('Комплектация:', '{{Комплектация}}', true),
        ];

  const deviceCells = [
    tokenCellBlock('Устройство:', '{{Устройство}}'),
    tokenCellBlock('пароль:', '{{Пароль}}', true),
    tokenCellBlock('Цвет:', '{{Цвет}}', true),
    tokenCellBlock('IMEI:', '{{IMEI}}', true),
    tokenCellBlock('S/N:', '{{СерийныйНомер}}', true),
    tokenCellBlock('Внешний вид устройства:', '{{ВнешнийВид}}', true),
  ];

  const repairCells =
    variant === 'acceptance'
      ? [
          tokenCellBlock('Ориентировочная стоимость:', '{{ОриентировочнаяСтоимость}}'),
          tokenCellBlock('Аванс:', '{{Аванс}}', true),
          tokenCellBlock('Ориентировочный срок ремонта:', '{{ОриентировочныйСрокРемонта}}', true),
          tokenCellBlock('Заявленные неисправности:', '{{ОписаниеПроблемы}}', true),
        ]
      : [
          tokenCellBlock('Аванс:', '{{Аванс}}'),
          tokenCellBlock('Заявленные неисправности:', '{{ОписаниеПроблемы}}', true),
        ];

  const warrantyRow =
    variant === 'completion'
      ? `<tr>
      <td colspan="3" style="${tdStyle} font-size:12px;">
        <strong>Условия гарантии:</strong><br>{{ТекстГарантии}}
      </td>
    </tr>`
      : '';

  return `<table data-crm-client-table="${variant}" style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:${variant === 'acceptance' ? '18' : '16'}px;">
    <tr>
      <th style="${thStyle}">Клиент</th>
      <th style="${thStyle}">Устройство</th>
      <th style="${thStyle}">Ремонт</th>
    </tr>
    <tr>
      <td style="${tdStyle}">${clientCells.join('')}</td>
      <td style="${tdStyle}">${deviceCells.join('')}</td>
      <td style="${tdStyle}">${repairCells.join('')}</td>
    </tr>
    ${warrantyRow}
  </table>`;
};

export const expandClientDataTableToken = (
  html: string,
  variant: DocumentClientDataTableVariant = 'acceptance'
): string => {
  if (!html.includes(DOCUMENT_CLIENT_DATA_TABLE_TOKEN)) {
    return html;
  }

  return html.replaceAll(DOCUMENT_CLIENT_DATA_TABLE_TOKEN, buildClientDataTableEditableHtml(variant));
};

export const buildSampleDocumentClientDataTableHtml = (variant: DocumentClientDataTableVariant = 'acceptance') =>
  buildDocumentClientDataTableHtml({
    variant,
    clientName: 'Иван Петров',
    clientPhone: '+7 999 123-45-67',
    notes: 'Клиент просил позвонить перед ремонтом',
    completeness: 'Кабель, коробка',
    device: 'Apple iPhone 15 Pro Max',
    password: '1234',
    color: 'Черный',
    imei: '123456789012345',
    serialNumber: 'SN-123456',
    appearance: 'Следы эксплуатации',
    estimatedCost: '2 500 ₽',
    advance: '1 000 ₽',
    completionDate: new Date().toLocaleDateString('ru-RU'),
    problemDescription: 'Не заряжается, требуется проверка разъема',
    warrantyText:
      variant === 'completion'
        ? 'Клиент согласен с тем, что использование устройства без защитного аксессуара лишает гарантии на экран и иные чувствительные элементы.'
        : '',
  });

export const hasLegacyInlineClientDataTable = (html: string) =>
  /<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/i.test(
    html
  );

export const isPersistedClientDataTableTemplate = (html: string): boolean =>
  html.includes('data-crm-client-table=') ||
  (html.includes('{{ФИОКлиента}}') && hasLegacyInlineClientDataTable(html));

const countPhoneLabelOccurrences = (html: string) => (html.match(/Номер телефона клиента\s*:/gi) || []).length;

const ORPHAN_CLIENT_DATA_FRAGMENT =
  /(?:<div[^>]*>\s*)*(?:<p[^>]*>\s*)*(?:<strong>\s*)?Номер телефона клиента\s*:[\s\S]*?(?=(?:<strong>\s*)?Номер телефона клиента\s*:|$)/gi;

export const repairClientDataTableTemplate = (
  html: string,
  variant: DocumentClientDataTableVariant = 'acceptance'
): string => {
  if (isPersistedClientDataTableTemplate(html)) {
    let result = unwrapEditorTokenBlocks(html, CLIENT_DATA_EDITOR_TOKEN);
    if (countPhoneLabelOccurrences(result) > 1) {
      result = result.replace(ORPHAN_CLIENT_DATA_FRAGMENT, '');
    }
    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  let result = unwrapEditorTokenBlocks(html, CLIENT_DATA_EDITOR_TOKEN);
  result = expandClientDataTableToken(result, variant);
  result = collapseRepeatedToken(result, DOCUMENT_CLIENT_DATA_TABLE_TOKEN);

  if (countPhoneLabelOccurrences(result) > 1 && !result.includes('{{ФИОКлиента}}')) {
    result = result.replace(ORPHAN_CLIENT_DATA_FRAGMENT, '');
  }

  if (result.includes('{{ФИОКлиента}}') && hasLegacyInlineClientDataTable(result)) {
    result = result.replace(
      /<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/gi,
      (match) => (match.includes('{{') ? match : '')
    );
  }

  if (!result.includes(DOCUMENT_CLIENT_DATA_TABLE_TOKEN) && hasLegacyInlineClientDataTable(result)) {
    const hasTokens = result.includes('{{ФИОКлиента}}') || result.includes('{{ТелефонКлиента}}');
    if (!hasTokens) {
      result = migrateInlineClientDataTableTemplate(result);
      result = expandClientDataTableToken(result, variant);
    }
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
};

export const decorateClientDataTableForEditor = (html: string, variant: DocumentClientDataTableVariant = 'acceptance') => {
  let result = unwrapEditorTokenBlocks(html, CLIENT_DATA_EDITOR_TOKEN);
  result = expandClientDataTableToken(result, variant);
  return result;
};

export const normalizeClientDataTableFromEditor = (html: string, variant: DocumentClientDataTableVariant = 'acceptance') => {
  let result = unwrapEditorTokenBlocks(html, CLIENT_DATA_EDITOR_TOKEN);
  result = expandClientDataTableToken(result, variant);
  return result;
};

export const buildClientDataTableEditorInsertHtml = (variant: DocumentClientDataTableVariant = 'acceptance') =>
  buildClientDataTableEditableHtml(variant);

export const migrateInlineClientDataTableTemplate = (html: string): string => {
  if (
    html.includes(DOCUMENT_CLIENT_DATA_TABLE_TOKEN) ||
    !hasLegacyInlineClientDataTable(html) ||
    isPersistedClientDataTableTemplate(html)
  ) {
    return html;
  }

  return html.replace(
    /<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/i,
    DOCUMENT_CLIENT_DATA_TABLE_TOKEN
  );
};
