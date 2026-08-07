import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { AttachFile, CameraAlt, Close } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { crmRadius } from '../../styles/tokens';
import { appSettingsService } from '../../services/appSettingsService';
import ClientTypeSelector, { getDefaultClientType } from '../ClientTypeSelector/ClientTypeSelector';
import ClientFieldsForm from '../ClientFieldsForm/ClientFieldsForm';
import ClientPhoneLookupField from '../ClientPhoneLookupField/ClientPhoneLookupField';
import CommaAppendAutocomplete from '../CommaAppendAutocomplete/CommaAppendAutocomplete';
import DeviceColorField from '../DeviceColorField/DeviceColorField';
import { DEFAULT_EXTERNAL_DEVICE_CONDITION, EXTERNAL_DEVICE_DEFECTS, ORDER_APPEAL_REASONS } from '../../constants/deviceDefects';
import { getIphoneColorsForModel, IPHONE_MODEL_OPTIONS } from '../../constants/iphoneModelColors';
import { clientService } from '../../services/clientService';
import {
  collectClientFieldValues,
  getEnabledClientFields,
  OrderClientDraft,
  validateClientFieldsForOrder,
} from '../../utils/clientFieldUtils';

interface CreateOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderData: OrderFormData) => Promise<void> | void;
}

export interface OrderFormData {
  orderType: string;
  clientType: string;
  clientName: string;
  phone: string;
  email?: string;
  howDidYouKnow?: string;
  clientComment?: string;
  discount?: string;
  birthday?: string;
  prepayment?: number;
  performer?: string;
  manager: string;
  deadline: string;
  advance?: number;
  color: string;
  serialNumber: string;
  imei: string;
  reasonForContact: string;
  model?: string;
  appearance?: string;
  password: string;
  completeness: string;
  receptionistNotes?: string;
  estimatedPrice?: number;
  recommendations?: string;
}

const schema = yup.object({
  orderType: yup.string().required('Выберите тип заказа'),
  clientType: yup.string().required('Выберите тип клиента'),
  clientName: yup.string().required('Укажите имя клиента'),
  phone: yup.string().required('Укажите телефон'),
  manager: yup.string().required('Укажите менеджера приема'),
  deadline: yup.string().required('Укажите срок готовности'),
  color: yup.string().required('Укажите цвет устройства'),
  serialNumber: yup.string().required('Укажите серийный номер'),
  imei: yup.string().required('Укажите IMEI или идентификатор'),
  reasonForContact: yup.string().required('Опишите причину обращения'),
  password: yup.string().required('Укажите пароль или код блокировки'),
  completeness: yup.string().required('Опишите комплектацию'),
  model: yup.string(),
  appearance: yup.string(),
  receptionistNotes: yup.string(),
  estimatedPrice: yup.number().nullable(),
  recommendations: yup.string(),
});

const sectionPaperSx = {
  p: 2.5,
  borderRadius: crmRadius.md,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 32px rgba(15, 23, 42, 0.05)',
};

const modelOptions = IPHONE_MODEL_OPTIONS.map((model) => `Apple ${model}`);

const DEFAULT_ORDER_TYPES = [
  { code: 'repair', label: 'Ремонт' },
  { code: 'diagnostics', label: 'Диагностика' },
  { code: 'accessories', label: 'Продажа аксессуаров' },
  { code: 'warranty', label: 'Гарантийное обращение' },
] as const;

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ open, onClose, onSubmit }) => {
  const [settings, setSettings] = React.useState(() => appSettingsService.getSettings());
  const [clients, setClients] = React.useState(() => clientService.getClients());

  const orderCreateModeLabel = settings.orders.createMode === 'single' ? 'одна форма' : 'пошаговый мастер';

  const defaultFormValues = React.useMemo<OrderFormData>(
    () => ({
      orderType: DEFAULT_ORDER_TYPES[0].code,
      clientType: getDefaultClientType(settings),
      clientName: '',
      phone: '',
      manager: 'Администратор',
      deadline: '1 день',
      color: '',
      serialNumber: '',
      imei: '',
      reasonForContact: '',
      appearance: DEFAULT_EXTERNAL_DEVICE_CONDITION,
      password: '',
      completeness: '',
    }),
    [settings]
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<OrderFormData>({
    resolver: yupResolver(schema),
    defaultValues: defaultFormValues,
  });

  const phoneValue = watch('phone');
  const clientTypeValue = watch('clientType');
  const modelValue = watch('model');
  const colorValue = watch('color');

  React.useEffect(() => {
    if (!open) {
      return;
    }

    void clientService.refreshFromApi().then(() => {
      setClients(clientService.getClients());
    });
  }, [open]);

  const applyClientDraft = React.useCallback(
    (draft: OrderClientDraft) => {
      setValue('phone', draft.clientPhone);
      setValue('clientName', draft.clientName);
      setValue('clientType', draft.clientType);
      for (const field of getEnabledClientFields(settings)) {
        setValue(field.code, draft.clientFieldValues[field.code] || '');
      }
    },
    [setValue, settings]
  );

  const handleFormSubmit = async (data: OrderFormData) => {
    const clientFieldValues = collectClientFieldValues(settings, data);
    const clientFieldError = validateClientFieldsForOrder(settings, data.clientType, clientFieldValues);
    if (clientFieldError) {
      toast.error(clientFieldError);
      return;
    }

    await onSubmit({ ...data, ...clientFieldValues });
    reset(defaultFormValues);
    onClose();
  };

  const handleClose = () => {
    reset(defaultFormValues);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle component="div" sx={{ pb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Быстрое создание заказа</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Заполните основные данные, чтобы оформить заказ в режиме «{orderCreateModeLabel}» и сразу перейти к документам.
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small"><AttachFile /></IconButton>
            <IconButton size="small"><CameraAlt /></IconButton>
            <IconButton onClick={handleClose} size="small"><Close /></IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={sectionPaperSx}>
              <Typography variant="h6" gutterBottom>Клиент</Typography>

              <Controller
                name="clientType"
                control={control}
                render={({ field }) => (
                  <ClientTypeSelector
                    value={field.value}
                    onChange={field.onChange}
                    settings={settings}
                    onSettingsUpdated={setSettings}
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <ClientPhoneLookupField
                    settings={settings}
                    clients={clients}
                    phone={phoneValue || ''}
                    onPhoneChange={(value) => setValue('phone', value)}
                    onClientSelect={applyClientDraft}
                    label="Телефон"
                    size="small"
                    required
                  />
                  {errors.phone?.message ? (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {errors.phone.message}
                    </Typography>
                  ) : null}
                </Grid>
                <Grid item xs={12}>
                  <FormField
                    control={control}
                    name="clientName"
                    label={clientTypeValue === 'company' ? 'Название компании' : 'Клиент'}
                    error={errors.clientName?.message}
                    required
                  />
                </Grid>
                <ClientFieldsForm settings={settings} control={control} clientType={clientTypeValue} />
              </Grid>
            </Paper>

            <Paper sx={{ ...sectionPaperSx, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Дополнительно</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <NumberField control={control} name="prepayment" label="Предоплата" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <NumberField control={control} name="advance" label="Аванс" />
                </Grid>
                <Grid item xs={12}>
                  <FormField control={control} name="manager" label="Менеджер приема" error={errors.manager?.message} />
                </Grid>
                <Grid item xs={12}>
                  <FormField control={control} name="deadline" label="Срок готовности" error={errors.deadline?.message} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={sectionPaperSx}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={2}>
                <Typography variant="h6">Устройство</Typography>
                <Controller
                  name="orderType"
                  control={control}
                  render={({ field }) => (
                    <FormControl component="fieldset">
                      <RadioGroup {...field} row>
                        {DEFAULT_ORDER_TYPES.map((type) => (
                          <FormControlLabel key={type.code} value={type.code} control={<Radio size="small" />} label={type.label} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        freeSolo
                        options={modelOptions}
                        value={field.value ?? ''}
                        inputValue={field.value ?? ''}
                        onChange={(_, value) => {
                          const nextModel = value ?? '';
                          field.onChange(nextModel);
                          const colors = getIphoneColorsForModel(nextModel);
                          if (
                            colors.length > 0 &&
                            colorValue &&
                            !colors.some((color) => color.toLowerCase() === String(colorValue).trim().toLowerCase())
                          ) {
                            setValue('color', '');
                          }
                        }}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                          <TextField {...params} label="Модель" fullWidth size="small" />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                      <DeviceColorField
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        deviceModel={modelValue}
                        label="Цвет"
                        size="small"
                        required
                        error={!!errors.color?.message}
                        helperText={errors.color?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField
                    control={control}
                    name="serialNumber"
                    label="Серийный номер"
                    error={errors.serialNumber?.message}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField
                    control={control}
                    name="imei"
                    label="IMEI / идентификатор"
                    error={errors.imei?.message}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="reasonForContact"
                    control={control}
                    render={({ field }) => (
                      <CommaAppendAutocomplete
                        label="Причина обращения"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={ORDER_APPEAL_REASONS}
                        placeholder="Выберите причину или введите свою"
                        helperText={errors.reasonForContact?.message}
                        error={!!errors.reasonForContact?.message}
                        required
                        multiline
                        rows={2}
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="appearance"
                    control={control}
                    render={({ field }) => (
                      <CommaAppendAutocomplete
                        label="Внешний вид"
                        value={field.value ?? DEFAULT_EXTERNAL_DEVICE_CONDITION}
                        onChange={field.onChange}
                        options={EXTERNAL_DEVICE_DEFECTS}
                        placeholder="Выберите дефект или введите свой"
                        clearFallback={DEFAULT_EXTERNAL_DEVICE_CONDITION}
                        multiline
                        rows={2}
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField
                    control={control}
                    name="password"
                    label="Пароль / код блокировки"
                    error={errors.password?.message}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField
                    control={control}
                    name="completeness"
                    label="Комплектация"
                    error={errors.completeness?.message}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormField control={control} name="receptionistNotes" label="Заметки приемщика" multiline rows={2} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <NumberField control={control} name="estimatedPrice" label="Ориентировочная стоимость" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField control={control} name="recommendations" label="Рекомендации" />
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ ...sectionPaperSx, mt: 3 }}>
              <Typography variant="h6" gutterBottom>После создания заказа</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="grid" gap={1}>
                <Typography variant="body2" color="text.secondary">1. По номеру телефона будет найден существующий клиент или создан новый.</Typography>
                <Typography variant="body2" color="text.secondary">2. Заказ появится в списке со стартовым статусом.</Typography>
                <Typography variant="body2" color="text.secondary">3. Сразу после сохранения можно открыть и распечатать акт приема-передачи.</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>Отмена</Button>
        <Button onClick={handleSubmit(handleFormSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Создаем...' : 'Создать заказ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FormField: React.FC<any> = ({ control, name, error, required, ...props }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <TextField
        {...field}
        {...props}
        fullWidth
        size="small"
        required={required}
        error={!!error}
        helperText={error}
        value={field.value ?? ''}
      />
    )}
  />
);

const NumberField: React.FC<any> = ({ control, name, label, required }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <TextField
        label={label}
        fullWidth
        size="small"
        type="number"
        required={required}
        value={field.value ?? ''}
        onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
      />
    )}
  />
);

export default CreateOrderForm;
