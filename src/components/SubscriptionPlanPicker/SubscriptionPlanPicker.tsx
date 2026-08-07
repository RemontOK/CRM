import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { platformService } from '../../services/platformService';
import {
  SubscriptionMonths,
  SubscriptionPlanOption,
  buildSubscriptionPlans,
} from '../../utils/subscriptionPricing';

interface SubscriptionPlanPickerProps {
  monthlyPrice?: number;
  billingEnabled: boolean;
  isLoading?: boolean;
  payButtonLabel?: string;
  compact?: boolean;
  paymentPurpose?: 'subscription' | 'location';
}

const SubscriptionPlanPicker: React.FC<SubscriptionPlanPickerProps> = ({
  monthlyPrice,
  billingEnabled,
  isLoading = false,
  payButtonLabel = 'Перейти к оплате',
  compact = false,
  paymentPurpose = 'subscription',
}) => {
  const plans = useMemo(() => buildSubscriptionPlans(monthlyPrice), [monthlyPrice]);
  const [selectedMonths, setSelectedMonths] = useState<SubscriptionMonths>(3);
  const [isPaying, setIsPaying] = useState(false);

  const selectedPlan = plans.find((plan) => plan.months === selectedMonths) || plans[0];

  const handlePay = async () => {
    if (!selectedPlan) {
      return;
    }

    setIsPaying(true);
    try {
      const payment =
        paymentPurpose === 'location'
          ? await platformService.createYoomoneyLocationPayment(selectedPlan.months)
          : await platformService.createYoomoneyPayment(selectedPlan.months);
      window.location.assign(payment.paymentUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось открыть оплату';
      toast.error(message);
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return <CircularProgress sx={{ mx: compact ? 0 : 'auto' }} />;
  }

  if (!billingEnabled) {
    return <Alert severity="warning">Онлайн-оплата временно недоступна. Свяжитесь с поддержкой.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {paymentPurpose === 'location'
          ? 'Каждая дополнительная локация оплачивается отдельной подпиской. Первый месяц — полная цена, каждый следующий месяц в пакете со скидкой 10%.'
          : 'Первый месяц — полная цена, каждый следующий месяц в пакете со скидкой 10%.'}
      </Typography>
      <Grid container spacing={1.5}>
        {plans.map((plan) => (
          <Grid item xs={6} md={3} key={plan.months}>
            <PlanCard plan={plan} selected={selectedMonths === plan.months} onSelect={() => setSelectedMonths(plan.months)} />
          </Grid>
        ))}
      </Grid>
      {selectedPlan ? (
        <Alert severity="info">
          К оплате: <strong>{selectedPlan.amount.toLocaleString('ru-RU')} ₽</strong> за {selectedPlan.label}
          {paymentPurpose === 'location' ? ' — дополнительная локация' : ''}
          {selectedPlan.savings > 0 ? (
            <>
              {' '}
              (экономия {selectedPlan.savings.toLocaleString('ru-RU')} ₽, ~{selectedPlan.monthlyEquivalent.toLocaleString('ru-RU')} ₽/мес)
            </>
          ) : null}
          .{' '}
          {paymentPurpose === 'location'
            ? 'После оплаты откроется ещё одна локация и продлится доступ к CRM.'
            : 'После оплаты подписка продлится автоматически.'}
        </Alert>
      ) : null}
      <Button
        variant="contained"
        size={compact ? 'medium' : 'large'}
        startIcon={isPaying ? <CircularProgress size={18} color="inherit" /> : <CreditCard />}
        disabled={isPaying || !selectedPlan}
        onClick={() => void handlePay()}
        sx={{ alignSelf: compact ? 'flex-start' : 'stretch' }}
      >
        {isPaying ? 'Переход к оплате...' : `${payButtonLabel} — ${selectedPlan?.amount.toLocaleString('ru-RU')} ₽`}
      </Button>
    </Stack>
  );
};

const PlanCard: React.FC<{
  plan: SubscriptionPlanOption;
  selected: boolean;
  onSelect: () => void;
}> = ({ plan, selected, onSelect }) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      borderColor: selected ? 'primary.main' : 'divider',
      borderWidth: selected ? 2 : 1,
      bgcolor: selected ? 'var(--crm-color-primary-soft)' : 'background.paper',
    }}
  >
    <CardActionArea onClick={onSelect} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={800}>{plan.label}</Typography>
            {plan.savings > 0 ? <Chip size="small" color="success" label="-10%" /> : null}
          </Stack>
          <Typography variant="h6" fontWeight={800}>
            {plan.amount.toLocaleString('ru-RU')} ₽
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ~{plan.monthlyEquivalent.toLocaleString('ru-RU')} ₽/мес
          </Typography>
        </Stack>
      </CardContent>
    </CardActionArea>
  </Card>
);

export default SubscriptionPlanPicker;
