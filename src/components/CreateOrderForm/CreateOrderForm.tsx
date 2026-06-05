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
import { crmRadius } from '../../styles/tokens';
import { appSettingsService } from '../../services/appSettingsService';

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
});

const sectionPaperSx = {
  p: 2.5,
  borderRadius: crmRadius.md,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 14px 32px rgba(15, 23, 42, 0.05)',
};

const deviceColorOptions = [
  'Черный',
  'Белый',
  'Серый',
  'Серебристый',
  'Золотой',
  'Синий',
  'Голубой',
  'Красный',
  'Розовый',
  'Зеленый',
  'Фиолетовый',
  'Желтый',
  'Оранжевый',
  'Коричневый',
  'Бежевый',
  'Графит',
  'Титан',
];

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ open, onClose, onSubmit }) => {
  const settings = React.useMemo(() => appSettingsService.getSettings(), []);
  const orderTypes = React.useMemo(
    () => settings.forms.orderTypes.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [settings.forms.orderTypes]
  );
  const clientTypes = React.useMemo(
    () => settings.forms.clientTypes.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [settings.forms.clientTypes]
  );

  const mandatoryOrderFields = React.useMemo(
    () => new Set(['clientName', 'phone', 'color', 'serialNumber', 'imei', 'reasonForContact', 'password', 'completeness']),
    []
  );

  const orderFieldsByCode = React.useMemo(
    () => new Map(settings.forms.orderFields.map((item) => [item.code, item])),
    [settings.forms.orderFields]
  );

  const clientFieldsByCode = React.useMemo(
    () => new Map(settings.forms.clientFields.map((item) => [item.code, item])),
    [settings.forms.clientFields]
  );
  const orderCreateModeLabel = settings.orders.createMode === 'single' ? 'одна форма' : 'пошаговый мастер';

  const isOrderFieldVisible = React.useCallback(
    (code: string) => mandatoryOrderFields.has(code) || Boolean(orderFieldsByCode.get(code)?.enabled),
    [mandatoryOrderFields, orderFieldsByCode]
  );

  const isClientFieldVisible = React.useCallback(
    (code: string) => Boolean(clientFieldsByCode.get(code)?.enabled),
    [clientFieldsByCode]
  );

  const getOrderFieldLabel = React.useCallback(
    (code: string, fallback: string) => orderFieldsByCode.get(code)?.label || fallback,
    [orderFieldsByCode]
  );

  const getClientFieldLabel = React.useCallback(
    (code: string, fallback: string) => clientFieldsByCode.get(code)?.label || fallback,
    [clientFieldsByCode]
  );

  const defaultFormValues = React.useMemo<OrderFormData>(
    () => ({
      orderType: orderTypes[0]?.code || 'paid',
      clientType: clientTypes[0]?.code || 'individual',
      clientName: '',
      phone: '',
      manager: 'Администратор',
      deadline: '1 день',
      color: '',
      serialNumber: '',
      imei: '',
      reasonForContact: '',
      password: '',
      completeness: '',
    }),
    [clientTypes, orderTypes]
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OrderFormData>({
    resolver: yupResolver(schema),
    defaultValues: defaultFormValues,
  });

  const handleFormSubmit = async (data: OrderFormData) => {
    await onSubmit(data);
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
                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <RadioGroup {...field} row>
                      {clientTypes.map((type) => (
                        <FormControlLabel key={type.id} value={type.code} control={<Radio size="small" />} label={type.label} />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormField control={control} name="clientName" label={getOrderFieldLabel('clientName', 'Клиент')} error={errors.clientName?.message} />
                </Grid>
                <Grid item xs={12}>
                  <FormField control={control} name="phone" label={getOrderFieldLabel('phone', 'Телефон')} error={errors.phone?.message} />
                </Grid>
                {isClientFieldVisible('email') && (
                  <Grid item xs={12}>
                    <FormField control={control} name="email" label={getClientFieldLabel('email', 'Email')} />
                  </Grid>
                )}
                {isClientFieldVisible('howDidYouKnow') && (
                  <Grid item xs={12}>
                    <FormField control={control} name="howDidYouKnow" label={getClientFieldLabel('howDidYouKnow', 'Источник обращения')} />
                  </Grid>
                )}
                {isClientFieldVisible('clientComment') && (
                  <Grid item xs={12}>
                    <FormField control={control} name="clientComment" label={getClientFieldLabel('clientComment', 'Заметка по клиенту')} multiline rows={2} />
                  </Grid>
                )}
                {isClientFieldVisible('discount') && (
                  <Grid item xs={12} md={6}>
                    <FormField control={control} name="discount" label={getClientFieldLabel('discount', 'Скидка')} />
                  </Grid>
                )}
                {isClientFieldVisible('birthday') && (
                  <Grid item xs={12} md={6}>
                    <FormField control={control} name="birthday" label={getClientFieldLabel('birthday', 'Дата рождения')} type="date" InputLabelProps={{ shrink: true }} />
                  </Grid>
                )}
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
                  <FormField control={control} name="performer" label="Исполнитель" />
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
                        {orderTypes.map((type) => (
                          <FormControlLabel key={type.id} value={type.code} control={<Radio size="small" />} label={type.label} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}
                />
              </Box>

              <Grid container spacing={2}>
                {isOrderFieldVisible('model') && (
                  <Grid item xs={12} md={6}>
                    <FormField control={control} name="model" label={getOrderFieldLabel('model', 'Модель')} />
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <ColorField control={control} name="color" label={getOrderFieldLabel('color', 'Цвет')} error={errors.color?.message} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField control={control} name="serialNumber" label={getOrderFieldLabel('serialNumber', 'Серийный номер')} error={errors.serialNumber?.message} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField control={control} name="imei" label={getOrderFieldLabel('imei', 'IMEI / идентификатор')} error={errors.imei?.message} />
                </Grid>
                <Grid item xs={12}>
                  <FormField control={control} name="reasonForContact" label={getOrderFieldLabel('reasonForContact', 'Причина обращения')} error={errors.reasonForContact?.message} multiline rows={2} />
                </Grid>
                {isOrderFieldVisible('appearance') && (
                  <Grid item xs={12}>
                    <FormField control={control} name="appearance" label={getOrderFieldLabel('appearance', 'Внешний вид')} multiline rows={2} />
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <FormField control={control} name="password" label={getOrderFieldLabel('password', 'Пароль / код блокировки')} error={errors.password?.message} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormField control={control} name="completeness" label={getOrderFieldLabel('completeness', 'Комплектация')} error={errors.completeness?.message} />
                </Grid>
                {isOrderFieldVisible('receptionistNotes') && (
                  <Grid item xs={12}>
                    <FormField control={control} name="receptionistNotes" label={getOrderFieldLabel('receptionistNotes', 'Заметки приемщика')} multiline rows={2} />
                  </Grid>
                )}
                {isOrderFieldVisible('estimatedPrice') && (
                  <Grid item xs={12} md={6}>
                    <NumberField control={control} name="estimatedPrice" label={getOrderFieldLabel('estimatedPrice', 'Ориентировочная стоимость')} />
                  </Grid>
                )}
                {isOrderFieldVisible('recommendations') && (
                  <Grid item xs={12} md={6}>
                    <FormField control={control} name="recommendations" label={getOrderFieldLabel('recommendations', 'Рекомендации')} />
                  </Grid>
                )}
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

const FormField: React.FC<any> = ({ control, name, error, ...props }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <TextField
        {...field}
        {...props}
        fullWidth
        size="small"
        error={!!error}
        helperText={error}
        value={field.value ?? ''}
      />
    )}
  />
);

const ColorField: React.FC<any> = ({ control, name, label, error }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <Autocomplete
        freeSolo
        options={deviceColorOptions}
        value={field.value ?? ''}
        inputValue={field.value ?? ''}
        onChange={(_, value) => field.onChange(value ?? '')}
        onInputChange={(_, value) => field.onChange(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            fullWidth
            size="small"
            error={!!error}
            helperText={error}
          />
        )}
      />
    )}
  />
);

const NumberField: React.FC<any> = ({ control, name, label }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <TextField
        label={label}
        fullWidth
        size="small"
        type="number"
        value={field.value ?? ''}
        onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
      />
    )}
  />
);

export default CreateOrderForm;
