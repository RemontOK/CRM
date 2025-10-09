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
  Autocomplete,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  AttachMoney,
  Description,
  Build,
  LocalShipping,
  Print,
  Phone,
  WhatsApp,
  Telegram,
  CheckCircle,
  Security,
  CleaningServices,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { orderService } from '../../services/orderService';
import { documentService } from '../../services/documentService';
import { clientService } from '../../services/clientService';
import { Order, AcceptanceAct, WorkCompletionAct, Client, Device, WorkItem, OrderPart, PartItem } from '../../types';
import DocumentGenerator from '../../components/DocumentGenerator/DocumentGenerator';
import CreateOrderForm from '../../components/CreateOrderForm/CreateOrderForm';

// Mock data
const orders: Order[] = [];

// Данные для автодополнения
const deviceBrands = [
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 
  'Motorola', 'Nokia', 'Realme', 'Oppo', 'Vivo', 'Honor', 'Asus', 'Lenovo',
  'HP', 'Dell', 'Acer', 'MSI', 'Razer', 'Alienware'
];

const deviceModels = {
  'Apple': ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11', 'iPhone SE', 'iPad Pro', 'iPad Air', 'iPad', 'iPad mini', 'MacBook Pro', 'MacBook Air', 'iMac', 'Mac Studio', 'Mac Pro'],
  'Samsung': ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy Note 20', 'Galaxy A54', 'Galaxy A34', 'Galaxy A24', 'Galaxy Z Fold 5', 'Galaxy Z Flip 5', 'Galaxy Tab S9', 'Galaxy Tab A8', 'Galaxy Watch 6'],
  'Xiaomi': ['Mi 14 Pro', 'Mi 14', 'Mi 13 Pro', 'Mi 13', 'Redmi Note 13 Pro', 'Redmi Note 13', 'Redmi 12', 'POCO X6 Pro', 'POCO F5', 'Mi Pad 6', 'Mi Watch'],
  'Huawei': ['P60 Pro', 'P60', 'Mate 60 Pro', 'Mate 60', 'nova 11', 'nova 10', 'MatePad Pro', 'Watch GT 4'],
  'OnePlus': ['12 Pro', '12', '11 Pro', '11', 'Nord 3', 'Nord CE 3', 'Pad Go'],
  'Google': ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 6 Pro', 'Pixel 6', 'Pixel Tablet', 'Pixel Watch'],
  'Sony': ['Xperia 1 V', 'Xperia 5 V', 'Xperia 10 V', 'WH-1000XM5', 'WF-1000XM5'],
  'LG': ['G8 ThinQ', 'V60 ThinQ', 'Wing', 'Gram', 'UltraGear'],
  'Motorola': ['Edge 40 Pro', 'Edge 40', 'Moto G73', 'Moto G53', 'Razr 40'],
  'Nokia': ['X30 5G', 'G60 5G', 'C31', 'T20', 'XR21'],
  'Realme': ['GT 5', 'GT Neo 6', '11 Pro+', '11 Pro', 'C55'],
  'Oppo': ['Find X6 Pro', 'Find X6', 'Reno 10 Pro', 'Reno 10', 'A78'],
  'Vivo': ['X90 Pro', 'X90', 'V29', 'V27', 'Y36'],
  'Honor': ['Magic 5 Pro', 'Magic 5', '90 Pro', '90', 'X50'],
  'Asus': ['ROG Phone 7', 'ZenFone 10', 'VivoBook', 'ROG Strix', 'TUF Gaming'],
  'Lenovo': ['Legion Y90', 'ThinkPad', 'IdeaPad', 'Yoga', 'Tab P11'],
  'HP': ['Pavilion', 'Envy', 'Spectre', 'EliteBook', 'ProBook'],
  'Dell': ['XPS 13', 'XPS 15', 'Inspiron', 'Latitude', 'Precision'],
  'Acer': ['Aspire', 'Swift', 'Nitro', 'Predator', 'ConceptD'],
  'MSI': ['Stealth', 'Raider', 'Katana', 'Sword', 'Creator'],
  'Razer': ['Blade 15', 'Blade 17', 'Blade Stealth', 'Book 13'],
  'Alienware': ['m15', 'm17', 'x15', 'x17', 'Aurora']
};

const commonDiagnoses = [
  'Треснутый экран',
  'Не включается',
  'Не заряжается',
  'Быстро разряжается',
  'Не работает камера',
  'Не работает звук',
  'Не работает микрофон',
  'Не работает динамик',
  'Не работает Wi-Fi',
  'Не работает Bluetooth',
  'Не работает сенсорный экран',
  'Не работает кнопка питания',
  'Не работает кнопка громкости',
  'Не работает кнопка Home',
  'Не работает Face ID',
  'Не работает Touch ID',
  'Не работает сканер отпечатков',
  'Перегревается',
  'Зависает',
  'Перезагружается',
  'Не видит SIM-карту',
  'Не работает GPS',
  'Не работает датчик приближения',
  'Не работает акселерометр',
  'Не работает гироскоп',
  'Проблемы с сетью',
  'Проблемы с антенной',
  'Проблемы с разъемом зарядки',
  'Проблемы с разъемом наушников',
  'Проблемы с динамиком',
  'Проблемы с вибрацией',
  'Проблемы с подсветкой',
  'Проблемы с дисплеем',
  'Проблемы с батареей',
  'Проблемы с материнской платой',
  'Проблемы с процессором',
  'Проблемы с памятью',
  'Проблемы с накопителем',
  'Проблемы с видеокартой',
  'Проблемы с клавиатурой',
  'Проблемы с тачпадом',
  'Проблемы с веб-камерой',
  'Проблемы с портами',
  'Проблемы с охлаждением',
  'Проблемы с BIOS',
  'Проблемы с операционной системой',
  'Проблемы с программным обеспечением',
  'Другое'
];

const commonWorkNames = [
  'Замена экрана',
  'Замена батареи',
  'Замена кнопки питания',
  'Замена кнопки громкости',
  'Замена динамика',
  'Замена микрофона',
  'Замена камеры',
  'Замена разъема зарядки',
  'Замена разъема наушников',
  'Замена корпуса',
  'Замена материнской платы',
  'Замена процессора',
  'Замена оперативной памяти',
  'Замена накопителя',
  'Замена клавиатуры',
  'Замена тачпада',
  'Замена веб-камеры',
  'Замена системы охлаждения',
  'Замена вентилятора',
  'Замена термопасты',
  'Ремонт кнопки питания',
  'Ремонт кнопки громкости',
  'Ремонт динамика',
  'Ремонт микрофона',
  'Ремонт камеры',
  'Ремонт разъема зарядки',
  'Ремонт разъема наушников',
  'Ремонт корпуса',
  'Ремонт материнской платы',
  'Ремонт системы охлаждения',
  'Диагностика устройства',
  'Диагностика батареи',
  'Диагностика экрана',
  'Диагностика камеры',
  'Диагностика звука',
  'Диагностика сети',
  'Диагностика Bluetooth',
  'Диагностика Wi-Fi',
  'Диагностика GPS',
  'Диагностика сенсоров',
  'Диагностика системы',
  'Прошивка устройства',
  'Восстановление системы',
  'Установка операционной системы',
  'Настройка устройства',
  'Калибровка экрана',
  'Калибровка батареи',
  'Калибровка сенсоров',
  'Очистка от пыли',
  'Очистка системы охлаждения',
  'Очистка разъемов',
  'Обновление программного обеспечения',
  'Восстановление данных',
  'Резервное копирование',
  'Настройка безопасности',
  'Настройка сети',
  'Настройка Bluetooth',
  'Настройка Wi-Fi',
  'Настройка GPS',
  'Настройка уведомлений',
  'Настройка приложений',
  'Оптимизация производительности',
  'Удаление вирусов',
  'Восстановление после вирусов',
  'Ремонт после попадания воды',
  'Ремонт после падения',
  'Ремонт после перегрева',
  'Ремонт после скачка напряжения',
  'Ремонт после механических повреждений',
  'Замена защитного стекла',
  'Установка защитного стекла',
  'Замена пленки',
  'Установка пленки',
  'Чистка устройства',
  'Полировка корпуса',
  'Восстановление внешнего вида',
  'Другое'
];

const allDeviceModels = Object.values(deviceModels).flat();

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
  const [isOrderViewDialogOpen, setIsOrderViewDialogOpen] = useState(false);
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  const [isAddWorkDialogOpen, setIsAddWorkDialogOpen] = useState(false);
  const [isSearchPartsDialogOpen, setIsSearchPartsDialogOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AcceptanceAct | WorkCompletionAct | null>(null);
  const [documentType, setDocumentType] = useState<'acceptance' | 'completion'>('acceptance');
  const [isCreateOrderFormOpen, setIsCreateOrderFormOpen] = useState(false);
  const [isStepByStepOrderOpen, setIsStepByStepOrderOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  
  // Состояние для добавления работы/запчастей
  const [workType, setWorkType] = useState<'work' | 'part'>('work');
  const [workName, setWorkName] = useState('');
  const [workPrice, setWorkPrice] = useState(0);
  const [workQuantity, setWorkQuantity] = useState(1);
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  
  // Состояние для выдачи заказа
  const [testingChecklist, setTestingChecklist] = useState({
    screenWorks: false,
    touchWorks: false,
    cameraWorks: false,
    soundWorks: false,
    chargingWorks: false,
    wifiWorks: false,
    bluetoothWorks: false,
    buttonsWork: false,
    fingerprintWorks: false,
    faceIdWorks: false
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [screenProtection, setScreenProtection] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  
  // Состояние для поэтапного создания заказа
  const [newOrderData, setNewOrderData] = useState({
    // Шаг 1: Клиент
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientNotes: '',
    
    // Шаг 2: Устройство
    deviceType: 'phone' as 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other',
    deviceBrand: '',
    deviceModel: '',
    deviceSerial: '',
    deviceImei: '',
    deviceColor: '',
    deviceCondition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    deviceExternalCondition: '',
    
    // Шаг 3: Проблема
    description: '',
    diagnosis: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    
    // Шаг 4: Стоимость и сроки
    estimatedCost: 0,
    estimatedDays: 1,
    
    // Дополнительные поля
    staffComments: '',
    offerProtection: false,
    offerCleaning: false,
  });
  
  // Состояние для комментариев и истории
  const [orderComments, setOrderComments] = useState<Array<{
    id: string;
    orderId: string;
    author: string;
    comment: string;
    timestamp: Date;
    type: 'comment' | 'status_change' | 'update';
  }>>([]);
  const [ordersData, setOrdersData] = useState<Order[]>(orders);
  
  // Роль пользователя (в реальном приложении будет из контекста авторизации)
  const [userRole] = useState<'employee' | 'client'>('employee'); // По умолчанию сотрудник

  const handleCreateOrder = () => {
    setIsCreateOrderFormOpen(true);
  };

  const handleCreateStepByStepOrder = () => {
    setIsStepByStepOrderOpen(true);
    setCurrentStep(0);
    setNewOrderData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      clientNotes: '',
      deviceType: 'phone',
      deviceBrand: '',
      deviceModel: '',
      deviceSerial: '',
      deviceImei: '',
      deviceColor: '',
      deviceCondition: 'good',
      deviceExternalCondition: 'Сколы, трещины, возможны скрытые дефекты',
      description: '',
      diagnosis: '',
      priority: 'medium',
      estimatedCost: 0,
      estimatedDays: 1,
      staffComments: '',
      offerProtection: false,
      offerCleaning: false,
    });
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepDataChange = (field: string, value: any) => {
    setNewOrderData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateOrderFromSteps = async () => {
    try {
      // Проверяем, существует ли клиент с таким телефоном
      let client = clientService.findClientByPhone(newOrderData.clientPhone);
      
      if (!client) {
        // Создаем нового клиента
        client = clientService.createClient({
          firstName: newOrderData.clientName.split(' ')[0] || '',
          lastName: newOrderData.clientName.split(' ').slice(1).join(' ') || '',
          phone: newOrderData.clientPhone,
          email: newOrderData.clientEmail,
          address: newOrderData.clientAddress,
          notes: newOrderData.clientNotes,
        });
      } else {
        // Обновляем существующего клиента, если изменились данные
        client = clientService.updateClient(client.id, {
          firstName: newOrderData.clientName.split(' ')[0] || '',
          lastName: newOrderData.clientName.split(' ').slice(1).join(' ') || '',
          email: newOrderData.clientEmail,
          address: newOrderData.clientAddress,
          notes: newOrderData.clientNotes,
        }) || client;
      }

      // Создаем устройство
      const device = await orderService.createDevice({
        type: newOrderData.deviceType,
        brand: newOrderData.deviceBrand,
        model: newOrderData.deviceModel,
        serialNumber: newOrderData.deviceSerial,
        imei: newOrderData.deviceImei,
        color: newOrderData.deviceColor,
        condition: newOrderData.deviceCondition,
        externalCondition: newOrderData.deviceExternalCondition,
        clientId: client.id,
      });

      // Создаем заказ
      const order = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: '1', // Временно используем ID техника
        status: 'diagnosis',
        priority: newOrderData.priority,
        description: newOrderData.staffComments,
        diagnosis: newOrderData.diagnosis,
        estimatedCost: newOrderData.estimatedCost,
        estimatedDays: newOrderData.estimatedDays,
        parts: [],
        payments: [],
        isPaid: false,
        // Дополнительные поля для отображения
        clientName: newOrderData.clientName,
        clientPhone: newOrderData.clientPhone,
        deviceBrand: newOrderData.deviceBrand,
        deviceModel: newOrderData.deviceModel,
        deviceSerial: newOrderData.deviceSerial,
        deviceImei: newOrderData.deviceImei,
        deviceColor: newOrderData.deviceColor,
        deviceCondition: newOrderData.deviceCondition,
        deviceExternalCondition: newOrderData.deviceExternalCondition,
      });

      setOrdersData(prev => [...prev, order]);
      setIsStepByStepOrderOpen(false);
      setCurrentStep(0);
      
      toast.success('Заказ успешно создан!');
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      toast.error('Ошибка при создании заказа');
    }
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      // Показываем уведомление только после закрытия документа
      setTimeout(() => {
      toast.success('Заказ успешно создан');
      }, 1000);
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      toast.error('Ошибка при создании заказа');
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderViewDialogOpen(true);
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

  // Функции для связи с клиентом
  const handleCallClient = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsAppClient = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleTelegramClient = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://t.me/${cleanPhone}`, '_blank');
  };

  const handlePrintAcceptanceAct = (order: Order) => {
    // Здесь будет логика печати акта приема-передачи
    toast.success('Печать акта приема-передачи');
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsEditOrderDialogOpen(true);
  };

  const handleSaveOrderEdit = async (updatedData: Partial<Order>) => {
    if (!selectedOrder) return;
    
    try {
      await orderService.updateOrder(selectedOrder.id, updatedData);
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? { ...order, ...updatedData } : order
      ));
      toast.success('Заказ успешно обновлен');
      setIsEditOrderDialogOpen(false);
    } catch (error) {
      console.error('Ошибка при обновлении заказа:', error);
      toast.error('Ошибка при обновлении заказа');
    }
  };

  // Функции для добавления работы/запчастей
  const handleAddWork = (order: Order) => {
    console.log('handleAddWork вызвана с заказом:', order);
    if (!order) {
      console.error('Заказ не передан в handleAddWork');
      toast.error('Заказ не найден');
      return;
    }
    if (!order.id) {
      console.error('У заказа нет ID:', order);
      toast.error('Заказ не имеет ID');
      return;
    }
    
    console.log('Устанавливаем selectedOrder:', order);
    setSelectedOrder(order);
    setIsAddWorkDialogOpen(true);
    
    // Сброс формы при открытии
    setWorkName('');
    setWorkPrice(0);
    setWorkQuantity(1);
    setSelectedPart(null);
    setWorkType('work');
  };

  const handleSearchParts = () => {
    setIsSearchPartsDialogOpen(true);
  };

  const handleAddWorkToOrder = async () => {
    if (!selectedOrder) {
      toast.error('Заказ не выбран');
      return;
    }

    console.log('Проверка selectedOrder:', {
      id: selectedOrder.id,
      orderNumber: selectedOrder.orderNumber,
      parts: selectedOrder.parts,
      finalCost: selectedOrder.finalCost,
      estimatedCost: selectedOrder.estimatedCost
    });

    if (!workName.trim()) {
      toast.error('Введите название работы');
      return;
    }

    if (workPrice <= 0) {
      toast.error('Цена должна быть больше 0');
      return;
    }

    if (workQuantity <= 0) {
      toast.error('Количество должно быть больше 0');
      return;
    }

    try {
      console.log('Добавление работы:', {
        selectedOrder: selectedOrder.id,
        workType,
        workName,
        workPrice,
        workQuantity,
        selectedPart
      });

      // Создаем элемент работы (с запчастью или без)
      const workItem = {
        id: Date.now().toString(),
        partId: selectedPart ? selectedPart.id : 'work_' + Date.now().toString(),
        quantity: workQuantity,
        unitPrice: workPrice, // Стоимость работы за единицу
        totalPrice: workPrice * workQuantity, // Общая стоимость работы
        isUsed: true,
        // Добавляем информацию о работе и запчасти
        workType: selectedPart ? 'work_with_part' : 'work_only',
        workName: workName,
        partInfo: selectedPart ? {
          ...selectedPart,
          // Добавляем стоимость запчасти отдельно
          partCost: selectedPart.price * workQuantity, // Стоимость запчасти
          workCost: workPrice * workQuantity // Стоимость работы
        } : null
      } as OrderPart & { 
        workType: string; 
        workName: string; 
        partInfo?: any & { partCost: number; workCost: number }
      };

      console.log('Созданный workItem:', workItem);

      // Если есть запчасть, проверяем наличие на складе и списываем
      if (selectedPart) {
        const partInStock = mockParts.find(p => p.id === selectedPart.id);
        if (partInStock && partInStock.stock < workQuantity) {
          toast.error(`Недостаточно запчастей на складе. Доступно: ${partInStock.stock} шт.`);
          return;
        }
        
        // Списываем со склада (в реальном приложении это будет API вызов)
        if (partInStock) {
          partInStock.stock -= workQuantity;
          toast.success(`Списано со склада: ${workQuantity} шт. ${selectedPart.name}`);
        }
      }

      // Обновляем заказ с новой работой/запчастью
      const updatedOrder = {
        ...selectedOrder,
        parts: [...(selectedOrder.parts || []), workItem],
        finalCost: (selectedOrder.finalCost || selectedOrder.estimatedCost) + workItem.totalPrice
      };

      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));

      toast.success(`Работа ${selectedPart ? 'с запчастью' : ''} добавлена к заказу`);
      setIsAddWorkDialogOpen(false);
      
      // Сброс формы
      setWorkName('');
      setWorkPrice(0);
      setWorkQuantity(1);
      setSelectedPart(null);
      setWorkType('work');
    } catch (error) {
      console.error('Ошибка при добавлении работы:', error);
      console.error('Детали ошибки:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
        errorStack: error instanceof Error ? error.stack : 'Нет стека',
        selectedOrder: selectedOrder?.id,
        workType,
        workName,
        workPrice,
        workQuantity
      });
      toast.error(`Ошибка при добавлении работы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Моковые данные для запчастей (в реальном приложении будут из API)
  const mockParts = [
    { id: '1', name: 'Экран iPhone 14', category: 'Экраны', brand: 'Apple', price: 15000, stock: 5 },
    { id: '2', name: 'Батарея Samsung Galaxy S21', category: 'Батареи', brand: 'Samsung', price: 3000, stock: 8 },
    { id: '3', name: 'Корпус MacBook Pro 13"', category: 'Корпуса', brand: 'Apple', price: 8000, stock: 3 },
    { id: '4', name: 'Камера iPad Air', category: 'Камеры', brand: 'Apple', price: 5000, stock: 7 },
    { id: '5', name: 'Клавиатура MacBook Air', category: 'Клавиатуры', brand: 'Apple', price: 12000, stock: 2 },
  ];

  const filteredParts = mockParts.filter(part => 
    part.name.toLowerCase().includes(partsSearchTerm.toLowerCase()) ||
    part.category.toLowerCase().includes(partsSearchTerm.toLowerCase()) ||
    part.brand.toLowerCase().includes(partsSearchTerm.toLowerCase())
  );

  // Функции для выдачи заказа
  const handleDeliveryOrder = (order: Order) => {
    console.log('handleDeliveryOrder вызвана с заказом:', order);
    setSelectedOrder(order);
    setPaymentAmount(order.finalCost || order.estimatedCost);
    setIsDeliveryDialogOpen(true);
    console.log('selectedOrder установлен:', order);
  };

  const handleTestingChecklistChange = (key: string, value: boolean) => {
    setTestingChecklist(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckAllTests = () => {
    setTestingChecklist({
      screenWorks: true,
      touchWorks: true,
      cameraWorks: true,
      soundWorks: true,
      chargingWorks: true,
      wifiWorks: true,
      bluetoothWorks: true,
      buttonsWork: true,
      fingerprintWorks: true,
      faceIdWorks: true
    });
    toast.success('Все тесты отмечены как пройденные');
  };

  const handleRemovePart = async (partId: string) => {
    if (!selectedOrder) return;
    
    try {
      const updatedParts = selectedOrder.parts?.filter(part => part.id !== partId) || [];
      const removedPart = selectedOrder.parts?.find(part => part.id === partId);
      const updatedOrder = {
        ...selectedOrder,
        parts: updatedParts,
        finalCost: (selectedOrder.finalCost || selectedOrder.estimatedCost) - (removedPart?.totalPrice || 0)
      };

      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));
      setSelectedOrder(updatedOrder);
      toast.success('Запчасть удалена из заказа');
    } catch (error) {
      console.error('Ошибка при удалении запчасти:', error);
      toast.error('Ошибка при удалении запчасти');
    }
  };

  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return;

    try {
      // Проверяем, что все тесты пройдены
      const allTestsPassed = Object.values(testingChecklist).every(test => test);
      if (!allTestsPassed) {
        toast.error('Не все тесты пройдены. Проверьте чек-лист тестирования.');
        return;
      }

      // Добавляем дополнительные услуги если выбраны
      let additionalServices = [];
      if (screenProtection) {
        additionalServices.push({
          id: Date.now().toString() + '_protection',
          partId: 'screen_protection',
          quantity: 1,
          unitPrice: 2000,
          totalPrice: 2000,
          isUsed: true,
          workType: 'service',
          workName: 'Защита экрана'
        } as OrderPart & { workType: string; workName: string });
      }
      if (cleaning) {
        additionalServices.push({
          id: Date.now().toString() + '_cleaning',
          partId: 'cleaning',
          quantity: 1,
          unitPrice: 1000,
          totalPrice: 1000,
          isUsed: true,
          workType: 'service',
          workName: 'Чистка устройства'
        } as OrderPart & { workType: string; workName: string });
      }

      // Обновляем заказ
      const updatedOrder = {
        ...selectedOrder,
        status: 'completed' as const,
        parts: [...(selectedOrder.parts || []), ...additionalServices],
        finalCost: (selectedOrder.finalCost || selectedOrder.estimatedCost) + 
                   (screenProtection ? 2000 : 0) + 
                   (cleaning ? 1000 : 0),
        isPaid: true,
        completedAt: new Date().toISOString()
      };

      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));

      // Создаем акт выполненных работ
      await handleCreateWorkCompletionAct(updatedOrder);

      toast.success('Заказ успешно выдан клиенту!');
      setIsDeliveryDialogOpen(false);
      
      // Сброс состояния
      setTestingChecklist({
        screenWorks: false,
        touchWorks: false,
        cameraWorks: false,
        soundWorks: false,
        chargingWorks: false,
        wifiWorks: false,
        bluetoothWorks: false,
        buttonsWork: false,
        fingerprintWorks: false,
        faceIdWorks: false
      });
      setScreenProtection(false);
      setCleaning(false);
    } catch (error) {
      console.error('Ошибка при выдаче заказа:', error);
      toast.error('Ошибка при выдаче заказа');
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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

      // Убираем уведомление, так как оно мешает просмотру PDF
      // toast.success('Акт приема-передачи создан');
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
      };

      // Создаем список выполненных работ на основе order.parts
      const worksPerformed: WorkItem[] = [];
      const partsUsed: PartItem[] = [];
      
      if (order.parts && order.parts.length > 0) {
        order.parts.forEach((part) => {
          // Проверяем тип работы
          const workType = (part as any).workType;
          const workName = (part as any).workName;
          
          if (workType === 'work_with_part' || workType === 'work_only') {
            // Это работа
            worksPerformed.push({
              id: part.id,
              name: workName || 'Работа',
              description: workName || 'Выполненная работа',
              cost: part.unitPrice,
              quantity: part.quantity,
              totalCost: part.totalPrice,
            });
            
            // Если есть запчасть, добавляем её в использованные запчасти
            if (workType === 'work_with_part' && (part as any).partInfo) {
              const partInfo = (part as any).partInfo;
              partsUsed.push({
                id: part.id + '_part',
                partId: partInfo.id,
                name: partInfo.name,
                partNumber: partInfo.id,
                unitPrice: partInfo.price, // Цена запчасти за единицу
                quantity: part.quantity,
                totalPrice: partInfo.price * part.quantity, // Общая стоимость запчасти
              });
            }
          } else if (part.partId === 'screen_protection' || part.partId === 'cleaning') {
            // Это дополнительные услуги
            worksPerformed.push({
              id: part.id,
              name: part.partId === 'screen_protection' ? 'Защита экрана' : 'Чистка устройства',
              description: part.partId === 'screen_protection' ? 'Установка защитного стекла' : 'Чистка устройства',
              cost: part.unitPrice,
              quantity: part.quantity,
              totalCost: part.totalPrice,
            });
          } else {
            // Это обычная запчасть (старый формат)
            partsUsed.push({
              id: part.id,
              partId: part.partId,
              name: `Запчасть #${part.id}`,
              partNumber: part.partId,
              unitPrice: part.unitPrice,
              quantity: part.quantity,
              totalPrice: part.totalPrice,
            });
          }
        });
      }
      
      // Если нет работ, добавляем базовую диагностику
      if (worksPerformed.length === 0) {
        worksPerformed.push({
          id: '1',
          name: 'Диагностика',
          description: order.diagnosis || 'Диагностика устройства',
          cost: 1000,
          quantity: 1,
          totalCost: 1000,
        });
      }

      const workCompletionAct = await documentService.createWorkCompletionAct(
        order,
        client,
        device,
        worksPerformed,
        partsUsed, // Использованные запчасти
        order.finalCost || order.estimatedCost, // Используем финальную стоимость
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
          {new Date(params.value).toLocaleDateString('ru-RU')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 350,
      sortable: false,
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* 1. Просмотр страницы заказа */}
          <IconButton
            size="small"
            onClick={() => handleViewOrder(params.row)}
            title="Просмотр заказа - номер телефона, стоимость, связь с клиентом, WhatsApp/Telegram, печать акта"
            sx={{ color: '#FF6B35' }}
          >
            <Visibility />
          </IconButton>
          
          {/* 2. Редактирование заказа */}
          <IconButton
            size="small"
            onClick={() => handleEditOrder(params.row)}
            title="Редактировать заказ - изменить данные и напечатать акт"
            sx={{ color: '#607D8B' }}
          >
            <Edit />
          </IconButton>
          
          {/* 3. Добавить работу/запчасти */}
          <IconButton
            size="small"
            onClick={() => {
              console.log('Клик по кнопке добавления работы в таблице, params.row:', params.row);
              handleAddWork(params.row);
            }}
            title="Добавить работу - запчасти, пленка и другие работы"
            sx={{ color: '#4CAF50' }}
          >
            <Build />
          </IconButton>
          
          {/* 4. Удалить заказ */}
          <IconButton
            size="small"
            onClick={() => handleDeleteOrder(params.row.id)}
            title="Удалить заказ"
            sx={{ color: '#F44336' }}
          >
            <Delete />
          </IconButton>
          
          {/* 5. Выдача заказа клиенту */}
          <IconButton
            size="small"
            onClick={() => {
              console.log('Клик по кнопке выдачи заказа, params.row:', params.row);
              handleDeliveryOrder(params.row);
            }}
            title="Выдача заказа - тестирование перед выдачей, оплата, печать акта выполненных работ"
            sx={{ color: '#FF9800' }}
          >
            <LocalShipping />
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
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateStepByStepOrder}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)',
                  boxShadow: '0 3px 5px 2px rgba(255, 107, 53, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)',
                  }
                }}
              >
                🚀 Создать заказ
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
                  {new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU')}
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

      {/* Order View Dialog */}
      <Dialog open={isOrderViewDialogOpen} onClose={() => setIsOrderViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Просмотр заказа</Typography>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              {/* Основная информация о заказе */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Заказ {selectedOrder.orderNumber}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Статус: <Chip label={selectedOrder.status} color="primary" size="small" />
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Приоритет: <Chip label={selectedOrder.priority} color="secondary" size="small" />
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Дата создания: {new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Стоимость: <strong>{selectedOrder.estimatedCost} ₽</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Оплачено: <strong>{selectedOrder.isPaid ? 'Да' : 'Нет'}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Информация о клиенте */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Информация о клиенте</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Имя: <strong>{selectedOrder.clientName}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Телефон: <strong>{selectedOrder.clientPhone}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Phone />}
                          onClick={() => handleCallClient(selectedOrder.clientPhone || '')}
                        >
                          Позвонить
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<WhatsApp />}
                          onClick={() => handleWhatsAppClient(selectedOrder.clientPhone || '')}
                          sx={{ color: '#25D366' }}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Telegram />}
                          onClick={() => handleTelegramClient(selectedOrder.clientPhone || '')}
                          sx={{ color: '#0088cc' }}
                        >
                          Telegram
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Информация об устройстве */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Информация об устройстве</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Устройство: <strong>{selectedOrder.deviceBrand} {selectedOrder.deviceModel}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Цвет: <strong>{selectedOrder.deviceColor}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        IMEI: <strong>{selectedOrder.deviceImei}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        S/N: <strong>{selectedOrder.deviceSerial}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Описание проблемы */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Описание проблемы</Typography>
                  <Typography variant="body2">
                    {selectedOrder.description || 'Описание не указано'}
                  </Typography>
                </CardContent>
              </Card>

              {/* Действия */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Действия</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<Print />}
                      onClick={() => handlePrintAcceptanceAct(selectedOrder)}
                    >
                      Печать акта приема-передачи
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => {
                        setIsOrderViewDialogOpen(false);
                        handleEditOrder(selectedOrder);
                      }}
                    >
                      Редактировать заказ
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOrderViewDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditOrderDialogOpen} onClose={() => setIsEditOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Редактирование заказа</Typography>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Информация о клиенте */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Информация о клиенте</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Имя клиента"
                    defaultValue={selectedOrder.clientName}
                    disabled
                    helperText="Имя клиента нельзя изменить"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Телефон клиента"
                    defaultValue={selectedOrder.clientPhone}
                    onChange={(e) => {
                      // Обновляем телефон в состоянии
                      setSelectedOrder(prev => prev ? { ...prev, clientPhone: e.target.value } : null);
                    }}
                  />
                </Grid>

                {/* Информация об устройстве */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Информация об устройстве</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Бренд устройства"
                    defaultValue={selectedOrder.deviceBrand}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceBrand: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Модель устройства"
                    defaultValue={selectedOrder.deviceModel}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceModel: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Цвет устройства"
                    defaultValue={selectedOrder.deviceColor}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceColor: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="IMEI"
                    defaultValue={selectedOrder.deviceImei}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceImei: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Серийный номер"
                    defaultValue={selectedOrder.deviceSerial}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceSerial: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Внешний вид"
                    defaultValue={selectedOrder.deviceExternalCondition}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceExternalCondition: e.target.value } : null);
                    }}
                  />
                </Grid>

                {/* Информация о заказе */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Информация о заказе</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Статус заказа</InputLabel>
                    <Select
                      defaultValue={selectedOrder.status}
                      onChange={(e) => {
                        setSelectedOrder(prev => prev ? { ...prev, status: e.target.value as any } : null);
                      }}
                    >
                      <MenuItem value="diagnosis">Диагностика</MenuItem>
                      <MenuItem value="waiting_parts">Ожидание запчастей</MenuItem>
                      <MenuItem value="waiting_client">Ожидание клиента</MenuItem>
                      <MenuItem value="in_progress">В работе</MenuItem>
                      <MenuItem value="completed">Завершен</MenuItem>
                      <MenuItem value="cancelled">Отменен</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Приоритет</InputLabel>
                    <Select
                      defaultValue={selectedOrder.priority}
                      onChange={(e) => {
                        setSelectedOrder(prev => prev ? { ...prev, priority: e.target.value as any } : null);
                      }}
                    >
                      <MenuItem value="low">Низкий</MenuItem>
                      <MenuItem value="medium">Средний</MenuItem>
                      <MenuItem value="high">Высокий</MenuItem>
                      <MenuItem value="urgent">Срочный</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ориентировочная стоимость"
                    type="number"
                    defaultValue={selectedOrder.estimatedCost}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                    }}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, estimatedCost: Number(e.target.value) } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Финальная стоимость"
                    type="number"
                    defaultValue={selectedOrder.finalCost || ''}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                    }}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, finalCost: Number(e.target.value) } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Описание проблемы"
                    multiline
                    rows={3}
                    defaultValue={selectedOrder.description}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, description: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Диагностика"
                    multiline
                    rows={2}
                    defaultValue={selectedOrder.diagnosis}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, diagnosis: e.target.value } : null);
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditOrderDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedOrder) {
                handleSaveOrderEdit(selectedOrder);
              }
            }}
          >
            Сохранить изменения
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Print />}
            onClick={() => {
              if (selectedOrder) {
                handlePrintAcceptanceAct(selectedOrder);
              }
            }}
          >
            Печать акта
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Work Dialog */}
      <Dialog open={isAddWorkDialogOpen} onClose={() => setIsAddWorkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Добавить работу</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Название работы */}
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  options={commonWorkNames}
                  value={workName}
                  onChange={(event, newValue) => {
                    setWorkName(newValue || '');
                  }}
                  onInputChange={(event, newInputValue) => {
                    setWorkName(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Название работы"
                      placeholder="Выберите из списка или введите своё"
                      helperText="Выберите популярную работу или введите название самостоятельно"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Typography variant="body1">{option}</Typography>
                    </Box>
                  )}
                />
              </Grid>

              {/* Добавить запчасть к работе */}
              <Grid item xs={12}>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    🔧 Добавить запчасть к работе
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Если работа требует использования запчасти, выберите её из склада
                  </Typography>
                  <Button
                    variant={selectedPart ? "contained" : "outlined"}
                    fullWidth
                    onClick={handleSearchParts}
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
                        onClick={() => setSelectedPart(null)}
                        sx={{ mt: 1 }}
                      >
                        Убрать запчасть
                      </Button>
                    </Box>
                  )}
                </Card>
              </Grid>

              {/* Выбранная запчасть */}
              {selectedPart && (
                <Grid item xs={12}>
                  <Card sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
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

              {/* Цена */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Цена за единицу"
                  type="number"
                  value={workPrice}
                  onChange={(e) => setWorkPrice(Number(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Количество */}
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

              {/* Итоговая стоимость */}
              <Grid item xs={12}>
                <Card sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="h6" textAlign="center">
                    Итого: {workPrice * workQuantity} ₽
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddWorkDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddWorkToOrder}
            disabled={!workName || workPrice <= 0 || workQuantity <= 0}
          >
            Добавить работу
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Parts Dialog */}
      <Dialog open={isSearchPartsDialogOpen} onClose={() => setIsSearchPartsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Поиск запчастей на складе</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Поиск */}
            <TextField
              fullWidth
              label="Поиск запчастей"
              value={partsSearchTerm}
              onChange={(e) => setPartsSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              }}
              sx={{ mb: 3 }}
            />

            {/* Список запчастей */}
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredParts.map((part) => (
                <Card 
                  key={part.id} 
                  sx={{ 
                    mb: 2, 
                    cursor: 'pointer',
                    border: selectedPart?.id === part.id ? '2px solid #FF6B35' : '1px solid #e0e0e0',
                    '&:hover': { bgcolor: 'grey.50' }
                  }}
                  onClick={() => {
                    setSelectedPart(part);
                    setWorkName(part.name);
                    setWorkPrice(part.price);
                    setIsSearchPartsDialogOpen(false);
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {part.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {part.category} • {part.brand}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="h6" color="primary">
                          {part.price} ₽
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Chip 
                          label={`${part.stock} шт.`} 
                          color={part.stock > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              
              {filteredParts.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Запчасти не найдены
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSearchPartsDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Order Dialog */}
      <Dialog open={isDeliveryDialogOpen} onClose={() => setIsDeliveryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Выдача заказа клиенту</Typography>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Информация о заказе */}
                <Grid item xs={12}>
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Заказ {selectedOrder.orderNumber}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            Клиент: <strong>{selectedOrder.clientName}</strong>
                          </Typography>
                          <Typography variant="body2">
                            Телефон: <strong>{selectedOrder.clientPhone}</strong>
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            Устройство: <strong>{selectedOrder.deviceBrand} {selectedOrder.deviceModel}</strong>
                          </Typography>
                          <Typography variant="body2">
                            Стоимость: <strong>{selectedOrder.finalCost || selectedOrder.estimatedCost} ₽</strong>
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Список запчастей/работ */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Выполненные работы</Typography>
                  <Card>
                    <CardContent>
                      {selectedOrder.parts && selectedOrder.parts.length > 0 ? (
                        <Box>
                          {selectedOrder.parts.map((part, index) => (
                            <Box key={part.id} sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              py: 1,
                              borderBottom: index < selectedOrder.parts!.length - 1 ? '1px solid #e0e0e0' : 'none'
                            }}>
                              <Box>
                                <Typography variant="body1">
                                  {part.partId === 'screen_protection' ? '🛡️ Защита экрана' :
                                   part.partId === 'cleaning' ? '🧽 Чистка устройства' :
                                   (part as any).workType === 'work_with_part' ? `🔧 ${(part as any).workName}` :
                                   (part as any).workType === 'work_only' ? `⚙️ ${(part as any).workName}` :
                                   `🔧 Работа #${index + 1}`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Количество: {part.quantity} • Цена работы: {part.unitPrice} ₽
                                  {(part as any).partInfo && (
                                    <span>
                                      <br />
                                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        📦 Запчасть: {(part as any).partInfo.name} 
                                        {userRole === 'employee' ? (
                                          <span style={{ color: '#FF6B35', fontWeight: 'bold' }}>
                                            {' '}({selectedPart ? (part as any).partInfo.price : 'цена скрыта'} ₽)
                                          </span>
                                        ) : (
                                          <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}>
                                            {' '}(включено в стоимость работы)
                                          </span>
                                        )}
                                      </Typography>
                                    </span>
                                  )}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" color="primary">
                                  {part.totalPrice} ₽
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemovePart(part.id)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                          <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid #FF6B35' }}>
                            <Typography variant="h6" textAlign="right">
                              Итого: {selectedOrder.parts.reduce((sum, part) => sum + part.totalPrice, 0)} ₽
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Работы и запчасти не добавлены
                        </Typography>
                      )}
                      
                      <Button
                        variant="outlined"
                        startIcon={<Build />}
                        onClick={() => {
                          console.log('Клик по кнопке добавления работы, selectedOrder:', selectedOrder);
                          if (selectedOrder) {
                            setIsDeliveryDialogOpen(false);
                            handleAddWork(selectedOrder);
                          } else {
                            toast.error('Заказ не выбран. Попробуйте еще раз.');
                          }
                        }}
                        sx={{ mt: 2 }}
                      >
                        Добавить работу
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Чек-лист тестирования */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Чек-лист тестирования</Typography>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleCheckAllTests}
                      sx={{
                        background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                        boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
                        }
                      }}
                    >
                      Проверил все
                    </Button>
                  </Box>
                  <Card>
                    <CardContent>
                      <Grid container spacing={2}>
                        {[
                          { key: 'screenWorks', label: 'Экран работает корректно' },
                          { key: 'touchWorks', label: 'Сенсорный экран реагирует' },
                          { key: 'cameraWorks', label: 'Камера работает' },
                          { key: 'soundWorks', label: 'Звук работает' },
                          { key: 'chargingWorks', label: 'Зарядка работает' },
                          { key: 'wifiWorks', label: 'Wi-Fi работает' },
                          { key: 'bluetoothWorks', label: 'Bluetooth работает' },
                          { key: 'buttonsWork', label: 'Кнопки работают' },
                          { key: 'fingerprintWorks', label: 'Отпечаток пальца работает' },
                          { key: 'faceIdWorks', label: 'Face ID работает' }
                        ].map((test) => (
                          <Grid item xs={12} md={6} key={test.key}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={testingChecklist[test.key as keyof typeof testingChecklist]}
                                onChange={(e) => handleTestingChecklistChange(test.key, e.target.checked)}
                                style={{ marginRight: 8 }}
                              />
                              <Typography variant="body2">{test.label}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Дополнительные услуги */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Дополнительные услуги</Typography>
                  <Card>
                    <CardContent>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={screenProtection ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<Security />}
                            onClick={() => setScreenProtection(!screenProtection)}
                            sx={{
                              height: 60,
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              background: screenProtection 
                                ? 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)'
                                : 'transparent',
                              borderColor: '#FF6B35',
                              color: screenProtection ? 'white' : '#FF6B35',
                              boxShadow: screenProtection 
                                ? '0 3px 5px 2px rgba(255, 107, 53, .3)'
                                : 'none',
                              '&:hover': {
                                background: screenProtection 
                                  ? 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)'
                                  : 'rgba(255, 107, 53, 0.1)',
                                borderColor: '#E64A19',
                              }
                            }}
                          >
                            🛡️ Защита экрана
                            <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                              +2000 ₽
                            </Typography>
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={cleaning ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<CleaningServices />}
                            onClick={() => setCleaning(!cleaning)}
                            sx={{
                              height: 60,
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              background: cleaning 
                                ? 'linear-gradient(45deg, #2196F3 30%, #42A5F5 90%)'
                                : 'transparent',
                              borderColor: '#2196F3',
                              color: cleaning ? 'white' : '#2196F3',
                              boxShadow: cleaning 
                                ? '0 3px 5px 2px rgba(33, 150, 243, .3)'
                                : 'none',
                              '&:hover': {
                                background: cleaning 
                                  ? 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)'
                                  : 'rgba(33, 150, 243, 0.1)',
                                borderColor: '#1976D2',
                              }
                            }}
                          >
                            🧽 Чистка устройства
                            <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                              +1000 ₽
                            </Typography>
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Оплата */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Оплата</Typography>
                  <Card>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Способ оплаты</InputLabel>
                            <Select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value as any)}
                            >
                              <MenuItem value="cash">Наличные</MenuItem>
                              <MenuItem value="card">Банковская карта</MenuItem>
                              <MenuItem value="online">Онлайн перевод</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Сумма к оплате"
                            type="number"
                            value={paymentAmount + (screenProtection ? 2000 : 0) + (cleaning ? 1000 : 0)}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeliveryDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCompleteDelivery}
            disabled={!Object.values(testingChecklist).every(test => test)}
            startIcon={<LocalShipping />}
          >
            Выдать заказ клиенту
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step by Step Order Creation Dialog */}
      <Dialog open={isStepByStepOrderOpen} onClose={() => setIsStepByStepOrderOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Создание заказа - Шаг {currentStep + 1} из 4</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[0, 1, 2, 3].map((step) => (
                <Box
                  key={step}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: step <= currentStep ? '#FF6B35' : '#e0e0e0',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Шаг 1: Информация о клиенте */}
            {currentStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  👤 Информация о клиенте
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ФИО клиента"
                      value={newOrderData.clientName}
                      onChange={(e) => handleStepDataChange('clientName', e.target.value)}
                      placeholder="Например: Иванов Иван Иванович"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Телефон"
                      value={newOrderData.clientPhone}
                      onChange={(e) => handleStepDataChange('clientPhone', e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email (необязательно)"
                      value={newOrderData.clientEmail}
                      onChange={(e) => handleStepDataChange('clientEmail', e.target.value)}
                      placeholder="client@example.com"
                      type="email"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Шаг 2: Информация об устройстве */}
            {currentStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  📱 Информация об устройстве
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Тип устройства</InputLabel>
                      <Select
                        value={newOrderData.deviceType}
                        onChange={(e) => handleStepDataChange('deviceType', e.target.value)}
                      >
                        <MenuItem value="phone">📱 Телефон</MenuItem>
                        <MenuItem value="tablet">📱 Планшет</MenuItem>
                        <MenuItem value="laptop">💻 Ноутбук</MenuItem>
                        <MenuItem value="desktop">🖥️ Компьютер</MenuItem>
                        <MenuItem value="other">🔧 Другое</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      freeSolo
                      options={deviceBrands}
                      value={newOrderData.deviceBrand}
                      onChange={(event, newValue) => {
                        handleStepDataChange('deviceBrand', newValue || '');
                        handleStepDataChange('deviceModel', ''); // Сбрасываем модель при смене бренда
                      }}
                      onInputChange={(event, newInputValue) => {
                        handleStepDataChange('deviceBrand', newInputValue);
                        handleStepDataChange('deviceModel', ''); // Сбрасываем модель при смене бренда
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Бренд"
                          placeholder="Выберите из списка или введите свой"
                          required
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Typography variant="body1">{option}</Typography>
                        </Box>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      freeSolo
                      options={allDeviceModels}
                      value={newOrderData.deviceModel}
                      onChange={(event, newValue) => {
                        handleStepDataChange('deviceModel', newValue || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        handleStepDataChange('deviceModel', newInputValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Модель"
                          placeholder="Выберите из списка или введите свою"
                          disabled={!newOrderData.deviceBrand}
                          required
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Typography variant="body1">{option}</Typography>
                        </Box>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Цвет"
                      value={newOrderData.deviceColor}
                      onChange={(e) => handleStepDataChange('deviceColor', e.target.value)}
                      placeholder="Синий, черный, белый..."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Серийный номер"
                      value={newOrderData.deviceSerial}
                      onChange={(e) => handleStepDataChange('deviceSerial', e.target.value)}
                      placeholder="ABC123456"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="IMEI (для телефонов)"
                      value={newOrderData.deviceImei}
                      onChange={(e) => handleStepDataChange('deviceImei', e.target.value)}
                      placeholder="123456789012345"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Состояние устройства</InputLabel>
                      <Select
                        value={newOrderData.deviceCondition}
                        onChange={(e) => handleStepDataChange('deviceCondition', e.target.value)}
                      >
                        <MenuItem value="excellent">✨ Отличное</MenuItem>
                        <MenuItem value="good">👍 Хорошее</MenuItem>
                        <MenuItem value="fair">⚠️ Удовлетворительное</MenuItem>
                        <MenuItem value="poor">❌ Плохое</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Внешние дефекты"
                      value={newOrderData.deviceExternalCondition}
                      onChange={(e) => handleStepDataChange('deviceExternalCondition', e.target.value)}
                      placeholder="Сколы, потертости, трещины..."
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Шаг 3: Описание проблемы */}
            {currentStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  🔧 Описание проблемы
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Autocomplete
                      freeSolo
                      options={commonDiagnoses}
                      value={newOrderData.diagnosis}
                      onChange={(event, newValue) => {
                        handleStepDataChange('diagnosis', newValue || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        handleStepDataChange('diagnosis', newInputValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Предварительный диагноз"
                          placeholder="Выберите из списка или введите свой"
                          required
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Typography variant="body1">{option}</Typography>
                        </Box>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        💬 Комментарии для сотрудника
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (только для внутреннего использования)
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      label="Внутренние заметки"
                      value={newOrderData.staffComments}
                      onChange={(e) => handleStepDataChange('staffComments', e.target.value)}
                      placeholder="Дополнительная информация для сотрудников, детали поломки, особые указания..."
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Приоритет заказа</InputLabel>
                      <Select
                        value={newOrderData.priority}
                        onChange={(e) => handleStepDataChange('priority', e.target.value)}
                      >
                        <MenuItem value="low">🟢 Низкий</MenuItem>
                        <MenuItem value="medium">🟡 Средний</MenuItem>
                        <MenuItem value="high">🟠 Высокий</MenuItem>
                        <MenuItem value="urgent">🔴 Срочный</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Шаг 4: Стоимость и сроки */}
            {currentStep === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  💰 Стоимость и сроки
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Ориентировочная стоимость"
                      type="number"
                      value={newOrderData.estimatedCost}
                      onChange={(e) => handleStepDataChange('estimatedCost', Number(e.target.value))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                      }}
                      helperText="Примерная стоимость ремонта"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Срок выполнения (дни)"
                      type="number"
                      value={newOrderData.estimatedDays}
                      onChange={(e) => handleStepDataChange('estimatedDays', Number(e.target.value))}
                      inputProps={{ min: 1, max: 30 }}
                      required
                    />
                  </Grid>
                  
                  {/* Предложения дополнительных услуг */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      🛡️ Дополнительные услуги
                    </Typography>
                    <Card sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={newOrderData.offerProtection ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<Security />}
                            onClick={() => handleStepDataChange('offerProtection', !newOrderData.offerProtection)}
                            sx={{
                              height: 60,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              background: newOrderData.offerProtection 
                                ? 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)'
                                : 'transparent',
                              borderColor: '#FF6B35',
                              color: newOrderData.offerProtection ? 'white' : '#FF6B35',
                              boxShadow: newOrderData.offerProtection 
                                ? '0 3px 5px 2px rgba(255, 107, 53, .3)'
                                : 'none',
                              '&:hover': {
                                background: newOrderData.offerProtection 
                                  ? 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)'
                                  : 'rgba(255, 107, 53, 0.1)',
                                borderColor: '#E64A19',
                              }
                            }}
                          >
                            🛡️ Предложить защиту экрана
                            <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                              +2000 ₽
                            </Typography>
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={newOrderData.offerCleaning ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<CleaningServices />}
                            onClick={() => handleStepDataChange('offerCleaning', !newOrderData.offerCleaning)}
                            sx={{
                              height: 60,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              background: newOrderData.offerCleaning 
                                ? 'linear-gradient(45deg, #2196F3 30%, #42A5F5 90%)'
                                : 'transparent',
                              borderColor: '#2196F3',
                              color: newOrderData.offerCleaning ? 'white' : '#2196F3',
                              boxShadow: newOrderData.offerCleaning 
                                ? '0 3px 5px 2px rgba(33, 150, 243, .3)'
                                : 'none',
                              '&:hover': {
                                background: newOrderData.offerCleaning 
                                  ? 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)'
                                  : 'rgba(33, 150, 243, 0.1)',
                                borderColor: '#1976D2',
                              }
                            }}
                          >
                            🧽 Предложить чистку устройства
                            <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                              +1000 ₽
                            </Typography>
                          </Button>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" gutterBottom>
                        📋 Сводка заказа
                      </Typography>
                      <Typography variant="body2">
                        <strong>Клиент:</strong> {newOrderData.clientName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Телефон:</strong> {newOrderData.clientPhone}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Устройство:</strong> {newOrderData.deviceBrand} {newOrderData.deviceModel}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Диагноз:</strong> {newOrderData.diagnosis}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Стоимость:</strong> {newOrderData.estimatedCost} ₽
                      </Typography>
                      <Typography variant="body2">
                        <strong>Срок:</strong> {newOrderData.estimatedDays} дн.
                      </Typography>
                      {newOrderData.offerProtection && (
                        <Typography variant="body2" color="primary">
                          <strong>+ Защита экрана:</strong> 2000 ₽
                        </Typography>
                      )}
                      {newOrderData.offerCleaning && (
                        <Typography variant="body2" color="primary">
                          <strong>+ Чистка устройства:</strong> 1000 ₽
                        </Typography>
                      )}
                      <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
                        <strong>Итого: {newOrderData.estimatedCost + (newOrderData.offerProtection ? 2000 : 0) + (newOrderData.offerCleaning ? 1000 : 0)} ₽</strong>
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsStepByStepOrderOpen(false)}>
            Отмена
          </Button>
          {currentStep > 0 && (
            <Button onClick={handlePrevStep}>
              Назад
            </Button>
          )}
          {currentStep < 3 ? (
            <Button 
              variant="contained" 
              onClick={handleNextStep}
              disabled={
                (currentStep === 0 && (!newOrderData.clientName || !newOrderData.clientPhone)) ||
                (currentStep === 1 && (!newOrderData.deviceBrand || !newOrderData.deviceModel)) ||
                (currentStep === 2 && !newOrderData.diagnosis)
              }
            >
              Далее
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleCreateOrderFromSteps}
              disabled={!newOrderData.estimatedCost || !newOrderData.estimatedDays}
              sx={{
                background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
                }
              }}
            >
              ✅ Создать заказ
            </Button>
          )}
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