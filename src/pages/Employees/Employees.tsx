import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Assignment,
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Delete,
  Edit,
  FilterList,
  Person,
  Search,
  Star,
  TrendingUp,
  Visibility,
  Work,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { motion } from 'framer-motion';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { Employee, EmployeeScheduleEntry, EmployeeScheduleRosterEntry, EmployeeTask, EmployeeTaskStatus, Order, TaxonomyNode } from '../../types';
import { employeeService } from '../../services/employeeService';
import { employeeWorkService } from '../../services/employeeWorkService';
import { orderService } from '../../services/orderService';
import { taxonomyService } from '../../services/taxonomyService';
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter';
import { heroCardSx, pageShellSx, panelCardSx, sectionTitleSx, toolbarCardSx } from '../../styles/ui';
import { defaultPeriodFilterValue, isDateWithinRange, PeriodFilterValue } from '../../utils/dateRange';

const roleOptions = [
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'technician', label: 'Техник' },
  { value: 'cashier', label: 'Кассир' },
];

const emptyEmployee = {
  name: '',
  email: '',
  phone: '',
  loginEmail: '',
  password: '',
  canLogin: true,
  role: '',
  position: '',
  department: '',
  salary: '',
  intakeRate: '0',
  executionRate: '0',
  deliveryRate: '0',
};

type EmployeeFormState = typeof emptyEmployee;

const emptyScheduleForm = {
  id: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '10:00',
  endTime: '19:00',
  location: '',
  note: '',
  isDayOff: false,
};

const emptyTaskForm = {
  id: '',
  title: '',
  description: '',
  dueDate: '',
  status: 'todo' as EmployeeTaskStatus,
  priority: 'medium' as EmployeeTask['priority'],
  progress: '0',
};

const taskStatusLabels: Record<EmployeeTaskStatus, string> = {
  todo: 'Новая',
  in_progress: 'В работе',
  done: 'Готово',
  blocked: 'Проблема',
};

const taskPriorityLabels: Record<EmployeeTask['priority'], string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthDates = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1));
};

const EMPLOYEES_GRID_PAGE_SIZE_KEY = 'employees_grid_rows_per_page_v1';
const gridPageSizeOptions = [10, 50, 100];

const getSavedGridPageSize = (key: string) => {
  const value = Number(localStorage.getItem(key));
  return gridPageSizeOptions.includes(value) ? value : 10;
};

const getEmployeeInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  const initials = parts.length === 1
    ? parts[0].slice(0, 1)
    : `${parts[0][0] || ''}${parts[1][0] || ''}`;

  return initials.toUpperCase();
};

const employeeAvatarSx = {
  bgcolor: 'primary.main',
  color: '#fff',
  width: 38,
  height: 38,
  flexShrink: 0,
  fontSize: '0.92rem',
  fontWeight: 800,
  letterSpacing: 0,
  lineHeight: 1,
};

type EmployeeWithMetrics = Employee & {
  orderStats: {
    intakeOrders: number;
    executionOrders: number;
    deliveryOrders: number;
  };
  serviceProfit: number;
  serviceRevenue: number;
};

const Employees: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  const [isQuickTaskDialogOpen, setIsQuickTaskDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(() => defaultPeriodFilterValue('month'));
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [departmentNodes, setDepartmentNodes] = useState<TaxonomyNode[]>([]);
  const [positionNodes, setPositionNodes] = useState<TaxonomyNode[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newPositionName, setNewPositionName] = useState('');
  const [newEmployee, setNewEmployee] = useState<EmployeeFormState>(emptyEmployee);
  const [editEmployee, setEditEmployee] = useState<EmployeeFormState>(emptyEmployee);
  const [scheduleEntries, setScheduleEntries] = useState<EmployeeScheduleEntry[]>([]);
  const [scheduleRosterEntries, setScheduleRosterEntries] = useState<EmployeeScheduleRosterEntry[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [quickTaskEmployeeId, setQuickTaskEmployeeId] = useState('');
  const [quickTaskDate, setQuickTaskDate] = useState(() => toDateKey(new Date()));
  const [scheduleRosterEmployeeId, setScheduleRosterEmployeeId] = useState('');
  const [scheduleMonth, setScheduleMonth] = useState(() => toMonthKey(new Date()));
  const [rowsPerPage, setRowsPerPage] = useState(() => getSavedGridPageSize(EMPLOYEES_GRID_PAGE_SIZE_KEY));

  const refreshEmployees = async () => {
    await taxonomyService.refreshFromApi();
    await employeeService.refreshFromApi();
    const workSettings = await employeeWorkService.refresh();
    setEmployeesData(employeeService.getEmployees());
    setDepartmentNodes(taxonomyService.getRoots('employee_departments'));
    setPositionNodes(taxonomyService.getRoots('employee_positions'));
    setScheduleEntries(workSettings.employeeWork.schedules);
    setScheduleRosterEntries(workSettings.employeeWork.rosterEntries);
    setEmployeeTasks(workSettings.employeeWork.tasks);
    setOrdersData(await orderService.getOrders());
  };

  useEffect(() => {
    void refreshEmployees();
  }, []);

  const paidAmountByOrder = (order: Order) =>
    (order.payments || [])
      .filter((payment) => isDateWithinRange(payment.processedAt, periodFilter))
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);

  const employeesWithMetrics = useMemo<EmployeeWithMetrics[]>(
    () => {
      const normalize = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

      return employeesData.map((employee) => {
        let intakeOrders = 0;
        let executionOrders = 0;
        let deliveryOrders = 0;
        let pieceworkEarnings = 0;
        let serviceProfit = 0;
        let serviceRevenue = 0;

        ordersData.forEach((order) => {
          const orderInPeriod = isDateWithinRange(order.createdAt, periodFilter);
          const paidAmount = paidAmountByOrder(order);
          const employeeName = normalize(employee.name);
          const isIntake = normalize(order.intakeManagerName) === employeeName;
          const isExecutor = normalize(order.technicianName) === employeeName;
          const isDelivery = normalize(order.deliveryManagerName) === employeeName;
          const isInvolved = isIntake || isExecutor || isDelivery;

          if (orderInPeriod && isIntake) {
            intakeOrders += 1;
          }

          if (orderInPeriod && isExecutor) {
            executionOrders += 1;
          }

          if (orderInPeriod && isDelivery) {
            deliveryOrders += 1;
          }

          if (paidAmount <= 0) return;

          if (isIntake) {
            pieceworkEarnings += paidAmount * (employee.intakeRate / 100);
          }

          if (isExecutor) {
            pieceworkEarnings += paidAmount * (employee.executionRate / 100);
          }

          if (isDelivery) {
            pieceworkEarnings += paidAmount * (employee.deliveryRate / 100);
          }

          if (isInvolved) {
            const partsCost = (order.parts || []).reduce((sum, part) => {
              const partCost = Number((part as any)?.partInfo?.partCost ?? 0);
              return sum + partCost;
            }, 0);
            const orderMargin = Math.max(paidAmount - partsCost, 0);
            const employeeCommission =
              (isIntake ? (orderMargin * (employee.intakeRate || 0)) / 100 : 0) +
              (isExecutor ? (orderMargin * (employee.executionRate || 0)) / 100 : 0) +
              (isDelivery ? (orderMargin * (employee.deliveryRate || 0)) / 100 : 0);

            serviceRevenue += paidAmount;
            serviceProfit += Math.max(orderMargin - employeeCommission, 0);
          }
        });

        return {
          ...employee,
          totalOrders: intakeOrders + executionOrders + deliveryOrders,
          completedOrders: executionOrders,
          totalEarnings: Math.round(pieceworkEarnings),
          orderStats: { intakeOrders, executionOrders, deliveryOrders },
          serviceProfit: Math.round(serviceProfit),
          serviceRevenue: Math.round(serviceRevenue),
        };
      });
    },
    [employeesData, ordersData, periodFilter]
  );

  const stats = useMemo(() => {
    const totalEmployees = employeesWithMetrics.length;
    const activeEmployees = employeesWithMetrics.filter((employee) => employee.isActive).length;
    const totalPiecework = employeesWithMetrics.reduce((sum, employee) => sum + employee.totalEarnings, 0);
    const averageRating = totalEmployees
      ? employeesWithMetrics.reduce((sum, employee) => sum + employee.rating, 0) / totalEmployees
      : 0;

    return { totalEmployees, activeEmployees, totalPiecework, averageRating };
  }, [employeesWithMetrics]);

  const topPerformers = useMemo(
    () => employeesWithMetrics.filter((employee) => employee.isActive).sort((a, b) => b.totalEarnings - a.totalEarnings).slice(0, 3),
    [employeesWithMetrics]
  );

  const filteredEmployees = useMemo(
    () =>
      employeesWithMetrics.filter((employee) => {
        const matchesSearch =
          employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.position.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === 'all' || employee.role === filterRole;
        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'active' && employee.isActive) ||
          (filterStatus === 'inactive' && !employee.isActive);

        return matchesSearch && matchesRole && matchesStatus;
      }),
    [employeesWithMetrics, filterRole, filterStatus, searchTerm]
  );

  const selectedSchedule = useMemo(
    () =>
      scheduleEntries
        .filter((entry) => entry.employeeId === selectedEmployee?.id)
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [scheduleEntries, selectedEmployee?.id]
  );

  const selectedTasks = useMemo(
    () =>
      employeeTasks
        .filter((task) => task.employeeId === selectedEmployee?.id)
        .sort((a, b) => {
          if ((a.status === 'done') !== (b.status === 'done')) {
            return a.status === 'done' ? 1 : -1;
          }

          return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
        }),
    [employeeTasks, selectedEmployee?.id]
  );

  const scheduleMonthDates = useMemo(() => getMonthDates(scheduleMonth), [scheduleMonth]);

  const activeScheduleEmployees = useMemo(() => {
    const monthRosterIds = new Set(scheduleRosterEntries.filter((entry) => entry.month === scheduleMonth).map((entry) => entry.employeeId));
    return employeesWithMetrics.filter((employee) => employee.isActive || monthRosterIds.has(employee.id));
  }, [employeesWithMetrics, scheduleMonth, scheduleRosterEntries]);

  const scheduleRosterCandidates = useMemo(() => {
    const visibleIds = new Set(activeScheduleEmployees.map((employee) => employee.id));
    return employeesWithMetrics.filter((employee) => !visibleIds.has(employee.id));
  }, [activeScheduleEmployees, employeesWithMetrics]);

  useEffect(() => {
    if (!quickTaskEmployeeId && activeScheduleEmployees[0]) {
      setQuickTaskEmployeeId(activeScheduleEmployees[0].id);
    }
  }, [activeScheduleEmployees, quickTaskEmployeeId]);

  useEffect(() => {
    if (!scheduleRosterEmployeeId && scheduleRosterCandidates[0]) {
      setScheduleRosterEmployeeId(scheduleRosterCandidates[0].id);
    }

    if (scheduleRosterEmployeeId && !scheduleRosterCandidates.some((employee) => employee.id === scheduleRosterEmployeeId)) {
      setScheduleRosterEmployeeId(scheduleRosterCandidates[0]?.id || '');
    }
  }, [scheduleRosterCandidates, scheduleRosterEmployeeId]);

  const scheduleByEmployeeAndDate = useMemo(() => {
    const map = new Map<string, EmployeeScheduleEntry>();
    scheduleEntries.forEach((entry) => {
      map.set(`${entry.employeeId}_${entry.date}`, entry);
    });
    return map;
  }, [scheduleEntries]);

  const scheduleEmployeeColumnWidth = 200;
  const scheduleDayColumnWidth = useMemo(
    () => `calc((100% - ${scheduleEmployeeColumnWidth}px) / ${Math.max(scheduleMonthDates.length, 1)})`,
    [scheduleMonthDates.length]
  );

  const getDefaultScheduleForm = (date = toDateKey(new Date())) => {
    const { employees } = employeeWorkService.getSettings();

    return {
      ...emptyScheduleForm,
      date,
      startTime: employees.defaultWorkStartTime || emptyScheduleForm.startTime,
      endTime: employees.defaultWorkEndTime || emptyScheduleForm.endTime,
    };
  };

  const openWorkDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setScheduleForm(getDefaultScheduleForm());
    setTaskForm(emptyTaskForm);
    setIsWorkDialogOpen(true);
  };

  const openScheduleDay = (employee: Employee, dateKey: string) => {
    const entry = scheduleByEmployeeAndDate.get(`${employee.id}_${dateKey}`);
    setSelectedEmployee(employee);
    setTaskForm(emptyTaskForm);
    setScheduleForm(entry ? { ...getDefaultScheduleForm(dateKey), ...entry } : getDefaultScheduleForm(dateKey));
    setIsWorkDialogOpen(true);
  };

  const handleCreateDefaultShift = async (employee: Employee, dateKey: string) => {
    const { employees } = employeeWorkService.getSettings();

    await employeeWorkService.saveScheduleEntry({
      employeeId: employee.id,
      date: dateKey,
      startTime: employees.defaultWorkStartTime || '10:00',
      endTime: employees.defaultWorkEndTime || '19:00',
      location: '',
      note: '',
      isDayOff: false,
    });
    await refreshEmployees();
    toast.success('Смена добавлена');
  };

  const moveScheduleMonth = (months: number) => {
    const [year, month] = scheduleMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + months, 1);
    setScheduleMonth(toMonthKey(date));
  };

  const handleAddRosterEmployee = async () => {
    if (!scheduleRosterEmployeeId) {
      toast.error('Выберите сотрудника');
      return;
    }

    await employeeWorkService.addScheduleRosterEmployee(scheduleRosterEmployeeId, scheduleMonth);
    setScheduleRosterEmployeeId('');
    await refreshEmployees();
    toast.success('Сотрудник добавлен в график месяца');
  };

  const handleSaveSchedule = async () => {
    if (!selectedEmployee) return;
    if (!scheduleForm.date) {
      toast.error('Укажите дату смены');
      return;
    }

    await employeeWorkService.saveScheduleEntry({
      ...scheduleForm,
      employeeId: selectedEmployee.id,
    });
    setScheduleForm(emptyScheduleForm);
    await refreshEmployees();
    toast.success('График сохранен');
  };

  const handleSaveTask = async () => {
    if (!selectedEmployee) return;
    if (!taskForm.title.trim()) {
      toast.error('Введите задачу');
      return;
    }

    await employeeWorkService.saveTask({
      ...taskForm,
      employeeId: selectedEmployee.id,
      title: taskForm.title.trim(),
      progress: Number(taskForm.progress) || 0,
    });
    setTaskForm(emptyTaskForm);
    await refreshEmployees();
    toast.success('Задача сохранена');
  };

  const handleSaveQuickTask = async () => {
    if (!quickTaskEmployeeId) {
      toast.error('Выберите сотрудника');
      return;
    }

    if (!taskForm.title.trim()) {
      toast.error('Введите задачу');
      return;
    }

    await employeeWorkService.saveTask({
      ...taskForm,
      employeeId: quickTaskEmployeeId,
      title: taskForm.title.trim(),
      dueDate: quickTaskDate,
      progress: Number(taskForm.progress) || 0,
    });
    setTaskForm(emptyTaskForm);
    setIsQuickTaskDialogOpen(false);
    await refreshEmployees();
    toast.success('Задача поставлена');
  };

  const handleTaskProgressChange = async (task: EmployeeTask, status: EmployeeTaskStatus, progress: number) => {
    await employeeWorkService.updateTaskProgress(task.id, status, progress);
    await refreshEmployees();
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditEmployee({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      loginEmail: employee.loginEmail || '',
      password: '',
      canLogin: employee.canLogin !== false,
      role: employee.role,
      position: employee.position,
      department: employee.department,
      salary: String(employee.salary || 0),
      intakeRate: String(employee.intakeRate || 0),
      executionRate: String(employee.executionRate || 0),
      deliveryRate: String(employee.deliveryRate || 0),
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast.error('Введите название отдела');
      return;
    }

    await taxonomyService.addNode('employee_departments', newDepartmentName.trim(), null);
    setNewDepartmentName('');
    await refreshEmployees();
    toast.success('Отдел добавлен');
  };

  const handleCreatePosition = async () => {
    if (!newPositionName.trim()) {
      toast.error('Введите название должности');
      return;
    }

    await taxonomyService.addNode('employee_positions', newPositionName.trim(), null);
    setNewPositionName('');
    await refreshEmployees();
    toast.success('Должность добавлена');
  };

  const handleDeleteDepartment = async (node: TaxonomyNode) => {
    if (employeesData.some((employee) => employee.department === node.name)) {
      toast.error('Сначала измените отдел у сотрудников');
      return;
    }

    await taxonomyService.deleteNode(node.id);
    await refreshEmployees();
    toast.success('Отдел удален');
  };

  const handleDeletePosition = async (node: TaxonomyNode) => {
    if (employeesData.some((employee) => employee.position === node.name)) {
      toast.error('Сначала измените должность у сотрудников');
      return;
    }

    await taxonomyService.deleteNode(node.id);
    await refreshEmployees();
    toast.success('Должность удалена');
  };
  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.role) {
      toast.error('Заполните обязательные поля сотрудника');
      return;
    }

    try {
      await employeeService.addEmployee({
        name: newEmployee.name,
        email: newEmployee.email.trim(),
        phone: newEmployee.phone,
        loginEmail: newEmployee.loginEmail.trim(),
        password: newEmployee.password || '',
        canLogin: newEmployee.canLogin,
        role: newEmployee.role as Employee['role'],
        department: newEmployee.department,
        position: newEmployee.position,
        salary: Number(newEmployee.salary) || 0,
        intakeRate: Number(newEmployee.intakeRate) || 0,
        executionRate: Number(newEmployee.executionRate) || 0,
        deliveryRate: Number(newEmployee.deliveryRate) || 0,
        rating: 5,
        totalOrders: 0,
        completedOrders: 0,
        totalEarnings: 0,
        isActive: true,
      });

      await refreshEmployees();
      setIsAddDialogOpen(false);
      setNewEmployee(emptyEmployee);
      toast.success('Сотрудник добавлен');
    } catch (error) {
      toast.error('Не удалось добавить сотрудника');
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      await employeeService.updateEmployee(selectedEmployee.id, {
        name: editEmployee.name,
        email: editEmployee.email.trim(),
        phone: editEmployee.phone,
        loginEmail: editEmployee.loginEmail.trim(),
        ...(editEmployee.password ? { password: editEmployee.password } : {}),
        canLogin: editEmployee.canLogin,
        role: editEmployee.role as Employee['role'],
        department: editEmployee.department,
        position: editEmployee.position,
        salary: Number(editEmployee.salary) || 0,
        intakeRate: Number(editEmployee.intakeRate) || 0,
        executionRate: Number(editEmployee.executionRate) || 0,
        deliveryRate: Number(editEmployee.deliveryRate) || 0,
      });

      await refreshEmployees();
      setIsEditDialogOpen(false);
      toast.success('Сотрудник обновлен');
    } catch (error) {
      toast.error('Не удалось обновить сотрудника');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Сотрудник',
      flex: 1,
      minWidth: 260,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <Avatar sx={{ ...employeeAvatarSx, mr: 2 }}>
            {getEmployeeInitials(params.row.name)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>{params.row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{params.row.position}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Роль',
      width: 150,
      renderCell: (params) => {
        const roleLabel = roleOptions.find((role) => role.value === params.value)?.label || params.value;
        return <Chip label={roleLabel} color="warning" size="small" />;
      },
    },
    {
      field: 'department',
      headerName: 'Отдел',
      width: 150,
    },
    {
      field: 'commission',
      headerName: 'Сделка, %',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">П:{params.row.intakeRate} / И:{params.row.executionRate} / В:{params.row.deliveryRate}</Typography>
      ),
    },
    {
      field: 'totalEarnings',
      headerName: 'Сдельно',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="success.main">{Number(params.value || 0).toLocaleString('ru-RU')} ₽</Typography>
      ),
    },
    {
      field: 'serviceProfit',
      headerName: 'Прибыль сервису',
      width: 170,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">
          {Number(params.value || 0).toLocaleString('ru-RU')} ₽
        </Typography>
      ),
    },
    {
      field: 'completedOrders',
      headerName: 'Исполнено',
      width: 120,
      renderCell: (params) => <Chip label={params.value} color="success" size="small" />,
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => { setSelectedEmployee(params.row); setIsViewDialogOpen(true); }}><Visibility /></IconButton>
          <IconButton size="small" onClick={() => openWorkDialog(params.row)}><CalendarMonth /></IconButton>
          <IconButton size="small" onClick={() => openEditDialog(params.row)}><Edit /></IconButton>
          <IconButton
            size="small"
            onClick={async () => {
              try {
                await employeeService.deleteEmployee(params.row.id);
                await refreshEmployees();
                toast.success('Сотрудник удален');
              } catch {
                toast.error('Не удалось удалить сотрудника');
              }
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', letterSpacing: 1.4 }}>CRM · КОМАНДА</Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 1.5, color: 'common.white' }}>Сотрудники НЭК Сервис</Typography>
        <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)' }}>
          Управление сотрудниками, ролями, отделами и производительностью. Здесь настраиваются проценты за прием, исполнение и выдачу заказа.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {[
          { title: 'Сотрудников', value: String(stats.totalEmployees), icon: <Person /> },
          { title: 'Активных', value: String(stats.activeEmployees), icon: <Work /> },
          { title: 'Средний рейтинг', value: stats.averageRating.toFixed(1), icon: <Star /> },
          { title: 'Сдельный фонд', value: `${stats.totalPiecework.toLocaleString('ru-RU')} ₽`, icon: <TrendingUp /> },
        ].map((item) => (
          <Grid item xs={12} sm={6} xl={3} key={item.title}>
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card sx={{ ...panelCardSx, height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" color="text.secondary">{item.title}</Typography>
                      <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>{item.value}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(234, 88, 12, 0.12)', color: 'primary.main' }}>{item.icon}</Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Card sx={panelCardSx}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={sectionTitleSx}>График сотрудников</Typography>
              <Typography variant="body2" color="text.secondary">
                Нажмите на день в строке сотрудника, чтобы назначить смену, выходной или задачу.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Tooltip title="Предыдущий месяц">
                <IconButton
                  color="primary"
                  onClick={() => moveScheduleMonth(-1)}
                  sx={{ width: 48, height: 48, border: '1px solid', borderColor: 'primary.light', borderRadius: 1.5 }}
                >
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
                <DatePicker
                  views={['year', 'month']}
                  openTo="month"
                  label="Месяц"
                  value={dayjs(`${scheduleMonth}-01`)}
                  onChange={(value) => {
                    if (value?.isValid()) {
                      setScheduleMonth(value.format('YYYY-MM'));
                    }
                  }}
                  renderInput={(params) => <TextField {...params} sx={{ minWidth: { xs: '100%', sm: 190 } }} />}
                />
              </LocalizationProvider>
              <Tooltip title="Следующий месяц">
                <IconButton
                  color="primary"
                  onClick={() => moveScheduleMonth(1)}
                  sx={{ width: 48, height: 48, border: '1px solid', borderColor: 'primary.light', borderRadius: 1.5 }}
                >
                  <ChevronRight />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<Assignment />}
                onClick={() => {
                  setTaskForm(emptyTaskForm);
                  setQuickTaskDate(toDateKey(new Date()));
                  setIsQuickTaskDialogOpen(true);
                }}
              >
                Поставить задачу
              </Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setIsAddDialogOpen(true)}>Добавить сотрудника</Button>
            </Stack>
          </Stack>

          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 560, overflowX: 'hidden' }}>
            <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: scheduleEmployeeColumnWidth, maxWidth: scheduleEmployeeColumnWidth, fontWeight: 800, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>Сотрудник</TableCell>
                  {scheduleMonthDates.map((date) => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <TableCell
                        key={toDateKey(date)}
                        align="center"
                        sx={{
                          width: scheduleDayColumnWidth,
                          maxWidth: scheduleDayColumnWidth,
                          fontWeight: 800,
                          px: 0.15,
                          bgcolor: isWeekend ? 'rgba(234, 88, 12, 0.08)' : 'background.paper',
                        }}
                      >
                        <Typography variant="caption" fontWeight={800} sx={{ lineHeight: 1, color: isWeekend ? 'primary.main' : 'text.primary' }}>
                          {date.toLocaleDateString('ru-RU', { day: '2-digit' })}
                        </Typography>
                        <Typography variant="caption" color={isWeekend ? 'primary.main' : 'text.secondary'} display="block" sx={{ fontSize: 10, lineHeight: 1 }}>
                          {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeScheduleEmployees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell sx={{ width: scheduleEmployeeColumnWidth, maxWidth: scheduleEmployeeColumnWidth, position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', py: 0.6 }}>
                      <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                        <Avatar sx={{ ...employeeAvatarSx, width: 34, height: 34, fontSize: 14, flex: '0 0 auto' }}>{getEmployeeInitials(employee.name)}</Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap sx={{ maxWidth: 138, lineHeight: 1.2 }}>{employee.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 138, lineHeight: 1.2 }}>{employee.position || employee.department}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    {scheduleMonthDates.map((date) => {
                      const dateKey = toDateKey(date);
                      const entry = scheduleByEmployeeAndDate.get(`${employee.id}_${dateKey}`);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <TableCell
                          key={`${employee.id}_${dateKey}`}
                          align="center"
                          onClick={() => entry && openScheduleDay(employee, dateKey)}
                          sx={{
                            cursor: 'pointer',
                            width: scheduleDayColumnWidth,
                            maxWidth: scheduleDayColumnWidth,
                            px: 0.1,
                            py: 0.65,
                            bgcolor: entry?.isDayOff
                              ? 'rgba(220, 38, 38, 0.05)'
                              : entry
                                ? 'rgba(21, 128, 61, 0.06)'
                                : isWeekend
                                  ? 'rgba(234, 88, 12, 0.04)'
                                  : 'transparent',
                            '&:hover': { bgcolor: 'rgba(234, 88, 12, 0.08)' },
                          }}
                        >
                          {entry ? (
                            <Box>
                              <Chip
                                size="small"
                                color={entry.isDayOff ? 'default' : 'success'}
                                label={entry.isDayOff ? 'В' : `${entry.startTime.slice(0, 2)}-${entry.endTime.slice(0, 2)}`}
                                sx={{ height: 20, minWidth: 34, '& .MuiChip-label': { px: 0.55, fontSize: 10, fontWeight: 800 } }}
                              />
                              {entry.location && (
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {entry.location}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <IconButton
                              size="small"
                              sx={{ width: 24, height: 24 }}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCreateDefaultShift(employee, dateKey);
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {activeScheduleEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={scheduleMonthDates.length + 1}>
                      <Typography color="text.secondary">Добавьте активных сотрудников, чтобы составить график.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ width: scheduleEmployeeColumnWidth, maxWidth: scheduleEmployeeColumnWidth, position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', py: 1 }}>
                    <FormControl fullWidth size="small" disabled={scheduleRosterCandidates.length === 0}>
                      <InputLabel>Сотрудник</InputLabel>
                      <Select
                        value={scheduleRosterEmployeeId}
                        label="Сотрудник"
                        onChange={(event) => setScheduleRosterEmployeeId(event.target.value)}
                      >
                        {scheduleRosterCandidates.map((employee) => (
                          <MenuItem key={employee.id} value={employee.id}>{employee.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell colSpan={scheduleMonthDates.length} sx={{ py: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={handleAddRosterEmployee}
                      disabled={!scheduleRosterEmployeeId}
                    >
                      Добавить существующего сотрудника в график
                    </Button>
                    {scheduleRosterCandidates.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        Все сотрудники уже показаны в этом месяце
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={4}>
          <Card sx={{ ...panelCardSx, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" sx={sectionTitleSx}>Лучшие по сделке</Typography>
              <Stack spacing={2.25} sx={{ mt: 3 }}>
                {topPerformers.map((employee) => (
                  <Box key={employee.id} display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={employeeAvatarSx}>{getEmployeeInitials(employee.name)}</Avatar>
                      <Box>
                        <Typography fontWeight={700}>{employee.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{employee.position}</Typography>
                      </Box>
                    </Box>
                    <Box textAlign="right">
                      <Typography fontWeight={700}>{employee.totalEarnings.toLocaleString('ru-RU')} ₽</Typography>
                      <Typography variant="body2" color="text.secondary">И:{employee.executionRate}% П:{employee.intakeRate}% В:{employee.deliveryRate}%</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} xl={8}>
          <Card sx={toolbarCardSx}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField fullWidth placeholder="Поиск по имени, email или должности" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Роль</InputLabel>
                    <Select value={filterRole} label="Роль" onChange={(event) => setFilterRole(event.target.value)}>
                      <MenuItem value="all">Все</MenuItem>
                      {roleOptions.map((role) => (<MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select value={filterStatus} label="Статус" onChange={(event) => setFilterStatus(event.target.value)}>
                      <MenuItem value="all">Все</MenuItem>
                      <MenuItem value="active">Активные</MenuItem>
                      <MenuItem value="inactive">Неактивные</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <PeriodFilter value={periodFilter} onChange={setPeriodFilter} />
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearchTerm('');
                      setFilterRole('all');
                      setFilterStatus('all');
                      setPeriodFilter(defaultPeriodFilterValue('month'));
                    }}
                  >
                    Сбросить
                  </Button>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button fullWidth variant="outlined" onClick={() => setIsDirectoryDialogOpen(true)}>Справочники</Button>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button fullWidth variant="contained" startIcon={<Add />} onClick={() => setIsAddDialogOpen(true)}>Добавить сотрудника</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ ...panelCardSx, mt: 3 }}>
            <CardContent>
              <Box sx={{ height: 560, width: '100%' }}>
                <DataGrid
                  rows={filteredEmployees}
                  columns={columns}
                  pageSize={rowsPerPage}
                  rowsPerPageOptions={gridPageSizeOptions}
                  onPageSizeChange={(value) => {
                    setRowsPerPage(value);
                    localStorage.setItem(EMPLOYEES_GRID_PAGE_SIZE_KEY, String(value));
                  }}
                  disableSelectionOnClick
                  onRowDoubleClick={(params) => openEditDialog(params.row as Employee)}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnSeparator': {
                      display: 'none',
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={isQuickTaskDialogOpen} onClose={() => setIsQuickTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Поставить задачу</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Сотрудник</InputLabel>
                <Select value={quickTaskEmployeeId} label="Сотрудник" onChange={(event) => setQuickTaskEmployeeId(event.target.value)}>
                  {activeScheduleEmployees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>{employee.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="День"
                InputLabelProps={{ shrink: true }}
                value={quickTaskDate}
                onChange={(event) => setQuickTaskDate(event.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Задача" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Описание" value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select value={taskForm.priority} label="Приоритет" onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value as EmployeeTask['priority'] }))}>
                  {Object.entries(taskPriorityLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select value={taskForm.status} label="Статус" onChange={(event) => setTaskForm((prev) => ({ ...prev, status: event.target.value as EmployeeTaskStatus }))}>
                  {Object.entries(taskStatusLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsQuickTaskDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSaveQuickTask}>Поставить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Новый сотрудник</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="ФИО" value={newEmployee.name} onChange={(event) => setNewEmployee((prev) => ({ ...prev, name: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Email (необязательно)" value={newEmployee.email} onChange={(event) => setNewEmployee((prev) => ({ ...prev, email: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Телефон" value={newEmployee.phone} onChange={(event) => setNewEmployee((prev) => ({ ...prev, phone: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Логин для входа" value={newEmployee.loginEmail} onChange={(event) => setNewEmployee((prev) => ({ ...prev, loginEmail: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Пароль" value={newEmployee.password} onChange={(event) => setNewEmployee((prev) => ({ ...prev, password: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Роль</InputLabel>
                <Select value={newEmployee.role} label="Роль" onChange={(event) => setNewEmployee((prev) => ({ ...prev, role: event.target.value }))}>{roleOptions.map((role) => <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Должность</InputLabel>
                <Select value={newEmployee.position} label="Должность" onChange={(event) => setNewEmployee((prev) => ({ ...prev, position: event.target.value }))}>{positionNodes.map((position) => <MenuItem key={position.id} value={position.name}>{position.name}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Отдел</InputLabel>
                <Select value={newEmployee.department} label="Отдел" onChange={(event) => setNewEmployee((prev) => ({ ...prev, department: event.target.value }))}>{departmentNodes.map((department) => <MenuItem key={department.id} value={department.name}>{department.name}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}><Typography variant="subtitle1" sx={{ mb: 1 }}>Сдельные проценты по заказу</Typography></Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ px: 1 }}>
                <Typography>Разрешить вход в CRM</Typography>
                <Switch checked={newEmployee.canLogin} onChange={(event) => setNewEmployee((prev) => ({ ...prev, canLogin: event.target.checked }))} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Приемка, %" type="number" value={newEmployee.intakeRate} onChange={(event) => setNewEmployee((prev) => ({ ...prev, intakeRate: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Исполнение, %" type="number" value={newEmployee.executionRate} onChange={(event) => setNewEmployee((prev) => ({ ...prev, executionRate: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Выдача, %" type="number" value={newEmployee.deliveryRate} onChange={(event) => setNewEmployee((prev) => ({ ...prev, deliveryRate: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Базовый оклад (необязательно)" type="number" value={newEmployee.salary} onChange={(event) => setNewEmployee((prev) => ({ ...prev, salary: event.target.value }))} InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateEmployee}>Добавить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Редактирование сотрудника</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="ФИО" value={editEmployee.name} onChange={(event) => setEditEmployee((prev) => ({ ...prev, name: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Email (необязательно)" value={editEmployee.email} onChange={(event) => setEditEmployee((prev) => ({ ...prev, email: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Телефон" value={editEmployee.phone} onChange={(event) => setEditEmployee((prev) => ({ ...prev, phone: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Логин для входа" value={editEmployee.loginEmail} onChange={(event) => setEditEmployee((prev) => ({ ...prev, loginEmail: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Пароль" value={editEmployee.password} onChange={(event) => setEditEmployee((prev) => ({ ...prev, password: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Роль</InputLabel>
                <Select value={editEmployee.role} label="Роль" onChange={(event) => setEditEmployee((prev) => ({ ...prev, role: event.target.value }))}>{roleOptions.map((role) => <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Должность</InputLabel>
                <Select value={editEmployee.position} label="Должность" onChange={(event) => setEditEmployee((prev) => ({ ...prev, position: event.target.value }))}>{positionNodes.map((position) => <MenuItem key={position.id} value={position.name}>{position.name}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Отдел</InputLabel>
                <Select value={editEmployee.department} label="Отдел" onChange={(event) => setEditEmployee((prev) => ({ ...prev, department: event.target.value }))}>{departmentNodes.map((department) => <MenuItem key={department.id} value={department.name}>{department.name}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}><Typography variant="subtitle1" sx={{ mb: 1 }}>Сдельные проценты по заказу</Typography></Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ px: 1 }}>
                <Typography>Разрешить вход в CRM</Typography>
                <Switch checked={editEmployee.canLogin} onChange={(event) => setEditEmployee((prev) => ({ ...prev, canLogin: event.target.checked }))} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Приемка, %" type="number" value={editEmployee.intakeRate} onChange={(event) => setEditEmployee((prev) => ({ ...prev, intakeRate: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Исполнение, %" type="number" value={editEmployee.executionRate} onChange={(event) => setEditEmployee((prev) => ({ ...prev, executionRate: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Выдача, %" type="number" value={editEmployee.deliveryRate} onChange={(event) => setEditEmployee((prev) => ({ ...prev, deliveryRate: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Базовый оклад (необязательно)" type="number" value={editEmployee.salary} onChange={(event) => setEditEmployee((prev) => ({ ...prev, salary: event.target.value }))} InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleUpdateEmployee}>Сохранить</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={isDirectoryDialogOpen} onClose={() => setIsDirectoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Справочники сотрудников</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Отделы</Typography>
              <Box display="flex" gap={1} mb={2}>
                <TextField fullWidth label="Новый отдел" value={newDepartmentName} onChange={(event) => setNewDepartmentName(event.target.value)} />
                <Button variant="contained" onClick={handleCreateDepartment}>Добавить</Button>
              </Box>
              <Box display="grid" gap={1}>
                {departmentNodes.map((node) => (
                  <Box key={node.id} display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography>{node.name}</Typography>
                    <IconButton size="small" onClick={() => handleDeleteDepartment(node)}><Delete fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Должности</Typography>
              <Box display="flex" gap={1} mb={2}>
                <TextField fullWidth label="Новая должность" value={newPositionName} onChange={(event) => setNewPositionName(event.target.value)} />
                <Button variant="contained" onClick={handleCreatePosition}>Добавить</Button>
              </Box>
              <Box display="grid" gap={1}>
                {positionNodes.map((node) => (
                  <Box key={node.id} display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography>{node.name}</Typography>
                    <IconButton size="small" onClick={() => handleDeletePosition(node)}><Delete fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDirectoryDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isWorkDialogOpen} onClose={() => setIsWorkDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={sectionTitleSx}>
          График и задачи{selectedEmployee ? `: ${selectedEmployee.name}` : ''}
        </DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={5}>
                <Card sx={panelCardSx}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>График работы</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth type="date" label="Дата" InputLabelProps={{ shrink: true }} value={scheduleForm.date} onChange={(event) => setScheduleForm((prev) => ({ ...prev, date: event.target.value }))} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth type="time" label="Начало" InputLabelProps={{ shrink: true }} value={scheduleForm.startTime} onChange={(event) => setScheduleForm((prev) => ({ ...prev, startTime: event.target.value }))} disabled={scheduleForm.isDayOff} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth type="time" label="Конец" InputLabelProps={{ shrink: true }} value={scheduleForm.endTime} onChange={(event) => setScheduleForm((prev) => ({ ...prev, endTime: event.target.value }))} disabled={scheduleForm.isDayOff} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth label="Локация" value={scheduleForm.location} onChange={(event) => setScheduleForm((prev) => ({ ...prev, location: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth multiline minRows={2} label="Комментарий" value={scheduleForm.note} onChange={(event) => setScheduleForm((prev) => ({ ...prev, note: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography>Выходной день</Typography>
                          <Switch checked={scheduleForm.isDayOff} onChange={(event) => setScheduleForm((prev) => ({ ...prev, isDayOff: event.target.checked }))} />
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Button fullWidth variant="contained" startIcon={<CalendarMonth />} onClick={handleSaveSchedule}>
                          {scheduleForm.id ? 'Сохранить смену' : 'Добавить смену'}
                        </Button>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={1.25}>
                      {selectedSchedule.length === 0 && <Typography color="text.secondary">График пока не заполнен.</Typography>}
                      {selectedSchedule.map((entry) => (
                        <Box key={entry.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Box>
                              <Typography fontWeight={800}>{new Date(entry.date).toLocaleDateString('ru-RU')}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {entry.isDayOff ? 'Выходной' : `${entry.startTime}-${entry.endTime}`}{entry.location ? ` · ${entry.location}` : ''}
                              </Typography>
                              {entry.note && <Typography variant="body2">{entry.note}</Typography>}
                            </Box>
                            <Box>
                              <IconButton size="small" onClick={() => setScheduleForm({ ...emptyScheduleForm, ...entry })}><Edit fontSize="small" /></IconButton>
                              <IconButton size="small" onClick={async () => { await employeeWorkService.deleteScheduleEntry(entry.id); await refreshEmployees(); }}><Delete fontSize="small" /></IconButton>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={7}>
                <Card sx={panelCardSx}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Задачи сотрудника</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Задача" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField fullWidth type="date" label="Срок" InputLabelProps={{ shrink: true }} value={taskForm.dueDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth multiline minRows={2} label="Описание" value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>Приоритет</InputLabel>
                          <Select value={taskForm.priority} label="Приоритет" onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value as EmployeeTask['priority'] }))}>
                            {Object.entries(taskPriorityLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>Статус</InputLabel>
                          <Select value={taskForm.status} label="Статус" onChange={(event) => setTaskForm((prev) => ({ ...prev, status: event.target.value as EmployeeTaskStatus }))}>
                            {Object.entries(taskStatusLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label="Прогресс, %" value={taskForm.progress} onChange={(event) => setTaskForm((prev) => ({ ...prev, progress: event.target.value }))} inputProps={{ min: 0, max: 100 }} />
                      </Grid>
                      <Grid item xs={12}>
                        <Button fullWidth variant="contained" startIcon={<Assignment />} onClick={handleSaveTask}>
                          {taskForm.id ? 'Сохранить задачу' : 'Поставить задачу'}
                        </Button>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={1.25}>
                      {selectedTasks.length === 0 && <Typography color="text.secondary">Задач пока нет.</Typography>}
                      {selectedTasks.map((task) => (
                        <Box key={task.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Typography fontWeight={800}>{task.title}</Typography>
                                <Chip size="small" label={taskPriorityLabels[task.priority]} color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'} />
                                <Chip size="small" label={taskStatusLabels[task.status]} color={task.status === 'done' ? 'success' : task.status === 'blocked' ? 'error' : 'primary'} variant="outlined" />
                              </Stack>
                              {task.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{task.description}</Typography>}
                              {task.dueDate && <Typography variant="caption" color="text.secondary">Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}</Typography>}
                              <Box sx={{ mt: 1.25 }}>
                                <LinearProgress variant="determinate" value={task.progress} sx={{ height: 7, borderRadius: 2 }} />
                                <Typography variant="caption">{task.progress}%</Typography>
                              </Box>
                            </Box>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <IconButton size="small" onClick={() => setTaskForm({ ...emptyTaskForm, ...task, progress: String(task.progress) })}><Edit fontSize="small" /></IconButton>
                              <IconButton size="small" onClick={() => handleTaskProgressChange(task, task.status === 'done' ? 'in_progress' : 'done', task.status === 'done' ? 50 : 100)}><Assignment fontSize="small" /></IconButton>
                              <IconButton size="small" onClick={async () => { await employeeWorkService.deleteTask(task.id); await refreshEmployees(); }}><Delete fontSize="small" /></IconButton>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsWorkDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Информация о сотруднике</DialogTitle>
        <DialogContent>
          {selectedEmployee && (() => {
            const employee = employeesWithMetrics.find((item) => item.id === selectedEmployee.id) || (selectedEmployee as EmployeeWithMetrics);
            const roleLabel = roleOptions.find((role) => role.value === employee.role)?.label || employee.role;

            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ ...employeeAvatarSx, mr: 2, width: 56, height: 56, fontSize: '1.2rem' }}>
                      {getEmployeeInitials(employee.name)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{employee.name}</Typography>
                      <Typography color="text.secondary">{employee.position}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Email</Typography><Typography>{employee.email}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Телефон</Typography><Typography>{employee.phone}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Логин</Typography><Typography>{employee.loginEmail || employee.email}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Доступ в CRM</Typography><Typography>{employee.canLogin !== false ? 'Разрешен' : 'Отключен'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Роль</Typography><Chip label={roleLabel} color="primary" size="small" /></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Отдел</Typography><Typography>{employee.department}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Рейтинг</Typography><Box display="flex" alignItems="center"><Star sx={{ color: 'gold', fontSize: 16, mr: 0.5 }} /><Typography>{employee.rating}</Typography></Box></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Сдельный доход</Typography><Typography fontWeight={700}>{employee.totalEarnings.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Выручка сервису</Typography><Typography fontWeight={700}>{employee.serviceRevenue.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Прибыль сервису</Typography><Typography fontWeight={700}>{employee.serviceProfit.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Проценты по заказу</Typography><Typography fontWeight={700}>Приемка: {employee.intakeRate}% • Исполнение: {employee.executionRate}% • Выдача: {employee.deliveryRate}%</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Принял заказов</Typography><Typography fontWeight={700}>{employee.orderStats?.intakeOrders || 0}</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Исполнил заказов</Typography><Typography fontWeight={700}>{employee.orderStats?.executionOrders || 0}</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Выдал заказов</Typography><Typography fontWeight={700}>{employee.orderStats?.deliveryOrders || 0}</Typography></Grid>
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Дата найма</Typography><Typography>{employee.hireDate.toLocaleDateString('ru-RU')}</Typography></Grid>
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Employees;
