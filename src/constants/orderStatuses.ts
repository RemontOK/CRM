import { OrderStatusSetting } from '../types';

export const SYSTEM_NEW_ORDER_STATUS_ID = 'status_new';
export const SYSTEM_NEW_ORDER_STATUS_CODE = 'new';
export const SYSTEM_NEW_ORDER_STATUS_LABEL = 'Новый';
export const SYSTEM_NEW_ORDER_STATUS_COLOR = '#fca5a5';

export const buildSystemNewOrderStatus = (
  color = SYSTEM_NEW_ORDER_STATUS_COLOR
): OrderStatusSetting => ({
  id: SYSTEM_NEW_ORDER_STATUS_ID,
  code: SYSTEM_NEW_ORDER_STATUS_CODE,
  label: SYSTEM_NEW_ORDER_STATUS_LABEL,
  color,
  enabled: true,
  isFinal: false,
  isSystem: true,
  sortOrder: 0,
});

export const isSystemNewOrderStatus = (
  status: Pick<OrderStatusSetting, 'id' | 'code' | 'label' | 'isSystem'>
) =>
  status.isSystem === true ||
  status.id === SYSTEM_NEW_ORDER_STATUS_ID ||
  status.code === SYSTEM_NEW_ORDER_STATUS_CODE ||
  /^новый$/i.test((status.label || '').trim());

export const matchesLegacyNewOrderStatus = (status: Pick<OrderStatusSetting, 'code' | 'label'>) =>
  status.code === 'pending' || /^новый$/i.test((status.label || '').trim());
