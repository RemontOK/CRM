import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Close, Download, Draw, Print } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { AcceptanceAct, PartItem, WorkCompletionAct, WorkItem } from '../../types';
import { appSettingsService } from '../../services/appSettingsService';
import { applyTemplateTokenValues } from '../../services/documentTemplateTokens';
import { buildDocumentWorksTableHtml } from '../../services/documentWorksTable';
import { buildDocumentClientDataTableHtml } from '../../services/documentClientDataTable';
import { documentService } from '../../services/documentService';
import { formatPhone } from '../../utils/phone';
import { calcEstimatedCompletionDate } from '../../utils/orderDates';
import { getAcceptanceActCompleteness, getAcceptanceActNotes } from '../../utils/acceptanceActFields';
import { buildClientDocumentTokenValues } from '../../utils/clientFieldUtils';
import SignaturePad from '../SignaturePad/SignaturePad';

interface DocumentGeneratorProps {
  open: boolean;
  onClose: () => void;
  document: AcceptanceAct | WorkCompletionAct | null;
  documentType: 'acceptance' | 'completion';
  onSign?: (signatureData: string, signerRole: 'client' | 'master') => void;
}

const scheduleDefaults = {
  acceptance: 'Ежедневно с 10:00 - 19:00',
  completion: 'Пн - Сб с 10:00 - 19:00, Вс с 12:00 - 19:00',
};

const pageSx = {
  width: '210mm',
  minHeight: '296mm',
  mx: 'auto',
  bgcolor: '#fff',
  color: '#000',
  p: '14mm 16mm 18mm',
  boxSizing: 'border-box',
  fontFamily: 'Arial, sans-serif',
};

const tableSx = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed' as const,
};

const cellSx = {
  border: '1px solid #8da0a6',
  p: 1.2,
  verticalAlign: 'top',
  fontSize: '12px',
  lineHeight: 1.35,
};

const headerCellSx = {
  ...cellSx,
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '14px',
};

const formatDate = (value?: string | Date) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU');
};

const formatMoney = (value?: number) => String(Number(value || 0)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ');

const displayValue = (value?: string | number | null) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const getAcceptanceEstimatedCompletionDate = (act: AcceptanceAct) => {
  if (act.estimatedCompletionDate) {
    const date = new Date(act.estimatedCompletionDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (act.estimatedDays) {
    return calcEstimatedCompletionDate(act.acceptanceDate, act.estimatedDays);
  }
  return null;
};

const formatAcceptanceEstimatedDate = (act: AcceptanceAct) =>
  formatDate(getAcceptanceEstimatedCompletionDate(act) || undefined);

const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const fallbackDocumentTitle = (value: string | undefined, fallback: string) =>
  value && !/\?{2,}/.test(value) ? value : fallback;

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

const signatureLabelSx = {
  textAlign: 'center',
  fontSize: '11px',
  mt: 0.7,
};

const lineBlockSx = {
  borderBottom: '1px solid #000',
  minHeight: '34px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pb: 0.4,
};

const InfoLine: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ py: 0.9, borderBottom: '1px solid #d8e0e4' }}>
    <Box sx={{ fontWeight: 700, mb: 0.35 }}>{label}</Box>
    <Box>{value || ''}</Box>
  </Box>
);

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  open,
  onClose,
  document: currentDocument,
  documentType,
  onSign,
}) => {
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [currentSignerRole, setCurrentSignerRole] = useState<'client' | 'master'>('client');
  const [isBusy, setIsBusy] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (!currentDocument) {
      setQrCodeUrl('');
      return;
    }

    const qrPayload =
      documentType === 'acceptance'
        ? `Статус заказа ${currentDocument.orderNumber}`
        : `Отзыв по заказу ${currentDocument.orderNumber}`;

    QRCode.toDataURL(qrPayload, {
      width: 132,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(''));
  }, [currentDocument, documentType]);

  if (!currentDocument) {
    return null;
  }

  const appSettings = appSettingsService.getSettings();
  const activeTemplate = appSettings.documents.templates.find(
    (template) => template.type === documentType && template.isActive
  );

  const companyInfo = {
    companyName: appSettings.business.companyName || 'Сервисный центр',
    companyPhone: formatPhone(appSettings.business.phone || ''),
    companyEmail: appSettings.business.email || '',
    companyAddress: appSettings.business.address || '',
    workingHours: appSettings.business.workingHours || '',
  };

  const openSignatureDialog = (role: 'client' | 'master') => {
    setCurrentSignerRole(role);
    setIsSignatureDialogOpen(true);
  };

  const handleSignatureSave = (signatureData: string) => {
    onSign?.(signatureData, currentSignerRole);
    setIsSignatureDialogOpen(false);
  };

  const buildAcceptanceTemplateHtml = (act: AcceptanceAct) => {
    if (!activeTemplate?.template) {
      return '';
    }

    const clientName = `${act.client.firstName} ${act.client.lastName}`.trim();
    const deviceName = [act.device.brand, act.device.model].filter(Boolean).join(' ').trim();
    const clientFieldTokens = buildClientDocumentTokenValues(act.client, appSettings, escapeHtml);

    return applyTemplateTokenValues(activeTemplate.template, {
      '{{НазваниеДокумента}}': escapeHtml(
        fallbackDocumentTitle(
          appSettings.documents.acceptanceActTitle || activeTemplate.name,
          'Акт приема-передачи'
        )
      ),
      '{{НазваниеКомпании}}': escapeHtml(companyInfo.companyName),
      '{{ТелефонКомпании}}': escapeHtml(companyInfo.companyPhone),
      '{{EmailКомпании}}': escapeHtml(companyInfo.companyEmail),
      '{{АдресКомпании}}': escapeHtml(companyInfo.companyAddress),
      '{{ЧасыРаботы}}': escapeHtml(companyInfo.workingHours),
      '{{НомерЗаказа}}': escapeHtml(act.orderNumber),
      '{{СтатусЗаказа}}': '',
      '{{Приоритет}}': '',
      '{{ФИОКлиента}}': escapeHtml(clientName),
      '{{ТелефонКлиента}}': escapeHtml(formatPhone(act.client.phone)),
      '{{EmailКлиента}}': escapeHtml(act.client.email || ''),
      '{{АдресКлиента}}': escapeHtml(act.client.address || ''),
      '{{Устройство}}': escapeHtml(deviceName),
      '{{БрендУстройства}}': escapeHtml(act.device.brand),
      '{{МодельУстройства}}': escapeHtml(act.device.model),
      '{{Цвет}}': escapeHtml(act.device.color || ''),
      '{{СерийныйНомер}}': escapeHtml(act.device.serialNumber || ''),
      '{{IMEI}}': escapeHtml(act.device.imei || ''),
      '{{Пароль}}': escapeHtml(act.device.password || ''),
      '{{Комплектация}}': escapeHtml(getAcceptanceActCompleteness(act)),
      '{{ВнешнийВид}}': escapeHtml(act.device.externalCondition || ''),
      '{{ОписаниеПроблемы}}': escapeHtml(act.problemDescription),
      '{{Диагностика}}': '',
      '{{ОриентировочнаяСтоимость}}': act.preliminaryCost ? formatMoney(act.preliminaryCost) : '',
      '{{ИтоговаяСтоимость}}': '',
      '{{Аванс}}': act.advancePayment ? formatMoney(act.advancePayment) : '',
      '{{Скидка}}': '',
      '{{СпособОплаты}}': '',
      '{{Долг}}': '',
      '{{Работы}}': '',
      '{{ТаблицаДанныхКлиента}}': buildDocumentClientDataTableHtml({
        variant: 'acceptance',
        clientName: `${act.client.firstName} ${act.client.lastName}`.trim(),
        clientPhone: formatPhone(act.client.phone),
        notes: getAcceptanceActNotes(act),
        completeness: getAcceptanceActCompleteness(act),
        device: [act.device.brand, act.device.model].filter(Boolean).join(' ').trim(),
        password: act.device.password || '',
        color: act.device.color || '',
        imei: act.device.imei || '',
        serialNumber: act.device.serialNumber || '',
        appearance: act.device.externalCondition || '',
        estimatedCost: act.preliminaryCost ? formatMoney(act.preliminaryCost) : '',
        advance: act.advancePayment ? formatMoney(act.advancePayment) : '',
        completionDate: formatAcceptanceEstimatedDate(act),
        problemDescription: act.problemDescription,
      }),
      '{{ТаблицаРабот}}': '',
      '{{Запчасти}}': '',
      '{{Мастер}}': escapeHtml(act.acceptedBy),
      '{{МенеджерПриёма}}': escapeHtml(act.acceptedBy),
      '{{МенеджерВыдачи}}': '',
      '{{Дата}}': escapeHtml(formatDate(act.acceptanceDate)),
      '{{ДатаПриёма}}': escapeHtml(formatDate(act.acceptanceDate)),
      '{{ДатаСоздания}}': escapeHtml(formatDate(act.createdAt)),
      '{{ДатаЗавершения}}': escapeHtml(formatAcceptanceEstimatedDate(act)),
      '{{ОриентировочныйСрокРемонта}}': escapeHtml(formatAcceptanceEstimatedDate(act)),
      '{{ТекстГарантии}}': escapeHtml(appSettings.documents.warrantyText),
      '{{ТекстВПодвале}}': escapeHtml(appSettings.documents.footerDisclaimer),
      '{{Заметки}}': escapeHtml(getAcceptanceActNotes(act)),
      '{{Рекомендации}}': escapeHtml(act.conditions || ''),
      ...clientFieldTokens,
    });
  };

  const buildCompletionTemplateHtml = (act: WorkCompletionAct) => {
    if (!activeTemplate?.template) {
      return '';
    }

    const clientName = `${act.client.firstName} ${act.client.lastName}`.trim();
    const deviceName = [act.device.brand, act.device.model].filter(Boolean).join(' ').trim();
    const worksText = act.worksPerformed.map((item) => item.name).join(', ');
    const partsText = act.partsUsed.map((item) => item.name).join(', ');
    const clientFieldTokens = buildClientDocumentTokenValues(act.client, appSettings, escapeHtml);

    return applyTemplateTokenValues(activeTemplate.template, {
      '{{НазваниеДокумента}}': escapeHtml(
        fallbackDocumentTitle(
          appSettings.documents.completionActTitle || activeTemplate.name,
          'Акт выполненных работ'
        )
      ),
      '{{НазваниеКомпании}}': escapeHtml(companyInfo.companyName),
      '{{ТелефонКомпании}}': escapeHtml(companyInfo.companyPhone),
      '{{EmailКомпании}}': escapeHtml(companyInfo.companyEmail),
      '{{АдресКомпании}}': escapeHtml(companyInfo.companyAddress),
      '{{ЧасыРаботы}}': escapeHtml(companyInfo.workingHours),
      '{{НомерЗаказа}}': escapeHtml(act.orderNumber),
      '{{СтатусЗаказа}}': '',
      '{{Приоритет}}': '',
      '{{ФИОКлиента}}': escapeHtml(clientName),
      '{{ТелефонКлиента}}': escapeHtml(formatPhone(act.client.phone)),
      '{{EmailКлиента}}': escapeHtml(act.client.email || ''),
      '{{АдресКлиента}}': escapeHtml(act.client.address || ''),
      '{{Устройство}}': escapeHtml(deviceName),
      '{{БрендУстройства}}': escapeHtml(act.device.brand),
      '{{МодельУстройства}}': escapeHtml(act.device.model),
      '{{Цвет}}': escapeHtml(act.device.color || ''),
      '{{СерийныйНомер}}': escapeHtml(act.device.serialNumber || ''),
      '{{IMEI}}': escapeHtml(act.device.imei || ''),
      '{{Пароль}}': escapeHtml(act.device.password || ''),
      '{{Комплектация}}': escapeHtml(act.client.address || ''),
      '{{ВнешнийВид}}': escapeHtml(act.device.externalCondition || ''),
      '{{ОписаниеПроблемы}}': escapeHtml(worksText),
      '{{Диагностика}}': '',
      '{{ОриентировочнаяСтоимость}}': '',
      '{{ИтоговаяСтоимость}}': formatMoney(act.totalCost),
      '{{Аванс}}': '',
      '{{Скидка}}': '0',
      '{{СпособОплаты}}': '',
      '{{Долг}}': '',
      '{{Работы}}': escapeHtml(worksText),
      '{{ТаблицаДанныхКлиента}}': buildDocumentClientDataTableHtml({
        variant: 'completion',
        clientName,
        clientPhone: formatPhone(act.client.phone),
        completeness: act.client.address || '',
        device: deviceName,
        password: act.device.password || '',
        color: act.device.color || '',
        imei: act.device.imei || '',
        serialNumber: act.device.serialNumber || '',
        appearance: act.device.externalCondition || '',
        advance: '',
        problemDescription: worksText,
        warrantyText: appSettings.documents.warrantyText,
      }),
      '{{ТаблицаРабот}}': buildDocumentWorksTableHtml(
        act.worksPerformed,
        act.partsUsed,
        act.warrantyPeriod,
        act.totalCost
      ),
      '{{Запчасти}}': escapeHtml(partsText),
      '{{Мастер}}': escapeHtml(act.completedBy),
      '{{МенеджерПриёма}}': '',
      '{{МенеджерВыдачи}}': escapeHtml(act.completedBy),
      '{{Дата}}': escapeHtml(formatDate(act.completionDate)),
      '{{ДатаСоздания}}': escapeHtml(formatDate(act.createdAt)),
      '{{ДатаЗавершения}}': escapeHtml(formatDate(act.completionDate)),
      '{{ДатаПриёма}}': '',
      '{{ТекстГарантии}}': escapeHtml(appSettings.documents.warrantyText),
      '{{ТекстВПодвале}}': escapeHtml(appSettings.documents.footerDisclaimer),
      '{{Заметки}}': escapeHtml(act.client.notes || ''),
      '{{Рекомендации}}': '',
      ...clientFieldTokens,
    });
  };

  const buildPdf = async () => {
    const element = window.document.getElementById('document-content');
    if (!element) {
      throw new Error('Шаблон документа не найден');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');
    const overflowTolerance = 3;

    if (imgHeight <= pageHeight + overflowTolerance) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      return pdf;
    }

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > overflowTolerance) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  };

  const markPrinted = async () => {
    await documentService.markDocumentAsPrinted(currentDocument.id, documentType);
  };

  const handleDownloadPdf = async () => {
    setIsBusy(true);
    try {
      const pdf = await buildPdf();
      pdf.save(`${documentType === 'acceptance' ? 'acceptance' : 'completion'}-${currentDocument.orderNumber.replace('#', '')}.pdf`);
      await markPrinted();
      toast.success('PDF сохранен');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось сохранить PDF');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintPdf = async () => {
    setIsBusy(true);
    try {
      const pdf = await buildPdf();
      pdf.autoPrint();
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const popup = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        URL.revokeObjectURL(pdfUrl);
        throw new Error('Окно печати заблокировано браузером');
      }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      await markPrinted();
      toast.success('PDF подготовлен к печати');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось открыть PDF для печати');
    } finally {
      setIsBusy(false);
    }
  };

  const renderTop = (title: string, subtitle: string, date: string, schedule: string) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 220px', alignItems: 'start', gap: 2.2, mb: 3.2 }}>
      <Box sx={{ textAlign: 'center' }}>
        {qrCodeUrl ? (
          <Box component="img" src={qrCodeUrl} alt="QR" sx={{ width: 118, height: 118, display: 'block', mx: 'auto', mb: 0.8 }} />
        ) : (
          <Box sx={{ width: 118, height: 118, mx: 'auto', mb: 0.8, border: '1px solid #000' }} />
        )}
        <Typography sx={{ fontSize: '8px' }}>{subtitle}</Typography>
      </Box>

      <Box sx={{ textAlign: 'center', pt: 0.5 }}>
        <Typography sx={{ fontSize: '18px', fontWeight: 700, mb: 0.4 }}>{title}</Typography>
        {documentType === 'acceptance' && (
          <Typography sx={{ fontSize: '13px', mb: 1.5 }}>устройства в ремонт</Typography>
        )}
        <Typography sx={{ fontSize: '17px', fontWeight: 500, mb: 1.2 }}>№{currentDocument.orderNumber.replace('#', '')}</Typography>
        <Typography sx={{ fontSize: '14px' }}>{date}</Typography>
      </Box>

      <Box sx={{ fontSize: '12px', lineHeight: 1.55 }}>
        <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 0.6 }}>{companyInfo.companyName}</Typography>
        {companyInfo.companyAddress ? (
          <Typography sx={{ fontSize: '12px' }}>{companyInfo.companyAddress}</Typography>
        ) : null}
        {companyInfo.companyPhone ? (
          <Typography sx={{ fontSize: '12px' }}>Тел. {companyInfo.companyPhone}</Typography>
        ) : null}
        {companyInfo.companyEmail ? (
          <Typography sx={{ fontSize: '12px' }}>{companyInfo.companyEmail}</Typography>
        ) : null}
        <Typography sx={{ fontSize: '12px' }}>{schedule || companyInfo.workingHours}</Typography>
      </Box>
    </Box>
  );

  const renderTemplateDocument = (html: string) => (
    <Box
      id="document-content"
      sx={{
        ...pageSx,
        '& h1, & h2, & h3': { mt: 0, mb: 1.5, color: '#000' },
        '& p': { m: 0, mb: 1.2, fontSize: '12px', lineHeight: 1.6 },
        '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
        '& td, & th': { border: '1px solid #8da0a6', padding: '8px 10px', fontSize: '12px', verticalAlign: 'top' },
        '& ul, & ol': { pl: 2.5, mb: 1.5 },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  const renderAcceptance = (act: AcceptanceAct) => {
    const acceptanceDate = formatDate(act.acceptanceDate);
    const clientName = `${act.client.firstName} ${act.client.lastName}`.trim();
    const expectedDate = formatAcceptanceEstimatedDate(act);
    const prepay = Number(act.advancePayment || 0);
    const deviceName = [act.device.brand, act.device.model].filter(Boolean).join(' ').trim();

    return (
      <Box id="document-content" sx={pageSx}>
        {renderTop('Акт приема - передачи', 'Следите за статусом вашего заказа', acceptanceDate, companyInfo.workingHours || scheduleDefaults.acceptance)}

        <Box component="table" sx={tableSx}>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={headerCellSx}>Клиент</Box>
              <Box component="th" sx={headerCellSx}>Устройство</Box>
              <Box component="th" sx={headerCellSx}>Ремонт</Box>
            </Box>
          </Box>
          <Box component="tbody">
            <Box component="tr">
              <Box component="td" sx={cellSx}>
                <InfoLine label="ФИО Клиента:" value={displayValue(clientName)} />
                <InfoLine label="Номер телефона клиента:" value={displayValue(act.client.phone)} />
                <InfoLine label="Комплектация:" value={displayValue(getAcceptanceActCompleteness(act))} />
                <InfoLine label="Заметки:" value={displayValue(getAcceptanceActNotes(act))} />
              </Box>
              <Box component="td" sx={cellSx}>
                <InfoLine label="Устройство:" value={displayValue(deviceName)} />
                <InfoLine label="пароль:" value={displayValue(act.device.password)} />
                <InfoLine label="Цвет:" value={displayValue(act.device.color)} />
                <InfoLine label="IMEI:" value={displayValue(act.device.imei)} />
                <InfoLine label="S/N:" value={displayValue(act.device.serialNumber)} />
                <InfoLine label="Внешний вид устройства:" value={displayValue(act.device.externalCondition)} />
              </Box>
              <Box component="td" sx={cellSx}>
                <InfoLine label="Ориентировочная стоимость:" value={act.preliminaryCost ? formatMoney(act.preliminaryCost) : ''} />
                <InfoLine label="Аванс:" value={prepay ? formatMoney(prepay) : ''} />
                <InfoLine label="Ориентировочный срок ремонта:" value={displayValue(expectedDate)} />
                <InfoLine label="Заявленные неисправности:" value={displayValue(act.problemDescription)} />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, mt: 3.2, fontSize: '10px', lineHeight: 1.7 }}>
          <Box>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>1. Подписывая данный акт приема — передачи устройства клиент подтверждает, что ознакомлен и согласен с правилами и условиями проведения ремонтных работ, изложенными в публичной оферте сервисного центра.</Typography>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>2. Установленные узлы или расходные материалы возврату не подлежат, согласно Перечню сложных технических товаров, не подлежащих обмену или возврату.</Typography>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>3. Клиент согласен с тем, что гарантия от производителя после произведенного ремонта недействительна.</Typography>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>4. Исполнитель не несет ответственности за возможную потерю информации на внутренних носителях устройства, связанную с заменой узлов и компонентов.</Typography>
            <Typography sx={{ fontSize: '10px' }}>5. Исполнитель не несет ответственности за сохранность гарантийных пломб сторонних сервисных центров и производителя устройства.</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>6. Клиент принимает на себя риск, связанный с возможным проявлением при ремонте скрытых дефектов устройства, которые невозможно проверить и зафиксировать в момент приема.</Typography>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>7. Ремонт и обслуживание осуществляется в соответствии с требованиями нормативных документов и Закона РФ «О защите прав потребителей».</Typography>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>8. Устройство клиента принимается без разбора и выявления внутренних неисправностей.</Typography>
            <Typography sx={{ fontSize: '10px', mb: 2 }}>9. Клиент согласен с тем, что при ремонте устройства могут быть заменены компоненты, узлы и модули, влияющие на идентификацию устройства.</Typography>
            <Typography sx={{ fontSize: '10px' }}>10. Факт возврата устройства из ремонта фиксируется в акте выполненных работ при выдаче устройства.</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, mt: 5.2, alignItems: 'end' }}>
          <Box>
            <Typography sx={{ fontSize: '10px', textAlign: 'center', mb: 2 }}>
              С условиями ознакомлен и согласен, устройство в указанном состоянии и работоспособности передал:
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.2, fontSize: '11px' }}>
              <Box>{formatDate(act.clientSignature?.signedAt || act.acceptanceDate)}</Box>
              <Box>{act.clientSignature?.signatureData ? '✔' : ''}</Box>
            </Box>
            <Box sx={lineBlockSx}>
              {act.clientSignature?.signatureData && (
                <Box component="img" src={act.clientSignature.signatureData} alt="client-sign" sx={{ maxHeight: 26 }} />
              )}
            </Box>
            <Typography sx={signatureLabelSx}>Подпись клиента</Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '10px', textAlign: 'center', mb: 2 }}>
              Устройство в указанном состоянии и работоспособности принял:
            </Typography>
            <Box sx={{ height: '22px', mb: 1.2 }} />
            <Box sx={lineBlockSx}>
              {act.masterSignature?.signatureData && (
                <Box component="img" src={act.masterSignature.signatureData} alt="master-sign" sx={{ maxHeight: 26 }} />
              )}
            </Box>
            <Typography sx={signatureLabelSx}>Подпись исполнителя</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderCompletionTable = (works: WorkItem[], parts: PartItem[], warrantyDays: number, total: number) => {
    const rows = [
      ...works.map((work) => ({
        name: work.name,
        warranty: Number(work.warrantyDays ?? warrantyDays) || 0,
        price: work.cost,
        quantity: work.quantity,
        total: work.totalCost,
      })),
      ...parts.map((part) => ({
        name: part.name,
        warranty: warrantyDays,
        price: part.unitPrice,
        quantity: part.quantity,
        total: part.totalPrice,
      })),
    ];

    const completionHeaderSx = {
      ...headerCellSx,
      p: 0.75,
      fontSize: '11px',
      lineHeight: 1.2,
      textAlign: 'center',
      verticalAlign: 'middle',
      whiteSpace: 'normal',
      wordBreak: 'normal',
    };

    return (
      <Box component="table" sx={{ ...tableSx, mt: 2.8 }}>
        <Box component="colgroup">
          <Box component="col" sx={{ width: 36 }} />
          <Box component="col" />
          <Box component="col" sx={{ width: 92 }} />
          <Box component="col" sx={{ width: 82 }} />
          <Box component="col" sx={{ width: 92 }} />
          <Box component="col" sx={{ width: 90 }} />
        </Box>
        <Box component="thead">
          <Box component="tr">
            <Box component="th" sx={completionHeaderSx}>№</Box>
            <Box component="th" sx={completionHeaderSx}>Наименование работы</Box>
            <Box component="th" sx={completionHeaderSx}>Гарантия,<br />дн.</Box>
            <Box component="th" sx={completionHeaderSx}>Цена, ₽</Box>
            <Box component="th" sx={completionHeaderSx}>Количество</Box>
            <Box component="th" sx={completionHeaderSx}>Сумма, ₽</Box>
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map((row, index) => (
            <Box component="tr" key={`${row.name}-${index}`}>
              <Box component="td" sx={{ ...cellSx, textAlign: 'center' }}>{index + 1}</Box>
              <Box component="td" sx={cellSx}>{row.name}</Box>
              <Box component="td" sx={{ ...cellSx, textAlign: 'center' }}>{row.warranty}</Box>
              <Box component="td" sx={{ ...cellSx, textAlign: 'right' }}>{formatMoney(row.price)}</Box>
              <Box component="td" sx={{ ...cellSx, textAlign: 'center' }}>{row.quantity}</Box>
              <Box component="td" sx={{ ...cellSx, textAlign: 'right' }}>{formatMoney(row.total)}</Box>
            </Box>
          ))}
          <Box component="tr">
            <Box component="td" sx={{ ...cellSx, textAlign: 'right', fontWeight: 700 }} colSpan={5 as any}>Сумма, ₽</Box>
            <Box component="td" sx={{ ...cellSx, textAlign: 'right', fontWeight: 700 }}>{formatMoney(total)}</Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderCompletion = (act: WorkCompletionAct) => {
    const completionDate = formatDate(act.completionDate);
    const clientName = `${act.client.firstName} ${act.client.lastName}`.trim();
    const advance = Math.round((act.totalCost || 0) * 0.3);
    const deviceName = [act.device.brand, act.device.model].filter(Boolean).join(' ').trim();

    return (
      <Box id="document-content" sx={pageSx}>
        {renderTop('Акт выполненных работ', 'Оставьте отзыв', completionDate ? `от ${completionDate}` : 'от', companyInfo.workingHours || scheduleDefaults.completion)}

        <Box component="table" sx={tableSx}>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={headerCellSx}>Клиент</Box>
              <Box component="th" sx={headerCellSx}>Устройство</Box>
              <Box component="th" sx={headerCellSx}>Ремонт</Box>
            </Box>
          </Box>
          <Box component="tbody">
            <Box component="tr">
              <Box component="td" sx={cellSx}>
                <InfoLine label="ФИО Клиента:" value={displayValue(clientName)} />
                <InfoLine label="Номер телефона клиента:" value={displayValue(act.client.phone)} />
                <InfoLine label="Комплектация:" value={displayValue(act.client.address)} />
              </Box>
              <Box component="td" sx={cellSx}>
                <InfoLine label="Устройство:" value={displayValue(deviceName)} />
                <InfoLine label="пароль:" value={displayValue(act.device.password)} />
                <InfoLine label="Цвет:" value={displayValue(act.device.color)} />
                <InfoLine label="IMEI:" value={displayValue(act.device.imei)} />
                <InfoLine label="S/N:" value={displayValue(act.device.serialNumber)} />
                <InfoLine label="Внешний вид устройства:" value={displayValue(act.device.externalCondition)} />
              </Box>
              <Box component="td" sx={cellSx}>
                <InfoLine label="Аванс:" value={advance ? formatMoney(advance) : ''} />
                <InfoLine label="Заявленные неисправности:" value={displayValue(act.worksPerformed.map((item) => item.name).join(', '))} />
              </Box>
            </Box>
            <Box component="tr">
              <Box component="td" sx={{ ...cellSx, fontSize: '11px' }} colSpan={3 as any}>
                <Box sx={{ fontWeight: 700, mb: 0.6 }}>Условия гарантии:</Box>
                Клиент согласен с тем, что использование устройства без защитного аксессуара лишает гарантии на экран
                и иные чувствительные элементы, поскольку любое физическое воздействие кроме изложенных в инструкции
                по эксплуатации может служить причиной выхода из строя модуля, за которые исполнитель не несет ответственность.
              </Box>
            </Box>
          </Box>
        </Box>

        {renderCompletionTable(act.worksPerformed, act.partsUsed, act.warrantyPeriod, act.totalCost)}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, mt: 6.5, alignItems: 'end' }}>
          <Box>
            <Typography sx={{ fontSize: '10px', textAlign: 'center', mb: 2 }}>
              Подтверждаю, что исполнитель выполнил указанные работы, функционал согласно приложению проверен.
              Претензий к внешнему виду и качеству работы не имею. Ознакомлен(а) с условиями гарантии, устройство принял(а) без замечаний.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.2, fontSize: '11px' }}>
              <Box>{formatDate(act.clientSignature?.signedAt || act.completionDate)}</Box>
              <Box>{act.clientSignature?.signatureData ? '✔' : ''}</Box>
            </Box>
            <Box sx={lineBlockSx}>
              {act.clientSignature?.signatureData && (
                <Box component="img" src={act.clientSignature.signatureData} alt="client-sign" sx={{ maxHeight: 26 }} />
              )}
            </Box>
            <Typography sx={signatureLabelSx}>Подпись клиента</Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '10px', textAlign: 'center', mb: 2 }}>
              Выполнил указанные в акте работы, передал устройство клиенту, подтверждая гарантию на выполненные работы в соответствии с условиями гарантии.
            </Typography>
            <Box sx={{ height: '22px', mb: 1.2 }} />
            <Box sx={lineBlockSx}>
              {act.masterSignature?.signatureData && (
                <Box component="img" src={act.masterSignature.signatureData} alt="master-sign" sx={{ maxHeight: 26 }} />
              )}
            </Box>
            <Typography sx={signatureLabelSx}>Подпись исполнителя</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {documentType === 'acceptance' ? 'Акт приема-передачи' : 'Акт выполненных работ'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton onClick={handleDownloadPdf} disabled={isBusy}>
                <Download />
              </IconButton>
              <IconButton onClick={handlePrintPdf} disabled={isBusy}>
                <Print />
              </IconButton>
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            </Stack>
          </Box>
        </Box>
        <DialogContent sx={{ p: 0, bgcolor: '#eceff1' }}>
          {documentType === 'acceptance'
            ? activeTemplate?.template
              ? renderTemplateDocument(buildAcceptanceTemplateHtml(currentDocument as AcceptanceAct))
              : renderAcceptance(currentDocument as AcceptanceAct)
            : activeTemplate?.template
              ? renderTemplateDocument(buildCompletionTemplateHtml(currentDocument as WorkCompletionAct))
              : renderCompletion(currentDocument as WorkCompletionAct)}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button startIcon={<Draw />} onClick={() => openSignatureDialog('client')}>Подпись клиента</Button>
          <Button startIcon={<Draw />} onClick={() => openSignatureDialog('master')}>Подпись исполнителя</Button>
          <Button onClick={handleDownloadPdf} disabled={isBusy}>Скачать PDF</Button>
          <Button variant="contained" onClick={handlePrintPdf} disabled={isBusy}>Печать PDF</Button>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <SignaturePad
        open={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        onSave={handleSignatureSave}
        signerName={
          currentSignerRole === 'client'
            ? `${currentDocument.client.firstName} ${currentDocument.client.lastName}`
            : 'Мастер'
        }
        signerRole={currentSignerRole}
      />
    </>
  );
};

export default DocumentGenerator;
