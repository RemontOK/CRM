import { DocumentTemplate } from '../types';

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
  '{{documentTitle}}',
  '{{companyName}}',
  '{{companyPhone}}',
  '{{companyEmail}}',
  '{{companyAddress}}',
  '{{workingHours}}',
  '{{orderNumber}}',
  '{{clientName}}',
  '{{clientPhone}}',
  '{{device}}',
  '{{problemDescription}}',
  '{{estimatedCost}}',
  '{{advancePayment}}',
  '{{date}}',
  '{{acceptedAt}}',
  '{{completedAt}}',
  '{{password}}',
  '{{color}}',
  '{{imei}}',
  '{{serialNumber}}',
  '{{completeness}}',
  '{{appearance}}',
  '{{notes}}',
  '{{recommendations}}',
  '{{warrantyText}}',
  '{{footerDisclaimer}}',
];

export const DEFAULT_COMPLETION_VARIABLES = [
  '{{documentTitle}}',
  '{{companyName}}',
  '{{companyPhone}}',
  '{{companyEmail}}',
  '{{companyAddress}}',
  '{{workingHours}}',
  '{{orderNumber}}',
  '{{clientName}}',
  '{{clientPhone}}',
  '{{device}}',
  '{{problemDescription}}',
  '{{works}}',
  '{{parts}}',
  '{{worksTableRows}}',
  '{{totalCost}}',
  '{{advancePayment}}',
  '{{date}}',
  '{{completedAt}}',
  '{{password}}',
  '{{color}}',
  '{{imei}}',
  '{{serialNumber}}',
  '{{completeness}}',
  '{{appearance}}',
  '{{recommendations}}',
  '{{warrantyText}}',
  '{{footerDisclaimer}}',
];

export const SIMPLE_ACCEPTANCE_TEMPLATE =
  '<h1>{{documentTitle}}</h1><p><strong>Номер заказа:</strong> {{orderNumber}}</p><p><strong>Клиент:</strong> {{clientName}}</p><p><strong>Телефон:</strong> {{clientPhone}}</p><p><strong>Устройство:</strong> {{device}}</p><p><strong>Описание:</strong> {{problemDescription}}</p><p><strong>Ориентировочная стоимость:</strong> {{estimatedCost}}</p><p><strong>Дата:</strong> {{date}}</p><p>{{warrantyText}}</p>';

export const SIMPLE_COMPLETION_TEMPLATE =
  '<h1>{{documentTitle}}</h1><p><strong>Номер заказа:</strong> {{orderNumber}}</p><p><strong>Клиент:</strong> {{clientName}}</p><p><strong>Устройство:</strong> {{device}}</p><p><strong>Работы:</strong> {{works}}</p><p><strong>Запчасти:</strong> {{parts}}</p><p><strong>Итого:</strong> {{totalCost}}</p><p><strong>Дата:</strong> {{date}}</p><p>{{footerDisclaimer}}</p>';

export const RICH_ACCEPTANCE_TEMPLATE = `
<div style="font-family: Arial, sans-serif; color:#111; width:100%; box-sizing:border-box; font-size:12px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
    <div style="width:130px;"></div>
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="font-size:20px; font-weight:700; margin-bottom:4px;">{{documentTitle}}</div>
      <div style="font-size:16px; margin-bottom:10px;">устройства в ремонт</div>
      <div style="font-size:18px; margin-bottom:8px;">№{{orderNumber}}</div>
      <div style="font-size:16px;">{{date}}</div>
    </div>
    <div style="width:220px; font-size:12px; line-height:1.55; text-align:left;">
      <div style="font-weight:700;">{{companyName}}</div>
      <div>{{companyAddress}}</div>
      <div>Тел. {{companyPhone}}</div>
      <div>{{workingHours}}</div>
      <div>{{companyEmail}}</div>
    </div>
  </div>

  <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:18px;">
    <tr>
      <th style="border:1px solid #8da0a6; padding:10px; font-size:14px;">Клиент</th>
      <th style="border:1px solid #8da0a6; padding:10px; font-size:14px;">Устройство</th>
      <th style="border:1px solid #8da0a6; padding:10px; font-size:14px;">Ремонт</th>
    </tr>
    <tr>
      <td style="border:1px solid #8da0a6; padding:8px; vertical-align:top;">
        <div><strong>ФИО клиента:</strong><br>{{clientName}}</div>
        <div style="margin-top:8px;"><strong>Номер телефона клиента:</strong><br>{{clientPhone}}</div>
        <div style="margin-top:8px;"><strong>Комплектация:</strong><br>{{completeness}}</div>
        <div style="margin-top:8px;"><strong>Заметки:</strong><br>{{notes}}</div>
      </td>
      <td style="border:1px solid #8da0a6; padding:8px; vertical-align:top;">
        <div><strong>Устройство:</strong><br>{{device}}</div>
        <div style="margin-top:8px;"><strong>Пароль:</strong><br>{{password}}</div>
        <div style="margin-top:8px;"><strong>Цвет:</strong><br>{{color}}</div>
        <div style="margin-top:8px;"><strong>IMEI:</strong><br>{{imei}}</div>
        <div style="margin-top:8px;"><strong>S/N:</strong><br>{{serialNumber}}</div>
        <div style="margin-top:8px;"><strong>Внешний вид устройства:</strong><br>{{appearance}}</div>
      </td>
      <td style="border:1px solid #8da0a6; padding:8px; vertical-align:top;">
        <div><strong>Ориентировочная стоимость:</strong><br>{{estimatedCost}}</div>
        <div style="margin-top:8px;"><strong>Аванс:</strong><br>{{advancePayment}}</div>
        <div style="margin-top:8px;"><strong>Ориентировочный срок ремонта:</strong><br>{{completedAt}}</div>
        <div style="margin-top:8px;"><strong>Заявленные неисправности:</strong><br>{{problemDescription}}</div>
      </td>
    </tr>
  </table>

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
    <div>10. {{warrantyText}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; gap:24px; margin-top:28px;">
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:34px;">С условиями ознакомлен и согласен, устройство в указанном состоянии и работоспособности передал:</div>
      <div style="text-align:left; margin-top:12px;">{{date}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись клиента</div>
    </div>
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:34px;">Устройство в указанном состоянии и работоспособности принял:</div>
      <div style="text-align:left; margin-top:12px;">{{acceptedAt}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись исполнителя</div>
    </div>
  </div>

  <div style="font-size:10px; color:#555; margin-top:18px; text-align:center;">{{footerDisclaimer}}</div>
</div>
`;

export const RICH_COMPLETION_TEMPLATE = `
<div style="font-family: Arial, sans-serif; color:#111; width:100%; box-sizing:border-box; font-size:12px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
    <div style="width:130px;"></div>
    <div style="flex:1; text-align:center; padding:0 16px;">
      <div style="font-size:20px; font-weight:700; margin-bottom:10px;">{{documentTitle}}</div>
      <div style="font-size:18px; margin-bottom:8px;">№{{orderNumber}}</div>
      <div style="font-size:16px;">от {{date}}</div>
    </div>
    <div style="width:220px; font-size:12px; line-height:1.55; text-align:left;">
      <div style="font-weight:700;">{{companyName}}</div>
      <div>{{companyAddress}}</div>
      <div>Тел. {{companyPhone}}</div>
      <div>{{workingHours}}</div>
      <div>{{companyEmail}}</div>
    </div>
  </div>

  <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:16px;">
    <tr>
      <th style="border:1px solid #8da0a6; padding:10px; font-size:14px;">Клиент</th>
      <th style="border:1px solid #8da0a6; padding:10px; font-size:14px;">Устройство</th>
      <th style="border:1px solid #8da0a6; padding:10px; font-size:14px;">Ремонт</th>
    </tr>
    <tr>
      <td style="border:1px solid #8da0a6; padding:8px; vertical-align:top;">
        <div><strong>ФИО клиента:</strong><br>{{clientName}}</div>
        <div style="margin-top:8px;"><strong>Номер телефона клиента:</strong><br>{{clientPhone}}</div>
        <div style="margin-top:8px;"><strong>Комплектация:</strong><br>{{completeness}}</div>
      </td>
      <td style="border:1px solid #8da0a6; padding:8px; vertical-align:top;">
        <div><strong>Устройство:</strong><br>{{device}}</div>
        <div style="margin-top:8px;"><strong>Пароль:</strong><br>{{password}}</div>
        <div style="margin-top:8px;"><strong>Цвет:</strong><br>{{color}}</div>
        <div style="margin-top:8px;"><strong>IMEI:</strong><br>{{imei}}</div>
        <div style="margin-top:8px;"><strong>S/N:</strong><br>{{serialNumber}}</div>
        <div style="margin-top:8px;"><strong>Внешний вид устройства:</strong><br>{{appearance}}</div>
      </td>
      <td style="border:1px solid #8da0a6; padding:8px; vertical-align:top;">
        <div><strong>Аванс:</strong><br>{{advancePayment}}</div>
        <div style="margin-top:8px;"><strong>Заявленные неисправности:</strong><br>{{problemDescription}}</div>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="border:1px solid #8da0a6; padding:10px; font-size:12px;">
        <strong>Условия гарантии:</strong><br>{{warrantyText}}
      </td>
    </tr>
  </table>

  <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:28px;">
    <colgroup>
      <col style="width:36px;">
      <col>
      <col style="width:92px;">
      <col style="width:82px;">
      <col style="width:92px;">
      <col style="width:90px;">
    </colgroup>
    <tr>
      <th style="border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;">№</th>
      <th style="border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;">Наименование работы</th>
      <th style="border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;">Гарантия,<br>дн.</th>
      <th style="border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;">Цена, ₽</th>
      <th style="border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;">Количество</th>
      <th style="border:1px solid #8da0a6; padding:6px 5px; text-align:center; vertical-align:middle; line-height:1.2; font-size:11px;">Сумма, ₽</th>
    </tr>
    {{worksTableRows}}
    <tr>
      <td colspan="5" style="border:1px solid #8da0a6; padding:8px; text-align:right; font-weight:700;">Сумма, ₽</td>
      <td style="border:1px solid #8da0a6; padding:8px; text-align:right; font-weight:700;">{{totalCost}}</td>
    </tr>
  </table>

  <div style="display:flex; justify-content:space-between; gap:24px; margin-top:20px;">
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:60px;">Подтверждаю, что исполнитель выполнил указанные работы, функционал согласно проверке проверен. Претензий к внешнему виду и качеству работы не имею.</div>
      <div style="text-align:left; margin-top:12px;">{{date}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись клиента</div>
    </div>
    <div style="flex:1; text-align:center;">
      <div style="font-size:12px; min-height:60px;">Выполнил указанные в акте работы, передал устройство клиенту, подтверждая гарантию на выполненные работы в соответствии с условиями гарантии.</div>
      <div style="text-align:left; margin-top:12px;">{{completedAt}}</div>
      <div style="border-bottom:1px solid #111; margin-top:18px; height:28px;"></div>
      <div style="font-size:11px; margin-top:6px;">Подпись исполнителя</div>
    </div>
  </div>

  <div style="font-size:10px; color:#555; margin-top:18px; text-align:center;">{{footerDisclaimer}}</div>
</div>
`;

const hasMojibake = (value?: string) => /[РЀ-ӿ]/.test(value || '') && /Р/.test(value || '');

const isAcceptanceTemplateBroken = (template: DocumentTemplate) =>
  template.id === 'tpl_acceptance_act' &&
  (
    template.template.trim() === SIMPLE_ACCEPTANCE_TEMPLATE.trim() ||
    hasMojibake(template.template) ||
    !template.template.includes('<table') ||
    !template.template.includes('{{acceptedAt}}') ||
    template.template.includes('<strong>Рекомендации:</strong>')
  );

const isCompletionTemplateBroken = (template: DocumentTemplate) =>
  template.id === 'tpl_completion_act' &&
  (
    template.template.trim() === SIMPLE_COMPLETION_TEMPLATE.trim() ||
    hasMojibake(template.template) ||
    !template.template.includes('<table') ||
    !template.template.includes('{{worksTableRows}}') ||
    !template.template.includes('<colgroup>') ||
    template.template.includes('Скидка')
  );

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

      return isAcceptanceTemplateBroken(normalized) || isCompletionTemplateBroken(normalized);
    })
  );
