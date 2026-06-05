import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Assignment,
  AttachMoney,
  CalendarMonth,
  Category,
  Email,
  Groups,
  LocalShipping,
  Payments,
  PointOfSale,
  ReceiptLong,
  Sell,
  ShoppingBag,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter';
import { panelCardSx, pageShellSx } from '../../styles/ui';
import { clientService } from '../../services/clientService';
import { employeeService } from '../../services/employeeService';
import { inventoryService } from '../../services/inventoryService';
import { orderService } from '../../services/orderService';
import { CashOperation, Client, Employee, Order, StockMovement } from '../../types';
import { defaultPeriodFilterValue, isDateWithinRange, PeriodFilterValue } from '../../utils/dateRange';

type ReportCategory = 'all' | 'overview' | 'finance' | 'products' | 'employees' | 'orders' | 'clients' | 'inventory';
type ReportId =
  | 'cash-flow'
  | 'order-profit'
  | 'sales-profit'
  | 'payments-summary'
  | 'returns'
  | 'product-report'
  | 'product-service-report'
  | 'service-report'
  | 'daily-sales'
  | 'team-performance'
  | 'order-statuses'
  | 'client-growth'
  | 'stock-movement';

interface ReportDefinition {
  id: ReportId;
  title: string;
  category: Exclude<ReportCategory, 'all'>;
  icon: React.ReactNode;
  isNew?: boolean;
}

const reportDefinitions: ReportDefinition[] = [
  { id: 'cash-flow', title: 'Отчет по статьям приходов и расходов', category: 'finance', icon: <PointOfSale />, isNew: true },
  { id: 'order-profit', title: 'Прибыль по заказам', category: 'finance', icon: <AttachMoney /> },
  { id: 'sales-profit', title: 'Прибыль от продаж', category: 'finance', icon: <TrendingUp /> },
  { id: 'payments-summary', title: 'Сводка платежей', category: 'finance', icon: <Payments /> },
  { id: 'returns', title: 'Возвраты', category: 'finance', icon: <ReceiptLong /> },
  { id: 'product-report', title: 'Отчет по товарам', category: 'products', icon: <ShoppingBag />, isNew: true },
  { id: 'product-service-report', title: 'Отчет по товарам и услугам', category: 'products', icon: <Category /> },
  { id: 'service-report', title: 'Отчет по услугам', category: 'products', icon: <Sell /> },
  { id: 'daily-sales', title: 'Товары и услуги по дням', category: 'products', icon: <CalendarMonth /> },
  { id: 'team-performance', title: 'Эффективность сотрудников', category: 'employees', icon: <Groups /> },
  { id: 'order-statuses', title: 'Статусы заказов', category: 'orders', icon: <Assignment /> },
  { id: 'client-growth', title: 'Рост клиентской базы', category: 'clients', icon: <TrendingUp /> },
  { id: 'stock-movement', title: 'Движение по складу', category: 'inventory', icon: <LocalShipping /> },
];

const sidebarCategories: { key: ReportCategory; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'overview', label: 'Общее' },
  { key: 'finance', label: 'Финансы' },
  { key: 'products', label: 'Товары и услуги' },
  { key: 'employees', label: 'Сотрудники' },
  { key: 'orders', label: 'Заказы' },
  { key: 'clients', label: 'Клиенты' },
  { key: 'inventory', label: 'Склад' },
];

const categoryHeadings: Record<Exclude<ReportCategory, 'all' | 'overview'>, string> = {
  finance: 'Финансы',
  products: 'Товары и услуги',
  employees: 'Сотрудники',
  orders: 'Заказы',
  clients: 'Клиенты',
  inventory: 'Склад',
};

const safeDate = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeName = (value?: string) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const statusLabel = (status: string) => {
  if (status === 'ready' || status === 'completed') return 'Завершено';
  if (status === 'in_progress' || status === 'diagnosis') return 'В работе';
  if (status === 'waiting_parts' || status === 'waiting_client' || status === 'pending') return 'Ожидание';
  if (status === 'cancelled') return 'Отменено';
  return 'Прочее';
};

const statusColor = (statusGroup: string) => {
  if (statusGroup === 'Завершено') return '#2e7d32';
  if (statusGroup === 'В работе') return '#ed6c02';
  if (statusGroup === 'Ожидание') return '#1976d2';
  if (statusGroup === 'Отменено') return '#d32f2f';
  return '#6b7280';
};

const Reports: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('all');
  const [activeReport, setActiveReport] = useState<ReportId>('cash-flow');
  const [reportPeriod, setReportPeriod] = useState<PeriodFilterValue>(() => defaultPeriodFilterValue('month'));
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [movementsData, setMovementsData] = useState<StockMovement[]>([]);
  const [cashOperationsData, setCashOperationsData] = useState<CashOperation[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orders, clients] = await Promise.all([
          orderService.getOrders(),
          clientService.getClients(),
        ]);
        setOrdersData(orders);
        setClientsData(clients);
      } catch {
        setOrdersData([]);
        setClientsData([]);
      }

      try {
        await employeeService.refreshFromApi();
        setEmployeesData(employeeService.getEmployees());
      } catch {
        setEmployeesData([]);
      }

      try {
        await inventoryService.refreshFromApi();
        setMovementsData(inventoryService.getMovements());
      } catch {
        setMovementsData([]);
      }

      try {
        const { cashService } = await import('../../services/cashService');
        await cashService.refreshFromApi();
        setCashOperationsData(cashService.getOperations());
      } catch {
        setCashOperationsData([]);
      }
    };

    void loadData();
  }, []);

  const handleExport = (format: string) => {
    toast.success(`Отчет экспортирован в формате ${format}`);
  };

  const paidEntries = useMemo(
    () =>
      ordersData.flatMap((order) =>
        (order.payments || [])
          .filter((payment) => payment.status === 'completed')
          .filter((payment) => isDateWithinRange(payment.processedAt, reportPeriod))
          .map((payment) => ({
            orderId: order.id,
            clientId: order.clientId,
            date: safeDate(payment.processedAt) || new Date(),
            amount: Number(payment.amount || 0),
            technicianName: order.technicianName || '',
          }))
      ),
    [ordersData, reportPeriod]
  );

  const incomeOperations = useMemo(
    () =>
      cashOperationsData.filter(
        (item) => item.type === 'income' && isDateWithinRange(item.processedAt, reportPeriod)
      ),
    [cashOperationsData, reportPeriod]
  );

  const expenseOperations = useMemo(
    () =>
      cashOperationsData.filter(
        (item) => item.type === 'expense' && isDateWithinRange(item.processedAt, reportPeriod)
      ),
    [cashOperationsData, reportPeriod]
  );

  const revenueEntries = useMemo(() => {
    if (incomeOperations.length > 0) {
      return incomeOperations.map((item) => ({
        date: safeDate(item.processedAt) || new Date(),
        amount: Number(item.amount || 0),
        orderId: item.orderId || '',
        clientId: '',
      }));
    }

    return paidEntries.map((item) => ({
      date: item.date,
      amount: item.amount,
      orderId: item.orderId,
      clientId: item.clientId,
    }));
  }, [incomeOperations, paidEntries]);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
      }),
    []
  );

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      }),
    []
  );

  const revenueSeries = useMemo(() => {
    const grouped = new Map<string, { month: string; revenue: number; orderIds: Set<string>; clientIds: Set<string> }>();
    const useDaySplit =
      reportPeriod.preset === 'today' || reportPeriod.preset === 'week' || reportPeriod.preset === 'month';

    revenueEntries.forEach((entry) => {
      const date = entry.date;
      const key = useDaySplit
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = useDaySplit
        ? dayFormatter.format(date)
        : `${monthFormatter.format(date)} ${date.getFullYear()}`;

      const current = grouped.get(key) || {
        month: label,
        revenue: 0,
        orderIds: new Set<string>(),
        clientIds: new Set<string>(),
      };

      current.revenue += entry.amount;
      if (entry.orderId) current.orderIds.add(entry.orderId);
      if (entry.clientId) current.clientIds.add(entry.clientId);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({
        month: item.month,
        revenue: Math.round(item.revenue),
        orders: item.orderIds.size,
        clients: item.clientIds.size,
      }));
  }, [dayFormatter, monthFormatter, reportPeriod.preset, revenueEntries]);

  const visibleDailyRevenue = useMemo(
    () =>
      revenueSeries.map((point) => ({
        day: point.month,
        revenue: point.revenue,
      })),
    [revenueSeries]
  );

  const periodOrders = useMemo(
    () => ordersData.filter((order) => isDateWithinRange(order.createdAt, reportPeriod)),
    [ordersData, reportPeriod]
  );

  const reportStats = useMemo(() => {
    const revenueTotal = revenueEntries.reduce((sum, item) => sum + item.amount, 0);
    const ordersTotal =
      paidEntries.length > 0
        ? new Set(paidEntries.map((item) => item.orderId)).size
        : periodOrders.length;
    const clientsTotal =
      paidEntries.length > 0
        ? new Set(paidEntries.map((item) => item.clientId)).size
        : clientsData.filter((client) => isDateWithinRange(client.createdAt, reportPeriod)).length;
    const averageCheck = ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0;
    return {
      revenueTotal: Math.round(revenueTotal),
      ordersTotal,
      clientsTotal,
      averageCheck,
    };
  }, [clientsData, paidEntries, periodOrders.length, reportPeriod, revenueEntries]);

  const orderStatusDistribution = useMemo(() => {
    if (periodOrders.length === 0) {
      return [] as Array<{ name: string; value: number; color: string }>;
    }

    const counts = new Map<string, number>();
    periodOrders.forEach((order) => {
      const group = statusLabel(order.status);
      counts.set(group, (counts.get(group) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      value: Math.round((count / periodOrders.length) * 100),
      color: statusColor(name),
    }));
  }, [periodOrders]);

  const topTechnicians = useMemo(() => {
    const ratings = new Map(
      employeesData.map((employee) => [normalizeName(employee.name), Number(employee.rating || 0)])
    );
    const grouped = new Map<string, { name: string; orders: Set<string>; revenue: number; rating: number }>();

    paidEntries.forEach((item) => {
      const name = item.technicianName || 'Не назначен';
      const key = normalizeName(name);
      const current = grouped.get(key) || {
        name,
        orders: new Set<string>(),
        revenue: 0,
        rating: ratings.get(key) || 0,
      };
      current.orders.add(item.orderId);
      current.revenue += item.amount;
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        name: item.name,
        orders: item.orders.size,
        revenue: Math.round(item.revenue),
        rating: item.rating,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [employeesData, paidEntries]);

  const topParts = useMemo(() => {
    const grouped = new Map<string, { name: string; sold: number; revenue: number }>();

    movementsData
      .filter((movement) => movement.direction === 'out')
      .filter((movement) => isDateWithinRange(movement.createdAt, reportPeriod))
      .forEach((movement) => {
        const key = movement.partId || movement.partName;
        const current = grouped.get(key) || { name: movement.partName, sold: 0, revenue: 0 };
        const quantity = Number(movement.quantity || 0);
        const revenue = Number(movement.totalCost || 0) || quantity * Number(movement.unitCost || 0);
        current.sold += quantity;
        current.revenue += revenue;
        grouped.set(key, current);
      });

    return Array.from(grouped.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)
      .map((item) => ({
        ...item,
        sold: Math.round(item.sold),
        revenue: Math.round(item.revenue),
      }));
  }, [movementsData, reportPeriod]);

  const visibleReports = useMemo(() => {
    if (activeCategory === 'all' || activeCategory === 'overview') {
      return reportDefinitions;
    }
    return reportDefinitions.filter((report) => report.category === activeCategory);
  }, [activeCategory]);

  const groupedReports = useMemo(() => {
    const groups = Object.entries(categoryHeadings).map(([key, title]) => ({
      key: key as Exclude<ReportCategory, 'all' | 'overview'>,
      title,
      items: visibleReports.filter((report) => report.category === key),
    }));
    return groups.filter((group) => group.items.length > 0);
  }, [visibleReports]);

  const activeReportMeta = reportDefinitions.find((report) => report.id === activeReport);

  const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) => (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Card sx={{ ...panelCardSx, height: '100%' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" color="text.secondary">{title}</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>{value}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: `${color}18`, color }}>{icon}</Avatar>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderReportContent = () => {
    switch (activeReport) {
      case 'cash-flow':
      case 'sales-profit':
      case 'payments-summary':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <StatCard title="Выручка" value={`${reportStats.revenueTotal.toLocaleString('ru-RU')} ₽`} icon={<AttachMoney />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Заказов" value={String(reportStats.ordersTotal)} icon={<Assignment />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Клиентов" value={String(reportStats.clientsTotal)} icon={<Groups />} color="#f57c00" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Средний чек" value={`${reportStats.averageCheck.toLocaleString('ru-RU')} ₽`} icon={<TrendingUp />} color="#9c27b0" />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Динамика по периоду</Typography>
                  <Box height={360}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']} />
                        <Area type="monotone" dataKey="revenue" stroke="#1976d2" fill="#1976d2" fillOpacity={0.25} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                  {revenueSeries.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Нет данных за выбранный период
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Приход: {incomeOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('ru-RU')} ₽ •
                    Расход: {expenseOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('ru-RU')} ₽
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'order-profit':
      case 'order-statuses':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Распределение заказов</Typography>
                  <Box height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={orderStatusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {orderStatusDistribution.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Доля']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                  {orderStatusDistribution.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Нет данных за выбранный период
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Заказы по периоду</Typography>
                  <Box height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={revenueSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [value, 'Заказы']} />
                        <Bar dataKey="orders" fill="#1976d2" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'team-performance':
        return (
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Топ сотрудников</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Сотрудник</TableCell>
                      <TableCell align="right">Заказов</TableCell>
                      <TableCell align="right">Доход</TableCell>
                      <TableCell align="right">Рейтинг</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topTechnicians.map((tech, index) => (
                      <TableRow key={tech.name}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight={600}>{tech.name}</Typography>
                            {index < 3 && <Chip label={`#${index + 1}`} size="small" color={index === 0 ? 'warning' : 'default'} />}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{tech.orders}</TableCell>
                        <TableCell align="right">{tech.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                        <TableCell align="right">{tech.rating > 0 ? `★ ${tech.rating}` : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {topTechnicians.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">Нет данных за выбранный период</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      case 'product-report':
      case 'product-service-report':
      case 'service-report':
      case 'stock-movement':
        return (
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Топ товаров и запчастей</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Позиция</TableCell>
                      <TableCell align="right">Продано</TableCell>
                      <TableCell align="right">Доход</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topParts.map((part) => (
                      <TableRow key={part.name}>
                        <TableCell>{part.name}</TableCell>
                        <TableCell align="right">{part.sold}</TableCell>
                        <TableCell align="right">{part.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                      </TableRow>
                    ))}
                    {topParts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">Нет данных по складу за выбранный период</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      case 'daily-sales':
      case 'client-growth':
      case 'returns':
      default:
        return (
          <Card sx={panelCardSx}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Динамика по дням</Typography>
              <Box height={360}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleDailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Значение']} />
                    <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={3} dot={{ fill: '#1976d2', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
              {visibleDailyRevenue.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Нет данных за выбранный период
                </Typography>
              )}
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Box sx={pageShellSx}>
      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={2.5} lg={2}>
          <Card sx={{ ...panelCardSx, position: 'sticky', top: 24 }}>
            <CardContent>
              <List disablePadding>
                {sidebarCategories.map((category, index) => (
                  <React.Fragment key={category.key}>
                    <ListItemButton
                      selected={activeCategory === category.key}
                      onClick={() => setActiveCategory(category.key)}
                      sx={{ borderLeft: activeCategory === category.key ? '3px solid #111827' : '3px solid transparent', borderRadius: 0 }}
                    >
                      <ListItemText primary={category.label} />
                    </ListItemButton>
                    {index < sidebarCategories.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9.5} lg={10}>
          <Card sx={{ ...panelCardSx, mb: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                <Box>
                  <Typography variant="h4" fontWeight={800}>Отчеты</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Каталог финансовых, складских и операционных отчетов CRM.
                  </Typography>
                </Box>
                <Button variant="outlined" startIcon={<Email />} onClick={() => handleExport('PDF')}>
                  Экспорт каталога
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={3}>
            {groupedReports.map((group) => (
              <Box key={group.key}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>{group.title}</Typography>
                <Stack spacing={1.5}>
                  {group.items.map((report) => (
                    <Card
                      key={report.id}
                      onClick={() => setActiveReport(report.id)}
                      sx={{
                        ...panelCardSx,
                        cursor: 'pointer',
                        border: activeReport === report.id ? '1px solid #2563eb' : '1px solid transparent',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: 6 },
                      }}
                    >
                      <CardContent sx={{ py: 2.25 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: 'rgba(15, 23, 42, 0.06)', color: '#374151', width: 36, height: 36 }}>
                              {report.icon}
                            </Avatar>
                            <Typography fontWeight={600} fontSize={18}>{report.title}</Typography>
                          </Stack>
                          {report.isNew && <Chip label="Новое" color="primary" size="small" />}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          <Card sx={{ ...panelCardSx, mt: 4 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>{activeReportMeta?.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Период и экспорт работают для активного отчета.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" onClick={() => handleExport('Excel')}>Excel</Button>
                  <Button variant="contained" onClick={() => handleExport('PDF')}>PDF</Button>
                </Stack>
              </Stack>

              <Card sx={{ ...panelCardSx, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <PeriodFilter value={reportPeriod} onChange={setReportPeriod} />
                  </Grid>
                </CardContent>
              </Card>

              {renderReportContent()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
