import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { AppSettings } from '../../types';
import { appSettingsService } from '../../services/appSettingsService';

export const getDefaultClientType = (settings: AppSettings) => {
  const enabled = settings.forms.clientTypes
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return enabled[0]?.code || 'individual';
};

export const getClientTypeLabel = (settings: AppSettings, code: string) =>
  settings.forms.clientTypes.find((item) => item.code === code)?.label || code;

export const buildClientNotesWithType = (settings: AppSettings, clientType: string, notes: string) => {
  const label = getClientTypeLabel(settings, clientType);
  const prefix = label ? `Тип клиента: ${label}` : '';
  return [prefix, notes.trim()].filter(Boolean).join('\n');
};

export const extractClientTypeFromNotes = (settings: AppSettings, notes?: string) => {
  const typeLine = (notes || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('Тип клиента:'));

  if (!typeLine) {
    return getDefaultClientType(settings);
  }

  const label = typeLine.replace(/^Тип клиента:\s*/, '').trim();
  const matchedType = settings.forms.clientTypes.find((item) => item.label === label);
  return matchedType?.code || getDefaultClientType(settings);
};

interface ClientTypeSelectorProps {
  value: string;
  onChange: (code: string) => void;
  settings: AppSettings;
  onSettingsUpdated?: (settings: AppSettings) => void;
  allowManage?: boolean;
}

const slugifyClientTypeCode = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_а-яё]/gi, '')
    .slice(0, 32) || `client_${Date.now()}`;

const ClientTypeSelector: React.FC<ClientTypeSelectorProps> = ({
  value,
  onChange,
  settings,
  onSettingsUpdated,
  allowManage = true,
}) => {
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const clientTypes = useMemo(
    () =>
      settings.forms.clientTypes
        .filter((item) => item.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [settings.forms.clientTypes]
  );

  const handleAddType = async () => {
    const label = newTypeLabel.trim();
    if (!label) {
      toast.error('Введите название типа клиента');
      return;
    }

    const baseCode = slugifyClientTypeCode(label);
    let code = baseCode;
    let suffix = 1;
    while (settings.forms.clientTypes.some((item) => item.code === code)) {
      code = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    const nextSettings: AppSettings = {
      ...settings,
      forms: {
        ...settings.forms,
        clientTypes: [
          ...settings.forms.clientTypes,
          {
            id: `ct_${Date.now()}`,
            code,
            label,
            enabled: true,
            sortOrder: settings.forms.clientTypes.length + 1,
          },
        ],
      },
    };

    try {
      const saved = await appSettingsService.saveSettings(nextSettings);
      onSettingsUpdated?.(saved);
      onChange(code);
      setNewTypeLabel('');
      setIsAdding(false);
      toast.success('Тип клиента добавлен');
    } catch {
      toast.error('Не удалось сохранить тип клиента');
    }
  };

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        Тип клиента
      </Typography>
      <FormControl component="fieldset">
        <RadioGroup
          row
          value={value}
          onChange={(event) => onChange(event.target.value)}
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          {clientTypes.map((type) => (
            <FormControlLabel
              key={type.id}
              value={type.code}
              control={<Radio size="small" />}
              label={type.label}
            />
          ))}
        </RadioGroup>
      </FormControl>
      {allowManage ? (
        <Box>
          {isAdding ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Новый тип клиента"
                placeholder="Например: VIP, Оптовый"
                value={newTypeLabel}
                onChange={(event) => setNewTypeLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddType();
                  }
                }}
              />
              <Button variant="contained" size="small" onClick={() => void handleAddType()} sx={{ flexShrink: 0 }}>
                Добавить
              </Button>
              <Button size="small" onClick={() => setIsAdding(false)}>
                Отмена
              </Button>
            </Stack>
          ) : (
            <Button size="small" startIcon={<Add />} onClick={() => setIsAdding(true)}>
              Добавить тип
            </Button>
          )}
        </Box>
      ) : null}
    </Stack>
  );
};

export default ClientTypeSelector;
