import React from 'react';
import { Order, Client, Device } from '../../types';
import { getOrderStatedProblem } from '../../utils/orderProblemText';
import { getCompanyDisplayName } from '../../hooks/useCompanyName';
import { appSettingsService } from '../../services/appSettingsService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PrintDocumentsProps {
  order: Order;
  client: Client;
  device: Device;
  onClose: () => void;
}

const PrintDocuments: React.FC<PrintDocumentsProps> = ({ order, client, device, onClose }) => {
  const companyName = getCompanyDisplayName(appSettingsService.getSettings().business.companyName);
  // Проверяем валидность данных
  const validateData = () => {
    if (!order || !client || !device) {
      console.error('Отсутствуют обязательные данные для печати');
      return false;
    }
    return true;
  };

  const handlePrint = async () => {
    try {
      if (!validateData()) {
        alert('Ошибка: отсутствуют данные для печати документа');
        return;
      }

      // Получаем элемент для конвертации
      const element = document.querySelector('.print-container') as HTMLElement;
      
      if (!element) {
        alert('Не удалось найти содержимое для создания PDF');
        return;
      }

      // Создаем canvas из HTML элемента
      const canvas = await html2canvas(element, {
        scale: 2, // Увеличиваем качество
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Получаем размеры
      const imgWidth = 210; // A4 ширина в мм
      const pageHeight = 295; // A4 высота в мм
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Создаем PDF документ
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Добавляем первую страницу
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Добавляем дополнительные страницы если нужно
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Получаем PDF как base64 строку
      const pdfDataUri = pdf.output('datauristring');
      
      // Открываем PDF в новом окне для печати
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        alert('Не удалось открыть окно для печати. Проверьте блокировщик всплывающих окон.');
        return;
      }

      // Создаем HTML страницу с PDF
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Печать документа</title>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            iframe {
              width: 100%;
              height: 100vh;
              border: none;
            }
          </style>
        </head>
        <body>
          <iframe src="${pdfDataUri}" type="application/pdf"></iframe>
        </body>
        </html>
      `);

      printWindow.document.close();

      // Ждем загрузки и автоматически печатаем
      setTimeout(() => {
        try {
          printWindow.print();
          
          // Закрываем окно после печати (с небольшой задержкой)
          setTimeout(() => {
            printWindow.close();
          }, 2000);
          
        } catch (error) {
          console.error('Ошибка при печати PDF:', error);
          alert('Ошибка при печати PDF. Попробуйте использовать другой принтер.');
          printWindow.close();
        }
      }, 1500);

    } catch (error) {
      console.error('Общая ошибка при печати:', error);
      alert('Произошла ошибка при создании PDF для печати. Попробуйте другой метод.');
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Проверяем валидность даты
      if (isNaN(dateObj.getTime())) {
        return 'Дата не указана';
      }

      return dateObj.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Дата не указана';
    }
  };


  // Если данные невалидны, показываем сообщение об ошибке
  if (!validateData()) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3 style={{ color: '#f44336' }}>Ошибка загрузки данных</h3>
        <p>Не удалось загрузить данные для печати документа.</p>
        <button 
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <div className="print-container">
      <style>{`
        .print-container {
          font-family: Arial, sans-serif;
          width: 100%;
          margin: 0;
          padding: 20px;
          background: white;
          color: black;
          line-height: 1.3;
          box-sizing: border-box;
        }
        
        .print-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .print-button {
          padding: 10px 20px;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .print-button:hover {
          background-color: #1565c0;
        }
        
        .close-button {
          padding: 10px 20px;
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .close-button:hover {
          background-color: #d32f2f;
        }
        
        /* Стили для печати */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print-buttons {
            display: none !important;
          }
          
          .print-container {
            margin: 0 !important;
            padding: 15mm !important;
            font-size: 12px !important;
            width: 100% !important;
            max-width: none !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          @page {
            margin: 15mm !important;
            size: A4 !important;
          }
          
          /* Убираем разрывы страниц внутри таблиц */
          table {
            page-break-inside: avoid;
          }
          
          /* Убираем разрывы страниц внутри блоков */
          .info-section {
            page-break-inside: avoid;
          }
        }
        
        /* Дополнительные стили для лучшего отображения */
        .info-section {
          margin-bottom: 15px;
        }
        
        .info-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          text-align: center;
          background-color: #f0f0f0;
          padding: 5px;
          border: 1px solid #000;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          padding: 2px 0;
        }
        
        .info-label {
          font-weight: bold;
          min-width: 120px;
        }
        
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          border: 1px solid #000;
        }
        
        .parts-table th,
        .parts-table td {
          border: 1px solid #000;
          padding: 5px;
          text-align: left;
        }
        
        .parts-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        
        .total-cost {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 15px;
          text-align: right;
        }
      `}</style>

      <div className="print-buttons">
        <button className="print-button" onClick={handlePrint}>
          🖨️ Печать документа
        </button>
        <button className="close-button" onClick={onClose}>
          ❌ Закрыть
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#e8f5e8', 
        border: '1px solid #4caf50', 
        borderRadius: '4px', 
        padding: '10px', 
        marginBottom: '15px',
        fontSize: '12px'
      }}>
        <strong>💡 Информация:</strong> При нажатии "Печать документа" автоматически создается PDF файл и отправляется на печать. Это решает проблемы с ошибками печати.
      </div>

      <div className="print-container">
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
          <h1 style={{ fontSize: '20px', margin: '0 0 5px 0' }}>{companyName}</h1>
          <p style={{ fontSize: '12px', margin: '0 0 8px 0' }}>Сервисный центр по ремонту техники</p>
          <h2 style={{ fontSize: '16px', margin: '0 0 6px 0' }}>
                {order.status === 'completed' ? 'АКТ ВЫПОЛНЕННЫХ РАБОТ' : 'АКТ ПРИЕМА-ПЕРЕДАЧИ УСТРОЙСТВА В РЕМОНТ'}
          </h2>
          <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>
                {order.status === 'completed' ? `№${order.orderNumber.replace('#', '')}` : `№${order.orderNumber.replace('#', '')}`}
          </p>
          <p style={{ fontSize: '10px', margin: '0' }}>
                {order.status === 'completed' ? 'от Дата закрытия заказа:' : 'Дата создания заказа:'} {formatDate(order.createdAt)}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '2px solid #000' }}>
          <tr>
            <td style={{ border: '1px solid #000', padding: '10px', verticalAlign: 'top', width: '33%' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', textAlign: 'center', backgroundColor: '#f0f0f0', padding: '5px' }}>КЛИЕНТ</h3>
              <p><strong>ФИО:</strong> {client.firstName} {client.lastName}</p>
              <p><strong>Телефон:</strong> {client.phone}</p>
              {client.email && <p><strong>Email:</strong> {client.email}</p>}
              {client.address && <p><strong>Адрес:</strong> {client.address}</p>}
              <p><strong>Комплектация:</strong> Отсутствует</p>
              <p><strong>Заметки:</strong> {client.notes || 'Устройство у клиента'}</p>
            </td>
            <td style={{ border: '1px solid #000', padding: '10px', verticalAlign: 'top', width: '33%' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', textAlign: 'center', backgroundColor: '#f0f0f0', padding: '5px' }}>УСТРОЙСТВО</h3>
              <p><strong>Тип:</strong> {device.type === 'phone' ? 'Телефон' : device.type === 'tablet' ? 'Планшет' : device.type === 'laptop' ? 'Ноутбук' : device.type === 'desktop' ? 'Компьютер' : 'Другое'}</p>
              <p><strong>Бренд и модель:</strong> {device.brand} {device.model}</p>
              <p><strong>Цвет:</strong> {device.color || 'Черный'}</p>
              <p><strong>пароль:</strong> {device.password || '-'}</p>
              <p><strong>IMEI:</strong> {device.imei || '-'}</p>
              <p><strong>S/N:</strong> {device.serialNumber || '-'}</p>
              <p><strong>Состояние:</strong> {device.condition === 'excellent' ? 'Отличное' : device.condition === 'good' ? 'Хорошее' : device.condition === 'fair' ? 'Удовлетворительное' : 'Плохое'}</p>
              <p><strong>Внешний вид:</strong> {device.externalCondition || 'Потертости, Царапины'}</p>
            </td>
            <td style={{ border: '1px solid #000', padding: '10px', verticalAlign: 'top', width: '33%' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', textAlign: 'center', backgroundColor: '#f0f0f0', padding: '5px' }}>РЕМОНТ</h3>
              <p><strong>Статус:</strong> {order.status === 'diagnosis' ? 'Диагностика' : order.status === 'waiting_parts' ? 'Ждет запчасть' : order.status === 'waiting_client' ? 'Ждет клиента' : order.status === 'in_progress' ? 'В работе' : order.status === 'completed' ? 'Завершен' : 'Отменен'}</p>
              <p><strong>Приоритет:</strong> {order.priority === 'low' ? 'Низкий' : order.priority === 'medium' ? 'Средний' : order.priority === 'high' ? 'Высокий' : 'Срочный'}</p>
              <p><strong>Ориентировочная стоимость:</strong> ₽{order.estimatedCost.toLocaleString()}</p>
              {order.finalCost && <p><strong>Итоговая стоимость:</strong> ₽{order.finalCost.toLocaleString()}</p>}
              <p><strong>Аванс:</strong> ₽{order.payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
              <p><strong>Ориентировочный срок:</strong> {order.estimatedDays ? `${order.estimatedDays} дней` : 'Не указан'}</p>
              <p><strong>Заявленные неисправности:</strong> {getOrderStatedProblem(order) || '—'}</p>
              {order.diagnosis && <p><strong>Диагностика:</strong> {order.diagnosis}</p>}
            </td>
          </tr>
        </table>

        <div className="info-section">
          <div className="info-title">ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ</div>
          <div className="info-row">
            <span className="info-label">Тип:</span>
            <span>{device.type === 'phone' ? 'Телефон' : 
                   device.type === 'tablet' ? 'Планшет' :
                   device.type === 'laptop' ? 'Ноутбук' :
                   device.type === 'desktop' ? 'Компьютер' : 'Другое'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Бренд:</span>
            <span>{device.brand}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Модель:</span>
            <span>{device.model}</span>
          </div>
          {device.serialNumber && (
            <div className="info-row">
              <span className="info-label">Серийный номер:</span>
              <span>{device.serialNumber}</span>
            </div>
          )}
          {device.imei && (
            <div className="info-row">
              <span className="info-label">IMEI:</span>
              <span>{device.imei}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Состояние:</span>
            <span>{device.condition === 'excellent' ? 'Отличное' :
                   device.condition === 'good' ? 'Хорошее' :
                   device.condition === 'fair' ? 'Удовлетворительное' : 'Плохое'}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px', fontSize: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Условия гарантии:</div>
          <div style={{ lineHeight: '1.3' }}>
            Клиент согласен с тем что использование устройства без защитного аксессуара лишает гарантии на экран (дисплейный модуль, стекло) поскольку любое физическое воздействие кроме изложенных в инструкции по эксплуатации может служить причиной выхода из строя модуля за которые исполнитель не несет ответственность.
          </div>
        </div>

        {/* Таблица работ для акта выполненных работ */}
        {order.status === 'completed' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 'bold', 
              marginBottom: '10px',
              textAlign: 'center',
              backgroundColor: '#f0f0f0',
              padding: '5px',
              border: '1px solid #000'
            }}>
              ТАБЛИЦА ВЫПОЛНЕННЫХ РАБОТ
            </div>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              border: '2px solid #000',
              fontSize: '10px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>№</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Наименование работы</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Гарантия, дн.</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Цена, Р</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Скидка, Р</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Количество</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Сумма, Р</th>
                </tr>
              </thead>
              <tbody>
                {order.parts && order.parts.length > 0 ? (
                  order.parts.map((part, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '5px' }}>Запчасть {part.partId}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>90</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>₽{part.unitPrice.toLocaleString()}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>₽0</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{part.quantity}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>₽{part.totalPrice.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>Диагностика и ремонт</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>90</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>₽{order.estimatedCost.toLocaleString()}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>₽0</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>₽{order.estimatedCost.toLocaleString()}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                  <td colSpan={6} style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>Сумма, Р</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                    ₽{(order.finalCost || order.estimatedCost).toLocaleString()}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                  <td colSpan={6} style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>Сумма позиций</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                    ₽{(order.finalCost || order.estimatedCost).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {order.parts && order.parts.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <div className="info-title">ИСПОЛЬЗОВАННЫЕ ЗАПЧАСТИ</div>
            <table className="parts-table">
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Количество</th>
                  <th>Цена за единицу</th>
                  <th>Общая стоимость</th>
                </tr>
              </thead>
              <tbody>
                {order.parts.map((part, index) => (
                  <tr key={index}>
                    <td>Запчасть {part.partId}</td>
                    <td>{part.quantity}</td>
                    <td>₽{part.unitPrice.toLocaleString()}</td>
                    <td>₽{part.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="total-cost">
          <div>Предварительная стоимость: ₽{order.estimatedCost.toLocaleString()}</div>
          {order.finalCost && order.finalCost > 0 && (
            <div>Итоговая стоимость: ₽{order.finalCost.toLocaleString()}</div>
          )}
        </div>

        <div style={{ marginTop: '20px', fontSize: '9px', lineHeight: '1.2' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', fontSize: '11px' }}>УСЛОВИЯ И СОГЛАШЕНИЯ</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <div style={{ marginBottom: '5px' }}>
                <strong>1.</strong> Подписывая данный акт приема-передачи устройства клиент подтверждает, что ознакомлен и согласен с правилами и условиями проведения ремонтных работ, изложенными в публичной оферте сервисного центра, которая является неотъемлемой частью данного договора;
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>2.</strong> Установленные узлы или расходные материалы возврату не подлежат, согласно Перечню сложных технических товаров, не подлежащих обмену или возврату:
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>3.</strong> Клиент согласен с тем, что гарантия от производителя после произведенного ремонта недействительна;
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>4.</strong> Исполнитель не несет ответственности за возможную потерю информации на внутренних носителях устройства, связанную с заменой узлов и компонентов;
                </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>5.</strong> Исполнитель не несет ответственности за сохранность гарантийных пломб сторонних сервисных центров и производителя устройства;
              </div>
              </div>
              
            <div>
              <div style={{ marginBottom: '5px' }}>
                <strong>6.</strong> Клиент принимает на себя риск, связанный с возможным проявлением при ремонте скрытых дефектов, имеющихся в устройстве на момент приемки от клиента, которые невозможно проверить и зафиксировать в данном документе (наличие следов коррозии, попадание влаги, посторонних предметов, следов механических повреждений и прочих непредусмотренных производителем вмешательств в устройство и его компоненты):
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>7.</strong> Ремонт и обслуживание осуществляется в соответствии с требованиями нормативных документов, в том числе ГОСТ 12.2006-87 п.п. 9.1, ГОСТ Р 50377-92 п.п. 2.1.4, ГОСТ Р 50936-96, ГОСТ Р 50938-96 и согласно Федеральному Закону "О защите прав потребителей";
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>8.</strong> Устройство клиента принимается без разбора и выявления внутренних неисправностей;
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>9.</strong> Клиент согласен с тем, что при ремонте устройства могут быть заменены компоненты, узлы, модули, влияющие на идентификацию IMEI номера устройства.
                </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>10.</strong> Факт возврата устройства из ремонта фиксируется в форме БО-17, которую Исполнитель заполняет в двух экземплярах при возврате устройства клиенту;
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '15px' }}>
            <div style={{ width: '45%' }}>
              <div style={{ marginBottom: '8px', fontSize: '9px' }}>
                С условиями ознакомлен и согласен, устройство в указанном состоянии и работоспособности передал:
              </div>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '4px', height: '18px' }}></div>
              <div style={{ textAlign: 'center', fontSize: '9px' }}>Подпись клиента</div>
            </div>
            
            <div style={{ width: '45%' }}>
              <div style={{ marginBottom: '8px', fontSize: '9px' }}>
                Устройство в указанном состоянии и работоспособности принял:
              </div>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '4px', height: '18px' }}></div>
              <div style={{ textAlign: 'center', fontSize: '9px' }}>Подпись исполнителя</div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '9px' }}>
            Дата: {new Date().toLocaleDateString('ru-RU')}
          </div>
        </div>


      </div>
    </div>
  );
};

export default PrintDocuments;
