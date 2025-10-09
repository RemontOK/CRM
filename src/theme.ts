import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B35', // Теплый оранжевый
      light: '#FF8A65', // Светлый оранжевый
      dark: '#E64A19', // Темный оранжевый
      contrastText: '#fff',
    },
    secondary: {
      main: '#607D8B', // Серо-голубой
      light: '#90A4AE', // Светло-серый
      dark: '#455A64', // Темно-серый
      contrastText: '#fff',
    },
    background: {
      default: '#1A1A1A', // Темный фон
      paper: '#FFFFFF',
    },
    text: {
      primary: '#616161', // Более светлый серый для основного текста
      secondary: '#9E9E9E', // Светло-серый для вторичного текста
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C',
    },
    warning: {
      main: '#FF9800', // Оранжевый для предупреждений
      light: '#FFB74D',
      dark: '#F57C00',
    },
    error: {
      main: '#F44336',
      light: '#EF5350',
      dark: '#D32F2F',
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161', // Основной текст
      800: '#757575', // Сделаем темные тона светлее
      900: '#616161', // Самый темный тоже светлее
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
          transition: 'all 0.3s ease',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: '#FF6B35',
          color: '#FF6B35',
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.08)',
            borderColor: '#E64A19',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: 12,
          border: '1px solid rgba(96, 125, 139, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: '#FF6B35',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 107, 53, 0.1)',
          color: '#E64A19',
          border: '1px solid rgba(255, 107, 53, 0.2)',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#616161', // Более светлый основной текст
        },
        h1: {
          color: '#616161',
        },
        h2: {
          color: '#616161',
        },
        h3: {
          color: '#616161',
        },
        h4: {
          color: '#616161',
        },
        h5: {
          color: '#616161',
        },
        h6: {
          color: '#616161',
        },
        body1: {
          color: '#757575',
        },
        body2: {
          color: '#9E9E9E',
        },
        caption: {
          color: '#9E9E9E',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#FF6B35',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FF6B35',
            },
          },
        },
      },
    },
  },
});

export default theme;

