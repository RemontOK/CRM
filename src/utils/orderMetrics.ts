import { Order, OrderPart } from '../types';

type OrderPartWithMeta = OrderPart & {
  partInfo?: {
    partCost?: number;
    workCost?: number;
  };
  workType?: string;
};

export const getOrderItemsTotal = (order: Order) =>
  (order.parts || []).reduce((sum, part) => sum + Number(part.totalPrice || 0), 0);

export const getOrderTotal = (order: Order) => {
  const itemsTotal = getOrderItemsTotal(order);
  if (itemsTotal > 0) {
    return itemsTotal;
  }

  return Number(order.finalCost || order.estimatedCost || 0);
};

export const getOrderPaidAmount = (order: Order) =>
  (order.payments || [])
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

export const getOrderDebt = (order: Order) =>
  Math.max(getOrderTotal(order) - getOrderPaidAmount(order), 0);

export const getOrderPartsCost = (order: Order) => {
  const rawParts = (order.parts || []) as OrderPartWithMeta[];
  if (!rawParts.length) {
    return 0;
  }

  return rawParts.reduce((sum, item) => {
    const explicitPartCost = Number(item.partInfo?.partCost ?? 0);
    if (explicitPartCost > 0) {
      return sum + explicitPartCost;
    }

    const workType = item.workType as string | undefined;
    const isLegacyPartLine = !workType && !!item.partId;
    if (isLegacyPartLine) {
      return sum + Number(item.unitPrice || 0) * Number(item.quantity || 0);
    }

    return sum;
  }, 0);
};

export const getOrderMarginBase = (order: Order) => {
  const rawParts = (order.parts || []) as OrderPartWithMeta[];
  if (!rawParts.length) {
    return getOrderTotal(order);
  }

  const marginByItems = rawParts.reduce((sum, item) => {
    const lineTotal = Number(item.partInfo?.workCost ?? item.totalPrice ?? 0);
    const linePartCost = Number(item.partInfo?.partCost ?? 0);
    const lineMargin = Math.max(lineTotal - linePartCost, 0);
    return sum + lineMargin;
  }, 0);

  return marginByItems > 0 ? marginByItems : getOrderTotal(order);
};

