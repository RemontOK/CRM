import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  LinearProgress,
  Menu,
  MenuItem,
  Select,
  Stack,
  SvgIcon,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  AccountCircleOutlined,
  AdminPanelSettingsOutlined,
  AssessmentOutlined,
  AssignmentOutlined,
  BuildOutlined,
  CalendarMonthOutlined,
  DescriptionOutlined,
  GroupOutlined,
  ImportExport,
  Inventory2Outlined,
  Logout,
  Menu as MenuIcon,
  NotificationsNoneOutlined,
  PeopleOutlined,
  Person,
  PointOfSaleOutlined,
  SettingsOutlined,
  ForumOutlined,
  Telegram,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../hooks/useAuth';
import { getSubscriptionSummary, formatDaysRemaining } from '../../utils/subscriptionSummary';
import { isCrmAccessBlocked } from '../../utils/tenantAccess';
import { useTelegramInbox } from '../../hooks/useTelegramInbox';
import { appSettingsService } from '../../services/appSettingsService';
import { cashService } from '../../services/cashService';
import { employeeService } from '../../services/employeeService';
import { employeeWorkService } from '../../services/employeeWorkService';
import { orderService } from '../../services/orderService';
import { clientService } from '../../services/clientService';
import { glassHeaderSx, layoutAppBarTitleSx, layoutHeaderShellSx, layoutSidebarBrandTitleSx, LAYOUT_HEADER_HEIGHT } from '../../styles/ui';
import { AppSettings, CashOperation, Employee, EmployeeTaskStatus, Order, TelegramInboxItem, UserNotification } from '../../types';
import { platformService } from '../../services/platformService';
import {
  datetimeLocalToApiValue,
  formatDatetimeLocalValue,
  userNotificationService,
} from '../../services/userNotificationService';
import { useCrmAppearance } from '../../context/CrmThemeProvider';
import { crmRadius } from '../../styles/tokens';
import { getAllowedModules, hasEmployeeSettingsAccess } from '../../utils/employeeModuleAccess';
import {
  employeeNamesMatch,
  getEmployeeOrderEarnings,
  getOrderMarginBase,
  getOrderTotal,
  isOrderDeliveryManager,
  isOrderIntakeManager,
  isOrderTechnician,
} from '../../utils/orderMetrics';

const drawerWidthExpanded = 292;
const drawerWidthCollapsed = 76;
const SIDEBAR_COLLAPSED_KEY = 'crm_sidebar_collapsed_v1';

const roleLabels = {
  admin: 'Администратор',
  manager: 'Менеджер',
  technician: 'Мастер',
  cashier: 'Кассир',
} as const;

const taskStatusLabels: Record<EmployeeTaskStatus, string> = {
  todo: 'Новая',
  in_progress: 'В работе',
  done: 'Готово',
  blocked: 'Проблема',
};

const formatMoneyCompact = (value: number) =>
  `${Math.round(value).toLocaleString('ru-RU')} ₽`;

const formatMoneyTiny = (value: number) => {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) {
    return `${Math.round(rounded / 1_000_000)}м`;
  }
  if (abs >= 1_000) {
    return `${Math.round(rounded / 1_000)}к`;
  }
  return `${rounded}`;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

interface LayoutProps {
  children: React.ReactNode;
}

const DashboardSvgIcon = () => (
  <SvgIcon viewBox="0 0 512 512" sx={{ fontSize: 20 }}>
    <path
      d="M4220 4810 l0 -150 192 0 193 0 -260 -261 c-143 -143 -340 -337 -438 -432 l-179 -171 -299 149 -299 150 -600 -600 -600 -600 -290 145 c-262 131 -292 144 -311 132 -12 -8 -300 -223 -640 -478 l-619 -464 90 -120 90 -120 562 422 562 421 308 -154 308 -154 600 600 600 600 299 -150 299 -149 514 509 513 508 3 -191 2 -192 150 0 150 0 0 450 0 450 -450 0 -450 0 0 -150z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
    <path
      d="M3910 1810 l0 -1350 -150 0 -150 0 0 1050 0 1050 -450 0 -450 0 0 -1050 0 -1050 -150 0 -150 0 0 750 0 750 -450 0 -450 0 0 -750 0 -750 -150 0 -150 0 0 450 0 450 -455 0 -455 0 0 -450 0 -450 -150 0 -150 0 0 -150 0 -150 2560 0 2560 0 0 150 0 150 -150 0 -150 0 0 1350 0 1350 -455 0 -455 0 0 -1350z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
  </SvgIcon>
);

const OrdersSvgIcon = () => (
  <SvgIcon viewBox="0 0 512 512" sx={{ fontSize: 20 }}>
    <path
      d="M2066 4949 c-62 -15 -153 -68 -197 -116 -66 -71 -101 -158 -107 -264 l-5 -89 -191 0 c-227 0 -294 -12 -415 -72 -166 -82 -299 -253 -336 -433 -12 -60 -15 -306 -15 -1655 0 -1765 -4 -1659 70 -1805 89 -176 248 -300 439 -341 100 -21 2404 -20 2506 1 213 44 404 218 478 435 l22 65 3 1612 c3 1803 7 1688 -69 1843 -81 164 -255 298 -434 335 -47 10 -133 15 -261 15 l-191 0 -5 89 c-10 162 -86 279 -226 349 l-76 37 -475 2 c-268 1 -493 -3 -515 -8z m949 -334 l25 -24 0 -271 0 -271 -25 -24 -24 -25 -431 0 -431 0 -24 25 -25 24 0 271 0 271 25 24 24 25 431 0 431 0 24 -25z m-1253 -544 c10 -162 86 -279 226 -349 l76 -37 495 0 496 0 67 32 c92 43 151 101 194 189 32 63 37 85 42 164 l5 92 201 -4 201 -3 63 -34 c70 -38 100 -69 140 -145 l27 -51 0 -1605 0 -1605 -27 -51 c-40 -76 -70 -107 -140 -145 l-63 -34 -1205 0 -1205 0 -63 34 c-70 38 -100 69 -140 145 l-27 51 0 1605 0 1605 23 45 c34 69 74 113 133 144 75 41 92 44 295 45 l181 1 5 -89z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
    <path
      d="M1855 3346 c-67 -29 -105 -106 -91 -181 9 -47 59 -102 104 -115 25 -8 257 -10 714 -8 665 3 677 3 704 24 53 39 69 71 69 134 0 63 -16 95 -69 134 -27 21 -38 21 -714 23 -556 2 -693 0 -717 -11z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
    <path
      d="M2020 2549 c-14 -5 -78 -62 -142 -126 l-117 -117 -45 42 c-74 68 -161 69 -227 3 -41 -41 -55 -88 -44 -148 10 -55 223 -268 278 -278 86 -16 97 -9 309 203 211 211 219 224 204 307 -17 91 -127 149 -216 114z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
    <path
      d="M2495 2386 c-67 -29 -105 -106 -91 -181 9 -47 59 -102 104 -115 25 -8 209 -10 554 -8 504 3 517 4 544 24 53 39 69 71 69 134 0 63 -16 95 -69 134 -27 21 -40 21 -554 23 -423 2 -533 0 -557 -11z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
    <path
      d="M2020 1589 c-14 -5 -78 -62 -142 -126 l-117 -117 -45 42 c-74 68 -161 69 -227 3 -41 -41 -55 -88 -44 -148 5 -31 28 -60 123 -155 126 -125 149 -138 230 -123 31 5 67 36 234 203 211 211 219 224 204 307 -17 91 -127 149 -216 114z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
    <path
      d="M2495 1426 c-67 -29 -105 -106 -91 -181 9 -47 59 -102 104 -115 25 -8 209 -10 554 -8 504 3 517 4 544 24 53 39 69 71 69 134 0 63 -16 95 -69 134 -27 21 -40 21 -554 23 -423 2 -533 0 -557 -11z"
      transform="translate(0,512) scale(0.1,-0.1)"
    />
  </SvgIcon>
);

const menuItems = [
  { text: 'Дашборд', icon: <DashboardSvgIcon />, path: '/dashboard' },
  { text: 'Заказы', icon: <OrdersSvgIcon />, path: '/orders' },
  { text: 'Сообщения', icon: <ForumOutlined />, path: '/messages' },
  { text: 'Клиенты', icon: <PeopleOutlined />, path: '/clients' },
  { text: 'Склад', icon: <Inventory2Outlined />, path: '/inventory' },
  { text: 'Сотрудники', icon: <GroupOutlined />, path: '/employees' },
  { text: 'Финансы', icon: <PointOfSaleOutlined />, path: '/cash-register' },
  { text: 'Отчеты', icon: <AssessmentOutlined />, path: '/reports' },
  { text: 'Мой профиль', icon: <AccountCircleOutlined />, path: '/my-profile', employeeOnly: true },
  { text: 'Настройки', icon: <SettingsOutlined />, path: '/settings' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  const theme = useTheme();
  const { colors, gradients } = useCrmAppearance();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const drawerWidth = !isMobile && sidebarCollapsed ? drawerWidthCollapsed : drawerWidthExpanded;
  const navigate = useNavigate();
  const location = useLocation();
  const isOrdersPage = location.pathname === '/orders';
  const isMessagesPage = location.pathname === '/messages';
  const isEdgeToEdgePage = isOrdersPage;
  const telegramPollTier = isOrdersPage || isMessagesPage ? 'active' : 'idle';
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => appSettingsService.getSettings());
  const subscriptionSummary = useMemo(
    () => getSubscriptionSummary(user?.tenant, settings.license.plan),
    [user?.tenant, settings.license.plan]
  );
  const showSubscriptionWarning =
    user?.role === 'admin' &&
    !user?.isPlatformAdmin &&
    !isCrmAccessBlocked(user) &&
    (subscriptionSummary.severity === 'warning' || subscriptionSummary.severity === 'error');
  const [cashOperations, setCashOperations] = useState<CashOperation[]>([]);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<UserNotification[]>([]);
  const [maintenanceAtLocal, setMaintenanceAtLocal] = useState('');
  const [maintenanceMeta, setMaintenanceMeta] = useState({ lastNotifiedAt: '', lastRecipients: 0 });
  const [maintenanceSending, setMaintenanceSending] = useState(false);
  const { telegramInbox, unreadTelegramMessages, markTelegramInboxSeen } = useTelegramInbox({
    enabled: Boolean(user && settings.integrations.telegramConnected),
    pollTier: telegramPollTier,
    onNewMessages: (brandNew) => {
      void clientService.refreshFromApi();
      brandNew.slice(0, 3).forEach((item) => {
        const preview = item.message.length > 80 ? `${item.message.slice(0, 80)}…` : item.message;
        const label = item.clientName || item.clientPhone || 'Клиент';
        toast(`Telegram: ${label} — ${preview}`, { icon: '💬' });
      });
    },
  });

  useEffect(() => {
    if (!user?.tenantId) {
      return;
    }

    const refreshSettings = async () => {
      try {
        const nextSettings = await appSettingsService.refreshFromApi();
        setSettings(nextSettings);
      } catch {
        setSettings(appSettingsService.getSettings());
      }
    };
    const refreshCashOperations = async () => {
      try {
        const nextOperations = await cashService.refreshFromApi();
        setCashOperations(nextOperations);
      } catch {
        setCashOperations([]);
      }
    };
    const refreshOrders = async () => {
      try {
        const nextOrders = await orderService.getOrders();
        setOrdersData(nextOrders);
      } catch {
        setOrdersData([]);
      }
    };
    const refreshEmployees = async () => {
      try {
        await employeeService.refreshFromApi();
      } catch {
        // local cache fallback
      }
    };

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<AppSettings>).detail;
      if (detail) {
        setSettings(detail);
      } else {
        setSettings(appSettingsService.getSettings());
      }
    };

    setCashOperations([]);
    setOrdersData([]);
    void refreshSettings();
    void refreshCashOperations();
    void refreshOrders();
    void refreshEmployees();
    window.addEventListener('crm:settings-updated', handleSettingsUpdated as EventListener);

    return () => {
      window.removeEventListener('crm:settings-updated', handleSettingsUpdated as EventListener);
    };
  }, [user?.tenantId]);

  const refreshSystemNotifications = React.useCallback(async () => {
    if (!user) {
      setSystemNotifications([]);
      return;
    }
    try {
      const rows = await userNotificationService.list();
      setSystemNotifications(rows);
    } catch {
      setSystemNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    void refreshSystemNotifications();
    if (!user) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshSystemNotifications();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [refreshSystemNotifications, user]);

  useEffect(() => {
    if (!user?.isPlatformAdmin) {
      return;
    }
    platformService
      .getMaintenanceSettings()
      .then((data) => {
        setMaintenanceAtLocal(formatDatetimeLocalValue(data.scheduledAt));
        setMaintenanceMeta({
          lastNotifiedAt: data.lastNotifiedAt || '',
          lastRecipients: data.lastRecipients || 0,
        });
      })
      .catch(() => {
        setMaintenanceAtLocal('');
        setMaintenanceMeta({ lastNotifiedAt: '', lastRecipients: 0 });
      });
  }, [user?.isPlatformAdmin]);

  const unreadSystemNotifications = React.useMemo(
    () => systemNotifications.filter((item) => !item.readAt),
    [systemNotifications]
  );

  const handleMarkSystemNotificationRead = async (notification: UserNotification) => {
    if (notification.readAt) {
      return;
    }
    try {
      await userNotificationService.markRead(notification.id);
      setSystemNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
      );
    } catch {
      toast.error('Не удалось отметить уведомление');
    }
  };

  const handleSendMaintenanceNotification = async () => {
    const scheduledAt = datetimeLocalToApiValue(maintenanceAtLocal);
    if (!scheduledAt) {
      toast.error('Укажите дату и время работ');
      return;
    }

    setMaintenanceSending(true);
    try {
      await platformService.saveMaintenanceSettings(scheduledAt);
      const result = await platformService.sendMaintenanceNotification(scheduledAt);
      setMaintenanceMeta({
        lastNotifiedAt: new Date().toISOString(),
        lastRecipients: result.sent,
      });
      toast.success(`Уведомление отправлено ${result.sent} пользователям`);
      await refreshSystemNotifications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить уведомление');
    } finally {
      setMaintenanceSending(false);
    }
  };

  const currentPage = menuItems.find((item) => item.path === location.pathname)?.text || 'Дашборд';
  const userRoleLabel = roleLabels[user?.role as keyof typeof roleLabels] || 'Сотрудник';
  const userDisplayName = user?.name || settings.profile.name || userRoleLabel;
  const currentEmployeeId = user?.id || '';
  const mySchedule = React.useMemo(
    () =>
      settings.employeeWork.schedules
        .filter((entry) => entry.employeeId === currentEmployeeId)
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [currentEmployeeId, settings.employeeWork.schedules]
  );
  const myTasks = React.useMemo(
    () =>
      settings.employeeWork.tasks
        .filter((task) => task.employeeId === currentEmployeeId)
        .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')),
    [currentEmployeeId, settings.employeeWork.tasks]
  );
  const workNotifications = React.useMemo(
    () => (currentEmployeeId ? employeeWorkService.getEmployeeNotifications(currentEmployeeId, settings) : []),
    [currentEmployeeId, settings]
  );
  const notificationCount =
    workNotifications.length + unreadTelegramMessages.length + unreadSystemNotifications.length;

  const openTelegramInboxOrder = (item: TelegramInboxItem) => {
    void markTelegramInboxSeen({
      ids: [item.id],
      orderId: item.orderId,
      chatId: item.chatId,
      clientId: item.clientId,
      phone: item.clientPhone,
    });
    setNotificationAnchorEl(null);
    if (item.orderId) {
      navigate(`/orders?orderId=${encodeURIComponent(item.orderId)}`);
      return;
    }
    const chatKey = item.chatId?.trim();
    if (chatKey) {
      navigate(`/messages?chatId=${encodeURIComponent(chatKey)}`);
      return;
    }
    navigate('/messages');
  };

  const handleTaskProgressChange = async (taskId: string, status: EmployeeTaskStatus, progress: number) => {
    const nextSettings = await employeeWorkService.updateTaskProgress(taskId, status, progress);
    setSettings(nextSettings);
  };

  const financeSummary = React.useMemo(() => {
    const now = new Date();
    const isAdmin = user?.role === 'admin';
    const ordersById = new Map(ordersData.map((order) => [order.id, order]));

    const isCancelledOrder = (order: Order) => {
      const status = String(order.status || '').toLowerCase();
      return status === 'cancelled' || status === 'canceled';
    };

    const isEmployeeInvolved = (order: Order, employee: Employee) =>
      isOrderIntakeManager(order, employee) ||
      isOrderTechnician(order, employee) ||
      isOrderDeliveryManager(order, employee);

    const orderHasPaymentOn = (order: Order, predicate: (date: Date) => boolean) =>
      (order.payments || []).some((payment) => {
        if (payment.status !== 'completed') {
          return false;
        }
        const date = new Date(payment.processedAt);
        return !Number.isNaN(date.getTime()) && predicate(date);
      });

    const orderInPeriod = (order: Order, predicate: (date: Date) => boolean) => {
      const created = new Date(order.createdAt);
      if (!Number.isNaN(created.getTime()) && predicate(created)) {
        return true;
      }
      return orderHasPaymentOn(order, predicate);
    };

    const resolveCurrentEmployee = (): Employee | null => {
      if (!user) {
        return null;
      }
      const employees = employeeService.getEmployees();
      return (
        employees.find((employee) => employee.id === user.id) ||
        employees.find((employee) => employeeNamesMatch(employee.name, user.name)) ||
        employees.find((employee) => employeeNamesMatch(employee.loginEmail, user.email)) ||
        employees.find((employee) => employeeNamesMatch(employee.email, user.email)) ||
        null
      );
    };

    const sumEmployeePiecework = (predicate: (date: Date) => boolean) => {
      const employee = resolveCurrentEmployee();
      if (!employee) {
        return 0;
      }

      return ordersData.reduce((sum, order) => {
        if (isCancelledOrder(order) || !isEmployeeInvolved(order, employee)) {
          return sum;
        }
        if (!orderInPeriod(order, predicate)) {
          return sum;
        }
        return sum + getEmployeeOrderEarnings(order, employee);
      }, 0);
    };

    const getOperationProfit = (operation: CashOperation) => {
      const amount = Number(operation.amount || 0);
      if (operation.type === 'expense') {
        return -amount;
      }

      if (operation.type !== 'income') {
        return 0;
      }

      const linkedOrder = operation.orderId ? ordersById.get(operation.orderId) : null;
      if (!linkedOrder) {
        return amount;
      }

      const orderTotal = getOrderTotal(linkedOrder);
      const orderProfit = getOrderMarginBase(linkedOrder);
      if (orderTotal <= 0) {
        return orderProfit;
      }

      return orderProfit * Math.min(amount / orderTotal, 1);
    };

    const sumServiceProfit = (items: CashOperation[]) =>
      items.reduce((sum, operation) => sum + getOperationProfit(operation), 0);

    let todayTotal = 0;
    let monthTotal = 0;
    let chart: Array<{ label: string; amount: number }> = [];

    if (isAdmin) {
      const todayTotalOps = cashOperations.filter((operation) =>
        isSameDay(new Date(operation.processedAt), now)
      );
      const monthTotalOps = cashOperations.filter((operation) =>
        isSameMonth(new Date(operation.processedAt), now)
      );
      todayTotal = sumServiceProfit(todayTotalOps);
      monthTotal = sumServiceProfit(monthTotalOps);
      chart = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - index));
        return {
          label: date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2),
          amount: sumServiceProfit(
            cashOperations.filter((operation) => isSameDay(new Date(operation.processedAt), date))
          ),
        };
      });
    } else {
      todayTotal = sumEmployeePiecework((date) => isSameDay(date, now));
      monthTotal = sumEmployeePiecework((date) => isSameMonth(date, now));
      chart = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - index));
        const employee = resolveCurrentEmployee();
        const dayAmount = employee
          ? ordersData.reduce((sum, order) => {
              if (isCancelledOrder(order) || !isEmployeeInvolved(order, employee)) {
                return sum;
              }
              const created = new Date(order.createdAt);
              if (Number.isNaN(created.getTime()) || !isSameDay(created, date)) {
                return sum;
              }
              return sum + getEmployeeOrderEarnings(order, employee);
            }, 0)
          : 0;
        return {
          label: date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2),
          amount: dayAmount,
        };
      });
    }

    const maxChartAmount = Math.max(...chart.map((item) => Math.abs(item.amount)), 1);
    const collapsedAmount = isAdmin ? monthTotal : todayTotal;
    const collapsedLabel = isAdmin ? 'Месяц' : 'Сегодня';
    const collapsedScaleMax = isAdmin
      ? Math.max(Math.abs(monthTotal), Math.abs(maxChartAmount) * Math.max(now.getDate(), 1), 1)
      : maxChartAmount;
    const collapsedScalePercent = Math.min(
      100,
      Math.round((Math.abs(collapsedAmount) / collapsedScaleMax) * 100)
    );

    return {
      title: isAdmin ? 'Прибыль сервиса' : 'Мой заработок',
      todayTotal,
      monthTotal,
      chart,
      maxChartAmount,
      collapsedAmount,
      collapsedLabel,
      collapsedScalePercent,
    };
  }, [cashOperations, ordersData, user]);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const openOrdersPriceList = () => {
    window.dispatchEvent(new Event('crm:open-price-list'));
  };

  const openOrdersDataExchange = () => {
    window.dispatchEvent(new Event('crm:open-orders-data-exchange'));
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((value) => {
      const next = !value;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const visibleMenuItems = menuItems.filter((item) => {
          if ('adminOnly' in item && item.adminOnly && user?.role !== 'admin') {
            return false;
          }
          if (item.path === '/settings' && !hasEmployeeSettingsAccess(user)) {
            return false;
          }
          if ('employeeOnly' in item && item.employeeOnly && user?.role === 'admin') {
            return false;
          }
          if (user?.role !== 'admin' && item.path !== '/settings') {
            const allowedModules = getAllowedModules(user);
            if (!allowedModules.includes(item.path)) {
              return false;
            }
          }
          if ('employeeOnly' in item && item.employeeOnly) {
            const sections = user?.employeeAccess?.visibleSections ?? [];
            const editable = user?.employeeAccess?.selfEditableFields ?? [];
            return sections.length > 0 || editable.length > 0;
          }
          return true;
        });

  const renderMenuItem = (item: (typeof menuItems)[number], isActive: boolean) => {
    const itemBody = (
      <Box
        onClick={() => handleNavigate(item.path)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          gap: sidebarCollapsed ? 0 : 1.5,
          px: sidebarCollapsed ? 1 : 2,
          py: sidebarCollapsed ? 1.2 : 1.6,
          borderRadius: 3,
          cursor: 'pointer',
          background: isActive ? gradients.active : 'transparent',
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.76)',
          border: isActive ? `1px solid ${colors.primaryLight}47` : '1px solid transparent',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {item.icon}
          {sidebarCollapsed && item.path === '/messages' && unreadTelegramMessages.length > 0 ? (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                right: -6,
                minWidth: 16,
                height: 16,
                px: 0.4,
                borderRadius: 999,
                bgcolor: 'error.main',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                lineHeight: '16px',
                textAlign: 'center',
              }}
            >
              {unreadTelegramMessages.length > 9 ? '9+' : unreadTelegramMessages.length}
            </Box>
          ) : null}
        </Box>
        {!sidebarCollapsed ? (
          <>
            <Typography fontWeight={isActive ? 700 : 600} sx={{ flexGrow: 1 }}>
              {item.text}
            </Typography>
            {item.path === '/messages' && unreadTelegramMessages.length > 0 ? (
              <Badge
                badgeContent={unreadTelegramMessages.length}
                color="error"
                sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
              />
            ) : null}
          </>
        ) : null}
      </Box>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.path} title={item.text} placement="right" arrow>
          {itemBody}
        </Tooltip>
      );
    }

    return (
      <motion.div key={item.path} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
        {itemBody}
      </motion.div>
    );
  };

  const drawer = (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          ...layoutHeaderShellSx,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: gradients.sidebar,
          flexShrink: 0,
        }}
      >
        {sidebarCollapsed ? (
          <Stack alignItems="center" justifyContent="center" spacing={0.25} sx={{ width: '100%', height: '100%' }}>
            {settings.business.logoUrl ? (
              <Box
                component="img"
                src={settings.business.logoUrl}
                alt={settings.business.companyName || 'Логотип'}
                sx={{ height: 26, width: 26, objectFit: 'contain', display: 'block' }}
              />
            ) : null}
            {!isMobile ? (
              <Tooltip title="Развернуть меню" placement="right">
                <IconButton
                  size="small"
                  onClick={toggleSidebarCollapsed}
                  sx={{ color: 'rgba(255,255,255,0.82)' }}
                >
                  <ChevronRight fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        ) : (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
            sx={{ minWidth: 0, width: '100%', height: '100%' }}
          >
            {settings.business.logoUrl ? (
              <Box
                component="img"
                src={settings.business.logoUrl}
                alt={settings.business.companyName || 'Логотип'}
                sx={{ height: 36, maxWidth: 120, objectFit: 'contain', flexShrink: 0, display: 'block' }}
              />
            ) : null}
            <Typography noWrap sx={{ ...layoutSidebarBrandTitleSx, flex: 1, minWidth: 0 }}>
              {settings.business.companyName || 'Мой сервис'}
            </Typography>
            {!isMobile ? (
              <Tooltip title="Свернуть меню" placement="right">
                <IconButton
                  size="small"
                  onClick={toggleSidebarCollapsed}
                  sx={{ color: 'rgba(255,255,255,0.82)', flexShrink: 0 }}
                >
                  <ChevronLeft fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        )}
      </Box>

      <List
        sx={{
          px: sidebarCollapsed ? 1 : 2,
          py: 1.5,
          display: 'grid',
          gap: 0.75,
          flex: 1,
          minHeight: 0,
          overflow: sidebarCollapsed ? 'hidden' : 'auto',
          alignContent: sidebarCollapsed ? 'start' : 'stretch',
        }}
      >
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return renderMenuItem(item, isActive);
        })}
        {user?.isPlatformAdmin && (
          sidebarCollapsed ? (
            <Tooltip title="Платформа" placement="right" arrow>
              <Box
                onClick={() => handleNavigate('/platform-admin')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 1,
                  py: 1.2,
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: location.pathname === '/platform-admin' ? gradients.active : 'transparent',
                  color: location.pathname === '/platform-admin' ? '#ffffff' : 'rgba(255,255,255,0.76)',
                  border:
                    location.pathname === '/platform-admin'
                      ? `1px solid ${colors.primaryLight}47`
                      : '1px solid transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                }}
              >
                <AdminPanelSettingsOutlined fontSize="small" />
              </Box>
            </Tooltip>
          ) : (
            <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <Box
                onClick={() => handleNavigate('/platform-admin')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.6,
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: location.pathname === '/platform-admin' ? gradients.active : 'transparent',
                  color: location.pathname === '/platform-admin' ? '#ffffff' : 'rgba(255,255,255,0.76)',
                  border:
                    location.pathname === '/platform-admin'
                      ? `1px solid ${colors.primaryLight}47`
                      : '1px solid transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                }}
              >
                <AdminPanelSettingsOutlined fontSize="small" />
                <Typography fontWeight={location.pathname === '/platform-admin' ? 700 : 600}>
                  Платформа
                </Typography>
              </Box>
            </motion.div>
          )
        )}
      </List>

      {!sidebarCollapsed ? (
      <Box sx={{ mt: 'auto', p: 2, flexShrink: 0 }}>
        <Box
          sx={{
            p: 1.75,
            borderRadius: crmRadius.lg,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>
            {financeSummary.title}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: colors.sidebarMuted }}>
                Сегодня
              </Typography>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>
                {formatMoneyCompact(financeSummary.todayTotal)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: colors.sidebarMuted }}>
                Месяц
              </Typography>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>
                {formatMoneyCompact(financeSummary.monthTotal)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'end', gap: 0.55, height: 54, mt: 1.5 }}>
            {financeSummary.chart.map((item, index) => (
              <Box
                key={`${item.label}_${index}`}
                sx={{ flex: 1, display: 'grid', alignItems: 'end', justifyItems: 'center', gap: 0.35 }}
                title={`${item.label}: ${formatMoneyCompact(item.amount)}`}
              >
                <Box
                  sx={{
                    width: '100%',
                    minHeight: 4,
                    height: `${Math.max(8, (Math.abs(item.amount) / financeSummary.maxChartAmount) * 38)}px`,
                    borderRadius: 0.75,
                    backgroundColor: item.amount > 0 ? colors.primaryLight : 'rgba(255,255,255,0.12)',
                  }}
                />
                <Typography sx={{ color: 'rgba(255,255,255,0.48)', fontSize: 9, lineHeight: 1 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {user?.role === 'admin' && !user?.isPlatformAdmin ? (
          <Box
            onClick={() => navigate('/subscribe')}
            sx={{
              mt: 1.5,
              p: 1.75,
              borderRadius: crmRadius.lg,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.07)',
              },
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>
              Подписка
            </Typography>
            <Box sx={{ mt: 1, mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={
                  subscriptionSummary.daysRemaining != null
                    ? Math.max(8, Math.min(100, (subscriptionSummary.daysRemaining / 30) * 100))
                    : 100
                }
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    bgcolor:
                      subscriptionSummary.severity === 'error'
                        ? '#ef4444'
                        : subscriptionSummary.severity === 'warning'
                          ? colors.primaryLight
                          : '#22c55e',
                  },
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.35, display: 'block' }}>
              {subscriptionSummary.planName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.35, display: 'block', mt: 0.35 }}>
              {subscriptionSummary.endsAtLabel
                ? `До ${subscriptionSummary.endsAtLabel}${
                    subscriptionSummary.daysRemaining != null
                      ? ` · ${formatDaysRemaining(subscriptionSummary.daysRemaining)}`
                      : ''
                  }`
                : subscriptionSummary.statusHint}
            </Typography>
          </Box>
        ) : null}

        {user?.isPlatformAdmin && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.75,
              borderRadius: crmRadius.lg,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.25,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: `${colors.primaryLight}22`,
                  border: `1px solid ${colors.primaryLight}44`,
                }}
              >
                <BuildOutlined sx={{ fontSize: 16, color: colors.primaryLight }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 800, display: 'block', lineHeight: 1.2 }}>
                  Работы на сайте
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.2 }}>
                  Уведомление всем пользователям
                </Typography>
              </Box>
            </Stack>

            <Typography
              component="label"
              htmlFor="maintenance-at-input"
              variant="caption"
              sx={{ display: 'block', mb: 0.75, color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}
            >
              Дата и время
            </Typography>
            <TextField
              id="maintenance-at-input"
              type="datetime-local"
              size="small"
              fullWidth
              placeholder="Выберите дату и время"
              value={maintenanceAtLocal}
              onChange={(event) => setMaintenanceAtLocal(event.target.value)}
              sx={{
                '& .MuiInputBase-root': {
                  bgcolor: 'rgba(8, 12, 24, 0.55)',
                  borderRadius: 1.5,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                },
                '& .MuiInputBase-input': {
                  py: 1.1,
                  px: 1.25,
                  color: '#fff',
                  colorScheme: 'dark',
                  '&::-webkit-calendar-picker-indicator': {
                    filter: 'invert(1)',
                    opacity: 0.82,
                    cursor: 'pointer',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.18)',
                },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: `${colors.primaryLight}88`,
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primaryLight,
                  borderWidth: 1,
                },
              }}
            />

            <Button
              fullWidth
              size="small"
              variant="contained"
              disableElevation
              disabled={maintenanceSending || !maintenanceAtLocal}
              onClick={() => void handleSendMaintenanceNotification()}
              sx={{
                mt: 1.25,
                py: 0.95,
                fontWeight: 800,
                textTransform: 'none',
                letterSpacing: 0.1,
                color: '#fff',
                background: gradients.primary,
                border: `1px solid ${colors.primaryLight}55`,
                boxShadow: `0 8px 18px ${colors.primaryLight}33`,
                '&:hover': {
                  background: gradients.primary,
                  filter: 'brightness(1.06)',
                  boxShadow: `0 10px 22px ${colors.primaryLight}44`,
                },
                '&.Mui-disabled': {
                  color: 'rgba(255,255,255,0.42)',
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: 'none',
                },
              }}
            >
              {maintenanceSending ? 'Отправка...' : 'Уведомить всех'}
            </Button>
            {maintenanceMeta.lastNotifiedAt ? (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.52)', lineHeight: 1.45 }}>
                Последняя рассылка: {new Date(maintenanceMeta.lastNotifiedAt).toLocaleString('ru-RU')}
                {maintenanceMeta.lastRecipients > 0 ? ` · ${maintenanceMeta.lastRecipients} чел.` : ''}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>
                Пользователи увидят баннер и уведомление в колокольчике.
              </Typography>
            )}
          </Box>
        )}
      </Box>
      ) : (
        <Box sx={{ mt: 'auto', p: 1, flexShrink: 0 }}>
          <Tooltip
            title={`${financeSummary.title} · ${financeSummary.collapsedLabel}: ${formatMoneyCompact(financeSummary.collapsedAmount)}`}
            placement="right"
            arrow
          >
            <Box
              sx={{
                p: 0.75,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.52)',
                  lineHeight: 1,
                  letterSpacing: 0.2,
                }}
              >
                {financeSummary.collapsedLabel}
              </Typography>
              <Box
                sx={{
                  width: 24,
                  height: 60,
                  borderRadius: 1.25,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: `${financeSummary.collapsedScalePercent}%`,
                    minHeight: financeSummary.collapsedAmount !== 0 ? 4 : 0,
                    borderRadius: 0.75,
                    bgcolor:
                      financeSummary.collapsedAmount >= 0 ? colors.primaryLight : 'rgba(255,255,255,0.22)',
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1,
                  textAlign: 'center',
                }}
              >
                {formatMoneyTiny(financeSummary.collapsedAmount)}₽
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          ...glassHeaderSx,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            ...layoutHeaderShellSx,
            width: '100%',
            minHeight: `${LAYOUT_HEADER_HEIGHT}px !important`,
            py: 0,
            gap: 1,
          }}
        >
          <IconButton sx={{ ml: { xs: 1, lg: 0 }, mr: { xs: 0, lg: 0 }, display: { lg: 'none' } }} onClick={() => setMobileOpen((value) => !value)}>
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: '100%', gap: 1.5 }}>
            <Typography component="h1" noWrap sx={layoutAppBarTitleSx}>
              {currentPage}
            </Typography>
            {isOrdersPage && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImportExport />}
                onClick={openOrdersDataExchange}
                sx={{
                  minHeight: 34,
                  px: 1.8,
                  borderColor: 'var(--crm-color-primary-border)',
                  color: 'primary.main',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'var(--crm-color-primary-hover)',
                  },
                }}
              >
                Импорт / экспорт
              </Button>
            )}
          </Box>

          {isOrdersPage && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DescriptionOutlined />}
              onClick={openOrdersPriceList}
              sx={{
                minHeight: 34,
                px: 1.8,
                mr: 1.5,
                borderColor: 'var(--crm-color-primary-border)',
                color: 'primary.main',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'var(--crm-color-primary-hover)',
                },
              }}
            >
              Прайс
            </Button>
          )}

          <Tooltip title="Уведомления">
            <IconButton sx={{ mr: 1.5 }} onClick={(event) => setNotificationAnchorEl(event.currentTarget)}>
              <Badge badgeContent={notificationCount || undefined} color="error">
                <NotificationsNoneOutlined />
              </Badge>
            </IconButton>
          </Tooltip>

          <Box
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              pl: 1.5,
              borderRadius: crmRadius.pill,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              transition: 'background-color 0.18s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Avatar src={user?.avatar || settings.profile.avatar || undefined} sx={{ bgcolor: 'primary.main' }}>
              <Person />
            </Avatar>
            <Box
              sx={{
                display: { xs: 'none', sm: 'grid' },
                justifyItems: 'center',
                minWidth: 120,
                lineHeight: 1.1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1.1,
                }}
              >
                {userRoleLabel}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {userDisplayName}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { lg: drawerWidth },
          flexShrink: { lg: 0 },
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              backgroundColor: colors.sidebar,
              color: 'rgba(255,255,255,0.92)',
              overflowX: 'hidden',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              backgroundColor: colors.sidebar,
              color: 'rgba(255,255,255,0.92)',
              overflowX: 'hidden',
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          pt: { xs: 12, lg: 13 },
          px: isEdgeToEdgePage ? 0 : { xs: 2, md: 3, xl: 4 },
          pb: isEdgeToEdgePage ? 0 : 4,
        }}
      >
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {showSubscriptionWarning ? (
            <Alert
              severity={subscriptionSummary.severity === 'error' ? 'error' : 'warning'}
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => navigate('/subscribe')}>
                  Оплатить
                </Button>
              }
            >
              {subscriptionSummary.statusHint}. Оплатите подписку, чтобы не потерять доступ к CRM.
            </Alert>
          ) : null}
          {user?.role === 'admin' &&
            !user?.isPlatformAdmin &&
            user?.tenant?.accessStatus === 'trial' &&
            user.tenant.trialDaysRemaining != null && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Пробный период: осталось {user.tenant.trialDaysRemaining}{' '}
                {user.tenant.trialDaysRemaining === 1 ? 'день' : 'дней'}. После окончания потребуется подписка.
              </Alert>
            )}
          {unreadSystemNotifications.slice(0, 2).map((item) => (
            <Alert
              key={item.id}
              severity="warning"
              sx={{ mb: 2 }}
              onClose={() => void handleMarkSystemNotificationRead(item)}
            >
              <Typography fontWeight={800}>{item.title}</Typography>
              <Typography variant="body2">{item.message}</Typography>
            </Alert>
          ))}
          {children}
        </motion.div>
      </Box>

      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={() => setNotificationAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 340,
            maxWidth: 420,
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: 'var(--crm-shadow)',
          },
        }}
      >
        {workNotifications.length === 0 && unreadTelegramMessages.length === 0 && unreadSystemNotifications.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">Новых уведомлений нет</Typography>
          </MenuItem>
        )}
        {unreadSystemNotifications.slice(0, 4).map((item) => (
          <MenuItem
            key={`system_${item.id}`}
            onClick={() => {
              void handleMarkSystemNotificationRead(item);
              setNotificationAnchorEl(null);
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <BuildOutlined fontSize="small" sx={{ color: 'warning.main', mt: 0.25 }} />
              <Box>
                <Typography variant="body2" fontWeight={800}>{item.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {item.message}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
        {unreadSystemNotifications.length > 0 && (workNotifications.length > 0 || unreadTelegramMessages.length > 0) ? (
          <Divider />
        ) : null}
        {workNotifications.slice(0, 6).map((item) => (
          <MenuItem key={item.id} onClick={() => { setNotificationAnchorEl(null); setIsWorkDialogOpen(true); }}>
            <Box>
              <Typography variant="body2" fontWeight={800}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.description}</Typography>
            </Box>
          </MenuItem>
        ))}
        {unreadTelegramMessages.length > 0 ? (
          <>
            {workNotifications.length > 0 ? <Divider /> : null}
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>
                Сообщения клиентов
              </Typography>
            </MenuItem>
            {unreadTelegramMessages.slice(0, 6).map((item) => (
              <MenuItem key={item.id} onClick={() => openTelegramInboxOrder(item)}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Telegram fontSize="small" sx={{ color: '#3390ec', mt: 0.25 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={800}>
                      {item.clientName || item.clientPhone || 'Клиент'}
                      {item.orderNumber ? ` · ${item.orderNumber}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {item.message.length > 90 ? `${item.message.slice(0, 90)}…` : item.message}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </>
        ) : null}
        {(workNotifications.length > 0 || unreadTelegramMessages.length > 0 || unreadSystemNotifications.length > 0) ? <Divider /> : null}
        <MenuItem onClick={() => { setNotificationAnchorEl(null); setIsWorkDialogOpen(true); }}>
          <CalendarMonthOutlined fontSize="small" style={{ marginRight: 10 }} />
          Открыть график и задачи
        </MenuItem>
      </Menu>

      <Dialog open={isWorkDialogOpen} onClose={() => setIsWorkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Мой график и задачи</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6" gutterBottom>График работы</Typography>
              <Stack spacing={1}>
                {mySchedule.length === 0 && <Typography color="text.secondary">График пока не заполнен.</Typography>}
                {mySchedule.slice(0, 14).map((entry) => (
                  <Box key={entry.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography fontWeight={800}>{new Date(entry.date).toLocaleDateString('ru-RU')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.isDayOff ? 'Выходной' : `${entry.startTime}-${entry.endTime}`}{entry.location ? ` · ${entry.location}` : ''}
                    </Typography>
                    {entry.note && <Typography variant="body2">{entry.note}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>Задачи</Typography>
              <Stack spacing={1}>
                {myTasks.length === 0 && <Typography color="text.secondary">Задач пока нет.</Typography>}
                {myTasks.map((task) => (
                  <Box key={task.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={800}>{task.title}</Typography>
                        {task.description && <Typography variant="body2" color="text.secondary">{task.description}</Typography>}
                        {task.dueDate && <Typography variant="caption" color="text.secondary">Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}</Typography>}
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress variant="determinate" value={task.progress} sx={{ height: 7, borderRadius: 2 }} />
                          <Typography variant="caption">{task.progress}% · {taskStatusLabels[task.status]}</Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 132 }}>
                          <InputLabel>Статус</InputLabel>
                          <Select
                            value={task.status}
                            label="Статус"
                            onChange={(event) => handleTaskProgressChange(task.id, event.target.value as EmployeeTaskStatus, task.progress)}
                          >
                            {Object.entries(taskStatusLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AssignmentOutlined />}
                          onClick={() => handleTaskProgressChange(task.id, task.status === 'done' ? 'in_progress' : 'done', task.status === 'done' ? 50 : 100)}
                        >
                          {task.status === 'done' ? 'Вернуть' : 'Готово'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: 'var(--crm-shadow)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate(user?.role === 'admin' ? '/settings' : '/my-profile');
          }}
        >
          <AccountCircleOutlined fontSize="small" style={{ marginRight: 10 }} />
          Профиль
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            logout();
            setAnchorEl(null);
          }}
        >
          <Logout fontSize="small" style={{ marginRight: 10 }} />
          Выйти
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
