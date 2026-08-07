import { SxProps, Theme, alpha } from '@mui/material/styles';
import { crmRadius } from './tokens';

export const statCardSx: SxProps<Theme> = {
  height: '100%',
  borderRadius: crmRadius.lg,
  border: '1px solid var(--crm-border)',
  boxShadow: 'var(--crm-shadow)',
  backgroundColor: 'var(--crm-panel)',
};

export const metricValueSx: SxProps<Theme> = {
  mt: 1,
  fontWeight: 800,
  letterSpacing: '-0.03em',
};

export const metricHintSx: SxProps<Theme> = {
  mt: 1,
  color: 'text.secondary',
};

export const metricIconWrapSx = (color: string): SxProps<Theme> => ({
  width: 48,
  height: 48,
  display: 'grid',
  placeItems: 'center',
  borderRadius: crmRadius.md,
  backgroundColor: alpha(color, 0.12),
  color,
});

export const tableShellSx: SxProps<Theme> = {
  borderRadius: crmRadius.lg,
  border: '1px solid var(--crm-border)',
  boxShadow: 'var(--crm-shadow)',
  backgroundColor: 'var(--crm-panel)',
  overflow: 'hidden',
};

export const filterBarSx: SxProps<Theme> = {
  ...tableShellSx,
  p: { xs: 2, md: 2.5 },
};

export const sectionCardSx: SxProps<Theme> = {
  ...tableShellSx,
  p: { xs: 2, md: 2.5 },
};

export const dialogPanelSx: SxProps<Theme> = {
  borderRadius: crmRadius.lg,
  border: '1px solid var(--crm-border)',
  boxShadow: 'var(--crm-shadow-soft)',
  backgroundColor: 'var(--crm-panel)',
};

export const fieldGroupSx: SxProps<Theme> = {
  display: 'grid',
  gap: 2,
};

export const subtleNoteSx: SxProps<Theme> = {
  color: 'text.secondary',
  fontSize: '0.95rem',
  lineHeight: 1.6,
};
