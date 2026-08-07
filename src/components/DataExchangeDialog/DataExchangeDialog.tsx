import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ContentPaste,
  Download,
  FileUpload,
  TableView,
  ContentCopy,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import {
  ColumnDef,
  SheetRow,
  downloadCsv,
  downloadXlsx,
  emptyTemplateRows,
  parseDelimitedText,
  parseWorkbookFile,
  rowsToTsv,
} from '../../utils/sheetIO';
import type { ImportResult } from '../../utils/inventoryExchange';

type DataExchangeDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  entityLabel: string;
  fileBaseName: string;
  sheetName: string;
  columns: ColumnDef[];
  exportRows: Record<string, string>[];
  templateSamples?: SheetRow[];
  onImport: (rows: SheetRow[], options: { updateExisting: boolean }) => Promise<ImportResult>;
  onImported?: () => void | Promise<void>;
};

const DataExchangeDialog: React.FC<DataExchangeDialogProps> = ({
  open,
  onClose,
  title,
  entityLabel,
  fileBaseName,
  sheetName,
  columns,
  exportRows,
  templateSamples = [],
  onImport,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<SheetRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const previewHeaders = useMemo(() => {
    if (!previewRows.length) return columns.slice(0, 6).map((column) => column.header);
    return Object.keys(previewRows[0]).slice(0, 8);
  }, [columns, previewRows]);

  const resetImportState = () => {
    setPasteText('');
    setPreviewRows([]);
    setLastResult(null);
  };

  const handleClose = () => {
    if (importing) return;
    resetImportState();
    onClose();
  };

  const handleExportXlsx = () => {
    if (!exportRows.length) {
      toast.error(`Нет ${entityLabel} для экспорта`);
      return;
    }
    downloadXlsx(exportRows, `${fileBaseName}.xlsx`, sheetName);
    toast.success(`Экспорт в Excel: ${exportRows.length}`);
  };

  const handleExportCsv = () => {
    if (!exportRows.length) {
      toast.error(`Нет ${entityLabel} для экспорта`);
      return;
    }
    downloadCsv(exportRows, `${fileBaseName}.csv`);
    toast.success(`Экспорт в CSV: ${exportRows.length}`);
  };

  const handleCopy = async () => {
    if (!exportRows.length) {
      toast.error(`Нет ${entityLabel} для копирования`);
      return;
    }
    try {
      await navigator.clipboard.writeText(rowsToTsv(exportRows));
      toast.success('Скопировано в буфер (можно вставить в Excel)');
    } catch {
      toast.error('Не удалось скопировать в буфер');
    }
  };

  const handleTemplate = (format: 'xlsx' | 'csv') => {
    const rows = emptyTemplateRows(columns, templateSamples);
    if (format === 'xlsx') {
      downloadXlsx(rows, `${fileBaseName}-шаблон.xlsx`, sheetName);
    } else {
      downloadCsv(rows, `${fileBaseName}-шаблон.csv`);
    }
    toast.success('Шаблон скачан');
  };

  const loadPreview = (rows: SheetRow[]) => {
    if (!rows.length) {
      toast.error('В файле нет строк данных');
      setPreviewRows([]);
      return;
    }
    setPreviewRows(rows);
    setLastResult(null);
    toast.success(`Загружено строк: ${rows.length}`);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text();
        loadPreview(parseDelimitedText(text));
      } else {
        loadPreview(await parseWorkbookFile(file));
      }
    } catch {
      toast.error('Не удалось прочитать файл');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePastePreview = () => {
    try {
      loadPreview(parseDelimitedText(pasteText));
    } catch {
      toast.error('Не удалось разобрать вставленные данные');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteText(text);
      loadPreview(parseDelimitedText(text));
    } catch {
      toast.error('Нет доступа к буферу обмена — вставьте данные вручную');
    }
  };

  const handleImport = async () => {
    if (!previewRows.length) {
      toast.error('Сначала загрузите файл или вставьте данные');
      return;
    }
    setImporting(true);
    try {
      const result = await onImport(previewRows, { updateExisting });
      setLastResult(result);
      await onImported?.();
      const message = `Готово: создано ${result.created}, обновлено ${result.updated}, пропущено ${result.skipped}`;
      if (result.errors.length) {
        toast.error(message);
      } else {
        toast.success(message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Экспорт
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Сейчас к экспорту: {exportRows.length} {entityLabel}. Форматы: Excel, CSV, буфер обмена.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<Download />} onClick={handleExportXlsx}>
                Excel (.xlsx)
              </Button>
              <Button variant="outlined" startIcon={<TableView />} onClick={handleExportCsv}>
                CSV
              </Button>
              <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopy}>
                Копировать
              </Button>
              <Button variant="text" onClick={() => handleTemplate('xlsx')}>
                Шаблон Excel
              </Button>
              <Button variant="text" onClick={() => handleTemplate('csv')}>
                Шаблон CSV
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Импорт
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Загрузите Excel/CSV или вставьте таблицу из Excel (Ctrl+V). Заголовки можно на русском —
              система распознает колонки автоматически.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<FileUpload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                Выбрать файл
              </Button>
              <Button
                variant="outlined"
                startIcon={<ContentPaste />}
                onClick={handlePasteFromClipboard}
                disabled={importing}
              >
                Из буфера
              </Button>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={updateExisting}
                    onChange={(event) => setUpdateExisting(event.target.checked)}
                    disabled={importing}
                  />
                }
                label="Обновлять существующие"
              />
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain"
              hidden
              onChange={(event) => void handleFile(event.target.files?.[0] || null)}
            />
            <TextField
              label="Или вставьте сюда таблицу"
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              multiline
              minRows={3}
              fullWidth
              disabled={importing}
              placeholder="Скопируйте строки из Excel и вставьте сюда"
            />
            <Button sx={{ mt: 1 }} onClick={handlePastePreview} disabled={importing || !pasteText.trim()}>
              Разобрать вставленное
            </Button>
          </Box>

          {previewRows.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Предпросмотр: {previewRows.length} строк
              </Typography>
              <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {previewHeaders.map((header) => (
                        <TableCell key={header}>{header}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRows.slice(0, 20).map((row, index) => (
                      <TableRow key={index}>
                        {previewHeaders.map((header) => (
                          <TableCell key={header}>{row[header] || ''}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              {previewRows.length > 20 && (
                <Typography variant="caption" color="text.secondary">
                  Показаны первые 20 строк
                </Typography>
              )}
            </Box>
          )}

          {importing && <LinearProgress />}

          {lastResult && (
            <Alert severity={lastResult.errors.length ? 'warning' : 'success'}>
              Создано: {lastResult.created}. Обновлено: {lastResult.updated}. Пропущено:{' '}
              {lastResult.skipped}.
              {lastResult.errors.length > 0 && (
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {lastResult.errors.slice(0, 8).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {lastResult.errors.length > 8 && <li>…и ещё {lastResult.errors.length - 8}</li>}
                </Box>
              )}
            </Alert>
          )}

          <Alert severity="info">
            Колонки шаблона: {columns.map((column) => column.header).join(', ')}.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          Закрыть
        </Button>
        <Button variant="contained" onClick={() => void handleImport()} disabled={importing || !previewRows.length}>
          {importing ? 'Импорт…' : `Импортировать (${previewRows.length || 0})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataExchangeDialog;
