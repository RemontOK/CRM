import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  Grid,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Person,
  Notifications,
  Business,
  Payment,
  Security,
  Backup,
  Settings as SettingsIcon,
  Save,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    profile: {
      name: 'Администратор',
      email: 'admin@service.com',
      phone: '+7 (999) 123-45-67',
      avatar: '',
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      orderUpdates: true,
      paymentReminders: true,
      lowStockAlerts: true,
    },
    business: {
      companyName: 'НЭК Сервис',
      address: 'ул. Примерная, д. 1',
      phone: '+7 (999) 123-45-67',
      email: 'info@service.com',
      workingHours: '9:00 - 18:00',
      timezone: 'Europe/Moscow',
    },
    payment: {
      currency: 'RUB',
      taxRate: 20,
      paymentMethods: ['cash', 'card', 'transfer'],
      installmentEnabled: true,
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetention: 365,
      language: 'ru',
      theme: 'light',
    },
  });

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    // Здесь будет логика сохранения настроек
    toast.success('Настройки сохранены');
  };

  const handleBackup = () => {
    toast.success('Резервная копия создана');
  };

  const tabContent = [
    // Profile Tab
    <Grid container spacing={3} key="profile">
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Профиль пользователя
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя"
                  value={settings.profile.name}
                  onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Телефон"
                  value={settings.profile.phone}
                  onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>,

    // Notifications Tab
    <Grid container spacing={3} key="notifications">
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Уведомления
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText
                  primary="Email уведомления"
                  secondary="Получать уведомления на email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText
                  primary="SMS уведомления"
                  secondary="Получать SMS уведомления"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.smsNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText
                  primary="Push уведомления"
                  secondary="Получать push уведомления в браузере"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>,

    // Business Tab
    <Grid container spacing={3} key="business">
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Информация о компании
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Название компании"
                  value={settings.business.companyName}
                  onChange={(e) => handleSettingChange('business', 'companyName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Адрес"
                  value={settings.business.address}
                  onChange={(e) => handleSettingChange('business', 'address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Телефон"
                  value={settings.business.phone}
                  onChange={(e) => handleSettingChange('business', 'phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={settings.business.email}
                  onChange={(e) => handleSettingChange('business', 'email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Рабочие часы"
                  value={settings.business.workingHours}
                  onChange={(e) => handleSettingChange('business', 'workingHours', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Часовой пояс</InputLabel>
                  <Select
                    value={settings.business.timezone}
                    onChange={(e) => handleSettingChange('business', 'timezone', e.target.value)}
                    label="Часовой пояс"
                  >
                    <MenuItem value="Europe/Moscow">Москва (UTC+3)</MenuItem>
                    <MenuItem value="Europe/Kiev">Киев (UTC+2)</MenuItem>
                    <MenuItem value="Asia/Almaty">Алматы (UTC+6)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>,

    // Payment Tab
    <Grid container spacing={3} key="payment">
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Настройки платежей
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Валюта</InputLabel>
                  <Select
                    value={settings.payment.currency}
                    onChange={(e) => handleSettingChange('payment', 'currency', e.target.value)}
                    label="Валюта"
                  >
                    <MenuItem value="RUB">Рубль (₽)</MenuItem>
                    <MenuItem value="USD">Доллар ($)</MenuItem>
                    <MenuItem value="EUR">Евро (€)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Налоговая ставка (%)"
                  type="number"
                  value={settings.payment.taxRate}
                  onChange={(e) => handleSettingChange('payment', 'taxRate', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Способы оплаты
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Наличные" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.payment.paymentMethods.includes('cash')}
                        onChange={(e) => {
                          const methods = settings.payment.paymentMethods;
                          if (e.target.checked) {
                            handleSettingChange('payment', 'paymentMethods', [...methods, 'cash']);
                          } else {
                            handleSettingChange('payment', 'paymentMethods', methods.filter(m => m !== 'cash'));
                          }
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Банковская карта" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.payment.paymentMethods.includes('card')}
                        onChange={(e) => {
                          const methods = settings.payment.paymentMethods;
                          if (e.target.checked) {
                            handleSettingChange('payment', 'paymentMethods', [...methods, 'card']);
                          } else {
                            handleSettingChange('payment', 'paymentMethods', methods.filter(m => m !== 'card'));
                          }
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Банковский перевод" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.payment.paymentMethods.includes('transfer')}
                        onChange={(e) => {
                          const methods = settings.payment.paymentMethods;
                          if (e.target.checked) {
                            handleSettingChange('payment', 'paymentMethods', [...methods, 'transfer']);
                          } else {
                            handleSettingChange('payment', 'paymentMethods', methods.filter(m => m !== 'transfer'));
                          }
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>,

    // System Tab
    <Grid container spacing={3} key="system">
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Системные настройки
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Язык</InputLabel>
                  <Select
                    value={settings.system.language}
                    onChange={(e) => handleSettingChange('system', 'language', e.target.value)}
                    label="Язык"
                  >
                    <MenuItem value="ru">Русский</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="kz">Қазақша</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Тема</InputLabel>
                  <Select
                    value={settings.system.theme}
                    onChange={(e) => handleSettingChange('system', 'theme', e.target.value)}
                    label="Тема"
                  >
                    <MenuItem value="light">Светлая</MenuItem>
                    <MenuItem value="dark">Темная</MenuItem>
                    <MenuItem value="auto">Автоматически</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Резервное копирование
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Backup />
                    </ListItemIcon>
                    <ListItemText
                      primary="Автоматическое резервное копирование"
                      secondary="Создавать резервные копии автоматически"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.system.autoBackup}
                        onChange={(e) => handleSettingChange('system', 'autoBackup', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Частота резервного копирования"
                      secondary="Как часто создавать резервные копии"
                    />
                    <ListItemSecondaryAction>
                      <FormControl size="small">
                        <Select
                          value={settings.system.backupFrequency}
                          onChange={(e) => handleSettingChange('system', 'backupFrequency', e.target.value)}
                        >
                          <MenuItem value="daily">Ежедневно</MenuItem>
                          <MenuItem value="weekly">Еженедельно</MenuItem>
                          <MenuItem value="monthly">Ежемесячно</MenuItem>
                        </Select>
                      </FormControl>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<Backup />}
                  onClick={handleBackup}
                >
                  Создать резервную копию
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>,
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="600" gutterBottom>
        Настройки
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab icon={<Person />} label="Профиль" />
            <Tab icon={<Notifications />} label="Уведомления" />
            <Tab icon={<Business />} label="Компания" />
            <Tab icon={<Payment />} label="Платежи" />
            <Tab icon={<SettingsIcon />} label="Система" />
          </Tabs>
        </Box>
        
        <CardContent>
          {tabContent[activeTab]}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                // Сброс настроек
                toast.success('Настройки сброшены');
              }}
            >
              Сбросить
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
            >
              Сохранить
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;