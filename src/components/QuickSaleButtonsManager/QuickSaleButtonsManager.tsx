import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { FlashOn } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { AppSettings } from '../../types';
import { appSettingsService } from '../../services/appSettingsService';
import QuickSaleButtonsEditor from './QuickSaleButtonsEditor';

interface QuickSaleButtonsManagerProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (settings: AppSettings) => void;
}

const QuickSaleButtonsManager: React.FC<QuickSaleButtonsManagerProps> = ({ open, onClose, onSaved }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSettings(appSettingsService.getSettings());
  }, [open]);

  if (!settings) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await appSettingsService.saveSettings(settings);
      toast.success('Кнопки быстрых продаж сохранены');
      onSaved?.(saved);
      onClose();
    } catch {
      toast.error('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FlashOn color="primary" />
        Кнопки быстрых продаж
      </DialogTitle>
      <DialogContent dividers>
        <QuickSaleButtonsEditor
          options={settings.orders.quickSaleOptions}
          onChange={(quickSaleOptions) =>
            setSettings({
              ...settings,
              orders: {
                ...settings.orders,
                quickSaleOptions,
              },
            })
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickSaleButtonsManager;
