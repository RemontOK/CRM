import React, { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { AppSettings, Client } from '../../types';
import { formatPhone, normalizePhoneForCompare } from '../../utils/phone';
import { buildOrderClientDraftFromClient, OrderClientDraft } from '../../utils/clientFieldUtils';

interface ClientPhoneLookupFieldProps {
  settings: AppSettings;
  clients: Client[];
  phone: string;
  onPhoneChange: (phone: string) => void;
  onClientSelect: (draft: OrderClientDraft) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  size?: 'small' | 'medium';
}

const searchClientsByPhone = (clients: Client[], query: string) => {
  const normalizedQuery = normalizePhoneForCompare(query);
  if (normalizedQuery.length < 3) {
    return [];
  }

  return clients
    .filter((client) => normalizePhoneForCompare(client.phone).includes(normalizedQuery))
    .slice(0, 8);
};

const ClientPhoneLookupField: React.FC<ClientPhoneLookupFieldProps> = ({
  settings,
  clients,
  phone,
  onPhoneChange,
  onClientSelect,
  label = 'Телефон',
  placeholder = '+7 (999) 123-45-67',
  required = false,
  size = 'medium',
}) => {
  const [dismissedClientId, setDismissedClientId] = useState<string | null>(null);
  const [appliedClientId, setAppliedClientId] = useState<string | null>(null);

  const phoneOptions = useMemo(() => searchClientsByPhone(clients, phone), [clients, phone]);

  const exactMatch = useMemo(() => {
    const normalizedPhone = normalizePhoneForCompare(phone);
    if (normalizedPhone.length < 10) {
      return null;
    }

    return clients.find((client) => normalizePhoneForCompare(client.phone) === normalizedPhone) || null;
  }, [clients, phone]);

  const applyClient = (client: Client) => {
    const draft = buildOrderClientDraftFromClient(client, settings);
    onClientSelect(draft);
    onPhoneChange(draft.clientPhone);
    setAppliedClientId(client.id);
    setDismissedClientId(null);
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(value);
    setAppliedClientId(null);
    setDismissedClientId(null);
  };

  const showSuggestion =
    Boolean(exactMatch) &&
    exactMatch?.id !== appliedClientId &&
    exactMatch?.id !== dismissedClientId;

  return (
    <Box>
      <Autocomplete
        freeSolo
        options={phoneOptions}
        inputValue={phone}
        onInputChange={(_, value) => handlePhoneChange(value)}
        onChange={(_, value) => {
          if (value && typeof value !== 'string') {
            applyClient(value);
          }
        }}
        getOptionLabel={(option) =>
          typeof option === 'string'
            ? option
            : `${formatPhone(option.phone)} — ${[option.firstName, option.lastName].filter(Boolean).join(' ')}`.trim()
        }
        filterOptions={(options) => options}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.id}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {formatPhone(option.phone)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[option.firstName, option.lastName].filter(Boolean).join(' ') || 'Без имени'}
                {option.email ? ` • ${option.email}` : ''}
              </Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            label={label}
            placeholder={placeholder}
            required={required}
            size={size}
          />
        )}
        noOptionsText={normalizePhoneForCompare(phone).length < 3 ? 'Введите минимум 3 цифры' : 'Клиенты не найдены'}
      />

      {showSuggestion && exactMatch ? (
        <Alert
          severity="info"
          sx={{ mt: 1.5 }}
          onClose={() => setDismissedClientId(exactMatch.id)}
          action={
            <Button color="inherit" size="small" onClick={() => applyClient(exactMatch)}>
              Подставить
            </Button>
          }
        >
          Найден клиент: {[exactMatch.firstName, exactMatch.lastName].filter(Boolean).join(' ') || 'без имени'}
        </Alert>
      ) : null}
    </Box>
  );
};

export default ClientPhoneLookupField;
