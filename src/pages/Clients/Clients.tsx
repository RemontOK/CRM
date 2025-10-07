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
  Person,
  Phone,
  Email,
  LocationOn,
  StarBorder,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

// Mock data
const clients = [
  {
    id: '1',
    firstName: 'Анна',
    lastName: 'Иванова',
    phone: '+7 (999) 123-45-67',
    email: 'anna.ivanova@email.com',
    address: 'ул. Ленина, д. 10, кв. 5',
    notes: 'VIP клиент',
    totalOrders: 15,
    totalSpent: 125000,
    lastVisit: new Date('2024-01-15'),
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    firstName: 'Петр',
    lastName: 'Петров',
    phone: '+7 (999) 234-56-78',
    email: 'petr.petrov@email.com',
    address: 'ул. Пушкина, д. 25, кв. 12',
    notes: 'Часто заказывает ремонт телефонов',
    totalOrders: 8,
    totalSpent: 45000,
    lastVisit: new Date('2024-01-10'),
    createdAt: new Date('2023-08-20'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    firstName: 'Мария',
    lastName: 'Сидорова',
    phone: '+7 (999) 345-67-89',
    email: 'maria.sidorova@email.com',
    address: 'ул. Гагарина, д. 5, кв. 8',
    notes: 'Предпочитает оригинальные запчасти',
    totalOrders: 12,
    totalSpent: 78000,
    lastVisit: new Date('2024-01-12'),
    createdAt: new Date('2023-07-10'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '4',
    firstName: 'Алексей',
    lastName: 'Козлов',
    phone: '+7 (999) 456-78-90',
    email: 'alexey.kozlov@email.com',
    address: 'ул. Мира, д. 15, кв. 3',
    notes: 'Новый клиент',
    totalOrders: 3,
    totalSpent: 15000,
    lastVisit: new Date('2024-01-08'),
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-08'),
  },
  {
    id: '5',
    firstName: 'Елена',
    lastName: 'Волкова',
    phone: '+7 (999) 567-89-01',
    email: 'elena.volkova@email.com',
    address: 'ул. Советская, д. 30, кв. 15',
    notes: 'Корпоративный клиент',
    totalOrders: 25,
    totalSpent: 200000,
    lastVisit: new Date('2024-01-14'),
    createdAt: new Date('2023-05-15'),
    updatedAt: new Date('2024-01-14'),
  },
];

const Clients: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleAddClient = () => {
    setIsAddDialogOpen(true);
  };

  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  const getClientStats = () => {
    const totalClients = clients.length;
    const newClientsThisMonth = clients.filter(
      client => client.createdAt.getMonth() === new Date().getMonth()
    ).length;
    const totalSpent = clients.reduce((sum, client) => sum + client.totalSpent, 0);
    const averageOrderValue = clients.reduce((sum, client) => sum + client.totalOrders, 0) / totalClients;

    return {
      totalClients,
      newClientsThisMonth,
      totalSpent,
      averageOrderValue,
    };
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Имя',
      width: 200,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            {params.row.firstName[0]}{params.row.lastName[0]}
          </Avatar>
          <Typography variant="body2">
            {params.row.firstName} {params.row.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Телефон',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
    },
    {
      field: 'totalOrders',
      headerName: 'Заказов',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color="primary"
          size="small"
        />
      ),
    },
    {
      field: 'totalSpent',
      headerName: 'Потрачено',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          ₽{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'lastVisit',
      headerName: 'Последний визит',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value.toLocaleDateString('ru-RU')}
        </Typography>
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
            onClick={() => handleViewClient(params.row)}
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Клиент отредактирован');
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Клиент удален');
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  const stats = getClientStats();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Клиенты
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
                      Всего клиентов
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.totalClients}
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
                      Новых в этом месяце
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      {stats.newClientsThisMonth}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <StarBorder />
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
                      Общая сумма
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      ₽{stats.totalSpent.toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Phone />
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
                      Средний чек
                    </Typography>
                    <Typography variant="h5" fontWeight="600">
                      ₽{Math.round(stats.averageOrderValue).toLocaleString()}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <Email />
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Поиск клиентов..."
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
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
              >
                Сбросить
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddClient}
              >
                Добавить клиента
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredClients}
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

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить клиента</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Имя"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Фамилия"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">+7</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Адрес"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Примечания"
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
            toast.success('Клиент добавлен');
            setIsAddDialogOpen(false);
          }}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Информация о клиенте</DialogTitle>
        <DialogContent>
          {selectedClient && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 56, height: 56 }}>
                    {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </Typography>
                    <Typography color="textSecondary">
                      Клиент с {selectedClient.createdAt.toLocaleDateString('ru-RU')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Телефон
                </Typography>
                <Typography variant="body1">
                  {selectedClient.phone}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {selectedClient.email || 'Не указан'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Адрес
                </Typography>
                <Typography variant="body1">
                  {selectedClient.address || 'Не указан'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Всего заказов
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedClient.totalOrders}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Потрачено
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  ₽{selectedClient.totalSpent.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Последний визит
                </Typography>
                <Typography variant="body1">
                  {selectedClient.lastVisit.toLocaleDateString('ru-RU')}
                </Typography>
              </Grid>
              {selectedClient.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Примечания
                  </Typography>
                  <Typography variant="body1">
                    {selectedClient.notes}
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

export default Clients;