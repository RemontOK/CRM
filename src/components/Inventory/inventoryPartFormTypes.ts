export type PartFormState = {
  partType: 'spare_part' | 'accessory' | 'product';
  name: string;
  partNumber: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  quantity: string;
  minQuantity: string;
  alertThreshold: string;
  notificationsEnabled: boolean;
  wholesalePrice: string;
  unitPrice: string;
  supplier: string;
  description: string;
  warehouseId: string;
};

export const emptyPartForm: PartFormState = {
  partType: 'spare_part',
  name: '',
  partNumber: '',
  category: '',
  subcategory: '',
  brand: '',
  model: '',
  quantity: '',
  minQuantity: '',
  alertThreshold: '',
  notificationsEnabled: false,
  wholesalePrice: '',
  unitPrice: '',
  supplier: '',
  description: '',
  warehouseId: '',
};

export type ReceiptFormValues = {
  quantity: string;
  unitCost: string;
  documentNumber: string;
  reason: string;
};

export const emptyReceiptForm = (defaultUnitCost = ''): ReceiptFormValues => ({
  quantity: '',
  unitCost: defaultUnitCost,
  documentNumber: '',
  reason: 'Оприходование на склад',
});

export type WriteoffFormValues = {
  mode: 'manual' | 'order';
  quantity: string;
  reason: string;
  orderId: string;
};

export const emptyWriteoffForm = (mode: 'manual' | 'order' = 'manual'): WriteoffFormValues => ({
  mode,
  quantity: '1',
  reason: mode === 'order' ? 'Списание в заказ' : 'Ручное списание',
  orderId: '',
});

export type SellFormValues = {
  quantity: string;
  price: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'installment';
};

export const emptySellForm = (defaultPrice = ''): SellFormValues => ({
  quantity: '1',
  price: defaultPrice,
  paymentMethod: 'cash',
});
