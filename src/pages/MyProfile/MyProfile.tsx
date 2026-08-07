import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircleOutline, DeleteOutline, FileUpload } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api';
import { User } from '../../types';
import { heroCardSx, pageShellSx, panelCardSx } from '../../styles/ui';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  technician: 'Мастер',
  cashier: 'Кассир',
};

const roleLabel = (role?: string) => roleLabels[role ?? ''] || 'Сотрудник';

const profileFieldSx = {
  '& .MuiInputLabel-root': {
    color: 'text.secondary',
  },
  '& .MuiFormHelperText-root': {
    color: 'text.secondary',
  },
  '& .MuiInputBase-input': {
    color: 'text.primary',
    WebkitTextFillColor: 'currentcolor',
  },
  '& .MuiInputBase-input.Mui-disabled': {
    color: 'text.primary',
    WebkitTextFillColor: 'currentcolor',
    opacity: 0.78,
  },
} as const;

const MyProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setAvatar(user?.avatar ?? '');
  }, [user?.id]);

  const isAdmin = user?.role === 'admin';
  const editableFields = isAdmin
    ? (['avatar', 'phone', 'name'] as const)
    : (user?.employeeAccess?.selfEditableFields ?? []);
  const canEditAvatar = isAdmin || editableFields.includes('avatar');
  const canEditPhone = isAdmin || editableFields.includes('phone');
  const canEditName = isAdmin || editableFields.includes('name');

  const hasAnyEditable = canEditAvatar || canEditPhone || canEditName;

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Слишком большой файл (макс. 5 МБ)');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    if (!canEditAvatar && !canEditPhone && !canEditName) {
      toast.error('У вас нет прав на изменение профиля');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (canEditAvatar) {
        payload.avatar = avatar;
      }
      if (canEditPhone && phone !== user.phone) {
        payload.phone = phone;
      }
      if (canEditName && name !== user.name) {
        payload.name = name;
      }
      if (Object.keys(payload).length === 0) {
        toast('Нет изменений для сохранения');
        return;
      }
      const updated = await apiService.patch<User>('/auth/profile', payload);
      updateUser(updated);
      toast.success('Профиль сохранён');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Не удалось сохранить профиль');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={pageShellSx}>
      <Box sx={heroCardSx}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Avatar src={avatar || undefined} sx={{ width: 96, height: 96, fontSize: 38, bgcolor: 'primary.main' }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Мой профиль</Typography>
              <Typography variant="body2" color="text.secondary">
                Личные данные и контакты.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip color="primary" label={roleLabel(user?.role)} sx={{ fontWeight: 700, color: '#ffffff' }} />
            <Chip
              variant="outlined"
              label={user?.email || ''}
              sx={{
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.92)',
                borderColor: 'rgba(255, 255, 255, 0.32)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                '& .MuiChip-label': { color: 'rgba(255, 255, 255, 0.92)' },
              }}
            />
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ ...panelCardSx, p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Личные данные</Typography>
        {!hasAnyEditable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Администратор пока не открыл вам возможность редактировать личные данные. Обратитесь к нему для изменения.
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} sx={{ mb: 3 }}>
          <Avatar src={avatar || undefined} sx={{ width: 88, height: 88, fontSize: 36, bgcolor: 'primary.main' }}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
              onClick={() => avatarInputRef.current?.click()}
              disabled={!canEditAvatar}
            >
              Загрузить фото
            </Button>
            <Button
              variant="text"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setAvatar('')}
              disabled={!canEditAvatar || !avatar}
            >
              Удалить фото
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </Stack>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Имя"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEditName}
              helperText={canEditName ? 'Можно изменить' : 'Изменение имени недоступно'}
              sx={profileFieldSx}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Email (логин)"
              value={user?.email || ''}
              disabled
              helperText="Логин нельзя изменить самостоятельно"
              sx={profileFieldSx}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Телефон"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={!canEditPhone}
              helperText={canEditPhone ? undefined : 'Изменение телефона недоступно'}
              sx={profileFieldSx}
            />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasAnyEditable}
            startIcon={<CheckCircleOutline />}
          >
            {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default MyProfile;
