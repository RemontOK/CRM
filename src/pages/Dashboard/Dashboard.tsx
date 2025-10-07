import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Assignment,
  AttachMoney,
  Star,
  Inventory,
  Schedule,
  CheckCircle,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Mock data
const statsData: Array<{
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
  color: string;
}> = [
  {
    title: 'Всего заказов',
    value: '1,247',
    change: '+12%',
    changeType: 'positive',
    icon: <Assignment />,
    color: '#1976d2',
  },
  {
    title: 'Активные заказы',
    value: '89',
    change: '+5%',
    changeType: 'positive',
    icon: <Schedule />,
    color: '#ed6c02',
  },
  {
    title: 'Завершенные',
    value: '1,158',
    change: '+18%',
    changeType: 'positive',
    icon: <CheckCircle />,
    color: '#2e7d32',
  },
  {
    title: 'Доход за месяц',
    value: '₽2,847,500',
    change: '+23%',
    changeType: 'positive',
    icon: <AttachMoney />,
    color: '#9c27b0',
  },
  {
    title: 'Клиенты',
    value: '3,421',
    change: '+8%',
    changeType: 'positive',
    icon: <People />,
    color: '#f57c00',
  },
  {
    title: 'Запчасти на складе',
    value: '1,234',
    change: '-3%',
    changeType: 'negative',
    icon: <Inventory />,
    color: '#d32f2f',
  },
];

const revenueData = [
  { month: 'Янв', revenue: 2400000 },
  { month: 'Фев', revenue: 2200000 },
  { month: 'Мар', revenue: 2800000 },
  { month: 'Апр', revenue: 2600000 },
  { month: 'Май', revenue: 3200000 },
  { month: 'Июн', revenue: 2847500 },
];

const orderStatusData = [
  { name: 'Завершено', value: 65, color: '#2e7d32' },
  { name: 'В работе', value: 20, color: '#ed6c02' },
  { name: 'Ожидание', value: 10, color: '#1976d2' },
  { name: 'Отменено', value: 5, color: '#d32f2f' },
];

const topTechnicians = [
  { name: 'Иван Петров', orders: 45, revenue: 125000, rating: 4.9 },
  { name: 'Мария Сидорова', orders: 38, revenue: 98000, rating: 4.8 },
  { name: 'Алексей Козлов', orders: 32, revenue: 87000, rating: 4.7 },
  { name: 'Елена Волкова', orders: 28, revenue: 76000, rating: 4.6 },
];

const recentOrders = [
  { id: '#001247', client: 'Петров И.И.', device: 'iPhone 14', status: 'В работе', amount: 15000 },
  { id: '#001246', client: 'Сидорова М.А.', device: 'Samsung Galaxy S23', status: 'Завершен', amount: 12000 },
  { id: '#001245', client: 'Козлов А.В.', device: 'MacBook Pro', status: 'Ожидание', amount: 45000 },
  { id: '#001244', client: 'Волкова Е.С.', device: 'iPad Air', status: 'В работе', amount: 18000 },
];

const StatCard: React.FC<{
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, change, changeType, icon, color }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
          <Chip
            label={change}
            color={changeType === 'positive' ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          borderRadius: '0 0 0 100%',
        }}
      />
    </Card>
  </motion.div>
);

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Дашборд
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Обзор деятельности сервисного центра
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue Chart */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Динамика доходов
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₽${value.toLocaleString()}`, 'Доход']} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#1976d2"
                        strokeWidth={3}
                        dot={{ fill: '#1976d2', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Order Status Pie Chart */}
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Статус заказов
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {orderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Процент']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Top Technicians */}
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Топ техников
                </Typography>
                <List>
                  {topTechnicians.map((tech, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={tech.name}
                          secondary={
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="body2">
                                {tech.orders} заказов
                              </Typography>
                              <Typography variant="body2">
                                ₽{tech.revenue.toLocaleString()}
                              </Typography>
                              <Box display="flex" alignItems="center">
                                <Star sx={{ fontSize: 16, color: 'orange', mr: 0.5 }} />
                                <Typography variant="body2">{tech.rating}</Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < topTechnicians.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Recent Orders */}
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Последние заказы
                </Typography>
                <List>
                  {recentOrders.map((order, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1" fontWeight="500">
                                {order.id}
                              </Typography>
                              <Chip
                                label={order.status}
                                size="small"
                                color={
                                  order.status === 'Завершен' ? 'success' :
                                  order.status === 'В работе' ? 'warning' : 'default'
                                }
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {order.client} • {order.device}
                              </Typography>
                              <Typography variant="body2" fontWeight="500">
                                ₽{order.amount.toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentOrders.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;


