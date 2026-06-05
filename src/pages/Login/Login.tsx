import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
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
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { crmRadius } from '../../styles/tokens';

const schema = yup.object({
  email: yup.string().required('Логин обязателен'),
  password: yup.string().min(6, 'Минимум 6 символов').required('Пароль обязателен'),
});

interface LoginForm {
  email: string;
  password: string;
}

const highlights = [
  'Прозрачный контроль статусов и сроков ремонта',
  'Быстрая печать документов и фиксация оплат',
  'Единая история клиента, устройства и работ',
];

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data);
      toast.success('Вход выполнен');
    } catch (currentError: any) {
      toast.error(currentError.message || 'Не удалось войти в систему');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background:
          'radial-gradient(circle at top left, rgba(234, 88, 12, 0.20), transparent 24%), radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.12), transparent 22%), linear-gradient(135deg, #fff8f1 0%, #eff6ff 100%)',
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
                НЭК СЕРВИС
              </Typography>
              <Typography variant="h2" sx={{ mt: 1.5, maxWidth: 720 }}>
                Личный кабинет сервиса НЭК: прием, ремонт, выдача и учет денег в одной системе.
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
                      bgcolor: 'rgba(255,255,255,0.78)',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      boxShadow: '0 14px 30px rgba(15, 23, 42, 0.06)',
                    }}
                  >
                    <Typography fontWeight={700}>{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <Card sx={{ maxWidth: 520, ml: 'auto' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: crmRadius.md,
                    mb: 3,
                    background: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
                    color: 'common.white',
                    boxShadow: '0 16px 30px rgba(234, 88, 12, 0.25)',
                  }}
                >
                  <BusinessCenterOutlined fontSize="large" />
                </Box>

                <Typography variant="h4">Вход в CRM</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Вход выполняется по учетной записи сотрудника, созданной в системе.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                  <TextField
                    {...register('email')}
                    fullWidth
                    label="Логин или Email"
                    type="text"
                    error={!!errors.email}
                    helperText={errors.email?.message}
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
                    {...register('password')}
                    fullWidth
                    label="Пароль"
                    type={showPassword ? 'text' : 'password'}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    sx={{ mb: 3 }}
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
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;

