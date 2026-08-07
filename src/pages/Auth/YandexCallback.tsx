import React, { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Container, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import {
  YANDEX_AUTH_COMPANY_KEY,
  YANDEX_AUTH_MODE_KEY,
  YANDEX_AUTH_STATE_KEY,
  yandexAuthService,
} from '../../services/yandexAuthService';
import { appSettingsService, isOnboardingRequired } from '../../services/appSettingsService';
import { useCrmAppearance } from '../../context/CrmThemeProvider';

const YandexCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gradients } = useCrmAppearance();
  const { completeOAuthLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        setError('Авторизация через Яндекс была отменена');
        return;
      }

      const code = searchParams.get('code')?.trim() || '';
      const state = searchParams.get('state')?.trim() || '';
      const savedState = sessionStorage.getItem(YANDEX_AUTH_STATE_KEY) || '';

      if (!code || !state || !savedState || state !== savedState) {
        setError('Не удалось подтвердить авторизацию. Попробуйте снова.');
        return;
      }

      const companyName = sessionStorage.getItem(YANDEX_AUTH_COMPANY_KEY) || '';

      try {
        const result = await yandexAuthService.complete({ code, state, companyName });
        await completeOAuthLogin(result.user, result.token);
        toast.success('Вход через Яндекс выполнен');

        sessionStorage.removeItem(YANDEX_AUTH_STATE_KEY);
        sessionStorage.removeItem(YANDEX_AUTH_MODE_KEY);
        sessionStorage.removeItem(YANDEX_AUTH_COMPANY_KEY);

        const settings = await appSettingsService.refreshFromApi();
        navigate(isOnboardingRequired(settings) ? '/onboarding' : '/dashboard', { replace: true });
      } catch (completeError: unknown) {
        const message =
          completeError instanceof Error ? completeError.message : 'Не удалось завершить вход через Яндекс';
        setError(message);
      }
    };

    void run();
  }, [completeOAuthLogin, navigate, searchParams]);

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
      <Container maxWidth="sm">
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" fontWeight={700}>
              Завершаем вход через Яндекс...
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default YandexCallback;
