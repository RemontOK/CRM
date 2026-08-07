export type SmsProviderId = 'none' | 'moizvonki' | 'smsru' | 'smsc' | 'smsaero' | 'webhook';

export interface SmsProviderField {
  key: string;
  label: string;
  type?: 'text' | 'password';
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}

export interface SmsProviderDefinition {
  id: Exclude<SmsProviderId, 'none'>;
  name: string;
  description: string;
  docsUrl?: string;
  fields: SmsProviderField[];
}

export const SMS_PROVIDERS: SmsProviderDefinition[] = [
  {
    id: 'moizvonki',
    name: 'Мои Звонки',
    description: 'SMS с телефона через приложение',
    docsUrl: 'https://www.moizvonki.ru/guide/api/',
    fields: [
      {
        key: 'domain',
        label: 'Адрес API',
        required: true,
        placeholder: 'example.moizvonki.ru',
        helperText: 'Из личного кабинета: Настройки → Интеграция',
      },
      {
        key: 'userName',
        label: 'Email (логин)',
        required: true,
        placeholder: 'user@mail.ru',
      },
      {
        key: 'apiKey',
        label: 'API-ключ',
        type: 'password',
        required: true,
        helperText: 'Настройки → Интеграция в личном кабинете Мои Звонки',
      },
    ],
  },
  {
    id: 'smsru',
    name: 'SMS.ru',
    description: 'Российский шлюз. API ID из кабинета sms.ru.',
    docsUrl: 'https://sms.ru/api',
    fields: [
      { key: 'apiId', label: 'API ID', required: true, placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' },
      { key: 'senderName', label: 'Имя отправителя', placeholder: 'Мой сервис', helperText: 'Если не указано — используется имя из настроек CRM' },
    ],
  },
  {
    id: 'smsc',
    name: 'SMSC.ru',
    description: 'Шлюз SMSC. Логин и пароль от аккаунта.',
    docsUrl: 'https://smsc.ru/api/',
    fields: [
      { key: 'login', label: 'Логин', required: true },
      { key: 'password', label: 'Пароль', type: 'password', required: true },
      { key: 'senderName', label: 'Имя отправителя', placeholder: 'Мой сервис' },
    ],
  },
  {
    id: 'smsaero',
    name: 'SMS Aero',
    description: 'Email и API-ключ из личного кабинета.',
    docsUrl: 'https://smsaero.ru/integration/documentation/api/',
    fields: [
      { key: 'email', label: 'Email аккаунта', required: true },
      { key: 'apiKey', label: 'API-ключ', type: 'password', required: true },
      { key: 'senderName', label: 'Подпись отправителя', required: true, placeholder: 'MYSERVICE' },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Свой URL для Zapier, n8n или вашего сервера.',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        required: true,
        placeholder: 'https://example.com/sms',
        helperText: 'Обязательно с https://. Для Мои Звонки выберите провайдера «Мои Звонки», не webhook.',
      },
      { key: 'webhookToken', label: 'API токен (необязательно)', type: 'password' },
      {
        key: 'webhookMethod',
        label: 'Метод',
        placeholder: 'POST',
        helperText: 'POST или GET',
      },
    ],
  },
];

export const getSmsProviderDefinition = (id: SmsProviderId) =>
  SMS_PROVIDERS.find((provider) => provider.id === id) || null;
