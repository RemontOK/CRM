import { alpha, createTheme, Theme } from '@mui/material/styles';
import { AppSettings } from '../types';
import { crmColors as staticCrmColors, crmRadius, crmShadow as staticCrmShadow } from '../styles/tokens';

export interface CrmAppearanceSettings {
  preset: string;
  primaryColor: string;
  primaryLight: string;
  primaryDark: string;
  secondaryColor: string;
  sidebarColor: string;
  surfaceColor: string;
  inkColor: string;
  mode: 'light' | 'dark';
}

export interface CrmColorTokens {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  ink: string;
  slate: string;
  surface: string;
  surfaceStrong: string;
  line: string;
  lineStrong: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  sidebar: string;
  sidebarMuted: string;
}

export interface CrmGradientTokens {
  appBackground: string;
  sidebar: string;
  hero: string;
  active: string;
}

export interface CrmShadowTokens {
  panel: string;
  soft: string;
  focus: string;
  focusHover: string;
}

export const DEFAULT_APPEARANCE: CrmAppearanceSettings = {
  preset: 'nek_default',
  primaryColor: staticCrmColors.primary,
  primaryLight: staticCrmColors.primaryLight,
  primaryDark: staticCrmColors.primaryDark,
  secondaryColor: staticCrmColors.secondary,
  sidebarColor: staticCrmColors.sidebar,
  surfaceColor: staticCrmColors.surface,
  inkColor: staticCrmColors.ink,
  mode: 'light',
};

type PresetDefinition = {
  label: string;
  primaryColor: string;
  primaryLight: string;
  primaryDark: string;
  secondaryColor: string;
  sidebarColor: string;
  surfaceColor: string;
  inkColor: string;
};

export const APPEARANCE_PRESETS: Record<string, PresetDefinition> = {
  nek_default: {
    label: 'Основная',
    primaryColor: '#ea580c',
    primaryLight: '#fb923c',
    primaryDark: '#c2410c',
    secondaryColor: '#0f766e',
    sidebarColor: '#0f172a',
    surfaceColor: '#f8fafc',
    inkColor: '#0f172a',
  },
  blue: {
    label: 'Синий',
    primaryColor: '#2563eb',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',
    secondaryColor: '#0891b2',
    sidebarColor: '#0f172a',
    surfaceColor: '#f8fafc',
    inkColor: '#0f172a',
  },
  green: {
    label: 'Зелёный',
    primaryColor: '#16a34a',
    primaryLight: '#4ade80',
    primaryDark: '#15803d',
    secondaryColor: '#0f766e',
    sidebarColor: '#052e16',
    surfaceColor: '#f8fafc',
    inkColor: '#0f172a',
  },
  purple: {
    label: 'Фиолетовый',
    primaryColor: '#9333ea',
    primaryLight: '#c084fc',
    primaryDark: '#7e22ce',
    secondaryColor: '#6366f1',
    sidebarColor: '#1e1b4b',
    surfaceColor: '#faf5ff',
    inkColor: '#1e1b4b',
  },
};

export const APPEARANCE_PRESET_OPTIONS = Object.entries(APPEARANCE_PRESETS).map(([id, preset]) => ({
  id,
  label: preset.label,
  preview: preset.primaryColor,
}));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return { r: 234, g: 88, b: 12 };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`;

const mixHex = (hex: string, target: string, amount: number) => {
  const left = hexToRgb(hex);
  const right = hexToRgb(target);
  const ratio = Math.max(0, Math.min(1, amount));

  return rgbToHex(
    left.r + (right.r - left.r) * ratio,
    left.g + (right.g - left.g) * ratio,
    left.b + (right.b - left.b) * ratio
  );
};

const normalizeHex = (value?: string, fallback = '#000000') => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }

  return fallback;
};

const isLightHex = (hex: string) => {
  const rgb = hexToRgb(hex);
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 >= 128;
};

const MACOS_DARK = {
  surface: '#1c1c1e',
  surfaceStrong: '#2c2c2e',
  ink: '#f5f5f7',
  slate: '#a1a1a6',
  sidebarBase: '#161618',
} as const;

export const SETTINGS_PREVIEW_EVENT = 'crm:settings-preview';

const resolveAppearanceMode = (input?: Partial<CrmAppearanceSettings>, migratedFromDark = false) => {
  if (input?.mode === 'dark' || migratedFromDark) {
    return 'dark';
  }

  if (input?.mode === 'light') {
    return 'light';
  }

  return DEFAULT_APPEARANCE.mode;
};

export const normalizeAppearance = (input?: Partial<CrmAppearanceSettings>): CrmAppearanceSettings => {
  let presetId = input?.preset || DEFAULT_APPEARANCE.preset;
  const migratedFromDark = presetId === 'dark';

  if (migratedFromDark) {
    presetId = DEFAULT_APPEARANCE.preset;
  }

  const preset = APPEARANCE_PRESETS[presetId];
  const mode = resolveAppearanceMode(input, migratedFromDark);

  if (preset && presetId !== 'custom') {
    return {
      preset: presetId,
      primaryColor: preset.primaryColor,
      primaryLight: preset.primaryLight,
      primaryDark: preset.primaryDark,
      secondaryColor: preset.secondaryColor,
      sidebarColor: preset.sidebarColor,
      surfaceColor: preset.surfaceColor,
      inkColor: preset.inkColor,
      mode,
    };
  }

  return {
    preset: presetId === 'custom' ? 'custom' : DEFAULT_APPEARANCE.preset,
    primaryColor: normalizeHex(input?.primaryColor, DEFAULT_APPEARANCE.primaryColor),
    primaryLight: normalizeHex(input?.primaryLight, DEFAULT_APPEARANCE.primaryLight),
    primaryDark: normalizeHex(input?.primaryDark, DEFAULT_APPEARANCE.primaryDark),
    secondaryColor: normalizeHex(input?.secondaryColor, DEFAULT_APPEARANCE.secondaryColor),
    sidebarColor: normalizeHex(input?.sidebarColor, DEFAULT_APPEARANCE.sidebarColor),
    surfaceColor: normalizeHex(input?.surfaceColor, DEFAULT_APPEARANCE.surfaceColor),
    inkColor: normalizeHex(input?.inkColor, DEFAULT_APPEARANCE.inkColor),
    mode,
  };
};

export const resolveCrmAppearance = (appearance?: Partial<CrmAppearanceSettings>): CrmColorTokens => {
  const resolved = normalizeAppearance(appearance);
  const isDark = resolved.mode === 'dark';
  let ink = resolved.inkColor;
  let surface = resolved.surfaceColor;
  let surfaceStrong: string;
  let sidebar = resolved.sidebarColor;

  if (isDark) {
    surface = MACOS_DARK.surface;
    surfaceStrong = MACOS_DARK.surfaceStrong;
    ink = MACOS_DARK.ink;
    sidebar = mixHex(resolved.sidebarColor, MACOS_DARK.sidebarBase, 0.72);
  } else {
    surfaceStrong = '#ffffff';
    if (!isLightHex(ink)) {
      ink = resolved.inkColor;
    }
  }

  return {
    primary: resolved.primaryColor,
    primaryLight: resolved.primaryLight,
    primaryDark: resolved.primaryDark,
    secondary: resolved.secondaryColor,
    ink,
    slate: isDark ? MACOS_DARK.slate : mixHex(ink, '#64748b', 0.55),
    surface,
    surfaceStrong,
    line: isDark ? 'rgba(255, 255, 255, 0.1)' : `rgba(${hexToRgb(ink).r}, ${hexToRgb(ink).g}, ${hexToRgb(ink).b}, 0.08)`,
    lineStrong: isDark ? 'rgba(255, 255, 255, 0.14)' : `rgba(${hexToRgb(ink).r}, ${hexToRgb(ink).g}, ${hexToRgb(ink).b}, 0.12)`,
    success: staticCrmColors.success,
    warning: staticCrmColors.warning,
    error: staticCrmColors.error,
    info: staticCrmColors.info,
    sidebar,
    sidebarMuted: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.68)',
  };
};

export const buildCrmShadows = (colors: CrmColorTokens): CrmShadowTokens => {
  const primary = hexToRgb(colors.primary);

  return {
    panel: isDarkSurface(colors) ? '0 22px 45px rgba(0, 0, 0, 0.35)' : staticCrmShadow.panel,
    soft: isDarkSurface(colors) ? '0 18px 40px rgba(0, 0, 0, 0.28)' : staticCrmShadow.soft,
    focus: `0 14px 28px rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.18)`,
    focusHover: `0 18px 36px rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.24)`,
  };
};

const isDarkSurface = (colors: CrmColorTokens) => {
  const rgb = hexToRgb(colors.surface);
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 < 128;
};

export const buildCrmGradients = (colors: CrmColorTokens): CrmGradientTokens => {
  const primaryLight = hexToRgb(colors.primaryLight);
  const primary = hexToRgb(colors.primary);
  const isDark = isDarkSurface(colors);

  if (isDark) {
    const deepBg = mixHex(colors.surface, '#000000', 0.28);
    const sidebarEnd = mixHex(colors.sidebar, '#000000', 0.42);
    const heroEnd = mixHex(colors.sidebar, colors.secondary, 0.35);

    return {
      appBackground: `radial-gradient(ellipse 120% 80% at 12% -18%, rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.16), transparent 52%), linear-gradient(180deg, ${colors.surface} 0%, ${deepBg} 100%)`,
      sidebar: `linear-gradient(180deg, ${colors.sidebar} 0%, ${sidebarEnd} 100%)`,
      hero: `radial-gradient(circle at top right, rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.18), transparent 34%), linear-gradient(135deg, ${colors.sidebar} 0%, ${mixHex(colors.sidebar, colors.primaryDark, 0.4)} 55%, ${heroEnd} 100%)`,
      active: `linear-gradient(135deg, rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.32), rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.18))`,
    };
  }

  const sidebarEnd = mixHex(colors.sidebar, '#000000', 0.18);
  const heroEnd = mixHex(colors.sidebar, colors.secondary, 0.45);
  const surfaceEnd = mixHex(colors.surface, colors.secondary, 0.08);

  return {
    appBackground: `radial-gradient(circle at top left, rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.12), transparent 26%), linear-gradient(180deg, ${colors.surface} 0%, ${surfaceEnd} 100%)`,
    sidebar: `radial-gradient(circle at top right, rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.28), transparent 30%), linear-gradient(180deg, ${colors.sidebar} 0%, ${sidebarEnd} 100%)`,
    hero: `radial-gradient(circle at top right, rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.22), transparent 30%), linear-gradient(135deg, ${colors.sidebar} 0%, ${mixHex(colors.sidebar, colors.primaryDark, 0.35)} 55%, ${heroEnd} 100%)`,
    active: `linear-gradient(135deg, rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.26), rgba(${primaryLight.r}, ${primaryLight.g}, ${primaryLight.b}, 0.16))`,
  };
};

export const applyCrmCssVariables = (appearance?: Partial<CrmAppearanceSettings>) => {
  if (typeof document === 'undefined') {
    return;
  }

  const resolvedAppearance = normalizeAppearance(appearance);
  const colors = resolveCrmAppearance(resolvedAppearance);
  const shadows = buildCrmShadows(colors);
  const root = document.documentElement;
  const isDark = resolvedAppearance.mode === 'dark';

  root.style.colorScheme = isDark ? 'dark' : 'light';

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? colors.surface : colors.surfaceStrong);
  }

  root.style.setProperty('--crm-bg', colors.surface);
  root.style.setProperty('--crm-panel', colors.surfaceStrong);
  root.style.setProperty('--crm-border', colors.line);
  root.style.setProperty('--crm-shadow', shadows.panel);
  root.style.setProperty('--crm-shadow-soft', shadows.soft);
  root.style.setProperty('--crm-radius-sm', `${crmRadius.sm}px`);
  root.style.setProperty('--crm-radius-md', `${crmRadius.md}px`);
  root.style.setProperty('--crm-radius-lg', `${crmRadius.lg}px`);
  root.style.setProperty('--crm-radius-xl', `${crmRadius.xl}px`);
  root.style.setProperty('--crm-color-primary', colors.primary);
  root.style.setProperty('--crm-color-primary-light', colors.primaryLight);
  root.style.setProperty('--crm-color-primary-dark', colors.primaryDark);
  root.style.setProperty('--crm-color-ink', colors.ink);
  root.style.setProperty('--crm-color-slate', colors.slate);
  root.style.setProperty('--crm-color-line-strong', colors.lineStrong);
  root.style.setProperty('--crm-color-success', colors.success);
  root.style.setProperty('--crm-color-warning', colors.warning);
  root.style.setProperty('--crm-color-error', colors.error);
  root.style.setProperty('--crm-color-info', colors.info);
  const gradients = buildCrmGradients(colors);
  const primaryRgb = hexToRgb(colors.primary);

  root.style.setProperty('--crm-gradient-app', gradients.appBackground);
  root.style.setProperty('--crm-gradient-sidebar', gradients.sidebar);
  root.style.setProperty('--crm-gradient-hero', gradients.hero);
  root.style.setProperty('--crm-color-primary-soft', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.12)`);
  root.style.setProperty('--crm-color-primary-border', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.55)`);
  root.style.setProperty('--crm-color-primary-hover', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.06)`);
};

export const createCrmMuiTheme = (appearance?: Partial<CrmAppearanceSettings>): Theme => {
  const resolvedAppearance = normalizeAppearance(appearance);
  const colors = resolveCrmAppearance(resolvedAppearance);
  const gradients = buildCrmGradients(colors);
  const shadows = buildCrmShadows(colors);
  const isDark = resolvedAppearance.mode === 'dark';
  const fieldBackground = isDark ? colors.surfaceStrong : '#ffffff';

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: colors.primary,
        light: colors.primaryLight,
        dark: colors.primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: colors.secondary,
        light: mixHex(colors.secondary, '#ffffff', 0.25),
        dark: mixHex(colors.secondary, '#000000', 0.2),
        contrastText: '#ffffff',
      },
      background: {
        default: colors.surface,
        paper: colors.surfaceStrong,
      },
      text: {
        primary: colors.ink,
        secondary: colors.slate,
      },
      success: {
        main: colors.success,
      },
      warning: {
        main: colors.warning,
      },
      error: {
        main: colors.error,
      },
      info: {
        main: colors.info,
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
          html: {
            colorScheme: isDark ? 'dark' : 'light',
          },
          ':root': {
            '--crm-bg': colors.surface,
            '--crm-panel': colors.surfaceStrong,
            '--crm-border': colors.line,
            '--crm-shadow': shadows.panel,
            '--crm-shadow-soft': shadows.soft,
            '--crm-radius-sm': `${crmRadius.sm}px`,
            '--crm-radius-md': `${crmRadius.md}px`,
            '--crm-radius-lg': `${crmRadius.lg}px`,
            '--crm-radius-xl': `${crmRadius.xl}px`,
            '--crm-color-primary': colors.primary,
            '--crm-color-primary-light': colors.primaryLight,
            '--crm-color-primary-dark': colors.primaryDark,
            '--crm-color-ink': colors.ink,
            '--crm-color-slate': colors.slate,
            '--crm-color-line-strong': colors.lineStrong,
            '--crm-color-success': colors.success,
            '--crm-color-warning': colors.warning,
            '--crm-color-error': colors.error,
            '--crm-color-info': colors.info,
            '--crm-gradient-hero': gradients.hero,
            '--crm-color-primary-soft': `rgba(${hexToRgb(colors.primary).r}, ${hexToRgb(colors.primary).g}, ${hexToRgb(colors.primary).b}, 0.12)`,
            '--crm-color-primary-border': `rgba(${hexToRgb(colors.primary).r}, ${hexToRgb(colors.primary).g}, ${hexToRgb(colors.primary).b}, 0.55)`,
            '--crm-color-primary-hover': `rgba(${hexToRgb(colors.primary).r}, ${hexToRgb(colors.primary).g}, ${hexToRgb(colors.primary).b}, 0.06)`,
          },
          body: {
            background: gradients.appBackground,
            color: colors.ink,
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
            boxShadow: shadows.focus,
            '&:hover': {
              boxShadow: shadows.focusHover,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: crmRadius.lg,
            border: `1px solid ${alpha(colors.ink, isDark ? 0.14 : 0.08)}`,
            boxShadow: shadows.panel,
            backgroundImage: 'none',
            overflow: 'hidden',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            // Иначе outlined-подписи (ФИО и т.п.) обрезаются сверху после DialogTitle
            '& .MuiDialogTitle-root + .MuiDialogContent-root': {
              paddingTop: 20,
            },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            paddingTop: 20,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? alpha(colors.surfaceStrong, 0.92) : alpha('#ffffff', 0.9),
            color: colors.ink,
            backdropFilter: 'blur(18px)',
            borderBottom: `1px solid ${alpha(colors.ink, isDark ? 0.14 : 0.08)}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.sidebar,
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
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: colors.slate,
            '&.Mui-focused': {
              color: colors.primary,
            },
            '&.Mui-disabled': {
              color: alpha(colors.slate, 0.72),
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            color: colors.slate,
            marginTop: 6,
            '&.Mui-disabled': {
              color: alpha(colors.slate, 0.72),
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: crmRadius.sm,
            backgroundColor: isDark ? alpha(fieldBackground, 0.96) : alpha('#ffffff', 0.92),
            '&.Mui-disabled': {
              '& .MuiInputBase-input': {
                color: alpha(colors.ink, 0.78),
                WebkitTextFillColor: alpha(colors.ink, 0.78),
              },
            },
          },
          notchedOutline: {
            borderColor: alpha(colors.ink, isDark ? 0.28 : 0.23),
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
      MuiStepLabel: {
        styleOverrides: {
          label: {
            color: colors.slate,
            '&.Mui-active': {
              color: colors.ink,
              fontWeight: 700,
            },
            '&.Mui-completed': {
              color: colors.ink,
            },
          },
        },
      },
      MuiStepIcon: {
        styleOverrides: {
          root: {
            color: alpha(colors.ink, isDark ? 0.28 : 0.24),
            '&.Mui-active': {
              color: colors.primary,
            },
            '&.Mui-completed': {
              color: colors.primary,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(colors.ink, isDark ? 0.12 : 0.08),
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            backgroundColor: colors.surfaceStrong,
            color: colors.ink,
          },
          columnHeaders: {
            backgroundColor: colors.surfaceStrong,
            color: colors.slate,
            borderBottom: `1px solid ${colors.lineStrong}`,
            minHeight: '48px !important',
          },
          columnHeaderTitle: {
            fontWeight: 700,
          },
          cell: {
            borderBottom: `1px solid ${colors.line}`,
            color: colors.ink,
          },
          row: {
            '&:hover': {
              backgroundColor: alpha(colors.primary, isDark ? 0.1 : 0.05),
            },
          },
          footerContainer: {
            borderTop: `1px solid ${colors.line}`,
            backgroundColor: colors.surfaceStrong,
            color: colors.slate,
          },
          columnSeparator: {
            display: 'none',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          standardInfo: {
            backgroundColor: isDark ? alpha(colors.info, 0.16) : undefined,
            color: isDark ? colors.ink : undefined,
          },
        },
      },
    },
  });
};

export const resolveAppearanceFromSettings = (settings?: Pick<AppSettings, 'appearance' | 'system'>) =>
  normalizeAppearance({
    ...settings?.appearance,
    mode:
      settings?.appearance?.mode ||
      (settings?.system?.theme === 'dark' ? 'dark' : 'light'),
  });

export const previewCrmTheme = (settings?: Pick<AppSettings, 'appearance' | 'system'>) => {
  if (typeof window === 'undefined') {
    return;
  }

  const appearance = resolveAppearanceFromSettings(settings);
  applyCrmCssVariables(appearance);
  window.dispatchEvent(new CustomEvent(SETTINGS_PREVIEW_EVENT, { detail: appearance }));
};
