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
import { Part } from '../../types';
import { SellFormValues, emptySellForm } from './inventoryPartFormTypes';

interface InventorySellDialogProps {
  open: boolean;
  part: Part | null;
  defaultPrice?: string;
  onClose: () => void;
  onSubmit: (values: SellFormValues) => void | Promise<void>;
}

const InventorySellDialog: React.FC<InventorySellDialogProps> = ({
  open,
  part,
  defaultPrice = '',
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<SellFormValues>(emptySellForm(defaultPrice));

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(emptySellForm(defaultPrice));
  }, [open, defaultPrice, part?.id]);

  if (!part) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Продажа товара</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={700}>
              {part.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Остаток: {part.quantity} шт.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Количество"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Цена продажи, ₽"
              type="number"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Способ оплаты</InputLabel>
              <Select
                value={form.paymentMethod}
                label="Способ оплаты"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value as SellFormValues['paymentMethod'],
                  }))
                }
              >
                <MenuItem value="cash">Наличные</MenuItem>
                <MenuItem value="card">Карта</MenuItem>
                <MenuItem value="transfer">Перевод</MenuItem>
                <MenuItem value="installment">Рассрочка</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => void onSubmit(form)}>
          Продать
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventorySellDialog;
