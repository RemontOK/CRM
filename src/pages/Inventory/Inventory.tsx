import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
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
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  Inventory,
  Warning,
  CheckCircle,
  LocalShipping,
  Category,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

// Mock data
const parts = [
  {
    id: '1',
    name: 'Экран iPhone 14',
    partNumber: 'IP14-SCR-001',
    category: 'Экраны',
    brand: 'Apple',
    model: 'iPhone 14',
    description: 'Оригинальный экран для iPhone 14',
    quantity: 15,
    minQuantity: 5,
    unitPrice: 25000,
    supplier: 'Apple Store',
    supplierContact: '+7 (999) 111-22-33',
    location: 'Склад A, полка 1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Батарея Samsung Galaxy S23',
    partNumber: 'SGS23-BAT-002',
    category: 'Батареи',
    brand: 'Samsung',
    model: 'Galaxy S23',
    description: 'Оригинальная батарея для Samsung Galaxy S23',
    quantity: 8,
    minQuantity: 3,
    unitPrice: 12000,
    supplier: 'Samsung Parts',
    supplierContact: '+7 (999) 222-33-44',
    location: 'Склад B, полка 2',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    name: 'Корпус MacBook Pro 13"',
    partNumber: 'MBP13-CASE-003',
    category: 'Корпуса',
    brand: 'Apple',
    model: 'MacBook Pro 13"',
    description: 'Оригинальный корпус для MacBook Pro 13"',
    quantity: 3,
    minQuantity: 2,
    unitPrice: 45000,
    supplier: 'Apple Store',
    supplierContact: '+7 (999) 111-22-33',
    location: 'Склад A, полка 3',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '4',
    name: 'Камера iPad Air',
    partNumber: 'IPA-CAM-004',
    category: 'Камеры',
    brand: 'Apple',
    model: 'iPad Air',
    description: 'Оригинальная камера для iPad Air',
    quantity: 12,
    minQuantity: 4,
    unitPrice: 18000,
    supplier: 'Apple Store',
    supplierContact: '+7 (999) 111-22-33',
    location: 'Склад A, полка 2',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: '5',
    name: 'Клавиатура MacBook Air',
    partNumber: 'MBA-KBD-005',
    category: 'Клавиатуры',
    brand: 'Apple',
    model: 'MacBook Air',
    description: 'Оригинальная клавиатура для MacBook Air',
    quantity: 1,
    minQuantity: 2,
    unitPrice: 35000,
    supplier: 'Apple Store',
    supplierContact: '+7 (999) 111-22-33',
    location: 'Склад A, полка 4',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
];

const categories = [
  'Экраны',
  'Батареи',
  'Корпуса',
  'Камеры',
  'Клавиатуры',
  'Процессоры',
  'Память',
  'Прочее',
];

const InventoryPage: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleAddPart = () => {
    setIsAddDialogOpen(true);
  };

  const handleViewPart = (part: any) => {
    setSelectedPart(part);
    setIsViewDialogOpen(true);
  };

  const getInventoryStats = () => {
    const totalParts = parts.length;
    const lowStockParts = parts.filter(part => part.quantity <= part.minQuantity).length;
    const totalValue = parts.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0);
    const outOfStockParts = parts.filter(part => part.quantity === 0).length;

    return {
      totalParts,
      lowStockParts,
      totalValue,
      outOfStockParts,
    };
  };

  const getLowStockParts = () => {
    return parts.filter(part => part.quantity <= part.minQuantity);
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || part.category === filterCategory;
    
    let matchesStatus = true;
    if (filterStatus === 'low') {
      matchesStatus = part.quantity <= part.minQuantity;
    } else if (filterStatus === 'out') {
      matchesStatus = part.quantity === 0;
    } else if (filterStatus === 'normal') {
      matchesStatus = part.quantity > part.minQuantity;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Название',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="600">
            {params.value}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.partNumber}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Категория',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color="primary"
          size="small"
        />
      ),
    },
    {
      field: 'brand',
      headerName: 'Бренд',
      width: 100,
    },
    {
      field: 'model',
      headerName: 'Модель',
      width: 120,
    },
    {
      field: 'quantity',
      headerName: 'Количество',
      width: 120,
      renderCell: (params) => {
        const isLowStock = params.value <= params.row.minQuantity;
        const isOutOfStock = params.value === 0;
        
        return (
          <Box display="flex" alignItems="center">
            <Typography 
              variant="body2" 
              color={isOutOfStock ? 'error.main' : isLowStock ? 'warning.main' : 'success.main'}
              fontWeight="600"
            >
              {params.value}
            </Typography>
            {isLowStock && (
              <Warning sx={{ ml: 1, color: 'warning.main', fontSize: 16 }} />
            )}
            {isOutOfStock && (
              <Warning sx={{ ml: 1, color: 'error.main', fontSize: 16 }} />
            )}
          </Box>
        );
      },
    },
    {
      field: 'unitPrice',
      headerName: 'Цена',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          ₽{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'supplier',
      headerName: 'Поставщик',
      width: 150,
    },
    {
      field: 'location',
      headerName: 'Местоположение',
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
            onClick={() => handleViewPart(params.row)}
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Запчасть отредактирована');
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Запчасть удалена');
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  const stats = getInventoryStats();
  const lowStockParts = getLowStockParts();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Склад
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
                      Всего запчастей
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.totalParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Inventory />
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
                      Низкий остаток
                    </Typography>
                    <Typography variant="h5" fontWeight="600" color="warning.main">
                      {stats.lowStockParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Warning />
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
                      Общая стоимость
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      ₽{stats.totalValue.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CheckCircle />
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
                      Нет в наличии
                    </Typography>
                    <Typography variant="h5" fontWeight="600" color="error.main">
                      {stats.outOfStockParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <LocalShipping />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Low Stock Alert */}
        {lowStockParts.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  ⚠️ Внимание! Низкий остаток запчастей
                </Typography>
                <Grid container spacing={1}>
                  {lowStockParts.map((part) => (
                    <Grid item key={part.id}>
                      <Chip
                        label={`${part.name} (${part.quantity}/${part.minQuantity})`}
                        color="warning"
                        variant="outlined"
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Inventory Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {/* Controls */}
              <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    placeholder="Поиск запчастей..."
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
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Статус"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      <MenuItem value="normal">Норма</MenuItem>
                      <MenuItem value="low">Низкий</MenuItem>
                      <MenuItem value="out">Нет</MenuItem>
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
                      setFilterCategory('all');
                      setFilterStatus('all');
                    }}
                  >
                    Сбросить
                  </Button>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddPart}
                  >
                    Добавить запчасть
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={filteredParts}
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
        </Grid>
      </Grid>

      {/* Add Part Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить запчасть</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Артикул"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Бренд"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Модель"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Количество"
                type="number"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Минимальный остаток"
                type="number"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Цена за единицу"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Поставщик"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Местоположение"
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={() => {
            toast.success('Запчасть добавлена');
            setIsAddDialogOpen(false);
          }}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Part Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Информация о запчасти</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedPart.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Артикул: {selectedPart.partNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Категория
                </Typography>
                <Chip
                  label={selectedPart.category}
                  color="primary"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Бренд / Модель
                </Typography>
                <Typography variant="body1">
                  {selectedPart.brand} {selectedPart.model}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Количество
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedPart.quantity} / {selectedPart.minQuantity}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Цена за единицу
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  ₽{selectedPart.unitPrice.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Поставщик
                </Typography>
                <Typography variant="body1">
                  {selectedPart.supplier}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Контакт поставщика
                </Typography>
                <Typography variant="body1">
                  {selectedPart.supplierContact}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Местоположение
                </Typography>
                <Typography variant="body1">
                  {selectedPart.location}
                </Typography>
              </Grid>
              {selectedPart.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Описание
                  </Typography>
                  <Typography variant="body1">
                    {selectedPart.description}
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

export default InventoryPage;