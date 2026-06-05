import React, { useEffect, useState } from 'react';
import {
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
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  Visibility,
  AttachMoney,
  Description,
  Build,
  LocalShipping,
  Print,
  Phone,
  WhatsApp,
  Telegram,
  CheckCircle,
  Security,
  CleaningServices,
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { orderService } from '../../services/orderService';
import { getApiErrorMessage } from '../../services/api';
import { documentService } from '../../services/documentService';
import { clientService } from '../../services/clientService';
import { inventoryService } from '../../services/inventoryService';
import { taxonomyService } from '../../services/taxonomyService';
import { cashService } from '../../services/cashService';
import { employeeService } from '../../services/employeeService';
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
import { smsService } from '../../services/smsService';
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
} from '../../types';
import DocumentGenerator from '../../components/DocumentGenerator/DocumentGenerator';
import CreateOrderForm from '../../components/CreateOrderForm/CreateOrderForm';
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
import { formatPhone, normalizePhoneForCompare, normalizePhoneForStorage } from '../../utils/phone';

// Mock data
const orders: Order[] = [];
// Data for autocomplete
const deviceBrands = [
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 
  'Motorola', 'Nokia', 'Realme', 'Oppo', 'Vivo', 'Honor', 'Asus', 'Lenovo',
  'HP', 'Dell', 'Acer', 'MSI', 'Razer', 'Alienware', 'Прочее'
];

const warrantyDayOptions = ['30', '60', '90', '365'];

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

const deviceModelsByType: Record<string, string[]> = {
  phone: [
    'Apple iPhone 15 Pro Max', 'Apple iPhone 15 Pro', 'Apple iPhone 15', 'Apple iPhone 14 Pro Max', 'Apple iPhone 14 Pro', 'Apple iPhone 14',
    'Apple iPhone 13 Pro Max', 'Apple iPhone 13 Pro', 'Apple iPhone 13', 'Apple iPhone 12 Pro Max', 'Apple iPhone 12 Pro', 'Apple iPhone 12',
    'Apple iPhone 11 Pro Max', 'Apple iPhone 11 Pro', 'Apple iPhone 11', 'Apple iPhone SE',
    'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24', 'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23+', 'Samsung Galaxy S23',
    'Samsung Galaxy A54', 'Samsung Galaxy A34', 'Samsung Galaxy A24', 'Samsung Galaxy Z Fold 5', 'Samsung Galaxy Z Flip 5',
    'Xiaomi Mi 14 Pro', 'Xiaomi Mi 14', 'Xiaomi Redmi Note 13 Pro', 'Xiaomi Redmi Note 13', 'Xiaomi Redmi 12', 'POCO X6 Pro', 'POCO F5',
    'Huawei P60 Pro', 'Huawei P60', 'Huawei Mate 60 Pro', 'Huawei nova 11', 'Huawei nova 10',
    'Honor Magic 5 Pro', 'Honor Magic 5', 'Honor 90 Pro', 'Honor 90', 'Honor X50',
    'Realme GT 5', 'Realme 11 Pro+', 'Realme 11 Pro', 'Realme C55',
    'Oppo Find X6 Pro', 'Oppo Reno 10 Pro', 'Oppo Reno 10', 'Oppo A78',
    'Vivo X90 Pro', 'Vivo V29', 'Vivo V27', 'Vivo Y36',
    'Google Pixel 8 Pro', 'Google Pixel 8', 'Google Pixel 7 Pro', 'Google Pixel 7',
    'Sony Xperia 1 V', 'Sony Xperia 5 V', 'OnePlus 12', 'OnePlus 11', 'Asus ROG Phone 7', 'Asus ZenFone 10',
  ],
  tablet: [
    'Apple iPad Pro', 'Apple iPad Air', 'Apple iPad', 'Apple iPad mini',
    'Samsung Galaxy Tab S9', 'Samsung Galaxy Tab A8',
    'Xiaomi Mi Pad 6', 'Huawei MatePad Pro', 'OnePlus Pad Go', 'Google Pixel Tablet', 'Lenovo Tab P11', 'Nokia T20',
  ],
  laptop: [
    'Apple MacBook Pro', 'Apple MacBook Air',
    'Asus VivoBook', 'Asus ROG Strix', 'Asus TUF Gaming',
    'Lenovo ThinkPad', 'Lenovo IdeaPad', 'Lenovo Yoga',
    'HP Pavilion', 'HP Envy', 'HP Spectre', 'HP EliteBook', 'HP ProBook',
    'Dell XPS 13', 'Dell XPS 15', 'Dell Inspiron', 'Dell Latitude', 'Dell Precision',
    'Acer Aspire', 'Acer Swift', 'Acer Nitro', 'Acer Predator',
    'MSI Stealth', 'MSI Raider', 'MSI Katana', 'MSI Sword', 'MSI Creator',
    'Razer Blade 15', 'Razer Blade 17', 'Razer Blade Stealth', 'Alienware m15', 'Alienware m17', 'Alienware x15', 'Alienware x17',
  ],
  desktop: [
    'Apple iMac', 'Apple Mac Studio', 'Apple Mac Pro',
    'Dell OptiPlex', 'Dell Precision', 'HP ProDesk', 'HP EliteDesk',
    'Lenovo ThinkCentre', 'Acer Predator Orion', 'MSI Trident', 'Alienware Aurora',
  ],
  other: [
    'Apple Watch', 'Samsung Galaxy Watch', 'Xiaomi Mi Watch', 'Huawei Watch GT 4',
    'Sony WH-1000XM5', 'Sony WF-1000XM5',
  ],
};

const commonDiagnoses = [
  'Треснутый экран',
  'Не включается',
  'Не заряжается',
  'Быстро разряжается',
  'Не работает камера',
  'Не работает звук',
  'Не работает микрофон',
  'Не работает динамик',
  'Не работает Wi-Fi',
  'Не работает Bluetooth',
  'Не работает сенсорный экран',
  'Не работает кнопка питания',
  'Не работает кнопка громкости',
  'Не работает кнопка Home',
  'Не работает Face ID',
  'Не работает Touch ID',
  'Не работает сканер отпечатков',
  'Перегревается',
  'Зависает',
  'Перезагружается',
  'Не видит SIM-карту',
  'Не работает GPS',
  'Не работает датчик приближения',
  'Не работает акселерометр',
  'Не работает гироскоп',
  'Проблемы с сетью',
  'Проблемы с антенной',
  'Проблемы с разъемом зарядки',
  'Проблемы с разъемом наушников',
  'Проблемы с динамиком',
  'Проблемы с вибрацией',
  'Проблемы с подсветкой',
  'Проблемы с дисплеем',
  'Проблемы с батареей',
  'Проблемы с материнской платой',
  'Проблемы с процессором',
  'Проблемы с памятью',
  'Проблемы с накопителем',
  'Проблемы с видеокартой',
  'Проблемы с клавиатурой',
  'Проблемы с тачпадом',
  'Проблемы с веб-камерой',
  'Проблемы с портами',
  'Проблемы с охлаждением',
  'Проблемы с BIOS',
  'Проблемы с операционной системой',
  'Проблемы с программным обеспечением',
  'Другое',
];

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

const priceWorkNamesByType: Record<string, string[]> = {
  phone: [
    'Диагностика устройства',
    'Замена экрана оригинал',
    'Замена экрана копия',
    'Замена аккумулятора оригинал',
    'Замена аккумулятора копия',
    'Замена кнопки питания',
    'Замена кнопки громкости',
    'Замена динамика',
    'Замена микрофона',
    'Замена камеры',
    'Замена разъема зарядки',
    'Замена нижнего шлейфа',
    'Замена разъема наушников',
    'Замена корпуса',
    'Замена задней крышки',
    'Замена материнской платы',
    'Ремонт кнопки питания',
    'Ремонт кнопки громкости',
    'Ремонт динамика',
    'Ремонт микрофона',
    'Ремонт камеры',
    'Ремонт разъема зарядки',
    'Ремонт корпуса',
    'Прошивка устройства',
    'Восстановление системы',
    'Восстановление данных',
    'Ремонт после попадания воды',
    'Ремонт после падения',
    'Замена защитного стекла',
    'Установка защитного стекла',
    'Замена пленки',
    'Установка пленки',
    'Чистка устройства',
    'Полировка корпуса',
  ],
  tablet: [
    'Диагностика устройства',
    'Замена экрана оригинал',
    'Замена экрана копия',
    'Замена аккумулятора оригинал',
    'Замена аккумулятора копия',
    'Замена кнопки питания',
    'Замена кнопки громкости',
    'Замена динамика',
    'Замена микрофона',
    'Замена камеры',
    'Замена разъема зарядки',
    'Замена нижнего шлейфа',
    'Замена корпуса',
    'Замена материнской платы',
    'Ремонт разъема зарядки',
    'Ремонт корпуса',
    'Прошивка устройства',
    'Восстановление системы',
    'Восстановление данных',
    'Ремонт после попадания воды',
    'Ремонт после падения',
    'Замена защитного стекла',
    'Установка защитного стекла',
    'Замена пленки',
    'Установка пленки',
    'Чистка устройства',
  ],
  laptop: [
    'Диагностика устройства',
    'Замена экрана оригинал',
    'Замена экрана копия',
    'Замена аккумулятора оригинал',
    'Замена аккумулятора копия',
    'Замена клавиатуры',
    'Замена тачпада',
    'Замена веб-камеры',
    'Замена разъема зарядки',
    'Замена корпуса',
    'Замена материнской платы',
    'Замена процессора',
    'Замена оперативной памяти',
    'Замена накопителя',
    'Замена системы охлаждения',
    'Замена вентилятора',
    'Замена термопасты',
    'Ремонт корпуса',
    'Ремонт материнской платы',
    'Ремонт системы охлаждения',
    'Установка операционной системы',
    'Восстановление системы',
    'Восстановление данных',
    'Обновление программного обеспечения',
    'Настройка устройства',
    'Настройка сети',
    'Настройка Wi-Fi',
    'Оптимизация производительности',
    'Удаление вирусов',
    'Восстановление после вирусов',
    'Очистка от пыли',
    'Очистка системы охлаждения',
    'Чистка устройства',
    'Ремонт после попадания воды',
    'Ремонт после падения',
  ],
  desktop: [
    'Диагностика устройства',
    'Замена материнской платы',
    'Замена процессора',
    'Замена оперативной памяти',
    'Замена накопителя',
    'Замена системы охлаждения',
    'Замена вентилятора',
    'Замена термопасты',
    'Ремонт корпуса',
    'Ремонт материнской платы',
    'Ремонт системы охлаждения',
    'Установка операционной системы',
    'Восстановление системы',
    'Восстановление данных',
    'Обновление программного обеспечения',
    'Настройка устройства',
    'Настройка сети',
    'Настройка Wi-Fi',
    'Оптимизация производительности',
    'Удаление вирусов',
    'Восстановление после вирусов',
    'Очистка от пыли',
    'Очистка системы охлаждения',
    'Чистка устройства',
    'Ремонт после скачка напряжения',
    'Ремонт после механических повреждений',
  ],
  other: [
    'Диагностика устройства',
    'Настройка устройства',
    'Обновление программного обеспечения',
    'Восстановление данных',
    'Чистка устройства',
    'Полировка корпуса',
    'Ремонт после попадания воды',
    'Ремонт после падения',
    'Ремонт после механических повреждений',
  ],
};

const customWorkNamesStorageKey = 'crm_custom_work_names';
const customDeviceModelsStorageKey = 'crm_custom_device_models_by_type';
const priceListStorageKey = 'crm_price_list_ekb_2026_v1';

const allDeviceModels = Array.from(new Set(Object.values(deviceModels).flat()));

const priorityOptions = [
  { value: 'low', label: 'Низкий', color: 'success' },
  { value: 'medium', label: 'Средний', color: 'warning' },
  { value: 'high', label: 'Высокий', color: 'error' },
  { value: 'urgent', label: 'Срочный', color: 'error' },
];

const deviceTypes = ['phone', 'tablet', 'laptop', 'desktop', 'other'];
const deviceConditions = ['excellent', 'good', 'fair', 'poor'];
const deviceTypeLabels: Record<string, string> = {
  phone: 'Телефон',
  tablet: 'Планшет',
  laptop: 'Ноутбук',
  desktop: 'Компьютер',
  other: 'Другое',
};
const ORDERS_GRID_LAYOUT_KEY = 'orders_grid_layout_v1';
const ordersFilterScopes = ['all', 'active', 'completed', 'cancelled', 'paid'] as const;
const ordersPeriodPresets: PeriodPreset[] = ['all', 'today', 'week', 'month', 'quarter', 'year'];

type PriceListItem = {
  id: string;
  deviceType: string;
  model: string;
  workName: string;
  partName: string;
  partCost: number;
  workCost: number;
};

const isAllowedPriceListItem = (item: PriceListItem) => {
  const normalizedWorkName = item.workName.trim().toLowerCase();
  if (normalizedWorkName.includes('диагност')) {
    return normalizedWorkName === 'диагностика устройства' || normalizedWorkName === 'диагностика';
  }

  if (item.id.startsWith('custom_')) {
    return true;
  }

  const allowedWorks = priceWorkNamesByType[item.deviceType] || priceWorkNamesByType.other;
  return allowedWorks.some((workName) => workName.toLowerCase() === normalizedWorkName);
};

const roundPrice = (value: number, step = 100) => Math.max(0, Math.round(value / step) * step);

const getIphoneGeneration = (model: string) => {
  const match = model.match(/iphone\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
};

const getModelPriceProfile = (deviceType: string, model: string) => {
  const lowerModel = model.toLowerCase();
  const isApple = lowerModel.includes('apple') || lowerModel.includes('iphone') || lowerModel.includes('ipad') || lowerModel.includes('mac');
  const isProMax = /pro max|ultra|fold|xps 17|mac pro|m3 max/i.test(model);
  const isPro = / pro|plus|\+|max|ultra|fold|flip|xps|spectre|elitebook|thinkpad|rog|raider|predator|alienware/i.test(model);
  const isBudget = /se|redmi|poco|galaxy a|tab a|c55|a78|y36|inspiron|ideapad|pavilion|aspire/i.test(model);
  const generation = getIphoneGeneration(model);

  let classFactor = 1;
  if (isProMax) {
    classFactor = 1.28;
  } else if (isPro) {
    classFactor = 1.14;
  } else if (isBudget) {
    classFactor = 0.78;
  }

  if (deviceType === 'tablet') {
    classFactor *= 1.18;
  }
  if (deviceType === 'laptop') {
    classFactor *= 1.75;
  }
  if (deviceType === 'desktop') {
    classFactor *= 1.55;
  }

  let ageFactor = 1;
  if (generation >= 15) {
    ageFactor = 1.18;
  } else if (generation === 14) {
    ageFactor = 1.06;
  } else if (generation === 13) {
    ageFactor = 0.96;
  } else if (generation === 12) {
    ageFactor = 0.86;
  } else if (generation > 0 && generation <= 11) {
    ageFactor = 0.72;
  }

  const brandFactor = isApple ? 1.2 : lowerModel.includes('samsung') ? 1.08 : 0.92;
  return {
    partFactor: classFactor * ageFactor * brandFactor,
    workFactor: Math.max(0.85, Math.min(1.45, classFactor * (deviceType === 'phone' ? 1 : 1.08))),
  };
};

const getPhoneScreenBase = (model: string, isOriginal: boolean) => {
  const generation = getIphoneGeneration(model);
  const lowerModel = model.toLowerCase();
  if (generation >= 15) return isOriginal ? 31900 : 17900;
  if (generation === 14) return isOriginal ? 27900 : 15900;
  if (generation === 13) return isOriginal ? 23900 : 13900;
  if (generation === 12) return isOriginal ? 19900 : 10900;
  if (generation > 0) return isOriginal ? 13900 : 7900;
  if (lowerModel.includes('fold')) return isOriginal ? 34900 : 22900;
  if (lowerModel.includes('flip')) return isOriginal ? 24900 : 16900;
  if (lowerModel.includes('ultra')) return isOriginal ? 22900 : 13900;
  return isOriginal ? 15900 : 8900;
};

const splitTotalPrice = (total: number, workCost: number) => ({
  partCost: Math.max(0, roundPrice(total - workCost)),
  workCost: roundPrice(workCost),
});

const getDefaultPriceByWork = (workName: string, deviceType: string, model: string) => {
  const normalized = workName.toLowerCase();
  const profile = getModelPriceProfile(deviceType, model);

  if ((normalized.includes('экран') || normalized.includes('дисплей')) && normalized.includes('оригинал')) {
    const total = deviceType === 'phone'
      ? getPhoneScreenBase(model, true)
      : roundPrice(16500 * profile.partFactor);
    return splitTotalPrice(total, 3500 * profile.workFactor);
  }
  if ((normalized.includes('экран') || normalized.includes('дисплей')) && normalized.includes('копия')) {
    const total = deviceType === 'phone'
      ? getPhoneScreenBase(model, false)
      : roundPrice(9800 * profile.partFactor);
    return splitTotalPrice(total, 3200 * profile.workFactor);
  }
  if ((normalized.includes('батар') || normalized.includes('аккумулятор')) && normalized.includes('оригинал')) {
    const total = roundPrice((deviceType === 'laptop' ? 10500 : deviceType === 'tablet' ? 7900 : 6900) * profile.partFactor);
    return splitTotalPrice(total, 1900 * profile.workFactor);
  }
  if ((normalized.includes('батар') || normalized.includes('аккумулятор')) && normalized.includes('копия')) {
    const total = roundPrice((deviceType === 'laptop' ? 7600 : deviceType === 'tablet' ? 5900 : 5200) * profile.partFactor);
    return splitTotalPrice(total, 1700 * profile.workFactor);
  }
  if (normalized.includes('экран') || normalized.includes('дисплей')) {
    return splitTotalPrice(roundPrice(11900 * profile.partFactor), 3200 * profile.workFactor);
  }
  if (normalized.includes('батар') || normalized.includes('аккумулятор')) {
    return splitTotalPrice(roundPrice(4900 * profile.partFactor), 1700 * profile.workFactor);
  }
  if (normalized.includes('разъема зарядки') || normalized.includes('нижнего шлейфа')) {
    return { partCost: roundPrice(1800 * profile.partFactor), workCost: roundPrice(2300 * profile.workFactor) };
  }
  if (normalized.includes('камер')) {
    return { partCost: roundPrice(3500 * profile.partFactor), workCost: roundPrice(2400 * profile.workFactor) };
  }
  if (normalized.includes('динамик') || normalized.includes('микрофон')) {
    return { partCost: roundPrice(1400 * profile.partFactor), workCost: roundPrice(1900 * profile.workFactor) };
  }
  if (normalized.includes('кнопк')) {
    return { partCost: roundPrice(1300 * profile.partFactor), workCost: roundPrice(2100 * profile.workFactor) };
  }
  if (normalized.includes('материнск') || normalized.includes('плат')) {
    return { partCost: roundPrice(8500 * profile.partFactor), workCost: roundPrice(5500 * profile.workFactor) };
  }
  if (normalized.includes('корпус') || normalized.includes('крышк')) {
    return { partCost: roundPrice(4200 * profile.partFactor), workCost: roundPrice(3500 * profile.workFactor) };
  }
  if (normalized.includes('чист')) return { partCost: 0, workCost: roundPrice(1200 * profile.workFactor) };
  if (normalized.includes('стекл') || normalized.includes('пленк')) {
    return { partCost: roundPrice(900 * profile.partFactor), workCost: roundPrice(900 * profile.workFactor) };
  }
  if (normalized.includes('прошив') || normalized.includes('систем') || normalized.includes('настрой')) {
    return { partCost: 0, workCost: roundPrice(1800 * profile.workFactor) };
  }
  if (normalized.includes('данн')) return { partCost: 0, workCost: roundPrice(3500 * profile.workFactor) };
  if (normalized.includes('вод') || normalized.includes('паден') || normalized.includes('механическ')) {
    return { partCost: roundPrice(2500 * profile.partFactor), workCost: roundPrice(4500 * profile.workFactor) };
  }
  if (normalized.includes('диагност')) return { partCost: 0, workCost: 0 };

  return { partCost: 0, workCost: roundPrice(1800 * profile.workFactor) };
};

const createDefaultPriceList = (): PriceListItem[] =>
  Object.entries(deviceModelsByType).flatMap(([deviceType, models]) =>
    models.flatMap((model) =>
      (priceWorkNamesByType[deviceType] || priceWorkNamesByType.other).map((workName) => {
        const defaultPrice = getDefaultPriceByWork(workName, deviceType, model);
        return {
          id: `${deviceType}_${model}_${workName}`.replace(/\s+/g, '_').toLowerCase(),
          deviceType,
          model,
          workName,
          partName: defaultPrice.partCost > 0 ? workName : '',
          partCost: defaultPrice.partCost,
          workCost: defaultPrice.workCost,
        };
      })
    )
  );

const getSavedPriceList = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(priceListStorageKey) || '[]');
    if (!Array.isArray(saved) || saved.length === 0) {
      return createDefaultPriceList();
    }

    const savedAllowed = (saved as PriceListItem[]).filter(isAllowedPriceListItem);
    const savedKeys = new Set(
      savedAllowed.map((item) => `${item.deviceType}|${item.model}|${item.workName}`.toLowerCase())
    );
    const missingDefaults = createDefaultPriceList().filter(
      (item) => !savedKeys.has(`${item.deviceType}|${item.model}|${item.workName}`.toLowerCase())
    );

    return [...savedAllowed, ...missingDefaults];
  } catch {
    return createDefaultPriceList();
  }
};

const getPriceBrand = (model: string) => model.trim().split(/\s+/)[0] || 'Без бренда';

const normalizePriceSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();

const priceSearchAliases: Record<string, string[]> = {
  акб: ['акб', 'аккумулятор', 'батарея', 'батареи', 'батар'],
  аккум: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  аккумулятор: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  батарея: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  батареи: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  раз: ['раз', 'разъем', 'разъема', 'разьем', 'разьема', 'нижний', 'шлейф', 'заряд', 'зарядки'],
  разъем: ['разъем', 'разъема', 'разьем', 'разьема', 'нижний', 'шлейф', 'заряд', 'зарядки'],
  разьем: ['разъем', 'разъема', 'разьем', 'разьема', 'нижний', 'шлейф', 'заряд', 'зарядки'],
  зарядка: ['разъем', 'разъема', 'разьем', 'разьема', 'заряд', 'зарядки'],
  зарядки: ['разъем', 'разъема', 'разьем', 'разьема', 'заряд', 'зарядки'],
  шлейф: ['шлейф', 'нижний', 'разъем', 'разъема', 'заряд', 'зарядки'],
  экран: ['экран', 'дисп', 'дисплей', 'модуль'],
  дисп: ['экран', 'дисп', 'дисплей', 'модуль'],
  дисплей: ['экран', 'дисп', 'дисплей', 'модуль'],
  стекло: ['стекло', 'защитное', 'пленка'],
  пленка: ['стекло', 'защитное', 'пленка'],
};

const getPriceSearchGroups = (query: string) =>
  normalizePriceSearchText(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => priceSearchAliases[token] || [token]);

const matchesPriceSearch = (item: PriceListItem, query: string) => {
  const groups = getPriceSearchGroups(query);
  if (groups.length === 0) {
    return true;
  }

  const haystack = normalizePriceSearchText(
    [
      deviceTypeLabels[item.deviceType] || item.deviceType,
      getPriceBrand(item.model),
      item.model,
      item.workName,
      item.partName,
    ].join(' ')
  );

  return groups.every((group) =>
    group.some((term) => haystack.includes(normalizePriceSearchText(term)))
  );
};

type OrdersColumnLayout = {
  order: string[];
  widths: Record<string, number>;
  rowsPerPage?: number;
};

const Orders: React.FC = () => {
  const { user } = useAuth();
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
  const [isPriceEditMode, setIsPriceEditMode] = useState(false);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AcceptanceAct | WorkCompletionAct | null>(null);
  const [documentType, setDocumentType] = useState<'acceptance' | 'completion'>('acceptance');
  const [isCreateOrderFormOpen, setIsCreateOrderFormOpen] = useState(false);
  const [isStepByStepOrderOpen, setIsStepByStepOrderOpen] = useState(false);
  const [isQuickSaleDialogOpen, setIsQuickSaleDialogOpen] = useState(false);
  const [isQuickCleaningDialogOpen, setIsQuickCleaningDialogOpen] = useState(false);
  const [activeQuickSaleId, setActiveQuickSaleId] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'paid'>('active');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(() => defaultPeriodFilterValue('month'));
  const [tabValue, setTabValue] = useState(0);
  const [communicationChannel, setCommunicationChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [masterCommentText, setMasterCommentText] = useState('');
  const [warrantySourceOrderNumber, setWarrantySourceOrderNumber] = useState('');
  const [isWarrantyCreating, setIsWarrantyCreating] = useState(false);
  const [priceList, setPriceList] = useState<PriceListItem[]>(getSavedPriceList);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceDeviceType, setPriceDeviceType] = useState('all');
  const [priceBrand, setPriceBrand] = useState('all');
  const [priceModel, setPriceModel] = useState('all');
  const [newPriceItem, setNewPriceItem] = useState<PriceListItem>({
    id: '',
    deviceType: 'phone',
    model: '',
    workName: '',
    partName: '',
    partCost: 0,
    workCost: 0,
  });

  useEffect(() => {
    const openPriceList = () => setIsPriceDialogOpen(true);
    window.addEventListener('crm:open-price-list', openPriceList);
    return () => window.removeEventListener('crm:open-price-list', openPriceList);
  }, []);
  
  // Add work / part form state
  const [workType, setWorkType] = useState<'work' | 'part'>('work');
  const [workName, setWorkName] = useState('');
  const [customWorkNames, setCustomWorkNames] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(customWorkNamesStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : [];
    } catch {
      return [];
    }
  });
  const [customDeviceModels, setCustomDeviceModels] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem(customDeviceModelsStorageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  const [workPrice, setWorkPrice] = useState('');
  const [workQuantity, setWorkQuantity] = useState(1);
  const [workWarrantyDays, setWorkWarrantyDays] = useState('30');
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [quickPartName, setQuickPartName] = useState('');
  const [quickPartCategory, setQuickPartCategory] = useState('Прочее');
  const [quickPartBrand, setQuickPartBrand] = useState('');
  const [quickPartModel, setQuickPartModel] = useState('');
  const [quickPartWholesalePrice, setQuickPartWholesalePrice] = useState('');
  const [quickPartQuantity, setQuickPartQuantity] = useState(1);
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
  const [quickCleaningForm, setQuickCleaningForm] = useState({
    salePrice: '1000',
    paymentMethod: 'cash',
    note: '',
  });
  
  // Delivery flow state
  const [testingChecklist, setTestingChecklist] = useState({
    screenWorks: false,
    touchWorks: false,
    cameraWorks: false,
    soundWorks: false,
    chargingWorks: false,
    wifiWorks: false,
    bluetoothWorks: false,
    buttonsWork: false,
    fingerprintWorks: false,
    faceIdWorks: false
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'installment'>('cash');
  const [quickPaymentAmount, setQuickPaymentAmount] = useState(0);
  const [quickPaymentNotes, setQuickPaymentNotes] = useState('');
  const [screenProtection, setScreenProtection] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [protectionPartId, setProtectionPartId] = useState('');
  const [protectionInstallPrice, setProtectionInstallPrice] = useState<number>(0);
  const [cleaningServicePrice, setCleaningServicePrice] = useState<number>(0);
  
  // Step-by-step order creation state
  const [newOrderData, setNewOrderData] = useState({
    // Step 1: Client
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientNotes: '',
    
    // Step 2: Device
    deviceType: 'phone' as 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other',
    deviceBrand: '',
    deviceModel: '',
    deviceSerial: '',
    deviceImei: '',
    devicePassword: '',
    deviceColor: '',
    deviceCondition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    deviceExternalCondition: '',
    
    // Step 3: Issue
    description: '',
    diagnosis: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    
    // Step 4: Price and timeline
    estimatedCost: 0,
    advancePayment: 0,
    estimatedDays: 1,
    technicianId: '',
    technicianName: '',
    intakeManagerName: '',
    deliveryManagerName: '',
    
    // Extra fields
    staffComments: '',
    offerProtection: false,
    offerCleaning: false,
  });
  
  const [ordersData, setOrdersData] = useState<Order[]>(orders);
  const [inventoryParts, setInventoryParts] = useState(() => inventoryService.getParts());
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>(() => taxonomyService.getNodes('inventory'));
  const [managerOptions, setManagerOptions] = useState(() => employeeService.getEmployeesByRole('manager'));
  const [technicianOptions, setTechnicianOptions] = useState(() => employeeService.getEmployeesByRole('technician'));
  const [assigneeOptions, setAssigneeOptions] = useState(() => employeeService.getEmployees());
  const [crmSettings, setCrmSettings] = useState(() => appSettingsService.getSettings());
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
  
  // User role placeholder (later from auth context)
  const [userRole] = useState<'employee' | 'client'>('employee'); // default: employee

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

  const deviceModelOptions = React.useMemo(() => {
    const deviceType = newOrderData.deviceType || 'other';
    const fromStatic = deviceModelsByType[deviceType] || deviceModelsByType.other;
    const fromCustom = customDeviceModels[deviceType] || [];
    return Array.from(new Set([...fromStatic, ...fromCustom]))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, [customDeviceModels, newOrderData.deviceType]);

  const canEditPriceList = user?.role === 'admin';
  const priceBrandOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          priceList
            .filter((item) => priceDeviceType === 'all' || item.deviceType === priceDeviceType)
            .map((item) => getPriceBrand(item.model))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [priceDeviceType, priceList]
  );
  const priceModelOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          priceList
            .filter((item) => priceDeviceType === 'all' || item.deviceType === priceDeviceType)
            .filter((item) => priceBrand === 'all' || getPriceBrand(item.model) === priceBrand)
            .map((item) => item.model)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [priceBrand, priceDeviceType, priceList]
  );
  const priceTree = React.useMemo(
    () =>
      deviceTypes
        .filter((type) => priceList.some((item) => item.deviceType === type))
        .map((type) => {
          const typeItems = priceList.filter((item) => item.deviceType === type);
          const brands = Array.from(new Set(typeItems.map((item) => getPriceBrand(item.model)))).sort((a, b) =>
            a.localeCompare(b, 'ru')
          );

          return {
            type,
            total: typeItems.length,
            brands: brands.map((brand) => {
              const brandItems = typeItems.filter((item) => getPriceBrand(item.model) === brand);
              const models = Array.from(new Set(brandItems.map((item) => item.model))).sort((a, b) =>
                a.localeCompare(b, 'ru')
              );
              return { brand, total: brandItems.length, models };
            }),
          };
        }),
    [priceList]
  );
  const filteredPriceList = React.useMemo(() => {
    return priceList
      .filter((item) => priceDeviceType === 'all' || item.deviceType === priceDeviceType)
      .filter((item) => priceBrand === 'all' || getPriceBrand(item.model) === priceBrand)
      .filter((item) => priceModel === 'all' || item.model === priceModel)
      .filter((item) => matchesPriceSearch(item, priceSearch))
      .slice(0, 250);
  }, [priceBrand, priceDeviceType, priceList, priceModel, priceSearch]);

  const persistPriceList = (nextPriceList: PriceListItem[]) => {
    setPriceList(nextPriceList);
    localStorage.setItem(priceListStorageKey, JSON.stringify(nextPriceList));
  };

  const updatePriceItem = (id: string, updates: Partial<PriceListItem>) => {
    persistPriceList(priceList.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addPriceItem = () => {
    if (!newPriceItem.model.trim() || !newPriceItem.workName.trim()) {
      toast.error('Укажите модель и наименование работы');
      return;
    }

    const nextItem = {
      ...newPriceItem,
      id: `custom_${Date.now()}`,
      model: newPriceItem.model.trim(),
      workName: newPriceItem.workName.trim(),
      partName: newPriceItem.partName.trim(),
      partCost: Number(newPriceItem.partCost) || 0,
      workCost: Number(newPriceItem.workCost) || 0,
    };

    persistPriceList([nextItem, ...priceList]);
    setNewPriceItem({
      id: '',
      deviceType: 'phone',
      model: '',
      workName: '',
      partName: '',
      partCost: 0,
      workCost: 0,
    });
  };

  const deletePriceItem = (id: string) => {
    persistPriceList(priceList.filter((item) => item.id !== id));
  };

  const closePriceListDialog = () => {
    setIsPriceDialogOpen(false);
    setIsPriceEditMode(false);
    setIsPriceFilterOpen(false);
  };


  useEffect(() => {
    const loadOrders = async () => {
      const savedOrders = await orderService.getOrders();
      const nextSettings = await appSettingsService.refreshFromApi();
      await employeeService.refreshFromApi();
      await inventoryService.refreshFromApi();
      await taxonomyService.refreshFromApi();
      setOrdersData(savedOrders);
      setInventoryParts(inventoryService.getParts());
      setTaxonomyNodes(taxonomyService.getNodes('inventory'));
      setManagerOptions(employeeService.getEmployeesByRole('manager'));
      setTechnicianOptions(employeeService.getEmployeesByRole('technician'));
      setAssigneeOptions(employeeService.getEmployees());
      setCrmSettings(nextSettings);
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

  const StatusBadgeSelector = ({
    value,
    onChange,
    stopPropagation = false,
    fullWidth = false,
    size = 'small',
  }: {
    value: Order['status'];
    onChange: (nextStatus: Order['status']) => void;
    stopPropagation?: boolean;
    fullWidth?: boolean;
    size?: 'small' | 'medium';
  }) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const selectedOption = getStatusOption(value);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        event.stopPropagation();
      }
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleSelect = (nextStatus: Order['status']) => {
      handleClose();
      onChange(nextStatus);
    };

    return (
      <>
        <Chip
          label={selectedOption.label}
          clickable
          onClick={handleOpen}
          size={size}
          sx={{
            width: fullWidth ? '100%' : 'auto',
            minWidth: fullWidth ? 150 : 132,
            maxWidth: '100%',
            justifyContent: 'center',
            bgcolor: selectedOption.color,
            color: '#fff',
            fontWeight: 700,
            borderRadius: 1.5,
            '& .MuiChip-label': {
              display: 'block',
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              px: 1.5,
            },
            '&:hover': {
              bgcolor: selectedOption.color,
              filter: 'brightness(0.96)',
            },
          }}
        />
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
          }}
        >
          {orderStatusOptions.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === value}
              onClick={() => handleSelect(option.value as Order['status'])}
              sx={{ minWidth: 220 }}
            >
              <Chip
                label={option.label}
                size="small"
                sx={{
                  bgcolor: option.color,
                  color: '#fff',
                  fontWeight: 700,
                  minWidth: 140,
                  justifyContent: 'center',
                }}
              />
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

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

  const getHistoryChannelLabel = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'telegram':
        return 'Telegram';
      case 'sms':
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

    return {
      baseAmount,
      technicianAmount: (baseAmount * technicianRate) / 100,
      intakeAmount: (baseAmount * intakeRate) / 100,
      deliveryAmount: (baseAmount * deliveryRate) / 100,
      technicianRate,
      intakeRate,
      deliveryRate,
    };
  };

  const notifyClientOnStatusChange = async (order: Order, previousStatus?: Order['status']) => {
    if (order.status === previousStatus) {
      return null;
    }

    try {
      const settings = appSettingsService.getSettings();
      const result = await smsService.sendStatusSms(order, settings, getOrderDebt(order));

      if (result.success) {
        toast.success('Клиенту отправлена SMS по статусу заказа');
        return createHistoryEntry(
          'sms',
          `SMS отправлена клиенту: статус "${getStatusOption(order.status).label}".`
        );
      } else if (!result.skipped) {
        toast.error(result.message);
        return createHistoryEntry(
          'sms',
          `Ошибка отправки SMS: ${result.message}`
        );
      } else if (settings.notifications.smsNotifications) {
        toast(result.message);
        return createHistoryEntry(
          'sms',
          `SMS не отправлена: ${result.message}`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить SMS клиенту');
      return createHistoryEntry(
        'sms',
        `Ошибка отправки SMS: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      );
    }

    return null;
  };

  const persistOrderChanges = async (
    baseOrder: Order,
    updatedOrder: Order,
    successMessage: string
  ) => {
      await orderService.updateOrder(baseOrder.id, updatedOrder);
      let finalOrder = updatedOrder;
      const smsHistoryEntry = await notifyClientOnStatusChange(updatedOrder, baseOrder.status);
      if (smsHistoryEntry) {
        finalOrder = appendOrderHistory(updatedOrder, [smsHistoryEntry]);
        await orderService.updateOrder(baseOrder.id, finalOrder);
      }
      setOrdersData((prev) => prev.map((order) => (order.id === baseOrder.id ? finalOrder : order)));
      setSelectedOrder((prev) => (prev && prev.id === baseOrder.id ? finalOrder : prev));
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

  const buildCommunicationTemplate = (
    order: Order,
    channel: 'whatsapp' | 'telegram'
  ) => {
    const greeting = channel === 'whatsapp' ? 'Здравствуйте' : 'Добрый день';
    return `${greeting}, ${order.clientName || 'клиент'}! По заказу ${order.orderNumber}: статус "${getStatusOption(order.status).label}". Ориентировочная стоимость ${getOrderTotal(order)} ₽. Если удобно, ответьте в этом чате.`;
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

    return template
      .replaceAll('{{phone}}', phone)
      .replaceAll('{{phoneDigits}}', phoneDigits)
      .replaceAll('{{message}}', message)
      .replaceAll('{{messageEncoded}}', encodeURIComponent(message))
      .replaceAll('{{clientName}}', order.clientName || '')
      .replaceAll('{{orderNumber}}', order.orderNumber || '')
      .replaceAll('{{device}}', device)
      .replaceAll('{{siteUrl}}', siteUrl)
      .replaceAll('{{siteUrlEncoded}}', encodeURIComponent(siteUrl))
      .replaceAll('{{companyPhone}}', appSettingsService.getSettings().business.phone || '');
  };

  const getExternalMessengerLink = (
    order: Order,
    channel: 'whatsapp' | 'telegram',
    message: string
  ) => {
    const settings = appSettingsService.getSettings();
    if (channel === 'whatsapp') {
      if (settings.integrations.whatsappMode === 'crm') {
        return '';
      }
      return buildIntegrationLink(settings.integrations.whatsappLinkTemplate, order, message);
    }

    if (settings.integrations.telegramMode === 'crm') {
      return '';
    }

    return buildIntegrationLink(settings.integrations.telegramLinkTemplate, order, message);
  };

  const openExternalMessenger = (
    order: Order,
    channel: 'whatsapp' | 'telegram',
    message: string
  ) => {
    const link = getExternalMessengerLink(order, channel, message);
    if (!link) {
      toast.error(channel === 'whatsapp' ? 'Внешний WhatsApp не настроен' : 'Внешний Telegram не настроен');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const getExternalMessengerLabel = (channel: 'whatsapp' | 'telegram') =>
    channel === 'whatsapp' ? 'Открыть в WhatsApp' : 'Открыть в Telegram';

  const handleCreateOrder = () => {
    setIsCreateOrderFormOpen(true);
  };

  const handleCreateStepByStepOrder = () => {
    setIsStepByStepOrderOpen(true);
    setCurrentStep(0);
    setNewOrderData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      clientNotes: '',
      deviceType: 'phone',
      deviceBrand: '',
      deviceModel: '',
      deviceSerial: '',
      deviceImei: '',
      devicePassword: '',
      deviceColor: '',
      deviceCondition: 'good',
      deviceExternalCondition: 'Сколы, трещины, возможны скрытые дефекты',
      description: '',
      diagnosis: '',
      priority: 'medium',
      estimatedCost: 0,
      advancePayment: 0,
      estimatedDays: 1,
        technicianId: assigneeOptions[0]?.id || technicianOptions[0]?.id || '',
        technicianName: assigneeOptions[0]?.name || technicianOptions[0]?.name || '',
        intakeManagerName: assigneeOptions[0]?.name || managerOptions[0]?.name || '',
        deliveryManagerName: assigneeOptions[0]?.name || managerOptions[0]?.name || '',
      staffComments: '',
      offerProtection: false,
      offerCleaning: false,
    });
    setProtectionPartId('');
    setProtectionInstallPrice(0);
    setCleaningServicePrice(0);
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

  const openQuickCleaningDialog = () => {
    const firstPaymentMethod =
      crmSettings.payment.paymentMethodOptions.find((item) => item.enabled)?.code || 'cash';
    setQuickCleaningForm({
      salePrice: '1000',
      paymentMethod: firstPaymentMethod,
      note: '',
    });
    setIsQuickCleaningDialogOpen(true);
  };

  const handleCreateQuickCleaning = async () => {
    try {
      const salePrice = Math.max(0, Number(quickCleaningForm.salePrice) || 0);

      if (salePrice <= 0) {
        toast.error('Укажите цену чистки устройства');
        return;
      }

      const paymentOption = crmSettings.payment.paymentMethodOptions.find(
        (item) => item.code === quickCleaningForm.paymentMethod
      );

      await cashService.addOperation({
        type: 'income',
        amount: salePrice,
        description: 'Чистка устройства',
        category: 'Быстрые продажи',
        paymentMethod: quickCleaningForm.paymentMethod,
        registerType: paymentOption?.registerType || 'cashbox',
        source: 'other',
        processedBy: user?.name || 'Сотрудник',
        notes: quickCleaningForm.note.trim() || undefined,
      });

      setIsQuickCleaningDialogOpen(false);
      setQuickCleaningForm({
        salePrice: '1000',
        paymentMethod: paymentOption?.code || 'cash',
        note: '',
      });
      toast.success('Чистка устройства проведена');
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'Не удалось провести чистку устройства'));
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

      if (salePrice <= 0) {
        toast.error('Укажите цену продажи');
        return;
      }

      if (Number(selectedQuickSalePart.quantity || 0) < quantity) {
        toast.error(`Недостаточно товара на складе. Доступно: ${selectedQuickSalePart.quantity} шт.`);
        return;
      }

      await inventoryService.registerOutgoingMovement(
        selectedQuickSalePart.id,
        quantity,
        `Быстрая продажа: ${activeQuickSaleOption.label} / ${selectedQuickSalePart.name}`,
        undefined,
        user?.name || 'Сотрудник'
      );

      const paymentOption = crmSettings.payment.paymentMethodOptions.find(
        (item) => item.code === quickSaleForm.paymentMethod
      );

      await cashService.addOperation({
        type: 'income',
        amount: salePrice,
        description:
          quantity > 1
            ? `${activeQuickSaleOption.label}: ${selectedQuickSalePart.name} x${quantity}`
            : `${activeQuickSaleOption.label}: ${selectedQuickSalePart.name}`,
        category: 'Быстрые продажи',
        paymentMethod: quickSaleForm.paymentMethod,
        registerType: paymentOption?.registerType || 'cashbox',
        source: 'other',
        processedBy: user?.name || 'Сотрудник',
        notes: quickSaleForm.note.trim() || undefined,
      });

      await inventoryService.refreshFromApi();
      setInventoryParts(inventoryService.getParts());
      setIsQuickSaleDialogOpen(false);
      setActiveQuickSaleId('');
      setQuickSaleForm({
        partId: '',
        quantity: 1,
        salePrice: '',
        paymentMethod: paymentOption?.code || 'cash',
        note: '',
      });
      toast.success(`Продажа "${activeQuickSaleOption.label}" проведена`);
    } catch (error) {
      console.error(error);
      toast.error('Не удалось провести быструю продажу');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      rememberDeviceModel(newOrderData.deviceType, newOrderData.deviceModel);
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepDataChange = (field: string, value: any) => {
    setNewOrderData(prev => ({ ...prev, [field]: value }));
  };

  const rememberDeviceModel = React.useCallback((deviceType: string, value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    const type = deviceType || 'other';
    const existsInBase = (deviceModelsByType[type] || []).some(
      (model) => model.trim().toLowerCase() === normalized.toLowerCase()
    );
    if (existsInBase) {
      return;
    }

    setCustomDeviceModels((prev) => {
      const current = prev[type] || [];
      if (current.some((model) => model.trim().toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }

      const next = {
        ...prev,
        [type]: [...current, normalized].sort((a, b) => a.localeCompare(b, 'ru')),
      };
      localStorage.setItem(customDeviceModelsStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleCreateOrderFromSteps = async () => {
    try {
      if (!newOrderData.clientName.trim()) {
        toast.error('Укажите ФИО клиента');
        return;
      }
      if (!newOrderData.clientPhone.trim()) {
        toast.error('Укажите телефон клиента');
        return;
      }
      if (!newOrderData.deviceModel.trim()) {
        toast.error('Укажите модель устройства');
        return;
      }
      if (!newOrderData.diagnosis.trim()) {
        toast.error('Укажите предварительный диагноз');
        return;
      }
      if (!newOrderData.estimatedDays || newOrderData.estimatedDays < 1) {
        toast.error('Укажите срок выполнения минимум 1 день');
        return;
      }

      rememberDeviceModel(newOrderData.deviceType, newOrderData.deviceModel);
      await clientService.refreshFromApi();
      // Find existing client by phone
      let client = clientService.findClientByPhone(newOrderData.clientPhone);
      
      if (!client) {
        // Create new client
        client = await clientService.createClient({
          firstName: newOrderData.clientName.split(' ')[0] || '',
          lastName: newOrderData.clientName.split(' ').slice(1).join(' ') || '',
          phone: normalizePhoneForStorage(newOrderData.clientPhone),
          email: newOrderData.clientEmail,
          address: newOrderData.clientAddress,
          notes: newOrderData.clientNotes,
        });
      } else {
        // Update existing client if data changed
        client = (await clientService.updateClient(client.id, {
          firstName: newOrderData.clientName.split(' ')[0] || '',
          lastName: newOrderData.clientName.split(' ').slice(1).join(' ') || '',
          phone: normalizePhoneForStorage(newOrderData.clientPhone),
          email: newOrderData.clientEmail,
          address: newOrderData.clientAddress,
          notes: newOrderData.clientNotes,
        })) || client;
      }

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

      // Create order
      const order = await orderService.createOrder({
        clientId: client.id,
        deviceId: device.id,
        technicianId: newOrderData.technicianId,
        technicianName: newOrderData.technicianName,
        intakeManagerName: newOrderData.intakeManagerName,
        deliveryManagerName: newOrderData.deliveryManagerName,
        status: defaultOpenStatusCode,
        priority: newOrderData.priority,
        description: newOrderData.staffComments,
        diagnosis: newOrderData.diagnosis,
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
          ...(newOrderData.staffComments.trim()
            ? [
                {
                  id: `${Date.now()}_initial_note`,
                  channel: 'internal',
                  author: user?.name || 'Сотрудник',
                  message: newOrderData.staffComments.trim(),
                  createdAt: new Date().toISOString(),
                } as const,
              ]
            : []),
        ],
      });

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
        reasonForContact: newOrderData.description || newOrderData.staffComments || order.description,
        estimatedPrice: newOrderData.estimatedCost || order.estimatedCost,
        advancePayment: newOrderData.advancePayment,
      });

      setIsStepByStepOrderOpen(false);
      setCurrentStep(0);
      
      toast.success('Заказ успешно создан');
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      toast.error(getApiErrorMessage(error, 'Не удалось создать заказ. Проверьте данные и попробуйте еще раз.'));
    }
  };

  const handleOrderFormSubmit = async (formData: any) => {
    try {
      await clientService.refreshFromApi();
      // Create/update client
      const existingClient = clientService.findClientByPhone(formData.phone);
      const client = existingClient
        ? (await clientService.updateClient(existingClient.id, {
            firstName: formData.clientName.split(' ')[0] || '',
            lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
            phone: normalizePhoneForStorage(formData.phone),
            email: formData.email || existingClient.email,
            notes: formData.clientComment || existingClient.notes || '',
          })) || existingClient
        : await clientService.createClient({
            firstName: formData.clientName.split(' ')[0] || '',
            lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
            phone: normalizePhoneForStorage(formData.phone),
            email: formData.email || '',
            notes: formData.clientComment || '',
          });

      const selectedTechnician =
        assigneeOptions.find((option) => option.name === formData.performer) ||
        technicianOptions.find((option) => option.name === formData.performer) ||
        assigneeOptions[0] ||
        technicianOptions[0];
      const intakeManager = formData.manager || assigneeOptions[0]?.name || managerOptions[0]?.name || user?.name || 'Менеджер';

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
        technicianId: selectedTechnician?.id || '',
        technicianName: selectedTechnician?.name || '',
        intakeManagerName: intakeManager,
        deliveryManagerName: intakeManager,
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

      setOrdersData(prev => [newOrder, ...prev]);

      // Create acceptance act
      await handleCreateAcceptanceAct(newOrder, client, device, formData);

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

  const handleViewOrder = (order: Order) => {
    setSelectedOrder({ ...order });
    setMasterCommentText('');
    setIsOrderViewDialogOpen(true);
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder({ ...order });
    setQuickPaymentMethod('cash');
    setQuickPaymentAmount(getOrderTotal(order));
    setQuickPaymentNotes('');
    setIsPaymentDialogOpen(true);
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

  const openCommunicationCenter = (
    order: Order,
    channel: 'whatsapp' | 'telegram'
  ) => {
    setSelectedOrder(order);
    setCommunicationChannel(channel);
    setCommunicationMessage(buildCommunicationTemplate(order, channel));
    setIsCommunicationDialogOpen(true);
  };

  const handleWhatsAppClient = (order: Order) => {
    openCommunicationCenter(order, 'whatsapp');
  };

  const handleTelegramClient = (order: Order) => {
    openCommunicationCenter(order, 'telegram');
  };

  const handleSaveCommunication = async () => {
    if (!selectedOrder || !communicationMessage.trim()) {
      toast.error('Введите сообщение для клиента');
      return;
    }

    const communicationEntry = {
      id: Date.now().toString(),
      channel: communicationChannel,
      author: user?.name || 'Сотрудник',
      message: communicationMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedOrder = {
      ...selectedOrder,
      communicationHistory: [...(selectedOrder.communicationHistory || []), communicationEntry],
    };

    try {
      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      setOrdersData((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder(updatedOrder);
      setIsCommunicationDialogOpen(false);
      toast.success(`Сообщение в ${communicationChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} сохранено в CRM`);
    } catch (error) {
      toast.error('Не удалось сохранить историю общения');
    }
  };

  const handleAddMasterComment = async () => {
    if (!selectedOrder) {
      return;
    }
    const text = masterCommentText.trim();
    if (!text) {
      toast.error('Введите комментарий для мастера');
      return;
    }

    const updatedOrder = appendOrderHistory(selectedOrder, [
      createHistoryEntry('internal', text),
    ]);

    try {
      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      setOrdersData((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder(updatedOrder);
      setMasterCommentText('');
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

  const handleSaveOrderEdit = async (updatedData: Partial<Order>) => {
    if (!selectedOrder) return;
    
    try {
      const currentOrder = ordersData.find((order) => order.id === selectedOrder.id) || selectedOrder;
      const updatedOrder = { ...currentOrder, ...updatedData };
      await persistOrderChanges(currentOrder, updatedOrder, 'Заказ успешно обновлен');
      setIsEditOrderDialogOpen(false);
    } catch (error) {
      console.error('Ошибка при обновлении заказа:', error);
      toast.error('Ошибка при обновлении заказа');
    }
  };

  // Work / parts actions
  const handleAddWork = (order: Order) => {
    console.log('handleAddWork called with order:', order);
    if (!order) {
      console.error('Order was not passed to handleAddWork');
      toast.error('Заказ не найден');
      return;
    }
    if (!order.id) {
      console.error('Order has no id:', order);
      toast.error('У заказа отсутствует ID');
      return;
    }
    
    console.log('Setting selectedOrder:', order);
    setSelectedOrder(order);
    setIsAddWorkDialogOpen(true);
    
    // Reset form on open
    setWorkName('');
    setWorkPrice('');
    setWorkQuantity(1);
    setWorkWarrantyDays('30');
    setSelectedPart(null);
    setWorkType('work');
    setEditingWorkItemId(null);
  };

  const handleEditWorkItem = (order: Order, item: OrderPart) => {
    const linkedPart = (item as any).partInfo;
    setSelectedOrder(order);
    setEditingWorkItemId(item.id);
    setWorkName((item as any).workName || linkedPart?.name || '');
    setWorkPrice(String(Number(item.unitPrice || 0)));
    setWorkQuantity(Number(item.quantity || 1));
    setWorkWarrantyDays(String(Number((item as any).warrantyDays || 30)));
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
    setIsOrderViewDialogOpen(false);
    setIsAddWorkDialogOpen(true);
  };

  const handleSearchParts = () => {
    setIsSearchPartsDialogOpen(true);
  };

  const handleAddWorkToOrder = async () => {
    if (!selectedOrder) {
      toast.error('Заказ не выбран');
      return;
    }

    console.log('selectedOrder check:', {
      id: selectedOrder.id,
      orderNumber: selectedOrder.orderNumber,
      parts: selectedOrder.parts,
      finalCost: selectedOrder.finalCost,
      estimatedCost: selectedOrder.estimatedCost
    });

    if (!workName.trim()) {
      toast.error('Введите название работы');
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
      console.log('add work payload:', {
        selectedOrder: selectedOrder.id,
        workType,
        workName,
        workPrice,
        workQuantity,
        workWarrantyDays: parsedWarrantyDays,
        selectedPart
      });

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
        setWorkName('');
        setWorkPrice('');
        setWorkQuantity(1);
        setWorkWarrantyDays('30');
        setSelectedPart(null);
        setWorkType('work');
        setEditingWorkItemId(null);
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

      console.log('created workItem:', workItem);

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
      
      // Reset form
      setWorkName('');
      setWorkPrice('');
      setWorkQuantity(1);
      setWorkWarrantyDays('30');
      setSelectedPart(null);
      setWorkType('work');
      setEditingWorkItemId(null);
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
    const search = normalizePartField(partsSearchTerm);
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

  const quickPartExactMatch = inventoryParts.find((part) => {
    const normalizedName = normalizePartField(quickPartName);
    if (!normalizedName) {
      return false;
    }

    const partNameMatches = normalizePartField(part.name) === normalizedName;
    const categoryMatches = !normalizePartField(quickPartCategory) || normalizePartField(part.category) === normalizePartField(quickPartCategory);
    const brandMatches = !normalizePartField(quickPartBrand) || normalizePartField(part.brand) === normalizePartField(quickPartBrand);
    const modelMatches = !normalizePartField(quickPartModel) || normalizePartField(part.model) === normalizePartField(quickPartModel);

    return partNameMatches && categoryMatches && brandMatches && modelMatches;
  }) || inventoryParts.find((part) => normalizePartField(part.name) === normalizePartField(quickPartName)) || null;

  const quickPartRelatedParts = inventoryParts.filter((part) => {
    const normalizedName = normalizePartField(quickPartName);
    if (!normalizedName) {
      return true;
    }

    return normalizePartField(part.name) === normalizedName;
  });

  const quickPartNameOptions = Array.from(new Set(inventoryParts.map((part) => part.name).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'));
  const quickPartCategoryOptions = Array.from(
    new Set(
      [
        ...inventoryCategoryNames,
        ...(quickPartRelatedParts.length ? quickPartRelatedParts : inventoryParts)
          .map((part) => part.category)
          .filter(Boolean),
      ],
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  const quickPartBrandOptions = Array.from(
    new Set(
      (quickPartRelatedParts.length ? quickPartRelatedParts : inventoryParts)
        .map((part) => part.brand)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));
  const quickPartModelOptions = Array.from(
    new Set(
      (quickPartRelatedParts.length ? quickPartRelatedParts : inventoryParts)
        .filter((part) => !quickPartBrand.trim() || normalizePartField(part.brand) === normalizePartField(quickPartBrand))
        .map((part) => part.model)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ru'));

  const workTotalPreview = (Number(workPrice) || 0) * workQuantity;
  const selectedPartCost = selectedPart
    ? Number(selectedPart.wholesalePrice ?? selectedPart.price ?? 0)
    : 0;
  const partCostPreview = selectedPart ? selectedPartCost * workQuantity : 0;
  const marginPreview = Math.max(workTotalPreview - partCostPreview, 0);
  const protectionParts = React.useMemo(
    () =>
      inventoryParts.filter(
        (part) => (part.category || '').trim().toLowerCase() === 'защита экрана'
      ),
    [inventoryParts]
  );
  const selectedProtectionPart = React.useMemo(
    () => protectionParts.find((part) => part.id === protectionPartId) || null,
    [protectionParts, protectionPartId]
  );
  const quickSaleOptions = React.useMemo(
    () =>
      [...(crmSettings.orders.quickSaleOptions || [])]
        .filter((item) => item.enabled)
        .map((item) =>
          item.id === 'quick_sale_screen_protection'
            ? { ...item, label: 'Защита экрана' }
            : item.id === 'quick_sale_accessory'
              ? { ...item, label: 'Продать аксессуар' }
            : item
        )
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

    const normalizedCategory = activeQuickSaleOption.category.trim().toLowerCase();
    return inventoryParts.filter((part) => {
      const category = (part.category || '').trim().toLowerCase();
      const subcategory = (part.subcategory || '').trim().toLowerCase();
      return category === normalizedCategory || subcategory === normalizedCategory;
    });
  }, [inventoryParts, activeQuickSaleOption]);
  const selectedQuickSalePart = React.useMemo(
    () => availableQuickSaleParts.find((part) => part.id === quickSaleForm.partId) || null,
    [availableQuickSaleParts, quickSaleForm.partId]
  );

  useEffect(() => {
    if (!isSearchPartsDialogOpen) {
      return;
    }

    const trimmedSearch = partsSearchTerm.trim();
    if (!trimmedSearch) {
      return;
    }

    setQuickPartName((prev) => {
      if (!prev.trim() || normalizePartField(prev) === normalizePartField(partsSearchTerm)) {
        return trimmedSearch;
      }
      return prev;
    });
  }, [isSearchPartsDialogOpen, partsSearchTerm]);

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

  const previewRates = selectedOrder ? getOrderRoleRates(selectedOrder) : {
    technicianRate: 0,
    intakeRate: 0,
    deliveryRate: 0,
  };
  const previewEarningsRows = [
    {
      key: 'technician',
      label: 'Исполнитель',
      name: selectedOrder?.technicianName || 'Не назначен',
      rate: previewRates.technicianRate,
      amount: (marginPreview * previewRates.technicianRate) / 100,
    },
    {
      key: 'intake',
      label: 'Принял менеджер',
      name: selectedOrder?.intakeManagerName || 'Не назначен',
      rate: previewRates.intakeRate,
      amount: (marginPreview * previewRates.intakeRate) / 100,
    },
    {
      key: 'delivery',
      label: 'Выдает менеджер',
      name: selectedOrder?.deliveryManagerName || 'Не назначен',
      rate: previewRates.deliveryRate,
      amount: (marginPreview * previewRates.deliveryRate) / 100,
    },
  ];

  const workNameOptions = React.useMemo(
    () => Array.from(new Set([...commonWorkNames, ...customWorkNames])).sort((a, b) => a.localeCompare(b, 'ru')),
    [customWorkNames]
  );

  const rememberWorkName = React.useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized || commonWorkNames.some((name) => normalizePartField(name) === normalizePartField(normalized))) {
      return;
    }

    setCustomWorkNames((prev) => {
      if (prev.some((name) => normalizePartField(name) === normalizePartField(normalized))) {
        return prev;
      }

      const next = [...prev, normalized].sort((a, b) => a.localeCompare(b, 'ru'));
      localStorage.setItem(customWorkNamesStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleQuickReceivePart = async () => {
    const name = quickPartName.trim();
    const category = quickPartCategory.trim() || 'Прочее';
    const brand = quickPartBrand.trim() || 'Универсальная';
    const model = quickPartModel.trim() || 'Без модели';
    const wholesalePrice = Number(quickPartWholesalePrice);
    const unitPrice = wholesalePrice;
    const quantity = Number(quickPartQuantity);

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
        notificationsEnabled: true,
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
    setSelectedPart(uiPart);
    setWorkName(createdPart.name);
    setPartsSearchTerm(createdPart.name);
    setQuickPartName('');
    setQuickPartCategory('Прочее');
    setQuickPartBrand('');
    setQuickPartModel('');
    setQuickPartWholesalePrice('');
    setQuickPartQuantity(1);
    setIsQuickReceiveDialogOpen(false);
    setIsSearchPartsDialogOpen(false);
    toast.success(quickPartExactMatch ? 'Остаток существующей запчасти пополнен и позиция выбрана' : 'Запчасть оприходована и выбрана в работу');
  };

  // Delivery actions
  const handleDeliveryOrder = (order: Order) => {
    console.log('handleDeliveryOrder called with order:', order);
    setSelectedOrder(order);
    setPaymentAmount(getOrderDebt(order));
    setIsDeliveryDialogOpen(true);
    console.log('selectedOrder set:', order);
  };

  const handleTestingChecklistChange = (key: string, value: boolean) => {
    setTestingChecklist(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckAllTests = () => {
    setTestingChecklist({
      screenWorks: true,
      touchWorks: true,
      cameraWorks: true,
      soundWorks: true,
      chargingWorks: true,
      wifiWorks: true,
      bluetoothWorks: true,
      buttonsWork: true,
      fingerprintWorks: true,
      faceIdWorks: true
    });
    toast.success('Все тесты отмечены как пройденные');
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

  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return;

    try {
      // Validate checklist
      const allTestsPassed = Object.values(testingChecklist).every(test => test);
      if (!allTestsPassed) {
        toast.error('Не все тесты пройдены. Проверьте чек-лист перед выдачей.');
        return;
      }

      // Add optional extra services
      let additionalServices = [];
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
        } as OrderPart & { workType: string; workName: string });
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
        } as OrderPart & { workType: string; workName: string });
      }

      // Update order
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

      await orderService.updateOrder(selectedOrder.id, updatedOrder);
      await cashService.addOperation({
        type: 'income',
        amount: paymentAmount + (screenProtection ? 2000 : 0) + (cleaning ? 1000 : 0),
        description: `Выдача и оплата заказа ${selectedOrder.orderNumber}`,
        category: 'Ремонт',
        orderId: selectedOrder.orderNumber,
        processedBy: selectedOrder.deliveryManagerName || user?.name || 'Сотрудник',
        paymentMethod,
        registerType: paymentMethod === 'card' ? 'bank_terminal' : paymentMethod === 'transfer' ? 'online' : 'cashbox',
        source: 'order_payment',
        notes: [
          `Способ оплаты: ${paymentMethod}`,
          screenProtection ? 'Защита экрана' : '',
          cleaning ? 'Чистка устройства' : '',
        ].filter(Boolean).join(' • '),
      });
      setOrdersData(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));

      // Create work completion act
      await handleCreateWorkCompletionAct(updatedOrder);

      toast.success('Заказ успешно выдан клиенту');
      setIsDeliveryDialogOpen(false);
      
      // Reset UI state
      setTestingChecklist({
        screenWorks: false,
        touchWorks: false,
        cameraWorks: false,
        soundWorks: false,
        chargingWorks: false,
        wifiWorks: false,
        bluetoothWorks: false,
        buttonsWork: false,
        fingerprintWorks: false,
        faceIdWorks: false
      });
      setScreenProtection(false);
      setCleaning(false);
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
  const handleCreateAcceptanceAct = async (order: Order, client?: Client, device?: Device, formData?: any) => {
    try {
      // Use passed entities or build fallback from order
      const clientData = client || {
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
      };

      const deviceData = device || {
        id: order.deviceId,
        type: 'phone',
        brand: order.deviceBrand || '',
        model: order.deviceModel || '',
        serialNumber: order.deviceSerial,
        imei: order.deviceImei,
        color: order.deviceColor,
        condition: order.deviceCondition as any || 'good',
        externalCondition: order.deviceExternalCondition,
        clientId: order.clientId,
        createdAt: new Date().toISOString(),
      };

      const acceptanceAct = await documentService.createAcceptanceAct(
        order,
        clientData,
        deviceData,
        formData?.reasonForContact || order.description,
        formData?.estimatedPrice || order.estimatedCost,
        order.intakeManagerName || order.technicianName || user?.name || 'Сотрудник',
        formData?.conditions ||
          'Устройство принимается на бесплатную диагностику и ремонт.',
        Number(formData?.advancePayment || formData?.advance || formData?.prepayment || 0)
      );

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
      const client: Client = {
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
      };

      const device: Device = {
        id: order.deviceId,
        type: 'phone',
        brand: order.deviceBrand || '',
        model: order.deviceModel || '',
        serialNumber: order.deviceSerial,
        imei: order.deviceImei,
        color: order.deviceColor,
        condition: order.deviceCondition as any || 'good',
        externalCondition: order.deviceExternalCondition,
        clientId: order.clientId,
        createdAt: new Date().toISOString(),
      };

      // Build works list from order.parts
      const worksPerformed: WorkItem[] = [];
      const partsUsed: PartItem[] = [];
      
      if (order.parts && order.parts.length > 0) {
        order.parts.forEach((part) => {
          // Detect line type
          const workType = (part as any).workType;
          const workName = (part as any).workName;
          
          if (workType === 'work_with_part' || workType === 'work_only') {
            // Work line
            worksPerformed.push({
              id: part.id,
              name: workName || 'Работа',
              description: workName || 'Выполненная работа',
              cost: part.unitPrice,
              quantity: part.quantity,
              totalCost: part.totalPrice,
              warrantyDays: Number((part as any).warrantyDays || 30),
            });
          } else if (part.partId === 'screen_protection' || part.partId === 'cleaning') {
            // Extra service line
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
            // Regular part line (legacy format)
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
      
      // Fallback work if list is empty
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

      const workCompletionAct = await documentService.createWorkCompletionAct(
        order,
        client,
        device,
        worksPerformed,
        partsUsed, // used parts
        completionTotal, // sum only from act rows (no estimated cost)
        completionWarrantyDays,
        order.deliveryManagerName || order.technicianName || user?.name || 'Сотрудник'
      );

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
      let document: AcceptanceAct | WorkCompletionAct | null = null;
      
      if (type === 'acceptance') {
        document = await documentService.getAcceptanceActByOrderId(order.id);
      } else {
        document = await documentService.getWorkCompletionActByOrderId(order.id);
      }

      if (document) {
        setSelectedDocument(document);
        setDocumentType(type);
        setIsDocumentDialogOpen(true);
      } else {
        if (type === 'acceptance') {
          await handleCreateAcceptanceAct(order);
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

    if (!quickPaymentAmount || quickPaymentAmount <= 0) {
      toast.error('Укажите сумму оплаты');
      return;
    }

    try {
      await orderService.addPayment(selectedOrder.id, {
        amount: quickPaymentAmount,
        method: quickPaymentMethod,
        processedBy: user?.name || 'Сотрудник',
        notes: quickPaymentNotes,
      });

      let refreshedOrder = await orderService.getOrderById(selectedOrder.id);
      if (refreshedOrder && getOrderDebt(refreshedOrder) <= 0 && refreshedOrder.status !== cancelledStatusCode) {
        refreshedOrder = await orderService.updateOrder(refreshedOrder.id, {
          status: completedStatusCode,
          isPaid: true,
          completedAt: refreshedOrder.completedAt || new Date().toISOString(),
        });
      }

      if (refreshedOrder) {
        const paymentHistory = createHistoryEntry(
          'payment',
          `Платеж: ${quickPaymentAmount.toLocaleString('ru-RU')} ₽, способ: ${quickPaymentMethod}${quickPaymentNotes ? `, комментарий: ${quickPaymentNotes}` : ''}.`
        );
        const orderWithPaymentHistory = appendOrderHistory(refreshedOrder, [paymentHistory]);
        await orderService.updateOrder(orderWithPaymentHistory.id, orderWithPaymentHistory);
        setOrdersData((prev) => prev.map((order) => (order.id === orderWithPaymentHistory.id ? orderWithPaymentHistory : order)));
        setSelectedOrder(orderWithPaymentHistory);
        refreshedOrder = orderWithPaymentHistory;
      }

      await cashService.addOperation({
        type: 'income',
        amount: quickPaymentAmount,
        description: `Оплата заказа ${selectedOrder.orderNumber}`,
        category: 'Ремонт',
        orderId: selectedOrder.orderNumber,
        processedBy: user?.name || 'Сотрудник',
        paymentMethod: quickPaymentMethod,
        registerType:
          quickPaymentMethod === 'card'
            ? 'bank_terminal'
            : quickPaymentMethod === 'transfer'
              ? 'online'
              : 'cashbox',
        source: 'order_payment',
        notes: `Способ оплаты: ${quickPaymentMethod}${quickPaymentNotes ? ` • ${quickPaymentNotes}` : ''}`,
      });

      setIsPaymentDialogOpen(false);
      toast.success(
        refreshedOrder && refreshedOrder.status === completedStatusCode
          ? 'Оплата проведена, заказ закрыт'
          : 'Оплата добавлена и записана в журнал движения денег'
      );

      const orderForDocument = refreshedOrder || selectedOrder;
      if (orderForDocument) {
        await handleCreateWorkCompletionAct({
          ...orderForDocument,
          completedAt: orderForDocument.completedAt || new Date().toISOString(),
          status: orderForDocument.status === cancelledStatusCode ? orderForDocument.status : completedStatusCode,
          isPaid: getOrderDebt(orderForDocument) <= 0,
        });
      }
    } catch (error) {
      toast.error('Не удалось добавить оплату');
    }
  };

  const periodOrders = ordersData.filter((order) => isDateWithinRange(order.createdAt, periodFilter));

  const filteredOrders = periodOrders.filter((order) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const searchPhone = normalizePhoneForCompare(searchTerm);
    const matchesSearch =
      !searchValue ||
      order.orderNumber.toLowerCase().includes(searchValue) ||
      (order.clientName || '').toLowerCase().includes(searchValue) ||
      (order.clientPhone || '').toLowerCase().includes(searchValue) ||
      (searchPhone.length >= 3 && normalizePhoneForCompare(order.clientPhone).includes(searchPhone)) ||
      (order.deviceBrand || '').toLowerCase().includes(searchValue) ||
      (order.deviceModel || '').toLowerCase().includes(searchValue) ||
      (order.description || '').toLowerCase().includes(searchValue) ||
      (order.diagnosis || '').toLowerCase().includes(searchValue);

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    const matchesScope =
      filterScope === 'all' ||
      (filterScope === 'active' && isActiveOrder(order)) ||
      (filterScope === 'completed' && order.status === completedStatusCode) ||
      (filterScope === 'cancelled' && order.status === cancelledStatusCode) ||
      (filterScope === 'paid' && getOrderDebt(order) === 0 && getOrderTotal(order) > 0);

    return matchesSearch && matchesStatus && matchesPriority && matchesScope;
  }).sort((a, b) => {
    const aClosed = isFinalOrderStatus(a.status, crmSettings) ? 1 : 0;
    const bClosed = isFinalOrderStatus(b.status, crmSettings) ? 1 : 0;

    if (aClosed !== bClosed) {
      return aClosed - bClosed;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  React.useEffect(() => {
    setOrdersPage(0);
  }, [searchTerm, filterScope, filterStatus, filterPriority, periodFilter]);

  const defaultColumnWidths: Record<string, number> = {
    orderNumber: 120,
    clientName: 150,
    deviceInfo: 200,
    status: 170,
    priority: 120,
    estimatedCost: 120,
    createdAt: 150,
    actions: 350,
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

  const baseColumns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: 'Номер заказа',
      width: columnLayout.widths.orderNumber || defaultColumnWidths.orderNumber,
      renderHeader: () => renderResizableHeader('orderNumber', 'Номер заказа', 'center'),
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontWeight="700"
          color="primary.main"
          sx={{ cursor: 'pointer', width: '100%', textAlign: 'center' }}
        >
          {params.value}
        </Typography>
      ),
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
            {params.row.deviceSerial}
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
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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
              console.log('Клик по кнопке добавления работы в таблице, params.row:', params.row);
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
              console.log('Клик по кнопке выдачи заказа, params.row:', params.row);
              handleDeliveryOrder(params.row);
            }}
            title="Выдача заказа"
            sx={{ color: '#FF9800' }}
          >
            <LocalShipping />
          </IconButton>
        </Box>
      ),
    },
  ];

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
                  setPeriodFilter(defaultPeriodFilterValue('month'));
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
                startIcon={<CleaningServices />}
                onClick={openQuickCleaningDialog}
              >
                Чистка устройства
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
        <Box sx={{ bgcolor: '#fff' }}>
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
              <Box component="thead" sx={{ bgcolor: '#f8fafc' }}>
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
                        borderBottom: '1px solid rgba(15, 23, 42, 0.10)',
                        color: '#172033',
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
                {paginatedOrders.map((order) => (
                  <Box
                    component="tr"
                    key={order.id}
                    onClick={() => handleViewOrder(order)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(15, 23, 42, 0.025)',
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
                ))}
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
                <Typography variant="h6" gutterBottom>
                  Заказ {selectedOrder.orderNumber}
                </Typography>
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
                  {selectedOrder.description}
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
                    <p>Описание: ${escapePrintValue(selectedOrder.description)}</p>
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
        <DialogTitle>Оплата заказа</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">
                  Заказ {selectedOrder.orderNumber}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  К оплате: {getOrderDebt(selectedOrder).toLocaleString('ru-RU')} ₽
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
            Провести оплату
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
          },
        }}
      >
        <DialogTitle>Просмотр заказа</DialogTitle>
        <DialogContent dividers sx={{ overflow: 'hidden' }}>
          {selectedOrder && (
            <Box sx={{ mt: 0, height: '100%' }}>
              <Grid container spacing={2} alignItems="flex-start" sx={{ height: '100%' }}>
                <Grid item xs={12} md={4}>
                  <Card
                    sx={{
                      height: { md: 'calc(88vh - 64px)' },
                      minHeight: { xs: 320, md: 'calc(88vh - 64px)' },
                    }}
                  >
                    <CardContent sx={{ height: '100%', overflowY: 'auto' }}>
                      <Typography variant="h6" gutterBottom>История заказа</Typography>
                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="Комментарий для мастера / внутреннее примечание"
                            value={masterCommentText}
                            onChange={(e) => setMasterCommentText(e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button fullWidth variant="contained" onClick={handleAddMasterComment}>
                            Добавить в историю
                          </Button>
                        </Grid>
                      </Grid>
                      {(selectedOrder.communicationHistory || []).length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {[...(selectedOrder.communicationHistory || [])]
                            .slice()
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((entry) => (
                              <Card key={entry.id} variant="outlined">
                                <CardContent sx={{ py: 1.25 }}>
                                  <Typography variant="body2" fontWeight={700}>
                                    {getHistoryChannelLabel(entry.channel)} • {entry.author}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                    {new Date(entry.createdAt).toLocaleString('ru-RU')}
                                  </Typography>
                                  <Typography variant="body2">{entry.message}</Typography>
                                </CardContent>
                              </Card>
                            ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Пока нет записей. История будет появляться при изменениях заказа, оплатах, комментариях и сообщениях.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={8} sx={{ height: { md: 'calc(88vh - 64px)' } }}>
              <Box sx={{ height: '100%', overflowY: 'auto', pr: 1 }}>
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
                        <Chip
                          label={getStatusOption(selectedOrder.status).label}
                          size="small"
                          sx={{
                            bgcolor: getStatusOption(selectedOrder.status).color,
                            color: '#fff',
                            fontWeight: 700,
                          }}
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
                      <Typography variant="body2" color="text.secondary">
                        Стоимость: <strong>{getOrderTotal(selectedOrder).toLocaleString('ru-RU')} ₽</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Оплачено: <strong>{selectedOrder.isPaid ? 'Да' : 'Нет'}</strong>
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
                                <Typography variant="body2" fontWeight={700} sx={{ color: '#15803d', whiteSpace: 'nowrap' }}>
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
                                  <Button size="small" variant="outlined" startIcon={<WhatsApp />} onClick={() => handleWhatsAppClient(selectedOrder)} sx={{ color: '#25D366' }}>
                                    WhatsApp
                                  </Button>
                                  <Button size="small" variant="outlined" startIcon={<Telegram />} onClick={() => handleTelegramClient(selectedOrder)}>
                                    Telegram
                                  </Button>
                                </Stack>
                              </Stack>
                            </Grid>
                            <Grid item xs={12}>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button size="small" variant="outlined" startIcon={<Build />} onClick={() => handleAddWork(selectedOrder)}>
                                  Добавить работу
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
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<WhatsApp />}
                          onClick={() => handleWhatsAppClient(selectedOrder)}
                          sx={{ color: '#25D366', whiteSpace: 'nowrap' }}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Telegram />}
                          onClick={() => handleTelegramClient(selectedOrder)}
                          sx={{ color: '#0088cc', whiteSpace: 'nowrap' }}
                        >
                          Telegram
                        </Button>
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
                        Пароль: <strong>{(selectedOrder as any).devicePassword || 'Не указан'}</strong>
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
                    {selectedOrder.description || 'Описание не указано'}
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
                        const isAdditionalService =
                          part.partId === 'screen_protection' || part.partId === 'cleaning';
                        const isWorkItem =
                          (part as any).workType === 'work_with_part' || (part as any).workType === 'work_only';
                        const linkedPart = (part as any).partInfo;
                        const itemTitle = isAdditionalService
                          ? part.partId === 'screen_protection'
                            ? 'Защита экрана'
                            : 'Чистка устройства'
                          : isWorkItem
                            ? (part as any).workName
                            : linkedPart?.name || `Позиция #${index + 1}`;

                        return (
                          <Box
                            key={part.id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 2,
                              py: 1.5,
                              borderBottom: index < selectedOrder.parts!.length - 1 ? '1px solid #e0e0e0' : 'none'
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
                                  Тип: {(part as any).workType === 'work_with_part' ? 'Работа с запчастью' : 'Работа без запчасти'}
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
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Действия</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<Print />}
                      onClick={() => handleViewDocument(selectedOrder, 'acceptance')}
                    >
                      Печать акта приема-передачи
                    </Button>
                    {selectedOrder.status === completedStatusCode && (
                      <Button
                        variant="outlined"
                        startIcon={<Print />}
                        onClick={() => handleViewDocument(selectedOrder, 'completion')}
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
                    >
                      Редактировать заказ
                    </Button>
                  </Box>
                </CardContent>
              </Card>
              </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOrderViewDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCommunicationDialogOpen}
        onClose={() => setIsCommunicationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {communicationChannel === 'whatsapp' ? 'Чат WhatsApp в CRM' : 'Чат Telegram в CRM'}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 1 }}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {selectedOrder.clientName || 'Клиент'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Телефон: {formatPhone(selectedOrder.clientPhone) || 'Не указан'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Заказ: {selectedOrder.orderNumber}
                  </Typography>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={communicationChannel === 'whatsapp' ? 'contained' : 'outlined'}
                  startIcon={<WhatsApp />}
                  onClick={() => {
                    setCommunicationChannel('whatsapp');
                    setCommunicationMessage(buildCommunicationTemplate(selectedOrder, 'whatsapp'));
                  }}
                >
                  WhatsApp
                </Button>
                <Button
                  variant={communicationChannel === 'telegram' ? 'contained' : 'outlined'}
                  startIcon={<Telegram />}
                  onClick={() => {
                    setCommunicationChannel('telegram');
                    setCommunicationMessage(buildCommunicationTemplate(selectedOrder, 'telegram'));
                  }}
                >
                  Telegram
                </Button>
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={5}
                label="Сообщение клиенту"
                value={communicationMessage}
                onChange={(e) => setCommunicationMessage(e.target.value)}
                helperText="Сообщение сохраняется в карточке заказа и доступно сотрудникам внутри CRM"
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  История общения
                </Typography>
                {(selectedOrder.communicationHistory || []).length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[...(selectedOrder.communicationHistory || [])]
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <Card key={entry.id} variant="outlined">
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {getHistoryChannelLabel(entry.channel)} • {entry.author}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              {new Date(entry.createdAt).toLocaleString('ru-RU')}
                            </Typography>
                            <Typography variant="body2">{entry.message}</Typography>
                          </CardContent>
                        </Card>
                      ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Пока нет сохраненных сообщений по этому заказу.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCommunicationDialogOpen(false)}>Закрыть</Button>
          <Button
            variant="outlined"
            startIcon={communicationChannel === 'whatsapp' ? <WhatsApp /> : <Telegram />}
            disabled={!selectedOrder || !getExternalMessengerLink(selectedOrder, communicationChannel, communicationMessage)}
            onClick={() => {
              if (!selectedOrder) return;
              openExternalMessenger(selectedOrder, communicationChannel, communicationMessage);
            }}
          >
            {getExternalMessengerLabel(communicationChannel)}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCommunication}
          >
            Сохранить сообщение
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditOrderDialogOpen} onClose={() => setIsEditOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактирование заказа</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Информация о клиенте */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Информация о клиенте</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Имя клиента"
                    defaultValue={selectedOrder.clientName}
                    disabled
                    helperText="Имя клиента нельзя изменить из этого окна"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Телефон клиента"
                    defaultValue={selectedOrder.clientPhone}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, clientPhone: e.target.value } : null);
                    }}
                  />
                </Grid>

                {/* Информация об устройстве */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Информация об устройстве</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Бренд устройства"
                    defaultValue={selectedOrder.deviceBrand}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceBrand: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Модель устройства"
                    defaultValue={selectedOrder.deviceModel}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceModel: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Цвет устройства"
                    defaultValue={selectedOrder.deviceColor}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceColor: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="IMEI"
                    defaultValue={selectedOrder.deviceImei}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceImei: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Серийный номер"
                    defaultValue={selectedOrder.deviceSerial}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceSerial: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Пароль устройства"
                    defaultValue={(selectedOrder as any).devicePassword || ''}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, devicePassword: e.target.value } as any : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Внешний вид"
                    defaultValue={selectedOrder.deviceExternalCondition}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, deviceExternalCondition: e.target.value } : null);
                    }}
                  />
                </Grid>

                {/* Информация о заказе */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Информация о заказе</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Статус заказа</InputLabel>
                    <Select
                      value={selectedOrder.status}
                      label="Статус заказа"
                      onChange={(e) => {
                        setSelectedOrder(prev => prev ? { ...prev, status: e.target.value as any } : null);
                      }}
                    >
                      {orderStatusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Приоритет</InputLabel>
                    <Select
                      value={selectedOrder.priority}
                      label="Приоритет"
                      onChange={(e) => {
                        setSelectedOrder(prev => prev ? { ...prev, priority: e.target.value as any } : null);
                      }}
                    >
                      <MenuItem value="low">Низкий</MenuItem>
                      <MenuItem value="medium">Средний</MenuItem>
                      <MenuItem value="high">Высокий</MenuItem>
                      <MenuItem value="urgent">Срочный</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Исполнитель</InputLabel>
                    <Select
                      value={selectedOrder.technicianId || ''}
                      label="Исполнитель"
                      onChange={(e) => {
                        const technician = assigneeOptions.find((option) => option.id === e.target.value);
                        setSelectedOrder(prev => prev ? {
                          ...prev,
                          technicianId: e.target.value,
                          technicianName: technician?.name || '',
                        } : null);
                      }}
                    >
                      {assigneeOptions.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Менеджер приема</InputLabel>
                    <Select
                      value={selectedOrder.intakeManagerName || ''}
                      label="Менеджер приема"
                      onChange={(e) => {
                        setSelectedOrder(prev => prev ? { ...prev, intakeManagerName: e.target.value } : null);
                      }}
                    >
                      {assigneeOptions.map((option) => (
                        <MenuItem key={option.id} value={option.name}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Менеджер выдачи</InputLabel>
                    <Select
                      value={selectedOrder.deliveryManagerName || ''}
                      label="Менеджер выдачи"
                      onChange={(e) => {
                        setSelectedOrder(prev => prev ? { ...prev, deliveryManagerName: e.target.value } : null);
                      }}
                    >
                      {assigneeOptions.map((option) => (
                        <MenuItem key={option.id} value={option.name}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ориентировочная стоимость"
                    type="number"
                    defaultValue={selectedOrder.estimatedCost}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                    }}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, estimatedCost: Number(e.target.value) } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Финальная стоимость"
                    type="number"
                    defaultValue={selectedOrder.finalCost || ''}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                    }}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, finalCost: Number(e.target.value) } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Описание проблемы"
                    multiline
                    rows={3}
                    defaultValue={selectedOrder.description}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, description: e.target.value } : null);
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Диагностика"
                    multiline
                    rows={2}
                    defaultValue={selectedOrder.diagnosis}
                    onChange={(e) => {
                      setSelectedOrder(prev => prev ? { ...prev, diagnosis: e.target.value } : null);
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditOrderDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedOrder) {
                handleSaveOrderEdit(selectedOrder);
              }
            }}
          >
            Сохранить изменения
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Print />}
            onClick={() => {
              if (selectedOrder) {
                handleViewDocument(selectedOrder, 'acceptance');
              }
            }}
          >
            Печать акта
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Work Dialog */}
      <Dialog open={isAddWorkDialogOpen} onClose={() => setIsAddWorkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWorkItemId ? 'Редактировать работу' : 'Добавить работу'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Work title */}
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  options={workNameOptions}
                  value={workName}
                  onChange={(event, newValue) => {
                    setWorkName(newValue || '');
                  }}
                  onInputChange={(event, newInputValue) => {
                    setWorkName(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Название работы"
                      placeholder="Выберите из списка или введите свое название"
                      helperText="Выберите популярную работу или введите название вручную"
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <Box component="li" key={`${option}-${key}`} {...optionProps}>
                        <Typography variant="body1">{option}</Typography>
                      </Box>
                    );
                  }}
                />
              </Grid>

              {/* Attach part */}
              <Grid item xs={12}>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {editingWorkItemId ? 'Запчасть в работе' : 'Добавить запчасть к работе'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {editingWorkItemId
                      ? 'При редактировании цена и количество меняются без повторного списания склада.'
                      : 'Если работа требует запчасти, выберите ее из склада.'}
                  </Typography>
                  <Button
                    variant={selectedPart ? "contained" : "outlined"}
                    fullWidth
                    onClick={handleSearchParts}
                    disabled={Boolean(editingWorkItemId)}
                    startIcon={<Search />}
                    sx={{ mb: 1 }}
                  >
                    {selectedPart ? `Выбрана: ${selectedPart.name}` : 'Выбрать запчасть'}
                  </Button>
                  {selectedPart && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Цена запчасти: {selectedPart.price} ₽ • Остаток: {selectedPart.stock} шт.
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setSelectedPart(null)}
                        disabled={Boolean(editingWorkItemId)}
                        sx={{ mt: 1 }}
                      >
                        Убрать запчасть
                      </Button>
                    </Box>
                  )}
                </Card>
              </Grid>

              {/* Selected part */}
              {selectedPart && (
                <Grid item xs={12}>
                  <Card sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedPart.name}
                    </Typography>
                    <Typography variant="body2">
                      Категория: {selectedPart.category} | Бренд: {selectedPart.brand}
                    </Typography>
                    <Typography variant="body2">
                      Цена: {selectedPart.price} ₽ | На складе: {selectedPart.stock} шт.
                    </Typography>
                  </Card>
                </Grid>
              )}

              {/* Price */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Цена за единицу"
                  type="number"
                  value={workPrice}
                  onChange={(e) => setWorkPrice(e.target.value)}
                  helperText="Можно указать 0 ₽ для бесплатной работы"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" color="text.secondary">
                    Себестоимость запчасти: <strong>{partCostPreview.toLocaleString('ru-RU')} ₽</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Маржа по работе: <strong>{marginPreview.toLocaleString('ru-RU')} ₽</strong>
                  </Typography>
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
                    {previewEarningsRows.map((row) => (
                      <Box
                        key={row.key}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          mt: row.key === 'technician' ? 0 : 0.75,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {row.label}: <strong>{row.name}</strong> ({row.rate}%)
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#15803d', whiteSpace: 'nowrap' }}>
                          {row.amount.toLocaleString('ru-RU')} ₽
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Card>
              </Grid>

              {/* Quantity */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Количество"
                  type="number"
                  value={workQuantity}
                  onChange={(e) => setWorkQuantity(Number(e.target.value))}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={warrantyDayOptions}
                  value={workWarrantyDays}
                  inputValue={workWarrantyDays}
                  onChange={(_, value) => setWorkWarrantyDays(value ?? '')}
                  onInputChange={(_, value) => setWorkWarrantyDays(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label="Гарантия, дней"
                      type="number"
                      inputProps={{
                        ...params.inputProps,
                        min: 1,
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Total */}
              <Grid item xs={12}>
                <Card sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="h6" textAlign="center">
                    Итого: {workTotalPreview.toLocaleString('ru-RU')} ₽
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddWorkDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddWorkToOrder}
            disabled={!workName || !workPrice.trim() || Number(workPrice) < 0 || workQuantity <= 0 || Number(workWarrantyDays) <= 0}
          >
            {editingWorkItemId ? 'Сохранить' : 'Добавить работу'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Parts Dialog */}
      <Dialog open={isSearchPartsDialogOpen} onClose={() => setIsSearchPartsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle component="div">
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Typography variant="h6" fontWeight={700}>Поиск запчастей на складе</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setIsQuickReceiveDialogOpen(true)}>
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
                      sx={{
                        mb: 1.5,
                        cursor: 'pointer',
                        border: selectedPart?.id === part.id ? '2px solid #FF6B35' : '1px solid #e0e0e0',
                        '&:hover': { bgcolor: 'grey.50' }
                      }}
                      onClick={() => {
                        if (part.stock <= 0) {
                          setQuickPartName(part.name);
                          setQuickPartCategory(part.category || 'Прочее');
                          setQuickPartBrand(part.brand || '');
                          setQuickPartModel(part.model || '');
                          setQuickPartWholesalePrice(String((part.wholesalePrice ?? part.price) || ''));
                          setIsQuickReceiveDialogOpen(true);
                          return;
                        }

                        setSelectedPart(part);
                        setWorkName(part.name);
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
                      <Button sx={{ mt: 2 }} variant="contained" onClick={() => setIsQuickReceiveDialogOpen(true)}>
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

      <Dialog open={isQuickReceiveDialogOpen} onClose={() => setIsQuickReceiveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Быстрое оприходование</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Card sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Новая поставка на склад
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={quickPartNameOptions}
                    value={quickPartName}
                    onChange={(_, newValue) => {
                      const nextName = newValue || '';
                      setQuickPartName(nextName);
                      const matchedPart = inventoryParts.find((part) => normalizePartField(part.name) === normalizePartField(nextName));
                      if (matchedPart) {
                        setQuickPartCategory(matchedPart.category || 'Прочее');
                        setQuickPartBrand(matchedPart.brand || '');
                        setQuickPartModel(matchedPart.model || '');
                        setQuickPartWholesalePrice(String((matchedPart.wholesalePrice ?? matchedPart.unitPrice) || ''));
                      }
                    }}
                    onInputChange={(_, newInputValue) => {
                      setQuickPartName(newInputValue);
                      const matchedPart = inventoryParts.find((part) => normalizePartField(part.name) === normalizePartField(newInputValue));
                      if (matchedPart) {
                        setQuickPartCategory(matchedPart.category || 'Прочее');
                        setQuickPartBrand(matchedPart.brand || '');
                        setQuickPartModel(matchedPart.model || '');
                        setQuickPartWholesalePrice(String((matchedPart.wholesalePrice ?? matchedPart.unitPrice) || ''));
                      }
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth label="Название запчасти" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={quickPartCategoryOptions}
                    value={quickPartCategory}
                    onChange={(_, newValue) => setQuickPartCategory(newValue || '')}
                    onInputChange={(_, newInputValue) => setQuickPartCategory(newInputValue)}
                    renderInput={(params) => <TextField {...params} fullWidth label="Категория" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={quickPartBrandOptions}
                    value={quickPartBrand}
                    onChange={(_, newValue) => {
                      setQuickPartBrand(newValue || '');
                      if (quickPartName.trim()) {
                        const matchedPart = inventoryParts.find(
                          (part) =>
                            normalizePartField(part.name) === normalizePartField(quickPartName) &&
                            normalizePartField(part.brand) === normalizePartField(newValue || ''),
                        );
                        if (matchedPart) {
                          setQuickPartCategory(matchedPart.category || 'Прочее');
                          setQuickPartModel(matchedPart.model || '');
                          setQuickPartWholesalePrice(String((matchedPart.wholesalePrice ?? matchedPart.unitPrice) || ''));
                        }
                      }
                    }}
                    onInputChange={(_, newInputValue) => setQuickPartBrand(newInputValue)}
                    renderInput={(params) => <TextField {...params} fullWidth label="Бренд" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={quickPartModelOptions}
                    value={quickPartModel}
                    onChange={(_, newValue) => setQuickPartModel(newValue || '')}
                    onInputChange={(_, newInputValue) => setQuickPartModel(newInputValue)}
                    renderInput={(params) => <TextField {...params} fullWidth label="Модель" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Оптовая цена, ₽" type="number" value={quickPartWholesalePrice} onChange={(e) => setQuickPartWholesalePrice(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Количество, шт." type="number" inputProps={{ min: 1 }} value={quickPartQuantity} onChange={(e) => setQuickPartQuantity(Number(e.target.value) || 1)} />
                </Grid>
                <Grid item xs={12}>
                  {quickPartExactMatch && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Будет пополнена существующая позиция: <strong>{quickPartExactMatch.name}</strong>
                      {' '}• остаток сейчас {quickPartExactMatch.quantity} шт.
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleQuickReceivePart}
                    disabled={!quickPartName.trim() || Number(quickPartWholesalePrice) <= 0 || quickPartQuantity <= 0}
                  >
                    Оприходовать и выбрать
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsQuickReceiveDialogOpen(false)}>Отмена</Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Order Dialog */}
      <Dialog open={isDeliveryDialogOpen} onClose={() => setIsDeliveryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Выдача заказа клиенту</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Информация о заказе */}
                <Grid item xs={12}>
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Заказ {selectedOrder.orderNumber}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            Клиент: <strong>{selectedOrder.clientName}</strong>
                          </Typography>
                          <Typography variant="body2">
                            Телефон: <strong>{formatPhone(selectedOrder.clientPhone)}</strong>
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            Устройство: <strong>{selectedOrder.deviceBrand} {selectedOrder.deviceModel}</strong>
                          </Typography>
                            <Typography variant="body2">
                              Стоимость: <strong>{getOrderTotal(selectedOrder).toLocaleString('ru-RU')} ₽</strong>
                            </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Список работ и запчастей */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Выполненные работы</Typography>
                  <Card>
                    <CardContent>
                      {selectedOrder.parts && selectedOrder.parts.length > 0 ? (
                        <Box>
                          {selectedOrder.parts.map((part, index) => (
                            <Box key={part.id} sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              py: 1,
                              borderBottom: index < selectedOrder.parts!.length - 1 ? '1px solid #e0e0e0' : 'none'
                            }}>
                              <Box>
                                <Typography variant="body1">
                                  {part.partId === 'screen_protection' ? 'Защита экрана' :
                                   part.partId === 'cleaning' ? 'Чистка устройства' :
                                   (part as any).workType === 'work_with_part' ? `${(part as any).workName}` :
                                   (part as any).workType === 'work_only' ? `${(part as any).workName}` :
                                   `Работа #${index + 1}`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Количество: {part.quantity} • Цена работы: {part.unitPrice.toLocaleString('ru-RU')} ₽
                                  {(part as any).partInfo && (
                                    <span>
                                      <br />
                                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        Запчасть: {(part as any).partInfo.name} 
                                        {userRole === 'employee' ? (
                                          <span style={{ color: '#FF6B35', fontWeight: 'bold' }}>
                                            {' '}({(part as any).partInfo.price?.toLocaleString('ru-RU')} ₽)
                                          </span>
                                        ) : (
                                          <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}>
                                            {' '}(включено в стоимость работы)
                                          </span>
                                        )}
                                      </Typography>
                                    </span>
                                  )}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" color="primary">
                                  {part.totalPrice.toLocaleString('ru-RU')} ₽
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemovePart(part.id)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                          <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid #FF6B35' }}>
                            <Typography variant="h6" textAlign="right">
                              Итого: {selectedOrder.parts.reduce((sum, part) => sum + part.totalPrice, 0).toLocaleString('ru-RU')} ₽
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Работы и запчасти еще не добавлены
                        </Typography>
                      )}
                      
                      <Button
                        variant="outlined"
                        startIcon={<Build />}
                        onClick={() => {
                          console.log('Клик по кнопке добавления работы, selectedOrder:', selectedOrder);
                          if (selectedOrder) {
                            setIsDeliveryDialogOpen(false);
                            handleAddWork(selectedOrder);
                          } else {
                            toast.error('Заказ не выбран. Попробуйте еще раз.');
                          }
                        }}
                        sx={{ mt: 2 }}
                      >
                        Добавить работу
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Чек-лист тестирования */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Чек-лист тестирования</Typography>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleCheckAllTests}
                      sx={{
                        background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                        boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
                        }
                      }}
                    >
                      Проверил все
                    </Button>
                  </Box>
                  <Card>
                    <CardContent>
                      <Grid container spacing={2}>
                        {[
                          { key: 'screenWorks', label: 'Экран работает корректно' },
                          { key: 'touchWorks', label: 'Сенсорный экран реагирует' },
                          { key: 'cameraWorks', label: 'Камера работает' },
                          { key: 'soundWorks', label: 'Звук работает' },
                          { key: 'chargingWorks', label: 'Зарядка работает' },
                          { key: 'wifiWorks', label: 'Wi-Fi работает' },
                          { key: 'bluetoothWorks', label: 'Bluetooth работает' },
                          { key: 'buttonsWork', label: 'Кнопки работают' },
                          { key: 'fingerprintWorks', label: 'Отпечаток пальца работает' },
                          { key: 'faceIdWorks', label: 'Face ID работает' }
                        ].map((test) => (
                          <Grid item xs={12} md={6} key={test.key}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={testingChecklist[test.key as keyof typeof testingChecklist]}
                                onChange={(e) => handleTestingChecklistChange(test.key, e.target.checked)}
                                style={{ marginRight: 8 }}
                              />
                              <Typography variant="body2">{test.label}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Дополнительные услуги */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Дополнительные услуги</Typography>
                  <Card>
                    <CardContent>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={screenProtection ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<Security />}
                            onClick={() => setScreenProtection(!screenProtection)}
                            sx={{
                              height: 60,
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              background: screenProtection 
                                ? 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)'
                                : 'transparent',
                              borderColor: '#FF6B35',
                              color: screenProtection ? 'white' : '#FF6B35',
                              boxShadow: screenProtection 
                                ? '0 3px 5px 2px rgba(255, 107, 53, .3)'
                                : 'none',
                              '&:hover': {
                                background: screenProtection 
                                  ? 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)'
                                  : 'rgba(255, 107, 53, 0.1)',
                                borderColor: '#E64A19',
                              }
                            }}
                          >
                            Защита экрана
                            <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                              +2000 ₽
                            </Typography>
                          </Button>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={cleaning ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<CleaningServices />}
                            onClick={() => setCleaning(!cleaning)}
                            sx={{
                              height: 60,
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              background: cleaning 
                                ? 'linear-gradient(45deg, #2196F3 30%, #42A5F5 90%)'
                                : 'transparent',
                              borderColor: '#2196F3',
                              color: cleaning ? 'white' : '#2196F3',
                              boxShadow: cleaning 
                                ? '0 3px 5px 2px rgba(33, 150, 243, .3)'
                                : 'none',
                              '&:hover': {
                                background: cleaning 
                                  ? 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)'
                                  : 'rgba(33, 150, 243, 0.1)',
                                borderColor: '#1976D2',
                              }
                            }}
                          >
                            Чистка устройства
                            <Typography variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                              +1000 ₽
                            </Typography>
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Оплата */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Оплата</Typography>
                  <Card>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Способ оплаты</InputLabel>
                            <Select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value as any)}
                            >
                              <MenuItem value="cash">Наличные</MenuItem>
                              <MenuItem value="card">Банковская карта</MenuItem>
                              <MenuItem value="online">Онлайн перевод</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Сумма к оплате"
                            type="number"
                            value={paymentAmount + (screenProtection ? 2000 : 0) + (cleaning ? 1000 : 0)}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeliveryDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCompleteDelivery}
            disabled={!Object.values(testingChecklist).every(test => test)}
            startIcon={<LocalShipping />}
          >
            Выдать заказ клиенту
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step-by-step order creation dialog */}
      <Dialog open={isStepByStepOrderOpen} onClose={() => setIsStepByStepOrderOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle component="div">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Создание заказа · шаг {currentStep + 1} из 4</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[0, 1, 2, 3].map((step) => (
                <Box
                  key={step}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: step <= currentStep ? '#FF6B35' : '#e0e0e0',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Step 1: client */}
            {currentStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Информация о клиенте
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ФИО клиента"
                      value={newOrderData.clientName}
                      onChange={(e) => handleStepDataChange('clientName', e.target.value)}
                      placeholder="Например: Иванов Иван Иванович"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Телефон"
                      value={newOrderData.clientPhone}
                      onChange={(e) => handleStepDataChange('clientPhone', e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email (необязательно)"
                      value={newOrderData.clientEmail}
                      onChange={(e) => handleStepDataChange('clientEmail', e.target.value)}
                      placeholder="client@example.com"
                      type="email"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Заметка по клиенту"
                      value={newOrderData.clientNotes}
                      onChange={(e) => handleStepDataChange('clientNotes', e.target.value)}
                      placeholder="Например: предпочитает звонок, забирает вечером, есть особые договоренности"
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 2: device */}
            {currentStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Информация об устройстве
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Тип устройства</InputLabel>
                      <Select
                        value={newOrderData.deviceType}
                        onChange={(e) => {
                          handleStepDataChange('deviceType', e.target.value);
                          handleStepDataChange('deviceModel', '');
                          handleStepDataChange('deviceBrand', '');
                        }}
                      >
                        <MenuItem value="phone">Телефон</MenuItem>
                        <MenuItem value="tablet">Планшет</MenuItem>
                        <MenuItem value="laptop">Ноутбук</MenuItem>
                        <MenuItem value="desktop">Компьютер</MenuItem>
                        <MenuItem value="other">Другое</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      freeSolo
                      options={deviceModelOptions}
                      value={newOrderData.deviceModel}
                      onChange={(event, newValue) => {
                        handleStepDataChange('deviceModel', newValue || '');
                        rememberDeviceModel(newOrderData.deviceType, newValue || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        handleStepDataChange('deviceModel', newInputValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Модель"
                          placeholder="Например: Honor 10i, Apple MacBook Air"
                          required
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...optionProps } = props;
                        return (
                          <Box component="li" key={`${option}-${key}`} {...optionProps}>
                            <Typography variant="body1">{option}</Typography>
                          </Box>
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Цвет"
                      value={newOrderData.deviceColor}
                      onChange={(e) => handleStepDataChange('deviceColor', e.target.value)}
                      placeholder="Черный, белый, синий..."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Серийный номер"
                      value={newOrderData.deviceSerial}
                      onChange={(e) => handleStepDataChange('deviceSerial', e.target.value)}
                      placeholder="ABC123456"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="IMEI / идентификатор"
                      value={newOrderData.deviceImei}
                      onChange={(e) => handleStepDataChange('deviceImei', e.target.value)}
                      placeholder="123456789012345"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Пароль устройства"
                      value={newOrderData.devicePassword}
                      onChange={(e) => handleStepDataChange('devicePassword', e.target.value)}
                      placeholder="PIN / пароль / графический ключ"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Состояние устройства</InputLabel>
                      <Select
                        value={newOrderData.deviceCondition}
                        onChange={(e) => handleStepDataChange('deviceCondition', e.target.value)}
                      >
                        <MenuItem value="excellent">Отличное</MenuItem>
                        <MenuItem value="good">Хорошее</MenuItem>
                        <MenuItem value="fair">Удовлетворительное</MenuItem>
                        <MenuItem value="poor">Плохое</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Внешние дефекты"
                      value={newOrderData.deviceExternalCondition}
                      onChange={(e) => handleStepDataChange('deviceExternalCondition', e.target.value)}
                      placeholder="Сколы, потертости, трещины..."
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 3: issue */}
            {currentStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Описание проблемы
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Autocomplete
                      freeSolo
                      options={commonDiagnoses}
                      value={newOrderData.diagnosis}
                      onChange={(event, newValue) => {
                        handleStepDataChange('diagnosis', newValue || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        handleStepDataChange('diagnosis', newInputValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Предварительный диагноз"
                          placeholder="Выберите из списка или введите свой диагноз"
                          required
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...optionProps } = props;
                        return (
                          <Box component="li" key={`${option}-${key}`} {...optionProps}>
                            <Typography variant="body1">{option}</Typography>
                          </Box>
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Комментарий для сотрудников
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (видно только сотрудникам)
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      label="Внутренние заметки"
                      value={newOrderData.staffComments}
                      onChange={(e) => handleStepDataChange('staffComments', e.target.value)}
                      placeholder="Детали для мастера и менеджеров: симптомы, договоренности, особые условия..."
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Приоритет заказа</InputLabel>
                      <Select
                        value={newOrderData.priority}
                        onChange={(e) => handleStepDataChange('priority', e.target.value)}
                      >
                        <MenuItem value="low">Низкий</MenuItem>
                        <MenuItem value="medium">Средний</MenuItem>
                        <MenuItem value="high">Высокий</MenuItem>
                        <MenuItem value="urgent">Срочный</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 4: price and schedule */}
            {currentStep === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Стоимость и сроки
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Ориентировочная стоимость"
                      type="number"
                      value={newOrderData.estimatedCost}
                      onChange={(e) => handleStepDataChange('estimatedCost', Number(e.target.value))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                      }}
                      helperText="Предварительная стоимость ремонта"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Аванс клиента"
                      type="number"
                      value={newOrderData.advancePayment}
                      onChange={(e) => handleStepDataChange('advancePayment', Math.max(0, Number(e.target.value) || 0))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                      }}
                      helperText="Будет указан в акте приема"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Срок выполнения, дней"
                      type="number"
                      value={newOrderData.estimatedDays}
                      onChange={(e) => handleStepDataChange('estimatedDays', Number(e.target.value))}
                      inputProps={{ min: 1, max: 30 }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Исполнитель</InputLabel>
                      <Select
                        value={newOrderData.technicianId}
                        label="Исполнитель"
                        onChange={(e) => {
                          const technician = assigneeOptions.find((option) => option.id === e.target.value);
                          handleStepDataChange('technicianId', e.target.value);
                          handleStepDataChange('technicianName', technician?.name || '');
                        }}
                      >
                        {assigneeOptions.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Менеджер приема</InputLabel>
                      <Select
                        value={newOrderData.intakeManagerName}
                        label="Менеджер приема"
                        onChange={(e) => handleStepDataChange('intakeManagerName', e.target.value)}
                      >
                        {assigneeOptions.map((option) => (
                          <MenuItem key={option.id} value={option.name}>
                            {option.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Менеджер выдачи</InputLabel>
                      <Select
                        value={newOrderData.deliveryManagerName}
                        label="Менеджер выдачи"
                        onChange={(e) => handleStepDataChange('deliveryManagerName', e.target.value)}
                      >
                        {assigneeOptions.map((option) => (
                          <MenuItem key={option.id} value={option.name}>
                            {option.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                   
                  {/* Extra services */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Дополнительные услуги
                    </Typography>
                    <Card sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={newOrderData.offerProtection ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<Security />}
                            onClick={() => handleStepDataChange('offerProtection', !newOrderData.offerProtection)}
                            sx={{
                              height: 60,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              background: newOrderData.offerProtection 
                                ? 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)'
                                : 'transparent',
                              borderColor: '#FF6B35',
                              color: newOrderData.offerProtection ? 'white' : '#FF6B35',
                              boxShadow: newOrderData.offerProtection 
                                ? '0 3px 5px 2px rgba(255, 107, 53, .3)'
                                : 'none',
                              '&:hover': {
                                background: newOrderData.offerProtection 
                                  ? 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)'
                                  : 'rgba(255, 107, 53, 0.1)',
                                borderColor: '#E64A19',
                              }
                            }}
                          >
                            Предложить защиту экрана
                          </Button>
                          {newOrderData.offerProtection && (
                            <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Пленка / стекло со склада</InputLabel>
                                <Select
                                  label="Пленка / стекло со склада"
                                  value={protectionPartId}
                                  onChange={(e) => setProtectionPartId(e.target.value)}
                                >
                                  <MenuItem value="">Выберите позицию</MenuItem>
                                  {protectionParts.map((part) => (
                                    <MenuItem key={part.id} value={part.id}>
                                      {part.name} • {Number(part.unitPrice || 0).toLocaleString('ru-RU')} ₽ • остаток {part.quantity}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label="Цена поклейки"
                                value={protectionInstallPrice}
                                onChange={(e) => setProtectionInstallPrice(Number(e.target.value) || 0)}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                                }}
                              />
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant={newOrderData.offerCleaning ? "contained" : "outlined"}
                            fullWidth
                            startIcon={<CleaningServices />}
                            onClick={() => handleStepDataChange('offerCleaning', !newOrderData.offerCleaning)}
                            sx={{
                              height: 60,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              background: newOrderData.offerCleaning 
                                ? 'linear-gradient(45deg, #2196F3 30%, #42A5F5 90%)'
                                : 'transparent',
                              borderColor: '#2196F3',
                              color: newOrderData.offerCleaning ? 'white' : '#2196F3',
                              boxShadow: newOrderData.offerCleaning 
                                ? '0 3px 5px 2px rgba(33, 150, 243, .3)'
                                : 'none',
                              '&:hover': {
                                background: newOrderData.offerCleaning 
                                  ? 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)'
                                  : 'rgba(33, 150, 243, 0.1)',
                                borderColor: '#1976D2',
                              }
                            }}
                          >
                            Предложить чистку устройства
                          </Button>
                          {newOrderData.offerCleaning && (
                            <TextField
                              sx={{ mt: 1.5 }}
                              size="small"
                              fullWidth
                              type="number"
                              label="Цена чистки"
                              value={cleaningServicePrice}
                              onChange={(e) => setCleaningServicePrice(Number(e.target.value) || 0)}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                              }}
                            />
                          )}
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" gutterBottom>
                        Сводка заказа
                      </Typography>
                      <Typography variant="body2">
                        <strong>Клиент:</strong> {newOrderData.clientName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Телефон:</strong> {newOrderData.clientPhone}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Устройство:</strong> {newOrderData.deviceBrand} {newOrderData.deviceModel}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Диагноз:</strong> {newOrderData.diagnosis}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Стоимость:</strong> {newOrderData.estimatedCost} ₽
                      </Typography>
                      <Typography variant="body2">
                        <strong>Аванс:</strong> {Number(newOrderData.advancePayment || 0).toLocaleString('ru-RU')} ₽
                      </Typography>
                      <Typography variant="body2">
                        <strong>Срок:</strong> {newOrderData.estimatedDays} дн.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Исполнитель:</strong> {newOrderData.technicianName || 'Не назначен'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Принял менеджер:</strong> {newOrderData.intakeManagerName || 'Не назначен'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Выдает менеджер:</strong> {newOrderData.deliveryManagerName || 'Не назначен'}
                      </Typography>
                      {newOrderData.offerProtection && selectedProtectionPart && (
                        <Typography variant="body2" color="primary">
                          <strong>+ Защита экрана:</strong> {(Number(selectedProtectionPart.unitPrice || 0) + Number(protectionInstallPrice || 0)).toLocaleString('ru-RU')} ₽
                        </Typography>
                      )}
                      {newOrderData.offerCleaning && (
                        <Typography variant="body2" color="primary">
                          <strong>+ Чистка устройства:</strong> {Number(cleaningServicePrice || 0).toLocaleString('ru-RU')} ₽
                        </Typography>
                      )}
                      <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
                        <strong>
                          Итого: {(
                            Number(newOrderData.estimatedCost || 0) +
                            (newOrderData.offerProtection && selectedProtectionPart
                              ? Number(selectedProtectionPart.unitPrice || 0) + Number(protectionInstallPrice || 0)
                              : 0) +
                            (newOrderData.offerCleaning ? Number(cleaningServicePrice || 0) : 0)
                          ).toLocaleString('ru-RU')} ₽
                        </strong>
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsStepByStepOrderOpen(false)}>
            Отмена
          </Button>
          {currentStep > 0 && (
            <Button onClick={handlePrevStep}>
              Назад
            </Button>
          )}
          {currentStep < 3 ? (
            <Button 
              variant="contained" 
              onClick={handleNextStep}
              disabled={
                (currentStep === 0 && (!newOrderData.clientName || !newOrderData.clientPhone)) ||
                (currentStep === 1 && !newOrderData.deviceModel) ||
                (currentStep === 2 && !newOrderData.diagnosis)
              }
            >
              Далее
            </Button>
          ) : (
              <Button 
                variant="contained" 
                onClick={handleCreateOrderFromSteps}
                disabled={!newOrderData.estimatedDays || newOrderData.estimatedDays < 1}
                sx={{
                  background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                  boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
                }
              }}
            >
              Новый заказ
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={isPriceDialogOpen}
        onClose={closePriceListDialog}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            Прайс работ
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Цены указаны по модели устройства с учетом запчасти и работы. Ориентир: Екатеринбург.
            </Typography>
          </Box>
          {canEditPriceList && (
            <Button
              variant={isPriceEditMode ? 'contained' : 'outlined'}
              startIcon={<Edit />}
              onClick={() => setIsPriceEditMode((value) => !value)}
              sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
            >
              {isPriceEditMode ? 'Завершить редактирование' : 'Редактировать'}
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <TextField
              fullWidth
              label="Поиск"
              value={priceSearch}
              onChange={(event) => setPriceSearch(event.target.value)}
              placeholder="Модель, работа или запчасть"
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setIsPriceFilterOpen((value) => !value)}
              sx={{ minWidth: 140 }}
            >
              Фильтр
            </Button>
          </Box>

          {isPriceFilterOpen && (
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Тип устройства</InputLabel>
                  <Select
                    value={priceDeviceType}
                    label="Тип устройства"
                    onChange={(event) => {
                      setPriceDeviceType(event.target.value);
                      setPriceBrand('all');
                      setPriceModel('all');
                    }}
                  >
                    <MenuItem value="all">Все</MenuItem>
                    {deviceTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {deviceTypeLabels[type] || type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Бренд</InputLabel>
                  <Select
                    value={priceBrand}
                    label="Бренд"
                    onChange={(event) => {
                      setPriceBrand(event.target.value);
                      setPriceModel('all');
                    }}
                  >
                    <MenuItem value="all">Все бренды</MenuItem>
                    {priceBrandOptions.map((brand) => (
                      <MenuItem key={brand} value={brand}>
                        {brand}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Модель</InputLabel>
                  <Select value={priceModel} label="Модель" onChange={(event) => setPriceModel(event.target.value)}>
                    <MenuItem value="all">Все модели</MenuItem>
                    {priceModelOptions.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {isPriceEditMode && canEditPriceList && (
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Тип</InputLabel>
                    <Select
                      value={newPriceItem.deviceType}
                      label="Тип"
                      onChange={(event) => setNewPriceItem((prev) => ({ ...prev, deviceType: event.target.value }))}
                    >
                      {deviceTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {deviceTypeLabels[type] || type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Модель"
                    value={newPriceItem.model}
                    onChange={(event) => setNewPriceItem((prev) => ({ ...prev, model: event.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Работа"
                    value={newPriceItem.workName}
                    onChange={(event) => setNewPriceItem((prev) => ({ ...prev, workName: event.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Запчасть"
                    value={newPriceItem.partName}
                    onChange={(event) => setNewPriceItem((prev) => ({ ...prev, partName: event.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Запчасть"
                    value={newPriceItem.partCost}
                    onChange={(event) => setNewPriceItem((prev) => ({ ...prev, partCost: Number(event.target.value) || 0 }))}
                  />
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Работа"
                    value={newPriceItem.workCost}
                    onChange={(event) => setNewPriceItem((prev) => ({ ...prev, workCost: Number(event.target.value) || 0 }))}
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <Button fullWidth variant="contained" onClick={addPriceItem}>
                    Добавить
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: 2 }}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1,
                maxHeight: '62vh',
                overflow: 'auto',
              }}
            >
              <Button
                fullWidth
                variant={priceDeviceType === 'all' && priceBrand === 'all' && priceModel === 'all' ? 'contained' : 'text'}
                onClick={() => {
                  setPriceDeviceType('all');
                  setPriceBrand('all');
                  setPriceModel('all');
                }}
                sx={{ justifyContent: 'space-between', mb: 0.75 }}
              >
                Все устройства
                <Chip size="small" label={priceList.length} />
              </Button>
              {priceTree.map((typeGroup) => (
                <Box key={typeGroup.type} sx={{ mb: 0.75 }}>
                  <Button
                    fullWidth
                    variant={priceDeviceType === typeGroup.type && priceBrand === 'all' && priceModel === 'all' ? 'contained' : 'text'}
                    onClick={() => {
                      setPriceDeviceType(typeGroup.type);
                      setPriceBrand('all');
                      setPriceModel('all');
                    }}
                    sx={{ justifyContent: 'space-between', fontWeight: 800 }}
                  >
                    {deviceTypeLabels[typeGroup.type] || typeGroup.type}
                    <Chip size="small" label={typeGroup.total} />
                  </Button>
                  {typeGroup.brands.map((brandGroup) => (
                    <Box key={`${typeGroup.type}_${brandGroup.brand}`} sx={{ pl: 1.25 }}>
                      <Button
                        fullWidth
                        size="small"
                        variant={priceDeviceType === typeGroup.type && priceBrand === brandGroup.brand && priceModel === 'all' ? 'outlined' : 'text'}
                        onClick={() => {
                          setPriceDeviceType(typeGroup.type);
                          setPriceBrand(brandGroup.brand);
                          setPriceModel('all');
                        }}
                        sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                      >
                        {brandGroup.brand}
                        <Chip size="small" label={brandGroup.total} />
                      </Button>
                      {priceDeviceType === typeGroup.type && priceBrand === brandGroup.brand && (
                        <Box sx={{ pl: 1.25 }}>
                          {brandGroup.models.map((model) => (
                            <Button
                              key={model}
                              fullWidth
                              size="small"
                              variant={priceModel === model ? 'contained' : 'text'}
                              onClick={() => setPriceModel(model)}
                              sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}
                            >
                              {model}
                            </Button>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>

            <Box sx={{ maxHeight: '62vh', overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: isPriceEditMode ? 1050 : 900 }}>
              <Box component="thead" sx={{ bgcolor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                <Box component="tr">
                  {['Тип', 'Модель', 'Работа', 'Запчасть', 'Цена запчасти', 'Цена работы', 'Итого', isPriceEditMode ? '' : null].filter(Boolean).map((header) => (
                    <Box
                      key={header}
                      component="th"
                      sx={{ p: 1.25, textAlign: 'left', borderBottom: '1px solid', borderColor: 'divider', fontSize: 13 }}
                    >
                      {header}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {filteredPriceList.map((item) => {
                  const total = Number(item.partCost || 0) + Number(item.workCost || 0);
                  return (
                    <Box component="tr" key={item.id}>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {deviceTypeLabels[item.deviceType] || item.deviceType}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 190 }}>
                        {isPriceEditMode && canEditPriceList ? (
                          <TextField size="small" value={item.model} onChange={(event) => updatePriceItem(item.id, { model: event.target.value })} />
                        ) : (
                          item.model
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 210 }}>
                        {isPriceEditMode && canEditPriceList ? (
                          <TextField size="small" value={item.workName} onChange={(event) => updatePriceItem(item.id, { workName: event.target.value })} />
                        ) : (
                          item.workName
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 180 }}>
                        {isPriceEditMode && canEditPriceList ? (
                          <TextField size="small" value={item.partName} onChange={(event) => updatePriceItem(item.id, { partName: event.target.value })} />
                        ) : (
                          item.partName || '-'
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', width: 130 }}>
                        {isPriceEditMode && canEditPriceList ? (
                          <TextField
                            size="small"
                            type="number"
                            value={item.partCost}
                            onChange={(event) => updatePriceItem(item.id, { partCost: Number(event.target.value) || 0 })}
                          />
                        ) : (
                          `${Number(item.partCost || 0).toLocaleString('ru-RU')} ₽`
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', width: 130 }}>
                        {isPriceEditMode && canEditPriceList ? (
                          <TextField
                            size="small"
                            type="number"
                            value={item.workCost}
                            onChange={(event) => updatePriceItem(item.id, { workCost: Number(event.target.value) || 0 })}
                          />
                        ) : (
                          `${Number(item.workCost || 0).toLocaleString('ru-RU')} ₽`
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 800, color: 'primary.main' }}>
                        {total.toLocaleString('ru-RU')} ₽
                      </Box>
                      {isPriceEditMode && (
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', width: 52 }}>
                          {canEditPriceList && (
                            <IconButton size="small" color="error" onClick={() => deletePriceItem(item.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Показано {filteredPriceList.length} строк. Используйте фильтры или поиск, чтобы быстрее найти нужную модель и работу.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePriceListDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isQuickSaleDialogOpen}
        onClose={() => {
          setIsQuickSaleDialogOpen(false);
          setActiveQuickSaleId('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{activeQuickSaleOption?.label || 'Быстрая продажа'}</DialogTitle>
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
            Провести продажу
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isQuickCleaningDialogOpen}
        onClose={() => setIsQuickCleaningDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Чистка устройства</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Цена чистки"
                value={quickCleaningForm.salePrice}
                onChange={(e) => setQuickCleaningForm((prev) => ({ ...prev, salePrice: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">₽</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Оплата</InputLabel>
                <Select
                  value={quickCleaningForm.paymentMethod}
                  label="Оплата"
                  onChange={(e) => setQuickCleaningForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  {enabledPaymentMethods.map((method) => (
                    <MenuItem key={method.code} value={method.code}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Комментарий"
                value={quickCleaningForm.note}
                onChange={(e) => setQuickCleaningForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsQuickCleaningDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreateQuickCleaning}>
            Провести
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
      <DocumentGenerator
        open={isDocumentDialogOpen}
        onClose={() => setIsDocumentDialogOpen(false)}
        document={selectedDocument}
        documentType={documentType}
        onSign={handleDocumentSign}
      />

      {/* Create Order Form */}
      <CreateOrderForm
        open={isCreateOrderFormOpen}
        onClose={() => setIsCreateOrderFormOpen(false)}
        onSubmit={handleOrderFormSubmit}
      />
    </Box>
  );
};

export default Orders;

