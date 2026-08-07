import React from 'react';
import { Grid, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { PeriodFilterValue, PeriodPreset } from '../../utils/dateRange';

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (next: PeriodFilterValue) => void;
  presetLabel?: string;
  size?: 'small' | 'medium';
  md?: number;
}

const PeriodFilter: React.FC<PeriodFilterProps> = ({
  value,
  onChange,
  presetLabel = 'Период',
  size = 'small',
  md = 2,
}) => {
  const handlePresetChange = (preset: PeriodPreset) => {
    onChange({
      preset,
      from: preset === 'custom' ? value.from : '',
      to: preset === 'custom' ? value.to : '',
    });
  };

  return (
    <>
      <Grid item xs={12} md={md}>
        <FormControl fullWidth size={size}>
          <InputLabel id="period-filter-label">{presetLabel}</InputLabel>
          <Select
            labelId="period-filter-label"
            size={size}
            value={value.preset}
            label={presetLabel}
            onChange={(event) => handlePresetChange(event.target.value as PeriodPreset)}
          >
            <MenuItem value="all">За всё время</MenuItem>
            <MenuItem value="today">Сегодня</MenuItem>
            <MenuItem value="week">7 дней</MenuItem>
            <MenuItem value="month">Месяц</MenuItem>
            <MenuItem value="quarter">Квартал</MenuItem>
            <MenuItem value="year">Год</MenuItem>
            <MenuItem value="custom">Свой период</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {value.preset === 'custom' && (
        <>
          <Grid item xs={12} md={md}>
            <TextField
              fullWidth
              size={size}
              label="С даты"
              type="date"
              value={value.from}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={md}>
            <TextField
              fullWidth
              size={size}
              label="По дату"
              type="date"
              value={value.to}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </>
      )}
    </>
  );
};

export default PeriodFilter;
