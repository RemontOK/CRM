import { OrderPart } from '../types';

type OrderPartMeta = OrderPart & {
  workType?: string;
  workName?: string;
  name?: string;
  partInfo?: { name?: string; workCost?: number };
};

export const workTypeLabels: Record<string, string> = {
  work_with_part: 'Работа с запчастью',
  work_only: 'Работа без запчасти',
  work: 'Работа',
  service: 'Услуга',
  part: 'Запчасть',
};

export const getWorkTypeLabel = (workType?: string) => {
  if (!workType) {
    return '';
  }
  return workTypeLabels[workType] || workType.replace(/_/g, ' ');
};

export const getOrderLineTitle = (part: OrderPartMeta) => {
  if (part.partId === 'screen_protection') {
    return 'Защита экрана';
  }
  if (part.partId === 'cleaning') {
    return 'Чистка устройства';
  }
  if (part.workName?.trim()) {
    return part.workName.trim();
  }
  if (part.name?.trim()) {
    return part.name.trim();
  }
  if (part.partInfo?.name?.trim()) {
    return part.partInfo.name.trim();
  }
  if (part.workType) {
    return getWorkTypeLabel(part.workType);
  }
  return 'Услуга';
};

export const isOrderWorkLine = (part: OrderPartMeta) => {
  const workCost = Number(part.partInfo?.workCost ?? 0);
  const workType = part.workType;
  return (
    workCost > 0 ||
    workType === 'work' ||
    workType === 'service' ||
    workType === 'work_with_part' ||
    workType === 'work_only'
  );
};
