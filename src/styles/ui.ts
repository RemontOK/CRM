import { alpha } from '@mui/material/styles';
import { SxProps, Theme } from '@mui/material/styles';
import { crmRadius } from './tokens';

/** Объединяет несколько sx-объектов (для Card и других компонентов с узкой типизацией). */
export const mergeSx = (...styles: SxProps<Theme>[]): SxProps<Theme> => styles as SxProps<Theme>;

export const pageShellSx: SxProps<Theme> = {
  display: 'grid',
  gap: 3,
};

export const heroCardSx: SxProps<Theme> = {
  p: { xs: 3, md: 4 },
  borderRadius: crmRadius.xl,
  background: 'var(--crm-gradient-hero)',
  color: '#fff',
  boxShadow: '0 26px 60px rgba(15, 23, 42, 0.20)',
  overflow: 'hidden',
};

export const panelCardSx: SxProps<Theme> = {
  borderRadius: crmRadius.lg,
  border: '1px solid var(--crm-border)',
  boxShadow: 'var(--crm-shadow)',
  backgroundColor: 'var(--crm-panel)',
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

export const glassHeaderSx: SxProps<Theme> = (theme) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.92)
      : alpha('#ffffff', 0.9),
  backdropFilter: 'blur(18px)',
  borderBottom: '1px solid var(--crm-border)',
  color: theme.palette.text.primary,
});

export const LAYOUT_HEADER_HEIGHT = 80;

export const layoutHeaderShellSx: SxProps<Theme> = {
  height: LAYOUT_HEADER_HEIGHT,
  minHeight: LAYOUT_HEADER_HEIGHT,
  maxHeight: LAYOUT_HEADER_HEIGHT,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  px: 3,
};

export const layoutHeaderTitleSx: SxProps<Theme> = {
  m: 0,
  p: 0,
  fontWeight: 800,
  fontSize: '1.25rem',
  lineHeight: 1,
  letterSpacing: 0.2,
};

export const layoutSidebarBrandTitleSx: SxProps<Theme> = {
  ...layoutHeaderTitleSx,
  color: 'rgba(255,255,255,0.72)',
};

export const layoutAppBarTitleSx: SxProps<Theme> = {
  ...layoutHeaderTitleSx,
  color: 'text.primary',
};

export const dataGridSx: SxProps<Theme> = {
  border: 'none',
  color: 'text.primary',
  bgcolor: 'var(--crm-panel)',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'var(--crm-panel)',
    color: 'text.secondary',
    borderBottom: '1px solid var(--crm-border)',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
  },
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid var(--crm-border)',
    color: 'text.primary',
  },
  '& .MuiDataGrid-row': {
    bgcolor: 'var(--crm-panel)',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid var(--crm-border)',
    bgcolor: 'var(--crm-panel)',
    color: 'text.secondary',
  },
  '& .MuiDataGrid-columnSeparator': {
    display: 'none',
  },
  '& .MuiDataGrid-overlay': {
    bgcolor: 'var(--crm-panel)',
    color: 'text.secondary',
  },
};

export const tableHeadRowSx: SxProps<Theme> = {
  bgcolor: 'var(--crm-panel)',
};

export const tableHeadCellSx: SxProps<Theme> = {
  color: 'text.secondary',
  fontWeight: 700,
  borderBottom: '1px solid var(--crm-border)',
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

export type ChatBubbleStyle = {
  bgcolor: string;
  color: string;
  timestampColor: string;
  boxShadow: string;
};

export const getChatBubbleStyles = (
  theme: Theme,
  options: { inbound: boolean; channel?: 'telegram' | 'sms' }
): ChatBubbleStyle => {
  const isDark = theme.palette.mode === 'dark';
  const { inbound, channel = 'telegram' } = options;

  if (inbound) {
    if (isDark) {
      return {
        bgcolor: theme.palette.grey[800],
        color: theme.palette.grey[100],
        timestampColor: alpha(theme.palette.common.white, 0.55),
        boxShadow: 'none',
      };
    }

    return {
      bgcolor: '#ffffff',
      color: '#111111',
      timestampColor: 'rgba(0,0,0,0.45)',
      boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
    };
  }

  if (channel === 'sms') {
    if (isDark) {
      return {
        bgcolor: alpha('#f5a623', 0.24),
        color: theme.palette.grey[100],
        timestampColor: alpha(theme.palette.common.white, 0.6),
        boxShadow: 'none',
      };
    }

    return {
      bgcolor: '#fff8e6',
      color: '#111111',
      timestampColor: 'rgba(0,0,0,0.45)',
      boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
    };
  }

  if (isDark) {
    return {
      bgcolor: alpha('#3390ec', 0.32),
      color: '#ffffff',
      timestampColor: alpha('#ffffff', 0.72),
      boxShadow: 'none',
    };
  }

  return {
    bgcolor: '#eeffde',
    color: '#111111',
    timestampColor: 'rgba(0,0,0,0.45)',
    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
  };
};

export const communicationDialogPaperSx: SxProps<Theme> = (theme) => ({
  height: { xs: '92vh', sm: 640 },
  maxHeight: '92vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#dfe6eb',
});

export const communicationChatAreaSx: SxProps<Theme> = (theme) => ({
  flex: 1,
  overflowY: 'auto',
  px: 1.5,
  py: 1.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.75,
  backgroundImage:
    theme.palette.mode === 'dark'
      ? 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.03) 0, transparent 40%)'
      : 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25) 0, transparent 40%)',
});

export const communicationComposerSx: SxProps<Theme> = (theme) => ({
  px: 1.25,
  py: 1,
  bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f0f0f0',
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  gap: 0.75,
  alignItems: 'flex-end',
  flexShrink: 0,
});

export const communicationComposerInputSx: SxProps<Theme> = (theme) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '22px',
    bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff',
    fontSize: 15,
    color: theme.palette.text.primary,
  },
});

export const contentGridSx: SxProps<Theme> = {
  display: 'grid',
  gap: 3,
};

/** Вложенная панель внутри диалога (не белый блок в тёмной теме). */
export const nestedPanelSx: SxProps<Theme> = (theme) => ({
  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : theme.palette.grey[50],
  border: '1px solid',
  borderColor: 'divider',
});

/** Информационный блок с цифрами/расчётами. */
export const infoPanelSx: SxProps<Theme> = (theme) => ({
  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : '#f8fafc',
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? 'divider' : '#e2e8f0',
});

/** Итоговая строка / summary. */
export const totalPanelSx: SxProps<Theme> = (theme) => ({
  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.08) : theme.palette.grey[100],
});

/** Карточка выбора в списке (склад, запчасти). */
export const selectableCardSx =
  (selected: boolean): SxProps<Theme> =>
  (theme) => ({
    cursor: 'pointer',
    borderStyle: 'solid',
    borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
    borderWidth: selected ? 2 : 1,
    '&:hover': {
      bgcolor: 'action.hover',
    },
  });

export const dashedDividerSx: SxProps<Theme> = {
  borderTop: '1px dashed',
  borderColor: 'divider',
};

/** Подсветка выбранного элемента primary-цветом. */
export const highlightCardSx: SxProps<Theme> = (theme) => ({
  bgcolor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.22)
      : theme.palette.primary.light,
  color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.contrastText,
});

/** Предупреждение о низком остатке и т.п. */
export const warningPanelSx: SxProps<Theme> = (theme) => ({
  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.12) : '#fff7ed',
  color: theme.palette.mode === 'dark' ? theme.palette.warning.light : '#7c2d12',
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.35) : '#fdba74',
  boxShadow: 'none',
});
