import { Order } from '../types';

/** Заявленная клиентом неисправность / причина обращения. */
export const getOrderStatedProblem = (
  order?: Pick<Order, 'description' | 'diagnosis'> | null
): string => (order?.description || order?.diagnosis || '').trim();

export const getOrderProblemForDocuments = (
  order?: Pick<Order, 'description' | 'diagnosis'> | null,
  override?: string
): string => (override || getOrderStatedProblem(order)).trim();
