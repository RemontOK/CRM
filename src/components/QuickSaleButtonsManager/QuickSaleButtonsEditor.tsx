import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Add, DeleteOutline } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { Part, QuickSaleOption } from '../../types';
import { apiService } from '../../services/api';

const generateId = () => `quick_sale_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

interface QuickSaleButtonsEditorProps {
  options: QuickSaleOption[];
  onChange: (options: QuickSaleOption[]) => void;
}

const QuickSaleButtonsEditor: React.FC<QuickSaleButtonsEditorProps> = ({ options, onChange }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [newOption, setNewOption] = useState<{ label: string; category: string; saleMode: 'single' | 'quantity' }>({
    label: '',
    category: '',
    saleMode: 'quantity',
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const parts = await apiService.get<Part[]>('/inventory/parts');
        const unique = Array.from(
          new Set(parts.map((part) => (part.category || '').trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, 'ru'));
        setCategories(unique);
      } catch {
        setCategories([]);
      }
    };

    void loadCategories();
  }, []);

  const handleAdd = () => {
    const label = newOption.label.trim();
    if (!label) {
      toast.error('Укажите название кнопки');
      return;
    }

    onChange([
      ...options,
      {
        id: generateId(),
        label,
        category: newOption.category,
        saleMode: newOption.saleMode,
        enabled: true,
        sortOrder: options.length + 1,
      },
    ]);
    setNewOption({ label: '', category: '', saleMode: 'quantity' });
  };

  const handleUpdate = (id: string, patch: Partial<QuickSaleOption>) => {
    onChange(options.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleDelete = (id: string) => {
    onChange(
      options
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sortOrder: index + 1 }))
    );
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary">
        Кнопки появляются на странице «Заказы» для быстрой продажи товара из выбранной категории склада.
      </Typography>

      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Название кнопки"
            placeholder="Например: Продать товар, Защитное стекло"
            value={newOption.label}
            onChange={(event) => setNewOption((prev) => ({ ...prev, label: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Категория</InputLabel>
            <Select
              value={newOption.category}
              label="Категория"
              onChange={(event) => setNewOption((prev) => ({ ...prev, category: event.target.value as string }))}
            >
              {categories.length === 0 && (
                <MenuItem value="" disabled>
                  <em>Нет категорий в инвентаре</em>
                </MenuItem>
              )}
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Режим продажи</InputLabel>
            <Select
              value={newOption.saleMode}
              label="Режим продажи"
              onChange={(event) =>
                setNewOption((prev) => ({ ...prev, saleMode: event.target.value as 'single' | 'quantity' }))
              }
            >
              <MenuItem value="single">Одна штука</MenuItem>
              <MenuItem value="quantity">С выбором количества</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, minWidth: 120, whiteSpace: 'nowrap' }}
          >
            Добавить
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1.25}>
        {options.length === 0 && (
          <AlertPlaceholder />
        )}
        {options.map((option) => (
          <Card key={option.id} variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <TextField
                  size="small"
                  sx={{ flex: 1 }}
                  label="Название кнопки"
                  value={option.label}
                  onChange={(event) => handleUpdate(option.id, { label: event.target.value })}
                />
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Категория</InputLabel>
                  <Select
                    value={option.category || ''}
                    label="Категория"
                    onChange={(event) => handleUpdate(option.id, { category: event.target.value as string })}
                  >
                    {categories.length === 0 && (
                      <MenuItem value="" disabled>
                        <em>Нет категорий в инвентаре</em>
                      </MenuItem>
                    )}
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Режим</InputLabel>
                  <Select
                    value={option.saleMode}
                    label="Режим"
                    onChange={(event) =>
                      handleUpdate(option.id, { saleMode: event.target.value as 'single' | 'quantity' })
                    }
                  >
                    <MenuItem value="single">Одна штука</MenuItem>
                    <MenuItem value="quantity">С количеством</MenuItem>
                  </Select>
                </FormControl>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Показывать
                  </Typography>
                  <Switch
                    checked={option.enabled}
                    onChange={(event) => handleUpdate(option.id, { enabled: event.target.checked })}
                  />
                </Stack>
                <IconButton color="error" onClick={() => handleDelete(option.id)}>
                  <DeleteOutline />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};

const AlertPlaceholder = () => (
  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
    Пока нет кнопок. Добавьте первую.
  </Typography>
);

export default QuickSaleButtonsEditor;
