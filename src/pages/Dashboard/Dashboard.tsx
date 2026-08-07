import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AttachMoney,
  BuildCircleOutlined,
  PeopleOutline,
  QueryStatsOutlined,
  TaskAltOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCompanyName } from '../../hooks/useCompanyName';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CashOperation, Client, Order } from '../../types';
import { cashService } from '../../services/cashService';
import { clientService } from '../../services/clientService';
import { orderService } from '../../services/orderService';
import { heroCardSx, pageShellSx, panelCardSx } from '../../styles/ui';
import { useCrmAppearance } from '../../context/CrmThemeProvider';
import { getOrderTotal } from '../../utils/orderMetrics';

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short' });

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const chartTooltipProps = {
    contentStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      boxShadow: theme.shadows[4],
    },
    labelStyle: {
      color: theme.palette.text.primary,
      fontWeight: 700,
      marginBottom: 4,
    },
    itemStyle: {
      color: theme.palette.text.primary,
    },
  };
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyName = useCompanyName();
  const { colors } = useCrmAppearance();
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [cashOperations, setCashOperations] = useState<CashOperation[]>([]);

  useEffect(() => {
    if (!user?.tenantId) {
      return;
    }

    const loadDashboard = async () => {
      setOrdersData([]);
      setClientsData([]);
      setCashOperations([]);
      await Promise.all([
        clientService.refreshFromApi(),
        cashService.refreshFromApi(),
      ]);
      const orders = await orderService.getOrders();
      setOrdersData(orders);
      setClientsData(clientService.getClients());
      setCashOperations(cashService.getOperations());
    };

    void loadDashboard();
  }, [user?.tenantId]);

  const activeOrders = useMemo(
    () => ordersData.filter((order) => !['completed', 'cancelled'].includes(order.status)),
    [ordersData]
  );

  const paidOrders = useMemo(
    () => ordersData.filter((order) => order.isPaid || (order.payments || []).length > 0),
    [ordersData]
  );

  const totalRevenue = useMemo(
    () =>
      cashOperations
        .filter((operation) => operation.type === 'income')
        .reduce((sum, operation) => sum + operation.amount, 0),
    [cashOperations]
  );

  const averageCheck = useMemo(() => {
    if (paidOrders.length === 0) {
      return 0;
    }

    const totalPaid = paidOrders.reduce((sum, order) => {
      const paid = (order.payments || []).reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
      return sum + paid;
    }, 0);

    return Math.round(totalPaid / paidOrders.length);
  }, [paidOrders]);

  const repeatClients = useMemo(
    () => clientsData.filter((client) => client.totalOrders > 1).length,
    [clientsData]
  );

  const urgentOrders = useMemo(
    () => activeOrders.filter((order) => order.priority === 'urgent').length,
    [activeOrders]
  );

  const orderFilterCards = useMemo(
    () => [
      {
        key: 'active',
        label: 'Активные',
        value: activeOrders.length,
        path: '/orders?scope=active&status=all&period=all',
      },
      {
        key: 'ready',
        label: 'Готов',
        value: ordersData.filter((order) => order.status === 'ready').length,
        path: '/orders?scope=active&status=ready&period=all',
      },
      {
        key: 'waiting_parts',
        label: 'Ожидание запчастей',
        value: ordersData.filter((order) => order.status === 'waiting_parts').length,
        path: '/orders?scope=active&status=waiting_parts&period=all',
      },
    ],
    [activeOrders.length, ordersData]
  );

  const stats = useMemo(
    () => [
      {
        title: 'Заказов в системе',
        value: ordersData.length.toLocaleString('ru-RU'),
        note: `Завершено: ${ordersData.filter((order) => order.status === 'completed').length}`,
        icon: <BuildCircleOutlined />,
      },
      {
        title: 'Активных ремонтов',
        value: activeOrders.length.toLocaleString('ru-RU'),
        note: urgentOrders > 0 ? `Срочных заказов: ${urgentOrders}` : 'Срочных заказов нет',
        icon: <TaskAltOutlined />,
      },
      {
        title: 'Клиентов',
        value: clientsData.length.toLocaleString('ru-RU'),
        note: repeatClients > 0 ? `Повторных клиентов: ${repeatClients}` : 'Повторных клиентов пока нет',
        icon: <PeopleOutline />,
      },
      {
        title: 'Оборот',
        value: `${totalRevenue.toLocaleString('ru-RU')} ₽`,
        note: averageCheck > 0 ? `Средний чек ${averageCheck.toLocaleString('ru-RU')} ₽` : 'Оплат пока нет',
        icon: <AttachMoney />,
      },
    ],
    [activeOrders.length, averageCheck, clientsData.length, ordersData, repeatClients, totalRevenue, urgentOrders]
  );

  const revenue = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        month: monthFormatter.format(date).replace('.', ''),
        revenue: 0,
      };
    });

    const incomeOperations = cashOperations.filter((operation) => operation.type === 'income');
    incomeOperations.forEach((operation) => {
      const date = new Date(operation.processedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const monthEntry = months.find((item) => item.key === key);
      if (monthEntry) {
        monthEntry.revenue += operation.amount;
      }
    });

    return months.map(({ month, revenue: monthRevenue }) => ({ month, revenue: monthRevenue }));
  }, [cashOperations]);

  const workloads = useMemo(() => {
    const statusMap: Record<string, { name: string; value: number; color: string }> = {
      diagnosis: { name: 'Диагностика', value: 0, color: colors.info },
      waiting_parts: { name: 'Ждут запчасти', value: 0, color: colors.primary },
      waiting_client: { name: 'Ждут клиента', value: 0, color: colors.secondary },
      in_progress: { name: 'В работе', value: 0, color: '#7c3aed' },
      ready: { name: 'Готовы', value: 0, color: colors.success },
      completed: { name: 'Завершены', value: 0, color: '#475569' },
    };

    ordersData.forEach((order) => {
      if (statusMap[order.status]) {
        statusMap[order.status].value += 1;
      }
    });

    return Object.values(statusMap).filter((item) => item.value > 0);
  }, [ordersData, colors]);

  const workshopQueue = useMemo(
    () => [
      { stage: 'Ожидают диагностику', count: ordersData.filter((order) => order.status === 'diagnosis').length },
      { stage: 'Ожидают запчасти', count: ordersData.filter((order) => order.status === 'waiting_parts').length },
      { stage: 'В работе', count: ordersData.filter((order) => order.status === 'in_progress').length },
      { stage: 'Готовы к выдаче', count: ordersData.filter((order) => order.status === 'ready').length },
    ],
    [ordersData]
  );

  const recentOrders = useMemo(
    () =>
      [...ordersData]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5)
        .map((order) => ({
          id: order.orderNumber,
          client: order.clientName || 'Без клиента',
          device: [order.deviceBrand, order.deviceModel].filter(Boolean).join(' ') || 'Без устройства',
          status:
            {
              diagnosis: 'Диагностика',
              waiting_parts: 'Ждут запчасти',
              waiting_client: 'Ждут клиента',
              in_progress: 'В работе',
              ready: 'Готов',
              completed: 'Завершен',
              cancelled: 'Отменен',
              pending: 'Новый',
            }[order.status] || order.status,
          amount: `${getOrderTotal(order).toLocaleString('ru-RU')} ₽`,
        })),
    [ordersData]
  );

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', letterSpacing: 1.4 }}>
          {companyName.toUpperCase()} · ОПЕРАЦИОННЫЙ ОБЗОР
        </Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 1.5, color: 'common.white' }}>
          Сводка по сервисному центру
        </Typography>
        <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)' }}>
          Здесь вы видите основные показатели сервиса: активные заказы, клиентов, выручку и текущую загрузку команды.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((item) => (
          <Grid item xs={12} md={6} xl={3} key={item.title}>
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card sx={{ ...panelCardSx, height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.title}
                      </Typography>
                      <Typography variant="h4" sx={{ mt: 1, mb: 1 }}>
                        {item.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.note}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'var(--crm-color-primary-soft)', color: 'primary.main' }}>{item.icon}</Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={1.5}>
        {orderFilterCards.map((item) => (
          <Grid item xs={12} md={4} key={item.key}>
            <Card
              onClick={() => navigate(item.path)}
              sx={{
                ...panelCardSx,
                cursor: 'pointer',
                borderRadius: 1,
                boxShadow: 'none',
                transition: 'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(234, 88, 12, 0.34)',
                  backgroundColor: 'rgba(255, 247, 237, 0.82)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ py: 1.4, '&:last-child': { pb: 1.4 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {item.label}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.25, lineHeight: 1.05 }}>
                  {item.value.toLocaleString('ru-RU')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={8}>
          <Card sx={{ ...panelCardSx, height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h5">Выручка по месяцам</Typography>
                  <Typography color="text.secondary">Реальная динамика поступлений по кассе</Typography>
                </Box>
                <Chip icon={<QueryStatsOutlined />} label="Данные из кассы" color="primary" variant="outlined" />
              </Stack>
              <Box height={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка']}
                    />
                    <Line type="monotone" dataKey="revenue" name="Выручка" stroke={colors.primary} strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={4}>
          <Card sx={{ ...panelCardSx, height: '100%' }}>
            <CardContent>
              <Typography variant="h5">Распределение заказов</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Фактическое распределение по статусам
              </Typography>
              <Box height={320}>
                {workloads.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={workloads} dataKey="value" nameKey="name" innerRadius={72} outerRadius={112} paddingAngle={4}>
                        {workloads.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value: number) => [`${value} шт.`, 'Заказов']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <Typography color="text.secondary">Пока нет заказов для аналитики</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={5}>
          <Card sx={{ ...panelCardSx, height: '100%' }}>
            <CardContent>
              <Typography variant="h5">Очередь мастерской</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Операционная загрузка по этапам
              </Typography>
              <Box height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workshopQueue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                    <XAxis dataKey="stage" hide />
                    <YAxis />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(value: number) => [`${value} шт.`, 'Количество']}
                      labelFormatter={(label) => String(label)}
                    />
                    <Bar dataKey="count" name="Количество" fill={colors.secondary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {workshopQueue.map((item) => (
                  <Stack key={item.stage} direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">{item.stage}</Typography>
                    <Typography fontWeight={700}>{item.count}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={7}>
          <Card sx={{ ...panelCardSx, height: '100%' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5">Последние заказы</Typography>
              <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                Последние реальные заказы из CRM
              </Typography>
              {recentOrders.length > 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    maxHeight: 456,
                    overflowY: 'auto',
                    pr: 0.5,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  <List disablePadding>
                    {recentOrders.map((order) => (
                      <ListItem key={order.id} disableGutters sx={{ py: 1.4, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                        <ListItemText
                          primary={
                            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                              <Typography fontWeight={700}>{order.id}</Typography>
                              <Typography color="text.secondary">{order.amount}</Typography>
                            </Stack>
                          }
                          secondary={
                            <Box sx={{ mt: 0.75 }}>
                              <Typography variant="body2" color="text.primary">
                                {order.client} · {order.device}
                              </Typography>
                              <Box sx={{ mt: 0.75 }}>
                                <Chip label={order.status} size="small" color="primary" variant="outlined" />
                              </Box>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Typography color="text.secondary">Пока нет заказов в системе.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
