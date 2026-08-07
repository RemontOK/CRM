import React, { useState } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import { Send } from '@mui/icons-material';
import { communicationComposerInputSx, communicationComposerSx } from '../../styles/ui';

interface OrderCommunicationComposerProps {
  channel: 'telegram' | 'sms';
  disabled?: boolean;
  sending?: boolean;
  onSend: (message: string) => void | Promise<void>;
}

const OrderCommunicationComposer: React.FC<OrderCommunicationComposerProps> = ({
  channel,
  disabled = false,
  sending = false,
  onSend,
}) => {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) {
      return;
    }
    await onSend(trimmed);
    setMessage('');
  };

  return (
    <Box sx={communicationComposerSx}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder={channel === 'sms' ? 'Текст SMS...' : 'Сообщение в Telegram...'}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
        disabled={disabled || sending}
        sx={communicationComposerInputSx}
      />
      <IconButton
        onClick={() => void handleSend()}
        disabled={disabled || sending || !message.trim()}
        sx={{
          width: 44,
          height: 44,
          bgcolor: channel === 'sms' ? '#f5a623' : '#3390ec',
          color: '#fff',
          flexShrink: 0,
          '&:hover': { bgcolor: channel === 'sms' ? '#e09510' : '#2b7fd4' },
          '&.Mui-disabled': {
            bgcolor: channel === 'sms' ? 'rgba(245,166,35,0.35)' : 'rgba(51,144,236,0.35)',
            color: '#fff',
          },
        }}
      >
        <Send fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default OrderCommunicationComposer;
