import React, { useMemo, useState } from 'react';
import { Autocomplete, TextField, TextFieldProps } from '@mui/material';
import { appendCommaSeparated } from '../../utils/appendCommaSeparated';

export interface CommaAppendAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: boolean;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
  size?: TextFieldProps['size'];
  /** Если очистили поле — подставить это значение (например, дефолт дефектов). */
  clearFallback?: string;
}

/**
 * Поле с выбором из списка: повторный выбор дописывает вариант через запятую.
 * Список не закрывается после выбора — можно сразу добавить ещё.
 */
const CommaAppendAutocomplete: React.FC<CommaAppendAutocompleteProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  helperText,
  required,
  error,
  multiline,
  rows,
  fullWidth = true,
  size,
  clearFallback,
}) => {
  const [open, setOpen] = useState(false);

  const selectedParts = useMemo(
    () =>
      value
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean),
    [value]
  );

  const availableOptions = useMemo(
    () =>
      options.filter((option) => {
        const key = option.trim().toLowerCase();
        // Уже выбранные варианты скрываем только по точному совпадению сегмента.
        return !selectedParts.includes(key);
      }),
    [options, selectedParts]
  );

  return (
    <Autocomplete
      freeSolo
      open={open}
      onOpen={() => setOpen(true)}
      onClose={(_event, reason) => {
        // После выбора оставляем список открытым для следующего пункта.
        if (reason === 'selectOption') {
          return;
        }
        setOpen(false);
      }}
      openOnFocus
      selectOnFocus
      handleHomeEndKeys
      disableCloseOnSelect
      clearOnBlur={false}
      blurOnSelect={false}
      options={availableOptions}
      // Не фильтруем по всему тексту поля (там уже накопленная строка через запятую).
      filterOptions={(opts) => opts}
      value={null}
      inputValue={value}
      onChange={(_event, selected) => {
        if (typeof selected !== 'string' || !selected.trim()) {
          return;
        }
        onChange(appendCommaSeparated(value, selected));
        setOpen(true);
      }}
      onInputChange={(_event, inputValue, reason) => {
        if (reason === 'reset') {
          return;
        }
        if (reason === 'clear') {
          onChange(clearFallback ?? '');
          return;
        }
        if (reason === 'input') {
          onChange(inputValue);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          required={required}
          error={error}
          multiline={multiline}
          rows={rows}
          fullWidth={fullWidth}
          size={size}
          onClick={() => setOpen(true)}
        />
      )}
    />
  );
};

export default CommaAppendAutocomplete;
