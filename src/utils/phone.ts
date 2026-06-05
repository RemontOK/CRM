export const getPhoneDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const normalizeRussianPhoneDigits = (value?: string | null) => {
  const original = String(value || '').trim();
  const digits = getPhoneDigits(original);

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `7${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }

  return '';
};

export const formatPhone = (value?: string | null) => {
  const normalized = normalizeRussianPhoneDigits(value);

  if (/^\d{11}$/.test(normalized) && normalized.startsWith('7')) {
    return `+7 ${normalized.slice(1, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7, 9)} ${normalized.slice(9, 11)}`;
  }

  return String(value || '').trim();
};

export const normalizePhoneForStorage = (value?: string | null) => {
  const formatted = formatPhone(value);
  return formatted || String(value || '').trim();
};

export const normalizePhoneForCompare = (value?: string | null) => {
  return normalizeRussianPhoneDigits(value) || getPhoneDigits(value);
};
