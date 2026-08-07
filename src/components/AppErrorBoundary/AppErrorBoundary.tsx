import React from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { isChunkLoadError } from '../../utils/lazyWithRetry';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    if (isChunkLoadError(error)) {
      return { error: null };
    }
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 480, width: '100%' }}>
            <Alert severity="error">Произошла ошибка интерфейса</Alert>
            <Typography color="text.secondary">
              Обновите страницу. Если проблема повторяется — очистите кэш браузера (Ctrl+Shift+R).
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          </Stack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
