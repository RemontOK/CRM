import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from '@mui/material';
import { AppSettings } from '../../types';
import ClientFieldsForm from '../ClientFieldsForm/ClientFieldsForm';
import { sectionTitleSx } from '../../styles/ui';

export type ClientFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  notes: string;
  fieldValues: Record<string, string>;
};

interface ClientFormDialogProps {
  open: boolean;
  title: string;
  initialValues: ClientFormState;
  settings: AppSettings;
  onClose: () => void;
  onSave: (values: ClientFormState) => void | Promise<void>;
}

const ClientFormDialog: React.FC<ClientFormDialogProps> = ({
  open,
  title,
  initialValues,
  settings,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ClientFormState>(initialValues);

  useEffect(() => {
    if (open) {
      setFormData(initialValues);
    }
  }, [open, initialValues]);

  const handleFormChange = (field: keyof Omit<ClientFormState, 'fieldValues'>, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleClientFieldChange = (code: string, value: string) => {
    setFormData((current) => ({
      ...current,
      fieldValues: { ...current.fieldValues, [code]: value },
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={sectionTitleSx}>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Имя"
              value={formData.firstName}
              onChange={(event) => handleFormChange('firstName', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Фамилия"
              value={formData.lastName}
              onChange={(event) => handleFormChange('lastName', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Телефон"
              value={formData.phone}
              onChange={(event) => handleFormChange('phone', event.target.value)}
            />
          </Grid>
          <ClientFieldsForm
            settings={settings}
            values={formData.fieldValues}
            onChange={handleClientFieldChange}
          />
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Адрес"
              value={formData.address}
              onChange={(event) => handleFormChange('address', event.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Служебные заметки"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(event) => handleFormChange('notes', event.target.value)}
              helperText="Тип клиента и внутренние пометки CRM"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => void onSave(formData)}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientFormDialog;
