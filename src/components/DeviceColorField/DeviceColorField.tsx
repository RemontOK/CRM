import React, { useMemo } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { getIphoneColorsForModel } from '../../constants/iphoneModelColors';

const FALLBACK_DEVICE_COLORS = [
  'Черный',
  'Белый',
  'Серый',
  'Серебристый',
  'Золотой',
  'Синий',
  'Голубой',
  'Красный',
  'Розовый',
  'Зеленый',
  'Фиолетовый',
  'Желтый',
  'Оранжевый',
  'Коричневый',
  'Бежевый',
  'Графит',
  'Титан',
];

export interface DeviceColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  deviceModel?: string;
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const DeviceColorField: React.FC<DeviceColorFieldProps> = ({
  value,
  onChange,
  deviceModel,
  label = 'Цвет',
  placeholder = 'Выберите или введите цвет',
  size,
  required,
  error,
  helperText,
}) => {
  const modelColors = useMemo(() => getIphoneColorsForModel(deviceModel), [deviceModel]);
  const options = modelColors.length > 0 ? modelColors : FALLBACK_DEVICE_COLORS;

  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value || null}
      inputValue={value}
      onChange={(_event, next) => onChange(typeof next === 'string' ? next : next || '')}
      onInputChange={(_event, next, reason) => {
        if (reason === 'input' || reason === 'clear') {
          onChange(next);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          required={required}
          error={error}
          helperText={helperText}
          fullWidth
        />
      )}
    />
  );
};

export default DeviceColorField;
