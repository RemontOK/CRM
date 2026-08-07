import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Build, CheckCircle, CleaningServices, Delete, LocalShipping, Security } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { Order, OrderPart } from '../../types';
import { formatPhone } from '../../utils/phone';
import { getOrderDebt, getOrderTotal } from '../../utils/orderMetrics';
import { getOrderLineTitle } from '../../utils/orderPartDisplay';

export type DeliveryTestingChecklist = {
  screenWorks: boolean;
  touchWorks: boolean;
  cameraWorks: boolean;
  soundWorks: boolean;
  chargingWorks: boolean;
  wifiWorks: boolean;
  bluetoothWorks: boolean;
  buttonsWork: boolean;
  fingerprintWorks: boolean;
  faceIdWorks: boolean;
};

export type OrderDeliveryCompletePayload = {
  testingChecklist: DeliveryTestingChecklist;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'online';
  paymentAmount: number;
  screenProtection: boolean;
  cleaning: boolean;
};

const emptyChecklist = (): DeliveryTestingChecklist => ({
  screenWorks: false,
  touchWorks: false,
  cameraWorks: false,
  soundWorks: false,
  chargingWorks: false,
  wifiWorks: false,
  bluetoothWorks: false,
  buttonsWork: false,
  fingerprintWorks: false,
  faceIdWorks: false,
});

const allPassedChecklist = (): DeliveryTestingChecklist => ({
  screenWorks: true,
  touchWorks: true,
  cameraWorks: true,
  soundWorks: true,
  chargingWorks: true,
  wifiWorks: true,
  bluetoothWorks: true,
  buttonsWork: true,
  fingerprintWorks: true,
  faceIdWorks: true,
});

const checklistItems: Array<{ key: keyof DeliveryTestingChecklist; label: string }> = [
  { key: 'screenWorks', label: 'Экран работает корректно' },
  { key: 'touchWorks', label: 'Сенсорный экран реагирует' },
  { key: 'cameraWorks', label: 'Камера работает' },
  { key: 'soundWorks', label: 'Звук работает' },
  { key: 'chargingWorks', label: 'Зарядка работает' },
  { key: 'wifiWorks', label: 'Wi-Fi работает' },
  { key: 'bluetoothWorks', label: 'Bluetooth работает' },
  { key: 'buttonsWork', label: 'Кнопки работают' },
  { key: 'fingerprintWorks', label: 'Отпечаток пальца работает' },
  { key: 'faceIdWorks', label: 'Face ID работает' },
];

type OrderDeliveryDialogProps = {
  open: boolean;
  order: Order | null;
  showPartPrices?: boolean;
  onClose: () => void;
  onRemovePart: (partId: string) => void;
  onAddWork: (order: Order) => void;
  onComplete: (payload: OrderDeliveryCompletePayload) => void | Promise<void>;
};

const OrderDeliveryDialog: React.FC<OrderDeliveryDialogProps> = ({
  open,
  order,
  showPartPrices = true,
  onClose,
  onRemovePart,
  onAddWork,
  onComplete,
}) => {
  const [testingChecklist, setTestingChecklist] = useState<DeliveryTestingChecklist>(emptyChecklist);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'online'>('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [screenProtection, setScreenProtection] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !order) {
      return;
    }
    setTestingChecklist(emptyChecklist());
    setPaymentMethod('cash');
    setPaymentAmount(getOrderDebt(order));
    setScreenProtection(false);
    setCleaning(false);
    setSubmitting(false);
  }, [open, order?.id]);

  useEffect(() => {
    if (!open || !order) {
      return;
    }
    setPaymentAmount(getOrderDebt(order));
  }, [open, order]);

  const extrasTotal = (screenProtection ? 2000 : 0) + (cleaning ? 1000 : 0);
  const displayAmount = paymentAmount + extrasTotal;
  const allTestsPassed = useMemo(
    () => Object.values(testingChecklist).every(Boolean),
    [testingChecklist]
  );

  const handleCheckAllTests = () => {
    setTestingChecklist(allPassedChecklist());
    toast.success('Все тесты отмечены как пройденные');
  };

  const handleComplete = async () => {
    if (!allTestsPassed) {
      toast.error('Не все тесты пройдены. Проверьте чек-лист перед выдачей.');
      return;
    }
    setSubmitting(true);
    try {
      await onComplete({
        testingChecklist,
        paymentMethod,
        paymentAmount: displayAmount,
        screenProtection,
        cleaning,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Выдача заказа клиенту</DialogTitle>
      <DialogContent>
        {order && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Заказ {order.orderNumber}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          Клиент: <strong>{order.clientName}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Телефон: <strong>{formatPhone(order.clientPhone)}</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          Устройство:{' '}
                          <strong>
                            {order.deviceBrand} {order.deviceModel}
                          </strong>
                        </Typography>
                        <Typography variant="body2">
                          Стоимость: <strong>{getOrderTotal(order).toLocaleString('ru-RU')} ₽</strong>
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Выполненные работы
                </Typography>
                <Card>
                  <CardContent>
                    {order.parts && order.parts.length > 0 ? (
                      <Box>
                        {order.parts.map((part, index) => (
                          <Box
                            key={part.id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1,
                              borderBottom: index < order.parts!.length - 1 ? '1px solid' : 'none',
                              borderColor: 'divider',
                            }}
                          >
                            <Box>
                              <Typography variant="body1">{getOrderLineTitle(part as OrderPart & { workName?: string })}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Количество: {part.quantity} • Цена работы: {part.unitPrice.toLocaleString('ru-RU')} ₽
                                {(part as any).partInfo && (
                                  <span>
                                    <br />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Запчасть: {(part as any).partInfo.name}
                                      {showPartPrices ? (
                                        <span style={{ color: '#FF6B35', fontWeight: 'bold' }}>
                                          {' '}
                                          ({(part as any).partInfo.price?.toLocaleString('ru-RU')} ₽)
                                        </span>
                                      ) : (
                                        <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}>
                                          {' '}
                                          (включено в стоимость работы)
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
                              <IconButton size="small" onClick={() => onRemovePart(part.id)} sx={{ color: 'error.main' }}>
                                <Delete />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                        <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid #FF6B35' }}>
                          <Typography variant="h6" textAlign="right">
                            Итого:{' '}
                            {order.parts.reduce((sum, part) => sum + part.totalPrice, 0).toLocaleString('ru-RU')} ₽
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
                        onClose();
                        onAddWork(order);
                      }}
                      sx={{ mt: 2 }}
                    >
                      Добавить работу
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

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
                      },
                    }}
                  >
                    Проверил все
                  </Button>
                </Box>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      {checklistItems.map((test) => (
                        <Grid item xs={12} md={6} key={test.key}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={testingChecklist[test.key]}
                              onChange={(e) =>
                                setTestingChecklist((prev) => ({ ...prev, [test.key]: e.target.checked }))
                              }
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

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Дополнительные услуги
                </Typography>
                <Card>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Button
                          variant={screenProtection ? 'contained' : 'outlined'}
                          fullWidth
                          startIcon={<Security />}
                          onClick={() => setScreenProtection((prev) => !prev)}
                          sx={{
                            height: 60,
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            background: screenProtection
                              ? 'linear-gradient(45deg, #FF6B35 30%, #FF8A65 90%)'
                              : 'transparent',
                            borderColor: '#FF6B35',
                            color: screenProtection ? 'white' : '#FF6B35',
                            boxShadow: screenProtection ? '0 3px 5px 2px rgba(255, 107, 53, .3)' : 'none',
                            '&:hover': {
                              background: screenProtection
                                ? 'linear-gradient(45deg, #E64A19 30%, #FF6B35 90%)'
                                : 'rgba(255, 107, 53, 0.1)',
                              borderColor: '#E64A19',
                            },
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
                          variant={cleaning ? 'contained' : 'outlined'}
                          fullWidth
                          startIcon={<CleaningServices />}
                          onClick={() => setCleaning((prev) => !prev)}
                          sx={{
                            height: 60,
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            background: cleaning
                              ? 'linear-gradient(45deg, #2196F3 30%, #42A5F5 90%)'
                              : 'transparent',
                            borderColor: '#2196F3',
                            color: cleaning ? 'white' : '#2196F3',
                            boxShadow: cleaning ? '0 3px 5px 2px rgba(33, 150, 243, .3)' : 'none',
                            '&:hover': {
                              background: cleaning
                                ? 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)'
                                : 'rgba(33, 150, 243, 0.1)',
                              borderColor: '#1976D2',
                            },
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

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Оплата
                </Typography>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Способ оплаты</InputLabel>
                          <Select
                            value={paymentMethod}
                            label="Способ оплаты"
                            onChange={(e) =>
                              setPaymentMethod(e.target.value as OrderDeliveryCompletePayload['paymentMethod'])
                            }
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
                          value={displayAmount}
                          onChange={(e) => setPaymentAmount(Math.max(0, Number(e.target.value) - extrasTotal))}
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
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={() => void handleComplete()}
          disabled={!allTestsPassed || submitting || !order}
          startIcon={<LocalShipping />}
        >
          Выдать заказ клиенту
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(OrderDeliveryDialog);
