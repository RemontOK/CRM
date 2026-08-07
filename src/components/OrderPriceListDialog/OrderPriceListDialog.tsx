import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Delete, Edit, FilterList } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  deviceTypeLabels,
  deviceTypes,
  getPriceBrand,
  getSavedPriceList,
  matchesPriceSearch,
  priceListStorageKey,
  PriceListItem,
} from './priceListData';

export type OrderPriceListDialogProps = {
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
};

const emptyNewPriceItem = (): PriceListItem => ({
  id: '',
  deviceType: 'phone',
  model: '',
  workName: '',
  partName: '',
  partCost: 0,
  workCost: 0,
});

const OrderPriceListDialog: React.FC<OrderPriceListDialogProps> = ({ open, canEdit, onClose }) => {
  const [isPriceEditMode, setIsPriceEditMode] = useState(false);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [priceList, setPriceList] = useState<PriceListItem[]>(getSavedPriceList);
  const [priceSearch, setPriceSearch] = useState('');
  const debouncedPriceSearch = useDebouncedValue(priceSearch, 250);
  const [priceDeviceType, setPriceDeviceType] = useState('all');
  const [priceBrand, setPriceBrand] = useState('all');
  const [priceModel, setPriceModel] = useState('all');
  const [newPriceItem, setNewPriceItem] = useState<PriceListItem>(emptyNewPriceItem);

  const priceBrandOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          priceList
            .filter((item) => priceDeviceType === 'all' || item.deviceType === priceDeviceType)
            .map((item) => getPriceBrand(item.model))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [priceDeviceType, priceList]
  );
  const priceModelOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          priceList
            .filter((item) => priceDeviceType === 'all' || item.deviceType === priceDeviceType)
            .filter((item) => priceBrand === 'all' || getPriceBrand(item.model) === priceBrand)
            .map((item) => item.model)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [priceBrand, priceDeviceType, priceList]
  );
  const priceTree = React.useMemo(
    () =>
      deviceTypes
        .filter((type) => priceList.some((item) => item.deviceType === type))
        .map((type) => {
          const typeItems = priceList.filter((item) => item.deviceType === type);
          const brands = Array.from(new Set(typeItems.map((item) => getPriceBrand(item.model)))).sort((a, b) =>
            a.localeCompare(b, 'ru')
          );

          return {
            type,
            total: typeItems.length,
            brands: brands.map((brand) => {
              const brandItems = typeItems.filter((item) => getPriceBrand(item.model) === brand);
              const models = Array.from(new Set(brandItems.map((item) => item.model))).sort((a, b) =>
                a.localeCompare(b, 'ru')
              );
              return { brand, total: brandItems.length, models };
            }),
          };
        }),
    [priceList]
  );
  const filteredPriceList = React.useMemo(() => {
    return priceList
      .filter((item) => priceDeviceType === 'all' || item.deviceType === priceDeviceType)
      .filter((item) => priceBrand === 'all' || getPriceBrand(item.model) === priceBrand)
      .filter((item) => priceModel === 'all' || item.model === priceModel)
      .filter((item) => matchesPriceSearch(item, debouncedPriceSearch))
      .slice(0, 250);
  }, [priceBrand, priceDeviceType, priceList, priceModel, debouncedPriceSearch]);

  const persistPriceList = (nextPriceList: PriceListItem[]) => {
    setPriceList(nextPriceList);
    localStorage.setItem(priceListStorageKey, JSON.stringify(nextPriceList));
  };

  const updatePriceItem = (id: string, updates: Partial<PriceListItem>) => {
    persistPriceList(priceList.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addPriceItem = () => {
    if (!newPriceItem.model.trim() || !newPriceItem.workName.trim()) {
      toast.error('Укажите модель и наименование работы');
      return;
    }

    const nextItem = {
      ...newPriceItem,
      id: `custom_${Date.now()}`,
      model: newPriceItem.model.trim(),
      workName: newPriceItem.workName.trim(),
      partName: newPriceItem.partName.trim(),
      partCost: Number(newPriceItem.partCost) || 0,
      workCost: Number(newPriceItem.workCost) || 0,
    };

    persistPriceList([nextItem, ...priceList]);
    setNewPriceItem(emptyNewPriceItem());
  };

  const deletePriceItem = (id: string) => {
    persistPriceList(priceList.filter((item) => item.id !== id));
  };

  const handleClose = () => {
    setIsPriceEditMode(false);
    setIsPriceFilterOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          Прайс работ
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Цены указаны по модели устройства с учетом запчасти и работы. Ориентир: Екатеринбург.
          </Typography>
        </Box>
        {canEdit && (
          <Button
            variant={isPriceEditMode ? 'contained' : 'outlined'}
            startIcon={<Edit />}
            onClick={() => setIsPriceEditMode((value) => !value)}
            sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
          >
            {isPriceEditMode ? 'Завершить редактирование' : 'Редактировать'}
          </Button>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            fullWidth
            label="Поиск"
            value={priceSearch}
            onChange={(event) => setPriceSearch(event.target.value)}
            placeholder="Модель, работа или запчасть"
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setIsPriceFilterOpen((value) => !value)}
            sx={{ minWidth: 140 }}
          >
            Фильтр
          </Button>
        </Box>

        {isPriceFilterOpen && (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Тип устройства</InputLabel>
                <Select
                  value={priceDeviceType}
                  label="Тип устройства"
                  onChange={(event) => {
                    setPriceDeviceType(event.target.value);
                    setPriceBrand('all');
                    setPriceModel('all');
                  }}
                >
                  <MenuItem value="all">Все</MenuItem>
                  {deviceTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {deviceTypeLabels[type] || type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Бренд</InputLabel>
                <Select
                  value={priceBrand}
                  label="Бренд"
                  onChange={(event) => {
                    setPriceBrand(event.target.value);
                    setPriceModel('all');
                  }}
                >
                  <MenuItem value="all">Все бренды</MenuItem>
                  {priceBrandOptions.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Модель</InputLabel>
                <Select value={priceModel} label="Модель" onChange={(event) => setPriceModel(event.target.value)}>
                  <MenuItem value="all">Все модели</MenuItem>
                  {priceModelOptions.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {isPriceEditMode && canEdit && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип</InputLabel>
                  <Select
                    value={newPriceItem.deviceType}
                    label="Тип"
                    onChange={(event) => setNewPriceItem((prev) => ({ ...prev, deviceType: event.target.value }))}
                  >
                    {deviceTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {deviceTypeLabels[type] || type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Модель"
                  value={newPriceItem.model}
                  onChange={(event) => setNewPriceItem((prev) => ({ ...prev, model: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Работа"
                  value={newPriceItem.workName}
                  onChange={(event) => setNewPriceItem((prev) => ({ ...prev, workName: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Запчасть"
                  value={newPriceItem.partName}
                  onChange={(event) => setNewPriceItem((prev) => ({ ...prev, partName: event.target.value }))}
                />
              </Grid>
              <Grid item xs={6} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Запчасть"
                  value={newPriceItem.partCost}
                  onChange={(event) => setNewPriceItem((prev) => ({ ...prev, partCost: Number(event.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={6} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Работа"
                  value={newPriceItem.workCost}
                  onChange={(event) => setNewPriceItem((prev) => ({ ...prev, workCost: Number(event.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <Button fullWidth variant="contained" onClick={addPriceItem}>
                  Добавить
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: 2 }}>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 1,
              maxHeight: '62vh',
              overflow: 'auto',
            }}
          >
            <Button
              fullWidth
              variant={priceDeviceType === 'all' && priceBrand === 'all' && priceModel === 'all' ? 'contained' : 'text'}
              onClick={() => {
                setPriceDeviceType('all');
                setPriceBrand('all');
                setPriceModel('all');
              }}
              sx={{ justifyContent: 'space-between', mb: 0.75 }}
            >
              Все устройства
              <Chip size="small" label={priceList.length} />
            </Button>
            {priceTree.map((typeGroup) => (
              <Box key={typeGroup.type} sx={{ mb: 0.75 }}>
                <Button
                  fullWidth
                  variant={priceDeviceType === typeGroup.type && priceBrand === 'all' && priceModel === 'all' ? 'contained' : 'text'}
                  onClick={() => {
                    setPriceDeviceType(typeGroup.type);
                    setPriceBrand('all');
                    setPriceModel('all');
                  }}
                  sx={{ justifyContent: 'space-between', fontWeight: 800 }}
                >
                  {deviceTypeLabels[typeGroup.type] || typeGroup.type}
                  <Chip size="small" label={typeGroup.total} />
                </Button>
                {typeGroup.brands.map((brandGroup) => (
                  <Box key={`${typeGroup.type}_${brandGroup.brand}`} sx={{ pl: 1.25 }}>
                    <Button
                      fullWidth
                      size="small"
                      variant={priceDeviceType === typeGroup.type && priceBrand === brandGroup.brand && priceModel === 'all' ? 'outlined' : 'text'}
                      onClick={() => {
                        setPriceDeviceType(typeGroup.type);
                        setPriceBrand(brandGroup.brand);
                        setPriceModel('all');
                      }}
                      sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                    >
                      {brandGroup.brand}
                      <Chip size="small" label={brandGroup.total} />
                    </Button>
                    {priceDeviceType === typeGroup.type && priceBrand === brandGroup.brand && (
                      <Box sx={{ pl: 1.25 }}>
                        {brandGroup.models.map((model) => (
                          <Button
                            key={model}
                            fullWidth
                            size="small"
                            variant={priceModel === model ? 'contained' : 'text'}
                            onClick={() => setPriceModel(model)}
                            sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}
                          >
                            {model}
                          </Button>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>

          <Box sx={{ maxHeight: '62vh', overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: isPriceEditMode ? 1050 : 900 }}>
              <Box component="thead" sx={{ bgcolor: 'var(--crm-panel)', position: 'sticky', top: 0, zIndex: 1 }}>
                <Box component="tr">
                  {['Тип', 'Модель', 'Работа', 'Запчасть', 'Цена запчасти', 'Цена работы', 'Итого', isPriceEditMode ? '' : null].filter(Boolean).map((header) => (
                    <Box
                      key={header}
                      component="th"
                      sx={{ p: 1.25, textAlign: 'left', borderBottom: '1px solid', borderColor: 'divider', fontSize: 13 }}
                    >
                      {header}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {filteredPriceList.map((item) => {
                  const total = Number(item.partCost || 0) + Number(item.workCost || 0);
                  return (
                    <Box component="tr" key={item.id}>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {deviceTypeLabels[item.deviceType] || item.deviceType}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 190 }}>
                        {isPriceEditMode && canEdit ? (
                          <TextField size="small" value={item.model} onChange={(event) => updatePriceItem(item.id, { model: event.target.value })} />
                        ) : (
                          item.model
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 210 }}>
                        {isPriceEditMode && canEdit ? (
                          <TextField size="small" value={item.workName} onChange={(event) => updatePriceItem(item.id, { workName: event.target.value })} />
                        ) : (
                          item.workName
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 180 }}>
                        {isPriceEditMode && canEdit ? (
                          <TextField size="small" value={item.partName} onChange={(event) => updatePriceItem(item.id, { partName: event.target.value })} />
                        ) : (
                          item.partName || '-'
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', width: 130 }}>
                        {isPriceEditMode && canEdit ? (
                          <TextField
                            size="small"
                            type="number"
                            value={item.partCost}
                            onChange={(event) => updatePriceItem(item.id, { partCost: Number(event.target.value) || 0 })}
                          />
                        ) : (
                          `${Number(item.partCost || 0).toLocaleString('ru-RU')} ₽`
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', width: 130 }}>
                        {isPriceEditMode && canEdit ? (
                          <TextField
                            size="small"
                            type="number"
                            value={item.workCost}
                            onChange={(event) => updatePriceItem(item.id, { workCost: Number(event.target.value) || 0 })}
                          />
                        ) : (
                          `${Number(item.workCost || 0).toLocaleString('ru-RU')} ₽`
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 800, color: 'primary.main' }}>
                        {total.toLocaleString('ru-RU')} ₽
                      </Box>
                      {isPriceEditMode && (
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', width: 52 }}>
                          {canEdit && (
                            <IconButton size="small" color="error" onClick={() => deletePriceItem(item.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Показано {filteredPriceList.length} строк. Используйте фильтры или поиск, чтобы быстрее найти нужную модель и работу.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderPriceListDialog;
