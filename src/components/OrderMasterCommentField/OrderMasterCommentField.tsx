import React, { useState } from 'react';
import { Button, Grid, TextField } from '@mui/material';

interface OrderMasterCommentFieldProps {
  onSubmit: (text: string) => void;
}

const OrderMasterCommentField: React.FC<OrderMasterCommentFieldProps> = ({ onSubmit }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setText('');
  };

  return (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Комментарий для мастера / внутреннее примечание"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <Button fullWidth variant="contained" onClick={handleSubmit} disabled={!text.trim()}>
          Добавить в историю
        </Button>
      </Grid>
    </>
  );
};

export default OrderMasterCommentField;
