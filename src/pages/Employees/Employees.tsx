import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  Tab,
  Tabs,
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
  AdminPanelSettings,
  Assignment,
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Delete,
  Edit,
  FilterList,
  Person,
  PersonRemove,
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
import { AppSettings, Employee, EmployeeScheduleEntry, EmployeeScheduleRosterEntry, EmployeeTask, EmployeeTaskStatus, Order, TaxonomyNode } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useCompanyName } from '../../hooks/useCompanyName';
import { employeeService } from '../../services/employeeService';
import { employeeWorkService, formatScheduleSlotLabel, normalizeScheduleTime } from '../../services/employeeWorkService';
import { orderService } from '../../services/orderService';
import { taxonomyService } from '../../services/taxonomyService';
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter';
import { dataGridSx, heroCardSx, pageShellSx, panelCardSx, sectionTitleSx, toolbarCardSx } from '../../styles/ui';
import { defaultPeriodFilterValue, isDateWithinRange, PeriodFilterValue } from '../../utils/dateRange';
import {
  getEmployeeOrderEarnings,
  getOrderPartsCost,
  getOrderTotal,
  isOrderDeliveryManager,
  isOrderIntakeManager,
  isOrderTechnician,
} from '../../utils/orderMetrics';
import {
  CRM_MODULE_OPTIONS,
  employeeNeedsAccessSettings,
  normalizeAllowedModules,
} from '../../utils/employeeModuleAccess';
import {
  normalizeSelfEditableFields,
  normalizeVisibleSections,
  SELF_EDITABLE_FIELD_OPTIONS,
  SETTINGS_SECTION_OPTIONS,
} from '../../utils/employeeSettingsAccess';
import EmployeeAccessSettings, {
  createDefaultEmployeeAccessFormState,
  EmployeeAccessFormState,
} from '../../components/EmployeeAccessSettings/EmployeeAccessSettings';

const ROLE_OPTIONS: Array<{ value: Employee['role']; label: string }> = [
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
  role: 'manager' as Employee['role'],
  position: '',
  department: '',
  salary: '',
  intakeRate: '0',
  executionRate: '0',
  deliveryRate: '0',
  ...createDefaultEmployeeAccessFormState(),
};

type EmployeeFormState = typeof emptyEmployee;

const buildEmployeeAccessPayload = (form: EmployeeAccessFormState) => ({
  allowedModules: normalizeAllowedModules(form.allowedModules),
  visibleSections: normalizeVisibleSections(form.visibleSections),
  selfEditableFields: normalizeSelfEditableFields(form.selfEditableFields),
});

const employeeToAccessForm = (employee: Employee): EmployeeAccessFormState => ({
  allowedModules: normalizeAllowedModules(employee.access?.allowedModules),
  visibleSections: normalizeVisibleSections(employee.access?.visibleSections),
  selfEditableFields: normalizeSelfEditableFields(employee.access?.selfEditableFields),
});

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
const SCHEDULE_LOCATION_KEY = 'employees_schedule_location_v1';
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
  const { user: currentUser, refreshUser } = useAuth();
  const companyName = useCompanyName();
  const isAdmin = currentUser?.role === 'admin';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [accessForm, setAccessForm] = useState<EmployeeAccessFormState>(createDefaultEmployeeAccessFormState());
  const [addDialogTab, setAddDialogTab] = useState(0);
  const [editDialogTab, setEditDialogTab] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  const [isQuickTaskDialogOpen, setIsQuickTaskDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(() => defaultPeriodFilterValue('month'));
  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [positionNodes, setPositionNodes] = useState<TaxonomyNode[]>([]);
  const [newPositionName, setNewPositionName] = useState('');
  const [newEmployee, setNewEmployee] = useState<EmployeeFormState>(emptyEmployee);
  const [editEmployee, setEditEmployee] = useState<EmployeeFormState>(emptyEmployee);
  const [scheduleEntries, setScheduleEntries] = useState<EmployeeScheduleEntry[]>([]);
  const [pendingScheduleKeys, setPendingScheduleKeys] = useState<Set<string>>(() => new Set());
  const [scheduleRosterEntries, setScheduleRosterEntries] = useState<EmployeeScheduleRosterEntry[]>([]);
  const [scheduleRosterHiddenEntries, setScheduleRosterHiddenEntries] = useState<EmployeeScheduleRosterEntry[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [quickTaskEmployeeId, setQuickTaskEmployeeId] = useState('');
  const [quickTaskDate, setQuickTaskDate] = useState(() => toDateKey(new Date()));
  const [scheduleRosterEmployeeId, setScheduleRosterEmployeeId] = useState('');
  const [scheduleMonth, setScheduleMonth] = useState(() => toMonthKey(new Date()));
  const [scheduleLocation, setScheduleLocation] = useState(
    () => localStorage.getItem(SCHEDULE_LOCATION_KEY) || ''
  );
  const [rowsPerPage, setRowsPerPage] = useState(() => getSavedGridPageSize(EMPLOYEES_GRID_PAGE_SIZE_KEY));

  const refreshEmployees = async () => {
    await taxonomyService.refreshFromApi();
    await employeeService.refreshFromApi();
    const workSettings = await employeeWorkService.refresh();
    setEmployeesData(employeeService.getEmployees());
    setPositionNodes(taxonomyService.getRoots('employee_positions'));
    setScheduleEntries(workSettings.employeeWork.schedules);
    setScheduleRosterEntries(workSettings.employeeWork.rosterEntries);
    setScheduleRosterHiddenEntries(workSettings.employeeWork.rosterHiddenEntries || []);
    setEmployeeTasks(workSettings.employeeWork.tasks);
    setOrdersData(await orderService.getOrders());
  };

  const applyWorkSettings = (settings: AppSettings) => {
    setScheduleEntries(settings.employeeWork.schedules);
    setScheduleRosterEntries(settings.employeeWork.rosterEntries);
    setScheduleRosterHiddenEntries(settings.employeeWork.rosterHiddenEntries || []);
    setEmployeeTasks(settings.employeeWork.tasks);
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
    () =>
      employeesData.map((employee) => {
        let intakeOrders = 0;
        let executionOrders = 0;
        let deliveryOrders = 0;
        let pieceworkEarnings = 0;
        let serviceProfit = 0;
        let serviceRevenue = 0;

        ordersData.forEach((order) => {
          const status = String(order.status || '').toLowerCase();
          if (status === 'cancelled' || status === 'canceled') {
            return;
          }

          const paidAmount = paidAmountByOrder(order);
          const hasPaidInPeriod = paidAmount > 0;
          const orderInPeriod = isDateWithinRange(order.createdAt, periodFilter);
          const inPeriod = orderInPeriod || hasPaidInPeriod;
          if (!inPeriod) {
            return;
          }

          const isIntake = isOrderIntakeManager(order, employee);
          const isExecutor = isOrderTechnician(order, employee);
          const isDelivery = isOrderDeliveryManager(order, employee);
          const isInvolved = isIntake || isExecutor || isDelivery;
          if (!isInvolved) {
            return;
          }

          if (isIntake) {
            intakeOrders += 1;
          }
          if (isExecutor) {
            executionOrders += 1;
          }
          if (isDelivery) {
            deliveryOrders += 1;
          }

          // Как в карточке заказа: полная маржа × %, без урезания по оплате
          const employeeCommission = getEmployeeOrderEarnings(order, employee);
          pieceworkEarnings += employeeCommission;

          if (!hasPaidInPeriod) {
            return;
          }

          const orderTotal = getOrderTotal(order);
          const ratio = orderTotal > 0 ? Math.min(paidAmount / orderTotal, 1) : 1;
          const partsCost = getOrderPartsCost(order) * ratio;
          const orderMargin = Math.max(paidAmount - partsCost, 0);
          const paidCommission = Math.min(employeeCommission * ratio, orderMargin);

          serviceRevenue += paidAmount;
          serviceProfit += Math.max(orderMargin - paidCommission, 0);
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
      }),
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

        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'active' && employee.isActive) ||
          (filterStatus === 'inactive' && !employee.isActive);

        return matchesSearch && matchesStatus;
      }),
    [employeesWithMetrics, filterStatus, searchTerm]
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
    const monthRosterIds = new Set(
      scheduleRosterEntries.filter((entry) => entry.month === scheduleMonth).map((entry) => entry.employeeId)
    );
    const monthHiddenIds = new Set(
      scheduleRosterHiddenEntries.filter((entry) => entry.month === scheduleMonth).map((entry) => entry.employeeId)
    );
    return employeesWithMetrics.filter(
      (employee) =>
        !monthHiddenIds.has(employee.id) && (employee.isActive || monthRosterIds.has(employee.id))
    );
  }, [employeesWithMetrics, scheduleMonth, scheduleRosterEntries, scheduleRosterHiddenEntries]);

  const scheduleLocationOptions = employeeWorkService.getSettings().locations.items.filter(Boolean);

  useEffect(() => {
    if (scheduleLocationOptions.length === 0) {
      return;
    }
    if (scheduleLocationOptions.includes(scheduleLocation)) {
      return;
    }
    const next = scheduleLocationOptions[0];
    setScheduleLocation(next);
    localStorage.setItem(SCHEDULE_LOCATION_KEY, next);
  }, [scheduleLocationOptions, scheduleLocation]);

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

  const scheduleEmployeeColumnWidth = 248;
  const scheduleDayColumnWidth = useMemo(
    () => `calc((100% - ${scheduleEmployeeColumnWidth}px) / ${Math.max(scheduleMonthDates.length, 1)})`,
    [scheduleMonthDates.length]
  );

  const getDefaultScheduleForm = (date = toDateKey(new Date())) => {
    const { employees, locations } = employeeWorkService.getSettings();
    const defaultLocation =
      (scheduleLocation && locations.items.includes(scheduleLocation) ? scheduleLocation : '') ||
      locations.items[0] ||
      '';

    return {
      ...emptyScheduleForm,
      date,
      startTime: employees.defaultWorkStartTime || emptyScheduleForm.startTime,
      endTime: employees.defaultWorkEndTime || emptyScheduleForm.endTime,
      location: defaultLocation,
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
    const defaults = getDefaultScheduleForm(dateKey);
    setSelectedEmployee(employee);
    setTaskForm(emptyTaskForm);
    setScheduleForm(
      entry
        ? {
            ...defaults,
            ...entry,
            startTime: normalizeScheduleTime(entry.startTime, defaults.startTime),
            endTime: normalizeScheduleTime(entry.endTime, defaults.endTime),
          }
        : defaults
    );
    setIsWorkDialogOpen(true);
  };

  const handleCreateDefaultShift = async (employee: Employee, dateKey: string) => {
    const cellKey = `${employee.id}_${dateKey}`;
    if (pendingScheduleKeys.has(cellKey) || scheduleByEmployeeAndDate.has(cellKey)) {
      return;
    }

    const { employees, locations } = employeeWorkService.getSettings();
    const startTime = employees.defaultWorkStartTime || '10:00';
    const endTime = employees.defaultWorkEndTime || '19:00';
    const location =
      (scheduleLocation && locations.items.includes(scheduleLocation) ? scheduleLocation : '') ||
      locations.items[0] ||
      '';
    const peerEmployeeIds = activeScheduleEmployees
      .map((item) => item.id)
      .filter((id) => id !== employee.id);
    const optimisticId = `schedule_${Date.now()}`;
    const optimisticEntry: EmployeeScheduleEntry = {
      id: optimisticId,
      employeeId: employee.id,
      date: dateKey,
      startTime,
      endTime,
      location,
      note: '',
      isDayOff: false,
      updatedAt: new Date().toISOString(),
    };
    const optimisticDayOffs: EmployeeScheduleEntry[] = peerEmployeeIds.map((employeeId, index) => ({
      id: `schedule_dayoff_${Date.now()}_${index}`,
      employeeId,
      date: dateKey,
      startTime,
      endTime,
      location,
      note: '',
      isDayOff: true,
      updatedAt: new Date().toISOString(),
    }));

    setPendingScheduleKeys((prev) => new Set(prev).add(cellKey));
    setScheduleEntries((prev) => [
      ...prev.filter(
        (entry) =>
          !(entry.date === dateKey && (entry.employeeId === employee.id || peerEmployeeIds.includes(entry.employeeId)))
      ),
      optimisticEntry,
      ...optimisticDayOffs,
    ]);

    try {
      const saved = await employeeWorkService.saveScheduleEntry(
        {
          employeeId: employee.id,
          date: dateKey,
          startTime,
          endTime,
          location,
          note: '',
          isDayOff: false,
        },
        { dayOffForEmployeeIds: peerEmployeeIds }
      );
      setScheduleEntries(saved.employeeWork.schedules);
    } catch {
      setScheduleEntries((prev) =>
        prev.filter(
          (entry) =>
            entry.id !== optimisticId && !optimisticDayOffs.some((dayOff) => dayOff.id === entry.id)
        )
      );
      toast.error('Не удалось добавить смену');
    } finally {
      setPendingScheduleKeys((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
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

    const updatedSettings = await employeeWorkService.addScheduleRosterEmployee(scheduleRosterEmployeeId, scheduleMonth);
    setScheduleRosterEmployeeId('');
    applyWorkSettings(updatedSettings);
    toast.success('Сотрудник добавлен в график месяца');
  };

  const handleRemoveFromSchedule = async (employee: Employee) => {
    const updatedSettings = await employeeWorkService.removeScheduleRosterEmployee(employee.id, scheduleMonth);
    applyWorkSettings(updatedSettings);
    toast.success(`${employee.name} убран из графика`);
  };

  const persistScheduleEntry = async (
    form: typeof emptyScheduleForm,
    options?: { successMessage?: string; resetForm?: boolean }
  ) => {
    if (!selectedEmployee) {
      return null;
    }
    if (!form.date) {
      toast.error('Укажите дату смены');
      return null;
    }

    setIsSavingSchedule(true);
    try {
      const dayOffForEmployeeIds = form.isDayOff
        ? undefined
        : activeScheduleEmployees.map((item) => item.id).filter((id) => id !== selectedEmployee.id);
      const saved = await employeeWorkService.saveScheduleEntry(
        {
          ...form,
          employeeId: selectedEmployee.id,
        },
        { dayOffForEmployeeIds }
      );
      applyWorkSettings(saved);
      const savedEntry = saved.employeeWork.schedules.find(
        (entry) => entry.employeeId === selectedEmployee.id && entry.date === form.date
      );
      if (savedEntry) {
        setScheduleForm({ ...getDefaultScheduleForm(form.date), ...savedEntry });
      } else if (options?.resetForm) {
        setScheduleForm(getDefaultScheduleForm());
      }
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return saved;
    } catch {
      toast.error('Не удалось сохранить график');
      return null;
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleScheduleDayOffChange = async (checked: boolean) => {
    if (!selectedEmployee || !scheduleForm.date) {
      toast.error('Укажите дату смены');
      return;
    }

    const previousForm = scheduleForm;
    const { employees } = employeeWorkService.getSettings();
    const defaultStart = employees.defaultWorkStartTime || '10:00';
    const defaultEnd = employees.defaultWorkEndTime || '19:00';
    const nextForm = {
      ...scheduleForm,
      isDayOff: checked,
      startTime: scheduleForm.startTime || defaultStart,
      endTime: scheduleForm.endTime || defaultEnd,
    };

    setScheduleForm(nextForm);

    const saved = await persistScheduleEntry(nextForm, {
      successMessage: checked ? 'Выходной сохранён, смена убрана' : 'Рабочий день восстановлен',
    });

    if (!saved) {
      setScheduleForm(previousForm);
    }
  };

  const handleScheduleFieldPersist = async (patch: Partial<typeof emptyScheduleForm>) => {
    if (!selectedEmployee || !scheduleForm.id || scheduleForm.isDayOff || isSavingSchedule) {
      return;
    }

    const nextForm = { ...scheduleForm, ...patch };
    setScheduleForm(nextForm);
    await persistScheduleEntry(nextForm, { successMessage: 'Смена обновлена' });
  };

  const handleSaveSchedule = async () => {
    if (!selectedEmployee) return;

    await persistScheduleEntry(scheduleForm, {
      successMessage: scheduleForm.isDayOff
        ? 'Выходной сохранён'
        : scheduleForm.id
          ? 'Смена обновлена'
          : 'Смена добавлена',
    });
  };

  const handleSaveTask = async () => {
    if (!selectedEmployee) return;
    if (!taskForm.title.trim()) {
      toast.error('Введите задачу');
      return;
    }

    const saved = await employeeWorkService.saveTask({
      ...taskForm,
      employeeId: selectedEmployee.id,
      title: taskForm.title.trim(),
      progress: Number(taskForm.progress) || 0,
    });
    setTaskForm(emptyTaskForm);
    applyWorkSettings(saved);
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

    const saved = await employeeWorkService.saveTask({
      ...taskForm,
      employeeId: quickTaskEmployeeId,
      title: taskForm.title.trim(),
      dueDate: quickTaskDate,
      progress: Number(taskForm.progress) || 0,
    });
    setTaskForm(emptyTaskForm);
    setIsQuickTaskDialogOpen(false);
    applyWorkSettings(saved);
    toast.success('Задача поставлена');
  };

  const handleTaskProgressChange = async (task: EmployeeTask, status: EmployeeTaskStatus, progress: number) => {
    const saved = await employeeWorkService.updateTaskProgress(task.id, status, progress);
    applyWorkSettings(saved);
  };

  const openAccessDialog = (employee: Employee) => {
    if (!employeeNeedsAccessSettings(employee)) {
      return;
    }
    setSelectedEmployee(employee);
    setAccessForm(employeeToAccessForm(employee));
    setIsAccessDialogOpen(true);
  };

  const handleSaveAccess = async () => {
    if (!selectedEmployee) return;

    try {
      await employeeService.updateEmployee(selectedEmployee.id, {
        access: buildEmployeeAccessPayload(accessForm),
      });
      await refreshEmployees();
      if (currentUser?.id === selectedEmployee.id) {
        await refreshUser();
      }
      setIsAccessDialogOpen(false);
      toast.success('Настройки доступа сохранены');
    } catch {
      toast.error('Не удалось сохранить настройки доступа');
    }
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
      ...employeeToAccessForm(employee),
    });
    setEditDialogTab(0);
    setIsEditDialogOpen(true);
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
    if (!newEmployee.name || !newEmployee.position) {
      toast.error('Заполните ФИО и должность');
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
        role: newEmployee.role,
        department: '',
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
        ...(isAdmin && employeeNeedsAccessSettings(newEmployee)
          ? { access: buildEmployeeAccessPayload(newEmployee) }
          : {}),
      });

      await refreshEmployees();
      setIsAddDialogOpen(false);
      setNewEmployee({ ...emptyEmployee, ...createDefaultEmployeeAccessFormState() });
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
        role: editEmployee.role,
        department: editEmployee.department,
        position: editEmployee.position,
        salary: Number(editEmployee.salary) || 0,
        intakeRate: Number(editEmployee.intakeRate) || 0,
        executionRate: Number(editEmployee.executionRate) || 0,
        deliveryRate: Number(editEmployee.deliveryRate) || 0,
        ...(isAdmin && employeeNeedsAccessSettings(editEmployee)
          ? { access: buildEmployeeAccessPayload(editEmployee) }
          : {}),
      });

      await refreshEmployees();
      if (currentUser?.id === selectedEmployee.id) {
        await refreshUser();
      }
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
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ ...employeeAvatarSx, mr: 1.5, width: 34, height: 34, fontSize: 14 }}>
            {getEmployeeInitials(params.row.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.position}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'commission',
      headerName: 'Сделка, %',
      flex: 1,
      minWidth: 108,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          П:{params.row.intakeRate} / И:{params.row.executionRate} / В:{params.row.deliveryRate}
        </Typography>
      ),
    },
    {
      field: 'totalEarnings',
      headerName: 'Сдельно',
      flex: 0.8,
      minWidth: 88,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="success.main" noWrap>
          {Number(params.value || 0).toLocaleString('ru-RU')} ₽
        </Typography>
      ),
    },
    {
      field: 'serviceProfit',
      headerName: 'Прибыль сервису',
      flex: 0.9,
      minWidth: 92,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="primary.main" noWrap>
          {Number(params.value || 0).toLocaleString('ru-RU')} ₽
        </Typography>
      ),
    },
    {
      field: 'completedOrders',
      headerName: 'Исполн.',
      flex: 0.6,
      minWidth: 72,
      renderCell: (params) => <Chip label={params.value} color="success" size="small" />,
    },
    {
      field: 'actions',
      headerName: 'Действия',
      flex: 0,
      minWidth: isAdmin ? 156 : 124,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', ml: -0.5 }}>
          <IconButton size="small" onClick={() => { setSelectedEmployee(params.row); setIsViewDialogOpen(true); }}><Visibility fontSize="small" /></IconButton>
          {isAdmin && employeeNeedsAccessSettings(params.row) && (
            <Tooltip title="Настройки доступа">
              <IconButton size="small" color="primary" onClick={() => openAccessDialog(params.row)}>
                <AdminPanelSettings fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => openWorkDialog(params.row)}><CalendarMonth fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => openEditDialog(params.row)}><Edit fontSize="small" /></IconButton>
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
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', letterSpacing: 1.4 }}>CRM · КОМАНДА</Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 1.5, color: 'common.white' }}>Сотрудники {companyName}</Typography>
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
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={sectionTitleSx}>График сотрудников</Typography>
              <Typography variant="body2" color="text.secondary">
                Нажмите на день в строке сотрудника, чтобы назначить смену, выходной или задачу.
              </Typography>
            </Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              flexWrap="wrap"
              useFlexGap
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  boxSizing: 'border-box',
                  borderRadius: 1.5,
                },
                '& .MuiButton-root': {
                  height: 40,
                  minHeight: 40,
                  boxSizing: 'border-box',
                  borderRadius: 1.5,
                  whiteSpace: 'nowrap',
                },
              }}
            >
              {scheduleLocationOptions.length > 0 && (
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 168 } }}>
                  <InputLabel id="schedule-location-label">Локация</InputLabel>
                  <Select
                    labelId="schedule-location-label"
                    label="Локация"
                    value={scheduleLocation}
                    displayEmpty
                    onChange={(event) => {
                      const value = event.target.value;
                      setScheduleLocation(value);
                      localStorage.setItem(SCHEDULE_LOCATION_KEY, value);
                    }}
                  >
                    {scheduleLocationOptions.map((locationName) => (
                      <MenuItem key={locationName} value={locationName}>
                        {locationName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Tooltip title="Предыдущий месяц">
                  <IconButton
                    color="primary"
                    onClick={() => moveScheduleMonth(-1)}
                    sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                  >
                    <ChevronLeft />
                  </IconButton>
                </Tooltip>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
                  <DatePicker
                    views={['year', 'month']}
                    openTo="month"
                    value={dayjs(`${scheduleMonth}-01`)}
                    onChange={(value) => {
                      if (value?.isValid()) {
                        setScheduleMonth(value.format('YYYY-MM'));
                      }
                    }}
                    renderInput={({ label: _label, ...params }) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Месяц"
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: { xs: 160, sm: 168 } }}
                      />
                    )}
                  />
                </LocalizationProvider>
                <Tooltip title="Следующий месяц">
                  <IconButton
                    color="primary"
                    onClick={() => moveScheduleMonth(1)}
                    sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                  >
                    <ChevronRight />
                  </IconButton>
                </Tooltip>
              </Stack>
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
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setAddDialogTab(0);
                  setIsAddDialogOpen(true);
                }}
              >
                Добавить сотрудника
              </Button>
            </Stack>
          </Stack>

          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 560, overflowX: 'auto' }}>
            <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: scheduleEmployeeColumnWidth + scheduleMonthDates.length * 36 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      width: scheduleEmployeeColumnWidth,
                      minWidth: scheduleEmployeeColumnWidth,
                      maxWidth: scheduleEmployeeColumnWidth,
                      fontWeight: 800,
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      bgcolor: 'background.paper',
                      py: 1,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    Сотрудник
                  </TableCell>
                  {scheduleMonthDates.map((date) => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <TableCell
                        key={toDateKey(date)}
                        align="center"
                        sx={{
                          width: scheduleDayColumnWidth,
                          minWidth: 36,
                          maxWidth: scheduleDayColumnWidth,
                          fontWeight: 800,
                          px: 0,
                          py: 0.75,
                          bgcolor: isWeekend ? 'rgba(234, 88, 12, 0.08)' : 'background.paper',
                        }}
                      >
                        <Typography variant="caption" fontWeight={800} sx={{ lineHeight: 1.15, display: 'block', color: isWeekend ? 'primary.main' : 'text.primary' }}>
                          {date.toLocaleDateString('ru-RU', { day: '2-digit' })}
                        </Typography>
                        <Typography variant="caption" color={isWeekend ? 'primary.main' : 'text.secondary'} display="block" sx={{ fontSize: 10, lineHeight: 1.1, textTransform: 'lowercase' }}>
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
                    <TableCell
                      sx={{
                        width: scheduleEmployeeColumnWidth,
                        minWidth: scheduleEmployeeColumnWidth,
                        maxWidth: scheduleEmployeeColumnWidth,
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        bgcolor: 'background.paper',
                        py: 0.75,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                        <Avatar sx={{ ...employeeAvatarSx, width: 32, height: 32, fontSize: 13, flex: '0 0 auto' }}>
                          {getEmployeeInitials(employee.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                          <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.25 }}>
                            {employee.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.2 }}>
                            {employee.position}
                          </Typography>
                        </Box>
                        <Tooltip title="Убрать из графика">
                          <IconButton
                            size="small"
                            color="error"
                            sx={{ flex: '0 0 auto', width: 28, height: 28 }}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRemoveFromSchedule(employee);
                            }}
                          >
                            <PersonRemove sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
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
                            minWidth: 36,
                            maxWidth: scheduleDayColumnWidth,
                            px: 0,
                            py: 0.5,
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
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                            {entry ? (
                              <Chip
                                size="small"
                                color={entry.isDayOff ? 'default' : 'success'}
                                label={
                                  entry.isDayOff
                                    ? 'В'
                                    : (() => {
                                        const start = normalizeScheduleTime(entry.startTime, '');
                                        const end = normalizeScheduleTime(entry.endTime, '');
                                        if (!start) return 'Смена';
                                        const s = start.slice(0, 2);
                                        const e = end.slice(0, 2);
                                        return e ? `${s}–${e}` : s;
                                      })()
                                }
                                sx={{
                                  height: 24,
                                  width: 'calc(100% - 4px)',
                                  maxWidth: 44,
                                  borderRadius: 1,
                                  '& .MuiChip-label': {
                                    px: 0.25,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  },
                                }}
                              />
                            ) : (
                              <IconButton
                                size="small"
                                disabled={pendingScheduleKeys.has(`${employee.id}_${dateKey}`)}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 1,
                                  border: '1px dashed',
                                  borderColor: 'divider',
                                  color: 'text.secondary',
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleCreateDefaultShift(employee, dateKey);
                                }}
                              >
                                <Add sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </Box>
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
                  <TableCell
                    sx={{
                      width: scheduleEmployeeColumnWidth,
                      minWidth: scheduleEmployeeColumnWidth,
                      maxWidth: scheduleEmployeeColumnWidth,
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      bgcolor: 'background.paper',
                      py: 1,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <FormControl fullWidth size="small" disabled={scheduleRosterCandidates.length === 0}>
                      <InputLabel id="schedule-roster-employee-label">Сотрудник</InputLabel>
                      <Select
                        labelId="schedule-roster-employee-label"
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
                      size="small"
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={handleAddRosterEmployee}
                      disabled={!scheduleRosterEmployeeId}
                      sx={{ height: 40, minHeight: 40 }}
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
        <Grid item xs={12} xl={8} sx={{ minWidth: 0 }}>
          <Card sx={toolbarCardSx}>
            <CardContent>
              <Grid
                container
                spacing={2}
                alignItems="center"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    boxSizing: 'border-box',
                  },
                  '& .MuiButton-root': {
                    height: 40,
                    minHeight: 40,
                    boxSizing: 'border-box',
                  },
                }}
              >
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Поиск по имени, email или должности"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
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
                  <FormControl fullWidth size="small">
                    <InputLabel id="employees-filter-status-label">Статус</InputLabel>
                    <Select
                      labelId="employees-filter-status-label"
                      value={filterStatus}
                      label="Статус"
                      onChange={(event) => setFilterStatus(event.target.value)}
                    >
                      <MenuItem value="all">Все</MenuItem>
                      <MenuItem value="active">Активные</MenuItem>
                      <MenuItem value="inactive">Неактивные</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <PeriodFilter value={periodFilter} onChange={setPeriodFilter} size="small" />
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearchTerm('');
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
                  <Button fullWidth variant="contained" startIcon={<Add />} onClick={() => { setAddDialogTab(0); setIsAddDialogOpen(true); }}>Добавить сотрудника</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {isAdmin && (
            <Alert severity="info" icon={<AdminPanelSettings />} sx={{ mt: 2 }}>
              Настройки доступа доступны только для сотрудников с ролью «Менеджер», «Техник» или «Кассир». У администратора полный доступ автоматически.
            </Alert>
          )}

          <Card sx={{ ...panelCardSx, mt: 3 }}>
            <CardContent>
              <Box sx={{ height: 560, width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
                    ...dataGridSx,
                    width: '100%',
                    '& .MuiDataGrid-virtualScroller': {
                      overflowX: 'hidden',
                    },
                    '& .MuiDataGrid-scrollbar--horizontal, & .MuiDataGrid-filler': {
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

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle sx={sectionTitleSx}>Новый сотрудник</DialogTitle>
        <DialogContent>
          {isAdmin && (
            <Tabs
              value={addDialogTab}
              onChange={(_, value) => setAddDialogTab(value)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Основные данные" />
              {employeeNeedsAccessSettings(newEmployee) ? (
                <Tab label="Доступ" icon={<AdminPanelSettings fontSize="small" />} iconPosition="start" />
              ) : null}
            </Tabs>
          )}
          {(addDialogTab === 0 || !isAdmin) && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="ФИО" value={newEmployee.name} onChange={(event) => setNewEmployee((prev) => ({ ...prev, name: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Email (необязательно)" value={newEmployee.email} onChange={(event) => setNewEmployee((prev) => ({ ...prev, email: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Телефон" value={newEmployee.phone} onChange={(event) => setNewEmployee((prev) => ({ ...prev, phone: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Логин для входа" value={newEmployee.loginEmail} onChange={(event) => setNewEmployee((prev) => ({ ...prev, loginEmail: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Пароль" value={newEmployee.password} onChange={(event) => setNewEmployee((prev) => ({ ...prev, password: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Должность</InputLabel>
                <Select value={newEmployee.position} label="Должность" onChange={(event) => setNewEmployee((prev) => ({ ...prev, position: event.target.value }))}>{positionNodes.map((position) => <MenuItem key={position.id} value={position.name}>{position.name}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Роль в системе</InputLabel>
                <Select
                  value={newEmployee.role}
                  label="Роль в системе"
                  onChange={(event) => {
                    const role = event.target.value as Employee['role'];
                    setNewEmployee((prev) => ({ ...prev, role }));
                    if (role === 'admin') {
                      setAddDialogTab(0);
                    }
                  }}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {newEmployee.role === 'admin' && (
              <Grid item xs={12}>
                <Alert severity="success">Администратор имеет полный доступ ко всем разделам и настройкам CRM.</Alert>
              </Grid>
            )}
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
          )}
          {isAdmin && employeeNeedsAccessSettings(newEmployee) && addDialogTab === 1 && (
            <EmployeeAccessSettings
              value={newEmployee}
              onChange={(access) => setNewEmployee((prev) => ({ ...prev, ...access }))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateEmployee}>Добавить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle sx={sectionTitleSx}>Редактирование сотрудника</DialogTitle>
        <DialogContent>
          {isAdmin && (
            <Tabs
              value={editDialogTab}
              onChange={(_, value) => setEditDialogTab(value)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Основные данные" />
              {employeeNeedsAccessSettings(editEmployee) ? (
                <Tab label="Доступ" icon={<AdminPanelSettings fontSize="small" />} iconPosition="start" />
              ) : null}
            </Tabs>
          )}
          {(editDialogTab === 0 || !isAdmin) && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="ФИО" value={editEmployee.name} onChange={(event) => setEditEmployee((prev) => ({ ...prev, name: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Email (необязательно)" value={editEmployee.email} onChange={(event) => setEditEmployee((prev) => ({ ...prev, email: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Телефон" value={editEmployee.phone} onChange={(event) => setEditEmployee((prev) => ({ ...prev, phone: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Логин для входа" value={editEmployee.loginEmail} onChange={(event) => setEditEmployee((prev) => ({ ...prev, loginEmail: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Пароль" value={editEmployee.password} onChange={(event) => setEditEmployee((prev) => ({ ...prev, password: event.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Должность</InputLabel>
                <Select value={editEmployee.position} label="Должность" onChange={(event) => setEditEmployee((prev) => ({ ...prev, position: event.target.value }))}>{positionNodes.map((position) => <MenuItem key={position.id} value={position.name}>{position.name}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Роль в системе</InputLabel>
                <Select
                  value={editEmployee.role}
                  label="Роль в системе"
                  onChange={(event) => {
                    const role = event.target.value as Employee['role'];
                    setEditEmployee((prev) => ({ ...prev, role }));
                    if (role === 'admin') {
                      setEditDialogTab(0);
                    }
                  }}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {editEmployee.role === 'admin' && (
              <Grid item xs={12}>
                <Alert severity="success">Администратор имеет полный доступ ко всем разделам и настройкам CRM.</Alert>
              </Grid>
            )}
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
          )}
          {isAdmin && employeeNeedsAccessSettings(editEmployee) && editDialogTab === 1 && (
            <EmployeeAccessSettings
              value={editEmployee}
              onChange={(access) => setEditEmployee((prev) => ({ ...prev, ...access }))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleUpdateEmployee}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isAccessDialogOpen} onClose={() => setIsAccessDialogOpen(false)} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle sx={sectionTitleSx}>
          Настройки доступа{selectedEmployee ? `: ${selectedEmployee.name}` : ''}
        </DialogTitle>
        <DialogContent>
          <EmployeeAccessSettings value={accessForm} onChange={setAccessForm} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAccessDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSaveAccess}>Сохранить доступ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDirectoryDialogOpen} onClose={() => setIsDirectoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Справочники сотрудников</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
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
          </Box>
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
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      В один день могут работать несколько сотрудников с разным временем — например, смены по полдня.
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth type="date" label="Дата" InputLabelProps={{ shrink: true }} value={scheduleForm.date} onChange={(event) => setScheduleForm((prev) => ({ ...prev, date: event.target.value }))} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          type="time"
                          label="Начало"
                          InputLabelProps={{ shrink: true }}
                          value={scheduleForm.startTime}
                          onChange={(event) => setScheduleForm((prev) => ({ ...prev, startTime: event.target.value }))}
                          onBlur={(event) => void handleScheduleFieldPersist({ startTime: event.target.value })}
                          disabled={scheduleForm.isDayOff || isSavingSchedule}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          type="time"
                          label="Конец"
                          InputLabelProps={{ shrink: true }}
                          value={scheduleForm.endTime}
                          onChange={(event) => setScheduleForm((prev) => ({ ...prev, endTime: event.target.value }))}
                          onBlur={(event) => void handleScheduleFieldPersist({ endTime: event.target.value })}
                          disabled={scheduleForm.isDayOff || isSavingSchedule}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        {scheduleLocationOptions.length > 0 ? (
                          <FormControl fullWidth>
                            <InputLabel>Локация</InputLabel>
                            <Select
                              value={scheduleForm.location}
                              label="Локация"
                              onChange={(event) =>
                                setScheduleForm((prev) => ({ ...prev, location: event.target.value }))
                              }
                            >
                              {scheduleLocationOptions.map((locationName) => (
                                <MenuItem key={locationName} value={locationName}>
                                  {locationName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField
                            fullWidth
                            label="Локация"
                            value={scheduleForm.location}
                            onChange={(event) =>
                              setScheduleForm((prev) => ({ ...prev, location: event.target.value }))
                            }
                            helperText="Локация смены для этой точки"
                          />
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth multiline minRows={2} label="Комментарий" value={scheduleForm.note} onChange={(event) => setScheduleForm((prev) => ({ ...prev, note: event.target.value }))} />
                      </Grid>
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography>Выходной день</Typography>
                          <Switch
                            checked={scheduleForm.isDayOff}
                            disabled={isSavingSchedule}
                            onChange={(event) => void handleScheduleDayOffChange(event.target.checked)}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<CalendarMonth />}
                          disabled={isSavingSchedule}
                          onClick={handleSaveSchedule}
                        >
                          {scheduleForm.isDayOff
                            ? scheduleForm.id
                              ? 'Сохранить выходной'
                              : 'Отметить выходной'
                            : scheduleForm.id
                              ? 'Сохранить смену'
                              : 'Добавить смену'}
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
                              <IconButton size="small" onClick={async () => {
                                const saved = await employeeWorkService.deleteScheduleEntry(entry.id);
                                applyWorkSettings(saved);
                              }}><Delete fontSize="small" /></IconButton>
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
                              <IconButton size="small" onClick={async () => {
                                const saved = await employeeWorkService.deleteTask(task.id);
                                applyWorkSettings(saved);
                              }}><Delete fontSize="small" /></IconButton>
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
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Должность</Typography><Typography>{employee.position || '—'}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Роль в системе</Typography><Typography>{ROLE_OPTIONS.find((option) => option.value === employee.role)?.label || employee.role}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Рейтинг</Typography><Box display="flex" alignItems="center"><Star sx={{ color: 'gold', fontSize: 16, mr: 0.5 }} /><Typography>{employee.rating}</Typography></Box></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Сдельный доход</Typography><Typography fontWeight={700}>{employee.totalEarnings.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Выручка сервису</Typography><Typography fontWeight={700}>{employee.serviceRevenue.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography variant="subtitle2" color="text.secondary">Прибыль сервису</Typography><Typography fontWeight={700}>{employee.serviceProfit.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Проценты по заказу</Typography><Typography fontWeight={700}>Приемка: {employee.intakeRate}% • Исполнение: {employee.executionRate}% • Выдача: {employee.deliveryRate}%</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Принял заказов</Typography><Typography fontWeight={700}>{employee.orderStats?.intakeOrders || 0}</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Исполнил заказов</Typography><Typography fontWeight={700}>{employee.orderStats?.executionOrders || 0}</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Выдал заказов</Typography><Typography fontWeight={700}>{employee.orderStats?.deliveryOrders || 0}</Typography></Grid>
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Дата найма</Typography><Typography>{employee.hireDate.toLocaleDateString('ru-RU')}</Typography></Grid>
                {isAdmin && employeeNeedsAccessSettings(employee) && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Разделы CRM</Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {CRM_MODULE_OPTIONS.filter((module) =>
                          normalizeAllowedModules(employee.access?.allowedModules).includes(module.path)
                        ).map((module) => (
                          <Chip key={module.path} label={module.label} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Разделы настроек в «Мой профиль»</Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {SETTINGS_SECTION_OPTIONS.filter((section) =>
                          normalizeVisibleSections(employee.access?.visibleSections).includes(section.key)
                        ).map((section) => (
                          <Chip key={section.key} label={section.label} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Редактирование профиля</Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {SELF_EDITABLE_FIELD_OPTIONS.filter((field) =>
                          normalizeSelfEditableFields(employee.access?.selfEditableFields).includes(field.key)
                        ).map((field) => (
                          <Chip key={field.key} label={field.label} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Grid>
                  </>
                )}
                {isAdmin && !employeeNeedsAccessSettings(employee) && (
                  <Grid item xs={12}>
                    <Alert severity="success">Администратор — полный доступ ко всем разделам CRM и настройкам компании.</Alert>
                  </Grid>
                )}
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions>
          {isAdmin && selectedEmployee && employeeNeedsAccessSettings(selectedEmployee) && (
            <Button
              startIcon={<AdminPanelSettings />}
              onClick={() => {
                setIsViewDialogOpen(false);
                openAccessDialog(selectedEmployee);
              }}
            >
              Настроить доступ
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setIsViewDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Employees;
