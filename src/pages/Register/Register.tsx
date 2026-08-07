import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BusinessOutlined, LockOutlined, MailOutline, PhoneOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { crmRadius } from '../../styles/tokens';
import { useCrmAppearance } from '../../context/CrmThemeProvider';
import YandexAuthButton from '../../components/YandexAuthButton/YandexAuthButton';
import { yandexAuthService } from '../../services/yandexAuthService';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { gradients } = useCrmAppearance();
  const { register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yandexEnabled, setYandexEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(true);

  useEffect(() => {
    void yandexAuthService
      .getConfig()
      .then((config) => setYandexEnabled(Boolean(config.enabled)))
      .catch(() => setYandexEnabled(false));
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (!companyName.trim()) {
      setValidationError('Укажите название компании');
      return;
    }
    if (!email.trim()) {
      setValidationError('Укажите email');
      return;
    }
    if (password.length < 6) {
      setValidationError('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await register({
        companyName: companyName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        name: name.trim(),
      });
      setVerificationEmail(result.email || email.trim());
      setVerificationSent(result.verificationSent !== false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось зарегистрироваться';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    navigate('/login', { replace: true });
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
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: crmRadius.md,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 4,
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h4" fontWeight={800}>
              Регистрация
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Создайте организацию и получите 14 дней бесплатного доступа ко всем модулям CRM.
            </Typography>

            {validationError && <Alert severity="error" sx={{ mb: 2 }}>{validationError}</Alert>}

            <Box component="form" onSubmit={onSubmit}>
              <TextField
                fullWidth
                label="Название компании"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessOutlined color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email (логин)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutline color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Телефон (необязательно)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneOutlined color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button type="submit" fullWidth size="large" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
              </Button>
            </Box>

            {yandexEnabled ? (
              <Stack spacing={2} sx={{ mt: 2.5 }}>
                <Divider>
                  <Typography variant="body2" color="text.secondary">
                    или
                  </Typography>
                </Divider>
                <YandexAuthButton mode="register" companyName={companyName} disabled={isSubmitting} />
              </Stack>
            ) : null}

            <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Уже есть аккаунт?
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Войти
              </Link>
            </Stack>
            <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
              <Link component={RouterLink} to="/" variant="body2" color="text.secondary">
                На главную
              </Link>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Dialog
        open={Boolean(verificationEmail)}
        onClose={goToLogin}
        maxWidth="xs"
        fullWidth
        aria-labelledby="register-verification-dialog-title"
      >
        <DialogTitle id="register-verification-dialog-title" sx={{ textAlign: 'center', pt: 3 }}>
          <MailOutline sx={{ fontSize: 48, color: 'primary.main', display: 'block', mx: 'auto', mb: 1 }} />
          Подтвердите учётную запись
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Мы отправили письмо с подтверждением на адрес{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {verificationEmail}
            </Box>
            . Перейдите по ссылке в письме, чтобы активировать аккаунт.
          </Typography>
          <Alert severity={verificationSent ? 'info' : 'warning'} sx={{ mt: 2, textAlign: 'left' }}>
            {verificationSent
              ? 'После подтверждения email войдите в CRM с указанным адресом и паролем.'
              : 'Аккаунт создан, но письмо не отправилось. На странице входа нажмите «Отправить письмо повторно».'}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3 }}>
          <Button variant="contained" size="large" onClick={goToLogin} sx={{ minWidth: 140 }}>
            ОК
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Register;
