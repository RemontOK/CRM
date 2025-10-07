import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import {
  Close,
  AttachFile,
  CameraAlt,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

interface CreateOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderData: OrderFormData) => void;
}

interface OrderFormData {
  // Тип заказа
  orderType: 'paid' | 'warranty';
  
  // Клиент
  clientType: 'individual' | 'company';
  clientName: string;
  phone: string;
  email?: string;
  howDidYouKnow?: string;
  clientComment?: string;
  discount?: string;
  birthday?: string;
  
  // Дополнительно
  prepayment?: number;
  performer?: string;
  manager: string;
  deadline: string;
  
  // Информация об устройстве
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
  clientName: yup.string().required('ФИО клиента обязательно'),
  phone: yup.string().required('Телефон обязателен'),
  manager: yup.string().required('Менеджер обязателен'),
  deadline: yup.string().required('Срок обязателен'),
  color: yup.string().required('Цвет обязателен'),
  serialNumber: yup.string().required('Серийный номер обязателен'),
  imei: yup.string().required('IMEI обязателен'),
  reasonForContact: yup.string().required('Причина обращения обязательна'),
  password: yup.string().required('Пароль обязателен'),
  completeness: yup.string().required('Комплектация обязательна'),
});

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrderFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      orderType: 'paid',
      clientType: 'individual',
      manager: 'Артем',
      deadline: '09.10.2025 14:00',
    },
  });

  const handleFormSubmit = (data: OrderFormData) => {
    onSubmit(data);
    reset();
    onClose();
    toast.success('Заказ успешно создан');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">Заказ</Typography>
            <Controller
              name="orderType"
              control={control}
              render={({ field }) => (
                <FormControl component="fieldset">
                  <RadioGroup {...field} row>
                    <FormControlLabel
                      value="paid"
                      control={<Radio size="small" />}
                      label="Платный"
                    />
                    <FormControlLabel
                      value="warranty"
                      control={<Radio size="small" />}
                      label="Гарантийный"
                    />
                  </RadioGroup>
                </FormControl>
              )}
            />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small">
              <AttachFile />
            </IconButton>
            <IconButton size="small">
              <CameraAlt />
            </IconButton>
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Левая колонка - Клиент и Дополнительно */}
          <Grid item xs={6}>
            {/* Клиент */}
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Клиент</Typography>
              
              <Controller
                name="clientType"
                control={control}
                render={({ field }) => (
                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <RadioGroup {...field} row>
                      <FormControlLabel
                        value="individual"
                        control={<Radio size="small" />}
                        label="Физ. лицо"
                      />
                      <FormControlLabel
                        value="company"
                        control={<Radio size="small" />}
                        label="Компания *"
                      />
                    </RadioGroup>
                  </FormControl>
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="clientName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Клиент *"
                        fullWidth
                        size="small"
                        error={!!errors.clientName}
                        helperText={errors.clientName?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Телефон"
                        fullWidth
                        size="small"
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Почта"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="howDidYouKnow"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Откуда узнал"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="clientComment"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Комментарий о клиенте"
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="discount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Сделать скидку"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="birthday"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="День рождения"
                        fullWidth
                        size="small"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Дополнительно */}
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Дополнительно</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="prepayment"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Предоплата, Р"
                        fullWidth
                        size="small"
                        type="number"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="performer"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Исполнитель"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="manager"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Менеджер *"
                        fullWidth
                        size="small"
                        error={!!errors.manager}
                        helperText={errors.manager?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Срок *"
                        fullWidth
                        size="small"
                        error={!!errors.deadline}
                        helperText={errors.deadline?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Правая колонка - Информация */}
          <Grid item xs={6}>
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Информация</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="advance"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Аванс"
                        fullWidth
                        size="small"
                        type="number"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Цвет *"
                        fullWidth
                        size="small"
                        error={!!errors.color}
                        helperText={errors.color?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="serialNumber"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="S/N *"
                        fullWidth
                        size="small"
                        error={!!errors.serialNumber}
                        helperText={errors.serialNumber?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="imei"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="IMEI *"
                        fullWidth
                        size="small"
                        error={!!errors.imei}
                        helperText={errors.imei?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="reasonForContact"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Причина обращения *"
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        error={!!errors.reasonForContact}
                        helperText={errors.reasonForContact?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Модель"
                        fullWidth
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
                      <TextField
                        {...field}
                        label="Внешний вид"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Пароль *"
                        fullWidth
                        size="small"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="completeness"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Комплектация *"
                        fullWidth
                        size="small"
                        error={!!errors.completeness}
                        helperText={errors.completeness?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="receptionistNotes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Заметки приемщика"
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="estimatedPrice"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Ориент. цена"
                        fullWidth
                        size="small"
                        type="number"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="recommendations"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Рекомендации"
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Товары и услуги */}
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Товары и услуги</Typography>
                <Button variant="outlined" size="small">
                  Добавить
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Здесь будут отображаться добавленные товары и услуги
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Отмена
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
        >
          Создать заказ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateOrderForm;
