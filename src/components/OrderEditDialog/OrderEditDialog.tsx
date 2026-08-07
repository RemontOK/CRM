import React, { useEffect, useState } from 'react';
import {
  Box,
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
  Typography,
  Autocomplete,
} from '@mui/material';
import { Print } from '@mui/icons-material';
import { Employee, Order } from '../../types';
import CommaAppendAutocomplete from '../CommaAppendAutocomplete/CommaAppendAutocomplete';
import DeviceColorField from '../DeviceColorField/DeviceColorField';
import { DEFAULT_EXTERNAL_DEVICE_CONDITION, EXTERNAL_DEVICE_DEFECTS, ORDER_APPEAL_REASONS } from '../../constants/deviceDefects';
import { DEVICE_BRAND_OPTIONS, inferDeviceBrandFromModel } from '../../constants/deviceBrands';

type OrderStatusOption = { value: string; label: string };

interface OrderEditDialogProps {
  open: boolean;
  order: Order | null;
  orderStatusOptions: OrderStatusOption[];
  assigneeOptions: Employee[];
  onClose: () => void;
  onSave: (draft: Order) => void;
  onPrintAcceptance: (order: Order) => void;
}

const OrderEditDialog: React.FC<OrderEditDialogProps> = ({
  open,
  order,
  orderStatusOptions,
  assigneeOptions,
  onClose,
  onSave,
  onPrintAcceptance,
}) => {
  const [draft, setDraft] = useState<Order | null>(order);

  useEffect(() => {
    if (open && order) {
      setDraft({ ...order });
    }
  }, [open, order]);

  if (!draft) {
    return null;
  }

  const patchDraft = (patch: Partial<Order>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Редактирование заказа</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Информация о клиенте
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Имя клиента"
                value={draft.clientName || ''}
                onChange={(e) => patchDraft({ clientName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Телефон клиента"
                value={draft.clientPhone || ''}
                onChange={(e) => patchDraft({ clientPhone: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Информация об устройстве
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={[...DEVICE_BRAND_OPTIONS]}
                value={draft.deviceBrand || ''}
                inputValue={draft.deviceBrand || ''}
                onChange={(_event, value) => patchDraft({ deviceBrand: value || '' })}
                onInputChange={(_event, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    patchDraft({ deviceBrand: value });
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} fullWidth label="Производитель" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Модель устройства"
                value={draft.deviceModel || ''}
                onChange={(e) => {
                  const nextModel = e.target.value;
                  const inferred = inferDeviceBrandFromModel(nextModel);
                  patchDraft({
                    deviceModel: nextModel,
                    ...(inferred && !draft.deviceBrand ? { deviceBrand: inferred } : {}),
                  });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DeviceColorField
                label="Цвет устройства"
                value={draft.deviceColor || ''}
                onChange={(next) => patchDraft({ deviceColor: next })}
                deviceModel={draft.deviceModel}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="IMEI"
                value={draft.deviceImei || ''}
                onChange={(e) => patchDraft({ deviceImei: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Серийный номер"
                value={draft.deviceSerial || ''}
                onChange={(e) => patchDraft({ deviceSerial: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Пароль устройства"
                value={draft.devicePassword || ''}
                onChange={(e) => patchDraft({ devicePassword: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <CommaAppendAutocomplete
                label="Внешний вид"
                value={draft.deviceExternalCondition || DEFAULT_EXTERNAL_DEVICE_CONDITION}
                onChange={(next) => patchDraft({ deviceExternalCondition: next })}
                options={EXTERNAL_DEVICE_DEFECTS}
                placeholder="Выберите дефект или введите свой"
                clearFallback={DEFAULT_EXTERNAL_DEVICE_CONDITION}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Информация о заказе
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Статус заказа</InputLabel>
                <Select
                  value={draft.status}
                  label="Статус заказа"
                  onChange={(e) => patchDraft({ status: e.target.value })}
                >
                  {orderStatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={draft.priority}
                  label="Приоритет"
                  onChange={(e) => patchDraft({ priority: e.target.value as Order['priority'] })}
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="urgent">Срочный</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Исполнитель</InputLabel>
                <Select
                  value={draft.technicianId || ''}
                  label="Исполнитель"
                  onChange={(e) => {
                    const technician = assigneeOptions.find((option) => option.id === e.target.value);
                    patchDraft({
                      technicianId: e.target.value,
                      technicianName: technician?.name || '',
                    });
                  }}
                >
                  {assigneeOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Менеджер приема</InputLabel>
                <Select
                  value={draft.intakeManagerName || ''}
                  label="Менеджер приема"
                  onChange={(e) => patchDraft({ intakeManagerName: e.target.value })}
                >
                  {assigneeOptions.map((option) => (
                    <MenuItem key={option.id} value={option.name}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Менеджер выдачи</InputLabel>
                <Select
                  value={draft.deliveryManagerName || ''}
                  label="Менеджер выдачи"
                  onChange={(e) => patchDraft({ deliveryManagerName: e.target.value })}
                >
                  {assigneeOptions.map((option) => (
                    <MenuItem key={option.id} value={option.name}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ориентировочная стоимость"
                type="number"
                value={draft.estimatedCost}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
                onChange={(e) => patchDraft({ estimatedCost: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Финальная стоимость"
                type="number"
                value={draft.finalCost ?? ''}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
                onChange={(e) => patchDraft({ finalCost: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <CommaAppendAutocomplete
                label="Описание проблемы / причина обращения"
                value={draft.description}
                onChange={(next) => patchDraft({ description: next })}
                options={ORDER_APPEAL_REASONS}
                placeholder="Выберите причину или введите свою"
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Диагностика"
                multiline
                rows={2}
                value={draft.diagnosis || ''}
                onChange={(e) => patchDraft({ diagnosis: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>
          Сохранить изменения
        </Button>
        <Button variant="outlined" startIcon={<Print />} onClick={() => onPrintAcceptance(draft)}>
          Акт приема
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderEditDialog;
