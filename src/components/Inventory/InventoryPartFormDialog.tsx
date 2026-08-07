import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { TaxonomyNode } from '../../types';
import { PartFormState } from './inventoryPartFormTypes';

interface InventoryPartFormDialogProps {
  open: boolean;
  editingPartId: string | null;
  initialValues: PartFormState;
  inventoryLocations: string[];
  activeLocationFilter: string;
  defaultLocation: string;
  rootCategories: TaxonomyNode[];
  taxonomyNodes: TaxonomyNode[];
  supplierOptions: string[];
  onClose: () => void;
  onSave: (values: PartFormState) => void | Promise<void>;
}

const InventoryPartFormDialog: React.FC<InventoryPartFormDialogProps> = ({
  open,
  editingPartId,
  initialValues,
  inventoryLocations,
  activeLocationFilter,
  defaultLocation,
  rootCategories,
  taxonomyNodes,
  supplierOptions,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<PartFormState>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [open, initialValues]);

  const availableSubcategories = useMemo(() => {
    const rootCategory = rootCategories.find((node) => node.name === form.category);
    if (!rootCategory) {
      return [];
    }
    return taxonomyNodes.filter((node) => node.parentId === rootCategory.id);
  }, [form.category, rootCategories, taxonomyNodes]);

  const locationValue = inventoryLocations.includes(form.warehouseId)
    ? form.warehouseId
    : activeLocationFilter || defaultLocation;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editingPartId ? 'Редактировать запчасть' : 'Добавить запчасть'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={inventoryLocations.length === 0}>
              <InputLabel id="part-form-location-label">Локация *</InputLabel>
              <Select
                labelId="part-form-location-label"
                id="part-form-location"
                value={locationValue}
                label="Локация *"
                onChange={(e) => setForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                MenuProps={{
                  disablePortal: false,
                  PaperProps: { sx: { maxHeight: 320 } },
                }}
              >
                {inventoryLocations.length === 0 ? (
                  <MenuItem disabled value="">
                    Сначала добавьте локацию на странице склада
                  </MenuItem>
                ) : (
                  inventoryLocations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Название *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Артикул"
              value={form.partNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, partNumber: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Категория *</InputLabel>
              <Select
                value={form.category}
                label="Категория *"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                    subcategory: '',
                  }))
                }
              >
                {rootCategories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!form.category || availableSubcategories.length === 0}>
              <InputLabel>Подкатегория</InputLabel>
              <Select
                value={form.subcategory}
                label="Подкатегория"
                onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value }))}
              >
                <MenuItem value="">Без подкатегории</MenuItem>
                {availableSubcategories.map((subcategory) => (
                  <MenuItem key={subcategory.id} value={subcategory.name}>
                    {subcategory.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Модель"
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
            />
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
              label="Порог уведомления"
              type="number"
              value={form.alertThreshold}
              onChange={(e) => setForm((prev) => ({ ...prev, alertThreshold: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Оптовая цена, ₽"
              type="number"
              value={form.wholesalePrice}
              onChange={(e) => setForm((prev) => ({ ...prev, wholesalePrice: e.target.value }))}
              helperText="Закупочная стоимость для учёта склада"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Розничная цена, ₽"
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
              helperText="Цена для продажи клиенту"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              freeSolo
              options={supplierOptions}
              value={form.supplier}
              onChange={(_, value) => setForm((prev) => ({ ...prev, supplier: value || '' }))}
              onInputChange={(_, value) => setForm((prev) => ({ ...prev, supplier: value }))}
              renderInput={(params) => <TextField {...params} fullWidth label="Поставщик" />}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Описание"
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.notificationsEnabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      notificationsEnabled: e.target.checked,
                      ...(e.target.checked && !prev.alertThreshold.trim()
                        ? { alertThreshold: '1' }
                        : {}),
                    }))
                  }
                />
              }
              label="Следить за низким остатком"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mt: -0.5 }}>
              По умолчанию выключено — запчасть не попадает в предупреждение «Низкий остаток»
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => void onSave(form)}>
          {editingPartId ? 'Сохранить' : 'Добавить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryPartFormDialog;
