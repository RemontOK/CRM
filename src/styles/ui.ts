import { alpha } from '@mui/material/styles';
import { SxProps, Theme } from '@mui/material/styles';
import { crmColors, crmGradients, crmRadius, crmShadow } from './tokens';

export const pageShellSx: SxProps<Theme> = {
  display: 'grid',
  gap: 3,
};

export const heroCardSx: SxProps<Theme> = {
  p: { xs: 3, md: 4 },
  borderRadius: crmRadius.xl,
  background: crmGradients.hero,
  color: '#fff',
  boxShadow: '0 26px 60px rgba(15, 23, 42, 0.20)',
  overflow: 'hidden',
};

export const panelCardSx: SxProps<Theme> = {
  borderRadius: crmRadius.lg,
  border: `1px solid ${crmColors.line}`,
  boxShadow: crmShadow.panel,
  backgroundColor: crmColors.surfaceStrong,
  overflow: 'hidden',
};

export const toolbarCardSx: SxProps<Theme> = {
  ...panelCardSx,
  p: 0,
};

export const sectionTitleSx: SxProps<Theme> = {
  fontWeight: 800,
  letterSpacing: '-0.03em',
};

export const glassHeaderSx: SxProps<Theme> = {
  backgroundColor: alpha('#ffffff', 0.9),
  backdropFilter: 'blur(18px)',
  borderBottom: `1px solid ${crmColors.line}`,
};

export const pageHeaderSx: SxProps<Theme> = {
  display: 'grid',
  gap: 0.5,
};

export const pageTitleSx: SxProps<Theme> = {
  fontWeight: 800,
  letterSpacing: '-0.03em',
};

export const pageEyebrowSx: SxProps<Theme> = {
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: 1.4,
  fontSize: '0.78rem',
  fontWeight: 700,
};

export const contentGridSx: SxProps<Theme> = {
  display: 'grid',
  gap: 3,
};
