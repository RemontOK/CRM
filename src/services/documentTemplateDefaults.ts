import { DocumentTemplate } from '../types';
import { removeDuplicateManualWorksTable } from './documentWorksTable';
import { migrateInlineClientDataTableTemplate, repairClientDataTableTemplate } from './documentClientDataTable';

const createTemplate = (
  id: string,
  name: string,
  type: DocumentTemplate['type'],
  category: DocumentTemplate['category'],
  description: string,
  template: string,
  variables: string[]
): DocumentTemplate => ({
  id,
  name,
  type,
  category,
  description,
  template,
  variables,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const DEFAULT_ACCEPTANCE_VARIABLES = [
  '{{НазваниеДокумента}}',
  '{{НазваниеКомпании}}',
  '{{ТелефонКомпании}}',
  '{{EmailКомпании}}',
  '{{АдресКомпании}}',
  '{{ЧасыРаботы}}',
  '{{НомерЗаказа}}',
  '{{ФИОКлиента}}',
  '{{ТелефонКлиента}}',
  '{{Устройство}}',
  '{{ОписаниеПроблемы}}',
  '{{ОриентировочнаяСтоимость}}',
  '{{Аванс}}',
  '{{Дата}}',
  '{{ДатаПриёма}}',
  '{{ДатаЗавершения}}',
  '{{Пароль}}',
  '{{Цвет}}',
  '{{IMEI}}',
  '{{СерийныйНомер}}',
  '{{Комплектация}}',
  '{{ВнешнийВид}}',
  '{{Заметки}}',
  '{{ТаблицаДанныхКлиента}}',
  '{{Рекомендации}}',
  '{{ТекстГарантии}}',
  '{{ТекстВПодвале}}',
];

export const DEFAULT_COMPLETION_VARIABLES = [
  '{{НазваниеДокумента}}',
  '{{НазваниеКомпании}}',
  '{{ТелефонКомпании}}',
  '{{EmailКомпании}}',
  '{{АдресКомпании}}',
  '{{ЧасыРаботы}}',
  '{{НомерЗаказа}}',
  '{{ФИОКлиента}}',
  '{{ТелефонКлиента}}',
  '{{Устройство}}',
  '{{ОписаниеПроблемы}}',
  '{{ТаблицаДанныхКлиента}}',
  '{{Работы}}',
  '{{Запчасти}}',
  '{{ТаблицаРабот}}',
  '{{ИтоговаяСтоимость}}',
  '{{Аванс}}',
  '{{Дата}}',
  '{{ДатаЗавершения}}',
  '{{Пароль}}',
  '{{Цвет}}',
  '{{IMEI}}',
  '{{СерийныйНомер}}',
  '{{Комплектация}}',
  '{{ВнешнийВид}}',
  '{{Рекомендации}}',
  '{{ТекстГарантии}}',
  '{{ТекстВПодвале}}',
];

export const SIMPLE_ACCEPTANCE_TEMPLATE =
  '<h1>{{НазваниеДокумента}}</h1><p><strong>Номер заказа:</strong> {{НомерЗаказа}}</p><p><strong>Клиент:</strong> {{ФИОКлиента}}</p><p><strong>Телефон:</strong> {{ТелефонКлиента}}</p><p><strong>Устройство:</strong> {{Устройство}}</p><p><strong>Описание:</strong> {{ОписаниеПроблемы}}</p><p><strong>Ориентировочная стоимость:</strong> {{ОриентировочнаяСтоимость}}</p><p><strong>Дата:</strong> {{Дата}}</p><p>{{ТекстГарантии}}</p>';

export const SIMPLE_COMPLETION_TEMPLATE =
  '<h1>{{НазваниеДокумента}}</h1><p><strong>Номер заказа:</strong> {{НомерЗаказа}}</p><p><strong>Клиент:</strong> {{ФИОКлиента}}</p><p><strong>Устройство:</strong> {{Устройство}}</p><p><strong>Работы:</strong> {{Работы}}</p><p><strong>Запчасти:</strong> {{Запчасти}}</p><p><strong>Итого:</strong> {{ИтоговаяСтоимость}}</p><p><strong>Дата:</strong> {{Дата}}</p><p>{{ТекстВПодвале}}</p>';

export const RICH_ACCEPTANCE_TEMPLATE = `
<div style="font-family: Arial, sans-serif; color:#111; width:100%; box-sizing:border-box; font-size:12px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
    <div style="width:130px;"></div>
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="font-size:20px; font-weight:700; margin-bottom:4px;">{{НазваниеДокумента}}</div>
      <div style="font-size:16px; margin-bottom:10px;">устройства в ремонт</div>
      <div style="font-size:18px; margin-bottom:8px;">№{{НомерЗаказа}}</div>
      <div style="font-size:16px;">{{Дата}}</div>
    </div>
    <div style="width:220px; font-size:12px; line-height:1.55; text-align:left;">
      <div style="font-weight:700;">{{НазваниеКомпании}}</div>
      <div>{{АдресКомпании}}</div>
      <div>Тел. {{ТелефонКомпании}}</div>
      <div>{{ЧасыРаботы}}</div>
      <div>{{EmailКомпании}}</div>
    </div>
  </div>

  {{ТаблицаДанныхКлиента}}

  <div style="display:grid; grid-template-columns:1fr 1fr; gap:22px; font-size:11px; line-height:1.55; margin-bottom:26px;">
    <div>1. Подписывая данный акт приема-передачи устройства, клиент подтверждает, что ознакомлен и согласен с правилами и условиями проведения ремонтных работ, изложенными в публичной оферте сервисного центра.</div>
    <div>6. Клиент принимает на себя риск, связанный с возможным проявлением при ремонте скрытых дефектов устройства, которые невозможно проверить и зафиксировать в момент приема.</div>
    <div>2. Установленные узлы или расходные материалы возврату не подлежат согласно перечню сложных технических товаров, не подлежащих обмену или возврату.</div>
    <div>7. Ремонт и обслуживание осуществляются в соответствии с требованиями действующих нормативных документов.</div>
    <div>3. Клиент согласен с тем, что гарантия производителя после произведенного ремонта недействительна.</div>
    <div>8. Устройство клиента принимается без разбора и выявления внутренних неисправностей.</div>
    <div>4. Исполнитель не несет ответственности за возможную потерю информации на внутренних носителях устройства, связанную с заменой узлов и компонентов.</div>
    <div>9. При ремонте устройства могут быть заменены компоненты, узлы и модули, влияющие на идентификацию IMEI устройства.</div>
    <div>5. Исполнитель не несет ответственности за сохранность гарантийных пломб сторонних сервисных центров и производителя устройства.</div>
    <div>10. {{ТекстГарантии}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; gap:24px; margin-top:28px;">
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:34px;">С условиями ознакомлен и согласен, устройство в указанном состоянии и работоспособности передал:</div>
      <div style="text-align:left; margin-top:12px;">{{Дата}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись клиента</div>
    </div>
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:34px;">Устройство в указанном состоянии и работоспособности принял:</div>
      <div style="text-align:left; margin-top:12px;">{{ДатаПриёма}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись исполнителя</div>
    </div>
  </div>

  <div style="font-size:10px; color:#555; margin-top:18px; text-align:center;">{{ТекстВПодвале}}</div>
</div>
`;

export const RICH_COMPLETION_TEMPLATE = `
<div style="font-family: Arial, sans-serif; color:#111; width:100%; box-sizing:border-box; font-size:12px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
    <div style="width:130px;"></div>
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="font-size:20px; font-weight:700; margin-bottom:10px;">{{НазваниеДокумента}}</div>
      <div style="font-size:18px; margin-bottom:8px;">№{{НомерЗаказа}}</div>
      <div style="font-size:16px;">от {{Дата}}</div>
    </div>
    <div style="width:220px; font-size:12px; line-height:1.55; text-align:left;">
      <div style="font-weight:700;">{{НазваниеКомпании}}</div>
      <div>{{АдресКомпании}}</div>
      <div>Тел. {{ТелефонКомпании}}</div>
      <div>{{ЧасыРаботы}}</div>
      <div>{{EmailКомпании}}</div>
    </div>
  </div>

  {{ТаблицаДанныхКлиента}}

  {{ТаблицаРабот}}

  <div style="display:flex; justify-content:space-between; gap:24px; margin-top:20px;">
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:60px;">Подтверждаю, что исполнитель выполнил указанные работы, функционал согласно проверке проверен. Претензий к внешнему виду и качеству работы не имею.</div>
      <div style="text-align:left; margin-top:12px;">{{Дата}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись клиента</div>
    </div>
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:60px;">Выполнил указанные в акте работы, передал устройство клиенту, подтверждая гарантию на выполненные работы в соответствии с условиями гарантии.</div>
      <div style="text-align:left; margin-top:12px;">{{ДатаЗавершения}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись исполнителя</div>
    </div>
  </div>

  <div style="font-size:10px; color:#555; margin-top:18px; text-align:center;">{{ТекстВПодвале}}</div>
</div>
`;

const isAcceptanceTemplateBroken = (template: DocumentTemplate) =>
  template.id === 'tpl_acceptance_act' &&
  template.template.trim() === SIMPLE_ACCEPTANCE_TEMPLATE.trim();

const isCompletionTemplateBroken = (template: DocumentTemplate) =>
  template.id === 'tpl_completion_act' &&
  template.template.trim() === SIMPLE_COMPLETION_TEMPLATE.trim();

export const getBuiltInDocumentTemplates = (): DocumentTemplate[] => [
  createTemplate(
    'tpl_acceptance_act',
    'Акт приема-передачи',
    'acceptance',
    'orders',
    'Основной шаблон для приемки устройства.',
    RICH_ACCEPTANCE_TEMPLATE,
    DEFAULT_ACCEPTANCE_VARIABLES
  ),
  createTemplate(
    'tpl_completion_act',
    'Акт выполненных работ',
    'completion',
    'orders',
    'Основной шаблон для завершения заказа.',
    RICH_COMPLETION_TEMPLATE,
    DEFAULT_COMPLETION_VARIABLES
  ),
];

const hasLegacyNestedWorksTable = (html: string) =>
  html.includes('{{ТаблицаРабот}}') &&
  /<table[\s\S]*?<th[\s\S]*?>[\s\S]*?№[\s\S]*?<\/th>[\s\S]*?\{\{ТаблицаРабот\}\}/i.test(html);

export const migrateCompletionWorksTableTemplate = (html: string): string => {
  let result = html;
  if (hasLegacyNestedWorksTable(result)) {
    result = result.replace(/<table[\s\S]*?\{\{ТаблицаРабот\}\}[\s\S]*?<\/table>/i, '{{ТаблицаРабот}}');
  }
  result = removeDuplicateManualWorksTable(result);
  return repairClientDataTableTemplate(migrateInlineClientDataTableTemplate(result), 'completion');
};

const hasLegacyInlineClientDataTable = (html: string) =>
  /<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/i.test(
    html
  );

export const upgradeBuiltInDocumentTemplate = (template: DocumentTemplate): DocumentTemplate => {
  if (isAcceptanceTemplateBroken(template)) {
    return {
      ...template,
      name: 'Акт приема-передачи',
      description: 'Основной шаблон для приемки устройства.',
      template: RICH_ACCEPTANCE_TEMPLATE,
      variables: DEFAULT_ACCEPTANCE_VARIABLES,
      updatedAt: new Date(),
    };
  }

  if (isCompletionTemplateBroken(template)) {
    return {
      ...template,
      name: 'Акт выполненных работ',
      description: 'Основной шаблон для завершения заказа.',
      template: RICH_COMPLETION_TEMPLATE,
      variables: DEFAULT_COMPLETION_VARIABLES,
      updatedAt: new Date(),
    };
  }

  if (template.type === 'completion') {
    const migratedTemplate = migrateCompletionWorksTableTemplate(template.template);
    if (migratedTemplate !== template.template) {
      return {
        ...template,
        template: migratedTemplate,
        updatedAt: new Date(),
      };
    }

    const repairedTemplate = repairClientDataTableTemplate(template.template, 'completion');
    if (repairedTemplate !== template.template) {
      return {
        ...template,
        template: repairedTemplate,
        updatedAt: new Date(),
      };
    }
  }

  if (template.type === 'acceptance') {
    const migratedTemplate = repairClientDataTableTemplate(migrateInlineClientDataTableTemplate(template.template), 'acceptance');
    if (migratedTemplate !== template.template) {
      return {
        ...template,
        template: migratedTemplate,
        updatedAt: new Date(),
      };
    }
  }

  return template;
};

export const hasLegacyDocumentTemplates = (templates?: Array<Partial<DocumentTemplate>>) =>
  Boolean(
    templates?.some((template) => {
      const normalized = {
        id: template.id || '',
        name: template.name || '',
        type: (template.type as DocumentTemplate['type']) || 'custom',
        category: (template.category as DocumentTemplate['category']) || 'other',
        description: template.description || '',
        template: template.template || '',
        variables: template.variables || [],
        isActive: template.isActive ?? true,
        createdAt: new Date(template.createdAt || new Date()),
        updatedAt: new Date(template.updatedAt || new Date()),
      };

      return (
        isAcceptanceTemplateBroken(normalized) ||
        isCompletionTemplateBroken(normalized) ||
        (normalized.type === 'completion' &&
          (hasLegacyNestedWorksTable(normalized.template) ||
            (normalized.template.includes('{{ТаблицаРабот}}') &&
              /<table[\s\S]*?Наименование работы[\s\S]*?<\/table>/i.test(normalized.template)))) ||
        ((normalized.type === 'acceptance' || normalized.type === 'completion') &&
          hasLegacyInlineClientDataTable(normalized.template))
      );
    })
  );
