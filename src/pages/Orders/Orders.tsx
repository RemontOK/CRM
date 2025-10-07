import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  AttachMoney,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { orderService } from '../../services/orderService';
import { documentService } from '../../services/documentService';
import { Order, AcceptanceAct, WorkCompletionAct, Client, Device, WorkItem } from '../../types';
import DocumentGenerator from '../../components/DocumentGenerator/DocumentGenerator';
import CreateOrderForm from '../../components/CreateOrderForm/CreateOrderForm';

// Mock data
const orders: Order[] = [
  {
    id: '1',
    orderNumber: '#001247',
    clientId: '1',
    deviceId: '1',
    technicianId: '1',
    status: 'completed',
    priority: 'medium',
    description: 'Замена экрана iPhone 14',
    diagnosis: 'Треснутый экран',
    estimatedCost: 25000,
    finalCost: 25000,
    estimatedDays: 2,
    actualDays: 1,
    estimatedTime: '2 дня',
    parts: [],
    payments: [{ id: '1', orderId: '1', amount: 25000, method: 'cash', status: 'completed', processedBy: 'admin', processedAt: new Date() }],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    completedAt: new Date('2024-01-16'),
    isPaid: true,
    clientName: 'Иванова А.А.',
    clientPhone: '+7 (999) 123-45-67',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 14',
    deviceSerial: 'ABC123',
    deviceImei: '123456789012345',
    deviceColor: 'Синий',
    deviceCondition: 'Хорошее',
    deviceExternalCondition: 'Небольшие потертости',
  },
  {
    id: '2',
    orderNumber: '#001246',
    clientId: '2',
    deviceId: '2',
    technicianId: '2',
    status: 'in_progress',
    priority: 'high',
    description: 'Ремонт MacBook Pro',
    diagnosis: 'Не включается',
    estimatedCost: 45000,
    finalCost: undefined,
    estimatedDays: 5,
    actualDays: undefined,
    estimatedTime: '5 дней',
    parts: [],
    payments: [],
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-15'),
    completedAt: undefined,
    isPaid: false,
    clientName: 'Сидорова М.А.',
    clientPhone: '+7 (999) 234-56-78',
    deviceBrand: 'Apple',
    deviceModel: 'MacBook Pro 13"',
    deviceSerial: 'DEF456',
    deviceImei: undefined,
    deviceColor: 'Серый',
    deviceCondition: 'Удовлетворительное',
    deviceExternalCondition: 'Сколы на корпусе',
  },
  {
    id: '3',
    orderNumber: '#001245',
    clientId: '3',
    deviceId: '3',
    technicianId: '1',
    status: 'waiting_parts',
    priority: 'urgent',
    description: 'Замена батареи Samsung Galaxy S23',
    diagnosis: 'Быстро разряжается',
    estimatedCost: 12000,
    finalCost: undefined,
    estimatedDays: 1,
    actualDays: undefined,
    estimatedTime: '1 день',
    parts: [],
    payments: [],
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-14'),
    completedAt: undefined,
    isPaid: false,
    clientName: 'Козлов А.В.',
    clientPhone: '+7 (999) 345-67-89',
    deviceBrand: 'Samsung',
    deviceModel: 'Galaxy S23',
    deviceSerial: 'GHI789',
    deviceImei: '987654321098765',
    deviceColor: 'Черный',
    deviceCondition: 'Отличное',
    deviceExternalCondition: 'Без дефектов',
  },
];

const statusOptions = [
  { value: 'diagnosis', label: 'Диагностика', color: 'info' },
  { value: 'waiting_parts', label: 'Ожидание запчастей', color: 'warning' },
  { value: 'waiting_client', label: 'Ожидание клиента', color: 'warning' },
  { value: 'in_progress', label: 'В работе', color: 'primary' },
  { value: 'completed', label: 'Завершен', color: 'success' },
  { value: 'cancelled', label: 'Отменен', color: 'error' },
  { value: 'pending', label: 'Ожидает', color: 'default' },
];

const priorityOptions = [
  { value: 'low', label: 'Низкий', color: 'success' },
  { value: 'medium', label: 'Средний', color: 'warning' },
  { value: 'high', label: 'Высокий', color: 'error' },
  { value: 'urgent', label: 'Срочный', color: 'error' },
];

const deviceTypes = ['phone', 'tablet', 'laptop', 'desktop', 'other'];
const deviceConditions = ['excellent', 'good', 'fair', 'poor'];

const Orders: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AcceptanceAct | WorkCompletionAct | null>(null);
  const [documentType, setDocumentType] = useState<'acceptance' | 'completion'>('acceptance');
  const [isCreateOrderFormOpen, setIsCreateOrderFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [ordersData, setOrdersData] = useState<Order[]>(orders);

  const handleCreateOrder = () => {
    setIsCreateOrderFormOpen(true);
  };

  const handleOrderFormSubmit = async (formData: any) => {
    try {
      // Создаем клиента
      const client: Client = {
        id: Date.now().toString(),
        firstName: formData.clientName.split(' ')[0] || '',
        lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
        phone: formData.phone,
        email: formData.email || '',
        address: '',
        notes: '',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Создаем устройство
      const device: Device = {
        id: Date.now().toString(),
        type: 'phone',
        brand: 'Apple',
        model: formData.model || 'iPhone',
        serialNumber: formData.serialNumber,
        imei: formData.imei,
        color: formData.color,
        condition: 'fair',
        externalCondition: formData.appearance || 'Не указано',
        clientId: client.id,
        createdAt: new Date(),
      };

      // Создаем заказ
      const newOrder: Order = {
        id: Date.now().toString(),
        orderNumber: `#${String(Date.now()).slice(-6)}`,
        clientId: client.id,
        deviceId: device.id,
        technicianId: '1',
        status: 'diagnosis',
        priority: 'medium',
        description: formData.reasonForContact,
        diagnosis: 'Требуется диагностика',
        estimatedCost: formData.estimatedPrice || 0,
        finalCost: undefined,
        estimatedDays: 1,
        actualDays: undefined,
        estimatedTime: '1 день',
        parts: [],
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: undefined,
        isPaid: false,
        clientName: formData.clientName,
        clientPhone: formData.phone,
        deviceBrand: device.brand,
        deviceModel: device.model,
        deviceSerial: formData.serialNumber,
        deviceImei: formData.imei,
        deviceColor: formData.color,
        deviceCondition: device.condition,
        deviceExternalCondition: formData.appearance || 'Не указано',
      };

      // Добавляем заказ в список
      setOrdersData(prev => [newOrder, ...prev]);

      // Создаем акт приема-передачи
      await handleCreateAcceptanceAct(newOrder, client, device, formData);

      toast.success('Заказ успешно создан');
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      toast.error('Ошибка при создании заказа');
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder(order);
    setIsPaymentDialogOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await orderService.deleteOrder(orderId);
      setOrdersData(prev => prev.filter(order => order.id !== orderId));
      toast.success('Заказ удален');
    } catch (error) {
      toast.error('Ошибка при удалении заказа');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus as any);
      setOrdersData(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));
      toast.success('Статус заказа обновлен');
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
    }
  };

  // Создание акта приема-передачи при создании заказа
  const handleCreateAcceptanceAct = async (order: Order, client?: Client, device?: Device, formData?: any) => {
    try {
      // Используем переданные данные или создаем из заказа
      const clientData = client || {
        id: order.clientId,
        firstName: order.clientName?.split(' ')[0] || 'Неизвестно',
        lastName: order.clientName?.split(' ')[1] || 'Неизвестно',
        phone: order.clientPhone || '',
        email: '',
        address: '',
        notes: '',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deviceData = device || {
        id: order.deviceId,
        type: 'phone',
        brand: order.deviceBrand || '',
        model: order.deviceModel || '',
        serialNumber: order.deviceSerial,
        imei: order.deviceImei,
        color: order.deviceColor,
        condition: order.deviceCondition as any || 'good',
        externalCondition: order.deviceExternalCondition,
        clientId: order.clientId,
        createdAt: new Date(),
      };

      const acceptanceAct = await documentService.createAcceptanceAct(
        order,
        clientData,
        deviceData,
        formData?.reasonForContact || order.description,
        formData?.estimatedPrice || order.estimatedCost,
        'Мастер', // В реальном приложении из контекста пользователя
        'Устройство принимается на диагностику и ремонт. В случае отказа от ремонта взимается плата за диагностику.'
      );

      // Автоматически открываем документ для печати
      setSelectedDocument(acceptanceAct);
      setDocumentType('acceptance');
      setIsDocumentDialogOpen(true);

      toast.success('Акт приема-передачи создан');
    } catch (error) {
      toast.error('Ошибка при создании акта приема-передачи');
    }
  };

  // Создание акта выполненных работ при завершении заказа
  const handleCreateWorkCompletionAct = async (order: Order) => {
    try {
      const client: Client = {
        id: order.clientId,
        firstName: order.clientName?.split(' ')[0] || 'Неизвестно',
        lastName: order.clientName?.split(' ')[1] || 'Неизвестно',
        phone: order.clientPhone || '',
        email: '',
        address: '',
        notes: '',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const device: Device = {
        id: order.deviceId,
        type: 'phone',
        brand: order.deviceBrand || '',
        model: order.deviceModel || '',
        serialNumber: order.deviceSerial,
        imei: order.deviceImei,
        color: order.deviceColor,
        condition: order.deviceCondition as any || 'good',
        externalCondition: order.deviceExternalCondition,
        clientId: order.clientId,
        createdAt: new Date(),
      };

      const worksPerformed: WorkItem[] = [
        {
          id: '1',
          name: 'Диагностика',
          description: order.diagnosis || 'Диагностика устройства',
          cost: 1000,
          quantity: 1,
          totalCost: 1000,
        },
        {
          id: '2',
          name: 'Ремонт',
          description: order.description,
          cost: order.estimatedCost - 1000,
          quantity: 1,
          totalCost: order.estimatedCost - 1000,
        },
      ];

      const workCompletionAct = await documentService.createWorkCompletionAct(
        order,
        client,
        device,
        worksPerformed,
        [], // Использованные запчасти
        order.estimatedCost,
        30, // Гарантия 30 дней
        'Мастер'
      );

      // Автоматически открываем документ для печати
      setSelectedDocument(workCompletionAct);
      setDocumentType('completion');
      setIsDocumentDialogOpen(true);

      toast.success('Акт выполненных работ создан');
    } catch (error) {
      toast.error('Ошибка при создании акта выполненных работ');
    }
  };

  // Обработка подписи документа
  const handleDocumentSign = async (signatureData: string, signerRole: 'client' | 'master') => {
    if (selectedDocument) {
      try {
        await documentService.addSignature(
          selectedDocument.id,
          documentType,
          signatureData,
          signerRole === 'client' ? selectedDocument.client.firstName + ' ' + selectedDocument.client.lastName : 'Мастер',
          signerRole
        );
        toast.success('Подпись добавлена');
      } catch (error) {
        toast.error('Ошибка при добавлении подписи');
      }
    }
  };

  // Просмотр документа
  const handleViewDocument = async (order: Order, type: 'acceptance' | 'completion') => {
    try {
      let document: AcceptanceAct | WorkCompletionAct | null = null;
      
      if (type === 'acceptance') {
        document = await documentService.getAcceptanceActByOrderId(order.id);
      } else {
        document = await documentService.getWorkCompletionActByOrderId(order.id);
      }

      if (document) {
        setSelectedDocument(document);
        setDocumentType(type);
        setIsDocumentDialogOpen(true);
      } else {
        toast.error('Документ не найден');
      }
    } catch (error) {
      toast.error('Ошибка при загрузке документа');
    }
  };

  const filteredOrders = ordersData.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceBrand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceModel?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: 'Номер заказа',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'clientName',
      headerName: 'Клиент',
      width: 150,
    },
    {
      field: 'deviceInfo',
      headerName: 'Устройство',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="600">
            {params.row.deviceBrand} {params.row.deviceModel}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.deviceSerial}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Статус',
      width: 150,
      renderCell: (params) => {
        const status = statusOptions.find(s => s.value === params.value);
        return (
          <Chip
            label={status?.label || params.value}
            color={status?.color as any || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'priority',
      headerName: 'Приоритет',
      width: 120,
      renderCell: (params) => {
        const priority = priorityOptions.find(p => p.value === params.value);
        return (
          <Chip
            label={priority?.label || params.value}
            color={priority?.color as any || 'default'}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'estimatedCost',
      headerName: 'Стоимость',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          ₽{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Дата создания',
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
      width: 300,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleViewOrder(params.row)}
            title="Просмотр заказа"
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleViewDocument(params.row, 'acceptance')}
            title="Акт приема-передачи"
          >
            📄
          </IconButton>
          {params.row.status === 'completed' && (
            <IconButton
              size="small"
              onClick={() => handleViewDocument(params.row, 'completion')}
              title="Акт выполненных работ"
            >
              ✅
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => {
              toast.success('Заказ отредактирован');
            }}
            title="Редактировать"
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handlePayment(params.row)}
            title="Оплата"
          >
            <AttachMoney />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteOrder(params.row.id)}
            title="Удалить"
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Заказы
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Поиск заказов..."
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
                <InputLabel>Статус</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Статус"
                >
                  <MenuItem value="all">Все</MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  label="Приоритет"
                >
                  <MenuItem value="all">Все</MenuItem>
                  {priorityOptions.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
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
                  setFilterStatus('all');
                  setFilterPriority('all');
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
                onClick={handleCreateOrder}
              >
                Создать заказ
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredOrders}
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

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Информация о заказе</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Заказ {selectedOrder.orderNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Клиент
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.clientName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedOrder.clientPhone}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Устройство
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.deviceBrand} {selectedOrder.deviceModel}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Серийный номер: {selectedOrder.deviceSerial}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Описание проблемы
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.description}
                </Typography>
              </Grid>
              {selectedOrder.diagnosis && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Диагноз
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.diagnosis}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Статус
                </Typography>
                <Chip
                  label={statusOptions.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                  color={statusOptions.find(s => s.value === selectedOrder.status)?.color as any || 'default'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Приоритет
                </Typography>
                <Chip
                  label={priorityOptions.find(p => p.value === selectedOrder.priority)?.label || selectedOrder.priority}
                  color={priorityOptions.find(p => p.value === selectedOrder.priority)?.color as any || 'default'}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Стоимость
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  ₽{selectedOrder.estimatedCost.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Срок выполнения
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.estimatedTime || `${selectedOrder.estimatedDays} дней`}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Дата создания
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.createdAt.toLocaleDateString('ru-RU')}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>
            Закрыть
          </Button>
          <Button variant="contained" onClick={() => {
            if (selectedOrder) {
              // Создаем временный элемент для печати
              const printElement = document.createElement('div');
              printElement.innerHTML = `
                <h2>Заказ ${selectedOrder.orderNumber}</h2>
                <p>Клиент: ${selectedOrder.clientName}</p>
                <p>Устройство: ${selectedOrder.deviceBrand} ${selectedOrder.deviceModel}</p>
                <p>Описание: ${selectedOrder.description}</p>
                <p>Стоимость: ₽${selectedOrder.estimatedCost.toLocaleString()}</p>
              `;
              document.body.appendChild(printElement);
              window.print();
              document.body.removeChild(printElement);
            }
          }}>
            Печать документов
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Оплата заказа</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">
                  Заказ {selectedOrder.orderNumber}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Сумма к оплате: ₽{selectedOrder.estimatedCost.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Способ оплаты</InputLabel>
                  <Select defaultValue="cash" label="Способ оплаты">
                    <MenuItem value="cash">Наличные</MenuItem>
                    <MenuItem value="card">Карта</MenuItem>
                    <MenuItem value="transfer">Перевод</MenuItem>
                    <MenuItem value="installment">Рассрочка</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Сумма"
                  type="number"
                  defaultValue={selectedOrder.estimatedCost}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  }}
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={() => {
            toast.success('Оплата добавлена');
            setIsPaymentDialogOpen(false);
          }}>
            Добавить оплату
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Generator */}
      <DocumentGenerator
        open={isDocumentDialogOpen}
        onClose={() => setIsDocumentDialogOpen(false)}
        document={selectedDocument}
        documentType={documentType}
        onSign={handleDocumentSign}
      />

      {/* Create Order Form */}
      <CreateOrderForm
        open={isCreateOrderFormOpen}
        onClose={() => setIsCreateOrderFormOpen(false)}
        onSubmit={handleOrderFormSubmit}
      />
    </Box>
  );
};

export default Orders;