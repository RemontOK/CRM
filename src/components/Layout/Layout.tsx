import React, { useEffect, useState } from 'react';
import {
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
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  AccountCircleOutlined,
  AssessmentOutlined,
  AssignmentOutlined,
  CalendarMonthOutlined,
  DescriptionOutlined,
  GroupOutlined,
  Inventory2Outlined,
  Logout,
  Menu as MenuIcon,
  NotificationsNoneOutlined,
  PeopleOutlined,
  Person,
  PointOfSaleOutlined,
  SettingsOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../hooks/useAuth';
import { appSettingsService } from '../../services/appSettingsService';
import { cashService } from '../../services/cashService';
import { employeeWorkService } from '../../services/employeeWorkService';
import { orderService } from '../../services/orderService';
import { glassHeaderSx } from '../../styles/ui';
import { AppSettings, CashOperation, EmployeeTaskStatus, Order } from '../../types';
import { crmColors, crmGradients, crmRadius } from '../../styles/tokens';
import { getOrderMarginBase, getOrderTotal } from '../../utils/orderMetrics';

const drawerWidth = 292;

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
  { text: 'Клиенты', icon: <PeopleOutlined />, path: '/clients' },
  { text: 'Склад', icon: <Inventory2Outlined />, path: '/inventory' },
  { text: 'Сотрудники', icon: <GroupOutlined />, path: '/employees' },
  { text: 'Финансы', icon: <PointOfSaleOutlined />, path: '/cash-register' },
  { text: 'Отчеты', icon: <AssessmentOutlined />, path: '/reports' },
  { text: 'Настройки', icon: <SettingsOutlined />, path: '/settings' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const navigate = useNavigate();
  const location = useLocation();
  const isOrdersPage = location.pathname === '/orders';
  const isEdgeToEdgePage = isOrdersPage;
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => appSettingsService.getSettings());
  const [cashOperations, setCashOperations] = useState<CashOperation[]>(() => cashService.getOperations());
  const [ordersData, setOrdersData] = useState<Order[]>([]);

  useEffect(() => {
    const refreshSettings = async () => {
      const nextSettings = await appSettingsService.refreshFromApi();
      setSettings(nextSettings);
    };
    const refreshCashOperations = async () => {
      const nextOperations = await cashService.refreshFromApi();
      setCashOperations(nextOperations);
    };
    const refreshOrders = async () => {
      const nextOrders = await orderService.getOrders();
      setOrdersData(nextOrders);
    };

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<AppSettings>).detail;
      if (detail) {
        setSettings(detail);
      } else {
        setSettings(appSettingsService.getSettings());
      }
    };

    void refreshSettings();
    void refreshCashOperations();
    void refreshOrders();
    window.addEventListener('crm:settings-updated', handleSettingsUpdated as EventListener);

    return () => {
      window.removeEventListener('crm:settings-updated', handleSettingsUpdated as EventListener);
    };
  }, []);

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

  const handleTaskProgressChange = async (taskId: string, status: EmployeeTaskStatus, progress: number) => {
    const nextSettings = await employeeWorkService.updateTaskProgress(taskId, status, progress);
    setSettings(nextSettings);
  };

  const financeSummary = React.useMemo(() => {
    const now = new Date();
    const currentUserName = (user?.name || '').trim().toLowerCase();
    const isAdmin = user?.role === 'admin';
    const ordersById = new Map(ordersData.map((order) => [order.id, order]));
    const relevantOperations = cashOperations.filter((operation) => {
      if (isAdmin) {
        return true;
      }

      return (operation.processedBy || '').trim().toLowerCase() === currentUserName;
    });

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

    const sumProfit = (items: CashOperation[]) =>
      items.reduce((sum, operation) => sum + getOperationProfit(operation), 0);

    const todayTotal = sumProfit(
      relevantOperations.filter((operation) => isSameDay(new Date(operation.processedAt), now))
    );
    const monthTotal = sumProfit(
      relevantOperations.filter((operation) => isSameMonth(new Date(operation.processedAt), now))
    );
    const chart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return {
        label: date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2),
        amount: sumProfit(
          relevantOperations.filter((operation) => isSameDay(new Date(operation.processedAt), date))
        ),
      };
    });
    const maxChartAmount = Math.max(...chart.map((item) => Math.abs(item.amount)), 1);

    return {
      title: isAdmin ? 'Прибыль сервиса' : 'Прибыль сотрудника',
      todayTotal,
      monthTotal,
      chart,
      maxChartAmount,
    };
  }, [cashOperations, ordersData, user?.name, user?.role]);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const openOrdersPriceList = () => {
    window.dispatchEvent(new Event('crm:open-price-list'));
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: crmGradients.sidebar,
        }}
      >
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1.6 }}>
          НЭК СЕРВИС
        </Typography>
      </Box>

      <List sx={{ px: 2, py: 2, display: 'grid', gap: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <motion.div key={item.path} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <Box
                onClick={() => handleNavigate(item.path)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.6,
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: isActive ? crmGradients.active : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.76)',
                  border: isActive ? '1px solid rgba(251, 146, 60, 0.28)' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                <Typography fontWeight={isActive ? 700 : 600}>{item.text}</Typography>
              </Box>
            </motion.div>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', p: 2 }}>
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
              <Typography variant="caption" sx={{ color: crmColors.sidebarMuted }}>
                Сегодня
              </Typography>
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>
                {formatMoneyCompact(financeSummary.todayTotal)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: crmColors.sidebarMuted }}>
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
                    backgroundColor: item.amount > 0 ? '#fb923c' : 'rgba(255,255,255,0.12)',
                  }}
                />
                <Typography sx={{ color: 'rgba(255,255,255,0.48)', fontSize: 9, lineHeight: 1 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
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
        }}
      >
        <Toolbar sx={{ minHeight: 80 }}>
          <IconButton sx={{ mr: 1, display: { lg: 'none' } }} onClick={() => setMobileOpen((value) => !value)}>
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {currentPage}
            </Typography>
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
                borderColor: 'rgba(255, 107, 53, 0.55)',
                color: 'primary.main',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(255, 107, 53, 0.06)',
                },
              }}
            >
              Прайс
            </Button>
          )}

          <Tooltip title="Уведомления">
            <IconButton sx={{ mr: 1.5 }} onClick={(event) => setNotificationAnchorEl(event.currentTarget)}>
              <Badge badgeContent={workNotifications.length} color="error">
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
                backgroundColor: 'rgba(15, 23, 42, 0.04)',
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

      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth },
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
          pt: { xs: 12, lg: 13 },
          px: isEdgeToEdgePage ? 0 : { xs: 2, md: 3, xl: 4 },
          pb: isEdgeToEdgePage ? 0 : 4,
        }}
      >
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
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
        {workNotifications.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">Новых уведомлений нет</Typography>
          </MenuItem>
        )}
        {workNotifications.slice(0, 6).map((item) => (
          <MenuItem key={item.id} onClick={() => { setNotificationAnchorEl(null); setIsWorkDialogOpen(true); }}>
            <Box>
              <Typography variant="body2" fontWeight={800}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.description}</Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
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
            navigate('/settings');
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
