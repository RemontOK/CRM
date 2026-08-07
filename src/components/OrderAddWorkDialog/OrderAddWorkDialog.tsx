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
  FormControlLabel,
  Grid,
  InputAdornment,
  Switch,
  TextField,
  Typography,
  createFilterOptions,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { Order } from '../../types';
import { appSettingsService } from '../../services/appSettingsService';
import { employeeService } from '../../services/employeeService';
import {
  dashedDividerSx,
  highlightCardSx,
  infoPanelSx,
  mergeSx,
  nestedPanelSx,
  totalPanelSx,
} from '../../styles/ui';

const warrantyDayOptions = ['30', '60', '90', '365'];

const filterWorkNameOptions = createFilterOptions<string>({
  matchFrom: 'any',
  stringify: (option) => option,
  limit: 40,
});

export interface AddWorkFormValues {
  workName: string;
  workPrice: string;
  workQuantity: number;
  workWarrantyDays: string;
  allowWithoutPart: boolean;
}

interface SelectedWorkPart {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  price?: number;
  wholesalePrice?: number;
  stock?: number;
}

interface OrderAddWorkDialogProps {
  open: boolean;
  order: Order | null;
  editingWorkItemId: string | null;
  selectedPart: SelectedWorkPart | null;
  workNameOptions: string[];
  initialValues: AddWorkFormValues;
  onClose: () => void;
  onSearchParts: () => void;
  onClearPart: () => void;
  onSubmit: (values: AddWorkFormValues) => void;
}

const getOrderRoleRates = (order: Order) => {
  const settings = appSettingsService.getSettings();
  const employees = employeeService.getEmployees();
  const normalize = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const findByName = (name?: string) => {
    const normalized = normalize(name);
    if (!normalized) {
      return null;
    }
    return (
      employees.find((item) => normalize(item.name) === normalized) ||
      employees.find(
        (item) => normalize(item.name).includes(normalized) || normalized.includes(normalize(item.name))
      ) ||
      null
    );
  };

  const technician = order.technicianId
    ? employees.find((item) => item.id === order.technicianId) || findByName(order.technicianName)
    : findByName(order.technicianName);
  const intakeManager = order.intakeManagerName ? findByName(order.intakeManagerName) : null;
  const deliveryManager = order.deliveryManagerName ? findByName(order.deliveryManagerName) : null;

  const pickRate = (value: number | undefined, fallback: number) =>
    typeof value === 'number' && value > 0 ? value : fallback;

  return {
    technicianRate: pickRate(technician?.executionRate, settings.employees.defaultExecutionRate),
    intakeRate: pickRate(intakeManager?.intakeRate, settings.employees.defaultIntakeRate),
    deliveryRate: pickRate(deliveryManager?.deliveryRate, settings.employees.defaultDeliveryRate),
  };
};

const OrderAddWorkDialog: React.FC<OrderAddWorkDialogProps> = ({
  open,
  order,
  editingWorkItemId,
  selectedPart,
  workNameOptions,
  initialValues,
  onClose,
  onSearchParts,
  onClearPart,
  onSubmit,
}) => {
  const [workName, setWorkName] = useState(initialValues.workName);
  const [workPrice, setWorkPrice] = useState(initialValues.workPrice);
  const [workQuantity, setWorkQuantity] = useState(initialValues.workQuantity);
  const [workWarrantyDays, setWorkWarrantyDays] = useState(initialValues.workWarrantyDays);
  const [allowWithoutPart, setAllowWithoutPart] = useState(initialValues.allowWithoutPart);

  useEffect(() => {
    if (!open) {
      return;
    }
    setWorkName(initialValues.workName);
    setWorkPrice(initialValues.workPrice);
    setWorkQuantity(initialValues.workQuantity);
    setWorkWarrantyDays(initialValues.workWarrantyDays);
    setAllowWithoutPart(Boolean(initialValues.allowWithoutPart));
  }, [open, initialValues]);

  useEffect(() => {
    if (!open || !selectedPart?.name) {
      return;
    }
    setWorkName(selectedPart.name);
    setAllowWithoutPart(false);
  }, [open, selectedPart?.id, selectedPart?.name]);

  const workTotalPreview = (Number(workPrice) || 0) * workQuantity;
  const selectedPartCost = selectedPart
    ? Number(selectedPart.wholesalePrice ?? selectedPart.price ?? 0)
    : 0;
  const partCostPreview = selectedPart && !allowWithoutPart ? selectedPartCost * workQuantity : 0;
  const marginPreview = Math.max(workTotalPreview - partCostPreview, 0);

  const previewEarningsRows = useMemo(() => {
    const previewRates = order
      ? getOrderRoleRates(order)
      : { technicianRate: 0, intakeRate: 0, deliveryRate: 0 };

    return [
      {
        key: 'technician',
        label: 'Исполнитель',
        name: order?.technicianName || 'Не назначен',
        rate: previewRates.technicianRate,
        amount: (marginPreview * previewRates.technicianRate) / 100,
      },
      {
        key: 'intake',
        label: 'Принял менеджер',
        name: order?.intakeManagerName || 'Не назначен',
        rate: previewRates.intakeRate,
        amount: (marginPreview * previewRates.intakeRate) / 100,
      },
      {
        key: 'delivery',
        label: 'Выдает менеджер',
        name: order?.deliveryManagerName || 'Не назначен',
        rate: previewRates.deliveryRate,
        amount: (marginPreview * previewRates.deliveryRate) / 100,
      },
    ];
  }, [marginPreview, order]);

  const requiresPart = !editingWorkItemId && !allowWithoutPart;
  const hasRequiredPart = Boolean(selectedPart) || !requiresPart;

  const canSubmit =
    Boolean(workName.trim()) &&
    Boolean(workPrice.trim()) &&
    Number(workPrice) >= 0 &&
    workQuantity > 0 &&
    Number(workWarrantyDays) > 0 &&
    hasRequiredPart;

  const handleAllowWithoutPartChange = (checked: boolean) => {
    setAllowWithoutPart(checked);
    if (checked) {
      onClearPart();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingWorkItemId ? 'Редактировать работу' : 'Добавить работу'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={workNameOptions}
                filterOptions={filterWorkNameOptions}
                value={workName}
                onChange={(_, newValue) => setWorkName(newValue || '')}
                onInputChange={(_, newInputValue) => setWorkName(newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Название работы"
                    placeholder="Начните вводить — появятся похожие названия"
                    helperText="Названия сохраняются и предлагаются при следующем вводе"
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={`${option}-${key}`} {...optionProps}>
                      <Typography variant="body1">{option}</Typography>
                    </Box>
                  );
                }}
              />
            </Grid>

            {!editingWorkItemId && (
              <Grid item xs={12}>
                <Card sx={mergeSx({ px: 2, py: 1 }, nestedPanelSx)}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowWithoutPart}
                        onChange={(event) => handleAllowWithoutPartChange(event.target.checked)}
                        color="warning"
                      />
                    }
                    label="Работа без запчасти"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mt: -0.5, mb: 0.5 }}>
                    Без этого переключателя нужно выбрать запчасть со склада
                  </Typography>
                </Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Card
                sx={mergeSx(
                  { p: 2 },
                  nestedPanelSx,
                  allowWithoutPart && !editingWorkItemId ? { opacity: 0.55 } : null
                )}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {editingWorkItemId ? 'Запчасть в работе' : 'Добавить запчасть к работе'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {editingWorkItemId
                    ? 'При редактировании цена и количество меняются без повторного списания склада.'
                    : allowWithoutPart
                      ? 'Режим «без запчасти»: позиция добавится только как работа.'
                      : 'Выберите запчасть со склада или включите «Работа без запчасти».'}
                </Typography>
                <Button
                  variant={selectedPart ? 'contained' : 'outlined'}
                  fullWidth
                  onClick={onSearchParts}
                  disabled={Boolean(editingWorkItemId) || allowWithoutPart}
                  startIcon={<Search />}
                  sx={{ mb: 1 }}
                >
                  {selectedPart ? `Выбрана: ${selectedPart.name}` : 'Выбрать запчасть'}
                </Button>
                {selectedPart && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Цена запчасти: {selectedPart.price} ₽ • Остаток: {selectedPart.stock} шт.
                    </Typography>
                    <Button
                      size="small"
                      onClick={onClearPart}
                      disabled={Boolean(editingWorkItemId) || allowWithoutPart}
                      sx={{ mt: 1 }}
                    >
                      Убрать запчасть
                    </Button>
                  </Box>
                )}
                {!editingWorkItemId && !allowWithoutPart && !selectedPart && (
                  <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
                    Выберите запчасть или включите «Работа без запчасти»
                  </Typography>
                )}
              </Card>
            </Grid>

            {selectedPart && !allowWithoutPart && (
              <Grid item xs={12}>
                <Card sx={mergeSx({ p: 2 }, highlightCardSx)}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedPart.name}
                  </Typography>
                  <Typography variant="body2">
                    Категория: {selectedPart.category} | Бренд: {selectedPart.brand}
                  </Typography>
                  <Typography variant="body2">
                    Цена: {selectedPart.price} ₽ | На складе: {selectedPart.stock} шт.
                  </Typography>
                </Card>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Цена за единицу"
                type="number"
                value={workPrice}
                onChange={(e) => setWorkPrice(e.target.value)}
                helperText="Можно указать 0 ₽ для бесплатной работы"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Card sx={mergeSx({ p: 2 }, infoPanelSx)}>
                <Typography variant="body2" color="text.secondary">
                  Себестоимость запчасти: <strong>{partCostPreview.toLocaleString('ru-RU')} ₽</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Маржа по работе: <strong>{marginPreview.toLocaleString('ru-RU')} ₽</strong>
                </Typography>
                <Box sx={mergeSx({ mt: 1.5, pt: 1.5 }, dashedDividerSx)}>
                  {previewEarningsRows.map((row) => (
                    <Box
                      key={row.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        mt: row.key === 'technician' ? 0 : 0.75,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {row.label}: <strong>{row.name}</strong> ({row.rate}%)
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="success.main" sx={{ whiteSpace: 'nowrap' }}>
                        {row.amount.toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Количество"
                type="number"
                value={workQuantity}
                onChange={(e) => setWorkQuantity(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={warrantyDayOptions}
                value={workWarrantyDays}
                inputValue={workWarrantyDays}
                onChange={(_, value) => setWorkWarrantyDays(value ?? '')}
                onInputChange={(_, value) => setWorkWarrantyDays(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Гарантия, дней"
                    type="number"
                    inputProps={{
                      ...params.inputProps,
                      min: 1,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Card sx={mergeSx({ p: 2 }, totalPanelSx)}>
                <Typography variant="h6" textAlign="center">
                  Итого: {workTotalPreview.toLocaleString('ru-RU')} ₽
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              workName,
              workPrice,
              workQuantity,
              workWarrantyDays,
              allowWithoutPart,
            })
          }
        >
          {editingWorkItemId ? 'Сохранить' : 'Добавить работу'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderAddWorkDialog;
