import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  AssignmentOutlined,
  Inventory2Outlined,
  PeopleOutlined,
  PointOfSaleOutlined,
  RocketLaunchOutlined,
  VerifiedOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import { crmGradients, crmRadius, crmShadow } from '../../styles/tokens';
import { DEFAULT_MONTHLY_PRICE } from '../../utils/subscriptionPricing';

const features = [
  {
    icon: <AssignmentOutlined fontSize="large" />,
    title: 'Заказы и ремонт',
    text: 'Статусы, сроки, диагностика и история работ в одном окне.',
  },
  {
    icon: <PeopleOutlined fontSize="large" />,
    title: 'Клиенты и устройства',
    text: 'База клиентов, устройств и коммуникаций без Excel.',
  },
  {
    icon: <Inventory2Outlined fontSize="large" />,
    title: 'Склад и запчасти',
    text: 'Остатки, движения и списание в заказах.',
  },
  {
    icon: <PointOfSaleOutlined fontSize="large" />,
    title: 'Касса и отчёты',
    text: 'Оплаты, выручка и контроль для владельца сервиса.',
  },
];

const Landing: React.FC = () => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Box
      sx={{
        background: crmGradients.hero,
        color: 'common.white',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
          <Typography variant="h5" fontWeight={800}>
            CRM для сервисов
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button component={RouterLink} to="/login" color="inherit" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.4)' }}>
              Войти
            </Button>
            <Button component={RouterLink} to="/register" variant="contained" color="primary">
              Регистрация
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Chip
                icon={<RocketLaunchOutlined />}
                label="14 дней бесплатно"
                sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
              />
              <Typography variant="h2" sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' }, fontWeight: 800, lineHeight: 1.1 }}>
                Не теряйте заказы, сроки и прибыль.
              </Typography>
              <Typography variant="h6" sx={{ mt: 2.5, opacity: 0.88, maxWidth: 640, fontWeight: 400 }}>
                Управляйте всеми процессами сервиса в одной системе и контролируйте каждый ремонт от приёма до оплаты. 14 дней полного доступа бесплатно
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                <Button component={RouterLink} to="/register" size="large" variant="contained" color="primary">
                  Начать бесплатно
                </Button>
                <Button component={RouterLink} to="/login" size="large" variant="outlined" sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.45)' }}>
                  Уже есть аккаунт
                </Button>
              </Stack>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'common.white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VerifiedOutlined color="primary" />
                    <Typography fontWeight={700}>Что входит в пробный период</Typography>
                  </Stack>
                  {['Все модули CRM', 'Неограниченно сотрудников', 'Печать документов', 'Telegram и SMS интеграции'].map((item) => (
                    <Typography key={item} variant="body2" sx={{ opacity: 0.9 }}>
                      • {item}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>

    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
      <Typography variant="h4" fontWeight={800} textAlign="center" sx={{ mb: 1 }}>
        Меньше рутины — больше выполненных заказов
      </Typography>
      <Typography color="text.secondary" textAlign="center" sx={{ mb: 5, maxWidth: 640, mx: 'auto' }}>
        CRM помогает не терять клиентов, контролировать сроки ремонта и видеть, что происходит в сервисе прямо сейчас.
      </Typography>

      <Grid container spacing={3}>
        {features.map((feature) => (
          <Grid item xs={12} sm={6} md={3} key={feature.title}>
            <Card sx={{ height: '100%', borderRadius: crmRadius.md, boxShadow: crmShadow.soft }}>
              <CardContent>
                <Box sx={{ color: 'primary.main', mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.text}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card
        sx={{
          mt: 6,
          p: { xs: 3, md: 4 },
          borderRadius: crmRadius.md,
          background: 'linear-gradient(135deg, rgba(234,88,12,0.08), rgba(15,118,110,0.08))',
          boxShadow: crmShadow.panel,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" fontWeight={800}>
              Тариф после пробного периода
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              14 дней бесплатно, затем подписка от {DEFAULT_MONTHLY_PRICE.toLocaleString('ru-RU')} ₽/мес. Оплата онлайн через ЮMoney в личном кабинете.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={1.5}>
              <Button component={RouterLink} to="/register" variant="contained" size="large" fullWidth>
                Зарегистрировать компанию
              </Button>
              <Button component={RouterLink} to="/login" variant="outlined" size="large" fullWidth>
                Войти в CRM
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>
    </Container>
  </Box>
);

export default Landing;
