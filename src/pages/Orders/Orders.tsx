import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Avatar,
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
  Menu,
  Grid,
  InputAdornment,
  Autocomplete,
  Stack,
  Alert,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  AttachMoney,
  Savings,
  Description,
  Build,
  LocalShipping,
  Print,
  Phone,
  Telegram,
  Sms,
  Send,
  ContentCopy,
  Close,
  Security,
  ChatBubbleOutline,
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { orderService } from '../../services/orderService';
import { getApiErrorMessage } from '../../services/api';
import { documentService } from '../../services/documentService';
import {
  enrichAcceptanceActForDisplay,
  enrichActDeviceFromOrder,
  getOrderInternalNotes,
  prepareAcceptanceActClient,
} from '../../utils/acceptanceActFields';
import { getOrderProblemForDocuments, getOrderStatedProblem } from '../../utils/orderProblemText';
import { notifyAutoStatusSmsToasts } from '../../utils/orderSmsNotifications';
import { calcEstimatedCompletionDate } from '../../utils/orderDates';
import { clientService } from '../../services/clientService';
import { inventoryService } from '../../services/inventoryService';
import { taxonomyService } from '../../services/taxonomyService';
import { cashService } from '../../services/cashService';
import { employeeService } from '../../services/employeeService';
import { smsService } from '../../services/smsService';
import { telegramService } from '../../services/telegramService';
import {
  appSettingsService,
  getCompletedOrderStatus,
  getDefaultOpenOrderStatus,
  getEnabledOrderStatuses,
  getOrderStatusDefinition,
  getCancelledOrderStatus,
  getReadyOrderStatus,
  isFinalOrderStatus,
} from '../../services/appSettingsService';
import {
  Order,
  OrderCommunicationEntry,
  AcceptanceAct,
  WorkCompletionAct,
  Client,
  Device,
  WorkItem,
  OrderPart,
  PartItem,
  Employee,
  TaxonomyNode,
  TelegramInboxItem,
} from '../../types';
import OrderEditDialog from '../../components/OrderEditDialog/OrderEditDialog';
import OrderAddWorkDialog, { AddWorkFormValues } from '../../components/OrderAddWorkDialog/OrderAddWorkDialog';
import OrderMasterCommentField from '../../components/OrderMasterCommentField/OrderMasterCommentField';
import OrderCommunicationComposer from '../../components/OrderCommunicationComposer/OrderCommunicationComposer';
import OrderPriceListDialog from '../../components/OrderPriceListDialog/OrderPriceListDialog';
import DataExchangeDialog from '../../components/DataExchangeDialog/DataExchangeDialog';
import {
  ORDER_EXCHANGE_COLUMNS,
  exportOrderRows,
  importOrderRows,
  orderTemplateSamples,
} from '../../utils/ordersExchange';
import OrderDeliveryDialog, {
  OrderDeliveryCompletePayload,
} from '../../components/OrderDeliveryDialog/OrderDeliveryDialog';
import QuickReceivePartDialog, {
  QuickReceiveFormValues,
  emptyQuickReceiveForm,
} from '../../components/QuickReceivePartDialog/QuickReceivePartDialog';
import QuickWorkDialog, { QuickWorkFormValues } from '../../components/QuickWorkDialog/QuickWorkDialog';
import StatusBadgeSelector from '../../components/StatusBadgeSelector/StatusBadgeSelector';
import { getDefaultClientType } from '../../components/ClientTypeSelector/ClientTypeSelector';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { OrderCreationSubmitPayload } from '../../components/OrderCreationWizard/OrderCreationWizard';
import {
  buildClientPayloadFromFields,
  collectClientFieldValues,
  validateClientFieldsForOrder,
} from '../../utils/clientFieldUtils';
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter';
import { useAuth } from '../../hooks/useAuth';
import { defaultPeriodFilterValue, isDateWithinRange, PeriodFilterValue, PeriodPreset } from '../../utils/dateRange';
import {
  getOrderDebt,
  getOrderMarginBase,
  getOrderPaidAmount,
  getOrderPartsCost,
  getOrderTotal,
} from '../../utils/orderMetrics';
import { getOrderLineTitle, getWorkTypeLabel } from '../../utils/orderPartDisplay';
import { formatPhone, normalizePhoneForCompare, normalizePhoneForStorage } from '../../utils/phone';
import { getPaymentMethodLabel } from '../../utils/paymentMethod';
import { isTelegramItemUnread } from '../../hooks/useTelegramInbox';
import { markTelegramInboxRead, subscribeTelegramInbox, getTelegramInboxSnapshot } from '../../services/telegramInboxStore';
import {
  communicationChatAreaSx,
  communicationComposerInputSx,
  communicationComposerSx,
  communicationDialogPaperSx,
  dashedDividerSx,
  getChatBubbleStyles,
  highlightCardSx,
  infoPanelSx,
  mergeSx,
  nestedPanelSx,
  selectableCardSx,
  totalPanelSx,
} from '../../styles/ui';

const DocumentGenerator = React.lazy(() => import('../../components/DocumentGenerator/DocumentGenerator'));
const CreateOrderForm = React.lazy(() => import('../../components/CreateOrderForm/CreateOrderForm'));
const OrderCreationWizard = React.lazy(() => import('../../components/OrderCreationWizard/OrderCreationWizard'));


// Mock data
const mergeOrderInList = (orders: Order[], nextOrder: Order) =>
  orders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
// Data for autocomplete
const deviceBrands = [
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 
  'Motorola', 'Nokia', 'Realme', 'Oppo', 'Vivo', 'Honor', 'Asus', 'Lenovo',
  'HP', 'Dell', 'Acer', 'MSI', 'Razer', 'Alienware', 'Прочее'
];

const emptyAddWorkForm: AddWorkFormValues = {
  workName: '',
  workPrice: '',
  workQuantity: 1,
  workWarrantyDays: '30',
  allowWithoutPart: false,
};

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
  'Другое',
];

const customWorkNamesStorageKey = 'crm_custom_work_names';

const priorityOptions = [
  { value: 'low', label: 'Низкий', color: 'success' },
  { value: 'medium', label: 'Средний', color: 'warning' },
  { value: 'high', label: 'Высокий', color: 'error' },
  { value: 'urgent', label: 'Срочный', color: 'error' },
];

const ORDERS_GRID_LAYOUT_KEY = 'orders_grid_layout_v1';
const ORDERS_FILTERS_KEY = 'orders_filters_v1';
const ordersFilterScopes = ['all', 'active', 'completed', 'cancelled', 'paid'] as const;
const ordersPeriodPresets: PeriodPreset[] = ['all', 'today', 'week', 'month', 'quarter', 'year'];

type OrdersFilterState = {
  filterScope: typeof ordersFilterScopes[number];
  filterStatus: string;
  filterPriority: string;
  periodFilter: PeriodFilterValue;
};

const defaultOrdersFilters = (): OrdersFilterState => ({
  filterScope: 'active',
  filterStatus: 'all',
  filterPriority: 'all',
  periodFilter: defaultPeriodFilterValue('all'),
});

const loadOrdersFilters = (): OrdersFilterState => {
  const fallback = defaultOrdersFilters();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(ORDERS_FILTERS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<OrdersFilterState>;
    const scope = ordersFilterScopes.includes(parsed.filterScope as typeof ordersFilterScopes[number])
      ? (parsed.filterScope as typeof ordersFilterScopes[number])
      : fallback.filterScope;
    const status = typeof parsed.filterStatus === 'string' ? parsed.filterStatus : fallback.filterStatus;
    const priority = typeof parsed.filterPriority === 'string' ? parsed.filterPriority : fallback.filterPriority;
    const period = parsed.periodFilter
      && typeof parsed.periodFilter === 'object'
      && typeof parsed.periodFilter.preset === 'string'
      && (ordersPeriodPresets as readonly string[]).includes(parsed.periodFilter.preset)
      ? {
          preset: parsed.periodFilter.preset as PeriodPreset,
          from: typeof parsed.periodFilter.from === 'string' ? parsed.periodFilter.from : '',
          to: typeof parsed.periodFilter.to === 'string' ? parsed.periodFilter.to : '',
        }
      : fallback.periodFilter;
    return { filterScope: scope, filterStatus: status, filterPriority: priority, periodFilter: period };
  } catch {
    return fallback;
  }
};

const saveOrdersFilters = (state: OrdersFilterState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ORDERS_FILTERS_KEY, JSON.stringify(state));
  } catch {
    /* quota or disabled storage — ignore */
  }
};

type OrdersColumnLayout = {
  order: string[];
  widths: Record<string, number>;
  rowsPerPage?: number;
};

const Orders: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const location = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isOrderViewDialogOpen, setIsOrderViewDialogOpen] = useState(false);
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  const [isAddWorkDialogOpen, setIsAddWorkDialogOpen] = useState(false);
  const [isSearchPartsDialogOpen, setIsSearchPartsDialogOpen] = useState(false);
  const [isQuickReceiveDialogOpen, setIsQuickReceiveDialogOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] = useState(false);
  const [isWarrantyDialogOpen, setIsWarrantyDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AcceptanceAct | WorkCompletionAct | null>(null);
  const [documentType, setDocumentType] = useState<'acceptance' | 'completion'>('acceptance');
  const [isCreateOrderFormOpen, setIsCreateOrderFormOpen] = useState(false);
  const [isStepByStepOrderOpen, setIsStepByStepOrderOpen] = useState(false);
  const [isQuickSaleDialogOpen, setIsQuickSaleDialogOpen] = useState(false);
  const [isQuickWorkDialogOpen, setIsQuickWorkDialogOpen] = useState(false);
  const [activeQuickSaleId, setActiveQuickSaleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const initialFilters = useMemo(loadOrdersFilters, []);
  const [filterScope, setFilterScope] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'paid'>(initialFilters.filterScope);
  const [filterStatus, setFilterStatus] = useState(initialFilters.filterStatus);
  const [filterPriority, setFilterPriority] = useState(initialFilters.filterPriority);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(initialFilters.periodFilter);

  useEffect(() => {
    saveOrdersFilters({ filterScope, filterStatus, filterPriority, periodFilter });
  }, [filterScope, filterStatus, filterPriority, periodFilter]);
  const [tabValue, setTabValue] = useState(0);
  const [communicationChannel, setCommunicationChannel] = useState<'telegram' | 'sms'>('telegram');
  const [isSendingCommunication, setIsSendingCommunication] = useState(false);
  const [warrantySourceOrderNumber, setWarrantySourceOrderNumber] = useState('');
  const [isWarrantyCreating, setIsWarrantyCreating] = useState(false);
  useEffect(() => {
    const openPriceList = () => setIsPriceDialogOpen(true);
    const openDataExchange = () => setDataExchangeOpen(true);
    window.addEventListener('crm:open-price-list', openPriceList);
    window.addEventListener('crm:open-orders-data-exchange', openDataExchange);
    return () => {
      window.removeEventListener('crm:open-price-list', openPriceList);
      window.removeEventListener('crm:open-orders-data-exchange', openDataExchange);
    };
  }, []);

  useEffect(() => {
    if ((!isOrderViewDialogOpen && !isCommunicationDialogOpen) || !selectedOrder?.id) {
      return undefined;
    }

    const orderId = selectedOrder.id;
    let lastSignature = '';

    const refreshOrderHistory = async () => {
      const freshOrder = await orderService.getOrderById(orderId);
      if (!freshOrder) {
        return;
      }
      const history = freshOrder.communicationHistory || [];
      const signature = [
        String(freshOrder.updatedAt || ''),
        String(freshOrder.status || ''),
        String(history.length),
        String(history[history.length - 1]?.id || ''),
        String(history[history.length - 1]?.message || ''),
      ].join('|');
      if (signature === lastSignature) {
        return;
      }
      lastSignature = signature;
      setSelectedOrder(freshOrder);
      setOrdersData((prev) => prev.map((order) => (order.id === freshOrder.id ? freshOrder : order)));
    };

    void refreshOrderHistory();

    const pollMs = isCommunicationDialogOpen ? 10_000 : 25_000;
    const tick = () => {
      if (document.hidden) {
        return;
      }
      void refreshOrderHistory();
    };

    const timer = window.setInterval(tick, pollMs);

    const handleVisibility = () => {
      if (!document.hidden) {
        void refreshOrderHistory();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOrderViewDialogOpen, isCommunicationDialogOpen, selectedOrder?.id]);

  // Add work / part form state
  const [workType, setWorkType] = useState<'work' | 'part'>('work');
  const [addWorkInitialForm, setAddWorkInitialForm] = useState<AddWorkFormValues>(emptyAddWorkForm);
  const [addWorkFormKey, setAddWorkFormKey] = useState(0);
  const [customWorkNames, setCustomWorkNames] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(customWorkNamesStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : [];
    } catch {
      return [];
    }
  });
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const debouncedPartsSearchTerm = useDebouncedValue(partsSearchTerm, 300);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [quickReceiveInitial, setQuickReceiveInitial] = useState<QuickReceiveFormValues>(emptyQuickReceiveForm());
  const [partsCategoryFilter, setPartsCategoryFilter] = useState('');
  const [partsBrandFilter, setPartsBrandFilter] = useState('');
  const [partsModelFilter, setPartsModelFilter] = useState('');
  const [quickSaleForm, setQuickSaleForm] = useState({
    partId: '',
    quantity: 1,
    salePrice: '',
    paymentMethod: 'cash',
    note: '',
  });
  
  // Delivery flow state moved into OrderDeliveryDialog
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'installment'>('cash');
  const [quickPaymentAmount, setQuickPaymentAmount] = useState(0);
  const [quickPaymentNotes, setQuickPaymentNotes] = useState('');
  const [paymentDialogMode, setPaymentDialogMode] = useState<'payment' | 'advance'>('payment');
  
  const [ordersData, setOrdersData] = useState<Order[]>(() => orderService.getCachedOrders());
  const [dataExchangeOpen, setDataExchangeOpen] = useState(false);
  const [inventoryParts, setInventoryParts] = useState(() => inventoryService.getParts());
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>(() => taxonomyService.getNodes('inventory'));
  const [managerOptions, setManagerOptions] = useState(() => employeeService.getEmployeesByRole('manager'));
  const [technicianOptions, setTechnicianOptions] = useState(() => employeeService.getEmployeesByRole('technician'));
  const [assigneeOptions, setAssigneeOptions] = useState(() => employeeService.getEmployees());
  const [crmSettings, setCrmSettings] = useState(() => appSettingsService.getSettings());
  const [orderClients, setOrderClients] = useState(() => clientService.getClients());
  const telegramInbox = useSyncExternalStore(
    subscribeTelegramInbox,
    getTelegramInboxSnapshot,
    () => [] as TelegramInboxItem[]
  );

  const [columnLayout, setColumnLayout] = useState<OrdersColumnLayout>(() => {
    try {
      const raw = localStorage.getItem(ORDERS_GRID_LAYOUT_KEY);
      if (!raw) {
        return { order: [], widths: {} };
      }
      const parsed = JSON.parse(raw) as OrdersColumnLayout;
      const savedRowsPerPage = [10, 50, 100].includes(Number(parsed.rowsPerPage))
        ? Number(parsed.rowsPerPage)
        : undefined;
      return {
        order: Array.isArray(parsed.order) ? parsed.order : [],
        widths: parsed.widths || {},
        rowsPerPage: savedRowsPerPage,
      };
    } catch {
      return { order: [], widths: {} };
    }
  });
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersRowsPerPage, setOrdersRowsPerPage] = useState(() => columnLayout.rowsPerPage || 10);
  
  const orderStatusOptions = React.useMemo(
    () =>
      getEnabledOrderStatuses(crmSettings).map((status) => ({
        value: status.code,
        label: status.label,
        color: status.color,
        isFinal: status.isFinal,
      })),
    [crmSettings]
  );
  const defaultOpenStatusCode = React.useMemo(() => getDefaultOpenOrderStatus(crmSettings), [crmSettings]);
  const readyStatusCode = React.useMemo(() => getReadyOrderStatus(crmSettings), [crmSettings]);
  const waitingPartsStatusCode = React.useMemo(
    () => orderStatusOptions.find((status) => status.value === 'waiting_parts')?.value || '',
    [orderStatusOptions]
  );
  const completedStatusCode = React.useMemo(() => getCompletedOrderStatus(crmSettings), [crmSettings]);
  const cancelledStatusCode = React.useMemo(() => getCancelledOrderStatus(crmSettings), [crmSettings]);

  React.useEffect(() => {
    if (!location.search) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const scope = params.get('scope');
    const status = params.get('status');
    const period = params.get('period') as PeriodPreset | null;

    if (scope && ordersFilterScopes.includes(scope as typeof ordersFilterScopes[number])) {
      setFilterScope(scope as typeof ordersFilterScopes[number]);
    }

    if (status) {
      setFilterStatus(status);
    }

    if (period && ordersPeriodPresets.includes(period)) {
      setPeriodFilter(defaultPeriodFilterValue(period));
    }
  }, [location.search]);

  const deviceBrandOptions = React.useMemo(() => {
    const dynamicBrands = ordersData
      .map((order) => order.deviceBrand || '')
      .filter((brand) => brand.trim().length > 0);
    return Array.from(new Set([...deviceBrands, ...dynamicBrands]))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, [ordersData]);

  const ensureFullOrder = async (order: Order): Promise<Order> => {
    const fullOrder = await orderService.getOrderById(order.id);
    if (!fullOrder) {
      return order;
    }
    setOrdersData((prev) => mergeOrderInList(prev, fullOrder));
    return fullOrder;
  };

  const refreshInventoryCatalog = async () => {
    await Promise.all([inventoryService.refreshPartsOnly(), taxonomyService.refreshFromApi()]);
    setInventoryParts(inventoryService.getParts());
    setTaxonomyNodes(taxonomyService.getNodes('inventory'));
  };

  useEffect(() => {
    const loadOrders = async () => {
      const [savedOrders, nextSettings] = await Promise.all([
        orderService.getOrders({ lite: true }),
        appSettingsService.refreshFromApi(),
        employeeService.refreshFromApi(),
      ]);

      setOrdersData(savedOrders);
      setCrmSettings(nextSettings);
      setManagerOptions(employeeService.getEmployeesByRole('manager'));
      setTechnicianOptions(employeeService.getEmployeesByRole('technician'));
      setAssigneeOptions(employeeService.getEmployees());

      void refreshInventoryCatalog();
    };

    loadOrders();
  }, []);

  useEffect(() => {
    localStorage.setItem(ORDERS_GRID_LAYOUT_KEY, JSON.stringify(columnLayout));
  }, [columnLayout]);

  const getStatusOption = (status: Order['status']) => {
    const definition = getOrderStatusDefinition(status, crmSettings);
    return {
      value: definition.code,
      label: definition.label,
      color: definition.color,
      isFinal: definition.isFinal,
    };
  };

  const getPriorityOption = (priority: Order['priority']) =>
    priorityOptions.find((option) => option.value === priority) || priorityOptions[1];

  const createHistoryEntry = (
    channel: OrderCommunicationEntry['channel'],
    message: string
  ) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    channel,
    author: user?.name || 'Сотрудник',
    message,
    createdAt: new Date().toISOString(),
  });

  const appendOrderHistory = (order: Order, entries: Array<ReturnType<typeof createHistoryEntry>>) => ({
    ...order,
    communicationHistory: [...(order.communicationHistory || []), ...entries],
  });

  const isClientCommunicationEntry = (entry: OrderCommunicationEntry) =>
    entry.channel === 'whatsapp' || entry.channel === 'telegram' || entry.channel === 'sms';

  const getClientCommunicationHistory = (order: Order) =>
    (order.communicationHistory || []).filter(isClientCommunicationEntry);

  const getOrderInternalHistory = (order: Order) =>
    (order.communicationHistory || []).filter((entry) => !isClientCommunicationEntry(entry));

  const getChannelCommunicationHistory = (order: Order, channel: 'telegram' | 'sms') =>
    getClientCommunicationHistory(order).filter((entry) => entry.channel === channel);

  const isInboundCommunicationEntry = (entry: OrderCommunicationEntry) =>
    entry.direction === 'inbound' ||
    (entry.message || '').startsWith('Входящая SMS') ||
    (entry.message || '').startsWith('Входящее Telegram');

  const formatCommunicationBubbleText = (entry: OrderCommunicationEntry) => {
    const text = entry.message || '';
    const textMarker = 'Текст: ';
    if (text.includes(textMarker)) {
      return text.slice(text.indexOf(textMarker) + textMarker.length).trim();
    }
    const prefixes = [
      'Исходящее Telegram: ',
      'Входящее Telegram: ',
      'Telegram: ',
      'WhatsApp: ',
    ];
    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        return text.slice(prefix.length).trim();
      }
    }
    if (text.startsWith('Входящая SMS с ')) {
      const idx = text.indexOf(': ');
      return idx >= 0 ? text.slice(idx + 2).trim() : text;
    }
    if (text.startsWith('Исходящая SMS на ')) {
      const idx = text.lastIndexOf(': ');
      return idx >= 0 ? text.slice(idx + 2).trim() : text;
    }
    return text;
  };

  const getClientInitials = (name?: string) => {
    const parts = (name || 'К').trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'К';
  };

  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCommunicationDialogOpen) {
      return;
    }
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [
    isCommunicationDialogOpen,
    selectedOrder?.communicationHistory,
    communicationChannel,
  ]);

  const getHistoryChannelLabel = (channel: string, entry?: OrderCommunicationEntry) => {
    switch (channel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'telegram':
        if (entry?.direction === 'inbound' || (entry?.message || '').startsWith('Входящее Telegram')) {
          return 'Telegram от клиента';
        }
        return 'Telegram';
      case 'sms':
        if (entry?.direction === 'inbound' || (entry?.message || '').startsWith('Входящая SMS')) {
          return 'SMS от клиента';
        }
        return 'SMS';
      case 'internal':
        return 'Комментарий мастеру';
      case 'payment':
        return 'Оплата';
      default:
        return 'Система';
    }
  };

  const isActiveOrder = (order: Order) => !isFinalOrderStatus(order.status, crmSettings);

  const getEmployeeByOrderRole = (
    order: Order,
    role: 'technician' | 'intake' | 'delivery'
  ): Employee | null => {
    const employees = employeeService.getEmployees();
    const normalize = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const findByName = (name?: string) => {
      const normalized = normalize(name);
      if (!normalized) {
        return null;
      }
      return (
        employees.find((item) => normalize(item.name) === normalized) ||
        employees.find((item) => normalize(item.name).includes(normalized) || normalized.includes(normalize(item.name))) ||
        null
      );
    };

    if (role === 'technician') {
      if (order.technicianId) {
        return employees.find((item) => item.id === order.technicianId) || null;
      }
      return findByName(order.technicianName);
    }

    if (role === 'intake') {
      if (!order.intakeManagerName) {
        return null;
      }
      return findByName(order.intakeManagerName);
    }

    if (!order.deliveryManagerName) {
      return null;
    }
    return findByName(order.deliveryManagerName);
  };

  const getOrderRoleRates = (order: Order) => {
    const settings = appSettingsService.getSettings();
    const technician = getEmployeeByOrderRole(order, 'technician');
    const intakeManager = getEmployeeByOrderRole(order, 'intake');
    const deliveryManager = getEmployeeByOrderRole(order, 'delivery');
    const pickRate = (value: number | undefined, fallback: number) => {
      if (typeof value === 'number' && value > 0) {
        return value;
      }
      return fallback;
    };

    return {
      technicianRate: pickRate(technician?.executionRate, settings.employees.defaultExecutionRate),
      intakeRate: pickRate(intakeManager?.intakeRate, settings.employees.defaultIntakeRate),
      deliveryRate: pickRate(deliveryManager?.deliveryRate, settings.employees.defaultDeliveryRate),
    };
  };

  const getOrderEarningsBreakdown = (order: Order) => {
    const baseAmount = getOrderMarginBase(order);
    const { technicianRate, intakeRate, deliveryRate } = getOrderRoleRates(order);
    const hasTechnician = Boolean(order.technicianId || (order.technicianName || '').trim());
    const hasIntake = Boolean((order.intakeManagerName || '').trim());
    const hasDelivery = Boolean((order.deliveryManagerName || '').trim());

    return {
      baseAmount,
      technicianAmount: hasTechnician ? (baseAmount * technicianRate) / 100 : 0,
      intakeAmount: hasIntake ? (baseAmount * intakeRate) / 100 : 0,
      deliveryAmount: hasDelivery ? (baseAmount * deliveryRate) / 100 : 0,
      technicianRate: hasTechnician ? technicianRate : 0,
      intakeRate: hasIntake ? intakeRate : 0,
      deliveryRate: hasDelivery ? deliveryRate : 0,
    };
  };

  const notifyOrderCreationSms = (createdOrder: Order) => {
    notifyAutoStatusSmsToasts(createdOrder, Date.now() - 15000);
  };

  const persistOrderChanges = async (
    baseOrder: Order,
    updatedOrder: Order,
    successMessage: string
  ) => {
    const smsSinceMs = Date.now() - 15000;
    const statusChanged =
      updatedOrder.status !== undefined && updatedOrder.status !== baseOrder.status;
    const savedOrder = await orderService.updateOrder(baseOrder.id, updatedOrder);
    if (statusChanged) {
      notifyAutoStatusSmsToasts(savedOrder, smsSinceMs);
    }
    setOrdersData((prev) => prev.map((order) => (order.id === baseOrder.id ? savedOrder : order)));
    setSelectedOrder((prev) => (prev && prev.id === baseOrder.id ? savedOrder : prev));
    void syncOrderDocumentsQuiet(savedOrder);
    toast.success(successMessage);
  };

  const handleQuickOrderUpdate = async (changes: Partial<Order>) => {
    if (!selectedOrder) return;

    const currentOrder = ordersData.find((order) => order.id === selectedOrder.id) || selectedOrder;
    const historyEntries: Array<ReturnType<typeof createHistoryEntry>> = [];

    if (changes.status && changes.status !== currentOrder.status) {
      historyEntries.push(
        createHistoryEntry(
          'system',
          `Статус изменен: "${getStatusOption(currentOrder.status).label}" → "${getStatusOption(changes.status).label}".`
        )
      );
    }
    if (changes.priority && changes.priority !== currentOrder.priority) {
      historyEntries.push(
        createHistoryEntry(
          'system',
          `Приоритет изменен: "${getPriorityOption(currentOrder.priority).label}" → "${getPriorityOption(changes.priority).label}".`
        )
      );
    }
    if (typeof changes.technicianName === 'string' && changes.technicianName !== (currentOrder.technicianName || '')) {
      historyEntries.push(createHistoryEntry('system', `Исполнитель назначен: ${changes.technicianName || 'Не назначен'}.`));
    }
    if (typeof changes.intakeManagerName === 'string' && changes.intakeManagerName !== (currentOrder.intakeManagerName || '')) {
      historyEntries.push(createHistoryEntry('system', `Принял менеджер: ${changes.intakeManagerName || 'Не назначен'}.`));
    }
    if (typeof changes.deliveryManagerName === 'string' && changes.deliveryManagerName !== (currentOrder.deliveryManagerName || '')) {
      historyEntries.push(createHistoryEntry('system', `Выдает менеджер: ${changes.deliveryManagerName || 'Не назначен'}.`));
    }

    const updatedOrder = appendOrderHistory({ ...currentOrder, ...changes }, historyEntries);

    setSelectedOrder(updatedOrder);

    try {
      await persistOrderChanges(currentOrder, updatedOrder, 'Заказ обновлен');
    } catch (error) {
      setSelectedOrder(currentOrder);
      toast.error('Не удалось сохранить изменения');
    }
  };

  const handleInlineStatusChange = async (order: Order, nextStatus: Order['status']) => {
    if (order.status === nextStatus) {
      return;
    }

    const historyEntries = [
      createHistoryEntry(
        'system',
        `Статус изменен: "${getStatusOption(order.status).label}" → "${getStatusOption(nextStatus).label}".`
      ),
    ];
    const updatedOrder = appendOrderHistory({ ...order, status: nextStatus }, historyEntries);

    try {
      await persistOrderChanges(order, updatedOrder, 'Статус заказа обновлен');
    } catch (error) {
      toast.error('Не удалось обновить статус');
    }
  };

  const buildIntegrationLink = (
    template: string,
    order: Order,
    message: string
  ) => {
    const phone = order.clientPhone || '';
    const phoneDigits = phone.replace(/[^\d]/g, '');
    const siteUrl = window.location.origin;
    const device = [order.deviceBrand, order.deviceModel].filter(Boolean).join(' ');
    const botUsername = crmSettings.integrations.telegramBotUsername?.replace(/^@/, '') || '';
    const telegramStartSuffix = phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;
    const telegramStartParam = telegramStartSuffix ? `link_${telegramStartSuffix}` : '';
    const telegramBotLink = botUsername
      ? telegramStartParam
        ? `https://t.me/${botUsername}?start=${telegramStartParam}`
        : `https://t.me/${botUsername}`
      : '';

    return template
      .replaceAll('{{phone}}', phone)
      .replaceAll('{{phoneDigits}}', phoneDigits)
      .replaceAll('{{message}}', message)
      .replaceAll('{{messageEncoded}}', encodeURIComponent(message))
      .replaceAll('{{telegramBotLink}}', telegramBotLink)
      .replaceAll('{{telegramStartParam}}', telegramStartParam)
      .replaceAll('{{ФИОКлиента}}', order.clientName || '')
      .replaceAll('{{НомерЗаказа}}', order.orderNumber || '')
      .replaceAll('{{Устройство}}', device)
      .replaceAll('{{siteUrl}}', siteUrl)
      .replaceAll('{{siteUrlEncoded}}', encodeURIComponent(siteUrl))
      .replaceAll('{{ТелефонКомпании}}', appSettingsService.getSettings().business.phone || '');
  };

  const getExternalTelegramLink = (order: Order, message: string) => {
    const settings = appSettingsService.getSettings();
    if (settings.integrations.telegramMode === 'crm') {
      return '';
    }
    return buildIntegrationLink(settings.integrations.telegramLinkTemplate, order, message);
  };

  const openExternalTelegram = (order: Order, message: string) => {
    const link = getExternalTelegramLink(order, message);
    if (!link) {
      toast.error('Внешний Telegram не настроен');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const getClientTelegramChatId = (order: Order): string => {
    if (!order.clientId) {
      return '';
    }
    const client = clientService.getClients().find((item) => item.id === order.clientId);
    return client?.telegramChatId?.trim() || '';
  };

  const getTelegramBotLink = (order: Order): string => {
    const username = crmSettings.integrations.telegramBotUsername?.replace(/^@/, '') || '';
    if (!username) {
      return '';
    }
    const digits = (order.clientPhone || '').replace(/\D/g, '');
    const suffix = digits.length > 10 ? digits.slice(-10) : digits;
    if (!suffix) {
      return `https://t.me/${username}`;
    }
    return `https://t.me/${username}?start=link_${suffix}`;
  };

  const copyTelegramBotLink = async (order: Order) => {
    const link = getTelegramBotLink(order);
    if (!link) {
      toast.error('Подключите Telegram-бота в настройках');
      return;
    }
    const { copyTextToClipboard, shareTextOrLink } = await import('../../utils/clipboard');
    if (await copyTextToClipboard(link)) {
      toast.success('Ссылка скопирована');
      return;
    }
    if (await shareTextOrLink(link, 'Ссылка на Telegram-бота')) {
      return;
    }
    toast.error('Удержите ссылку ниже и выберите «Копировать»');
  };

  const handleCreateOrder = () => {
    void clientService.refreshFromApi().then(() => {
      setOrderClients(clientService.getClients());
    });
    setIsCreateOrderFormOpen(true);
  };

  const handleCreateStepByStepOrder = () => {
    void clientService.refreshFromApi().then(() => {
      setOrderClients(clientService.getClients());
    });
    setIsStepByStepOrderOpen(true);
  };

  const handleCreateConfiguredOrder = () => {
    if (crmSettings.orders.createMode === 'single') {
      handleCreateOrder();
      return;
    }

    handleCreateStepByStepOrder();
  };

  const openWarrantyOrderDialog = () => {
    setWarrantySourceOrderNumber('');
    setIsWarrantyDialogOpen(true);
  };

  const normalizeOrderNumberForSearch = (value: string) =>
    value.replace(/[^0-9a-zа-я]/gi, '').replace(/^0+(?=\d)/, '').toLowerCase();

  const handleCreateWarrantyOrder = async () => {
    const searchNumber = warrantySourceOrderNumber.trim();
    if (!searchNumber) {
      toast.error('Введите номер прошлого заказа');
      return;
    }

    try {
      setIsWarrantyCreating(true);
      const allOrders = await orderService.getOrders();
      const normalizedSearch = normalizeOrderNumberForSearch(searchNumber);
      const sourceOrder = allOrders.find(
        (order) => normalizeOrderNumberForSearch(order.orderNumber) === normalizedSearch
      );

      if (!sourceOrder) {
        toast.error('Прошлый заказ не найден');
        return;
      }

      const device = await orderService.createDevice({
        type: 'phone',
        brand: sourceOrder.deviceBrand || '',
        model: sourceOrder.deviceModel || '',
        serialNumber: sourceOrder.deviceSerial || '',
        imei: sourceOrder.deviceImei || '',
        color: sourceOrder.deviceColor || '',
        condition: (sourceOrder.deviceCondition as any) || 'fair',
        externalCondition: sourceOrder.deviceExternalCondition || '',
        clientId: sourceOrder.clientId,
      });

      const warrantyDescription = `Гарантийный заказ по заказу ${sourceOrder.orderNumber}. ${sourceOrder.description || ''}`.trim();

      const warrantyOrder = await orderService.createOrder({
        clientId: sourceOrder.clientId,
        deviceId: device.id,
        technicianId: sourceOrder.technicianId || '',
        technicianName: sourceOrder.technicianName || '',
        intakeManagerName: user?.name || sourceOrder.intakeManagerName || 'Сотрудник',
        deliveryManagerName: sourceOrder.deliveryManagerName || sourceOrder.intakeManagerName || '',
        status: defaultOpenStatusCode,
        priority: sourceOrder.priority || 'medium',
        description: warrantyDescription,
        diagnosis: sourceOrder.diagnosis || '',
        estimatedCost: 0,
        finalCost: undefined,
        estimatedDays: sourceOrder.estimatedDays || 1,
        actualDays: undefined,
        estimatedTime: sourceOrder.estimatedTime || '',
        parts: [],
        payments: [],
        completedAt: undefined,
        isPaid: false,
        isWarranty: true,
        clientName: sourceOrder.clientName || '',
        clientPhone: normalizePhoneForStorage(sourceOrder.clientPhone || ''),
        deviceBrand: sourceOrder.deviceBrand || '',
        deviceModel: sourceOrder.deviceModel || '',
        deviceSerial: sourceOrder.deviceSerial || '',
        deviceImei: sourceOrder.deviceImei || '',
        devicePassword: sourceOrder.devicePassword || '',
        deviceColor: sourceOrder.deviceColor || '',
        deviceCondition: sourceOrder.deviceCondition || '',
        deviceExternalCondition: sourceOrder.deviceExternalCondition || '',
        communicationHistory: [
          {
            id: `${Date.now()}_warranty_create`,
            channel: 'system',
            author: user?.name || 'Сотрудник',
            message: `Создан гарантийный заказ на основании ${sourceOrder.orderNumber}.`,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      notifyOrderCreationSms(warrantyOrder);
      setOrdersData((prev) => [warrantyOrder, ...prev]);

      await handleCreateAcceptanceAct(warrantyOrder, undefined, device, {
        reasonForContact: `ГАРАНТИЙНЫЙ ЗАКАЗ. Основание: предыдущий заказ ${sourceOrder.orderNumber}. ${sourceOrder.description || ''}`.trim(),
        estimatedPrice: 0,
        conditions:
          `Гарантийное обращение по предыдущему заказу ${sourceOrder.orderNumber}. Устройство принимается на проверку гарантийного случая.`,
      });

      setIsWarrantyDialogOpen(false);
      setWarrantySourceOrderNumber('');
      toast.success(`Гарантийный заказ ${warrantyOrder.orderNumber} создан`);
    } catch (error) {
      console.error('Ошибка при создании гарантийного заказа:', error);
      toast.error(getApiErrorMessage(error, 'Не удалось создать гарантийный заказ. Проверьте номер прошлого заказа и попробуйте еще раз.'));
    } finally {
      setIsWarrantyCreating(false);
    }
  };

  const openQuickSaleDialog = (quickSaleId: string) => {
    const firstPaymentMethod =
      crmSettings.payment.paymentMethodOptions.find((item) => item.enabled)?.code || 'cash';
    setActiveQuickSaleId(quickSaleId);
    setQuickSaleForm({
      partId: '',
      quantity: 1,
      salePrice: '',
      paymentMethod: firstPaymentMethod,
      note: '',
    });
    setIsQuickSaleDialogOpen(true);
  };

  const inferBrandFallback = (model: string) => {
    const value = model.toLowerCase();
    if (value.includes('iphone') || value.includes('apple')) return 'Apple';
    if (value.includes('samsung') || value.includes('galaxy')) return 'Samsung';
    if (value.includes('xiaomi') || value.includes('redmi') || value.includes('poco')) return 'Xiaomi';
    if (value.includes('huawei')) return 'Huawei';
    if (value.includes('honor')) return 'Honor';
    return '';
  };

  const handleCreateQuickWork = async (values: QuickWorkFormValues) => {
    try {
      const workName = values.workName.trim();
      const model = values.model.trim();
      const salePrice = Math.max(0, Number(values.salePrice) || 0);
      const quantity = Math.max(1, Number(values.quantity) || 1);
      const unitPrice = salePrice > 0 ? Math.round((salePrice / quantity) * 100) / 100 : 0;
      const totalPrice = unitPrice * quantity;

      if (!model) {
        toast.error('Укажите модель устройства');
        return;
      }
      if (!workName) {
        toast.error('Выберите работу');
        return;
      }

      const clientName = values.clientName.trim() || 'Быстрая работа';
      const clientPhone = normalizePhoneForStorage(values.clientPhone.trim() || '70000000000');
      const clientType = getDefaultClientType(crmSettings);

      await clientService.refreshFromApi();
      const existingClient = clientService.findClientByPhone(clientPhone);
      const clientPayload = buildClientPayloadFromFields({
        settings: crmSettings,
        clientType,
        fieldValues: {},
        firstName: clientName.split(' ')[0] || clientName,
        lastName: clientName.split(' ').slice(1).join(' ') || '',
        phone: clientPhone,
        existingClient,
      });
      const client = existingClient
        ? (await clientService.updateClient(existingClient.id, clientPayload)) || existingClient
        : await clientService.createClient(clientPayload);

      const device = await orderService.createDevice({
        type: values.deviceType,
        brand: values.brand.trim() || inferBrandFallback(model),
        model,
        serialNumber: '',
        imei: '',
        color: values.color.trim(),
        condition: 'good',
        externalCondition: '',
        clientId: client.id,
      });

      const workLine = {
        id: `line_quick_work_${Date.now()}`,
        partId: `work_quick_${Date.now()}`,
        quantity,
        unitPrice,
        totalPrice,
        isUsed: true,
        workType: 'work_only',
        workName,
      };

      const paymentOption = crmSettings.payment.paymentMethodOptions.find(
        (item) => item.code === values.paymentMethod
      );
      const payments =
        totalPrice > 0
          ? [
              {
                id: `pay_quick_work_${Date.now()}`,
                amount: totalPrice,
                method: values.paymentMethod,
                status: 'completed' as const,
                processedAt: new Date().toISOString(),
                processedBy: user?.name || 'Сотрудник',
              },
            ]
          : [];

      const order = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: '',
        technicianName: '',
        intakeManagerName: user?.name || 'Сотрудник',
        deliveryManagerName: '',
        status: defaultOpenStatusCode,
        priority: 'medium',
        description: workName,
        diagnosis: values.note.trim(),
        estimatedCost: totalPrice,
        estimatedDays: 1,
        parts: [workLine as any],
        payments: payments as any,
        isPaid: totalPrice > 0,
        finalCost: totalPrice,
        clientName,
        clientPhone,
        deviceBrand: values.brand.trim() || device.brand,
        deviceModel: model,
        deviceSerial: '',
        deviceImei: '',
        devicePassword: '',
        deviceColor: values.color.trim(),
        deviceCondition: 'good',
        deviceExternalCondition: '',
        communicationHistory: [
          {
            id: `${Date.now()}_quick_work`,
            channel: 'system',
            author: user?.name || 'Сотрудник',
            message: `Заказ создан через «Быстрая работа»: ${workName}.`,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      if (totalPrice > 0) {
        await cashService.addOperation({
          type: 'income',
          amount: totalPrice,
          description: `Быстрая работа: ${workName}`,
          category: 'Заказы',
          paymentMethod: values.paymentMethod,
          registerType: paymentOption?.registerType || 'cashbox',
          source: 'order_payment',
          orderId: order.id,
          processedBy: user?.name || 'Сотрудник',
          notes: values.note.trim() || undefined,
        });
      }

      setOrdersData((prev) => [order, ...prev]);
      setIsQuickWorkDialogOpen(false);
      toast.success(`Заказ ${order.orderNumber || ''} создан`);
      handleViewOrder(order);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'Не удалось создать заказ'));
    }
  };

  const handleCreateQuickSale = async () => {
    try {
      if (!activeQuickSaleOption) {
        toast.error('Быстрая продажа не настроена');
        return;
      }

      if (!selectedQuickSalePart) {
        toast.error('Выберите позицию со склада');
        return;
      }

      const quantity =
        activeQuickSaleOption.saleMode === 'single'
          ? 1
          : Math.max(1, Number(quickSaleForm.quantity) || 1);
      const salePrice = Math.max(0, Number(quickSaleForm.salePrice) || 0);
      const unitPrice = quantity > 0 ? Math.round((salePrice / quantity) * 100) / 100 : salePrice;

      if (salePrice <= 0) {
        toast.error('Укажите цену продажи');
        return;
      }

      if (Number(selectedQuickSalePart.quantity || 0) < quantity) {
        toast.error(`Недостаточно товара на складе. Доступно: ${selectedQuickSalePart.quantity} шт.`);
        return;
      }

      const saleLabel = activeQuickSaleOption.label;
      const partName = selectedQuickSalePart.name;
      const clientType = getDefaultClientType(crmSettings);
      const anonymousPhone = normalizePhoneForStorage('70000000000');

      await clientService.refreshFromApi();
      const existingClient = clientService.findClientByPhone(anonymousPhone);
      const clientPayload = buildClientPayloadFromFields({
        settings: crmSettings,
        clientType,
        fieldValues: {},
        firstName: 'Без',
        lastName: 'клиента',
        phone: anonymousPhone,
        existingClient,
      });
      const client = existingClient
        ? (await clientService.updateClient(existingClient.id, clientPayload)) || existingClient
        : await clientService.createClient(clientPayload);

      const deviceModel = (selectedQuickSalePart.model || partName || saleLabel).trim();
      const device = await orderService.createDevice({
        type: 'other',
        brand: (selectedQuickSalePart.brand || '').trim(),
        model: deviceModel,
        serialNumber: '',
        imei: '',
        color: '',
        condition: 'good',
        externalCondition: '',
        clientId: client.id,
      });

      const partLine = {
        id: `line_quick_sale_${Date.now()}`,
        partId: selectedQuickSalePart.id,
        quantity,
        unitPrice,
        totalPrice: salePrice,
        isUsed: true,
        workType: 'work_with_part',
        workName: saleLabel,
        partInfo: {
          id: selectedQuickSalePart.id,
          name: partName,
          brand: selectedQuickSalePart.brand,
          model: selectedQuickSalePart.model,
          category: selectedQuickSalePart.category,
          price: Number(selectedQuickSalePart.unitPrice || 0),
          stock: Number(selectedQuickSalePart.quantity || 0),
          partCost:
            Number(selectedQuickSalePart.wholesalePrice ?? selectedQuickSalePart.unitPrice ?? 0) *
            quantity,
          workCost: 0,
        },
      };

      const paymentOption = crmSettings.payment.paymentMethodOptions.find(
        (item) => item.code === quickSaleForm.paymentMethod
      );
      const payments = [
        {
          id: `pay_quick_sale_${Date.now()}`,
          amount: salePrice,
          method: quickSaleForm.paymentMethod,
          status: 'completed' as const,
          processedAt: new Date().toISOString(),
          processedBy: user?.name || 'Сотрудник',
        },
      ];

      const description =
        quantity > 1 ? `${saleLabel}: ${partName} x${quantity}` : `${saleLabel}: ${partName}`;

      const order = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: '',
        technicianName: '',
        intakeManagerName: user?.name || 'Сотрудник',
        deliveryManagerName: user?.name || 'Сотрудник',
        status: completedStatusCode || defaultOpenStatusCode,
        priority: 'medium',
        description,
        diagnosis: quickSaleForm.note.trim(),
        estimatedCost: salePrice,
        estimatedDays: 1,
        parts: [partLine as any],
        payments: payments as any,
        isPaid: true,
        finalCost: salePrice,
        completedAt: new Date().toISOString(),
        clientName: '',
        clientPhone: '',
        deviceBrand: device.brand,
        deviceModel: deviceModel,
        deviceSerial: '',
        deviceImei: '',
        devicePassword: '',
        deviceColor: '',
        deviceCondition: 'good',
        deviceExternalCondition: '',
        communicationHistory: [
          {
            id: `${Date.now()}_quick_sale`,
            channel: 'system',
            author: user?.name || 'Сотрудник',
            message: `Заказ создан через быструю продажу «${saleLabel}» без ФИО и телефона.`,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      await inventoryService.registerOutgoingMovement(
        selectedQuickSalePart.id,
        quantity,
        `Списание в заказ ${order.orderNumber}: ${description}`,
        order.orderNumber,
        user?.name || 'Сотрудник'
      );

      await cashService.addOperation({
        type: 'income',
        amount: salePrice,
        description,
        category: 'Заказы',
        paymentMethod: quickSaleForm.paymentMethod,
        registerType: paymentOption?.registerType || 'cashbox',
        source: 'order_payment',
        orderId: order.id,
        processedBy: user?.name || 'Сотрудник',
        notes: quickSaleForm.note.trim() || undefined,
      });

      await inventoryService.refreshFromApi();
      setInventoryParts(inventoryService.getParts());
      setOrdersData((prev) => [order, ...prev]);
      setIsQuickSaleDialogOpen(false);
      setActiveQuickSaleId('');
      setQuickSaleForm({
        partId: '',
        quantity: 1,
        salePrice: '',
        paymentMethod: paymentOption?.code || 'cash',
        note: '',
      });
      toast.success(`Заказ ${order.orderNumber || ''} создан`);
      handleViewOrder(order);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'Не удалось создать заказ'));
    }
  };

  const handleCreateOrderFromWizard = async (payload: OrderCreationSubmitPayload) => {
    const { orderData: newOrderData, protectionPartId, protectionInstallPrice, cleaningServicePrice } = payload;
    const selectedProtectionPart = newOrderData.offerProtection
      ? protectionParts.find((part) => part.id === protectionPartId) || null
      : null;

    try {
      if (!newOrderData.clientName.trim()) {
        toast.error('Укажите ФИО клиента');
        return;
      }
      if (!newOrderData.clientPhone.trim()) {
        toast.error('Укажите телефон клиента');
        return;
      }
      const clientFieldError = validateClientFieldsForOrder(
        crmSettings,
        newOrderData.clientType,
        newOrderData.clientFieldValues
      );
      if (clientFieldError) {
        toast.error(clientFieldError);
        return;
      }
      if (!newOrderData.deviceModel.trim()) {
        toast.error('Укажите модель устройства');
        return;
      }
      if (!newOrderData.description.trim() && !newOrderData.diagnosis.trim()) {
        toast.error('Укажите неисправность');
        return;
      }
      if (!newOrderData.estimatedDays || newOrderData.estimatedDays < 1) {
        toast.error('Укажите срок выполнения минимум 1 день');
        return;
      }

      await clientService.refreshFromApi();
      const existingClient = clientService.findClientByPhone(newOrderData.clientPhone);
      const clientPayload = buildClientPayloadFromFields({
        settings: crmSettings,
        clientType: newOrderData.clientType,
        fieldValues: newOrderData.clientFieldValues,
        firstName: newOrderData.clientName.split(' ')[0] || '',
        lastName: newOrderData.clientName.split(' ').slice(1).join(' ') || '',
        phone: normalizePhoneForStorage(newOrderData.clientPhone),
        address: newOrderData.clientAddress,
        existingClient,
      });

      const client = existingClient
        ? (await clientService.updateClient(existingClient.id, clientPayload)) || existingClient
        : await clientService.createClient(clientPayload);

      // Create device
      const device = await orderService.createDevice({
        type: newOrderData.deviceType,
        brand: '',
        model: newOrderData.deviceModel,
        serialNumber: newOrderData.deviceSerial,
        imei: newOrderData.deviceImei,
        color: newOrderData.deviceColor,
        condition: newOrderData.deviceCondition,
        externalCondition: newOrderData.deviceExternalCondition,
        clientId: client.id,
      });

      const initialParts: OrderPart[] = [];
      const protectionPartForOrder = newOrderData.offerProtection ? selectedProtectionPart : null;
      const protectionInstall = Math.max(0, Number(protectionInstallPrice) || 0);
      const cleaningPrice = Math.max(0, Number(cleaningServicePrice) || 0);

      if (protectionPartForOrder) {
        initialParts.push({
          id: `line_protection_${Date.now()}`,
          partId: protectionPartForOrder.id,
          quantity: 1,
          unitPrice: Number(protectionPartForOrder.unitPrice || 0) + protectionInstall,
          totalPrice: Number(protectionPartForOrder.unitPrice || 0) + protectionInstall,
          isUsed: true,
          workType: 'work_with_part',
          workName: 'Поклейка защиты экрана',
          partInfo: {
            id: protectionPartForOrder.id,
            name: protectionPartForOrder.name,
            brand: protectionPartForOrder.brand,
            model: protectionPartForOrder.model,
            category: protectionPartForOrder.category,
            price: Number(protectionPartForOrder.unitPrice || 0),
            stock: Number(protectionPartForOrder.quantity || 0),
            partCost: Number(protectionPartForOrder.unitPrice || 0),
            workCost: protectionInstall,
          },
        } as any);
      }

      if (newOrderData.offerCleaning) {
        initialParts.push({
          id: `line_cleaning_${Date.now()}`,
          partId: `work_cleaning_${Date.now()}`,
          quantity: 1,
          unitPrice: cleaningPrice,
          totalPrice: cleaningPrice,
          isUsed: true,
          workType: 'work_only',
          workName: 'Чистка устройства',
        } as any);
      }

      const computedFinalCost =
        initialParts.length > 0
          ? initialParts.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
          : undefined;

      const statedProblem = (newOrderData.description || newOrderData.diagnosis).trim();

      // Create order
      const order = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: '',
        technicianName: '',
        intakeManagerName: newOrderData.intakeManagerName || user?.name || 'Сотрудник',
        deliveryManagerName: '',
        status: defaultOpenStatusCode,
        priority: newOrderData.priority,
        description: statedProblem,
        diagnosis: '',
        estimatedCost: newOrderData.estimatedCost,
        estimatedDays: newOrderData.estimatedDays,
        parts: initialParts,
        payments: [],
        isPaid: false,
        finalCost: computedFinalCost,
        // Extra display fields
        clientName: newOrderData.clientName,
        clientPhone: normalizePhoneForStorage(newOrderData.clientPhone),
        deviceBrand: '',
        deviceModel: newOrderData.deviceModel,
        deviceSerial: newOrderData.deviceSerial,
        deviceImei: newOrderData.deviceImei,
        devicePassword: newOrderData.devicePassword,
        deviceColor: newOrderData.deviceColor,
        deviceCondition: newOrderData.deviceCondition,
        deviceExternalCondition: newOrderData.deviceExternalCondition,
        communicationHistory: [
          {
            id: `${Date.now()}_create`,
            channel: 'system',
            author: user?.name || 'Сотрудник',
            message: 'Заказ создан.',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      notifyOrderCreationSms(order);
      setOrdersData(prev => [order, ...prev]);

      if (protectionPartForOrder) {
        await inventoryService.registerOutgoingMovement(
          protectionPartForOrder.id,
          1,
          `Списание в заказ ${order.orderNumber}: поклейка защиты экрана`,
          order.orderNumber,
          user?.name || 'Сотрудник'
        );
        await inventoryService.refreshFromApi();
        setInventoryParts(inventoryService.getParts());
      }

      await handleCreateAcceptanceAct(order, client, device, {
        reasonForContact: statedProblem,
        estimatedPrice: newOrderData.estimatedCost || order.estimatedCost,
        advancePayment: newOrderData.advancePayment,
        staffComments: newOrderData.staffComments,
        clientComment: newOrderData.clientFieldValues.clientComment,
      });

      const advanceAmount = Math.max(0, Number(newOrderData.advancePayment) || 0);
      if (advanceAmount > 0) {
        const orderWithAdvance = await applyOrderPayment(order, {
          amount: advanceAmount,
          method: newOrderData.advancePaymentMethod,
          notes: 'Аванс при создании заказа',
          isAdvance: true,
        });
        if (orderWithAdvance) {
          setOrdersData((prev) => prev.map((item) => (item.id === orderWithAdvance.id ? orderWithAdvance : item)));
        }
      }

      setIsStepByStepOrderOpen(false);
      
      toast.success('Заказ успешно создан');
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      toast.error(getApiErrorMessage(error, 'Не удалось создать заказ. Проверьте данные и попробуйте еще раз.'));
    }
  };

  const handleOrderFormSubmit = async (formData: any) => {
    try {
      await clientService.refreshFromApi();
      const existingClient = clientService.findClientByPhone(formData.phone);
      const clientFieldValues = collectClientFieldValues(crmSettings, formData);
      const clientFieldError = validateClientFieldsForOrder(
        crmSettings,
        formData.clientType,
        clientFieldValues
      );
      if (clientFieldError) {
        toast.error(clientFieldError);
        return;
      }

      const clientPayload = buildClientPayloadFromFields({
        settings: crmSettings,
        clientType: formData.clientType,
        fieldValues: clientFieldValues,
        firstName: formData.clientName.split(' ')[0] || '',
        lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
        phone: normalizePhoneForStorage(formData.phone),
        existingClient,
      });
      const client = existingClient
        ? (await clientService.updateClient(existingClient.id, clientPayload)) || existingClient
        : await clientService.createClient(clientPayload);

      const intakeManager = formData.manager || user?.name || managerOptions[0]?.name || assigneeOptions[0]?.name || 'Менеджер';

      const device = await orderService.createDevice({
        type: 'phone',
        brand: 'Apple',
        model: formData.model || 'iPhone',
        serialNumber: formData.serialNumber,
        imei: formData.imei,
        color: formData.color,
        condition: 'fair',
        externalCondition: formData.appearance || '',
        clientId: client.id,
      });

      const newOrder = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: '',
        technicianName: '',
        intakeManagerName: intakeManager,
        deliveryManagerName: '',
        status: defaultOpenStatusCode,
        priority: 'medium',
        description: formData.reasonForContact,
        diagnosis: 'Требуется диагностика',
        estimatedCost: formData.estimatedPrice || 0,
        finalCost: undefined,
        estimatedDays: 1,
        actualDays: undefined,
        estimatedTime: formData.deadline || '1 день',
        parts: [],
        payments: [],
        completedAt: undefined,
        isPaid: false,
        clientName: formData.clientName,
        clientPhone: normalizePhoneForStorage(formData.phone),
        deviceBrand: device.brand,
        deviceModel: device.model,
        deviceSerial: formData.serialNumber,
        deviceImei: formData.imei,
        devicePassword: formData.password || '',
        deviceColor: formData.color,
        deviceCondition: device.condition,
        deviceExternalCondition: formData.appearance || '',
        communicationHistory: [
          {
            id: `${Date.now()}_create`,
            channel: 'system',
            author: user?.name || 'Сотрудник',
            message: 'Заказ создан.',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      notifyOrderCreationSms(newOrder);
      setOrdersData(prev => [newOrder, ...prev]);

      // Create acceptance act
      await handleCreateAcceptanceAct(newOrder, client, device, formData);

      const advanceAmount = Math.max(
        0,
        Number(formData.advance || formData.prepayment || 0)
      );
      if (advanceAmount > 0) {
        const orderWithAdvance = await applyOrderPayment(newOrder, {
          amount: advanceAmount,
          method: 'cash',
          notes: 'Аванс при создании заказа',
          isAdvance: true,
        });
        if (orderWithAdvance) {
          setOrdersData((prev) => prev.map((item) => (item.id === orderWithAdvance.id ? orderWithAdvance : item)));
        }
      }

      // Show toast after document window handling
      setTimeout(() => {
      toast.success('Заказ успешно создан');
    }, 1000);
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      toast.error(getApiErrorMessage(error, 'Не удалось создать заказ. Проверьте данные и попробуйте еще раз.'));
      throw error;
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder({ ...order });
    setIsOrderViewDialogOpen(true);
    const fullOrder = await ensureFullOrder(order);
    setSelectedOrder(fullOrder);
    markOrderTelegramInboxSeen(fullOrder);
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder({ ...order });
    setPaymentDialogMode('payment');
    setQuickPaymentMethod('cash');
    setQuickPaymentAmount(getOrderDebt(order));
    setQuickPaymentNotes('');
    setIsPaymentDialogOpen(true);
  };

  const handleAdvancePayment = (order: Order) => {
    setSelectedOrder({ ...order });
    setPaymentDialogMode('advance');
    setQuickPaymentMethod('cash');
    setQuickPaymentAmount(0);
    setQuickPaymentNotes('Аванс');
    setIsPaymentDialogOpen(true);
  };

  const applyOrderPayment = async (
    order: Order,
    {
      amount,
      method,
      notes = '',
      isAdvance = false,
    }: {
      amount: number;
      method: typeof quickPaymentMethod;
      notes?: string;
      isAdvance?: boolean;
    }
  ): Promise<Order | null> => {
    const orderDebt = getOrderDebt(order);
    const orderTotal = getOrderTotal(order);

    if (!amount || amount <= 0) {
      toast.error('Укажите сумму оплаты');
      return null;
    }

    if (isAdvance) {
      if (orderTotal > 0 && amount > orderDebt) {
        toast.error(`Сумма аванса не может превышать остаток к оплате (${orderDebt.toLocaleString('ru-RU')} ₽)`);
        return null;
      }
    } else if (orderTotal > 0) {
      if (orderDebt <= 0) {
        toast.error('Заказ уже полностью оплачен');
        return null;
      }
      if (amount > orderDebt) {
        toast.error(`Сумма не может превышать остаток к оплате (${orderDebt.toLocaleString('ru-RU')} ₽)`);
        return null;
      }
    }

    await orderService.addPayment(order.id, {
      amount,
      method,
      processedBy: user?.name || 'Сотрудник',
      notes: notes || (isAdvance ? 'Аванс' : ''),
    });

    let refreshedOrder = await orderService.getOrderById(order.id);
    if (refreshedOrder && getOrderDebt(refreshedOrder) <= 0 && refreshedOrder.status !== cancelledStatusCode) {
      refreshedOrder = await orderService.updateOrder(refreshedOrder.id, {
        status: completedStatusCode,
        isPaid: true,
        completedAt: refreshedOrder.completedAt || new Date().toISOString(),
      });
      notifyAutoStatusSmsToasts(refreshedOrder, Date.now() - 10000);
    }

    if (refreshedOrder) {
      const paymentLabel = isAdvance ? 'Аванс' : 'Платеж';
      const methodLabel = getPaymentMethodLabel(method, crmSettings.payment.paymentMethodOptions);
      const paymentHistory = createHistoryEntry(
        'payment',
        `${paymentLabel}: ${amount.toLocaleString('ru-RU')} ₽, способ: ${methodLabel}${notes ? `, комментарий: ${notes}` : ''}.`
      );
      const orderWithPaymentHistory = appendOrderHistory(refreshedOrder, [paymentHistory]);
      await orderService.updateOrder(orderWithPaymentHistory.id, orderWithPaymentHistory);
      setOrdersData((prev) => prev.map((item) => (item.id === orderWithPaymentHistory.id ? orderWithPaymentHistory : item)));
      if (selectedOrder?.id === orderWithPaymentHistory.id) {
        setSelectedOrder(orderWithPaymentHistory);
      }
      refreshedOrder = orderWithPaymentHistory;
    }

    await cashService.addOperation({
      type: 'income',
      amount,
      description: isAdvance ? `Аванс по заказу ${order.orderNumber}` : `Оплата заказа ${order.orderNumber}`,
      category: 'Ремонт',
      orderId: order.orderNumber,
      processedBy: user?.name || 'Сотрудник',
      paymentMethod: method,
      registerType:
        method === 'card'
          ? 'bank_terminal'
          : method === 'transfer'
            ? 'online'
            : 'cashbox',
      source: 'order_payment',
      notes: `${isAdvance ? 'Аванс' : 'Оплата'} • способ: ${getPaymentMethodLabel(method, crmSettings.payment.paymentMethodOptions)}${notes ? ` • ${notes}` : ''}`,
    });

    const orderForDocument = refreshedOrder || order;
    if (orderForDocument && getOrderDebt(orderForDocument) <= 0) {
      await handleCreateWorkCompletionAct({
        ...orderForDocument,
        completedAt: orderForDocument.completedAt || new Date().toISOString(),
        status: orderForDocument.status === cancelledStatusCode ? orderForDocument.status : completedStatusCode,
        isPaid: true,
      });
    }

    return refreshedOrder;
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

  // Client communication actions
  const handleCallClient = async (phone: string, order?: Order) => {
    if (order && phone.trim()) {
      try {
        const updatedOrder = appendOrderHistory(order, [
          createHistoryEntry('system', `Исходящий звонок клиенту: ${phone}`),
        ]);
        await orderService.updateOrder(order.id, updatedOrder);
        setOrdersData((prev) => prev.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)));
        if (selectedOrder?.id === updatedOrder.id) {
          setSelectedOrder(updatedOrder);
        }
      } catch (error) {
        console.error('Не удалось записать историю звонка:', error);
      }
    }

    const settings = appSettingsService.getSettings();
    const template =
      settings.integrations.callMode === 'custom' && settings.integrations.callLinkTemplate.trim()
        ? settings.integrations.callLinkTemplate
        : 'tel:{{phone}}';
    const link = template
      .replaceAll('{{phone}}', phone)
      .replaceAll('{{phoneDigits}}', phone.replace(/[^\d]/g, ''));
    window.open(link, '_self');
  };

  const getOrderUnreadTelegramCount = useCallback(
    (orderOrId: Order | string) => {
      const order =
        typeof orderOrId === 'string'
          ? ordersData.find((item) => item.id === orderOrId)
          : orderOrId;
      if (!order) {
        return 0;
      }

      const clientChatId = getClientTelegramChatId(order);
      const clientPhone = normalizePhoneForCompare(order.clientPhone || '');

      return telegramInbox.filter((item) => {
        if (!isTelegramItemUnread(item)) {
          return false;
        }
        if (item.orderId === order.id) {
          return true;
        }
        if (item.orderId?.trim()) {
          return false;
        }
        if (order.clientId && item.clientId === order.clientId) {
          return true;
        }
        if (clientChatId && item.chatId === clientChatId) {
          return true;
        }
        if (clientPhone.length >= 10 && normalizePhoneForCompare(item.clientPhone || '') === clientPhone) {
          return true;
        }
        return false;
      }).length;
    },
    [ordersData, telegramInbox]
  );

  const markOrderTelegramInboxSeen = useCallback((orderOrId: Order | string) => {
    const order =
      typeof orderOrId === 'string'
        ? ordersData.find((item) => item.id === orderOrId)
        : orderOrId;
    if (!order) {
      return;
    }

    void markTelegramInboxRead({
      orderId: order.id,
      clientId: order.clientId,
      chatId: getClientTelegramChatId(order),
      phone: order.clientPhone,
    });
  }, [ordersData]);

  const selectedOrderUnreadTelegramCount = useMemo(
    () => (selectedOrder ? getOrderUnreadTelegramCount(selectedOrder) : 0),
    [getOrderUnreadTelegramCount, selectedOrder]
  );

  const openCommunicationCenter = useCallback(
    async (order: Order, channel: 'telegram' | 'sms' = 'telegram') => {
      const [freshSettings] = await Promise.all([appSettingsService.refreshFromApi(), clientService.refreshFromApi()]);
      setCrmSettings(freshSettings);
      const fullOrder = await ensureFullOrder(order);
      markOrderTelegramInboxSeen(fullOrder);
      setSelectedOrder(fullOrder);
      setCommunicationChannel(channel);
      setIsCommunicationDialogOpen(true);
    },
    [ensureFullOrder, markOrderTelegramInboxSeen]
  );

  const openedOrderFromQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const orderId = new URLSearchParams(location.search).get('orderId');
    if (!orderId) {
      openedOrderFromQueryRef.current = null;
      return;
    }
    if (ordersData.length === 0 || openedOrderFromQueryRef.current === orderId) {
      return;
    }
    const order = ordersData.find((item) => item.id === orderId);
    if (!order) {
      return;
    }
    openedOrderFromQueryRef.current = orderId;
    void openCommunicationCenter(order, 'telegram');
  }, [location.search, ordersData, openCommunicationCenter]);

  const handleTelegramClient = (order: Order) => {
    openCommunicationCenter(order, 'telegram');
  };

  const saveTelegramToHistory = async (message: string) => {
    if (!selectedOrder) {
      return null;
    }
    const updatedOrder = appendOrderHistory(selectedOrder, [
      createHistoryEntry('telegram', `Telegram: ${message}`),
    ]);
    await orderService.updateOrder(selectedOrder.id, updatedOrder);
    setOrdersData((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    setSelectedOrder(updatedOrder);
    return updatedOrder;
  };

  const handleSendCommunication = async (messageText: string) => {
    if (!selectedOrder || !messageText.trim()) {
      toast.error('Введите сообщение для клиента');
      return;
    }

    const message = messageText.trim();
    const orderId = selectedOrder.id;

    const applyOrderState = (order: Order) => {
      setSelectedOrder(order);
      setOrdersData((prev) => prev.map((item) => (item.id === order.id ? order : item)));
    };

    const reconcileOrderAfterSend = async (resultOrder?: Order | null) => {
      const freshOrder = await orderService.getOrderById(orderId);
      const order = freshOrder ?? resultOrder ?? null;
      if (order) {
        applyOrderState(order);
      }
    };

    const appendOptimisticOutbound = (channel: 'telegram' | 'sms', text: string) => {
      const entry: OrderCommunicationEntry = {
        id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        channel,
        author: 'CRM',
        message:
          channel === 'telegram'
            ? `Исходящее Telegram: ${text}`
            : `Исходящая SMS на ${selectedOrder.clientPhone || ''}: ${text}`,
        createdAt: new Date().toISOString(),
        direction: 'outbound',
      };
      const optimisticOrder = appendOrderHistory(selectedOrder, [entry]);
      applyOrderState(optimisticOrder);
      return entry.id;
    };

    const removeOptimisticEntry = (tempId: string) => {
      setSelectedOrder((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedOrder = {
          ...prev,
          communicationHistory: (prev.communicationHistory || []).filter((entry) => entry.id !== tempId),
        };
        setOrdersData((prevOrders) =>
          prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
        );
        return updatedOrder;
      });
    };

    setIsSendingCommunication(true);
    let optimisticEntryId: string | null = null;
    try {
      if (communicationChannel === 'sms') {
        if (!crmSettings.integrations.smsConnected || crmSettings.integrations.smsProvider === 'none') {
          toast.error('Подключите SMS-провайдера в настройках');
          return;
        }
        optimisticEntryId = appendOptimisticOutbound('sms', message);
        const result = await smsService.sendCustomSms(orderId, message);
        await reconcileOrderAfterSend(result.order);
        toast.success('SMS отправлена клиенту');
        return;
      }

      if (communicationChannel === 'telegram' && crmSettings.integrations.telegramConnected) {
        const chatId = getClientTelegramChatId(selectedOrder);
        if (!chatId) {
          const botLink = getTelegramBotLink(selectedOrder);
          toast.error(
            botLink
              ? 'У клиента не привязан Telegram. Отправьте ему ссылку на бота из окна чата.'
              : 'У клиента не привязан Telegram. Подключите бота в настройках.'
          );
          return;
        }
        optimisticEntryId = appendOptimisticOutbound('telegram', message);
        const result = await telegramService.sendCustomTelegram(orderId, message);
        await reconcileOrderAfterSend(result.order);
        toast.success('Сообщение отправлено в Telegram');
        return;
      }

      await saveTelegramToHistory(message);
      const link = getExternalTelegramLink(selectedOrder, message);
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
        toast.success('Сообщение сохранено, открыт Telegram');
      } else {
        toast.success('Сообщение сохранено в CRM. Скопируйте текст и отправьте клиенту вручную.');
      }
    } catch (error) {
      if (optimisticEntryId) {
        removeOptimisticEntry(optimisticEntryId);
      }
      toast.error(getApiErrorMessage(error, 'Не удалось отправить сообщение'));
    } finally {
      setIsSendingCommunication(false);
    }
  };

  const handleAddMasterComment = async (text: string) => {
    if (!selectedOrder) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Введите комментарий для мастера');
      return;
    }

    const updatedOrder = appendOrderHistory(selectedOrder, [
      createHistoryEntry('internal', trimmed),
    ]);

    try {
      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      setOrdersData((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder(updatedOrder);
      toast.success('Комментарий сохранен в истории заказа');
    } catch (error) {
      toast.error('Не удалось сохранить комментарий');
    }
  };

  const handlePrintAcceptanceAct = (order: Order) => {
    // Print acceptance act shortcut
    toast.success('Открыт акт приема-передачи');
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder({ ...order });
    setIsEditOrderDialogOpen(true);
  };

  const handleSaveOrderEdit = async (updatedData: Order) => {
    if (!selectedOrder) return;
    
    try {
      const currentOrder = ordersData.find((order) => order.id === selectedOrder.id) || selectedOrder;
      const nextClientName = (updatedData.clientName || '').trim();
      const nextClientPhone = normalizePhoneForStorage(updatedData.clientPhone || '');
      const nameChanged = nextClientName !== (currentOrder.clientName || '').trim();
      const phoneChanged =
        nextClientPhone !== normalizePhoneForStorage(currentOrder.clientPhone || '');

      if (currentOrder.clientId && (nameChanged || phoneChanged)) {
        await clientService.refreshFromApi();
        const existingClient =
          clientService.getClients().find((client) => client.id === currentOrder.clientId) || null;
        const nameParts = nextClientName.split(/\s+/).filter(Boolean);
        await clientService.updateClient(currentOrder.clientId, {
          firstName: nameParts[0] || existingClient?.firstName || 'Клиент',
          lastName: nameParts.slice(1).join(' ') || '',
          phone: nextClientPhone || existingClient?.phone || '',
        });
      }

      const updatedOrder = {
        ...currentOrder,
        ...updatedData,
        clientName: nextClientName,
        clientPhone: nextClientPhone || updatedData.clientPhone || '',
      };
      await persistOrderChanges(currentOrder, updatedOrder, 'Заказ успешно обновлен');

      if (currentOrder.clientId && (nameChanged || phoneChanged)) {
        setOrdersData((prev) =>
          prev.map((order) =>
            order.clientId === currentOrder.clientId
              ? {
                  ...order,
                  clientName: nextClientName,
                  clientPhone: nextClientPhone || order.clientPhone,
                }
              : order
          )
        );
      }

      setSelectedOrder(updatedOrder);
      setIsEditOrderDialogOpen(false);
    } catch (error) {
      console.error('Ошибка при обновлении заказа:', error);
      toast.error(getApiErrorMessage(error, 'Ошибка при обновлении заказа'));
    }
  };

  // Work / parts actions
  const resetAddWorkForm = () => {
    setAddWorkInitialForm(emptyAddWorkForm);
    setSelectedPart(null);
    setWorkType('work');
    setEditingWorkItemId(null);
    setAddWorkFormKey((prev) => prev + 1);
  };

  const handleAddWork = async (order: Order) => {
    if (!order) {
      toast.error('Заказ не найден');
      return;
    }
    if (!order.id) {
      toast.error('У заказа отсутствует ID');
      return;
    }

    if (!inventoryParts.length) {
      await refreshInventoryCatalog();
    }

    setSelectedOrder(order);
    resetAddWorkForm();
    setIsAddWorkDialogOpen(true);
  };

  const handleEditWorkItem = (order: Order, item: OrderPart) => {
    const linkedPart = (item as any).partInfo;
    setSelectedOrder(order);
    setEditingWorkItemId(item.id);
    setAddWorkInitialForm({
      workName: (item as any).workName || linkedPart?.name || '',
      workPrice: String(Number(item.unitPrice || 0)),
      workQuantity: Number(item.quantity || 1),
      workWarrantyDays: String(Number((item as any).warrantyDays || 30)),
      allowWithoutPart: !linkedPart,
    });
    setSelectedPart(
      linkedPart
        ? {
            ...linkedPart,
            id: item.partId,
            name: linkedPart.name || (item as any).workName || '',
            price: linkedPart.price ?? linkedPart.unitPrice ?? item.unitPrice,
            stock: linkedPart.stock ?? linkedPart.stockQuantity ?? linkedPart.quantity ?? 0,
          }
        : null
    );
    setWorkType(linkedPart ? 'part' : 'work');
    setAddWorkFormKey((prev) => prev + 1);
    setIsOrderViewDialogOpen(false);
    setIsAddWorkDialogOpen(true);
  };

  const handleSearchParts = () => {
    setIsSearchPartsDialogOpen(true);
  };

  const handleAddWorkToOrder = async ({
    workName,
    workPrice,
    workQuantity,
    workWarrantyDays,
    allowWithoutPart,
  }: AddWorkFormValues) => {
    if (!selectedOrder) {
      toast.error('Заказ не выбран');
      return;
    }

    if (!workName.trim()) {
      toast.error('Введите название работы');
      return;
    }

    if (!editingWorkItemId && !selectedPart && !allowWithoutPart) {
      toast.error('Выберите запчасть или включите «Работа без запчасти»');
      return;
    }

    const parsedWorkPrice = Number(workPrice);

    if (!workPrice.trim() || Number.isNaN(parsedWorkPrice) || parsedWorkPrice < 0) {
      toast.error('Цена не может быть отрицательной');
      return;
    }

    if (workQuantity <= 0) {
      toast.error('Количество должно быть больше 0');
      return;
    }

    const parsedWarrantyDays = Number(workWarrantyDays);
    if (!Number.isFinite(parsedWarrantyDays) || parsedWarrantyDays <= 0) {
      toast.error('Гарантия должна быть больше 0 дней');
      return;
    }

    try {
      if (editingWorkItemId) {
        const currentItem = selectedOrder.parts?.find((item) => item.id === editingWorkItemId);
        if (!currentItem) {
          toast.error('Позиция не найдена');
          return;
        }

        const currentPartInfo = (currentItem as any).partInfo;
        const nextPartInfo = currentPartInfo
          ? {
              ...currentPartInfo,
              workCost: parsedWorkPrice * workQuantity,
              partCost:
                Number(currentPartInfo.partCost || 0) > 0
                  ? (Number(currentPartInfo.partCost || 0) / Math.max(Number(currentItem.quantity || 1), 1)) * workQuantity
                  : Number(currentPartInfo.wholesalePrice ?? currentPartInfo.price ?? 0) * workQuantity,
            }
          : null;

        const updatedParts = (selectedOrder.parts || []).map((item) =>
          item.id === editingWorkItemId
            ? ({
                ...item,
                quantity: workQuantity,
                unitPrice: parsedWorkPrice,
                totalPrice: parsedWorkPrice * workQuantity,
                workName: workName.trim(),
                warrantyDays: parsedWarrantyDays,
                partInfo: nextPartInfo,
              } as OrderPart & { workName: string; warrantyDays: number; partInfo?: any })
            : item
        );

        const updatedOrder = {
          ...selectedOrder,
          parts: updatedParts,
          finalCost: updatedParts.length
            ? updatedParts.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
            : undefined,
        };
        const updatedOrderWithHistory = appendOrderHistory(updatedOrder, [
          createHistoryEntry(
            'system',
            `Изменена позиция "${workName.trim()}", ${workQuantity} шт., сумма ${(parsedWorkPrice * workQuantity).toLocaleString('ru-RU')} ₽, гарантия ${parsedWarrantyDays} дн.`
          ),
        ]);

        await orderService.updateOrder(selectedOrder.id, updatedOrderWithHistory);
        rememberWorkName(workName);
        setOrdersData((prev) => prev.map((order) => (order.id === selectedOrder.id ? updatedOrderWithHistory : order)));
        setSelectedOrder(updatedOrderWithHistory);
        toast.success('Позиция обновлена');
        setIsAddWorkDialogOpen(false);
        resetAddWorkForm();
        return;
      }

      // Create work line (with/without part)
      const workItem = {
        id: Date.now().toString(),
        partId: selectedPart ? selectedPart.id : 'work_' + Date.now().toString(),
        quantity: workQuantity,
        unitPrice: parsedWorkPrice,
        totalPrice: parsedWorkPrice * workQuantity,
        isUsed: true,
        // Line type
        workType: selectedPart ? 'work_with_part' : 'work_only',
        workName: workName,
        warrantyDays: parsedWarrantyDays,
        partInfo: selectedPart ? {
          ...selectedPart,
          // Cost split for analytics
          partCost: Number(selectedPart.wholesalePrice ?? selectedPart.price ?? 0) * workQuantity,
          workCost: parsedWorkPrice * workQuantity
        } : null
      } as OrderPart & {
        workType: string;
        workName: string;
        partInfo?: any & { partCost: number; workCost: number }
      };

      // If part attached: validate stock and write off
      if (selectedPart) {
        const partInStock = inventoryService.getPartById(selectedPart.id);
        if (partInStock && partInStock.quantity < workQuantity) {
          toast.error(`Недостаточно запчастей на складе. Доступно: ${partInStock.quantity} шт.`);
          return;
        }
        
        if (partInStock) {
          await inventoryService.registerOutgoingMovement(
            selectedPart.id,
            workQuantity,
            `Списание в заказ ${selectedOrder.orderNumber}: ${workName}`,
            selectedOrder.orderNumber,
            user?.name || 'Сотрудник'
          );
          await inventoryService.refreshFromApi();
          setInventoryParts(inventoryService.getParts());
          toast.success(`Со склада списано: ${workQuantity} шт. ${selectedPart.name}`);
        }
      }

      // Update order with new line
      const updatedParts = [...(selectedOrder.parts || []), workItem];
      const updatedOrder = {
        ...selectedOrder,
        parts: updatedParts,
        // Если есть работы/запчасти в заказе, сумма берется только из этих позиций.
        finalCost: updatedParts.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
      };
      const historyMessage = selectedPart
        ? `Добавлена работа "${workName}" с запчастью "${selectedPart.name}", ${workQuantity} шт., сумма ${(
            parsedWorkPrice * workQuantity
          ).toLocaleString('ru-RU')} ₽, гарантия ${parsedWarrantyDays} дн.`
        : `Добавлена работа "${workName}", ${workQuantity} шт., сумма ${(parsedWorkPrice * workQuantity).toLocaleString('ru-RU')} ₽, гарантия ${parsedWarrantyDays} дн.`;
      const updatedOrderWithHistory = appendOrderHistory(updatedOrder, [
        createHistoryEntry('system', historyMessage),
      ]);

      await orderService.updateOrder(selectedOrder.id, updatedOrderWithHistory);
      rememberWorkName(workName);
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrderWithHistory : order
      ));
      setSelectedOrder(updatedOrderWithHistory);

      toast.success(`Работа ${selectedPart ? 'с запчастью ' : ''}добавлена к заказу`);
      setIsAddWorkDialogOpen(false);
      resetAddWorkForm();
    } catch (error) {
      console.error('Ошибка при добавлении работы:', error);
      console.error('error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
        errorStack: error instanceof Error ? error.stack : 'Нет стека',
        selectedOrder: selectedOrder?.id,
        workType,
        workName,
        workPrice,
        workQuantity,
        workWarrantyDays
      });
      toast.error(`Ошибка при добавлении работы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const normalizePartField = (value?: string) => (value || '').trim().toLowerCase();
  const inventoryCategoryNames = taxonomyNodes.map((node) => node.name).filter(Boolean);
  const partCategoryOptions = Array.from(
    new Set([...inventoryCategoryNames, ...inventoryParts.map((part) => part.category).filter(Boolean)])
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  const partBrandOptions = Array.from(
    new Set(
      inventoryParts
        .filter((part) => !partsCategoryFilter || normalizePartField(part.category) === normalizePartField(partsCategoryFilter))
        .map((part) => part.brand)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  const partModelOptions = Array.from(
    new Set(
      inventoryParts
        .filter((part) => !partsCategoryFilter || normalizePartField(part.category) === normalizePartField(partsCategoryFilter))
        .filter((part) => !partsBrandFilter || normalizePartField(part.brand) === normalizePartField(partsBrandFilter))
        .map((part) => part.model)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'));

  const filteredParts = inventoryParts.filter((part) => {
    const search = normalizePartField(debouncedPartsSearchTerm);
    const matchesSearch =
      !search ||
      normalizePartField(part.name).includes(search) ||
      normalizePartField(part.category).includes(search) ||
      normalizePartField(part.brand).includes(search) ||
      normalizePartField(part.model).includes(search);
    const matchesCategory = !partsCategoryFilter || normalizePartField(part.category) === normalizePartField(partsCategoryFilter);
    const matchesBrand = !partsBrandFilter || normalizePartField(part.brand) === normalizePartField(partsBrandFilter);
    const matchesModel = !partsModelFilter || normalizePartField(part.model) === normalizePartField(partsModelFilter);

    return matchesSearch && matchesCategory && matchesBrand && matchesModel;
  }).map((part) => ({
    ...part,
    price: part.unitPrice,
    wholesalePrice: part.wholesalePrice ?? part.unitPrice,
    stock: part.quantity,
  }));

  const openQuickReceiveDialog = (initial?: Partial<QuickReceiveFormValues>) => {
    setQuickReceiveInitial({ ...emptyQuickReceiveForm(), ...initial });
    setIsQuickReceiveDialogOpen(true);
  };

  const findQuickPartExactMatch = (values: QuickReceiveFormValues) => {
    const normalizedName = normalizePartField(values.name);
    if (!normalizedName) {
      return null;
    }

    return (
      inventoryParts.find((part) => {
        const partNameMatches = normalizePartField(part.name) === normalizedName;
        const categoryMatches =
          !normalizePartField(values.category) || normalizePartField(part.category) === normalizePartField(values.category);
        const brandMatches =
          !normalizePartField(values.brand) || normalizePartField(part.brand) === normalizePartField(values.brand);
        const modelMatches =
          !normalizePartField(values.model) || normalizePartField(part.model) === normalizePartField(values.model);
        return partNameMatches && categoryMatches && brandMatches && modelMatches;
      }) ||
      inventoryParts.find((part) => normalizePartField(part.name) === normalizedName) ||
      null
    );
  };

  const protectionParts = React.useMemo(
    () =>
      inventoryParts.filter(
        (part) => (part.category || '').trim().toLowerCase() === 'защита экрана'
      ),
    [inventoryParts]
  );
  const quickSaleOptions = React.useMemo(
    () =>
      [...(crmSettings.orders.quickSaleOptions || [])]
        .filter((item) => item.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [crmSettings.orders.quickSaleOptions]
  );
  const enabledPaymentMethods = React.useMemo(
    () => (crmSettings.payment.paymentMethodOptions || []).filter((item) => item.enabled),
    [crmSettings.payment.paymentMethodOptions]
  );
  const activeQuickSaleOption = React.useMemo(
    () => quickSaleOptions.find((item) => item.id === activeQuickSaleId) || null,
    [quickSaleOptions, activeQuickSaleId]
  );
  const availableQuickSaleParts = React.useMemo(() => {
    if (!activeQuickSaleOption) {
      return [];
    }

    const categoryName = (activeQuickSaleOption.category || '').trim().toLowerCase();
    const parts = !categoryName
      ? inventoryParts
      : inventoryParts.filter((part) => {
          const category = (part.category || '').trim().toLowerCase();
          const subcategory = (part.subcategory || '').trim().toLowerCase();
          return category === categoryName || subcategory === categoryName;
        });
    return [...parts].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [inventoryParts, activeQuickSaleOption]);
  const selectedQuickSalePart = React.useMemo(
    () => availableQuickSaleParts.find((part) => part.id === quickSaleForm.partId) || null,
    [availableQuickSaleParts, quickSaleForm.partId]
  );

  useEffect(() => {
    if (!selectedQuickSalePart || !activeQuickSaleOption) {
      return;
    }
    setQuickSaleForm((prev) => {
      const quantity = activeQuickSaleOption.saleMode === 'single' ? 1 : Math.max(1, Number(prev.quantity) || 1);
      const nextPrice = Number(selectedQuickSalePart.unitPrice || 0) * quantity;
      return {
        ...prev,
        quantity,
        salePrice:
          prev.salePrice && Number(prev.salePrice) > 0
            ? prev.salePrice
            : String(nextPrice),
      };
    });
  }, [selectedQuickSalePart, activeQuickSaleOption, quickSaleForm.quantity]);

  const workNamesFromOrders = React.useMemo(() => {
    const names = new Set<string>();
    ordersData.forEach((order) => {
      (order.parts || []).forEach((part) => {
        const workName = String((part as any).workName || '').trim();
        if (workName) {
          names.add(workName);
        }
      });
    });
    return Array.from(names);
  }, [ordersData]);

  const workNameOptions = React.useMemo(
    () =>
      Array.from(new Set([...commonWorkNames, ...customWorkNames, ...workNamesFromOrders])).sort((a, b) =>
        a.localeCompare(b, 'ru')
      ),
    [customWorkNames, workNamesFromOrders]
  );

  const rememberWorkName = React.useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setCustomWorkNames((prev) => {
      if (prev.some((name) => normalizePartField(name) === normalizePartField(normalized))) {
        return prev;
      }
      if (commonWorkNames.some((name) => normalizePartField(name) === normalizePartField(normalized))) {
        return prev;
      }

      const next = [...prev, normalized].sort((a, b) => a.localeCompare(b, 'ru'));
      try {
        localStorage.setItem(customWorkNamesStorageKey, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  const handleQuickReceivePart = async (values: QuickReceiveFormValues) => {
    const name = values.name.trim();
    const category = values.category.trim() || 'Прочее';
    const brand = values.brand.trim() || 'Универсальная';
    const model = values.model.trim() || 'Без модели';
    const wholesalePrice = Number(values.wholesalePrice);
    const unitPrice = wholesalePrice;
    const quantity = Number(values.quantity);
    const quickPartExactMatch = findQuickPartExactMatch(values);

    if (!name) {
      toast.error('Введите название запчасти');
      return;
    }

    if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) {
      toast.error('Укажите корректную оптовую цену');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Укажите корректное количество');
      return;
    }

    let createdPart;

    if (quickPartExactMatch) {
      const requiresMetadataUpdate =
        quickPartExactMatch.category !== category ||
        quickPartExactMatch.brand !== brand ||
        quickPartExactMatch.model !== model ||
        Number(quickPartExactMatch.unitPrice || 0) !== unitPrice ||
        Number((quickPartExactMatch.wholesalePrice ?? quickPartExactMatch.unitPrice) || 0) !== wholesalePrice;

      if (requiresMetadataUpdate) {
        createdPart = await inventoryService.updatePart(quickPartExactMatch.id, {
          category,
          brand,
          model,
          wholesalePrice,
          unitPrice,
        });
      } else {
        createdPart = quickPartExactMatch;
      }

      createdPart = await inventoryService.addStock(
        createdPart.id,
        quantity,
        'Быстрое оприходование из заказа',
        user?.name || 'Сотрудник',
        wholesalePrice,
      );
    } else {
      createdPart = await inventoryService.addPart({
        name,
        partNumber: `AUTO-${Date.now()}`,
        category,
        brand,
        model,
        quantity,
        wholesalePrice,
        minQuantity: 1,
        unitPrice,
        supplier: 'Быстрое оприходование',
        location: 'Склад',
        notificationsEnabled: false,
        alertThreshold: 1,
      });
    }

    const uiPart = {
      ...createdPart,
      price: createdPart.unitPrice,
      wholesalePrice: createdPart.wholesalePrice ?? createdPart.unitPrice,
      stock: createdPart.quantity,
    };

    await inventoryService.refreshFromApi();
    setInventoryParts(inventoryService.getParts());
    setIsQuickReceiveDialogOpen(false);

    if (isQuickSaleDialogOpen) {
      const quantity =
        activeQuickSaleOption?.saleMode === 'single'
          ? 1
          : Math.max(1, Number(quickSaleForm.quantity) || 1);
      setQuickSaleForm((prev) => ({
        ...prev,
        partId: createdPart.id,
        quantity,
        salePrice: String(Number(createdPart.unitPrice || 0) * quantity),
      }));
      toast.success(
        quickPartExactMatch
          ? 'Остаток пополнен, позиция выбрана для продажи'
          : 'Запчасть оприходована и выбрана для продажи'
      );
      return;
    }

    setSelectedPart(uiPart);
    setPartsSearchTerm(createdPart.name);
    setIsSearchPartsDialogOpen(false);
    toast.success(
      quickPartExactMatch
        ? 'Остаток существующей запчасти пополнен и позиция выбрана'
        : 'Запчасть оприходована и выбрана в работу'
    );
  };

  // Delivery actions
  const handleDeliveryOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDeliveryDialogOpen(true);
  };

  const handleRemovePart = async (partId: string) => {
    if (!selectedOrder) return;
    
    try {
      const updatedParts = selectedOrder.parts?.filter(part => part.id !== partId) || [];
      const updatedOrder = {
        ...selectedOrder,
        parts: updatedParts,
        finalCost: updatedParts.length
          ? updatedParts.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
          : undefined,
      };
      const updatedOrderWithHistory = appendOrderHistory(updatedOrder, [
        createHistoryEntry('system', 'Позиция удалена из заказа (работа/запчасть).'),
      ]);

      await orderService.updateOrder(selectedOrder.id, updatedOrderWithHistory);
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrderWithHistory : order
      ));
      setSelectedOrder(updatedOrderWithHistory);
      toast.success('Позиция удалена из заказа');
    } catch (error) {
      console.error('Ошибка при удалении позиции:', error);
      toast.error('Ошибка при удалении позиции');
    }
  };

  const handleCompleteDelivery = async ({
    paymentMethod,
    paymentAmount,
    screenProtection,
    cleaning,
  }: OrderDeliveryCompletePayload) => {
    if (!selectedOrder) return;

    try {
      const additionalServices: Array<OrderPart & { workType: string; workName: string }> = [];
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
        });
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
        });
      }

      const updatedParts = [...(selectedOrder.parts || []), ...additionalServices];
      const updatedOrder = {
        ...selectedOrder,
        status: completedStatusCode,
        parts: updatedParts,
        finalCost: updatedParts.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
        isPaid: true,
        completedAt: new Date().toISOString(),
        deliveryManagerName: selectedOrder.deliveryManagerName || user?.name || 'Сотрудник'
      };

      const savedOrder = await orderService.updateOrder(selectedOrder.id, updatedOrder);
      notifyAutoStatusSmsToasts(savedOrder, Date.now() - 10000);
      await cashService.addOperation({
        type: 'income',
        amount: paymentAmount,
        description: `Выдача и оплата заказа ${selectedOrder.orderNumber}`,
        category: 'Ремонт',
        orderId: selectedOrder.orderNumber,
        processedBy: selectedOrder.deliveryManagerName || user?.name || 'Сотрудник',
        paymentMethod: paymentMethod === 'online' ? 'transfer' : paymentMethod,
        registerType: paymentMethod === 'card' ? 'bank_terminal' : paymentMethod === 'online' || paymentMethod === 'transfer' ? 'online' : 'cashbox',
        source: 'order_payment',
        notes: [
          `Способ оплаты: ${getPaymentMethodLabel(paymentMethod, crmSettings.payment.paymentMethodOptions)}`,
          screenProtection ? 'Защита экрана' : '',
          cleaning ? 'Чистка устройства' : '',
        ].filter(Boolean).join(' • '),
      });
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? savedOrder : order
      ));
      setSelectedOrder(savedOrder);

      await handleCreateWorkCompletionAct(savedOrder);

      toast.success('Заказ успешно выдан клиенту');
      setIsDeliveryDialogOpen(false);
    } catch (error) {
      console.error('Ошибка при выдаче заказа:', error);
      toast.error('Ошибка при выдаче заказа');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const currentOrder = ordersData.find((order) => order.id === orderId);
      if (!currentOrder) {
        toast.error('Заказ не найден');
        return;
      }

      const updatedOrder = { ...currentOrder, status: newStatus as Order['status'] };
      await persistOrderChanges(currentOrder, updatedOrder, 'Статус заказа обновлен');
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
    }
  };

  // Create acceptance act after order creation
  const buildOrderClientSnapshot = (order: Order): Client => ({
    id: order.clientId,
    firstName: order.clientName?.split(' ')[0] || '',
    lastName: order.clientName?.split(' ').slice(1).join(' ') || '',
    phone: order.clientPhone || '',
    email: '',
    address: '',
    notes: '',
    totalOrders: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const buildOrderDeviceSnapshot = (order: Order, passwordOverride?: string): Device => ({
    id: order.deviceId,
    type: 'phone',
    brand: order.deviceBrand || '',
    model: order.deviceModel || '',
    serialNumber: order.deviceSerial,
    imei: order.deviceImei,
    color: order.deviceColor,
    password: passwordOverride ?? order.devicePassword ?? '',
    condition: (order.deviceCondition as Device['condition']) || 'good',
    externalCondition: order.deviceExternalCondition,
    clientId: order.clientId,
    createdAt: new Date().toISOString(),
  });

  const buildWorkCompletionLines = (order: Order) => {
    const worksPerformed: WorkItem[] = [];
    const partsUsed: PartItem[] = [];

    if (order.parts && order.parts.length > 0) {
      order.parts.forEach((part) => {
        const workType = (part as any).workType;

        if (workType === 'work_with_part' || workType === 'work_only') {
          worksPerformed.push({
            id: part.id,
            name: getOrderLineTitle(part as any),
            description: getOrderLineTitle(part as any),
            cost: part.unitPrice,
            quantity: part.quantity,
            totalCost: part.totalPrice,
            warrantyDays: Number((part as any).warrantyDays || 30),
          });
        } else if (part.partId === 'screen_protection' || part.partId === 'cleaning') {
          worksPerformed.push({
            id: part.id,
            name: part.partId === 'screen_protection' ? 'Защита экрана' : 'Чистка устройства',
            description: part.partId === 'screen_protection' ? 'Установка защитного стекла' : 'Чистка устройства',
            cost: part.unitPrice,
            quantity: part.quantity,
            totalCost: part.totalPrice,
            warrantyDays: Number((part as any).warrantyDays || 30),
          });
        } else {
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

    if (worksPerformed.length === 0) {
      worksPerformed.push({
        id: '1',
        name: 'Диагностика',
        description: order.diagnosis || 'Диагностика устройства',
        cost: 0,
        quantity: 1,
        totalCost: 0,
        warrantyDays: 30,
      });
    }

    const completionTotal =
      worksPerformed.reduce((sum, work) => sum + Number(work.totalCost || 0), 0) +
      partsUsed.reduce((sum, part) => sum + Number(part.totalPrice || 0), 0);
    const completionWarrantyDays = Math.max(
      30,
      ...worksPerformed.map((work) => Number(work.warrantyDays || 0)).filter((value) => Number.isFinite(value))
    );

    return { worksPerformed, partsUsed, completionTotal, completionWarrantyDays };
  };

  const upsertAcceptanceActForOrder = async (
    order: Order,
    client?: Client,
    device?: Device,
    formData?: any
  ) => {
    const liveClient =
      client ||
      clientService.getClients().find((item) => item.id === order.clientId) ||
      undefined;

    const clientData = prepareAcceptanceActClient(
      liveClient || buildOrderClientSnapshot(order),
      {
        receptionistNotes: formData?.receptionistNotes,
        staffComments: formData?.staffComments || getOrderInternalNotes(order),
        clientComment: formData?.clientComment,
        clientNotes: formData?.clientNotes,
        completeness: formData?.completeness,
      }
    );

    const deviceData = device || buildOrderDeviceSnapshot(order, formData?.password);

    return documentService.createAcceptanceAct(
      order,
      clientData,
      deviceData,
      formData?.reasonForContact || getOrderStatedProblem(order),
      Number(formData?.estimatedPrice ?? order.estimatedCost ?? 0),
      order.intakeManagerName || order.technicianName || user?.name || 'Сотрудник',
      formData?.conditions || 'Устройство принимается на бесплатную диагностику и ремонт.',
      Number(formData?.advancePayment || formData?.advance || formData?.prepayment || 0)
    );
  };

  const upsertWorkCompletionActForOrder = async (order: Order) => {
    const { worksPerformed, partsUsed, completionTotal, completionWarrantyDays } =
      buildWorkCompletionLines(order);

    return documentService.createWorkCompletionAct(
      order,
      buildOrderClientSnapshot(order),
      buildOrderDeviceSnapshot(order),
      worksPerformed,
      partsUsed,
      completionTotal,
      completionWarrantyDays,
      order.deliveryManagerName || order.technicianName || user?.name || 'Сотрудник'
    );
  };

  const syncOrderDocumentsQuiet = async (order: Order) => {
    try {
      const [acceptanceAct, completionAct] = await Promise.all([
        documentService.getAcceptanceActByOrderId(order.id),
        documentService.getWorkCompletionActByOrderId(order.id),
      ]);

      const tasks: Promise<unknown>[] = [];
      if (acceptanceAct) {
        tasks.push(upsertAcceptanceActForOrder(order));
      }
      if (completionAct) {
        tasks.push(upsertWorkCompletionActForOrder(order));
      }
      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    } catch {
      // Документы не критичны для сохранения заказа
    }
  };

  const handleCreateAcceptanceAct = async (order: Order, client?: Client, device?: Device, formData?: any) => {
    try {
      const acceptanceAct = await upsertAcceptanceActForOrder(order, client, device, formData);

      // Auto-open generated document
      setSelectedDocument(acceptanceAct);
      setDocumentType('acceptance');
      setIsDocumentDialogOpen(true);

      // Toast intentionally disabled here to avoid overlap with PDF preview
    } catch (error) {
      toast.error('Ошибка при создании акта приема-передачи');
    }
  };

  // Create work completion act at order completion
  const handleCreateWorkCompletionAct = async (order: Order) => {
    try {
      const workCompletionAct = await upsertWorkCompletionActForOrder(order);

      // Auto-open generated document
      setSelectedDocument(workCompletionAct);
      setDocumentType('completion');
      setIsDocumentDialogOpen(true);

      toast.success('Акт выполненных работ создан');
    } catch (error) {
      toast.error('Ошибка при создании акта выполненных работ');
    }
  };

  // Document signature handler
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

  // Open document by type
  const handleViewDocument = async (order: Order, type: 'acceptance' | 'completion') => {
    try {
      const fullOrder = (await orderService.getOrderById(order.id)) || order;
      let document: AcceptanceAct | WorkCompletionAct | null = null;
      
      if (type === 'acceptance') {
        document = await documentService.getAcceptanceActByOrderId(fullOrder.id);
      } else {
        document = await documentService.getWorkCompletionActByOrderId(fullOrder.id);
      }

      if (document) {
        if (type === 'acceptance') {
          const act = document as AcceptanceAct;
          const days = act.estimatedDays || fullOrder.estimatedDays;
          const liveClient = clientService.getClients().find((item) => item.id === fullOrder.clientId);
          let enrichedAct: AcceptanceAct = act;

          if (days && !act.estimatedCompletionDate) {
            enrichedAct = {
              ...enrichedAct,
              estimatedDays: days,
              estimatedCompletionDate: calcEstimatedCompletionDate(
                fullOrder.createdAt || act.acceptanceDate,
                days
              ).toISOString(),
            };
          }

          document = enrichAcceptanceActForDisplay(enrichedAct, fullOrder, liveClient);
        } else {
          const completionAct = document as WorkCompletionAct;
          const { worksPerformed, partsUsed, completionTotal, completionWarrantyDays } =
            buildWorkCompletionLines(fullOrder);
          document = enrichActDeviceFromOrder(
            {
              ...completionAct,
              client: buildOrderClientSnapshot(fullOrder),
              worksPerformed,
              partsUsed,
              totalCost: completionTotal,
              warrantyPeriod: completionWarrantyDays,
            },
            fullOrder
          );
        }
        setSelectedDocument(document);
        setDocumentType(type);
        setIsDocumentDialogOpen(true);
      } else {
        if (type === 'acceptance') {
          await handleCreateAcceptanceAct(fullOrder);
          return;
        }

        if (order.status === completedStatusCode) {
          await handleCreateWorkCompletionAct(order);
          return;
        }

        toast.error('Акт выполненных работ доступен только после завершения заказа');
      }
    } catch (error) {
      toast.error('Ошибка при открытии документа');
    }
  };

  const handleAddPayment = async () => {
    if (!selectedOrder) {
      return;
    }

    const isAdvance = paymentDialogMode === 'advance';

    try {
      const refreshedOrder = await applyOrderPayment(selectedOrder, {
        amount: quickPaymentAmount,
        method: quickPaymentMethod,
        notes: quickPaymentNotes,
        isAdvance,
      });

      if (!refreshedOrder) {
        return;
      }

      setIsPaymentDialogOpen(false);
      toast.success(
        isAdvance
          ? 'Аванс внесён и записан в кассу'
          : refreshedOrder.status === completedStatusCode
            ? 'Оплата проведена, заказ закрыт'
            : 'Оплата добавлена и записана в журнал движения денег'
      );
    } catch {
      toast.error(isAdvance ? 'Не удалось внести аванс' : 'Не удалось добавить оплату');
    }
  };

  const filteredOrders = useMemo(() => {
    const periodOrders = ordersData.filter((order) => isDateWithinRange(order.createdAt, periodFilter));
    const searchValue = debouncedSearchTerm.trim().toLowerCase();
    const searchPhone = normalizePhoneForCompare(debouncedSearchTerm);

    return periodOrders
      .filter((order) => {
        const matchesSearch =
          !searchValue ||
          order.orderNumber.toLowerCase().includes(searchValue) ||
          (order.clientName || '').toLowerCase().includes(searchValue) ||
          (order.clientPhone || '').toLowerCase().includes(searchValue) ||
          (searchPhone.length >= 3 && normalizePhoneForCompare(order.clientPhone).includes(searchPhone)) ||
          (order.deviceBrand || '').toLowerCase().includes(searchValue) ||
          (order.deviceModel || '').toLowerCase().includes(searchValue) ||
          getOrderStatedProblem(order).toLowerCase().includes(searchValue);
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
        const matchesScope =
          filterScope === 'all' ||
          (filterScope === 'active' && isActiveOrder(order)) ||
          (filterScope === 'completed' && order.status === completedStatusCode) ||
          (filterScope === 'cancelled' && order.status === cancelledStatusCode) ||
          (filterScope === 'paid' && getOrderDebt(order) === 0 && getOrderTotal(order) > 0);

        return matchesSearch && matchesStatus && matchesPriority && matchesScope;
      })
      .sort((a, b) => {
        // В разделе «Все» — строго по номерам, без приоритета активных
        if (filterScope === 'all') {
          const aNum = Number(String(a.orderNumber || '').replace(/\D/g, '')) || 0;
          const bNum = Number(String(b.orderNumber || '').replace(/\D/g, '')) || 0;
          if (aNum !== bNum) {
            return bNum - aNum;
          }
          return String(b.orderNumber || '').localeCompare(String(a.orderNumber || ''), 'ru', {
            numeric: true,
            sensitivity: 'base',
          });
        }

        const aClosed = isFinalOrderStatus(a.status, crmSettings) ? 1 : 0;
        const bClosed = isFinalOrderStatus(b.status, crmSettings) ? 1 : 0;

        if (aClosed !== bClosed) {
          return aClosed - bClosed;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    ordersData,
    periodFilter,
    debouncedSearchTerm,
    filterStatus,
    filterPriority,
    filterScope,
    completedStatusCode,
    cancelledStatusCode,
    crmSettings,
  ]);

  const orderExchangeExportRows = useMemo(() => exportOrderRows(filteredOrders), [filteredOrders]);

  React.useEffect(() => {
    setOrdersPage(0);
  }, [debouncedSearchTerm, filterScope, filterStatus, filterPriority, periodFilter]);

  const defaultColumnWidths: Record<string, number> = {
    orderNumber: 120,
    clientName: 150,
    deviceInfo: 200,
    status: 170,
    priority: 120,
    estimatedCost: 120,
    createdAt: 150,
    actions: 400,
  };

  const updateColumnWidth = (field: string, width: number) => {
    const safeWidth = Number.isFinite(width) ? Math.max(80, Math.min(700, width)) : 120;
    setColumnLayout((prev) => ({
      ...prev,
      widths: {
        ...prev.widths,
        [field]: safeWidth,
      },
    }));
  };

  const handleColumnResizeStart = (
    event: React.MouseEvent<HTMLDivElement>,
    field: string,
    fallbackWidth: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = columnLayout.widths[field] || fallbackWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateColumnWidth(field, startWidth + moveEvent.clientX - startX);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const renderResizableHeader = (field: string, label: string, align: 'left' | 'center' = 'left') => (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        width: '100%',
        height: '100%',
      }}
    >
      <Typography variant="body2" fontWeight={700} noWrap sx={{ textAlign: align }}>
        {label}
      </Typography>
      <Box
        onMouseDown={(event) =>
          handleColumnResizeStart(event, field, defaultColumnWidths[field] || 120)
        }
        onClick={(event) => event.stopPropagation()}
        sx={{
          position: 'absolute',
          top: 0,
          right: -10,
          bottom: 0,
          width: 18,
          cursor: 'col-resize',
          zIndex: 4,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 12,
            bottom: 12,
            left: '50%',
            borderLeft: '1px solid rgba(15, 23, 42, 0.24)',
          },
          '&:hover::after': {
            borderLeftColor: 'rgba(234, 88, 12, 0.95)',
          },
        }}
      />
    </Box>
  );

  const baseColumns: GridColDef[] = useMemo(() => [
    {
      field: 'orderNumber',
      headerName: 'Номер заказа',
      width: columnLayout.widths.orderNumber || defaultColumnWidths.orderNumber,
      renderHeader: () => renderResizableHeader('orderNumber', 'Номер заказа', 'center'),
      renderCell: (params) => {
        const unreadCount = getOrderUnreadTelegramCount(params.row.id);
        return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="body2"
              fontWeight="700"
              color="primary.main"
              sx={{ cursor: 'pointer' }}
            >
              {params.value}
            </Typography>
            {unreadCount > 0 ? (
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <ChatBubbleOutline sx={{ fontSize: 16, color: '#3390ec' }} />
              </Badge>
            ) : null}
          </Box>
          {params.row.isWarranty && (
            <Chip
              size="small"
              icon={<Security sx={{ fontSize: 12 }} />}
              label="Гарантия"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: 'rgba(255, 107, 53, 0.12)',
                color: '#E64A19',
                '& .MuiChip-icon': { color: '#E64A19', ml: 0.5 },
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
        </Box>
        );
      },
    },
    {
      field: 'clientName',
      headerName: 'Клиент',
      width: columnLayout.widths.clientName || defaultColumnWidths.clientName,
      renderHeader: () => renderResizableHeader('clientName', 'Клиент'),
    },
    {
      field: 'deviceInfo',
      headerName: 'Устройство',
      width: columnLayout.widths.deviceInfo || defaultColumnWidths.deviceInfo,
      renderHeader: () => renderResizableHeader('deviceInfo', 'Устройство'),
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="600">
            {params.row.deviceBrand} {params.row.deviceModel}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            пароль: {params.row.devicePassword?.trim() || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Статус',
      width: columnLayout.widths.status || defaultColumnWidths.status,
      renderHeader: () => renderResizableHeader('status', 'Статус'),
      renderCell: (params) => {
        const statusValue = params.value as Order['status'];
        return (
          <Box sx={{ py: 0.5, width: '100%' }}>
            <StatusBadgeSelector
              value={statusValue}
              options={orderStatusOptions}
              stopPropagation
              fullWidth
              onChange={(nextStatus) => handleInlineStatusChange(params.row as Order, nextStatus)}
            />
          </Box>
        );
      },
    },
    {
      field: 'priority',
      headerName: 'Приоритет',
      width: columnLayout.widths.priority || defaultColumnWidths.priority,
      renderHeader: () => renderResizableHeader('priority', 'Приоритет'),
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
      headerName: 'Сумма',
      width: columnLayout.widths.estimatedCost || defaultColumnWidths.estimatedCost,
      renderHeader: () => renderResizableHeader('estimatedCost', 'Сумма'),
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          {getOrderTotal(params.row).toLocaleString('ru-RU')} ₽
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Дата создания',
      width: columnLayout.widths.createdAt || defaultColumnWidths.createdAt,
      renderHeader: () => renderResizableHeader('createdAt', 'Дата создания'),
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString('ru-RU')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: columnLayout.widths.actions || defaultColumnWidths.actions,
      renderHeader: () => renderResizableHeader('actions', 'Действия'),
      sortable: false,
      renderCell: (params: any) => {
        const unreadCount = getOrderUnreadTelegramCount(params.row.id);
        return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => void openCommunicationCenter(params.row, 'telegram')}
            title={unreadCount > 0 ? `Сообщения (${unreadCount} новых)` : 'Сообщения клиенту'}
            sx={{ color: '#3390ec' }}
          >
            <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error" max={9}>
              <ChatBubbleOutline fontSize="small" />
            </Badge>
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handleViewOrder(params.row)}
            title="Просмотр заказа"
            sx={{ color: '#FF6B35' }}
          >
            <Visibility />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handleAdvancePayment(params.row)}
            title="Внести аванс"
            sx={{ color: '#1565C0' }}
          >
            <Savings fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handlePayment(params.row)}
            title="Добавить оплату"
            sx={{ color: '#2E7D32' }}
          >
            <AttachMoney />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handleEditOrder(params.row)}
            title="Редактировать заказ"
            sx={{ color: '#607D8B' }}
          >
            <Edit />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => {
              handleAddWork(params.row);
            }}
            title="Добавить работу или запчасть"
            sx={{ color: '#4CAF50' }}
          >
            <Build />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handleDeleteOrder(params.row.id)}
            title="Удалить заказ"
            sx={{ color: '#F44336' }}
          >
            <Delete />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => {
              handleDeliveryOrder(params.row);
            }}
            title="Выдача заказа"
            sx={{ color: '#FF9800' }}
          >
            <LocalShipping />
          </IconButton>
        </Box>
        );
      },
    },
  ], [
    columnLayout.widths,
    getOrderUnreadTelegramCount,
    openCommunicationCenter,
    handleInlineStatusChange,
    handleViewOrder,
    handlePayment,
    handleAdvancePayment,
    handleEditOrder,
    handleAddWork,
    handleDeleteOrder,
    handleDeliveryOrder,
  ]);

  const columns = React.useMemo(() => {
    const fieldMap = new Map(baseColumns.map((column) => [column.field, column]));
    const fallbackOrder = baseColumns.map((column) => column.field);
    const orderedFields =
      columnLayout.order.length > 0
        ? [
            ...columnLayout.order.filter((field) => fieldMap.has(field)),
            ...fallbackOrder.filter((field) => !columnLayout.order.includes(field)),
          ]
        : fallbackOrder;

    return orderedFields
      .map((field) => fieldMap.get(field))
      .filter(Boolean) as GridColDef[];
  }, [baseColumns, columnLayout.order]);

  const rowsPerPage = ordersRowsPerPage;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const safeOrdersPage = Math.min(ordersPage, totalPages - 1);
  const paginatedOrders = filteredOrders.slice(
    safeOrdersPage * rowsPerPage,
    safeOrdersPage * rowsPerPage + rowsPerPage
  );
  const tableWidth = columns.reduce((total, column) => total + Number(column.width || 120), 0);

  const renderOrderCell = (column: GridColDef, row: Order) => {
    if (column.renderCell) {
      return column.renderCell({
        id: row.id,
        field: column.field,
        value: (row as any)[column.field],
        row,
        colDef: column,
      } as any);
    }

    return (row as any)[column.field] || '';
  };

  const handleColumnOrderChange = (params: { field: string; targetIndex: number; oldIndex: number }) => {
    const fallbackOrder = baseColumns.map((column) => column.field);
    const currentOrder = columnLayout.order.length > 0 ? [...columnLayout.order] : fallbackOrder;
    const currentIndex = currentOrder.indexOf(params.field);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = Math.max(0, Math.min(params.targetIndex, currentOrder.length - 1));
    if (currentIndex === targetIndex) {
      return;
    }

    const nextOrder = [...currentOrder];
    const [movedColumn] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, movedColumn);

    setColumnLayout((prev) => ({
      ...prev,
      order: nextOrder,
    }));
  };

  return (
    <Box sx={{ display: 'grid', gap: 1, width: '100%' }}>
      <Box
        sx={{
          bgcolor: 'transparent',
          border: 0,
          borderRadius: 0,
          overflow: 'visible',
          boxShadow: 'none',
        }}
      >
        {/* Controls */}
        <Box
          sx={{
            px: { xs: 1.5, md: 2 },
            py: 1,
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
            '& .MuiInputBase-root': {
              minHeight: 42,
            },
            '& .MuiButton-root': {
              minHeight: 38,
            },
          }}
        >
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Поиск по номеру, клиенту, телефону, устройству или проблеме"
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
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Раздел</InputLabel>
                <Select
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value as typeof filterScope)}
                  label="Раздел"
                >
                  <MenuItem value="active">Активные</MenuItem>
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value="completed">Завершенные</MenuItem>
                  <MenuItem value="cancelled">Отмененные</MenuItem>
                  <MenuItem value="paid">Оплаченные</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Статус</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Статус"
                >
                  <MenuItem value="all">Все</MenuItem>
                  {orderStatusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
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
            <PeriodFilter value={periodFilter} onChange={setPeriodFilter} />
          </Grid>

          <Box
            sx={{
              display: 'flex',
              flexWrap: { xs: 'wrap', xl: 'nowrap' },
              gap: 1,
              mt: 1,
              '& .MuiButton-root': {
                minHeight: 42,
                flex: {
                  xs: '1 1 100%',
                  sm: '1 1 calc(50% - 8px)',
                  lg: '1 1 0',
                },
                minWidth: { lg: 170, xl: 0 },
                px: 1.5,
                whiteSpace: 'nowrap',
              },
            }}
          >
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterScope('active');
                  setFilterStatus('all');
                  setFilterPriority('all');
                  setPeriodFilter(defaultPeriodFilterValue('all'));
                }}
              >
                Сбросить
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateConfiguredOrder}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)',
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)',
                    boxShadow: 'none',
                  }
                }}
              >
                Новый заказ
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Security />}
                onClick={openWarrantyOrderDialog}
              >
                Гарантийный заказ
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Build />}
                onClick={() => setIsQuickWorkDialogOpen(true)}
              >
                Быстрая работа
              </Button>
            {quickSaleOptions.map((option) => (
                <Button
                  key={option.id}
                  fullWidth
                  variant="outlined"
                  startIcon={option.saleMode === 'single' ? <Description /> : <LocalShipping />}
                  onClick={() => openQuickSaleDialog(option.id)}
                >
                  {option.label}
                </Button>
            ))}
          </Box>
        </Box>

        {/* Orders Table */}
        <Box sx={{ bgcolor: 'var(--crm-panel)' }}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                minWidth: tableWidth,
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                {columns.map((column) => (
                  <col key={column.field} style={{ width: Number(column.width || 120) }} />
                ))}
              </colgroup>
              <Box component="thead" sx={{ bgcolor: 'var(--crm-panel)' }}>
                <Box component="tr">
                  {columns.map((column) => (
                    <Box
                      component="th"
                      key={column.field}
                      sx={{
                        position: 'relative',
                        height: 52,
                        px: 1.5,
                        textAlign: 'left',
                        borderBottom: '1px solid var(--crm-border)',
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                      }}
                    >
                      {renderResizableHeader(column.field, column.headerName || column.field)}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {paginatedOrders.map((order) => {
                  const unreadCount = getOrderUnreadTelegramCount(order.id);
                  return (
                  <Box
                    component="tr"
                    key={order.id}
                    onClick={() => handleViewOrder(order)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: unreadCount > 0 ? 'rgba(51, 144, 236, 0.07)' : undefined,
                      '&:hover': {
                        bgcolor: unreadCount > 0 ? 'rgba(51, 144, 236, 0.11)' : 'rgba(15, 23, 42, 0.025)',
                      },
                    }}
                  >
                    {columns.map((column) => (
                      <Box
                        component="td"
                        key={column.field}
                        onClick={column.field === 'actions' ? (event) => event.stopPropagation() : undefined}
                        sx={{
                          height: 52,
                          px: 1.5,
                          py: 0.75,
                          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                          verticalAlign: 'middle',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {renderOrderCell(column, order)}
                      </Box>
                    ))}
                  </Box>
                  );
                })}
                {paginatedOrders.length === 0 && (
                  <Box component="tr">
                    <Box
                      component="td"
                      colSpan={columns.length}
                      sx={{
                        py: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                        borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                      }}
                    >
                      Нет заказов
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 2,
              minHeight: 52,
              px: 2,
              borderTop: '1px solid rgba(15, 23, 42, 0.08)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Заказов на странице
            </Typography>
            <Select
              size="small"
              value={ordersRowsPerPage}
              onChange={(event) => {
                const nextRowsPerPage = Number(event.target.value);
                setOrdersRowsPerPage(nextRowsPerPage);
                setColumnLayout((prev) => ({
                  ...prev,
                  rowsPerPage: nextRowsPerPage,
                }));
                setOrdersPage(0);
              }}
              sx={{ minWidth: 88 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
            <Typography variant="body2">
              {filteredOrders.length === 0
                ? '0-0 из 0'
                : `${safeOrdersPage * rowsPerPage + 1}-${Math.min(
                    (safeOrdersPage + 1) * rowsPerPage,
                    filteredOrders.length
                  )} из ${filteredOrders.length}`}
            </Typography>
            <Button
              size="small"
              variant="text"
              disabled={safeOrdersPage === 0}
              onClick={() => setOrdersPage((page) => Math.max(0, page - 1))}
              sx={{ minWidth: 36 }}
            >
              {'<'}
            </Button>
            <Button
              size="small"
              variant="text"
              disabled={safeOrdersPage >= totalPages - 1}
              onClick={() => setOrdersPage((page) => Math.min(totalPages - 1, page + 1))}
              sx={{ minWidth: 36 }}
            >
              {'>'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Информация о заказе</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" gutterBottom>
                    Заказ {selectedOrder.orderNumber}
                  </Typography>
                  {selectedOrder.isWarranty && (
                    <Chip
                      size="small"
                      icon={<Security sx={{ fontSize: 14 }} />}
                      label="Гарантийный заказ"
                      sx={{
                        bgcolor: 'rgba(255, 107, 53, 0.14)',
                        color: '#E64A19',
                        fontWeight: 700,
                        '& .MuiChip-icon': { color: '#E64A19' },
                      }}
                    />
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Клиент
                </Typography>
                <Typography variant="body1">
                  {selectedOrder.clientName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatPhone(selectedOrder.clientPhone)}
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
                  {getOrderStatedProblem(selectedOrder) || 'Не указано'}
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
                  label={getStatusOption(selectedOrder.status).label}
                  sx={{
                    bgcolor: getStatusOption(selectedOrder.status).color,
                    color: '#fff',
                    fontWeight: 700,
                  }}
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
                  {getOrderTotal(selectedOrder).toLocaleString('ru-RU')} ₽
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
              const escapePrintValue = (value: unknown) =>
                String(value ?? '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                toast.error('Окно печати заблокировано браузером');
                return;
              }

              printWindow.document.write(`
                <!doctype html>
                <html lang="ru">
                  <head>
                    <meta charset="utf-8">
                    <title>Заказ ${escapePrintValue(selectedOrder.orderNumber)}</title>
                    <style>
                      @page { size: A4; margin: 14mm; }
                      html, body { margin: 0; padding: 0; background: #fff; color: #000; }
                      body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.45; }
                      h2 { margin: 0 0 14px; font-size: 20px; }
                      p { margin: 0 0 8px; }
                    </style>
                  </head>
                  <body>
                    <h2>Заказ ${escapePrintValue(selectedOrder.orderNumber)}</h2>
                    <p>Клиент: ${escapePrintValue(selectedOrder.clientName)}</p>
                    <p>Устройство: ${escapePrintValue(`${selectedOrder.deviceBrand || ''} ${selectedOrder.deviceModel || ''}`.trim())}</p>
                    <p>Описание: ${escapePrintValue(getOrderStatedProblem(selectedOrder))}</p>
                    <p>Стоимость: ${escapePrintValue(getOrderTotal(selectedOrder).toLocaleString('ru-RU'))} ₽</p>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            }
          }}>
            Печать документов
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{paymentDialogMode === 'advance' ? 'Внести аванс' : 'Оплата заказа'}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">
                  Заказ {selectedOrder.orderNumber}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {paymentDialogMode === 'advance'
                    ? `Уже оплачено: ${getOrderPaidAmount(selectedOrder).toLocaleString('ru-RU')} ₽ · Остаток: ${getOrderDebt(selectedOrder).toLocaleString('ru-RU')} ₽`
                    : `К оплате: ${getOrderDebt(selectedOrder).toLocaleString('ru-RU')} ₽`}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Способ оплаты</InputLabel>
                  <Select
                    value={quickPaymentMethod}
                    label="Способ оплаты"
                    onChange={(e) => setQuickPaymentMethod(e.target.value as typeof quickPaymentMethod)}
                  >
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
                  value={quickPaymentAmount}
                  onChange={(e) => setQuickPaymentAmount(Number(e.target.value))}
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
                  value={quickPaymentNotes}
                  onChange={(e) => setQuickPaymentNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleAddPayment}>
            {paymentDialogMode === 'advance' ? 'Внести аванс' : 'Провести оплату'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order View Dialog */}
      <Dialog
        open={isOrderViewDialogOpen}
        onClose={() => setIsOrderViewDialogOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: '96vw',
            maxWidth: 1540,
            height: '92vh',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ flexShrink: 0 }}>Просмотр заказа</DialogTitle>
        <DialogContent
          dividers
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {selectedOrder && (
            <Box sx={{ mt: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <Grid
                container
                spacing={2}
                alignItems="stretch"
                sx={{ height: '100%', minHeight: 0 }}
              >
                <Grid item xs={12} md={4} sx={{ height: { xs: 'auto', md: '100%' }, minHeight: { xs: 320, md: 0 }, display: 'flex' }}>
                  <Card
                    sx={{
                      width: '100%',
                      height: { xs: 360, md: '100%' },
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Typography variant="h6" gutterBottom>История заказа</Typography>
                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <OrderMasterCommentField onSubmit={(text) => void handleAddMasterComment(text)} />
                      </Grid>
                      {(() => {
                        const internalHistory = [...getOrderInternalHistory(selectedOrder)].sort(
                          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                        if (internalHistory.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Пока нет записей. История будет появляться при изменениях заказа, оплатах и комментариях.
                            </Typography>
                          );
                        }
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {internalHistory.map((entry) => (
                              <Card key={entry.id} variant="outlined">
                                <CardContent sx={{ py: 1.25 }}>
                                  <Typography variant="body2" fontWeight={700}>
                                    {getHistoryChannelLabel(entry.channel, entry)} • {entry.author}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                    {new Date(entry.createdAt).toLocaleString('ru-RU')}
                                  </Typography>
                                  <Typography variant="body2">{entry.message}</Typography>
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={8} sx={{ height: { xs: 'auto', md: '100%' }, minHeight: 0, minWidth: 0, display: 'flex' }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 'auto', md: '100%' },
                  maxHeight: { xs: 'none', md: '100%' },
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  pr: 1,
                  pb: 3,
                  boxSizing: 'border-box',
                }}
              >
              {/* Основная информация о заказе */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Заказ {selectedOrder.orderNumber}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Статус:
                        </Typography>
                        <StatusBadgeSelector
                          value={selectedOrder.status}
                          options={orderStatusOptions}
                          onChange={(nextStatus) => handleQuickOrderUpdate({ status: nextStatus })}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Приоритет:
                        </Typography>
                        <Chip
                          label={getPriorityOption(selectedOrder.priority).label}
                          color={getPriorityOption(selectedOrder.priority).color as any}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Дата создания: {new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {Number(selectedOrder.estimatedCost || 0) > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Согласованная стоимость:{' '}
                          <strong>{Number(selectedOrder.estimatedCost).toLocaleString('ru-RU')} ₽</strong>
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: Number(selectedOrder.estimatedCost || 0) > 0 ? 1 : 0 }}>
                        Итоговая стоимость: <strong>{getOrderTotal(selectedOrder).toLocaleString('ru-RU')} ₽</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Оплачено: <strong>{getOrderPaidAmount(selectedOrder).toLocaleString('ru-RU')} ₽</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Остаток: <strong>{getOrderDebt(selectedOrder).toLocaleString('ru-RU')} ₽</strong>
                      </Typography>
                      {(() => {
                        const earnings = getOrderEarningsBreakdown(selectedOrder);
                        const earningsRows = [
                          {
                            key: 'technician',
                            label: 'Исполнитель',
                            name: selectedOrder.technicianName || 'Не назначен',
                            value: selectedOrder.technicianId || '',
                            amount: earnings.technicianAmount,
                          },
                          {
                            key: 'intake',
                            label: 'Принял менеджер',
                            name: selectedOrder.intakeManagerName || 'Не назначен',
                            value: selectedOrder.intakeManagerName || '',
                            amount: earnings.intakeAmount,
                          },
                          {
                            key: 'delivery',
                            label: 'Выдает менеджер',
                            name: selectedOrder.deliveryManagerName || 'Не назначен',
                            value: selectedOrder.deliveryManagerName || '',
                            amount: earnings.deliveryAmount,
                          },
                        ];
                        return (
                          <Box sx={{ mt: 1 }}>
                            {earningsRows.map((row) => (
                              <Box
                                key={row.label}
                                sx={{
                                  mt: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 2,
                                }}
                              >
                                <FormControl size="small" sx={{ minWidth: 210, flex: 1 }}>
                                  <InputLabel>{row.label}</InputLabel>
                                  <Select
                                    value={row.value}
                                    label={row.label}
                                    onChange={(event) => {
                                      if (row.key === 'technician') {
                                        const technician = assigneeOptions.find((option) => option.id === event.target.value);
                                        handleQuickOrderUpdate({
                                          technicianId: event.target.value,
                                          technicianName: technician?.name || '',
                                        });
                                        return;
                                      }

                                      if (row.key === 'intake') {
                                        handleQuickOrderUpdate({ intakeManagerName: event.target.value });
                                        return;
                                      }

                                      handleQuickOrderUpdate({ deliveryManagerName: event.target.value });
                                    }}
                                  >
                                    {row.key === 'technician' && (
                                      <MenuItem value="">
                                        Не назначен
                                      </MenuItem>
                                    )}
                                    {assigneeOptions.map((option) => (
                                      <MenuItem key={`${row.key}_${option.id}`} value={row.key === 'technician' ? option.id : option.name}>
                                        {option.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <Typography variant="body2" fontWeight={700} color="success.main" sx={{ whiteSpace: 'nowrap' }}>
                                  {row.amount.toLocaleString('ru-RU')} ₽
                                </Typography>
                              </Box>
                            ))}

                            {user?.role === 'admin' && (() => {
                              const revenue = getOrderTotal(selectedOrder);
                              const partsCost = getOrderPartsCost(selectedOrder);
                              const grossMargin = Math.max(revenue - partsCost, 0);
                              const totalPayouts =
                                earnings.technicianAmount +
                                earnings.intakeAmount +
                                earnings.deliveryAmount;
                              const serviceProfit = Math.max(grossMargin - totalPayouts, 0);

                              return (
                                <Box
                                  sx={{
                                    mt: 1.5,
                                    pt: 1.5,
                                    borderTop: '1px dashed',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Typography variant="body2" color="text.secondary">
                                    Себестоимость запчастей: <strong>{partsCost.toLocaleString('ru-RU')} ₽</strong>
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Маржа до выплат сотрудникам: <strong>{grossMargin.toLocaleString('ru-RU')} ₽</strong>
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Выплаты сотрудникам: <strong>{totalPayouts.toLocaleString('ru-RU')} ₽</strong>
                                  </Typography>
                                  <Typography variant="body2" fontWeight={800} sx={{ mt: 0.75, color: '#0f766e' }}>
                                    Прибыль сервиса: {serviceProfit.toLocaleString('ru-RU')} ₽
                                  </Typography>
                                </Box>
                              );
                            })()}
                          </Box>
                        );
                      })()}
                    </Grid>
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ mt: 1 }}>
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1.5}
                                justifyContent="space-between"
                                alignItems={{ xs: 'stretch', md: 'center' }}
                              >
                                <Typography variant="subtitle1">
                                  Быстрое управление заказом
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                                  <Button size="small" variant="outlined" startIcon={<Phone />} onClick={() => handleCallClient(selectedOrder.clientPhone || '', selectedOrder)}>
                                    Позвонить
                                  </Button>
                                  <Badge
                                    badgeContent={
                                      selectedOrderUnreadTelegramCount > 0
                                        ? selectedOrderUnreadTelegramCount
                                        : undefined
                                    }
                                    color="error"
                                    max={9}
                                  >
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<ChatBubbleOutline />}
                                      onClick={() => handleTelegramClient(selectedOrder)}
                                      title={
                                        selectedOrderUnreadTelegramCount > 0
                                          ? `Сообщения (${selectedOrderUnreadTelegramCount} новых)`
                                          : 'Чат с клиентом'
                                      }
                                      sx={{
                                        color: '#3390ec',
                                        borderColor: '#3390ec',
                                        '&:hover': { borderColor: '#2b7fd4', bgcolor: 'rgba(51, 144, 236, 0.06)' },
                                      }}
                                    >
                                      Чат
                                    </Button>
                                  </Badge>
                                </Stack>
                              </Stack>
                            </Grid>
                            <Grid item xs={12}>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button size="small" variant="outlined" startIcon={<Build />} onClick={() => handleAddWork(selectedOrder)}>
                                  Добавить работу
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<Savings />} onClick={() => handleAdvancePayment(selectedOrder)}>
                                  Внести аванс
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<AttachMoney />} onClick={() => handlePayment(selectedOrder)}>
                                  Оплата
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<LocalShipping />} onClick={() => handleDeliveryOrder(selectedOrder)}>
                                  Выдача
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<Print />} onClick={() => handleViewDocument(selectedOrder, 'acceptance')}>
                                  Акт приема
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<Description />} onClick={() => handleViewDocument(selectedOrder, 'completion')}>
                                  Акт работ
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => handleEditOrder(selectedOrder)}>
                                  Полное редактирование
                                </Button>
                              </Stack>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Все изменения по заказу доступны через действия выше и полное редактирование.
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
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
                        Телефон: <strong>{formatPhone(selectedOrder.clientPhone)}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Phone />}
                          onClick={() => handleCallClient(selectedOrder.clientPhone || '', selectedOrder)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Позвонить
                        </Button>
                        <Badge
                          badgeContent={
                            selectedOrderUnreadTelegramCount > 0
                              ? selectedOrderUnreadTelegramCount
                              : undefined
                          }
                          color="error"
                          max={9}
                        >
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ChatBubbleOutline />}
                            onClick={() => handleTelegramClient(selectedOrder)}
                            title={
                              selectedOrderUnreadTelegramCount > 0
                                ? `Сообщения (${selectedOrderUnreadTelegramCount} новых)`
                                : 'Чат с клиентом'
                            }
                            sx={{
                              color: '#3390ec',
                              borderColor: '#3390ec',
                              whiteSpace: 'nowrap',
                              '&:hover': { borderColor: '#2b7fd4', bgcolor: 'rgba(51, 144, 236, 0.06)' },
                            }}
                          >
                            Чат
                          </Button>
                        </Badge>
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
                        Цвет: <strong>{selectedOrder.deviceColor || 'Не указан'}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        IMEI: <strong>{selectedOrder.deviceImei || 'Не указан'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        S/N: <strong>{selectedOrder.deviceSerial || 'Не указан'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        пароль: <strong>{selectedOrder.devicePassword || '—'}</strong>
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
                    {getOrderStatedProblem(selectedOrder) || 'Описание не указано'}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h6">Работы и запчасти</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Build />}
                      onClick={() => {
                        setIsOrderViewDialogOpen(false);
                        handleAddWork(selectedOrder);
                      }}
                    >
                      Добавить работу или запчасть
                    </Button>
                  </Box>

                  {selectedOrder.parts && selectedOrder.parts.length > 0 ? (
                    <Box>
                      {selectedOrder.parts.map((part, index) => {
                        const linkedPart = (part as any).partInfo;
                        const itemTitle = getOrderLineTitle(part as any);

                        return (
                          <Box
                            key={part.id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 2,
                              py: 1.5,
                              borderBottom: index < selectedOrder.parts!.length - 1 ? '1px solid' : 'none',
                              borderColor: 'divider',
                            }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body1" fontWeight={700}>
                                {itemTitle}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Количество: {part.quantity} • Цена: {part.unitPrice.toLocaleString('ru-RU')} ₽ • Сумма: {part.totalPrice.toLocaleString('ru-RU')} ₽
                              </Typography>
                              {linkedPart && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  Запчасть: {linkedPart.name} • Остаток на момент выбора: {linkedPart.stockQuantity ?? linkedPart.quantity ?? '—'}
                                </Typography>
                              )}
                              {(part as any).workType && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  Тип: {getWorkTypeLabel((part as any).workType)}
                                </Typography>
                              )}
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                              <IconButton
                                onClick={() => handleEditWorkItem(selectedOrder, part)}
                                sx={{ color: 'text.secondary' }}
                                title="Редактировать позицию"
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                onClick={() => handleRemovePart(part.id)}
                                sx={{ color: 'error.main' }}
                                title="Убрать позицию из заказа"
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </Box>
                        );
                      })}

                      <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid #FF6B35' }}>
                        <Typography variant="h6" color="primary" textAlign="right">
                          Итого по работам и запчастям: {selectedOrder.parts.reduce((sum, part) => sum + part.totalPrice, 0).toLocaleString('ru-RU')} ₽
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Работы и запчасти еще не добавлены.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Действия */}
              <Card sx={{ overflow: 'visible' }}>
                <CardContent sx={{ overflow: 'visible' }}>
                  <Typography variant="h6" gutterBottom>Действия</Typography>
                  <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ width: '100%' }}>
                    <Button
                      variant="contained"
                      startIcon={<Print />}
                      onClick={() => handleViewDocument(selectedOrder, 'acceptance')}
                      sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, maxWidth: '100%' }}
                    >
                      Печать акта приема-передачи
                    </Button>
                    {selectedOrder.status === completedStatusCode && (
                      <Button
                        variant="outlined"
                        startIcon={<Print />}
                        onClick={() => handleViewDocument(selectedOrder, 'completion')}
                        sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, maxWidth: '100%' }}
                      >
                        Печать акта выполненных работ
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => {
                        setIsOrderViewDialogOpen(false);
                        handleEditOrder(selectedOrder);
                      }}
                      sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, maxWidth: '100%' }}
                    >
                      Редактировать заказ
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
              </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
          <Button onClick={() => setIsOrderViewDialogOpen(false)}>
            Закрыть
          </Button>
          {selectedOrder && (
            <>
              <Button variant="outlined" startIcon={<Savings />} onClick={() => handleAdvancePayment(selectedOrder)}>
                Внести аванс
              </Button>
              <Button variant="contained" startIcon={<AttachMoney />} onClick={() => handlePayment(selectedOrder)}>
                Оплата
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCommunicationDialogOpen}
        onClose={() => setIsCommunicationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: communicationDialogPaperSx,
        }}
      >
        {selectedOrder && (
          <>
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                bgcolor: '#3390ec',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                flexShrink: 0,
              }}
            >
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: 'rgba(255,255,255,0.22)',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {getClientInitials(selectedOrder.clientName)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {selectedOrder.clientName || 'Клиент'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }} noWrap>
                  {formatPhone(selectedOrder.clientPhone) || 'Телефон не указан'} • заказ {selectedOrder.orderNumber}
                </Typography>
              </Box>
              {communicationChannel === 'telegram' && getExternalTelegramLink(selectedOrder, '') ? (
                <IconButton
                  size="small"
                  sx={{ color: '#fff' }}
                  onClick={() => openExternalTelegram(selectedOrder, '')}
                  title="Открыть в Telegram"
                >
                  <Telegram fontSize="small" />
                </IconButton>
              ) : null}
              <IconButton
                size="small"
                sx={{ color: '#fff' }}
                onClick={() => setIsCommunicationDialogOpen(false)}
                disabled={isSendingCommunication}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box
              sx={(theme) => ({
                px: 1.5,
                py: 1,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f4f4f5',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 0.75,
                flexShrink: 0,
              })}
            >
              <Button
                size="small"
                variant={communicationChannel === 'telegram' ? 'contained' : 'outlined'}
                startIcon={<Telegram />}
                onClick={() => setCommunicationChannel('telegram')}
                sx={
                  communicationChannel === 'telegram'
                    ? { bgcolor: '#3390ec', boxShadow: 'none', '&:hover': { bgcolor: '#2b7fd4' } }
                    : undefined
                }
              >
                Telegram
              </Button>
              <Button
                size="small"
                variant={communicationChannel === 'sms' ? 'contained' : 'outlined'}
                startIcon={<Sms />}
                onClick={() => setCommunicationChannel('sms')}
                sx={
                  communicationChannel === 'sms'
                    ? { bgcolor: '#3390ec', boxShadow: 'none', '&:hover': { bgcolor: '#2b7fd4' } }
                    : undefined
                }
              >
                SMS
              </Button>
              {communicationChannel === 'telegram' &&
              crmSettings.integrations.telegramConnected &&
              getTelegramBotLink(selectedOrder) ? (
                <Stack direction="row" spacing={0.5} sx={{ ml: 'auto', flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const link = getTelegramBotLink(selectedOrder);
                      if (link) {
                        window.location.assign(link);
                      }
                    }}
                    sx={{ bgcolor: 'background.paper', minWidth: 0, px: 1 }}
                  >
                    Открыть
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopy sx={{ fontSize: 16 }} />}
                    onClick={() => void copyTelegramBotLink(selectedOrder)}
                    sx={{ bgcolor: 'background.paper', minWidth: 0, px: 1 }}
                  >
                    Копировать
                  </Button>
                </Stack>
              ) : null}
            </Box>

            {communicationChannel === 'telegram' && crmSettings.integrations.telegramConnected && (
              getClientTelegramChatId(selectedOrder) ? (
                <Alert severity="success" sx={{ borderRadius: 0, py: 0.5 }}>
                  Telegram клиента привязан — можно писать в чат.
                  {getTelegramBotLink(selectedOrder) ? (
                    <>
                      {' '}
                      <Box
                        component="button"
                        type="button"
                        onClick={() => window.location.assign(getTelegramBotLink(selectedOrder))}
                        sx={{
                          display: 'block',
                          wordBreak: 'break-all',
                          mt: 0.5,
                          color: 'inherit',
                          background: 'none',
                          border: 'none',
                          p: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        {getTelegramBotLink(selectedOrder)}
                      </Box>
                    </>
                  ) : null}
                </Alert>
              ) : getTelegramBotLink(selectedOrder) ? (
                <Alert severity="warning" sx={{ borderRadius: 0, py: 0.5 }}>
                  Отправьте клиенту ссылку (удержите для копирования на телефоне):
                  <Box
                    component="button"
                    type="button"
                    onClick={() => window.location.assign(getTelegramBotLink(selectedOrder))}
                    sx={{
                      display: 'block',
                      wordBreak: 'break-all',
                      mt: 0.5,
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      p: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'inherit',
                      textDecoration: 'underline',
                    }}
                  >
                    {getTelegramBotLink(selectedOrder)}
                  </Box>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ borderRadius: 0, py: 0.5 }}>
                  Подключите бота в настройках.
                </Alert>
              )
            )}

            {communicationChannel === 'sms' &&
              (!crmSettings.integrations.smsConnected ||
                crmSettings.integrations.smsProvider === 'none') && (
                <Alert severity="warning" sx={{ borderRadius: 0, py: 0.5 }}>
                  Подключите SMS-провайдера в настройках, чтобы отправлять сообщения.
                </Alert>
              )}

            <Box sx={communicationChatAreaSx}>
              {getChannelCommunicationHistory(selectedOrder, communicationChannel).length === 0 ? (
                <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary', px: 2 }}>
                  <Typography variant="body2">
                    {communicationChannel === 'sms' ? 'Пока нет SMS' : 'Пока нет сообщений'}
                  </Typography>
                  <Typography variant="caption">
                    {communicationChannel === 'sms'
                      ? 'Отправьте SMS клиенту — переписка появится здесь'
                      : 'Напишите клиенту первым сообщением ниже'}
                  </Typography>
                </Box>
              ) : (
                [...getChannelCommunicationHistory(selectedOrder, communicationChannel)]
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((entry) => {
                    const inbound = isInboundCommunicationEntry(entry);
                    const bubbleText = formatCommunicationBubbleText(entry);
                    const bubbleStyle = getChatBubbleStyles(theme, {
                      inbound,
                      channel: communicationChannel,
                    });
                    return (
                      <Box
                        key={entry.id}
                        sx={{
                          display: 'flex',
                          justifyContent: inbound ? 'flex-start' : 'flex-end',
                          alignItems: 'flex-end',
                          gap: 0.75,
                        }}
                      >
                        {inbound ? (
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: 11,
                              bgcolor: communicationChannel === 'sms' ? '#f5a623' : '#7baaf7',
                              mb: 0.25,
                            }}
                          >
                            {getClientInitials(selectedOrder.clientName)}
                          </Avatar>
                        ) : null}
                        <Box
                          sx={{
                            maxWidth: '78%',
                            px: 1.25,
                            py: 0.75,
                            borderRadius: inbound ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                            bgcolor: bubbleStyle.bgcolor,
                            color: bubbleStyle.color,
                            boxShadow: bubbleStyle.boxShadow,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'inherit' }}
                          >
                            {bubbleText}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              textAlign: 'right',
                              color: bubbleStyle.timestampColor,
                              fontSize: 11,
                              mt: 0.25,
                              lineHeight: 1.2,
                            }}
                          >
                            {new Date(entry.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
              )}
              <div ref={chatMessagesEndRef} />
            </Box>

            <OrderCommunicationComposer
              channel={communicationChannel}
              sending={isSendingCommunication}
              onSend={handleSendCommunication}
            />
          </>
        )}
      </Dialog>

      <OrderEditDialog
        open={isEditOrderDialogOpen}
        order={selectedOrder}
        orderStatusOptions={orderStatusOptions}
        assigneeOptions={assigneeOptions}
        onClose={() => setIsEditOrderDialogOpen(false)}
        onSave={handleSaveOrderEdit}
        onPrintAcceptance={(order) => handleViewDocument(order, 'acceptance')}
      />
      <OrderAddWorkDialog
        key={addWorkFormKey}
        open={isAddWorkDialogOpen}
        order={selectedOrder}
        editingWorkItemId={editingWorkItemId}
        selectedPart={selectedPart}
        workNameOptions={workNameOptions}
        initialValues={addWorkInitialForm}
        onClose={() => {
          setIsAddWorkDialogOpen(false);
          resetAddWorkForm();
        }}
        onSearchParts={handleSearchParts}
        onClearPart={() => setSelectedPart(null)}
        onSubmit={(values) => void handleAddWorkToOrder(values)}
      />
      {/* Search Parts Dialog */}
      <Dialog open={isSearchPartsDialogOpen} onClose={() => setIsSearchPartsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle component="div">
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Typography variant="h6" fontWeight={700}>Поиск запчастей на складе</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => openQuickReceiveDialog({ name: partsSearchTerm.trim() })}>
              Быстрое оприходование
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Поиск запчастей"
                  value={partsSearchTerm}
                  onChange={(e) => setPartsSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={7}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={partCategoryOptions}
                      value={partsCategoryFilter || null}
                      onChange={(_, value) => {
                        setPartsCategoryFilter(value || '');
                        setPartsBrandFilter('');
                        setPartsModelFilter('');
                      }}
                      renderInput={(params) => <TextField {...params} label="Категория" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={partBrandOptions}
                      value={partsBrandFilter || null}
                      onChange={(_, value) => {
                        setPartsBrandFilter(value || '');
                        setPartsModelFilter('');
                      }}
                      renderInput={(params) => <TextField {...params} label="Бренд" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={partModelOptions}
                      value={partsModelFilter || null}
                      onChange={(_, value) => setPartsModelFilter(value || '')}
                      renderInput={(params) => <TextField {...params} label="Модель" />}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Card sx={{ p: 1.5, maxHeight: 430, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                  <Button
                    fullWidth
                    size="small"
                    variant={!partsCategoryFilter ? 'contained' : 'text'}
                    onClick={() => {
                      setPartsCategoryFilter('');
                      setPartsBrandFilter('');
                      setPartsModelFilter('');
                    }}
                    sx={{ justifyContent: 'flex-start', mb: 0.5 }}
                  >
                    Все категории
                  </Button>
                  {partCategoryOptions.map((category) => (
                    <Button
                      key={category}
                      fullWidth
                      size="small"
                      variant={partsCategoryFilter === category ? 'contained' : 'text'}
                      onClick={() => {
                        setPartsCategoryFilter(category);
                        setPartsBrandFilter('');
                        setPartsModelFilter('');
                      }}
                      sx={{ justifyContent: 'space-between', mb: 0.5 }}
                    >
                      <span>{category}</span>
                      <Chip size="small" label={inventoryParts.filter((part) => part.category === category).length} sx={{ ml: 1, height: 20 }} />
                    </Button>
                  ))}
                </Card>
              </Grid>

              <Grid item xs={12} md={9}>
                <Box sx={{ maxHeight: 430, overflow: 'auto', pr: 0.5 }}>
                  {filteredParts.map((part) => (
                    <Card
                      key={part.id}
                      sx={mergeSx({ mb: 1.5 }, selectableCardSx(selectedPart?.id === part.id))}
                      onClick={() => {
                        if (part.stock <= 0) {
                          openQuickReceiveDialog({
                            name: part.name,
                            category: part.category || 'Прочее',
                            brand: part.brand || '',
                            model: part.model || '',
                            wholesalePrice: String((part.wholesalePrice ?? part.price) || ''),
                          });
                          return;
                        }

                        setSelectedPart(part);
                        setIsSearchPartsDialogOpen(false);
                      }}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight="bold">{part.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {part.category} • {part.brand}{part.model ? ` • ${part.model}` : ''}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="h6" color="primary">{part.price} ₽</Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Chip label={`${part.stock} шт.`} color={part.stock > 0 ? 'success' : 'error'} size="small" />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredParts.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body1" color="text.secondary">Запчасти не найдены</Typography>
                      <Button sx={{ mt: 2 }} variant="contained" onClick={() => openQuickReceiveDialog({ name: partsSearchTerm.trim() })}>
                        Быстрое оприходование
                      </Button>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPartsSearchTerm('');
              setPartsCategoryFilter('');
              setPartsBrandFilter('');
              setPartsModelFilter('');
            }}
          >
            Сбросить фильтры
          </Button>
          <Button onClick={() => setIsSearchPartsDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      <QuickReceivePartDialog
        open={isQuickReceiveDialogOpen}
        inventoryParts={inventoryParts}
        initialValues={quickReceiveInitial}
        onClose={() => setIsQuickReceiveDialogOpen(false)}
        onSubmit={(values) => void handleQuickReceivePart(values)}
      />

      <QuickWorkDialog
        open={isQuickWorkDialogOpen}
        paymentMethods={crmSettings.payment.paymentMethodOptions}
        onClose={() => setIsQuickWorkDialogOpen(false)}
        onSubmit={(values) => void handleCreateQuickWork(values)}
      />

      <OrderDeliveryDialog
        open={isDeliveryDialogOpen}
        order={selectedOrder}
        onClose={() => setIsDeliveryDialogOpen(false)}
        onRemovePart={(partId) => void handleRemovePart(partId)}
        onAddWork={(order) => void handleAddWork(order)}
        onComplete={(payload) => void handleCompleteDelivery(payload)}
      />

      {isStepByStepOrderOpen && (
        <React.Suspense fallback={null}>
          <OrderCreationWizard
            open={isStepByStepOrderOpen}
            onClose={() => setIsStepByStepOrderOpen(false)}
            onSubmit={handleCreateOrderFromWizard}
            settings={crmSettings}
            onSettingsUpdated={setCrmSettings}
            clients={orderClients}
            assigneeOptions={assigneeOptions}
            protectionParts={protectionParts}
            defaultIntakeManagerName={user?.name || managerOptions[0]?.name || assigneeOptions[0]?.name || ''}
          />
        </React.Suspense>
      )}

      <OrderPriceListDialog
        open={isPriceDialogOpen}
        canEdit={user?.role === 'admin'}
        onClose={() => setIsPriceDialogOpen(false)}
      />

      <Dialog
        open={isQuickSaleDialogOpen}
        onClose={() => {
          setIsQuickSaleDialogOpen(false);
          setActiveQuickSaleId('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {activeQuickSaleOption?.label || 'Быстрая продажа'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Позиция со склада</InputLabel>
                <Select
                  value={quickSaleForm.partId}
                  label="Позиция со склада"
                  onChange={(e) => setQuickSaleForm((prev) => ({ ...prev, partId: e.target.value }))}
                >
                  {availableQuickSaleParts.map((part) => (
                    <MenuItem key={part.id} value={part.id}>
                      {part.name} · {part.brand || 'Без бренда'} · остаток {part.quantity} шт.
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {activeQuickSaleOption?.saleMode === 'quantity' && (
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Количество"
                  value={quickSaleForm.quantity}
                  onChange={(e) =>
                    setQuickSaleForm((prev) => ({
                      ...prev,
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
              </Grid>
            )}
            <Grid item xs={activeQuickSaleOption?.saleMode === 'quantity' ? 6 : 12}>
              <TextField
                fullWidth
                type="number"
                label="Цена продажи"
                value={quickSaleForm.salePrice}
                onChange={(e) => setQuickSaleForm((prev) => ({ ...prev, salePrice: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">₽</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Оплата</InputLabel>
                <Select
                  value={quickSaleForm.paymentMethod}
                  label="Оплата"
                  onChange={(e) => setQuickSaleForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  {enabledPaymentMethods.map((method) => (
                    <MenuItem key={method.code} value={method.code}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {selectedQuickSalePart && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Закупка: {Number(
                    selectedQuickSalePart.wholesalePrice ?? selectedQuickSalePart.unitPrice ?? 0
                  ).toLocaleString('ru-RU')} ₽ · Остаток: {selectedQuickSalePart.quantity} шт.
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Комментарий"
                value={quickSaleForm.note}
                onChange={(e) => setQuickSaleForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsQuickSaleDialogOpen(false);
              setActiveQuickSaleId('');
            }}
          >
            Отмена
          </Button>
          <Button variant="contained" onClick={handleCreateQuickSale}>
            Создать заказ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isWarrantyDialogOpen}
        onClose={() => {
          if (!isWarrantyCreating) {
            setIsWarrantyDialogOpen(false);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Гарантийный заказ</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Номер прошлого заказа"
            placeholder="Например: 000039"
            value={warrantySourceOrderNumber}
            onChange={(event) => setWarrantySourceOrderNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleCreateWarrantyOrder();
              }
            }}
            sx={{ mt: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Будет создан новый заказ с данными клиента и устройства из прошлого заказа, с пометкой гарантийного обращения.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={isWarrantyCreating} onClick={() => setIsWarrantyDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" disabled={isWarrantyCreating} onClick={handleCreateWarrantyOrder}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Generator */}
      {isDocumentDialogOpen && (
        <React.Suspense fallback={null}>
          <DocumentGenerator
            open={isDocumentDialogOpen}
            onClose={() => setIsDocumentDialogOpen(false)}
            document={selectedDocument}
            documentType={documentType}
            onSign={handleDocumentSign}
          />
        </React.Suspense>
      )}

      {/* Create Order Form */}
      {isCreateOrderFormOpen && (
        <React.Suspense fallback={null}>
          <CreateOrderForm
            open={isCreateOrderFormOpen}
            onClose={() => setIsCreateOrderFormOpen(false)}
            onSubmit={handleOrderFormSubmit}
          />
        </React.Suspense>
      )}

      <DataExchangeDialog
        open={dataExchangeOpen}
        onClose={() => setDataExchangeOpen(false)}
        title="Импорт и экспорт заказов"
        entityLabel="заказов"
        fileBaseName="zakazy"
        sheetName="Заказы"
        columns={ORDER_EXCHANGE_COLUMNS}
        exportRows={orderExchangeExportRows}
        templateSamples={orderTemplateSamples()}
        onImport={(rows, options) =>
          importOrderRows(rows, {
            ...options,
            defaultStatus: defaultOpenStatusCode,
            intakeManagerName: user?.name || 'Импорт',
          })
        }
        onImported={async () => {
          const savedOrders = await orderService.getOrders({ lite: true });
          setOrdersData(savedOrders);
          await clientService.refreshFromApi();
          setOrderClients(clientService.getClients());
        }}
      />
    </Box>
  );
};

export default Orders;

