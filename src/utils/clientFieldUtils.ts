import { buildClientNotesWithType, extractClientTypeFromNotes } from '../components/ClientTypeSelector/ClientTypeSelector';
import { AppSettings, Client } from '../types';

const COLUMN_FIELDS = new Set(['email']);

export const buildClientFieldToken = (code: string) => `{{Клиент_${code}}}`;

export const getEnabledClientFields = (settings: AppSettings, clientType?: string) =>
  settings.forms.clientFields
    .filter((field) => field.enabled)
    .filter((field) => {
      if (!field.clientTypes?.length) {
        return true;
      }
      if (!clientType) {
        return false;
      }
      return field.clientTypes.includes(clientType);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

export const validateClientFieldsForOrder = (
  settings: AppSettings,
  clientType: string,
  fieldValues: Record<string, string>
): string | null => {
  for (const field of getEnabledClientFields(settings, clientType)) {
    if (field.required && !(fieldValues[field.code] ?? '').trim()) {
      return `Укажите «${field.label}»`;
    }
  }

  return null;
};

export const isClientOrderStepComplete = (
  settings: AppSettings,
  clientType: string,
  clientName: string,
  clientPhone: string,
  fieldValues: Record<string, string>
): boolean => {
  if (!clientName.trim() || !clientPhone.trim()) {
    return false;
  }

  return validateClientFieldsForOrder(settings, clientType, fieldValues) === null;
};

export const collectClientFieldValues = (
  settings: AppSettings,
  source: Record<string, unknown>
): Record<string, string> => {
  const values: Record<string, string> = {};

  for (const field of settings.forms.clientFields.filter((item) => item.enabled)) {
    const raw = source[field.code];
    values[field.code] = raw !== undefined && raw !== null ? String(raw).trim() : '';
  }

  return values;
};

export const isClientColumnField = (code: string) => COLUMN_FIELDS.has(code);

export const extractClientCommentFromNotes = (notes?: string): string => {
  if (!notes) {
    return '';
  }

  return notes
    .split('\n')
    .filter((line) => !line.trim().startsWith('Тип клиента:'))
    .join('\n')
    .trim();
};

export const getClientFieldValue = (client: Client | null | undefined, code: string): string => {
  if (!client) {
    return '';
  }

  if (code === 'email') {
    return client.email || '';
  }

  const customValue = client.customFields?.[code];
  if (customValue !== undefined && customValue !== '') {
    return customValue;
  }

  if (code === 'clientComment') {
    return extractClientCommentFromNotes(client.notes);
  }

  return '';
};

export const buildClientFieldValuesFromClient = (client: Client, settings: AppSettings): Record<string, string> => {
  const values: Record<string, string> = {};

  for (const field of getEnabledClientFields(settings)) {
    values[field.code] = getClientFieldValue(client, field.code);
  }

  return values;
};

export interface OrderClientDraft {
  clientName: string;
  clientPhone: string;
  clientType: string;
  clientFieldValues: Record<string, string>;
  clientAddress: string;
}

export const buildOrderClientDraftFromClient = (client: Client, settings: AppSettings): OrderClientDraft => ({
  clientName: `${client.firstName} ${client.lastName}`.trim(),
  clientPhone: client.phone,
  clientType: extractClientTypeFromNotes(settings, client.notes),
  clientFieldValues: buildClientFieldValuesFromClient(client, settings),
  clientAddress: client.address || '',
});

export interface BuildClientPayloadInput {
  settings: AppSettings;
  clientType?: string;
  fieldValues: Record<string, string>;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  existingClient?: Client | null;
}

export const buildClientPayloadFromFields = (input: BuildClientPayloadInput): Partial<Client> => {
  const { settings, clientType, fieldValues, firstName, lastName, phone, address, existingClient } = input;
  const customFields: Record<string, string> = { ...(existingClient?.customFields || {}) };

  for (const field of settings.forms.clientFields) {
    const value = (fieldValues[field.code] ?? '').trim();

    if (isClientColumnField(field.code)) {
      continue;
    }

    if (value) {
      customFields[field.code] = value;
    } else {
      delete customFields[field.code];
    }
  }

  const notes = clientType
    ? buildClientNotesWithType(settings, clientType, '')
    : existingClient?.notes || '';

  return {
    firstName,
    lastName,
    phone,
    email: (fieldValues.email ?? '').trim() || existingClient?.email || '',
    address: address ?? existingClient?.address ?? '',
    notes,
    customFields,
  };
};

export const buildClientDocumentTokenValues = (
  client: Client | null | undefined,
  settings: AppSettings,
  formatValue: (value: string) => string = (value) => value
): Record<string, string> => {
  const tokens: Record<string, string> = {};

  for (const field of getEnabledClientFields(settings)) {
    tokens[buildClientFieldToken(field.code)] = formatValue(getClientFieldValue(client, field.code));
  }

  return tokens;
};

export const buildClientFieldPreviewValues = (settings: AppSettings): Record<string, string> => {
  const samples: Record<string, string> = {
    email: 'client@example.com',
    howDidYouKnow: 'Рекомендация',
    clientComment: 'Предпочитает звонок вечером',
    discount: '10%',
    birthday: '15.03.1990',
    inn: '7707083893',
    bankAccount: '40702810100000000001',
  };

  const values: Record<string, string> = {};
  for (const field of getEnabledClientFields(settings)) {
    values[buildClientFieldToken(field.code)] = samples[field.code] || `Пример: ${field.label}`;
  }
  return values;
};

export const buildDocumentVariableGroups = (settings: AppSettings) => {
  const clientFieldVariables = getEnabledClientFields(settings).map((field) => ({
    token: buildClientFieldToken(field.code),
    label: field.label,
  }));

  return [
    {
      title: 'Компания',
      variables: [
        { token: '{{НазваниеКомпании}}', label: 'Название компании' },
        { token: '{{ТелефонКомпании}}', label: 'Телефон компании' },
        { token: '{{EmailКомпании}}', label: 'Email компании' },
        { token: '{{АдресКомпании}}', label: 'Адрес компании' },
        { token: '{{ЧасыРаботы}}', label: 'Часы работы' },
      ],
    },
    {
      title: 'Заказ',
      variables: [
        { token: '{{НазваниеДокумента}}', label: 'Название документа' },
        { token: '{{НомерЗаказа}}', label: 'Номер заказа' },
        { token: '{{СтатусЗаказа}}', label: 'Статус заказа' },
        { token: '{{Приоритет}}', label: 'Приоритет' },
        { token: '{{ОриентировочнаяСтоимость}}', label: 'Ориентировочная стоимость' },
        { token: '{{ИтоговаяСтоимость}}', label: 'Итоговая стоимость' },
        { token: '{{Аванс}}', label: 'Аванс' },
        { token: '{{Скидка}}', label: 'Скидка' },
        { token: '{{СпособОплаты}}', label: 'Способ оплаты' },
        { token: '{{Долг}}', label: 'Долг' },
      ],
    },
    {
      title: 'Клиент',
      variables: [
        { token: '{{ТаблицаДанныхКлиента}}', label: 'Таблица данных клиента (блок HTML)' },
        { token: '{{ФИОКлиента}}', label: 'ФИО клиента' },
        { token: '{{ТелефонКлиента}}', label: 'Телефон клиента' },
        { token: '{{EmailКлиента}}', label: 'Email клиента' },
        { token: '{{АдресКлиента}}', label: 'Адрес клиента' },
        { token: '{{Заметки}}', label: 'Заметки приёмки' },
        ...clientFieldVariables,
      ],
    },
    {
      title: 'Устройство',
      variables: [
        { token: '{{Устройство}}', label: 'Устройство (бренд + модель)' },
        { token: '{{БрендУстройства}}', label: 'Бренд устройства' },
        { token: '{{МодельУстройства}}', label: 'Модель устройства' },
        { token: '{{Цвет}}', label: 'Цвет' },
        { token: '{{СерийныйНомер}}', label: 'Серийный номер (S/N)' },
        { token: '{{IMEI}}', label: 'IMEI' },
        { token: '{{Пароль}}', label: 'Пароль от устройства' },
        { token: '{{Комплектация}}', label: 'Комплектация' },
        { token: '{{ВнешнийВид}}', label: 'Внешний вид' },
        { token: '{{ОписаниеПроблемы}}', label: 'Описание проблемы' },
      ],
    },
    {
      title: 'Ремонт',
      variables: [
        { token: '{{Диагностика}}', label: 'Диагностика' },
        { token: '{{Работы}}', label: 'Список работ (текст)' },
        { token: '{{ТаблицаРабот}}', label: 'Таблица работ (блок HTML)' },
        { token: '{{Запчасти}}', label: 'Использованные запчасти' },
        { token: '{{Рекомендации}}', label: 'Рекомендации' },
      ],
    },
    {
      title: 'Сотрудники',
      variables: [
        { token: '{{Мастер}}', label: 'Мастер / исполнитель' },
        { token: '{{МенеджерПриёма}}', label: 'Менеджер приёма' },
        { token: '{{МенеджерВыдачи}}', label: 'Менеджер выдачи' },
      ],
    },
    {
      title: 'Даты',
      variables: [
        { token: '{{Дата}}', label: 'Дата' },
        { token: '{{ДатаСоздания}}', label: 'Дата создания' },
        { token: '{{ДатаЗавершения}}', label: 'Дата завершения' },
        { token: '{{ДатаПриёма}}', label: 'Дата приёма' },
      ],
    },
    {
      title: 'Документ',
      variables: [
        { token: '{{ТекстГарантии}}', label: 'Текст гарантии' },
        { token: '{{ТекстВПодвале}}', label: 'Текст в подвале' },
      ],
    },
  ];
};
