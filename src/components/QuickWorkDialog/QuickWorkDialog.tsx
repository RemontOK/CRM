import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import DeviceColorField from '../DeviceColorField/DeviceColorField';
import { DEVICE_BRAND_OPTIONS, filterModelsByBrand, inferDeviceBrandFromModel, stripBrandPrefixFromModel } from '../../constants/deviceBrands';
import { IPHONE_MODEL_OPTIONS } from '../../constants/iphoneModelColors';
import { ORDER_WORK_OPTIONS } from '../../constants/orderWorks';

const deviceTypeOptions = [
  { value: 'phone', label: 'Телефон' },
  { value: 'tablet', label: 'Планшет' },
  { value: 'laptop', label: 'Ноутбук' },
  { value: 'desktop', label: 'Компьютер' },
  { value: 'other', label: 'Другое' },
] as const;

const phoneModels = [
  ...IPHONE_MODEL_OPTIONS.map((model) => `Apple ${model}`),
  'Samsung Galaxy S24 Ultra',
  'Samsung Galaxy S24',
  'Samsung Galaxy Z Flip 5',
  'Samsung Galaxy Z Fold 5',
  'Xiaomi Mi 14',
  'Xiaomi Redmi Note 13',
  'Huawei P60 Pro',
  'Honor 90',
  'Google Pixel 8',
  'OnePlus 12',
];

export type QuickWorkFormValues = {
  deviceType: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other';
  brand: string;
  model: string;
  color: string;
  workName: string;
  quantity: number;
  salePrice: string;
  paymentMethod: string;
  note: string;
  clientPhone: string;
  clientName: string;
};

export const emptyQuickWorkForm = (paymentMethod = 'cash'): QuickWorkFormValues => ({
  deviceType: 'phone',
  brand: '',
  model: '',
  color: '',
  workName: '',
  quantity: 1,
  salePrice: '',
  paymentMethod,
  note: '',
  clientPhone: '',
  clientName: '',
});

interface PaymentMethodOption {
  code: string;
  label: string;
  enabled?: boolean;
}

interface QuickWorkDialogProps {
  open: boolean;
  paymentMethods: PaymentMethodOption[];
  onClose: () => void;
  onSubmit: (values: QuickWorkFormValues) => void | Promise<void>;
}

const QuickWorkDialog: React.FC<QuickWorkDialogProps> = ({
  open,
  paymentMethods,
  onClose,
  onSubmit,
}) => {
  const defaultPayment = paymentMethods.find((item) => item.enabled)?.code || paymentMethods[0]?.code || 'cash';
  const [form, setForm] = useState<QuickWorkFormValues>(() => emptyQuickWorkForm(defaultPayment));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(emptyQuickWorkForm(defaultPayment));
    setSubmitting(false);
  }, [open, defaultPayment]);

  const modelOptions = useMemo(() => {
    const base = form.deviceType === 'phone' ? phoneModels : phoneModels;
    return filterModelsByBrand(base, form.brand);
  }, [form.brand, form.deviceType]);

  const patch = (updates: Partial<QuickWorkFormValues>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Быстрая работа</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Тип устройства</InputLabel>
              <Select
                value={form.deviceType}
                label="Тип устройства"
                onChange={(event) =>
                  patch({
                    deviceType: event.target.value as QuickWorkFormValues['deviceType'],
                    model: '',
                  })
                }
              >
                {deviceTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={[...DEVICE_BRAND_OPTIONS]}
              value={form.brand}
              inputValue={form.brand}
              onChange={(_event, value) => patch({ brand: value || '', model: '' })}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  patch({ brand: value });
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Производитель" placeholder="Выберите производителя" />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={modelOptions}
              value={form.model}
              inputValue={form.model}
              onChange={(_event, value) => {
                const nextModelRaw = value || '';
                const nextModel = form.brand
                  ? stripBrandPrefixFromModel(nextModelRaw, form.brand)
                  : nextModelRaw;
                const inferred = inferDeviceBrandFromModel(nextModelRaw || nextModel);
                patch({
                  model: nextModel,
                  ...(inferred ? { brand: inferred } : {}),
                });
              }}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  const nextModel = form.brand
                    ? stripBrandPrefixFromModel(value, form.brand)
                    : value;
                  patch({ model: nextModel });
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Модель" placeholder="Выберите модель" />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DeviceColorField
              value={form.color}
              onChange={(color) => patch({ color })}
              deviceModel={form.model}
              placeholder="Выберите цвет"
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              freeSolo
              options={[...ORDER_WORK_OPTIONS]}
              value={form.workName}
              inputValue={form.workName}
              onChange={(_event, value) => patch({ workName: value || '' })}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  patch({ workName: value });
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Выберите работу" placeholder="Выберите работу" />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="Количество"
              value={form.quantity}
              onChange={(event) =>
                patch({ quantity: Math.max(1, Number(event.target.value) || 1) })
              }
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="Цена продажи"
              value={form.salePrice}
              onChange={(event) => patch({ salePrice: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₽</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Клиент"
              value={form.clientName}
              onChange={(event) => patch({ clientName: event.target.value })}
              placeholder="Имя клиента"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Телефон"
              value={form.clientPhone}
              onChange={(event) => patch({ clientPhone: event.target.value })}
              placeholder="+7..."
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Оплата</InputLabel>
              <Select
                value={form.paymentMethod}
                label="Оплата"
                onChange={(event) => patch({ paymentMethod: event.target.value })}
              >
                {paymentMethods
                  .filter((method) => method.enabled !== false)
                  .map((method) => (
                    <MenuItem key={method.code} value={method.code}>
                      {method.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Комментарий"
              value={form.note}
              onChange={(event) => patch({ note: event.target.value })}
              placeholder="Комментарий"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Отмена
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Создание...' : 'Создать заказ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickWorkDialog;
