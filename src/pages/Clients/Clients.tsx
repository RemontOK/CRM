import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  DeleteOutline,
  EditOutlined,
  LocationOnOutlined,
  PhoneOutlined,
  Search,
  VisibilityOutlined,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { clientService } from '../../services/clientService';
import { useCompanyName } from '../../hooks/useCompanyName';
import { orderService } from '../../services/orderService';
import { Client, Order } from '../../types';
import { appSettingsService } from '../../services/appSettingsService';
import ClientFormDialog, { ClientFormState } from '../../components/ClientFormDialog/ClientFormDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  buildClientFieldValuesFromClient,
  buildClientPayloadFromFields,
  getClientFieldValue,
  getEnabledClientFields,
} from '../../utils/clientFieldUtils';
import { dataGridSx, heroCardSx, pageShellSx, panelCardSx, sectionTitleSx, toolbarCardSx } from '../../styles/ui';
import { getOrderPaidAmount } from '../../utils/orderMetrics';
import { formatPhone, normalizePhoneForCompare, normalizePhoneForStorage } from '../../utils/phone';

type ClientFormStateLocal = ClientFormState;

const emptyForm: ClientFormStateLocal = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  notes: '',
  fieldValues: {},
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Пока без заказов';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Без даты';
  }

  return date.toLocaleDateString('ru-RU');
};

const getInitials = (client: Pick<Client, 'firstName' | 'lastName'>) =>
  `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase() || 'CL';

const CLIENTS_GRID_PAGE_SIZE_KEY = 'clients_grid_rows_per_page_v1';
const gridPageSizeOptions = [10, 50, 100];

const getSavedGridPageSize = (key: string) => {
  const value = Number(localStorage.getItem(key));
  return gridPageSizeOptions.includes(value) ? value : 10;
};

const Clients: React.FC = () => {
  const companyName = useCompanyName();
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Client | null>(null);
  const [clientFormInitial, setClientFormInitial] = useState<ClientFormStateLocal>(emptyForm);
  const [rowsPerPage, setRowsPerPage] = useState(() => getSavedGridPageSize(CLIENTS_GRID_PAGE_SIZE_KEY));
  const crmSettings = useMemo(() => appSettingsService.getSettings(), []);
  const enabledClientFields = useMemo(() => getEnabledClientFields(crmSettings), [crmSettings]);

  const refreshClients = async () => {
    await clientService.refreshFromApi();
    setClients(clientService.getClients());
    setOrders(await orderService.getOrders());
  };

  useEffect(() => {
    void refreshClients();
  }, []);

  const clientsWithStats = useMemo(() => {
    return clients.map((client) => {
      const clientPhone = normalizePhoneForCompare(client.phone);
      const relatedOrders = orders.filter((order) => {
        if (order.clientId === client.id) {
          return true;
        }
        if (clientPhone && normalizePhoneForCompare(order.clientPhone) === clientPhone) {
          return true;
        }
        return false;
      });

      const totalOrders = relatedOrders.length;
      const totalSpent = relatedOrders.reduce((sum, order) => sum + getOrderPaidAmount(order), 0);
      const lastOrderDate =
        relatedOrders
          .map((order) => order.createdAt || order.updatedAt || '')
          .filter(Boolean)
          .sort()
          .at(-1) || null;

      return {
        ...client,
        totalOrders,
        totalSpent,
        lastOrderDate,
      };
    });
  }, [clients, orders]);

  const filteredClients = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return clientsWithStats;
    }

    return clientsWithStats.filter((client) =>
      [
        client.firstName,
        client.lastName,
        client.phone,
        client.email || '',
        client.address || '',
        client.notes || '',
        ...Object.values(client.customFields || {}),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [clientsWithStats, debouncedSearchTerm]);

  const stats = useMemo(() => {
    const totalClients = clientsWithStats.length;
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const newClientsThisMonth = clientsWithStats.filter((client) => {
      const createdAt = new Date(client.createdAt);
      return createdAt.getMonth() === month && createdAt.getFullYear() === year;
    }).length;
    const totalRevenue = clientsWithStats.reduce((sum, client) => sum + client.totalSpent, 0);
    const activeClients = clientsWithStats.filter((client) => client.totalOrders > 0).length;

    return { totalClients, newClientsThisMonth, totalRevenue, activeClients };
  }, [clientsWithStats]);

  const selectedClientWithStats = useMemo(() => {
    if (!selectedClient) {
      return null;
    }
    return clientsWithStats.find((client) => client.id === selectedClient.id) || selectedClient;
  }, [clientsWithStats, selectedClient]);

  const openCreateDialog = () => {
    setEditingClient(null);
    setClientFormInitial(emptyForm);
    setIsFormOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setClientFormInitial({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      address: client.address || '',
      notes: client.notes || '',
      fieldValues: buildClientFieldValuesFromClient(client, crmSettings),
    });
    setIsFormOpen(true);
  };

  const handleSaveClient = async (formData: ClientFormStateLocal) => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      toast.error('Заполните имя, фамилию и телефон');
      return;
    }

    try {
      const clientPayload = buildClientPayloadFromFields({
        settings: crmSettings,
        fieldValues: formData.fieldValues,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: normalizePhoneForStorage(formData.phone),
        address: formData.address,
        existingClient: editingClient,
      });

      if (editingClient) {
        await clientService.updateClient(editingClient.id, {
          ...clientPayload,
          notes: formData.notes || clientPayload.notes,
        });
        toast.success('Карточка клиента обновлена');
      } else {
        await clientService.createClient({
          ...clientPayload,
          notes: formData.notes || clientPayload.notes,
        });
        toast.success('Клиент добавлен');
      }

      await refreshClients();
      setIsFormOpen(false);
      setEditingClient(null);
      setFormData(emptyForm);
    } catch {
      toast.error('Не удалось сохранить клиента');
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteCandidate) {
      return;
    }

    const removed = await clientService.deleteClient(deleteCandidate.id);
    if (removed) {
      toast.success('Клиент удален');
      await refreshClients();
      if (selectedClient?.id === deleteCandidate.id) {
        setSelectedClient(null);
        setIsViewOpen(false);
      }
    } else {
      toast.error('Не удалось удалить клиента');
    }

    setDeleteCandidate(null);
  };

  const columns: GridColDef[] = [
    {
      field: 'client',
      headerName: 'Клиент',
      flex: 1,
      minWidth: 280,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>{getInitials(params.row)}</Avatar>
          <Box>
            <Typography fontWeight={700}>{`${params.row.firstName} ${params.row.lastName}`}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.email || 'Email не указан'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Телефон',
      width: 170,
    },
    {
      field: 'totalOrders',
      headerName: 'Заказов',
      width: 110,
    },
    {
      field: 'totalSpent',
      headerName: 'Выручка',
      width: 130,
      renderCell: (params) => <Typography fontWeight={700}>{params.value.toLocaleString('ru-RU')} ₽</Typography>,
    },
    {
      field: 'lastOrderDate',
      headerName: 'Последний заказ',
      width: 150,
      renderCell: (params) => <Typography color="text.secondary">{formatDate(params.value)}</Typography>,
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => { setSelectedClient(params.row); setIsViewOpen(true); }}>
            <VisibilityOutlined />
          </IconButton>
          <IconButton size="small" onClick={() => openEditDialog(params.row)}>
            <EditOutlined />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteCandidate(params.row)}>
            <DeleteOutline />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', letterSpacing: 1.4 }}>
          CRM · КЛИЕНТСКАЯ БАЗА
        </Typography>
        <Typography variant="h3" sx={{ mt: 1.5, mb: 1.5, color: 'common.white' }}>
          Клиенты {companyName}
        </Typography>
        <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)' }}>
          Карточка клиента с контактами, историей обращений, заказами и выручкой.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {[
          { title: 'Клиентов', value: String(stats.totalClients), note: 'Общее число контактов в базе' },
          { title: 'Новых за месяц', value: String(stats.newClientsThisMonth), note: 'Прирост клиентской базы за текущий месяц' },
          { title: 'Активных', value: String(stats.activeClients), note: 'Клиенты, у которых уже были заказы' },
          { title: 'Выручка', value: `${stats.totalRevenue.toLocaleString('ru-RU')} ₽`, note: 'Суммарный оборот по клиентским заказам' },
        ].map((item) => (
          <Grid item xs={12} md={6} xl={3} key={item.title}>
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card sx={{ ...panelCardSx, height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1, mb: 1.5, fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.note}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Card sx={toolbarCardSx}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Поиск по имени, телефону, email, адресу или заметкам"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                Новый клиент
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={panelCardSx}>
        <CardContent>
          <Box sx={{ height: 560, width: '100%' }}>
            <DataGrid
              rows={filteredClients}
              columns={columns}
              pageSize={rowsPerPage}
              rowsPerPageOptions={gridPageSizeOptions}
              onPageSizeChange={(value) => {
                setRowsPerPage(value);
                localStorage.setItem(CLIENTS_GRID_PAGE_SIZE_KEY, String(value));
              }}
              disableSelectionOnClick
              sx={dataGridSx}
            />
          </Box>
        </CardContent>
      </Card>

      <ClientFormDialog
        open={isFormOpen}
        title={editingClient ? 'Редактировать клиента' : 'Новый клиент'}
        initialValues={clientFormInitial}
        settings={crmSettings}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveClient}
      />

      <Dialog open={isViewOpen} onClose={() => setIsViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Карточка клиента</DialogTitle>
        <DialogContent>
          {selectedClientWithStats && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>{getInitials(selectedClientWithStats)}</Avatar>
                <Box>
                  <Typography variant="h6">{`${selectedClientWithStats.firstName} ${selectedClientWithStats.lastName}`}</Typography>
                  <Typography color="text.secondary">Создан: {formatDate(selectedClientWithStats.createdAt)}</Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1.5}><PhoneOutlined fontSize="small" /><Typography>{formatPhone(selectedClientWithStats.phone)}</Typography></Box>
              {enabledClientFields.map((field) => {
                const value = getClientFieldValue(selectedClientWithStats, field.code);
                if (!value) {
                  return null;
                }
                return (
                  <Box key={field.id}>
                    <Typography variant="subtitle2" color="text.secondary">{field.label}</Typography>
                    <Typography>{value}</Typography>
                  </Box>
                );
              })}
              <Box display="flex" alignItems="center" gap={1.5}><LocationOnOutlined fontSize="small" /><Typography>{selectedClientWithStats.address || 'Адрес не указан'}</Typography></Box>
              <Grid container spacing={2}>
                <Grid item xs={4}><Typography variant="subtitle2" color="text.secondary">Заказов</Typography><Typography fontWeight={700}>{selectedClientWithStats.totalOrders}</Typography></Grid>
                <Grid item xs={4}><Typography variant="subtitle2" color="text.secondary">Выручка</Typography><Typography fontWeight={700}>{selectedClientWithStats.totalSpent.toLocaleString('ru-RU')} ₽</Typography></Grid>
                <Grid item xs={4}><Typography variant="subtitle2" color="text.secondary">Последний заказ</Typography><Typography fontWeight={700}>{formatDate(selectedClientWithStats.lastOrderDate)}</Typography></Grid>
              </Grid>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Служебные заметки</Typography>
                <Typography>{selectedClientWithStats.notes || 'Пока без заметок'}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={sectionTitleSx}>Удалить клиента</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteCandidate
              ? `Удалить клиента ${deleteCandidate.firstName} ${deleteCandidate.lastName}?`
              : 'Удалить клиента?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={handleDeleteClient}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Clients;
