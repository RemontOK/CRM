import { alpha, createTheme } from '@mui/material/styles';
import { crmColors, crmGradients, crmRadius, crmShadow } from './styles/tokens';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: crmColors.primary,
      light: crmColors.primaryLight,
      dark: crmColors.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: crmColors.secondary,
      light: '#14b8a6',
      dark: '#115e59',
      contrastText: '#ffffff',
    },
    background: {
      default: crmColors.surface,
      paper: crmColors.surfaceStrong,
    },
    text: {
      primary: crmColors.ink,
      secondary: crmColors.slate,
    },
    success: {
      main: crmColors.success,
    },
    warning: {
      main: crmColors.warning,
    },
    error: {
      main: crmColors.error,
    },
    info: {
      main: crmColors.info,
    },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.04em' },
    h2: { fontWeight: 800, letterSpacing: '-0.03em' },
    h3: { fontWeight: 800, letterSpacing: '-0.03em' },
    h4: { fontWeight: 750, letterSpacing: '-0.02em' },
    h5: { fontWeight: 750, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--crm-bg': crmColors.surface,
          '--crm-panel': crmColors.surfaceStrong,
          '--crm-border': crmColors.line,
          '--crm-shadow': crmShadow.panel,
          '--crm-shadow-soft': crmShadow.soft,
          '--crm-radius-sm': `${crmRadius.sm}px`,
          '--crm-radius-md': `${crmRadius.md}px`,
          '--crm-radius-lg': `${crmRadius.lg}px`,
          '--crm-radius-xl': `${crmRadius.xl}px`,
          '--crm-color-primary': crmColors.primary,
          '--crm-color-primary-light': crmColors.primaryLight,
          '--crm-color-primary-dark': crmColors.primaryDark,
          '--crm-color-ink': crmColors.ink,
          '--crm-color-slate': crmColors.slate,
          '--crm-color-line-strong': crmColors.lineStrong,
          '--crm-color-success': crmColors.success,
          '--crm-color-warning': crmColors.warning,
          '--crm-color-error': crmColors.error,
          '--crm-color-info': crmColors.info,
        },
        body: {
          background: crmGradients.appBackground,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: crmRadius.md,
          paddingInline: 18,
          textTransform: 'none',
        },
        contained: {
          boxShadow: crmShadow.focus,
          '&:hover': {
            boxShadow: crmShadow.focusHover,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: crmRadius.lg,
          border: `1px solid ${alpha(crmColors.ink, 0.08)}`,
          boxShadow: crmShadow.panel,
          backgroundImage: 'none',
          overflow: 'hidden',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha('#ffffff', 0.9),
          color: crmColors.ink,
          backdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${alpha(crmColors.ink, 0.08)}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: crmColors.sidebar,
          color: '#e2e8f0',
          borderRight: `1px solid ${alpha('#ffffff', 0.06)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: crmRadius.pill,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: crmRadius.sm,
            backgroundColor: alpha('#ffffff', 0.88),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: crmRadius.lg,
        },
      },
    },
  },
});

export default theme;
