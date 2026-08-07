import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import toast from 'react-hot-toast';
import { platformService } from '../../services/platformService';
import { AdminTenantInfo, AdminTenantUser, TenantActivityItem } from '../../types';
import { crmRadius } from '../../styles/tokens';

const statusLabels: Record<string, string> = {
  trial: 'Пробный',
  active: 'Активен',
  suspended: 'Заблокирован',
  expired: 'Истёк',
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  trial: 'info',
  active: 'success',
  suspended: 'error',
  expired: 'warning',
};

const roleLabels: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менеджер',
  technician: 'Техник',
  cashier: 'Кассир',
};

const actionLabels: Record<string, string> = {
  login: 'Вход',
  register: 'Регистрация',
  admin_update: 'Изменение админом',
};

const TenantUsersPanel: React.FC<{ tenantId: number }> = ({ tenantId }) => {
  const [users, setUsers] = useState<AdminTenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    platformService.listTenantUsers(tenantId)
      .then((rows) => {
        if (active) {
          setUsers(rows);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  if (loading) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Загрузка пользователей...</Typography>;
  }
  if (error) {
    return <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>;
  }
  if (users.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Нет пользователей</Typography>;
  }

  return (
    <Table size="small" sx={{ mt: 1 }}>
      <TableHead>
        <TableRow>
          <TableCell>Имя</TableCell>
          <TableCell>Логин</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Роль</TableCell>
          <TableCell>Вход</TableCell>
          <TableCell>Email подтверждён</TableCell>
          <TableCell>Последний вход</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.loginEmail || '—'}</TableCell>
            <TableCell>{user.email || '—'}</TableCell>
            <TableCell>{roleLabels[user.role] || user.role}</TableCell>
            <TableCell>{user.canLogin ? 'Да' : 'Нет'}</TableCell>
            <TableCell>{user.emailVerified ? 'Да' : 'Нет'}</TableCell>
            <TableCell>
              {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ru-RU') : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const TenantRow: React.FC<{
  tenant: AdminTenantInfo;
  onStatus: (tenantId: number, status: string) => void;
  onExtend: (tenantId: number, days: number) => void;
  onDelete: (tenant: AdminTenantInfo) => void;
}> = ({ tenant, onStatus, onExtend, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [extendDays, setExtendDays] = useState('7');

  const handleExtend = () => {
    const days = Number.parseInt(extendDays, 10);
    if (!Number.isFinite(days) || days < 1) {
      toast.error('Укажите количество дней (минимум 1)');
      return;
    }
    onExtend(tenant.id, days);
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: open ? 'unset' : undefined } }}>
        <TableCell width={48}>
          <IconButton size="small" onClick={() => setOpen((value) => !value)} aria-label="Показать пользователей">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography fontWeight={600}>{tenant.name}</Typography>
          <Typography variant="caption" color="text.secondary">{tenant.slug}</Typography>
        </TableCell>
        <TableCell>{tenant.ownerEmail || '—'}</TableCell>
        <TableCell>
          {tenant.createdAt ? new Date(tenant.createdAt).toLocaleString('ru-RU') : '—'}
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={statusLabels[tenant.status] || tenant.status}
            color={statusColors[tenant.status] || 'default'}
          />
        </TableCell>
        <TableCell>
          {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString('ru-RU') : '—'}
        </TableCell>
        <TableCell>{tenant.userCount}</TableCell>
        <TableCell>
          {tenant.lastActivityAt ? new Date(tenant.lastActivityAt).toLocaleString('ru-RU') : '—'}
        </TableCell>
        <TableCell align="right" sx={{ minWidth: 320 }}>
          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
              {tenant.id !== 1 ? (
                tenant.status !== 'active' ? (
                  <Button size="small" onClick={() => onStatus(tenant.id, 'active')}>
                    Активировать
                  </Button>
                ) : (
                  <Box sx={{ width: 98 }} />
                )
              ) : (
                <Box sx={{ width: 98 }} />
              )}
              {tenant.id !== 1 ? (
                tenant.status !== 'suspended' ? (
                  <Button size="small" color="warning" onClick={() => onStatus(tenant.id, 'suspended')}>
                    Блок
                  </Button>
                ) : (
                  <Box sx={{ width: 56 }} />
                )
              ) : (
                <Box sx={{ width: 56 }} />
              )}
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
              <TextField
                size="small"
                type="number"
                label="Дней"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                inputProps={{ min: 1, style: { width: 36 } }}
                sx={{ width: 74 }}
              />
              <Button size="small" variant="outlined" onClick={handleExtend}>
                Продлить
              </Button>
              {tenant.id !== 1 ? (
                <Button size="small" color="error" onClick={() => onDelete(tenant)}>
                  Удалить
                </Button>
              ) : (
                <Box sx={{ width: 66 }} />
              )}
            </Stack>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Пользователи организации «{tenant.name}»
              </Typography>
              <TenantUsersPanel tenantId={tenant.id} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const PlatformAdmin: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [tenants, setTenants] = useState<AdminTenantInfo[]>([]);
  const [activity, setActivity] = useState<TenantActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<AdminTenantInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRows, activityRows] = await Promise.all([
        platformService.listTenants(),
        platformService.listActivity(100),
      ]);
      setTenants(tenantRows);
      setActivity(activityRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatus = async (tenantId: number, status: string) => {
    try {
      await platformService.updateTenant(tenantId, { status });
      toast.success('Статус обновлён');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  const handleExtendTrial = async (tenantId: number, days: number) => {
    try {
      await platformService.updateTenant(tenantId, { extendTrialDays: days });
      toast.success(`Пробный период продлён на ${days} дн.`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка продления');
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await platformService.deleteTenant(tenantToDelete.id);
      toast.success(`Организация «${tenantToDelete.name}» удалена`);
      setTenantToDelete(null);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Не удалось удалить организацию');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Панель владельца платформы
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Управление организациями, пробными периодами и мониторинг активности.
        {!loading && tenants.length > 0 && (
          <> Всего организаций: <strong>{tenants.length}</strong>.</>
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: crmRadius.md, mb: 3 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2 }}>
          <Tab label="Организации" />
          <Tab label="Активность" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: crmRadius.md }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Организация</TableCell>
                <TableCell>Владелец</TableCell>
                <TableCell>Регистрация</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Пробный до</TableCell>
                <TableCell>Пользователей</TableCell>
                <TableCell>Последняя активность</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  onStatus={handleStatus}
                  onExtend={handleExtendTrial}
                  onDelete={setTenantToDelete}
                />
              ))}
              {!loading && tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Нет организаций
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: crmRadius.md }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Время</TableCell>
                <TableCell>Организация</TableCell>
                <TableCell>Пользователь</TableCell>
                <TableCell>Действие</TableCell>
                <TableCell>Детали</TableCell>
                <TableCell>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activity.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{new Date(item.createdAt).toLocaleString('ru-RU')}</TableCell>
                  <TableCell>{item.tenantName || '—'}</TableCell>
                  <TableCell>
                    {item.userName || item.userEmail || '—'}
                  </TableCell>
                  <TableCell>{actionLabels[item.action] || item.action}</TableCell>
                  <TableCell>{item.details || '—'}</TableCell>
                  <TableCell>{item.ipAddress || '—'}</TableCell>
                </TableRow>
              ))}
              {!loading && activity.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Нет записей
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={loadData} disabled={loading}>
          Обновить
        </Button>
      </Box>

      <Dialog open={Boolean(tenantToDelete)} onClose={() => !deleting && setTenantToDelete(null)}>
        <DialogTitle>Удалить организацию?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Будут удалены организация «{tenantToDelete?.name}», все её пользователи и данные.
            Email владельца можно будет использовать для новой регистрации.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTenantToDelete(null)} disabled={deleting}>
            Отмена
          </Button>
          <Button color="error" onClick={handleDeleteTenant} disabled={deleting}>
            {deleting ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PlatformAdmin;
