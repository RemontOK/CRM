import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  Paper,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Print,
  Close,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { AcceptanceAct, WorkCompletionAct, WorkItem, PartItem } from '../../types';
import SignaturePad from '../SignaturePad/SignaturePad';

interface DocumentGeneratorProps {
  open: boolean;
  onClose: () => void;
  document: AcceptanceAct | WorkCompletionAct | null;
  documentType: 'acceptance' | 'completion';
  onSign?: (signatureData: string, signerRole: 'client' | 'master') => void;
}

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  open,
  onClose,
  document,
  documentType,
  onSign,
}) => {
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [currentSignerRole, setCurrentSignerRole] = useState<'client' | 'master'>('client');
  const [isPrinting, setIsPrinting] = useState(false);

  if (!document) return null;

  const handleSign = (signerRole: 'client' | 'master') => {
    setCurrentSignerRole(signerRole);
    setIsSignatureDialogOpen(true);
  };

  const handleSignatureSave = (signatureData: string) => {
    if (onSign) {
      onSign(signatureData, currentSignerRole);
    }
    setIsSignatureDialogOpen(false);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      window.print();
      // Убираем уведомление, так как оно мешает просмотру PDF
      // toast.success('Документ отправлен на печать');
    } catch (error) {
      console.error('Ошибка при печати:', error);
      toast.error('Ошибка при печати');
    } finally {
      setIsPrinting(false);
    }
  };

  const renderAcceptanceAct = (act: AcceptanceAct) => (
    <Box id="document-content" sx={{ 
      p: 3, 
      maxWidth: 800, 
      mx: 'auto',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: 1.4,
      '@media print': {
        maxWidth: 'none',
        margin: 0,
        padding: '10mm',
        fontSize: '11px',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
      }
    }}>
      {/* Заголовок документа */}
      <Box textAlign="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: '24px', mb: 1 }}>
          АКТ ПРИЕМА-ПЕРЕДАЧИ УСТРОЙСТВА В РЕМОНТ
        </Typography>
        <Typography variant="h6" sx={{ fontSize: '16px', mb: 1 }}>
          №{act.documentNumber}
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '14px' }}>
          от {act.acceptanceDate.toLocaleDateString('ru-RU')}
        </Typography>
      </Box>

      {/* Информация о сервисном центре */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        mb: 3,
        '@media print': {
          justifyContent: 'flex-end',
        }
      }}>
        {/* Информация о сервисном центре */}
        <Box sx={{ textAlign: 'right', minWidth: '300px' }}>
          <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '14px', mb: 0.5 }}>
            Исполнитель NK Service
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            ИП Неклюдов А.А.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            ИНН: 263221164126
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            ОГРНИП: 324265100105224
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            Тел. +7 (938) 309 18-77
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px' }}>
            Ежедневно С 10:00 - 19:00
          </Typography>
        </Box>
      </Box>

      {/* Основная таблица */}
      <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #000' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                border: '1px solid #000', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: '12px',
                width: '33%'
              }}>
                Клиент
              </TableCell>
              <TableCell sx={{ 
                border: '1px solid #000', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: '12px',
                width: '33%'
              }}>
                Устройство
              </TableCell>
              <TableCell sx={{ 
                border: '1px solid #000', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: '12px',
                width: '33%'
              }}>
                Ремонт
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {/* Колонка Клиент */}
              <TableCell sx={{ border: '1px solid #000', fontSize: '12px', verticalAlign: 'top' }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    ФИО Клиента:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.client.firstName} {act.client.lastName}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Номер телефона клиента:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.client.phone}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Комплектация:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    Отсутствует
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Заметки:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    Устройство у клиента
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Рекомендации:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    -
                  </Typography>
                </Box>
              </TableCell>

              {/* Колонка Устройство */}
              <TableCell sx={{ border: '1px solid #000', fontSize: '12px', verticalAlign: 'top' }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Устройство:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.brand} {act.device.model}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Пароль:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    -
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Цвет:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.color || 'Черный'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    IMEI:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.imei || '-'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    S/N:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.serialNumber || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Внешний вид устройства:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.externalCondition || 'Потертости, Царапины'}
                  </Typography>
                </Box>
              </TableCell>

              {/* Колонка Ремонт */}
              <TableCell sx={{ border: '1px solid #000', fontSize: '12px', verticalAlign: 'top' }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Ориентировочная стоимость:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.preliminaryCost}+{Math.round(act.preliminaryCost * 0.1)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Аванс:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {Math.round(act.preliminaryCost * 0.3)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Ориентировочный срок ремонта:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Заявленные неисправности:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.problemDescription}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Условия */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontSize: '11px', mb: 2, fontWeight: 'bold' }}>
          Условия:
        </Typography>
        <Box sx={{ fontSize: '10px', lineHeight: 1.3 }}>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            1. Подписанием настоящего акта приема-передачи устройства клиент подтверждает, что ознакомлен и согласен с правилами и условиями проведения ремонтных работ, изложенными в публичной оферте сервисного центра, являющейся неотъемлемой частью настоящего договора.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            2. Установленные узлы или расходные материалы возврату не подлежат, согласно Перечню сложнотехнических товаров, не подлежащих обмену или возврату.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            3. Клиент согласен с тем, что гарантия производителя аннулируется после ремонта.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            4. Исполнитель не несет ответственности за возможную потерю информации на внутренних накопителях устройства, связанную с заменой узлов и компонентов.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            5. Исполнитель не несет ответственности за целостность гарантийных пломб сторонних сервисных центров и производителя устройства.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            6. Клиент принимает на себя риск, связанный с возможным проявлением при ремонте скрытых дефектов, присутствующих в устройстве на момент приема от клиента, которые не могут быть проверены и зафиксированы в настоящем документе (наличие следов коррозии, попадание влаги, инородные предметы, следы механических повреждений и другие непредусмотренные производителем вмешательства в устройство и его компоненты).
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            7. Ремонт и обслуживание проводятся в соответствии с требованиями нормативных документов, включая ГОСТ 12.2006-87 п.п. 9.1, ГОСТ Р 50377-92 п.п. 2.1.4, ГОСТ Р 50936-96, ГОСТ Р 50938-96 и согласно Федеральному закону "О защите прав потребителей".
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            8. Устройство клиента принимается без разборки и выявления внутренних неисправностей.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            9. Клиент согласен с тем, что при ремонте устройства могут быть заменены компоненты, узлы, модули, влияющие на идентификацию IMEI номера устройства.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 1 }}>
            10. Факт возврата устройства из ремонта фиксируется в форме БО-17, которую Исполнитель заполняет в двух экземплярах при возврате владельцу устройства.
          </Typography>
        </Box>
      </Box>

      {/* Подписи */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        mt: 4,
        '@media print': {
          marginTop: '30px',
        }
      }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', mb: 1 }}>
            С условиями ознакомлен и согласен, устройство в указанном состоянии и работоспособности передал:
          </Typography>
          <Box sx={{ 
            height: 40, 
            borderBottom: '1px solid #000', 
            mb: 1,
            '@media print': {
              height: '50px',
            }
          }}>
            {/* Место для подписи клиента */}
          </Box>
          <Typography variant="caption" sx={{ fontSize: '10px', textAlign: 'center', display: 'block' }}>
            Подпись клиента
          </Typography>
        </Box>

        <Box sx={{ flex: 1, ml: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '11px', mb: 1 }}>
            Устройство в указанном состоянии и работоспособности принял:
          </Typography>
          <Box sx={{ 
            height: 40, 
            borderBottom: '1px solid #000', 
            mb: 1,
            '@media print': {
              height: '50px',
            }
          }}>
            {/* Место для подписи мастера */}
          </Box>
          <Typography variant="caption" sx={{ fontSize: '10px', textAlign: 'center', display: 'block' }}>
            Подпись исполнителя
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  const renderWorkCompletionAct = (act: WorkCompletionAct) => (
    <Box id="document-content" sx={{ 
      p: 3, 
      maxWidth: 800, 
      mx: 'auto',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: 1.4,
      '@media print': {
        maxWidth: 'none',
        margin: 0,
        padding: '10mm',
        fontSize: '11px',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
      }
    }}>
      {/* Заголовок документа */}
      <Box textAlign="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: '24px', mb: 1 }}>
          АКТ ВЫПОЛНЕННЫХ РАБОТ
        </Typography>
        <Typography variant="h6" sx={{ fontSize: '16px', mb: 1 }}>
          №{act.documentNumber}
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '14px' }}>
          от {act.completionDate.toLocaleDateString('ru-RU')}
        </Typography>
      </Box>

      {/* Информация о сервисном центре */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        mb: 3,
        '@media print': {
          justifyContent: 'flex-end',
        }
      }}>
        {/* Информация о сервисном центре */}
        <Box sx={{ textAlign: 'right', minWidth: '300px' }}>
          <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '14px', mb: 0.5 }}>
            Исполнитель NK Service
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            ИП Неклюдов А.А.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            ИНН: 263221164126
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            ОГРНИП: 324265100105224
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
            Тел. +7 (938) 309 18-77
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px' }}>
            Пн - Сб с 10:00 - 19:00, Вс с 12:00 - 19:00
          </Typography>
        </Box>
      </Box>

      {/* Основная таблица */}
      <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #000' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                border: '1px solid #000', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: '12px',
                width: '33%'
              }}>
                Клиент
              </TableCell>
              <TableCell sx={{ 
                border: '1px solid #000', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: '12px',
                width: '33%'
              }}>
                Устройство
              </TableCell>
              <TableCell sx={{ 
                border: '1px solid #000', 
                fontWeight: 'bold', 
                textAlign: 'center',
                fontSize: '12px',
                width: '33%'
              }}>
                Ремонт
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {/* Колонка Клиент */}
              <TableCell sx={{ border: '1px solid #000', fontSize: '12px', verticalAlign: 'top' }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    ФИО Клиента:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.client.firstName} {act.client.lastName}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Номер телефона клиента:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.client.phone}
                  </Typography>
                </Box>
              </TableCell>

              {/* Колонка Устройство */}
              <TableCell sx={{ border: '1px solid #000', fontSize: '12px', verticalAlign: 'top' }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Устройство:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.brand} {act.device.model}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Пароль:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    -
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Цвет:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.color || 'Черный'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    IMEI:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.imei || '-'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Комплектация:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    Отсутствует
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    S/N:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.device.serialNumber || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Рекомендации:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    Внешний вид устройства: {act.device.externalCondition || 'Потертости, Царапины'}
                  </Typography>
                </Box>
              </TableCell>

              {/* Колонка Ремонт */}
              <TableCell sx={{ border: '1px solid #000', fontSize: '12px', verticalAlign: 'top' }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Аванс:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {Math.round(act.totalCost * 0.3)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    Заявленные неисправности:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    {act.worksPerformed.map(work => work.name).join(', ')}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Условия гарантии */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontSize: '10px', lineHeight: 1.3 }}>
          Клиент согласен с тем что ипользование устройства без защитного аксессуара лишает гарантии на экран (дисплейный модуль, стекло) поскольку любое физическое воздействие кроме изложенных в инструкции по эксплуатации может служить причиной выхода из строя модуля за которые исполнитель не несет ответственность.
        </Typography>
      </Box>

      {/* Таблица выполненных работ */}
      <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #000' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '5%' }}>№</TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '40%' }}>Наименование работы</TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '15%' }}>Гарантия, дн.</TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '15%' }}>Цена, Р</TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '10%' }}>Скидка, Р</TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '10%' }}>Количество</TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', width: '15%' }}>Сумма, Р</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {act.worksPerformed.map((work, index) => (
              <TableRow key={work.id}>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{index + 1}</TableCell>
                <TableCell sx={{ border: '1px solid #000', fontSize: '11px' }}>{work.name}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{act.warrantyPeriod}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{work.cost}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>0</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{work.quantity}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{work.totalCost}</TableCell>
              </TableRow>
            ))}
            {act.partsUsed.map((part, index) => (
              <TableRow key={part.id}>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{act.worksPerformed.length + index + 1}</TableCell>
                <TableCell sx={{ border: '1px solid #000', fontSize: '11px' }}>{part.name}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{act.warrantyPeriod}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{part.unitPrice}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>0</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{part.quantity}</TableCell>
                <TableCell sx={{ border: '1px solid #000', textAlign: 'center', fontSize: '11px' }}>{part.totalPrice}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={6} sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'right', fontSize: '11px' }}>
                Сумма, Р
              </TableCell>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', textAlign: 'center', fontSize: '11px' }}>
                {act.totalCost}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Подписи */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mt: 4,
        '@media print': {
          marginTop: '30px',
        }
      }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 2, lineHeight: 1.3 }}>
            Подтверждаю, что исполнитель выполнил указанные работы, функционал согласно приложению 1 проверен. Претензий к внешнему виду и качеству работы не имею. Ознакомлен(а) с условиями гарантии, устройство принял(а) без замечаний.
          </Typography>
          <Box sx={{ 
            height: 40, 
            borderBottom: '1px solid #000', 
            mb: 1,
            '@media print': {
              height: '50px',
            }
          }}>
            {/* Место для подписи клиента */}
          </Box>
          <Typography variant="caption" sx={{ fontSize: '10px', textAlign: 'center', display: 'block' }}>
            Подпись клиента
          </Typography>
        </Box>

        <Box sx={{ flex: 1, ml: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '10px', mb: 2, lineHeight: 1.3 }}>
            Выполнил указанные в акте работы, передал устройство клиенту, подтверждая гарантию на выполненные работы в соответствии с условиями гарантии.
          </Typography>
          <Box sx={{ 
            height: 40, 
            borderBottom: '1px solid #000', 
            mb: 1,
            '@media print': {
              height: '50px',
            }
          }}>
            {/* Место для подписи мастера */}
          </Box>
          <Typography variant="caption" sx={{ fontSize: '10px', textAlign: 'center', display: 'block' }}>
            Подпись исполнителя
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ '@media print': { display: 'none' } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {documentType === 'acceptance' ? 'Акт приема-передачи' : 'Акт выполненных работ'}
          </Typography>
          <Box>
            <IconButton onClick={handlePrint} disabled={isPrinting} sx={{ mr: 1 }}>
              <Print />
            </IconButton>
            <IconButton onClick={onClose} sx={{ ml: 1 }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {documentType === 'acceptance' 
            ? renderAcceptanceAct(document as AcceptanceAct)
            : renderWorkCompletionAct(document as WorkCompletionAct)
          }
        </DialogContent>
        
        <DialogActions sx={{ '@media print': { display: 'none' } }}>
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      <SignaturePad
        open={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        onSave={handleSignatureSave}
        signerName={currentSignerRole === 'client' ? document.client.firstName + ' ' + document.client.lastName : 'Мастер'}
        signerRole={currentSignerRole}
      />
    </>
  );
};

export default DocumentGenerator;