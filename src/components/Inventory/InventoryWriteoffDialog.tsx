import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Order, Part } from '../../types';
import { WriteoffFormValues, emptyWriteoffForm } from './inventoryPartFormTypes';

interface InventoryWriteoffDialogProps {
  open: boolean;
  part: Part | null;
  initialMode?: 'manual' | 'order';
  activeOrders: Order[];
  onClose: () => void;
  onRequestOrders?: () => void | Promise<void>;
  onSubmit: (values: WriteoffFormValues) => void | Promise<void>;
}

const InventoryWriteoffDialog: React.FC<InventoryWriteoffDialogProps> = ({
  open,
  part,
  initialMode = 'manual',
  activeOrders,
  onClose,
  onRequestOrders,
  onSubmit,
}) => {
  const [form, setForm] = useState<WriteoffFormValues>(emptyWriteoffForm(initialMode));

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(emptyWriteoffForm(initialMode));
    if (initialMode === 'order') {
      void onRequestOrders?.();
    }
  }, [open, initialMode, onRequestOrders]);

  if (!part) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.mode === 'order' ? 'Списание в заказ' : 'Списание запчасти'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={700}>
              {part.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Доступно на складе: {part.quantity} шт.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Режим</InputLabel>
              <Select
                value={form.mode}
                label="Режим"
                onChange={(event) => {
                  const mode = event.target.value as 'manual' | 'order';
                  setForm((prev) => ({
                    ...prev,
                    mode,
                    reason: mode === 'order' ? 'Списание в заказ' : 'Ручное списание',
                    orderId: mode === 'order' ? prev.orderId : '',
                  }));
                  if (mode === 'order') {
                    void onRequestOrders?.();
                  }
                }}
              >
                <MenuItem value="manual">Ручное списание</MenuItem>
                <MenuItem value="order">Списание в заказ</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Количество"
              type="number"
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
          </Grid>
          {form.mode === 'order' ? (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Заказ</InputLabel>
                <Select
                  value={form.orderId}
                  label="Заказ"
                  onChange={(event) => setForm((prev) => ({ ...prev, orderId: event.target.value }))}
                >
                  {activeOrders.map((order) => (
                    <MenuItem key={order.id} value={order.id}>
                      {order.orderNumber} · {order.clientName || 'Клиент'} · {order.deviceBrand} {order.deviceModel}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Основание"
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" color="warning" onClick={() => void onSubmit(form)}>
          Списать
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryWriteoffDialog;
