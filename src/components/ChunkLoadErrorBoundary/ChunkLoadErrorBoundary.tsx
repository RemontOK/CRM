import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { CHUNK_RELOAD_BLOCKED_MESSAGE, isChunkLoadError } from '../../utils/lazyWithRetry';

type Props = {
  children: React.ReactNode;
};

type State = {
  failed: boolean;
  details: string;
};

class ChunkLoadErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false, details: '' };

  static getDerivedStateFromError(error: unknown): State | null {
    if (isChunkLoadError(error)) {
      const details = error instanceof Error ? error.message : String(error);
      return { failed: true, details };
    }
    return null;
  }

  render() {
    if (this.state.failed) {
      return (
        <Box
          data-chunk-error
          sx={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ maxWidth: 480 }}>
            <Typography variant="h6" gutterBottom>
              Не удалось загрузить приложение
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              {CHUNK_RELOAD_BLOCKED_MESSAGE}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              В Google Chrome после обновления сайта иногда остаётся старый кэш. Закройте все вкладки с nakcrm.ru, откройте сайт заново или очистите данные сайта для nakcrm.ru.
            </Typography>
            {this.state.details ? (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
                {this.state.details}
              </Typography>
            ) : null}
            <Button
              variant="contained"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('_v', String(Date.now()));
                window.location.replace(url.toString());
              }}
            >
              Обновить страницу
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ChunkLoadErrorBoundary;
