export const CURRENCY_OPTIONS = [
  { code: 'RUB', label: 'Рубль (₽)' },
  { code: 'USD', label: 'Доллар ($)' },
  { code: 'EUR', label: 'Евро (€)' },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code'];
