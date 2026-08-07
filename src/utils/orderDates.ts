export const calcEstimatedCompletionDate = (startDate: string | Date, estimatedDays?: number): Date => {
  const base = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
  const days = Math.max(1, Number(estimatedDays) || 1);

  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    return fallback;
  }

  base.setDate(base.getDate() + days);
  return base;
};
