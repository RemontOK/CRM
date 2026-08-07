import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  BusinessCenterOutlined,
  LockOutlined,
  MailOutline,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { AuthError } from '../../services/authService';
import { appSettingsService, isOnboardingRequired } from '../../services/appSettingsService';
import { platformService } from '../../services/platformService';
import { getFirstAllowedRoute } from '../../utils/employeeModuleAccess';
import { crmRadius } from '../../styles/tokens';
import { useCrmAppearance } from '../../context/CrmThemeProvider';
import YandexAuthButton from '../../components/YandexAuthButton/YandexAuthButton';
import { yandexAuthService } from '../../services/yandexAuthService';

const highlights = [
  'Прозрачный контроль статусов и сроков ремонта',
  'Быстрая печать документов и фиксация оплат',
  'Единая история клиента, устройства и работ',
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { gradients, colors } = useCrmAppearance();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState<{ email: string; rawEmail: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const { login, error, isLoading } = useAuth();
  const [yandexEnabled, setYandexEnabled] = React.useState(false);

  useEffect(() => {
    void yandexAuthService
      .getConfig()
      .then((config) => setYandexEnabled(Boolean(config.enabled)))
      .catch(() => setYandexEnabled(false));
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setEmailNotVerified(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('Логин обязателен');
      return;
    }
    if (!password) {
      setValidationError('Пароль обязателен');
      return;
    }
    try {
      const userData = await login({ email: trimmedEmail, password });
      toast.success('Вход выполнен');
      if (userData.isPlatformAdmin) {
        navigate('/platform-admin', { replace: true });
        return;
      }
      if (userData.role === 'admin' && isOnboardingRequired(appSettingsService.getSettings())) {
        navigate('/onboarding', { replace: true });
        return;
      }
      navigate(getFirstAllowedRoute(userData), { replace: true });
    } catch (currentError: unknown) {
      if (currentError instanceof AuthError && currentError.code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified({
          email: currentError.email || trimmedEmail,
          rawEmail: trimmedEmail,
        });
        return;
      }
      toast.error(currentError instanceof Error ? currentError.message : 'Не удалось войти в систему');
    }
  };

  const onResendVerification = async () => {
    if (!emailNotVerified?.rawEmail) {
      return;
    }
    try {
      setResendLoading(true);
      await platformService.resendVerification(emailNotVerified.rawEmail);
      toast.success('Письмо с подтверждением отправлено');
    } catch (currentError: unknown) {
      toast.error(currentError instanceof Error ? currentError.message : 'Не удалось отправить письмо');
    } finally {
      setResendLoading(false);
    }
  };

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
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
          }}
        >
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <Box sx={{ pr: { md: 5 } }}>
              <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1.4 }}>
                CRM ДЛЯ СЕРВИСОВ
              </Typography>
              <Typography variant="h2" sx={{ mt: 1.5, maxWidth: 720, color: 'text.primary', fontWeight: 800 }}>
                Личный кабинет: приём, ремонт, выдача и учёт в одной системе.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2.5, maxWidth: 620 }}>
                Управляйте заказами, клиентами и складом без лишних действий. Все этапы ремонта фиксируются в CRM и доступны команде в реальном времени.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                {highlights.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      p: 2,
                      borderRadius: crmRadius.md,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 2,
                    }}
                  >
                    <Typography fontWeight={700} color="text.primary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <Card
              sx={{
                maxWidth: 520,
                ml: 'auto',
                borderRadius: crmRadius.md,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: 4,
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: crmRadius.md,
                    mb: 3,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                    color: 'common.white',
                    boxShadow: 3,
                  }}
                >
                  <BusinessCenterOutlined fontSize="large" />
                </Box>

                <Typography variant="h4">Вход в CRM</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Вход выполняется по учетной записи сотрудника, созданной в системе.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
                {emailNotVerified && (
                  <Alert
                    severity="warning"
                    sx={{ mb: 2.5 }}
                    action={
                      <Button color="inherit" size="small" onClick={onResendVerification} disabled={resendLoading}>
                        {resendLoading ? 'Отправка...' : 'Отправить снова'}
                      </Button>
                    }
                  >
                    Email {emailNotVerified.email} не подтверждён. Проверьте почту или запросите письмо повторно.
                  </Alert>
                )}
                {validationError && <Alert severity="error" sx={{ mb: 2.5 }}>{validationError}</Alert>}

                <Box component="form" onSubmit={onSubmit} autoComplete="off">
                  <input
                    type="text"
                    name="email_decoy"
                    autoComplete="username"
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }}
                  />
                  <input
                    type="password"
                    name="password_decoy"
                    autoComplete="current-password"
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }}
                  />
                  <TextField
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    fullWidth
                    label="Логин или Email"
                    type="text"
                    name="login_email"
                    autoComplete="off"
                    sx={{ mb: 2 }}
                    inputProps={{
                      'data-lpignore': 'true',
                      'data-1p-ignore': 'true',
                      'data-form-type': 'other',
                      autoComplete: 'off',
                      'aria-autocomplete': 'none',
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutline color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    fullWidth
                    label="Пароль"
                    type={showPassword ? 'text' : 'password'}
                    name="login_password"
                    autoComplete="new-password"
                    sx={{ mb: 3 }}
                    inputProps={{
                      'data-lpignore': 'true',
                      'data-1p-ignore': 'true',
                      'data-form-type': 'other',
                      autoComplete: 'new-password',
                      'aria-autocomplete': 'none',
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((value) => !value)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button type="submit" fullWidth size="large" variant="contained" disabled={isLoading}>
                    {isLoading ? 'Выполняется вход...' : 'Войти'}
                  </Button>
                </Box>

                {yandexEnabled ? (
                  <Stack spacing={2} sx={{ mt: 2.5 }}>
                    <Divider>
                      <Typography variant="body2" color="text.secondary">
                        или
                      </Typography>
                    </Divider>
                    <YandexAuthButton mode="login" disabled={isLoading} />
                  </Stack>
                ) : null}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: 'center' }}>
                  Нет аккаунта?{' '}
                  <RouterLink to="/register" style={{ color: 'inherit', fontWeight: 700 }}>
                    Зарегистрироваться
                  </RouterLink>
                  {' · '}
                  <RouterLink to="/" style={{ color: 'inherit' }}>
                    На главную
                  </RouterLink>
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;

