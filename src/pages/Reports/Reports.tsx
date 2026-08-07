import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
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
import { alpha } from '@mui/material/styles';
import {
  Assignment,
  AttachMoney,
  CalendarMonth,
  Category,
  Close,
  Groups,
  LocalShipping,
  Payments,
  PointOfSale,
  QueryStatsOutlined,
  ReceiptLong,
  Sell,
  ShoppingBag,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { CashOperation, Client, Employee, Order, OrderPart, StockMovement } from '../../types';
import { defaultPeriodFilterValue, isDateWithinRange, PeriodFilterValue } from '../../utils/dateRange';
import { appSettingsService } from '../../services/appSettingsService';
import { getOrderProfitMetrics } from '../../utils/orderMetrics';
import { getOrderLineTitle, isOrderWorkLine } from '../../utils/orderPartDisplay';
import { getPaymentMethodLabel } from '../../utils/paymentMethod';
import { downloadXlsx } from '../../utils/sheetIO';
import { useCompanyName } from '../../hooks/useCompanyName';

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
  const companyName = useCompanyName();
  const reportContentRef = useRef<HTMLDivElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('all');
  const [activeReport, setActiveReport] = useState<ReportId | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  const saveElementAsPdf = async (element: HTMLElement, filename: string) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 2) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
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

  const employeeRateDefaults = useMemo(
    () => {
      const settings = appSettingsService.getSettings();
      return {
        defaultIntakeRate: settings.employees.defaultIntakeRate,
        defaultExecutionRate: settings.employees.defaultExecutionRate,
        defaultDeliveryRate: settings.employees.defaultDeliveryRate,
      };
    },
    []
  );

  const orderProfitRows = useMemo(() => {
    const rows: Array<{
      orderId: string;
      orderNumber: string;
      clientName: string;
      date: Date;
      metrics: ReturnType<typeof getOrderProfitMetrics>;
    }> = [];

    ordersData.forEach((order) => {
      const paymentsInPeriod = (order.payments || []).filter(
        (payment) => payment.status === 'completed' && isDateWithinRange(payment.processedAt, reportPeriod)
      );
      if (paymentsInPeriod.length === 0) {
        return;
      }

      const paidInPeriod = paymentsInPeriod.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const latestPayment = paymentsInPeriod.reduce((latest, payment) => {
        const date = safeDate(payment.processedAt);
        if (!date) {
          return latest;
        }
        return !latest || date > latest ? date : latest;
      }, null as Date | null);

      rows.push({
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        clientName: order.clientName || '—',
        date: latestPayment || safeDate(order.createdAt) || new Date(),
        metrics: getOrderProfitMetrics(order, employeesData, employeeRateDefaults, paidInPeriod),
      });
    });

    return rows.sort((a, b) => b.metrics.serviceProfit - a.metrics.serviceProfit);
  }, [employeeRateDefaults, employeesData, ordersData, reportPeriod]);

  const orderProfitStats = useMemo(() => {
    const totals = orderProfitRows.reduce(
      (acc, row) => {
        acc.revenue += row.metrics.revenue;
        acc.partsCost += row.metrics.partsCost;
        acc.grossMargin += row.metrics.grossMargin;
        acc.employeePayouts += row.metrics.employeePayouts;
        acc.serviceProfit += row.metrics.serviceProfit;
        return acc;
      },
      { revenue: 0, partsCost: 0, grossMargin: 0, employeePayouts: 0, serviceProfit: 0 }
    );

    const marginPercent = totals.revenue > 0 ? Math.round((totals.serviceProfit / totals.revenue) * 100) : 0;

    return {
      ...totals,
      ordersCount: orderProfitRows.length,
      marginPercent,
    };
  }, [orderProfitRows]);

  const orderProfitSeries = useMemo(() => {
    const useDaySplit =
      reportPeriod.preset === 'today' || reportPeriod.preset === 'week' || reportPeriod.preset === 'month';
    const grouped = new Map<
      string,
      { label: string; revenue: number; serviceProfit: number; partsCost: number; employeePayouts: number }
    >();

    orderProfitRows.forEach((row) => {
      const date = row.date;
      const key = useDaySplit
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = useDaySplit
        ? dayFormatter.format(date)
        : `${monthFormatter.format(date)} ${date.getFullYear()}`;

      const current = grouped.get(key) || {
        label,
        revenue: 0,
        serviceProfit: 0,
        partsCost: 0,
        employeePayouts: 0,
      };

      current.revenue += row.metrics.revenue;
      current.serviceProfit += row.metrics.serviceProfit;
      current.partsCost += row.metrics.partsCost;
      current.employeePayouts += row.metrics.employeePayouts;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({
        period: item.label,
        revenue: Math.round(item.revenue),
        serviceProfit: Math.round(item.serviceProfit),
        partsCost: Math.round(item.partsCost),
        employeePayouts: Math.round(item.employeePayouts),
      }));
  }, [dayFormatter, monthFormatter, orderProfitRows, reportPeriod.preset]);

  const ordersByPeriodSeries = useMemo(() => {
    const useDaySplit =
      reportPeriod.preset === 'today' || reportPeriod.preset === 'week' || reportPeriod.preset === 'month';
    const grouped = new Map<string, { label: string; orders: number }>();

    periodOrders.forEach((order) => {
      const date = safeDate(order.createdAt);
      if (!date) {
        return;
      }
      const key = useDaySplit
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = useDaySplit
        ? dayFormatter.format(date)
        : `${monthFormatter.format(date)} ${date.getFullYear()}`;
      const current = grouped.get(key) || { label, orders: 0 };
      current.orders += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({ period: item.label, orders: item.orders }));
  }, [dayFormatter, monthFormatter, periodOrders, reportPeriod.preset]);

  const salesProfitRows = useMemo(() => {
    return movementsData
      .filter((movement) => movement.direction === 'out')
      .filter((movement) => isDateWithinRange(movement.createdAt, reportPeriod))
      .map((movement) => {
        const quantity = Number(movement.quantity || 0);
        const revenue = Number(movement.totalCost || 0) || quantity * Number(movement.unitCost || 0);
        const cost = quantity * Number(movement.unitCost || 0);
        const profit = Math.max(revenue - cost, 0);
        return {
          id: movement.id,
          name: movement.partName,
          quantity,
          revenue: Math.round(revenue),
          cost: Math.round(cost),
          profit: Math.round(profit),
          date: safeDate(movement.createdAt) || new Date(),
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [movementsData, reportPeriod]);

  const salesProfitStats = useMemo(() => {
    const totals = salesProfitRows.reduce(
      (acc, row) => {
        acc.revenue += row.revenue;
        acc.cost += row.cost;
        acc.profit += row.profit;
        acc.quantity += row.quantity;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0, quantity: 0 }
    );
    const marginPercent = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100) : 0;
    return { ...totals, marginPercent, positions: salesProfitRows.length };
  }, [salesProfitRows]);

  const salesProfitSeries = useMemo(() => {
    const useDaySplit =
      reportPeriod.preset === 'today' || reportPeriod.preset === 'week' || reportPeriod.preset === 'month';
    const grouped = new Map<string, { label: string; revenue: number; profit: number }>();

    salesProfitRows.forEach((row) => {
      const date = row.date;
      const key = useDaySplit
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = useDaySplit
        ? dayFormatter.format(date)
        : `${monthFormatter.format(date)} ${date.getFullYear()}`;
      const current = grouped.get(key) || { label, revenue: 0, profit: 0 };
      current.revenue += row.revenue;
      current.profit += row.profit;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({
        period: item.label,
        revenue: Math.round(item.revenue),
        profit: Math.round(item.profit),
      }));
  }, [dayFormatter, monthFormatter, reportPeriod.preset, salesProfitRows]);

  const paymentMethodSummary = useMemo(() => {
    const grouped = new Map<string, { method: string; amount: number; count: number }>();
    const paymentOptions = appSettingsService.getSettings().payment.paymentMethodOptions;

    const addPayment = (method: string, amount: number) => {
      const label = getPaymentMethodLabel(method, paymentOptions);
      const current = grouped.get(label) || { method: label, amount: 0, count: 0 };
      current.amount += amount;
      current.count += 1;
      grouped.set(label, current);
    };

    ordersData.forEach((order) => {
      (order.payments || [])
        .filter((payment) => payment.status === 'completed')
        .filter((payment) => isDateWithinRange(payment.processedAt, reportPeriod))
        .forEach((payment) => addPayment(payment.method, Number(payment.amount || 0)));
    });

    incomeOperations.forEach((operation) => {
      if (operation.source === 'order_payment') {
        return;
      }
      addPayment(operation.paymentMethod || operation.registerType || 'Касса', Number(operation.amount || 0));
    });

    return Array.from(grouped.values())
      .map((item) => ({ ...item, amount: Math.round(item.amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [incomeOperations, ordersData, reportPeriod]);

  const paymentStats = useMemo(() => {
    const totalAmount = paymentMethodSummary.reduce((sum, item) => sum + item.amount, 0);
    const totalCount = paymentMethodSummary.reduce((sum, item) => sum + item.count, 0);
    const averagePayment = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    return { totalAmount, totalCount, averagePayment, methodsCount: paymentMethodSummary.length };
  }, [paymentMethodSummary]);

  const refundedPayments = useMemo(() => {
    const paymentOptions = appSettingsService.getSettings().payment.paymentMethodOptions;
    return ordersData.flatMap((order) =>
      (order.payments || [])
        .filter((payment) => payment.status === 'refunded')
        .filter((payment) => isDateWithinRange(payment.processedAt, reportPeriod))
        .map((payment) => ({
          orderId: order.id,
          orderNumber: order.orderNumber || order.id,
          clientName: order.clientName || '—',
          amount: Number(payment.amount || 0),
          method: getPaymentMethodLabel(payment.method, paymentOptions),
          date: safeDate(payment.processedAt) || new Date(),
        }))
    );
  }, [ordersData, reportPeriod]);

  const returnsStats = useMemo(() => {
    const totalAmount = refundedPayments.reduce((sum, item) => sum + item.amount, 0);
    return { count: refundedPayments.length, totalAmount: Math.round(totalAmount) };
  }, [refundedPayments]);

  const clientGrowthSeries = useMemo(() => {
    const useDaySplit =
      reportPeriod.preset === 'today' || reportPeriod.preset === 'week' || reportPeriod.preset === 'month';
    const grouped = new Map<string, { label: string; clients: number }>();

    clientsData
      .filter((client) => isDateWithinRange(client.createdAt, reportPeriod))
      .forEach((client) => {
        const date = safeDate(client.createdAt);
        if (!date) {
          return;
        }
        const key = useDaySplit
          ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
          : `${date.getFullYear()}-${date.getMonth() + 1}`;
        const label = useDaySplit
          ? dayFormatter.format(date)
          : `${monthFormatter.format(date)} ${date.getFullYear()}`;
        const current = grouped.get(key) || { label, clients: 0 };
        current.clients += 1;
        grouped.set(key, current);
      });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({ period: item.label, clients: item.clients }));
  }, [clientsData, dayFormatter, monthFormatter, reportPeriod]);

  const clientGrowthStats = useMemo(() => {
    const newClients = clientsData.filter((client) => isDateWithinRange(client.createdAt, reportPeriod)).length;
    const totalClients = clientsData.length;
    return { newClients, totalClients };
  }, [clientsData, reportPeriod]);

  const cashFlowByCategory = useMemo(() => {
    const grouped = new Map<string, { category: string; income: number; expense: number }>();

    incomeOperations.forEach((operation) => {
      const category = operation.category || 'Приход';
      const current = grouped.get(category) || { category, income: 0, expense: 0 };
      current.income += Number(operation.amount || 0);
      grouped.set(category, current);
    });

    expenseOperations.forEach((operation) => {
      const category = operation.category || 'Расход';
      const current = grouped.get(category) || { category, income: 0, expense: 0 };
      current.expense += Number(operation.amount || 0);
      grouped.set(category, current);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        category: item.category,
        income: Math.round(item.income),
        expense: Math.round(item.expense),
        net: Math.round(item.income - item.expense),
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [expenseOperations, incomeOperations]);

  const serviceRevenueRows = useMemo(() => {
    const grouped = new Map<string, { name: string; quantity: number; revenue: number }>();

    orderProfitRows.forEach((row) => {
      const order = ordersData.find((item) => item.id === row.orderId);
      if (!order) {
        return;
      }

      (order.parts || []).forEach((part) => {
        const meta = part as OrderPart & { workType?: string; partInfo?: { workCost?: number; partCost?: number } };
        if (!isOrderWorkLine(meta)) {
          return;
        }
        const workCost = Number(meta.partInfo?.workCost ?? 0);
        const name = getOrderLineTitle(meta);
        const revenue = workCost > 0 ? workCost : Number(part.totalPrice || 0);
        const current = grouped.get(name) || { name, quantity: 0, revenue: 0 };
        current.quantity += Number(part.quantity || 1);
        current.revenue += revenue;
        grouped.set(name, current);
      });
    });

    return Array.from(grouped.values())
      .map((item) => ({ ...item, revenue: Math.round(item.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [orderProfitRows, ordersData]);

  const dailySalesSeries = useMemo(() => {
    const useDaySplit =
      reportPeriod.preset === 'today' || reportPeriod.preset === 'week' || reportPeriod.preset === 'month';
    const grouped = new Map<string, { label: string; products: number; services: number }>();

    const addAmount = (date: Date, key: 'products' | 'services', amount: number) => {
      const mapKey = useDaySplit
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = useDaySplit
        ? dayFormatter.format(date)
        : `${monthFormatter.format(date)} ${date.getFullYear()}`;
      const current = grouped.get(mapKey) || { label, products: 0, services: 0 };
      current[key] += amount;
      grouped.set(mapKey, current);
    };

    salesProfitRows.forEach((row) => addAmount(row.date, 'products', row.revenue));
    orderProfitRows.forEach((row) => {
      const order = ordersData.find((item) => item.id === row.orderId);
      if (!order) {
        return;
      }
      (order.parts || []).forEach((part) => {
        const meta = part as OrderPart & { partInfo?: { workCost?: number } };
        const workCost = Number(meta.partInfo?.workCost ?? 0);
        if (workCost > 0) {
          addAmount(row.date, 'services', workCost);
        }
      });
      if (!(order.parts || []).some((part) => Number((part as { partInfo?: { workCost?: number } }).partInfo?.workCost ?? 0) > 0)) {
        addAmount(row.date, 'services', row.metrics.grossMargin);
      }
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, item]) => ({
        period: item.label,
        products: Math.round(item.products),
        services: Math.round(item.services),
        total: Math.round(item.products + item.services),
      }));
  }, [dayFormatter, monthFormatter, orderProfitRows, ordersData, reportPeriod.preset, salesProfitRows]);

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

  const activeReportMeta = activeReport
    ? reportDefinitions.find((report) => report.id === activeReport)
    : undefined;

  const getActiveReportExportRows = (): Record<string, string | number>[] => {
    switch (activeReport) {
      case 'cash-flow':
        return cashFlowByCategory.map((row) => ({
          Категория: row.category,
          Приход: row.income,
          Расход: row.expense,
          Итого: row.net,
        }));
      case 'order-profit':
        return orderProfitRows.map((row) => ({
          Заказ: row.orderNumber,
          Клиент: row.clientName,
          Выручка: Math.round(row.metrics.revenue),
          Себестоимость: Math.round(row.metrics.partsCost),
          Выплаты: Math.round(row.metrics.employeePayouts),
          Прибыль: Math.round(row.metrics.serviceProfit),
        }));
      case 'sales-profit':
        return salesProfitRows.map((row) => ({
          Товар: row.name,
          Количество: row.quantity,
          Выручка: Math.round(row.revenue),
          Себестоимость: Math.round(row.cost),
          Прибыль: Math.round(row.profit),
        }));
      case 'payments-summary':
        return paymentMethodSummary.map((row) => ({
          Способ: row.method,
          Сумма: row.amount,
          Количество: row.count,
        }));
      case 'returns':
        return refundedPayments.map((row) => ({
          Заказ: row.orderNumber,
          Клиент: row.clientName,
          Сумма: row.amount,
          Способ: row.method,
          Дата: row.date.toLocaleDateString('ru-RU'),
        }));
      case 'product-report':
      case 'product-service-report':
        return topParts.map((row) => ({
          Товар: row.name,
          Количество: row.sold,
          Сумма: row.revenue,
        }));
      case 'service-report':
        return serviceRevenueRows.map((row) => ({
          Услуга: row.name,
          Количество: row.quantity,
          Сумма: row.revenue,
        }));
      case 'daily-sales':
        return dailySalesSeries.map((row) => ({
          Период: row.period,
          Товары: row.products,
          Услуги: row.services,
          Итого: row.total,
        }));
      case 'team-performance':
        return topTechnicians.map((row) => ({
          Сотрудник: row.name,
          Заказы: row.orders,
          Выручка: row.revenue,
        }));
      case 'order-statuses':
        return orderStatusDistribution.map((row) => ({
          Статус: row.name,
          Доля: row.value,
        }));
      case 'client-growth':
        return clientGrowthSeries.map((row) => ({
          Период: row.period,
          Клиенты: row.clients,
        }));
      case 'stock-movement':
        return movementsData
          .filter((item) => isDateWithinRange(item.createdAt, reportPeriod))
          .map((item) => ({
            Дата: new Date(item.createdAt).toLocaleString('ru-RU'),
            Товар: item.partName,
            Направление: item.direction === 'in' ? 'Приход' : item.direction === 'out' ? 'Расход' : 'Корректировка',
            Количество: item.quantity,
            Причина: item.reason || '',
          }));
      default:
        return [];
    }
  };

  const handleExportReport = async (format: 'Excel' | 'PDF') => {
    if (!activeReport || !activeReportMeta) {
      toast.error('Откройте отчет для экспорта');
      return;
    }
    if (isExporting) return;
    setIsExporting(true);
    const stamp = new Date().toISOString().slice(0, 10);
    const safeName = activeReportMeta.title.replace(/[\\/:*?"<>|]+/g, '_');

    try {
      if (format === 'Excel') {
        const rows = getActiveReportExportRows();
        if (!rows.length) {
          toast.error('Нет данных для экспорта за выбранный период');
          return;
        }
        downloadXlsx(rows, `otchet-${safeName}-${stamp}.xlsx`, 'Отчет');
        toast.success('Отчет скачан (Excel)');
        return;
      }

      const element = reportContentRef.current;
      if (!element) {
        toast.error('Не удалось найти содержимое отчета');
        return;
      }
      await saveElementAsPdf(element, `otchet-${safeName}-${stamp}.pdf`);
      toast.success('Отчет скачан (PDF)');
    } catch {
      toast.error(`Не удалось экспортировать в ${format}`);
    } finally {
      setIsExporting(false);
    }
  };

  const openReportAnalytics = (reportId: ReportId) => {
    setActiveReport(reportId);
    setAnalyticsOpen(true);
  };

  const closeReportAnalytics = () => {
    setAnalyticsOpen(false);
  };

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
    if (!activeReport) {
      return null;
    }

    switch (activeReport) {
      case 'cash-flow':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Приход"
                value={`${incomeOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('ru-RU')} ₽`}
                icon={<TrendingUp />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Расход"
                value={`${expenseOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('ru-RU')} ₽`}
                icon={<ReceiptLong />}
                color="#d32f2f"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Сальдо"
                value={`${(incomeOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0) - expenseOperations.reduce((sum, item) => sum + Number(item.amount || 0), 0)).toLocaleString('ru-RU')} ₽`}
                icon={<AttachMoney />}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Статьи приходов и расходов</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Статья</TableCell>
                          <TableCell align="right">Приход</TableCell>
                          <TableCell align="right">Расход</TableCell>
                          <TableCell align="right">Сальдо</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cashFlowByCategory.map((row) => (
                          <TableRow key={row.category}>
                            <TableCell>{row.category}</TableCell>
                            <TableCell align="right">{row.income.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right">{row.expense.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{row.net.toLocaleString('ru-RU')} ₽</TableCell>
                          </TableRow>
                        ))}
                        {cashFlowByCategory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">Нет операций за выбранный период</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Динамика движения средств</Typography>
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
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'order-profit':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard title="Выручка" value={`${orderProfitStats.revenue.toLocaleString('ru-RU')} ₽`} icon={<AttachMoney />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard title="Себестоимость" value={`${orderProfitStats.partsCost.toLocaleString('ru-RU')} ₽`} icon={<ShoppingBag />} color="#f57c00" />
            </Grid>
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard title="Выплаты сотрудникам" value={`${orderProfitStats.employeePayouts.toLocaleString('ru-RU')} ₽`} icon={<Groups />} color="#9c27b0" />
            </Grid>
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard title="Прибыль сервиса" value={`${orderProfitStats.serviceProfit.toLocaleString('ru-RU')} ₽`} icon={<TrendingUp />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard title="Рентабельность" value={`${orderProfitStats.marginPercent}%`} icon={<QueryStatsOutlined />} color="#0f766e" />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Динамика прибыли по заказам</Typography>
                  <Box height={360}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={orderProfitSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: number, name: string) => [`${value.toLocaleString('ru-RU')} ₽`, name === 'serviceProfit' ? 'Прибыль' : 'Выручка']} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#1976d2" fill="#1976d2" fillOpacity={0.15} />
                        <Area type="monotone" dataKey="serviceProfit" name="Прибыль сервиса" stroke="#2e7d32" fill="#2e7d32" fillOpacity={0.35} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                  {orderProfitSeries.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Нет оплаченных заказов за выбранный период
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Топ заказов по прибыли</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Заказ</TableCell>
                          <TableCell>Клиент</TableCell>
                          <TableCell align="right">Выручка</TableCell>
                          <TableCell align="right">Себестоимость</TableCell>
                          <TableCell align="right">Выплаты</TableCell>
                          <TableCell align="right">Прибыль</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderProfitRows.slice(0, 15).map((row) => (
                          <TableRow key={row.orderId}>
                            <TableCell>#{row.orderNumber}</TableCell>
                            <TableCell>{row.clientName}</TableCell>
                            <TableCell align="right">{row.metrics.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right">{row.metrics.partsCost.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right">{row.metrics.employeePayouts.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                              {row.metrics.serviceProfit.toLocaleString('ru-RU')} ₽
                            </TableCell>
                          </TableRow>
                        ))}
                        {orderProfitRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">Нет данных за выбранный период</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'sales-profit':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <StatCard title="Выручка от продаж" value={`${salesProfitStats.revenue.toLocaleString('ru-RU')} ₽`} icon={<AttachMoney />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Себестоимость" value={`${salesProfitStats.cost.toLocaleString('ru-RU')} ₽`} icon={<ShoppingBag />} color="#f57c00" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Прибыль" value={`${salesProfitStats.profit.toLocaleString('ru-RU')} ₽`} icon={<TrendingUp />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Продано, шт." value={String(Math.round(salesProfitStats.quantity))} icon={<Sell />} color="#9c27b0" />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Динамика прибыли от продаж</Typography>
                  <Box height={360}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesProfitSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: number, name: string) => [`${value.toLocaleString('ru-RU')} ₽`, name === 'profit' ? 'Прибыль' : 'Выручка']} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Выручка" stroke="#1976d2" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="profit" name="Прибыль" stroke="#2e7d32" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Позиции с наибольшей прибылью</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Позиция</TableCell>
                          <TableCell align="right">Кол-во</TableCell>
                          <TableCell align="right">Выручка</TableCell>
                          <TableCell align="right">Себестоимость</TableCell>
                          <TableCell align="right">Прибыль</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {salesProfitRows.slice(0, 20).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell align="right">{row.quantity}</TableCell>
                            <TableCell align="right">{row.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right">{row.cost.toLocaleString('ru-RU')} ₽</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{row.profit.toLocaleString('ru-RU')} ₽</TableCell>
                          </TableRow>
                        ))}
                        {salesProfitRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">Нет продаж со склада за выбранный период</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'payments-summary':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <StatCard title="Сумма платежей" value={`${paymentStats.totalAmount.toLocaleString('ru-RU')} ₽`} icon={<Payments />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard title="Количество платежей" value={String(paymentStats.totalCount)} icon={<ReceiptLong />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard title="Средний платёж" value={`${paymentStats.averagePayment.toLocaleString('ru-RU')} ₽`} icon={<TrendingUp />} color="#9c27b0" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Способы оплаты</Typography>
                  <Box height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={paymentMethodSummary} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="amount" nameKey="method">
                          {paymentMethodSummary.map((_, index) => (
                            <Cell key={index} fill={['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#6b7280'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Детализация по способам оплаты</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Способ</TableCell>
                          <TableCell align="right">Платежей</TableCell>
                          <TableCell align="right">Сумма</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentMethodSummary.map((row) => (
                          <TableRow key={row.method}>
                            <TableCell>{row.method}</TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                            <TableCell align="right">{row.amount.toLocaleString('ru-RU')} ₽</TableCell>
                          </TableRow>
                        ))}
                        {paymentMethodSummary.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">Нет платежей за выбранный период</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'returns':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StatCard title="Возвратов" value={String(returnsStats.count)} icon={<ReceiptLong />} color="#d32f2f" />
            </Grid>
            <Grid item xs={12} md={6}>
              <StatCard title="Сумма возвратов" value={`${returnsStats.totalAmount.toLocaleString('ru-RU')} ₽`} icon={<AttachMoney />} color="#ed6c02" />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Возвраты платежей</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Дата</TableCell>
                          <TableCell>Заказ</TableCell>
                          <TableCell>Клиент</TableCell>
                          <TableCell>Способ</TableCell>
                          <TableCell align="right">Сумма</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {refundedPayments.map((row, index) => (
                          <TableRow key={`${row.orderId}_${index}`}>
                            <TableCell>{dayFormatter.format(row.date)}</TableCell>
                            <TableCell>#{row.orderNumber}</TableCell>
                            <TableCell>{row.clientName}</TableCell>
                            <TableCell>{row.method}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                              {row.amount.toLocaleString('ru-RU')} ₽
                            </TableCell>
                          </TableRow>
                        ))}
                        {refundedPayments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">Возвратов за выбранный период нет</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'order-statuses':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <StatCard title="Заказов за период" value={String(periodOrders.length)} icon={<Assignment />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} md={9}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Распределение по статусам</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {orderStatusDistribution.map((item) => (
                      <Chip key={item.name} label={`${item.name}: ${item.value}%`} sx={{ bgcolor: `${item.color}22`, color: item.color, fontWeight: 600 }} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
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
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Новые заказы по периоду</Typography>
                  <Box height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={ordersByPeriodSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis allowDecimals={false} />
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
      case 'stock-movement':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <StatCard title="Позиций" value={String(topParts.length)} icon={<ShoppingBag />} color="#1976d2" />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Продано, шт."
                value={String(topParts.reduce((sum, item) => sum + item.sold, 0))}
                icon={<Sell />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Выручка"
                value={`${topParts.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('ru-RU')} ₽`}
                icon={<AttachMoney />}
                color="#9c27b0"
              />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {activeReport === 'stock-movement' ? 'Движение по складу — списания' : 'Топ товаров и запчастей'}
                  </Typography>
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
            </Grid>
          </Grid>
        );
      case 'service-report':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StatCard
                title="Услуг оказано"
                value={String(serviceRevenueRows.reduce((sum, item) => sum + item.quantity, 0))}
                icon={<Sell />}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <StatCard
                title="Выручка по услугам"
                value={`${serviceRevenueRows.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('ru-RU')} ₽`}
                icon={<AttachMoney />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Топ услуг по выручке</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Услуга</TableCell>
                          <TableCell align="right">Кол-во</TableCell>
                          <TableCell align="right">Выручка</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {serviceRevenueRows.map((row) => (
                          <TableRow key={row.name}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell align="right">{row.quantity}</TableCell>
                            <TableCell align="right">{row.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                          </TableRow>
                        ))}
                        {serviceRevenueRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">Нет услуг в оплаченных заказах за период</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'product-service-report':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Товары и запчасти</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Позиция</TableCell>
                          <TableCell align="right">Продано</TableCell>
                          <TableCell align="right">Доход</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topParts.slice(0, 10).map((part) => (
                          <TableRow key={part.name}>
                            <TableCell>{part.name}</TableCell>
                            <TableCell align="right">{part.sold}</TableCell>
                            <TableCell align="right">{part.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Услуги</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Услуга</TableCell>
                          <TableCell align="right">Кол-во</TableCell>
                          <TableCell align="right">Выручка</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {serviceRevenueRows.slice(0, 10).map((row) => (
                          <TableRow key={row.name}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell align="right">{row.quantity}</TableCell>
                            <TableCell align="right">{row.revenue.toLocaleString('ru-RU')} ₽</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'daily-sales':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Товары и услуги по дням</Typography>
                  <Box height={360}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={dailySalesSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']} />
                        <Legend />
                        <Bar dataKey="products" name="Товары" stackId="sales" fill="#1976d2" />
                        <Bar dataKey="services" name="Услуги" stackId="sales" fill="#2e7d32" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </Box>
                  {dailySalesSeries.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Нет продаж за выбранный период
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'client-growth':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StatCard title="Новых клиентов" value={String(clientGrowthStats.newClients)} icon={<Groups />} color="#2e7d32" />
            </Grid>
            <Grid item xs={12} md={6}>
              <StatCard title="Всего в базе" value={String(clientGrowthStats.totalClients)} icon={<TrendingUp />} color="#1976d2" />
            </Grid>
            <Grid item xs={12}>
              <Card sx={panelCardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Рост клиентской базы</Typography>
                  <Box height={360}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={clientGrowthSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value: number) => [value, 'Новых клиентов']} />
                        <Area type="monotone" dataKey="clients" name="Новые клиенты" stroke="#2e7d32" fill="#2e7d32" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
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
                      sx={{
                        borderLeft: activeCategory === category.key ? '3px solid' : '3px solid transparent',
                        borderLeftColor: activeCategory === category.key ? 'primary.main' : 'transparent',
                        borderRadius: 0,
                      }}
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
              <Box>
                <Typography variant="h4" fontWeight={800}>Отчеты</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Каталог финансовых, складских и операционных отчетов CRM.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Stack spacing={3}>
            {groupedReports.map((group) => (
              <Box key={group.key}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>{group.title}</Typography>
                <Grid container spacing={2}>
                  {group.items.map((report) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={report.id}>
                      <Card
                        onClick={() => openReportAnalytics(report.id)}
                        sx={{
                          ...panelCardSx,
                          cursor: 'pointer',
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          border: activeReport === report.id && analyticsOpen
                            ? '2px solid'
                            : '1px solid var(--crm-border)',
                          borderColor: activeReport === report.id && analyticsOpen ? 'primary.main' : undefined,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: 8 },
                        }}
                      >
                        <CardContent
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            gap: 1.25,
                            p: 2,
                            position: 'relative',
                          }}
                        >
                          {report.isNew && (
                            <Chip
                              label="Новое"
                              color="primary"
                              size="small"
                              sx={{ position: 'absolute', top: 8, right: 8 }}
                            />
                          )}
                          <Avatar
                            sx={(theme) => ({
                              width: 48,
                              height: 48,
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.26 : 0.12),
                              color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                              '& .MuiSvgIcon-root': {
                                fontSize: 24,
                              },
                            })}
                          >
                            {report.icon}
                          </Avatar>
                          <Typography
                            fontWeight={600}
                            fontSize={14}
                            lineHeight={1.35}
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {report.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Drawer
        anchor="top"
        open={analyticsOpen && Boolean(activeReport)}
        onClose={closeReportAnalytics}
        PaperProps={{
          sx: {
            width: '100%',
            height: '100vh',
            maxHeight: '100vh',
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 2,
              borderBottom: '1px solid var(--crm-border)',
              bgcolor: 'var(--crm-panel)',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
                <IconButton onClick={closeReportAnalytics} aria-label="Закрыть отчёт" sx={{ mt: -0.5 }}>
                  <Close />
                </IconButton>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" fontWeight={800} color="text.primary" noWrap>
                    {activeReportMeta?.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Аналитика за выбранный период
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} flexShrink={0}>
                <Button variant="outlined" disabled={isExporting} onClick={() => void handleExportReport('Excel')}>
                  Excel
                </Button>
                <Button variant="contained" disabled={isExporting} onClick={() => void handleExportReport('PDF')}>
                  PDF
                </Button>
              </Stack>
            </Stack>

            <Card sx={{ ...panelCardSx, mt: 2, boxShadow: 'none', border: '1px solid var(--crm-border)' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Grid container spacing={2} alignItems="center">
                  <PeriodFilter value={reportPeriod} onChange={setReportPeriod} />
                </Grid>
              </CardContent>
            </Card>
          </Box>

          <Box
            ref={reportContentRef}
            sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 3 }, py: 3, bgcolor: 'background.default', color: 'text.primary' }}
          >
            {renderReportContent()}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Reports;
