import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { Part } from '../../types';
import { mergeSx, nestedPanelSx } from '../../styles/ui';

export type QuickReceiveFormValues = {
  name: string;
  category: string;
  brand: string;
  model: string;
  wholesalePrice: string;
  quantity: number;
};

export const emptyQuickReceiveForm = (): QuickReceiveFormValues => ({
  name: '',
  category: 'Прочее',
  brand: '',
  model: '',
  wholesalePrice: '',
  quantity: 1,
});

const normalizePartField = (value?: string) => (value || '').trim().toLowerCase();

interface QuickReceivePartDialogProps {
  open: boolean;
  inventoryParts: Part[];
  initialValues: QuickReceiveFormValues;
  onClose: () => void;
  onSubmit: (values: QuickReceiveFormValues) => void | Promise<void>;
}

const QuickReceivePartDialog: React.FC<QuickReceivePartDialogProps> = ({
  open,
  inventoryParts,
  initialValues,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<QuickReceiveFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [open, initialValues]);

  const applyMatchedPart = (matchedPart: Part | undefined) => {
    if (!matchedPart) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      category: matchedPart.category || 'Прочее',
      brand: matchedPart.brand || '',
      model: matchedPart.model || '',
      wholesalePrice: String((matchedPart.wholesalePrice ?? matchedPart.unitPrice) || ''),
    }));
  };

  const quickPartExactMatch = useMemo(() => {
    const normalizedName = normalizePartField(form.name);
    if (!normalizedName) {
      return null;
    }

    return (
      inventoryParts.find((part) => {
        const partNameMatches = normalizePartField(part.name) === normalizedName;
        const categoryMatches =
          !normalizePartField(form.category) || normalizePartField(part.category) === normalizePartField(form.category);
        const brandMatches =
          !normalizePartField(form.brand) || normalizePartField(part.brand) === normalizePartField(form.brand);
        const modelMatches =
          !normalizePartField(form.model) || normalizePartField(part.model) === normalizePartField(form.model);
        return partNameMatches && categoryMatches && brandMatches && modelMatches;
      }) ||
      inventoryParts.find((part) => normalizePartField(part.name) === normalizedName) ||
      null
    );
  }, [form.brand, form.category, form.model, form.name, inventoryParts]);

  const quickPartRelatedParts = useMemo(() => {
    const normalizedName = normalizePartField(form.name);
    if (!normalizedName) {
      return [];
    }
    return inventoryParts.filter((part) => normalizePartField(part.name) === normalizedName);
  }, [form.name, inventoryParts]);

  const quickPartNameOptions = useMemo(
    () => Array.from(new Set(inventoryParts.map((part) => part.name).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    [inventoryParts]
  );

  const quickPartCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (quickPartRelatedParts.length ? quickPartRelatedParts : inventoryParts)
            .map((part) => part.category)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [inventoryParts, quickPartRelatedParts]
  );

  const quickPartBrandOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (quickPartRelatedParts.length ? quickPartRelatedParts : inventoryParts)
            .map((part) => part.brand)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [inventoryParts, quickPartRelatedParts]
  );

  const quickPartModelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (quickPartRelatedParts.length ? quickPartRelatedParts : inventoryParts)
            .filter(
              (part) => !form.brand.trim() || normalizePartField(part.brand) === normalizePartField(form.brand)
            )
            .map((part) => part.model)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [form.brand, inventoryParts, quickPartRelatedParts]
  );

  const canSubmit = Boolean(form.name.trim()) && Number(form.wholesalePrice) > 0 && form.quantity > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Быстрое оприходование</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Card sx={mergeSx({ p: 2 }, nestedPanelSx)}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Новая поставка на склад
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={quickPartNameOptions}
                  value={form.name}
                  onChange={(_, newValue) => {
                    const nextName = newValue || '';
                    setForm((prev) => ({ ...prev, name: nextName }));
                    applyMatchedPart(
                      inventoryParts.find((part) => normalizePartField(part.name) === normalizePartField(nextName))
                    );
                  }}
                  onInputChange={(_, newInputValue) => {
                    setForm((prev) => ({ ...prev, name: newInputValue }));
                    applyMatchedPart(
                      inventoryParts.find((part) => normalizePartField(part.name) === normalizePartField(newInputValue))
                    );
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth label="Название запчасти" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={quickPartCategoryOptions}
                  value={form.category}
                  onChange={(_, newValue) => setForm((prev) => ({ ...prev, category: newValue || '' }))}
                  onInputChange={(_, newInputValue) => setForm((prev) => ({ ...prev, category: newInputValue }))}
                  renderInput={(params) => <TextField {...params} fullWidth label="Категория" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={quickPartBrandOptions}
                  value={form.brand}
                  onChange={(_, newValue) => {
                    const nextBrand = newValue || '';
                    setForm((prev) => ({ ...prev, brand: nextBrand }));
                    if (form.name.trim()) {
                      applyMatchedPart(
                        inventoryParts.find(
                          (part) =>
                            normalizePartField(part.name) === normalizePartField(form.name) &&
                            normalizePartField(part.brand) === normalizePartField(nextBrand)
                        )
                      );
                    }
                  }}
                  onInputChange={(_, newInputValue) => setForm((prev) => ({ ...prev, brand: newInputValue }))}
                  renderInput={(params) => <TextField {...params} fullWidth label="Бренд" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={quickPartModelOptions}
                  value={form.model}
                  onChange={(_, newValue) => setForm((prev) => ({ ...prev, model: newValue || '' }))}
                  onInputChange={(_, newInputValue) => setForm((prev) => ({ ...prev, model: newInputValue }))}
                  renderInput={(params) => <TextField {...params} fullWidth label="Модель" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Оптовая цена, ₽"
                  type="number"
                  value={form.wholesalePrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, wholesalePrice: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Количество, шт."
                  type="number"
                  inputProps={{ min: 1 }}
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                />
              </Grid>
              <Grid item xs={12}>
                {quickPartExactMatch && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Будет пополнена существующая позиция: <strong>{quickPartExactMatch.name}</strong> • остаток сейчас{' '}
                    {quickPartExactMatch.quantity} шт.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!canSubmit}
                  onClick={() => void onSubmit(form)}
                >
                  Оприходовать и выбрать
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickReceivePartDialog;
