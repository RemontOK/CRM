import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  AttachMoney,
  Download,
  Print,
  Email,
  CalendarToday,
  BarChart,
  PieChart,
  Timeline,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import toast from 'react-hot-toast';

// Mock data
const monthlyRevenue = [
  { month: 'Янв', revenue: 2400000, orders: 45, clients: 38 },
  { month: 'Фев', revenue: 2200000, orders: 42, clients: 35 },
  { month: 'Мар', revenue: 2800000, orders: 48, clients: 42 },
  { month: 'Апр', revenue: 2600000, orders: 46, clients: 40 },
  { month: 'Май', revenue: 3200000, orders: 52, clients: 45 },
  { month: 'Июн', revenue: 2847500, orders: 49, clients: 41 },
];

const orderStatusDistribution = [
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

const topParts = [
  { name: 'Экран iPhone 14 Pro', sold: 15, revenue: 375000 },
  { name: 'Аккумулятор Samsung Galaxy S23', sold: 12, revenue: 42000 },
  { name: 'Корпус MacBook Pro 16"', sold: 8, revenue: 360000 },
  { name: 'Камера iPad Air 5', sold: 6, revenue: 48000 },
];

const dailyRevenue = [
  { day: 'Пн', revenue: 45000 },
  { day: 'Вт', revenue: 52000 },
  { day: 'Ср', revenue: 48000 },
  { day: 'Чт', revenue: 61000 },
  { day: 'Пт', revenue: 58000 },
  { day: 'Сб', revenue: 42000 },
  { day: 'Вс', revenue: 38000 },
];

const Reports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportType, setReportType] = useState('revenue');

  const handleExport = (format: string) => {
    toast.success(`Отчет экспортирован в формате ${format}`);
  };

  const StatCard: React.FC<{
    title: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, changeType, icon, color }) => (
    <motion.div whileHover={{ scale: 1.02 }}>
      <Card>
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
      </Card>
    </motion.div>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Отчеты
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('PDF')}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('Excel')}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => handleExport('Print')}
          >
            Печать
          </Button>
        </Box>
      </Box>

      {/* Report Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Период</InputLabel>
                <Select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  label="Период"
                >
                  <MenuItem value="week">Неделя</MenuItem>
                  <MenuItem value="month">Месяц</MenuItem>
                  <MenuItem value="quarter">Квартал</MenuItem>
                  <MenuItem value="year">Год</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Тип отчета</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="Тип отчета"
                >
                  <MenuItem value="revenue">Доходы</MenuItem>
                  <MenuItem value="orders">Заказы</MenuItem>
                  <MenuItem value="clients">Клиенты</MenuItem>
                  <MenuItem value="employees">Сотрудники</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Assessment />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                }}
              >
                Сформировать отчет
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Email />}
              >
                Отправить по email
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Общий доход"
            value="₽2,847,500"
            change="+23%"
            changeType="positive"
            icon={<AttachMoney />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Заказов"
            value="1,247"
            change="+12%"
            changeType="positive"
            icon={<Assignment />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Клиентов"
            value="3,421"
            change="+8%"
            changeType="positive"
            icon={<People />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Средний чек"
            value="₽2,284"
            change="+5%"
            changeType="positive"
            icon={<TrendingUp />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Report Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<BarChart />} label="Доходы" />
            <Tab icon={<PieChart />} label="Заказы" />
            <Tab icon={<Timeline />} label="Тренды" />
            <Tab icon={<People />} label="Сотрудники" />
            <Tab icon={<Assignment />} label="Детализация" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Revenue Tab */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Динамика доходов по месяцам
              </Typography>
              <Box height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₽${value.toLocaleString()}`, 'Доход']} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}

          {/* Orders Tab */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Распределение заказов по статусам
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={orderStatusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {orderStatusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, 'Процент']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [value, 'Заказы']} />
                        <Bar dataKey="orders" fill="#1976d2" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Trends Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Тренды по дням недели
              </Typography>
              <Box height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
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
            </Box>
          )}

          {/* Employees Tab */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Топ сотрудников по эффективности
              </Typography>
              <TableContainer component={Paper}>
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
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body1" fontWeight="500">
                              {tech.name}
                            </Typography>
                            {index < 3 && (
                              <Chip
                                label={`#${index + 1}`}
                                size="small"
                                color={index === 0 ? 'warning' : 'default'}
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{tech.orders}</TableCell>
                        <TableCell align="right">₽{tech.revenue.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {tech.rating}
                            </Typography>
                            <Typography color="orange">★</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Details Tab */}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Топ запчастей по продажам
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Запчасть</TableCell>
                      <TableCell align="right">Продано</TableCell>
                      <TableCell align="right">Доход</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topParts.map((part, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="500">
                            {part.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{part.sold}</TableCell>
                        <TableCell align="right">₽{part.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;


