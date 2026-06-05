# NAK CRM API

Минимальный `PHP + MySQL` backend для `nakcrm.ru`.

## Что уже есть

- `bootstrap.php` — конфиг, PDO, JSON-ответы, bearer auth
- `index.php` — базовые маршруты API
- `.htaccess` — роутинг всех запросов в `index.php`
- `sql/schema.sql` — схема таблиц MySQL
- `config.local.php.example` — шаблон локального конфига

## Маршруты

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`
- `GET /api/devices`
- `POST /api/devices`
- `GET /api/devices/:id`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id`
- `PATCH /api/orders/:id/status`
- `POST /api/orders/:id/payments`
- `GET /api/inventory/parts`
- `POST /api/inventory/parts`
- `GET /api/inventory/parts/:id`
- `PUT /api/inventory/parts/:id`
- `POST /api/inventory/parts/:id/add-stock`
- `POST /api/inventory/parts/:id/deduct-stock`
- `GET /api/inventory/movements`
- `GET /api/cash/operations`
- `POST /api/cash/operations`
- `DELETE /api/cash/operations/:id`
- `GET /api/settings`
- `PUT /api/settings`

## Как развернуть на Timeweb

1. В phpMyAdmin выбери базу `cc060567_BD`.
2. Импортируй `api/sql/schema.sql`.
3. Залей папку `api/` на сайт так, чтобы она открывалась как `https://nakcrm.ru/api`.
4. Убедись, что рядом лежит `config.local.php`.
5. Открой `https://nakcrm.ru/api/health`.

Если все нормально, ответ будет JSON со статусом `ok`.

## Первый админ

После импорта таблиц выполни [sql/seed_admin.sql.example](D:/Yandex.Disk/PROJECT/CRM/api/sql/seed_admin.sql.example) в phpMyAdmin.

Перед выполнением:

1. Замени `admin@nakcrm.ru` на нужный логин, если хочешь другой.
2. Замени `CHANGE_ME_PASSWORD` на временный пароль администратора.

Важно:

- в текущем серверном каркасе логин принимает и `password_hash()`, и обычное текстовое значение в `password_hash`
- это сделано специально для быстрого первого запуска
- после первого входа лучше будет перейти на нормальные хэши паролей и убрать plaintext-режим
