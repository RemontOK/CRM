/** Старые английские плейсхолдеры → текущие русские токены шаблонов */
export const ENGLISH_TO_RUSSIAN_TOKEN_MAP: Record<string, string> = {
  '{{companyName}}': '{{НазваниеКомпании}}',
  '{{companyPhone}}': '{{ТелефонКомпании}}',
  '{{companyEmail}}': '{{EmailКомпании}}',
  '{{companyAddress}}': '{{АдресКомпании}}',
  '{{workingHours}}': '{{ЧасыРаботы}}',
  '{{documentTitle}}': '{{НазваниеДокумента}}',
  '{{orderNumber}}': '{{НомерЗаказа}}',
  '{{orderStatus}}': '{{СтатусЗаказа}}',
  '{{priority}}': '{{Приоритет}}',
  '{{estimatedCost}}': '{{ОриентировочнаяСтоимость}}',
  '{{totalCost}}': '{{ИтоговаяСтоимость}}',
  '{{advancePayment}}': '{{Аванс}}',
  '{{clientName}}': '{{ФИОКлиента}}',
  '{{clientPhone}}': '{{ТелефонКлиента}}',
  '{{clientEmail}}': '{{EmailКлиента}}',
  '{{clientAddress}}': '{{АдресКлиента}}',
  '{{device}}': '{{Устройство}}',
  '{{deviceBrand}}': '{{БрендУстройства}}',
  '{{deviceModel}}': '{{МодельУстройства}}',
  '{{color}}': '{{Цвет}}',
  '{{serialNumber}}': '{{СерийныйНомер}}',
  '{{imei}}': '{{IMEI}}',
  '{{password}}': '{{Пароль}}',
  '{{completeness}}': '{{Комплектация}}',
  '{{appearance}}': '{{ВнешнийВид}}',
  '{{problemDescription}}': '{{ОписаниеПроблемы}}',
  '{{diagnosis}}': '{{Диагностика}}',
  '{{works}}': '{{Работы}}',
  '{{worksTableRows}}': '{{ТаблицаРабот}}',
  '{{clientDataTable}}': '{{ТаблицаДанныхКлиента}}',
  '{{parts}}': '{{Запчасти}}',
  '{{discount}}': '{{Скидка}}',
  '{{paymentMethod}}': '{{СпособОплаты}}',
  '{{debt}}': '{{Долг}}',
  '{{technician}}': '{{Мастер}}',
  '{{intakeManager}}': '{{МенеджерПриёма}}',
  '{{deliveryManager}}': '{{МенеджерВыдачи}}',
  '{{date}}': '{{Дата}}',
  '{{createdAt}}': '{{ДатаСоздания}}',
  '{{completedAt}}': '{{ДатаЗавершения}}',
  '{{acceptedAt}}': '{{ДатаПриёма}}',
  '{{warrantyText}}': '{{ТекстГарантии}}',
  '{{customText}}': '{{ТекстГарантии}}',
  '{{footerDisclaimer}}': '{{ТекстВПодвале}}',
  '{{notes}}': '{{Заметки}}',
  '{{recommendations}}': '{{Рекомендации}}',
};

export const migrateEnglishTokens = (templateContent: string): string => {
  let result = templateContent;
  for (const [english, russian] of Object.entries(ENGLISH_TO_RUSSIAN_TOKEN_MAP)) {
    result = result.replaceAll(english, russian);
  }
  return result;
};

export const applyTemplateTokenValues = (template: string, values: Record<string, string>): string => {
  let result = migrateEnglishTokens(template);
  for (const [token, value] of Object.entries(values)) {
    result = result.replaceAll(token, value);
  }
  return result;
};
