import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { Part } from '../../types';
import { ReceiptFormValues, emptyReceiptForm } from './inventoryPartFormTypes';

interface InventoryReceiptDialogProps {
  open: boolean;
  part: Part | null;
  onClose: () => void;
  onSubmit: (values: ReceiptFormValues) => void | Promise<void>;
}

const InventoryReceiptDialog: React.FC<InventoryReceiptDialogProps> = ({
  open,
  part,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<ReceiptFormValues>(emptyReceiptForm());

  useEffect(() => {
    if (!open || !part) {
      return;
    }
    setForm(
      emptyReceiptForm(String((part.wholesalePrice ?? part.unitPrice) || ''))
    );
  }, [open, part?.id, part?.wholesalePrice, part?.unitPrice]);

  if (!part) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Оприходование запчасти</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={700}>
              {part.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Текущий остаток: {part.quantity} шт.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Количество"
              type="number"
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Себестоимость за единицу"
              type="number"
              value={form.unitCost}
              onChange={(event) => setForm((prev) => ({ ...prev, unitCost: event.target.value }))}
              InputProps={{
                endAdornment: <InputAdornment position="end">₽</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Документ / накладная"
              value={form.documentNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, documentNumber: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Основание"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => void onSubmit(form)}>
          Сохранить поступление
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryReceiptDialog;
