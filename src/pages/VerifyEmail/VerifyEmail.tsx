import React, { useEffect, useState } from 'react';
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
import { CheckCircleOutline, ErrorOutline, MailOutline } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { platformService } from '../../services/platformService';
import { crmRadius } from '../../styles/tokens';
import { useCrmAppearance } from '../../context/CrmThemeProvider';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { gradients } = useCrmAppearance();
  const token = searchParams.get('token')?.trim() || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>('loading');
  const [message, setMessage] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('Ссылка подтверждения не содержит токен.');
      return;
    }

    let cancelled = false;

    void platformService
      .verifyEmail(token)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setStatus('success');
        setMaskedEmail(result.email);
        setMessage('Email подтверждён. Теперь можно войти в CRM.');
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Не удалось подтвердить email');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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
          <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
            {status === 'loading' ? (
              <Stack spacing={2} alignItems="center">
                <CircularProgress color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Подтверждаем email...
                </Typography>
              </Stack>
            ) : null}

            {status === 'success' ? (
              <Stack spacing={2} alignItems="center">
                <CheckCircleOutline sx={{ fontSize: 56, color: 'success.main' }} />
                <Typography variant="h4" fontWeight={800}>
                  Email подтверждён
                </Typography>
                {maskedEmail ? (
                  <Typography variant="body1" color="text.secondary">
                    Адрес {maskedEmail} успешно подтверждён.
                  </Typography>
                ) : null}
                <Alert severity="success" sx={{ width: '100%', textAlign: 'left' }}>
                  {message}
                </Alert>
                <Button variant="contained" size="large" onClick={() => navigate('/login', { replace: true })}>
                  Войти в CRM
                </Button>
              </Stack>
            ) : null}

            {(status === 'error' || status === 'missing') ? (
              <Stack spacing={2} alignItems="center">
                <ErrorOutline sx={{ fontSize: 56, color: 'error.main' }} />
                <Typography variant="h4" fontWeight={800}>
                  Не удалось подтвердить email
                </Typography>
                <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                  {message}
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Запросите новое письмо на странице входа или зарегистрируйтесь повторно.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button variant="contained" component={RouterLink} to="/login">
                    Перейти ко входу
                  </Button>
                  <Button variant="outlined" component={RouterLink} to="/register">
                    Регистрация
                  </Button>
                </Stack>
              </Stack>
            ) : null}

            {status !== 'loading' ? (
              <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
                <Button component={RouterLink} to="/" color="inherit">
                  На главную
                </Button>
              </Stack>
            ) : null}

            {status === 'loading' ? (
              <Box sx={{ mt: 2 }}>
                <MailOutline sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            ) : null}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default VerifyEmail;
