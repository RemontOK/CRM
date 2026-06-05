export type PeriodPreset = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface PeriodFilterValue {
  preset: PeriodPreset;
  from: string;
  to: string;
}

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const defaultPeriodFilterValue = (preset: PeriodPreset = 'month'): PeriodFilterValue => ({
  preset,
  from: '',
  to: '',
});

export const getPresetLabel = (preset: PeriodPreset) => {
  switch (preset) {
    case 'all':
      return 'За всё время';
    case 'today':
      return 'Сегодня';
    case 'week':
      return '7 дней';
    case 'month':
      return 'Месяц';
    case 'quarter':
      return 'Квартал';
    case 'year':
      return 'Год';
    case 'custom':
      return 'Свой период';
    default:
      return 'Период';
  }
};

export const resolvePeriodRange = (
  filter: PeriodFilterValue,
  nowInput: Date = new Date()
): { from: Date | null; to: Date | null } => {
  const now = new Date(nowInput);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (filter.preset) {
    case 'all':
      return { from: null, to: null };
    case 'today':
      return { from: todayStart, to: todayEnd };
    case 'week': {
      const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      return { from, to: todayEnd };
    }
    case 'month': {
      const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return { from, to: todayEnd };
    }
    case 'quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1));
      return { from, to: todayEnd };
    }
    case 'year': {
      const from = startOfDay(new Date(now.getFullYear(), 0, 1));
      return { from, to: todayEnd };
    }
    case 'custom':
      return {
        from: filter.from ? startOfDay(new Date(filter.from)) : null,
        to: filter.to ? endOfDay(new Date(filter.to)) : null,
      };
    default:
      return { from: null, to: null };
  }
};

export const isDateWithinRange = (
  dateValue: string | Date | null | undefined,
  filter: PeriodFilterValue
) => {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const { from, to } = resolvePeriodRange(filter);

  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
};

export const getResolvedPeriodText = (filter: PeriodFilterValue) => {
  if (filter.preset !== 'custom') {
    return getPresetLabel(filter.preset);
  }

  const hasFrom = Boolean(filter.from);
  const hasTo = Boolean(filter.to);

  if (hasFrom && hasTo) {
    return `${formatDateInput(new Date(filter.from))} — ${formatDateInput(new Date(filter.to))}`;
  }

  if (hasFrom) {
    return `С ${formatDateInput(new Date(filter.from))}`;
  }

  if (hasTo) {
    return `До ${formatDateInput(new Date(filter.to))}`;
  }

  return 'Свой период';
};
