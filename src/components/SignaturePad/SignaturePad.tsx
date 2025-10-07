import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  IconButton,
} from '@mui/material';
import { Clear, Save, Close } from '@mui/icons-material';

interface SignaturePadProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  signerName: string;
  signerRole: 'client' | 'master' | 'manager';
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  open,
  onClose,
  onSave,
  signerName,
  signerRole,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (open) {
      setHasSignature(false);
      clearCanvas();
    }
  }, [open]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setHasSignature(true);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signatureData = canvas.toDataURL('image/png');
      onSave(signatureData);
      onClose();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return 'Клиент';
      case 'master': return 'Мастер';
      case 'manager': return 'Менеджер';
      default: return 'Подписант';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Электронная подпись
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Подписант: {signerName} ({getRoleLabel(signerRole)})
          </Typography>
        </Box>
        
        <Paper 
          elevation={2} 
          sx={{ 
            border: '2px dashed #ccc',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            style={{
              display: 'block',
              cursor: 'crosshair',
              backgroundColor: '#ffffff',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          
          {!hasSignature && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#999',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="body2">
                Распишитесь здесь
              </Typography>
            </Box>
          )}
        </Paper>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Clear />}
            onClick={clearCanvas}
            disabled={!hasSignature}
          >
            Очистить
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={!hasSignature}
        >
          Сохранить подпись
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignaturePad;
