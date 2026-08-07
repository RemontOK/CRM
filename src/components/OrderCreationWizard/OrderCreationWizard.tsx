import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Security } from '@mui/icons-material';
import toast from 'react-hot-toast';
import ClientTypeSelector, { getClientTypeLabel, getDefaultClientType } from '../ClientTypeSelector/ClientTypeSelector';
import ClientFieldsForm from '../ClientFieldsForm/ClientFieldsForm';
import ClientPhoneLookupField from '../ClientPhoneLookupField/ClientPhoneLookupField';
import CommaAppendAutocomplete from '../CommaAppendAutocomplete/CommaAppendAutocomplete';
import DeviceColorField from '../DeviceColorField/DeviceColorField';
import { DEFAULT_EXTERNAL_DEVICE_CONDITION, EXTERNAL_DEVICE_DEFECTS, ORDER_APPEAL_REASONS } from '../../constants/deviceDefects';
import {
  DEVICE_BRAND_OPTIONS,
  filterModelsByBrand,
  inferDeviceBrandFromModel,
  modelMatchesBrand,
  stripBrandPrefixFromModel,
} from '../../constants/deviceBrands';
import { getIphoneColorsForModel, IPHONE_MODEL_OPTIONS } from '../../constants/iphoneModelColors';
import {
  getEnabledClientFields,
  isClientOrderStepComplete,
  OrderClientDraft,
  validateClientFieldsForOrder,
} from '../../utils/clientFieldUtils';
import { AppSettings, Client, Employee, Part } from '../../types';

const optionalPriceInputValue = (value: number) => (value > 0 ? value : '');

const parseOptionalPriceInput = (raw: string) => {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') {
    return 0;
  }
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const customDeviceModelsStorageKey = 'crm_custom_device_models_by_type';
const customDeviceBrandsStorageKey = 'crm_custom_device_brands';

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

export interface NewOrderDraft {
  clientType: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientFieldValues: Record<string, string>;
  deviceType: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other';
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string;
  deviceImei: string;
  devicePassword: string;
  deviceColor: string;
  deviceCondition: 'excellent' | 'good' | 'fair' | 'poor';
  deviceExternalCondition: string;
  description: string;
  diagnosis: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCost: number;
  advancePayment: number;
  advancePaymentMethod: 'cash' | 'card';
  estimatedDays: number;
  technicianId: string;
  technicianName: string;
  intakeManagerName: string;
  deliveryManagerName: string;
  staffComments: string;
  offerProtection: boolean;
  offerCleaning: boolean;
}

export interface OrderCreationSubmitPayload {
  orderData: NewOrderDraft;
  protectionPartId: string;
  protectionInstallPrice: number;
  cleaningServicePrice: number;
}

interface OrderCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: OrderCreationSubmitPayload) => void;
  settings: AppSettings;
  onSettingsUpdated: (settings: AppSettings) => void;
  clients: Client[];
  assigneeOptions: Employee[];
  protectionParts: Part[];
  defaultIntakeManagerName: string;
}

const createDefaultOrderDraft = (settings: AppSettings, defaultIntakeManagerName: string): NewOrderDraft => ({
  clientType: getDefaultClientType(settings),
  clientName: '',
  clientPhone: '',
  clientAddress: '',
  clientFieldValues: {},
  deviceType: 'phone',
  deviceBrand: '',
  deviceModel: '',
  deviceSerial: '',
  deviceImei: '',
  devicePassword: '',
  deviceColor: '',
  deviceCondition: 'good',
  deviceExternalCondition: DEFAULT_EXTERNAL_DEVICE_CONDITION,
  description: '',
  diagnosis: '',
  priority: 'medium',
  estimatedCost: 0,
  advancePayment: 0,
  advancePaymentMethod: 'cash',
  estimatedDays: 1,
  technicianId: '',
  technicianName: '',
  intakeManagerName: defaultIntakeManagerName,
  deliveryManagerName: '',
  staffComments: '',
  offerProtection: false,
  offerCleaning: false,
});

const OrderCreationWizard: React.FC<OrderCreationWizardProps> = ({
  open,
  onClose,
  onSubmit,
  settings,
  onSettingsUpdated,
  clients,
  assigneeOptions,
  protectionParts,
  defaultIntakeManagerName,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [newOrderData, setNewOrderData] = useState<NewOrderDraft>(() =>
    createDefaultOrderDraft(settings, defaultIntakeManagerName)
  );
  const [protectionPartId, setProtectionPartId] = useState('');
  const [protectionInstallPrice, setProtectionInstallPrice] = useState(0);
  const [customDeviceModels, setCustomDeviceModels] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem(customDeviceModelsStorageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  const [customDeviceBrands, setCustomDeviceBrands] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(customDeviceBrandsStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setCurrentStep(0);
    setNewOrderData(createDefaultOrderDraft(settings, defaultIntakeManagerName));
    setProtectionPartId('');
    setProtectionInstallPrice(0);
  }, [open, settings, defaultIntakeManagerName]);

  const deviceBrandOptions = useMemo(
    () =>
      Array.from(new Set([...DEVICE_BRAND_OPTIONS, ...customDeviceBrands])).sort((a, b) =>
        a.localeCompare(b, 'ru')
      ),
    [customDeviceBrands]
  );

  const deviceModelOptions = useMemo(() => {
    const deviceType = newOrderData.deviceType || 'other';
    const fromStatic = deviceModelsByType[deviceType] || deviceModelsByType.other;
    const fromIphone = deviceType === 'phone' ? IPHONE_MODEL_OPTIONS.map((model) => `Apple ${model}`) : [];
    const fromCustom = customDeviceModels[deviceType] || [];
    const all = Array.from(new Set([...fromIphone, ...fromStatic, ...fromCustom])).sort((a, b) =>
      a.localeCompare(b, 'ru')
    );
    return filterModelsByBrand(all, newOrderData.deviceBrand);
  }, [customDeviceModels, newOrderData.deviceBrand, newOrderData.deviceType]);

  const selectedProtectionPart = useMemo(
    () => protectionParts.find((part) => part.id === protectionPartId) || null,
    [protectionParts, protectionPartId]
  );

  const rememberDeviceBrand = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    if (DEVICE_BRAND_OPTIONS.some((brand) => brand.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    setCustomDeviceBrands((prev) => {
      if (prev.some((brand) => brand.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }
      const next = [...prev, normalized].sort((a, b) => a.localeCompare(b, 'ru'));
      localStorage.setItem(customDeviceBrandsStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const rememberDeviceModel = useCallback((deviceType: string, value: string) => {
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

  const handleStepDataChange = (field: keyof NewOrderDraft, value: NewOrderDraft[keyof NewOrderDraft]) => {
    setNewOrderData((prev) => ({ ...prev, [field]: value }));
  };

  const applyClientDraftToNewOrder = useCallback((draft: OrderClientDraft) => {
    setNewOrderData((prev) => ({
      ...prev,
      clientName: draft.clientName,
      clientPhone: draft.clientPhone,
      clientType: draft.clientType,
      clientAddress: draft.clientAddress,
      clientFieldValues: draft.clientFieldValues,
    }));
  }, []);

  const handleNextStep = () => {
    if (currentStep === 0) {
      const clientFieldError = validateClientFieldsForOrder(
        settings,
        newOrderData.clientType,
        newOrderData.clientFieldValues
      );
      if (clientFieldError) {
        toast.error(clientFieldError);
        return;
      }
    }

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

  const handleSubmit = () => {
    onSubmit({
      orderData: newOrderData,
      protectionPartId,
      protectionInstallPrice,
      cleaningServicePrice: 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
                  backgroundColor: step <= currentStep ? 'primary.main' : 'action.disabledBackground',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {currentStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Информация о клиенте
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <ClientTypeSelector
                    value={newOrderData.clientType}
                    onChange={(code) => handleStepDataChange('clientType', code)}
                    settings={settings}
                    onSettingsUpdated={onSettingsUpdated}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ClientPhoneLookupField
                    settings={settings}
                    clients={clients}
                    phone={newOrderData.clientPhone}
                    onPhoneChange={(value) => handleStepDataChange('clientPhone', value)}
                    onClientSelect={applyClientDraftToNewOrder}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={newOrderData.clientType === 'company' ? 'Название компании' : 'ФИО клиента'}
                    value={newOrderData.clientName}
                    onChange={(e) => handleStepDataChange('clientName', e.target.value)}
                    placeholder={
                      newOrderData.clientType === 'company'
                        ? 'Например: ООО «Ромашка»'
                        : 'Например: Иванов Иван Иванович'
                    }
                    required
                  />
                </Grid>
                <ClientFieldsForm
                  settings={settings}
                  clientType={newOrderData.clientType}
                  values={newOrderData.clientFieldValues}
                  onChange={(code, value) =>
                    setNewOrderData((prev) => ({
                      ...prev,
                      clientFieldValues: { ...prev.clientFieldValues, [code]: value },
                    }))
                  }
                />
              </Grid>
            </Box>
          )}

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
                      label="Тип устройства"
                      onChange={(e) => {
                        handleStepDataChange('deviceType', e.target.value as NewOrderDraft['deviceType']);
                        handleStepDataChange('deviceModel', '');
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
                    options={deviceBrandOptions}
                    value={newOrderData.deviceBrand}
                    onChange={(_event, newValue) => {
                      const nextBrand = newValue || '';
                      handleStepDataChange('deviceBrand', nextBrand);
                      rememberDeviceBrand(nextBrand);
                      if (newOrderData.deviceModel && nextBrand) {
                        const strippedModel = stripBrandPrefixFromModel(
                          newOrderData.deviceModel,
                          nextBrand
                        );
                        if (!modelMatchesBrand(strippedModel, nextBrand)) {
                          handleStepDataChange('deviceModel', '');
                          handleStepDataChange('deviceColor', '');
                        } else if (strippedModel !== newOrderData.deviceModel) {
                          handleStepDataChange('deviceModel', strippedModel);
                        }
                      }
                    }}
                    onInputChange={(_event, newInputValue, reason) => {
                      if (reason === 'input' || reason === 'clear') {
                        handleStepDataChange('deviceBrand', newInputValue);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Производитель"
                        placeholder="Apple, Samsung, Xiaomi..."
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={deviceModelOptions}
                    value={newOrderData.deviceModel}
                    onChange={(_event, newValue) => {
                      const nextModelRaw = newValue || '';
                      const nextModel = newOrderData.deviceBrand
                        ? stripBrandPrefixFromModel(nextModelRaw, newOrderData.deviceBrand)
                        : nextModelRaw;
                      handleStepDataChange('deviceModel', nextModel);
                      rememberDeviceModel(newOrderData.deviceType, nextModel);
                      const inferredBrand = inferDeviceBrandFromModel(nextModelRaw || nextModel);
                      if (inferredBrand) {
                        handleStepDataChange('deviceBrand', inferredBrand);
                        rememberDeviceBrand(inferredBrand);
                      }
                      const colors = getIphoneColorsForModel(nextModel);
                      if (
                        colors.length > 0 &&
                        newOrderData.deviceColor &&
                        !colors.some((color) => color.toLowerCase() === newOrderData.deviceColor.trim().toLowerCase())
                      ) {
                        handleStepDataChange('deviceColor', '');
                      }
                    }}
                    onInputChange={(_event, newInputValue, reason) => {
                      if (reason === 'input' || reason === 'clear') {
                        const nextModel = newOrderData.deviceBrand
                          ? stripBrandPrefixFromModel(newInputValue, newOrderData.deviceBrand)
                          : newInputValue;
                        handleStepDataChange('deviceModel', nextModel);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Модель"
                        placeholder="Например: Galaxy Z Flip 5, iPhone 15 Pro"
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
                  <DeviceColorField
                    value={newOrderData.deviceColor}
                    onChange={(next) => handleStepDataChange('deviceColor', next)}
                    deviceModel={newOrderData.deviceModel}
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
                      label="Состояние устройства"
                      onChange={(e) =>
                        handleStepDataChange('deviceCondition', e.target.value as NewOrderDraft['deviceCondition'])
                      }
                    >
                      <MenuItem value="excellent">Отличное</MenuItem>
                      <MenuItem value="good">Хорошее</MenuItem>
                      <MenuItem value="fair">Удовлетворительное</MenuItem>
                      <MenuItem value="poor">Плохое</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <CommaAppendAutocomplete
                    label="Внешние дефекты"
                    value={newOrderData.deviceExternalCondition}
                    onChange={(next) => handleStepDataChange('deviceExternalCondition', next)}
                    options={EXTERNAL_DEVICE_DEFECTS}
                    placeholder="Выберите дефект или введите свой"
                    clearFallback={DEFAULT_EXTERNAL_DEVICE_CONDITION}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {currentStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Описание проблемы
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <CommaAppendAutocomplete
                    label="Неисправность / причина обращения"
                    value={newOrderData.description}
                    onChange={(next) => handleStepDataChange('description', next)}
                    options={ORDER_APPEAL_REASONS}
                    placeholder="Выберите причину или введите свою"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Комментарии к заказу"
                    value={newOrderData.staffComments}
                    onChange={(e) => handleStepDataChange('staffComments', e.target.value)}
                    placeholder="Комплектация, видимые дефекты, договорённости с клиентом..."
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Приоритет заказа</InputLabel>
                    <Select
                      value={newOrderData.priority}
                      label="Приоритет заказа"
                      onChange={(e) =>
                        handleStepDataChange('priority', e.target.value as NewOrderDraft['priority'])
                      }
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
                    onChange={(e) =>
                      handleStepDataChange('advancePayment', Math.max(0, Number(e.target.value) || 0))
                    }
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                    }}
                    helperText="Запишется в кассу при создании заказа"
                  />
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={newOrderData.advancePaymentMethod}
                    onChange={(_, value) => {
                      if (value) {
                        handleStepDataChange('advancePaymentMethod', value as 'cash' | 'card');
                      }
                    }}
                    sx={{ mt: 1 }}
                  >
                    <ToggleButton value="cash">Наличные</ToggleButton>
                    <ToggleButton value="card">Безнал</ToggleButton>
                  </ToggleButtonGroup>
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

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Дополнительные услуги
                  </Typography>
                  <Card sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Button
                          variant={newOrderData.offerProtection ? 'contained' : 'outlined'}
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
                            boxShadow: newOrderData.offerProtection ? '0 3px 5px 2px rgba(255, 107, 53, .3)' : 'none',
                            '&:hover': {
                              background: newOrderData.offerProtection
                                ? 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)'
                                : 'rgba(255, 107, 53, 0.1)',
                              borderColor: '#E64A19',
                            },
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
                                    {part.name} • {Number(part.unitPrice || 0).toLocaleString('ru-RU')} ₽ • остаток{' '}
                                    {part.quantity}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              label="Цена поклейки"
                              value={optionalPriceInputValue(protectionInstallPrice)}
                              onChange={(e) => setProtectionInstallPrice(parseOptionalPriceInput(e.target.value))}
                              inputProps={{ min: 0, step: 1 }}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                              }}
                            />
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ p: 2, bgcolor: 'var(--crm-panel)', border: '1px solid var(--crm-border)', color: 'text.primary' }}>
                    <Typography variant="h6" gutterBottom color="text.primary">
                      Сводка заказа
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Клиент:</strong> {newOrderData.clientName}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Тип клиента:</strong> {getClientTypeLabel(settings, newOrderData.clientType)}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Телефон:</strong> {newOrderData.clientPhone}
                    </Typography>
                    {getEnabledClientFields(settings, newOrderData.clientType).map((field) => {
                      const value = newOrderData.clientFieldValues[field.code];
                      if (!value) {
                        return null;
                      }
                      return (
                        <Typography key={field.id} variant="body2" color="text.primary">
                          <strong>{field.label}:</strong> {value}
                        </Typography>
                      );
                    })}
                    <Typography variant="body2" color="text.primary">
                      <strong>Устройство:</strong> {newOrderData.deviceBrand} {newOrderData.deviceModel}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Неисправность:</strong> {newOrderData.description || newOrderData.diagnosis}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Стоимость:</strong> {newOrderData.estimatedCost} ₽
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Аванс:</strong> {Number(newOrderData.advancePayment || 0).toLocaleString('ru-RU')} ₽
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Срок:</strong> {newOrderData.estimatedDays} дн.
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Принял менеджер:</strong> {newOrderData.intakeManagerName || 'Не назначен'}
                    </Typography>
                    {newOrderData.offerProtection && selectedProtectionPart && (
                      <Typography variant="body2" color="primary">
                        <strong>+ Защита экрана:</strong>{' '}
                        {(Number(selectedProtectionPart.unitPrice || 0) + Number(protectionInstallPrice || 0)).toLocaleString('ru-RU')} ₽
                      </Typography>
                    )}
                    <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
                      <strong>
                        Итого:{' '}
                        {(
                          Number(newOrderData.estimatedCost || 0) +
                          (newOrderData.offerProtection && selectedProtectionPart
                            ? Number(selectedProtectionPart.unitPrice || 0) + Number(protectionInstallPrice || 0)
                            : 0)
                        ).toLocaleString('ru-RU')}{' '}
                        ₽
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
        <Button onClick={onClose}>Отмена</Button>
        {currentStep > 0 && <Button onClick={handlePrevStep}>Назад</Button>}
        {currentStep < 3 ? (
          <Button
            variant="contained"
            onClick={handleNextStep}
            disabled={
              (currentStep === 0 &&
                !isClientOrderStepComplete(
                  settings,
                  newOrderData.clientType,
                  newOrderData.clientName,
                  newOrderData.clientPhone,
                  newOrderData.clientFieldValues
                )) ||
              (currentStep === 1 && !newOrderData.deviceModel) ||
              (currentStep === 2 && !newOrderData.description.trim() && !newOrderData.diagnosis.trim())
            }
          >
            Далее
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!newOrderData.estimatedDays || newOrderData.estimatedDays < 1}
            sx={{
              background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
              boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
              },
            }}
          >
            Новый заказ
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OrderCreationWizard;
