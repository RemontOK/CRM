import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  Add,
  Delete,
  Edit,
  FilterList,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Visibility,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { CashOperation, Employee, TaxonomyNode } from '../../types';
import { cashService } from '../../services/cashService';
import { taxonomyService } from '../../services/taxonomyService';
import { employeeService } from '../../services/employeeService';
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter';
import { dataGridSx, heroCardSx, pageShellSx, panelCardSx, sectionTitleSx, toolbarCardSx } from '../../styles/ui';
import { useCompanyName } from '../../hooks/useCompanyName';
import { crmColors } from '../../styles/tokens';
import { defaultPeriodFilterValue, isDateWithinRange, PeriodFilterValue } from '../../utils/dateRange';
import { getPaymentMethodLabel } from '../../utils/paymentMethod';
import { appSettingsService } from '../../services/appSettingsService';

const emptyOperation = {
  type: 'income',
  amount: '',
  description: '',
  category: '',
  subcategory: '',
  paymentMethod: 'cash',
  notes: '',
  processedBy: 'Администратор',
  orderId: '',
};

const CASH_GRID_PAGE_SIZE_KEY = 'cash_grid_rows_per_page_v1';
const gridPageSizeOptions = [10, 50, 100];

const getSavedGridPageSize = (key: string) => {
  const value = Number(localStorage.getItem(key));
  return gridPageSizeOptions.includes(value) ? value : 10;
};

const CashRegister: React.FC = () => {
  const companyName = useCompanyName();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<CashOperation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [operationsData, setOperationsData] = useState<CashOperation[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [cashNodes, setCashNodes] = useState<TaxonomyNode[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [newOperation, setNewOperation] = useState(emptyOperation);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(() => defaultPeriodFilterValue('month'));
  const [rowsPerPage, setRowsPerPage] = useState(() => getSavedGridPageSize(CASH_GRID_PAGE_SIZE_KEY));

  const refreshCash = async () => {
    await taxonomyService.refreshFromApi();
    await cashService.refreshFromApi();
    await employeeService.refreshFromApi();
    setOperationsData(cashService.getOperations());
    setEmployeesData(employeeService.getEmployees());
    setCashNodes(taxonomyService.getNodes('cash'));
  };

  useEffect(() => {
    void refreshCash();
  }, []);

  const cashCategories = useMemo(() => cashNodes.filter((node) => !node.parentId), [cashNodes]);
  const employeeOptions = useMemo(
    () => employeesData.filter((employee) => employee.isActive).map((employee) => employee.name).filter(Boolean),
    [employeesData]
  );

  const getCashSubcategories = (parentId: string) => cashNodes.filter((node) => node.parentId === parentId);

  const selectedCashCategoryNode = cashCategories.find((node) => node.name === newOperation.category);
  const availableCashSubcategories = selectedCashCategoryNode
    ? getCashSubcategories(selectedCashCategoryNode.id)
    : [];

  const filteredOperations = useMemo(
    () =>
      operationsData.filter((operation) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          operation.description.toLowerCase().includes(search) ||
          operation.category.toLowerCase().includes(search) ||
          operation.processedBy.toLowerCase().includes(search) ||
          operation.orderId?.toLowerCase().includes(search) ||
          operation.paymentMethod?.toLowerCase().includes(search);

        const matchesType = filterType === 'all' || operation.type === filterType;
        const matchesCategory = filterCategory === 'all' || operation.category === filterCategory;
        const matchesPeriod = isDateWithinRange(operation.processedAt, periodFilter);

        return matchesSearch && matchesType && matchesCategory && matchesPeriod;
      }),
    [filterCategory, filterType, operationsData, periodFilter, searchTerm]
  );

  const stats = useMemo(() => {
    const incomeOperations = filteredOperations.filter((operation) => operation.type === 'income');
    const expenseOperations = filteredOperations.filter((operation) => operation.type === 'expense');

    const totalIncome = incomeOperations.reduce((sum, operation) => sum + operation.amount, 0);
    const totalExpense = expenseOperations.reduce((sum, operation) => sum + operation.amount, 0);

    const sumByMethod = (items: CashOperation[], method: CashOperation['paymentMethod']) =>
      items
        .filter((operation) => (operation.paymentMethod || 'cash') === method)
        .reduce((sum, operation) => sum + operation.amount, 0);

    const cashIncome = sumByMethod(incomeOperations, 'cash');
    const cardIncome = sumByMethod(incomeOperations, 'card');
    const transferIncome = sumByMethod(incomeOperations, 'transfer');

    const cashExpense = sumByMethod(expenseOperations, 'cash');
    const cardExpense = sumByMethod(expenseOperations, 'card');
    const transferExpense = sumByMethod(expenseOperations, 'transfer');

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      operationsCount: filteredOperations.length,
      cashboxBalance: cashIncome - cashExpense,
      terminalBalance: cardIncome - cardExpense,
      transferBalance: transferIncome - transferExpense,
    };
  }, [filteredOperations]);

  const handleCreateCashCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    await taxonomyService.addNode('cash', newCategoryName.trim(), newCategoryParentId || null);
    setNewCategoryName('');
    setNewCategoryParentId('');
    await refreshCash();
    toast.success(newCategoryParentId ? 'Подкатегория добавлена' : 'Категория добавлена');
  };

  const handleDeleteCashCategory = async (node: TaxonomyNode) => {
    const hasOperations = node.parentId
      ? operationsData.some((operation) => operation.subcategory === node.name)
      : operationsData.some((operation) => operation.category === node.name);

    if (hasOperations) {
      toast.error('Сначала измените операции, связанные с этой категорией');
      return;
    }

    await taxonomyService.deleteNode(node.id);
    await refreshCash();
    toast.success('Категория удалена');
  };

  const handleCreateOperation = async () => {
    if (!newOperation.amount || !newOperation.description || !newOperation.category) {
      toast.error('Заполните обязательные поля операции');
      return;
    }

    await cashService.addOperation({
      type: newOperation.type as 'income' | 'expense',
      amount: Number(newOperation.amount),
      description: newOperation.description,
      category: newOperation.category,
      subcategory: newOperation.subcategory || undefined,
      paymentMethod: newOperation.paymentMethod as 'cash' | 'card' | 'transfer' | 'installment',
      registerType:
        newOperation.paymentMethod === 'card'
          ? 'bank_terminal'
          : newOperation.paymentMethod === 'transfer'
            ? 'online'
            : 'cashbox',
      processedBy: newOperation.processedBy,
      source: 'manual',
      notes: newOperation.notes,
      orderId: newOperation.orderId || undefined,
    });

    await refreshCash();
    setIsAddDialogOpen(false);
    setNewOperation(emptyOperation);
    toast.success('Операция добавлена');
  };

  const columns: GridColDef[] = [
    {
      field: 'processedAt',
      headerName: 'Дата',
      width: 130,
      renderCell: (params) => <Typography variant="body2">{params.value.toLocaleDateString('ru-RU')}</Typography>,
    },
    {
      field: 'type',
      headerName: 'Тип',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value === 'income' ? 'Доход' : 'Расход'}
          color={params.value === 'income' ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'description',
      headerName: 'Описание',
      flex: 1,
      minWidth: 220,
    },
    {
      field: 'orderId',
      headerName: 'Заказ',
      width: 120,
      renderCell: (params) => <Typography color="text.secondary">{params.value || 'Без заказа'}</Typography>,
    },
    {
      field: 'category',
      headerName: 'Категория',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.subcategory ? `${params.value} / ${params.row.subcategory}` : params.value}
        </Typography>
      ),
    },
    {
      field: 'paymentMethod',
      headerName: 'Канал',
      width: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          variant="outlined"
          label={getPaymentMethodLabel(params.value, appSettingsService.getSettings().payment.paymentMethodOptions)}
        />
      ),
    },
    {
      field: 'amount',
      headerName: 'Сумма',
      width: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.row.type === 'income' ? 'success.main' : 'error.main'}
          fontWeight={700}
        >
          {params.row.type === 'income' ? '+' : '-'}{params.value.toLocaleString('ru-RU')} ₽
        </Typography>
      ),
    },
    {
      field: 'processedBy',
      headerName: 'Сотрудник',
      width: 170,
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => { setSelectedOperation(params.row); setIsViewDialogOpen(true); }}>
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast('Редактирование этой операции пока недоступно');
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={async () => {
              await cashService.deleteOperation(params.row.id);
              await refreshCash();
              toast.success('Операция удалена');
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', letterSpacing: 1.4 }}>
          ФИНАНСЫ · КАССА
        </Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 1.5, color: 'common.white' }}>
          Касса {companyName}
        </Typography>
        <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)' }}>
          Журнал всех денежных операций по ремонту, продажам, закупкам и внутренним расходам.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {[
        { title: 'Общий доход', value: `${stats.totalIncome.toLocaleString('ru-RU')} ₽`, color: 'success.main', icon: <TrendingUp />, iconColor: crmColors.success },
          { title: 'Общий расход', value: `${stats.totalExpense.toLocaleString('ru-RU')} ₽`, color: 'error.main', icon: <TrendingDown />, iconColor: crmColors.error },
          { title: 'Наличные', value: `${stats.cashboxBalance.toLocaleString('ru-RU')} ₽`, color: stats.cashboxBalance >= 0 ? 'success.main' : 'error.main', icon: <AccountBalance />, iconColor: crmColors.primary },
          { title: 'Карта и переводы', value: `${(stats.terminalBalance + stats.transferBalance).toLocaleString('ru-RU')} ₽`, color: 'text.primary', icon: <Receipt />, iconColor: crmColors.info },
        ].map((item) => (
          <Grid item xs={12} sm={6} xl={3} key={item.title}>
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card sx={{ ...panelCardSx, height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.title}
                      </Typography>
                      <Typography variant="h4" sx={{ mt: 1, color: item.color, fontWeight: 800 }}>
                        {item.value}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: `${item.iconColor}20`, color: item.iconColor }}>{item.icon}</Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Card sx={toolbarCardSx}>
        <CardContent>
          <Grid
            container
            spacing={2}
            alignItems="center"
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 40,
                boxSizing: 'border-box',
              },
              '& .MuiButton-root': {
                height: 40,
                minHeight: 40,
                boxSizing: 'border-box',
              },
            }}
          >
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Поиск по операциям, заказу или сотруднику"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="cash-filter-type-label">Тип</InputLabel>
                <Select
                  labelId="cash-filter-type-label"
                  value={filterType}
                  label="Тип"
                  onChange={(event) => setFilterType(event.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="income">Доход</MenuItem>
                  <MenuItem value="expense">Расход</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="cash-filter-category-label">Категория</InputLabel>
                <Select
                  labelId="cash-filter-category-label"
                  value={filterCategory}
                  label="Категория"
                  onChange={(event) => setFilterCategory(event.target.value)}
                >
                  <MenuItem value="all">Все</MenuItem>
                  {cashCategories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <PeriodFilter value={periodFilter} onChange={setPeriodFilter} size="small" />
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCategory('all');
                  setPeriodFilter(defaultPeriodFilterValue('month'));
                }}
              >
                Сбросить
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="outlined" onClick={() => setIsCategoryDialogOpen(true)}>
                Категории
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button fullWidth variant="contained" startIcon={<Add />} onClick={() => setIsAddDialogOpen(true)}>
                Добавить операцию
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={panelCardSx}>
        <CardContent>
          <Box sx={{ height: 620, width: '100%' }}>
            <DataGrid
              rows={filteredOperations}
              columns={columns}
              pageSize={rowsPerPage}
              rowsPerPageOptions={gridPageSizeOptions}
              onPageSizeChange={(value) => {
                setRowsPerPage(value);
                localStorage.setItem(CASH_GRID_PAGE_SIZE_KEY, String(value));
              }}
              disableSelectionOnClick
              sx={{
                ...dataGridSx,
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Добавить операцию</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Тип операции</InputLabel>
                <Select
                  value={newOperation.type}
                  label="Тип операции"
                  onChange={(event) => setNewOperation((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <MenuItem value="income">Доход</MenuItem>
                  <MenuItem value="expense">Расход</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Сумма"
                type="number"
                value={newOperation.amount}
                onChange={(event) => setNewOperation((prev) => ({ ...prev, amount: event.target.value }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание"
                multiline
                rows={3}
                value={newOperation.description}
                onChange={(event) => setNewOperation((prev) => ({ ...prev, description: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Номер заказа"
                value={newOperation.orderId}
                onChange={(event) => setNewOperation((prev) => ({ ...prev, orderId: event.target.value }))}
                helperText="Заполняется, если операция связана с конкретным заказом"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={newOperation.category}
                  label="Категория"
                  onChange={(event) => setNewOperation((prev) => ({ ...prev, category: event.target.value, subcategory: '' }))}
                >
                  {cashCategories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!newOperation.category || availableCashSubcategories.length === 0}>
                <InputLabel>Подкатегория</InputLabel>
                <Select
                  value={newOperation.subcategory}
                  label="Подкатегория"
                  onChange={(event) => setNewOperation((prev) => ({ ...prev, subcategory: event.target.value }))}
                >
                  <MenuItem value="">Без подкатегории</MenuItem>
                  {availableCashSubcategories.map((subcategory) => (
                    <MenuItem key={subcategory.id} value={subcategory.name}>
                      {subcategory.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Канал оплаты</InputLabel>
                <Select
                  value={newOperation.paymentMethod}
                  label="Канал оплаты"
                  onChange={(event) => setNewOperation((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                >
                  <MenuItem value="cash">Наличные</MenuItem>
                  <MenuItem value="card">Карта</MenuItem>
                  <MenuItem value="transfer">Перевод</MenuItem>
                  <MenuItem value="installment">Рассрочка</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={employeeOptions}
                value={newOperation.processedBy}
                onChange={(_, value) => setNewOperation((prev) => ({ ...prev, processedBy: value || '' }))}
                onInputChange={(_, value) => setNewOperation((prev) => ({ ...prev, processedBy: value }))}
                renderInput={(params) => (
                  <TextField {...params} fullWidth label="Сотрудник" />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Примечания"
                multiline
                rows={2}
                value={newOperation.notes}
                onChange={(event) => setNewOperation((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateOperation}>Добавить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onClose={() => setIsCategoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Категории кассы</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Box display="flex" gap={2} flexWrap="wrap">
                <TextField
                  fullWidth
                  label="Название категории"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                />
                <FormControl sx={{ minWidth: 240 }}>
                  <InputLabel>Родитель</InputLabel>
                  <Select
                    value={newCategoryParentId}
                    label="Родитель"
                    onChange={(event) => setNewCategoryParentId(event.target.value)}
                  >
                    <MenuItem value="">Корневая категория</MenuItem>
                    {cashCategories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={handleCreateCashCategory}>Добавить</Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" flexDirection="column" gap={1.5}>
                {cashCategories.map((category) => (
                  <Box key={category.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={700}>{category.name}</Typography>
                      <IconButton size="small" onClick={() => handleDeleteCashCategory(category)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                    {getCashSubcategories(category.id).length > 0 && (
                      <Box sx={{ mt: 1, ml: 2, display: 'grid', gap: 1 }}>
                        {getCashSubcategories(category.id).map((child) => (
                          <Box key={child.id} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {child.name}
                            </Typography>
                            <IconButton size="small" onClick={() => handleDeleteCashCategory(child)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCategoryDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Детали операции</DialogTitle>
        <DialogContent>
          {selectedOperation && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Дата и время</Typography>
                <Typography>{selectedOperation.processedAt.toLocaleString('ru-RU')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Тип операции</Typography>
                <Chip
                  label={selectedOperation.type === 'income' ? 'Доход' : 'Расход'}
                  color={selectedOperation.type === 'income' ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Сумма</Typography>
                <Typography variant="h6" color={selectedOperation.type === 'income' ? 'success.main' : 'error.main'}>
                  {selectedOperation.type === 'income' ? '+' : '-'}{selectedOperation.amount.toLocaleString('ru-RU')} ₽
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Описание</Typography>
                <Typography>{selectedOperation.description}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Категория</Typography>
                <Typography>
                  {selectedOperation.subcategory
                    ? `${selectedOperation.category} / ${selectedOperation.subcategory}`
                    : selectedOperation.category}
                </Typography>
              </Grid>
              {selectedOperation.orderId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Заказ</Typography>
                  <Typography>{selectedOperation.orderId}</Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Сотрудник</Typography>
                <Typography>{selectedOperation.processedBy}</Typography>
              </Grid>
              {selectedOperation.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Примечания</Typography>
                  <Typography>{selectedOperation.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CashRegister;
