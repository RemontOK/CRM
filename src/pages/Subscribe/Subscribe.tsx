import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { CreditCardOutlined, SupportAgentOutlined } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { platformService } from '../../services/platformService';
import { crmRadius } from '../../styles/tokens';
import { useCrmAppearance } from '../../context/CrmThemeProvider';
import { getSubscriptionSummary } from '../../utils/subscriptionSummary';
import { getResolvedTenant } from '../../utils/tenantAccess';
import SubscriptionPlanPicker from '../../components/SubscriptionPlanPicker/SubscriptionPlanPicker';

interface SubscribeProps {
  embedded?: boolean;
}

const Subscribe: React.FC<SubscribeProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { gradients } = useCrmAppearance();
  const { user, logout, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const tenant = getResolvedTenant(user?.tenant);
  const isSuspended = tenant?.accessStatus === 'suspended';
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(2290);
  const [isLoading, setIsLoading] = useState(true);
  const paidRedirect = searchParams.get('paid') === '1';
  const locationPaidRedirect = searchParams.get('paid') === 'location';

  useEffect(() => {
    void platformService
      .getBillingConfig()
      .then((config) => {
        setBillingEnabled(Boolean(config.enabled));
        setMonthlyPrice(Number(config.monthlyPrice || config.amount) || 2290);
      })
      .catch(() => {
        setBillingEnabled(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!paidRedirect && !locationPaidRedirect) {
      return undefined;
    }

    let cancelled = false;

    const pollPaymentStatus = async () => {
      try {
        const config = await platformService.getBillingConfig();
        if (cancelled || !config.tenant) {
          return;
        }

        updateUser({ tenant: config.tenant });

        if (locationPaidRedirect) {
          const slots = Math.max(1, Number(config.locationSlots || config.tenant?.locationSlots) || 1);
          const used = Math.max(0, Number(config.locationsCount) || 0);
          if (slots > used) {
            navigate('/settings?section=locations&paid=location', { replace: true });
          }
          return;
        }

        if (config.tenant.accessStatus === 'active' || config.tenant.accessStatus === 'trial') {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        // Keep polling until webhook activates the subscription.
      }
    };

    void pollPaymentStatus();
    const timer = window.setInterval(() => {
      void pollPaymentStatus();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paidRedirect, locationPaidRedirect, navigate, updateUser]);

  const isActive = tenant?.accessStatus === 'active' || tenant?.accessStatus === 'trial';
  const subscriptionSummary = useMemo(() => getSubscriptionSummary(tenant), [tenant]);

  const description = isSuspended
    ? 'Администратор платформы ограничил доступ к вашей организации. Свяжитесь с поддержкой.'
    : locationPaidRedirect
      ? 'Оплата за дополнительную локацию отправлена. После подтверждения ЮMoney локация откроется автоматически.'
      : paidRedirect
      ? 'Оплата отправлена. Подписка активируется автоматически в течение минуты после подтверждения ЮMoney.'
      : tenant?.accessStatus === 'trial'
        ? `${subscriptionSummary.statusHint}. Оплатите подписку заранее, чтобы не прерывать работу в CRM.`
        : tenant?.accessStatus === 'active'
          ? `${subscriptionSummary.statusHint}. Оплаченный срок добавится к текущему периоду.`
          : 'Пробный период завершён. Оплатите подписку, чтобы продолжить работу в CRM.';

  const content = (
    <Container maxWidth="md" disableGutters={embedded}>
        <Card
          sx={{
            borderRadius: crmRadius.md,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: embedded ? 2 : 4,
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  mx: 'auto',
                  mb: 2,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: crmRadius.md,
                  bgcolor: 'primary.main',
                  color: 'common.white',
                }}
              >
                {isSuspended ? <SupportAgentOutlined fontSize="large" /> : <CreditCardOutlined fontSize="large" />}
              </Box>

              <Typography variant="h4" fontWeight={800}>
                {isSuspended ? 'Доступ заблокирован' : isActive ? 'Подписка' : 'Подписка истекла'}
              </Typography>
              {!isActive && !isSuspended ? (
                <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                  Доступ к заказам, клиентам, кассе и остальным разделам CRM ограничен. Оплатите подписку, чтобы продолжить работу.
                </Alert>
              ) : null}
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                {description}
              </Typography>
            </Box>

            {tenant?.name && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Организация: <strong>{tenant.name}</strong>
                <br />
                Тариф: <strong>{subscriptionSummary.planName}</strong>
                <br />
                Статус: <strong>{subscriptionSummary.title}</strong>
                {subscriptionSummary.endsAtLabel ? (
                  <>
                    <br />
                    Действует до: <strong>{subscriptionSummary.endsAtLabel}</strong>
                  </>
                ) : null}
              </Alert>
            )}

            {paidRedirect && !isActive && !locationPaidRedirect ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Если доступ не открылся сразу — подождите 1–2 минуты и обновите страницу.
              </Alert>
            ) : null}

            {locationPaidRedirect ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                После подтверждения оплаты вы будете перенаправлены в настройки локаций.
              </Alert>
            ) : null}

            {!isSuspended && !locationPaidRedirect ? (
              isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <SubscriptionPlanPicker
                  billingEnabled={billingEnabled}
                  monthlyPrice={monthlyPrice}
                  payButtonLabel="Оплатить"
                />
              )
            ) : null}

            <Stack spacing={1.5} sx={{ mt: 3 }}>
              {isActive && !paidRedirect ? (
                <Button variant="outlined" size="large" fullWidth onClick={() => navigate('/settings')}>
                  Вернуться в настройки
                </Button>
              ) : null}
              <Button variant="outlined" size="large" fullWidth onClick={() => logout()}>
                Выйти из аккаунта
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
  );

  if (embedded) {
    return content;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 3, md: 4 },
        background: gradients.appBackground,
        color: 'text.primary',
      }}
    >
      {content}
    </Box>
  );
};

export default Subscribe;
