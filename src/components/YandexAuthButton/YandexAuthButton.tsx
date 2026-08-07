import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import {
  YANDEX_AUTH_COMPANY_KEY,
  YANDEX_AUTH_MODE_KEY,
  YANDEX_AUTH_STATE_KEY,
  YandexAuthMode,
  yandexAuthService,
} from '../../services/yandexAuthService';

const YandexIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M13.3 4h2.4L12 12.9 8.3 4H2.7l5.8 10.1L2.5 20h2.4l5.1-5.7L15.1 20h5.6l-6.1-10.6L21.5 4h-2.4l-5.8 6.6L13.3 4z"
    />
  </svg>
);

interface YandexAuthButtonProps {
  mode: YandexAuthMode;
  companyName?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  label?: string;
}

const YandexAuthButton: React.FC<YandexAuthButtonProps> = ({
  mode,
  companyName = '',
  fullWidth = true,
  disabled = false,
  label,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const { url, state } = await yandexAuthService.start(mode, companyName);
      sessionStorage.setItem(YANDEX_AUTH_STATE_KEY, state);
      sessionStorage.setItem(YANDEX_AUTH_MODE_KEY, mode);
      if (companyName.trim()) {
        sessionStorage.setItem(YANDEX_AUTH_COMPANY_KEY, companyName.trim());
      } else {
        sessionStorage.removeItem(YANDEX_AUTH_COMPANY_KEY);
      }
      window.location.assign(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось открыть авторизацию Яндекса';
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <Button
      fullWidth={fullWidth}
      variant="outlined"
      color="inherit"
      disabled={disabled || isLoading}
      onClick={() => void handleClick()}
      startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <YandexIcon />}
      sx={{
        borderColor: 'divider',
        color: 'text.primary',
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: 'text.secondary',
        },
      }}
    >
      {label || (mode === 'register' ? 'Зарегистрироваться через Яндекс' : 'Войти через Яндекс')}
    </Button>
  );
};

export default YandexAuthButton;
