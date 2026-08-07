export const SUBSCRIPTION_MONTH_OPTIONS = [1, 3, 6, 12] as const;

export type SubscriptionMonths = (typeof SUBSCRIPTION_MONTH_OPTIONS)[number];

export const DEFAULT_MONTHLY_PRICE = 2290;

export const MULTI_MONTH_DISCOUNT_RATE = 0.1;

export const calculateSubscriptionPrice = (months: number, monthlyPrice = DEFAULT_MONTHLY_PRICE) => {
  const normalizedMonths = Math.max(1, Math.round(months));
  if (normalizedMonths <= 1) {
    return monthlyPrice;
  }

  const discountedMonth = monthlyPrice * (1 - MULTI_MONTH_DISCOUNT_RATE);
  return Math.round(monthlyPrice + (normalizedMonths - 1) * discountedMonth);
};

export const calculateSubscriptionSavings = (months: number, monthlyPrice = DEFAULT_MONTHLY_PRICE) => {
  const fullPrice = monthlyPrice * months;
  return Math.max(0, fullPrice - calculateSubscriptionPrice(months, monthlyPrice));
};

export const getSubscriptionPlanLabel = (months: number) => {
  if (months === 1) {
    return '1 месяц';
  }
  if (months >= 2 && months <= 4) {
    return `${months} месяца`;
  }
  return `${months} месяцев`;
};

export const buildSubscriptionPlans = (monthlyPrice = DEFAULT_MONTHLY_PRICE) =>
  SUBSCRIPTION_MONTH_OPTIONS.map((months) => {
    const amount = calculateSubscriptionPrice(months, monthlyPrice);
    const savings = calculateSubscriptionSavings(months, monthlyPrice);
    return {
      months,
      amount,
      label: getSubscriptionPlanLabel(months),
      monthlyEquivalent: Math.round(amount / months),
      savings,
      discountPercent: months > 1 ? Math.round(MULTI_MONTH_DISCOUNT_RATE * 100) : 0,
    };
  });

export type SubscriptionPlanOption = ReturnType<typeof buildSubscriptionPlans>[number];
