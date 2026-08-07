import React, { useMemo } from 'react';
import {
  Article,
  Business,
  CreditCard,
  FlashOn,
  Inventory2,
  LocationOn,
  Notifications,
  PointOfSale,
  ReceiptLong,
  SupportAgent,
  TextFields,
  Workspaces,
} from '@mui/icons-material';
import { Box, Card, CardContent, Grid, Stack, Switch, Typography } from '@mui/material';
import { SettingsSectionKey } from '../../types';
import { CRM_MODULE_OPTIONS } from '../../utils/employeeModuleAccess';
import {
  DEFAULT_EMPLOYEE_VISIBLE_SECTIONS,
  DEFAULT_SELF_EDITABLE_FIELDS,
  SETTINGS_SECTION_OPTIONS,
  SELF_EDITABLE_FIELD_OPTIONS,
  SelfEditableField,
  normalizeSelfEditableFields,
  normalizeVisibleSections,
} from '../../utils/employeeSettingsAccess';

const accessToggleCardSx = (isEnabled: boolean) => ({
  borderRadius: 2,
  border: `1px solid ${isEnabled ? 'var(--crm-color-primary)' : 'var(--crm-border)'}`,
  boxShadow: 'none',
  backgroundColor: isEnabled ? 'var(--crm-color-primary-soft)' : 'var(--crm-panel)',
});

const settingsSectionIcons: Partial<Record<SettingsSectionKey, React.ReactNode>> = {
  business: <Business fontSize="small" />,
  locations: <LocationOn fontSize="small" />,
  employees: <Workspaces fontSize="small" />,
  documents: <Article fontSize="small" />,
  integrations: <SupportAgent fontSize="small" />,
  orders: <ReceiptLong fontSize="small" />,
  quickSales: <FlashOn fontSize="small" />,
  statuses: <Inventory2 fontSize="small" />,
  notifications: <Notifications fontSize="small" />,
  paymentCategories: <PointOfSale fontSize="small" />,
  paymentMethods: <CreditCard fontSize="small" />,
  clientFields: <TextFields fontSize="small" />,
};

export interface EmployeeAccessFormState {
  allowedModules: string[];
  visibleSections: SettingsSectionKey[];
  selfEditableFields: SelfEditableField[];
}

export const createDefaultEmployeeAccessFormState = (): EmployeeAccessFormState => ({
  allowedModules: CRM_MODULE_OPTIONS.map((item) => item.path),
  visibleSections: [...DEFAULT_EMPLOYEE_VISIBLE_SECTIONS],
  selfEditableFields: [...DEFAULT_SELF_EDITABLE_FIELDS],
});

interface EmployeeAccessSettingsProps {
  value: EmployeeAccessFormState;
  onChange: (value: EmployeeAccessFormState) => void;
}

const EmployeeAccessSettings: React.FC<EmployeeAccessSettingsProps> = ({ value, onChange }) => {
  const visibleSections = useMemo(
    () => normalizeVisibleSections(value.visibleSections),
    [value.visibleSections]
  );
  const selfEditableFields = useMemo(
    () => normalizeSelfEditableFields(value.selfEditableFields),
    [value.selfEditableFields]
  );

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
          Разделы CRM
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Какие пункты меню видит сотрудник.
        </Typography>
        <Grid container spacing={1}>
          {CRM_MODULE_OPTIONS.map((module) => {
            const isEnabled = value.allowedModules.includes(module.path);
            return (
              <Grid item xs={12} sm={6} key={module.path}>
                <Card sx={accessToggleCardSx(isEnabled)}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography variant="body2" fontWeight={700}>
                        {module.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={isEnabled}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...value.allowedModules, module.path]
                            : value.allowedModules.filter((path) => path !== module.path);
                          onChange({ ...value, allowedModules: next });
                        }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
          Доступ к разделам настроек
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Сотрудник увидит выбранные разделы в «Мой профиль».
        </Typography>
        <Grid container spacing={1}>
          {SETTINGS_SECTION_OPTIONS.map((item) => {
            const isEnabled = visibleSections.includes(item.key);
            return (
              <Grid item xs={12} sm={6} md={4} key={item.key}>
                <Card sx={accessToggleCardSx(isEnabled)}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', color: isEnabled ? 'primary.main' : 'text.secondary' }}>
                          {settingsSectionIcons[item.key]}
                        </Box>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {item.label}
                        </Typography>
                      </Stack>
                      <Switch
                        size="small"
                        checked={isEnabled}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? Array.from(new Set([...visibleSections, item.key]))
                            : visibleSections.filter((key) => key !== item.key);
                          onChange({ ...value, visibleSections: next });
                        }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
          Редактирование личного профиля
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {SELF_EDITABLE_FIELD_OPTIONS.map((field) => {
            const isEnabled = selfEditableFields.includes(field.key);
            return (
              <Card key={field.key} sx={{ ...accessToggleCardSx(isEnabled), minWidth: 160, flex: '1 1 160px' }}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2" fontWeight={700}>
                      {field.label}
                    </Typography>
                    <Switch
                      size="small"
                      checked={isEnabled}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? Array.from(new Set([...selfEditableFields, field.key]))
                          : selfEditableFields.filter((key) => key !== field.key);
                        onChange({ ...value, selfEditableFields: next });
                      }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
};

export default EmployeeAccessSettings;
