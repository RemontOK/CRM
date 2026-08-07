import React, { useMemo } from 'react';
import { Grid, TextField } from '@mui/material';
import { Control, Controller } from 'react-hook-form';
import { AppSettings } from '../../types';
import { getEnabledClientFields } from '../../utils/clientFieldUtils';

interface ClientFieldsFormProps {
  settings: AppSettings;
  values?: Record<string, string>;
  onChange?: (code: string, value: string) => void;
  control?: Control<any>;
  excludeCodes?: string[];
  clientType?: string;
}

const ClientFieldsForm: React.FC<ClientFieldsFormProps> = ({
  settings,
  values = {},
  onChange,
  control,
  excludeCodes = [],
  clientType,
}) => {
  const excluded = useMemo(() => new Set(excludeCodes), [excludeCodes]);
  const fields = useMemo(
    () => getEnabledClientFields(settings, clientType).filter((field) => !excluded.has(field.code)),
    [clientType, excluded, settings]
  );

  if (fields.length === 0) {
    return null;
  }

  return (
    <>
      {fields.map((field) => {
        const isMultiline = field.code === 'clientComment';
        const isDate = field.code === 'birthday';
        const isNumeric = field.code === 'inn' || field.code === 'bankAccount';
        const gridSize = field.code === 'discount' || field.code === 'birthday' ? 6 : 12;

        if (control) {
          return (
            <Grid item xs={12} md={gridSize} key={field.id}>
              <Controller
                name={field.code}
                control={control}
                render={({ field: formField }) => (
                  <TextField
                    {...formField}
                    fullWidth
                    size="small"
                    label={field.label}
                    value={formField.value ?? ''}
                    required={field.required}
                    multiline={isMultiline}
                    rows={isMultiline ? 2 : undefined}
                    type={isDate ? 'date' : 'text'}
                    inputProps={isNumeric ? { inputMode: 'numeric' } : undefined}
                    InputLabelProps={isDate ? { shrink: true } : undefined}
                  />
                )}
              />
            </Grid>
          );
        }

        return (
          <Grid item xs={12} md={gridSize} key={field.id}>
            <TextField
              fullWidth
              size="small"
              label={field.label}
              value={values[field.code] ?? ''}
              onChange={(event) => onChange?.(field.code, event.target.value)}
              required={field.required}
              multiline={isMultiline}
              rows={isMultiline ? 2 : undefined}
              type={isDate ? 'date' : field.code === 'email' ? 'email' : 'text'}
              inputProps={isNumeric ? { inputMode: 'numeric' } : undefined}
              InputLabelProps={isDate ? { shrink: true } : undefined}
            />
          </Grid>
        );
      })}
    </>
  );
};

export default ClientFieldsForm;
