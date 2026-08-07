/** Добавляет вариант в строку через запятую, без дублей. */
export const appendCommaSeparated = (current: string, option: string): string => {
  const next = option.trim();
  if (!next) {
    return current;
  }

  const parts = current
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const exists = parts.some((part) => part.toLowerCase() === next.toLowerCase());
  if (exists) {
    return parts.join(', ');
  }

  return parts.length ? `${parts.join(', ')}, ${next}` : next;
};
