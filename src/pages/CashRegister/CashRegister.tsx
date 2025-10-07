import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  TrendingDown,
  Receipt,
  AccountBalance,
  Schedule,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

// Mock data
const cashOperations = [
  {
    id: '1',
    type: 'income',
    amount: 15000,
    description: 'Оплата заказа #001247',
    category: 'Ремонт',
    orderId: '#001247',
    processedBy: 'Иванов А.А.',
    processedAt: new Date('2024-01-15T10:30:00'),
    notes: 'Полная оплата',
  },
  {
    id: '2',
    type: 'expense',
    amount: 5000,
    description: 'Покупка запчастей',
    category: 'Запчасти',
    processedBy: 'Петров В.В.',
    processedAt: new Date('2024-01-15T14:20:00'),
    notes: 'Экран для iPhone 14',
  },
  {
    id: '3',
    type: 'income',
    amount: 8000,
    description: 'Оплата заказа #001246',
    category: 'Ремонт',
    orderId: '#001246',
    processedBy: 'Сидорова М.А.',
    processedAt: new Date('2024-01-15T16:45:00'),
    notes: 'Частичная оплата',
  },
  {
    id: '4',
    type: 'expense',
    amount: 2000,
    description: 'Коммунальные услуги',
    category: 'Коммунальные',
    processedBy: 'Козлов А.В.',
    processedAt: new Date('2024-01-15T09:00:00'),
    notes: 'Электричество за январь',
  },
  {
    id: '5',
    type: 'income',
    amount: 12000,
    description: 'Оплата заказа #001245',
    category: 'Ремонт',
    orderId: '#001245',
    processedBy: 'Волкова Е.С.',
    processedAt: new Date('2024-01-14T15:30:00'),
    notes: 'Полная оплата',
  },
];

const categories = [
  'Ремонт',
  'Запчасти',
  'Коммунальные',
  'Зарплата',
  'Аренда',
  'Прочее',
];

const CashRegister: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const handleAddOperation = () => {
    setIsAddDialogOpen(true);
  };

  const handleViewOperation = (operation: any) => {
    setSelectedOperation(operation);
    setIsViewDialogOpen(true);
  };

  const getCashStats = () => {
    const totalIncome = cashOperations
      .filter(op => op.type === 'income')
      .reduce((sum, op) => sum + op.amount, 0);
    
    const totalExpense = cashOperations
      .filter(op => op.type === 'expense')
      .reduce((sum, op) => sum + op.amount, 0);
    
    const balance = totalIncome - totalExpense;
    
    return {
      totalIncome,
      totalExpense,
      balance,
      operationsCount: cashOperations.length,
    };
  };

  const filteredOperations = cashOperations.filter(operation => {
    const matchesSearch = operation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.processedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || operation.type === filterType;
    const matchesCategory = filterCategory === 'all' || operation.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const columns: GridColDef[] = [
    {
      field: 'processedAt',
      headerName: 'Дата',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value.toLocaleDateString('ru-RU')}
        </Typography>
      ),
    },
    {
      field: 'type',
      headerName: 'Тип',
      width: 100,
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
      width: 200,
    },
    {
      field: 'category',
      headerName: 'Категория',
      width: 120,
    },
    {
      field: 'amount',
      headerName: 'Сумма',
      width: 120,
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.row.type === 'income' ? 'success.main' : 'error.main'}
          fontWeight="600"
        >
          {params.row.type === 'income' ? '+' : '-'}₽{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'processedBy',
      headerName: 'Обработал',
      width: 150,
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 150,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedOperation(params.row);
              setIsViewDialogOpen(true);
            }}
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Операция отредактирована');
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Операция удалена');
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  const stats = getCashStats();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Касса
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Общий доход
                    </Typography>
                    <Typography variant="h5" color="success.main" fontWeight="600">
                      ₽{stats.totalIncome.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <TrendingUp />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Общий расход
                    </Typography>
                    <Typography variant="h5" color="error.main" fontWeight="600">
                      ₽{stats.totalExpense.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <TrendingDown />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Баланс
                    </Typography>
                    <Typography 
                      variant="h5" 
                      color={stats.balance >= 0 ? 'success.main' : 'error.main'}
                      fontWeight="600"
                    >
                      ₽{stats.balance.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <AccountBalance />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Операций
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.operationsCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <Receipt />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Поиск операций..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              <FormControl fullWidth>
                <InputLabel>Тип</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Тип"
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="income">Доход</MenuItem>
                  <MenuItem value="expense">Расход</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Категория"
                >
                  <MenuItem value="all">Все</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCategory('all');
                }}
              >
                Сбросить
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddOperation}
              >
                Добавить
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Operations Table */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredOperations}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f0f0f0',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #e0e0e0',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Add Operation Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить операцию</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Тип операции</InputLabel>
                <Select
                  defaultValue="income"
                  label="Тип операции"
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
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание"
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  defaultValue=""
                  label="Категория"
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Примечания"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={() => {
            toast.success('Операция добавлена');
            setIsAddDialogOpen(false);
          }}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Operation Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Детали операции</DialogTitle>
        <DialogContent>
          {selectedOperation && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Дата и время
                </Typography>
                <Typography variant="body1">
                  {selectedOperation.processedAt.toLocaleString('ru-RU')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Тип операции
                </Typography>
                <Chip
                  label={selectedOperation.type === 'income' ? 'Доход' : 'Расход'}
                  color={selectedOperation.type === 'income' ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Сумма
                </Typography>
                <Typography 
                  variant="h6"
                  color={selectedOperation.type === 'income' ? 'success.main' : 'error.main'}
                >
                  {selectedOperation.type === 'income' ? '+' : '-'}₽{selectedOperation.amount.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Описание
                </Typography>
                <Typography variant="body1">
                  {selectedOperation.description}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Категория
                </Typography>
                <Typography variant="body1">
                  {selectedOperation.category}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Обработал
                </Typography>
                <Typography variant="body1">
                  {selectedOperation.processedBy}
                </Typography>
              </Grid>
              {selectedOperation.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Примечания
                  </Typography>
                  <Typography variant="body1">
                    {selectedOperation.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CashRegister;