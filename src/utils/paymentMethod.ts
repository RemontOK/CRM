const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  installment: 'Рассрочка',
  online: 'Онлайн перевод',
  bank_terminal: 'Терминал',
  cashbox: 'Касса',
  mixed: 'Смешанный',
  касса: 'Касса',
};

export type PaymentMethodOptionLike = {
  code: string;
  label: string;
};

export const getPaymentMethodLabel = (
  method?: string | null,
  options?: PaymentMethodOptionLike[]
): string => {
  const code = String(method || '').trim();
  if (!code) {
    return 'Не указан';
  }

  const fromOptions = options?.find((item) => item.code === code || item.code === code.toLowerCase())?.label;
  if (fromOptions?.trim()) {
    return fromOptions.trim();
  }

  return PAYMENT_METHOD_LABELS[code.toLowerCase()] || code;
};
