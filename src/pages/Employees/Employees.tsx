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
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  Person,
  Work,
  Star,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

// Mock data
const employees = [
  {
    id: '1',
    name: 'Иванов Алексей Александрович',
    email: 'ivanov@service.com',
    phone: '+7 (999) 123-45-67',
    role: 'technician',
    department: 'Ремонт',
    position: 'Мастер по ремонту',
    salary: 80000,
    rating: 4.8,
    totalOrders: 156,
    completedOrders: 142,
    totalEarnings: 1250000,
    isActive: true,
    hireDate: new Date('2022-03-15'),
    lastLogin: new Date('2024-01-15T09:30:00'),
  },
  {
    id: '2',
    name: 'Петрова Мария Сергеевна',
    email: 'petrova@service.com',
    phone: '+7 (999) 234-56-78',
    role: 'manager',
    department: 'Управление',
    position: 'Менеджер',
    salary: 90000,
    rating: 4.6,
    totalOrders: 89,
    completedOrders: 85,
    totalEarnings: 980000,
    isActive: true,
    hireDate: new Date('2021-08-20'),
    lastLogin: new Date('2024-01-15T08:45:00'),
  },
  {
    id: '3',
    name: 'Сидоров Петр Владимирович',
    email: 'sidorov@service.com',
    phone: '+7 (999) 345-67-89',
    role: 'technician',
    department: 'Ремонт',
    position: 'Мастер по ремонту',
    salary: 75000,
    rating: 4.4,
    totalOrders: 134,
    completedOrders: 128,
    totalEarnings: 1100000,
    isActive: true,
    hireDate: new Date('2022-01-10'),
    lastLogin: new Date('2024-01-14T17:20:00'),
  },
  {
    id: '4',
    name: 'Козлова Анна Дмитриевна',
    email: 'kozlova@service.com',
    phone: '+7 (999) 456-78-90',
    role: 'cashier',
    department: 'Касса',
    position: 'Кассир',
    salary: 60000,
    rating: 4.7,
    totalOrders: 67,
    completedOrders: 65,
    totalEarnings: 450000,
    isActive: true,
    hireDate: new Date('2023-02-01'),
    lastLogin: new Date('2024-01-15T10:15:00'),
  },
  {
    id: '5',
    name: 'Волков Дмитрий Игоревич',
    email: 'volkov@service.com',
    phone: '+7 (999) 567-89-01',
    role: 'admin',
    department: 'Администрация',
    position: 'Директор',
    salary: 120000,
    rating: 4.9,
    totalOrders: 45,
    completedOrders: 43,
    totalEarnings: 800000,
    isActive: true,
    hireDate: new Date('2020-05-15'),
    lastLogin: new Date('2024-01-15T07:30:00'),
  },
];

const roleOptions = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'technician', label: 'Техник' },
  { value: 'cashier', label: 'Кассир' },
];

const Employees: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleAddEmployee = () => {
    setIsAddDialogOpen(true);
  };

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const getEmployeeStats = () => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.isActive).length;
    const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);
    const averageRating = employees.reduce((sum, emp) => sum + emp.rating, 0) / totalEmployees;

    return {
      totalEmployees,
      activeEmployees,
      totalSalary,
      averageRating,
    };
  };

  const getTopPerformers = () => {
    return employees
      .filter(emp => emp.isActive)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && employee.isActive) ||
      (filterStatus === 'inactive' && !employee.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Сотрудник',
      width: 250,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            {params.row.name.split(' ').map((n: string) => n[0]).join('')}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="600">
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.position}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Роль',
      width: 120,
      renderCell: (params) => {
        const roleLabel = roleOptions.find(r => r.value === params.value)?.label || params.value;
        return (
          <Chip
            label={roleLabel}
            color={params.value === 'admin' ? 'error' : params.value === 'manager' ? 'warning' : 'primary'}
            size="small"
          />
        );
      },
    },
    {
      field: 'department',
      headerName: 'Отдел',
      width: 120,
    },
    {
      field: 'rating',
      headerName: 'Рейтинг',
      width: 100,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <Star sx={{ color: 'gold', fontSize: 16, mr: 0.5 }} />
          <Typography variant="body2">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'completedOrders',
      headerName: 'Заказов',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color="success"
          size="small"
        />
      ),
    },
    {
      field: 'salary',
      headerName: 'Зарплата',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          ₽{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Статус',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Активен' : 'Неактивен'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
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
            onClick={() => handleViewEmployee(params.row)}
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Сотрудник отредактирован');
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Сотрудник удален');
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  const stats = getEmployeeStats();
  const topPerformers = getTopPerformers();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Сотрудники
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
                      Всего сотрудников
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.totalEmployees}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Person />
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
                      Активных
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.activeEmployees}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <Work />
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
                      Средний рейтинг
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.averageRating.toFixed(1)}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Star />
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
                      Фонд зарплат
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      ₽{stats.totalSalary.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <TrendingUp />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Performers */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Топ сотрудники
              </Typography>
              {topPerformers.map((employee, index) => (
                <Box key={employee.id} display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {employee.name.split(' ').map((n: string) => n[0]).join('')}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight="600">
                      {employee.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {employee.position}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Box display="flex" alignItems="center">
                      <Star sx={{ color: 'gold', fontSize: 14, mr: 0.5 }} />
                      <Typography variant="body2">
                        {employee.rating}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {employee.completedOrders} заказов
                    </Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Employees Table */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Controls */}
              <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Поиск сотрудников..."
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
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Роль</InputLabel>
                    <Select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      label="Роль"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      {roleOptions.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Статус"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      <MenuItem value="active">Активные</MenuItem>
                      <MenuItem value="inactive">Неактивные</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddEmployee}
                  >
                    Добавить
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ height: 500, width: '100%' }}>
                <DataGrid
                  rows={filteredEmployees}
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

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить сотрудника</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ФИО"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Роль</InputLabel>
                <Select
                  defaultValue=""
                  label="Роль"
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Должность"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Отдел"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Зарплата"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={() => {
            toast.success('Сотрудник добавлен');
            setIsAddDialogOpen(false);
          }}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Информация о сотруднике</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 56, height: 56 }}>
                    {selectedEmployee.name.split(' ').map((n: string) => n[0]).join('')}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedEmployee.name}
                    </Typography>
                    <Typography color="textSecondary">
                      {selectedEmployee.position}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {selectedEmployee.email}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Телефон
                </Typography>
                <Typography variant="body1">
                  {selectedEmployee.phone}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Роль
                </Typography>
                <Chip
                  label={roleOptions.find(r => r.value === selectedEmployee.role)?.label || selectedEmployee.role}
                  color="primary"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Отдел
                </Typography>
                <Typography variant="body1">
                  {selectedEmployee.department}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Рейтинг
                </Typography>
                <Box display="flex" alignItems="center">
                  <Star sx={{ color: 'gold', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="body1">
                    {selectedEmployee.rating}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Зарплата
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  ₽{selectedEmployee.salary.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Завершенных заказов
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedEmployee.completedOrders}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Общий доход
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  ₽{selectedEmployee.totalEarnings.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Дата найма
                </Typography>
                <Typography variant="body1">
                  {selectedEmployee.hireDate.toLocaleDateString('ru-RU')}
                </Typography>
              </Grid>
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

export default Employees;