# Timeweb API Specification

Цель: перевести CRM с `localStorage` на `PHP + MySQL` без ломки фронтенда и бизнес-процесса сервисного центра.

## Базовые сущности

- `users`
- `clients`
- `devices`
- `orders`
- `order_parts`
- `payments`
- `inventory_parts`
- `stock_movements`
- `cash_operations`
- `documents`
- `document_signatures`
- `order_communications`

## Статусы заказа

```text
diagnosis
waiting_parts
waiting_client
in_progress
completed
cancelled
pending
```

## Роли пользователей

```text
admin
manager
technician
cashier
```

## REST endpoints

### Auth

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### Employees

- `GET /users`
- `POST /users`
- `PUT /users/:id`

### Clients

- `GET /clients`
- `GET /clients/:id`
- `POST /clients`
- `PUT /clients/:id`
- `DELETE /clients/:id`

### Devices

- `GET /devices/:id`
- `POST /devices`
- `PUT /devices/:id`

### Orders

- `GET /orders`
- `GET /orders/:id`
- `POST /orders`
- `PUT /orders/:id`
- `PATCH /orders/:id/status`
- `POST /orders/:id/works`
- `POST /orders/:id/payments`
- `POST /orders/:id/communications`
- `POST /orders/:id/complete-delivery`

### Inventory

- `GET /inventory/parts`
- `GET /inventory/parts/:id`
- `POST /inventory/parts`
- `PUT /inventory/parts/:id`
- `POST /inventory/parts/:id/add-stock`
- `POST /inventory/parts/:id/deduct-stock`
- `GET /inventory/movements`

### Cash register

- `GET /cash/operations`
- `POST /cash/operations`
- `DELETE /cash/operations/:id`

### Documents

- `GET /documents`
- `GET /documents/:id`
- `POST /documents/acceptance`
- `POST /documents/completion`
- `POST /documents/:id/sign`

## Example payloads

### POST /orders

```json
{
  "clientId": "12",
  "device": {
    "type": "phone",
    "brand": "Apple",
    "model": "iPhone 15 Pro Max",
    "serialNumber": "ABC123",
    "imei": "123456789012345",
    "color": "Черный",
    "condition": "good",
    "externalCondition": "Потертости"
  },
  "order": {
    "description": "Не заряжается",
    "diagnosis": "Проблема с нижним шлейфом",
    "priority": "high",
    "estimatedCost": 8500,
    "estimatedDays": 2,
    "technicianId": "3",
    "intakeManagerId": "2",
    "deliveryManagerId": "2"
  }
}
```

### POST /orders/:id/payments

```json
{
  "amount": 8500,
  "method": "card",
  "notes": "Полная оплата при выдаче"
}
```

### POST /inventory/parts/:id/deduct-stock

```json
{
  "quantity": 1,
  "reason": "Списание в заказ #000021: Замена экрана",
  "orderId": "21",
  "processedBy": "Менеджер"
}
```

## Минимальная схема MySQL

### users

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
email VARCHAR(255) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL,
name VARCHAR(255) NOT NULL,
role ENUM('admin','manager','technician','cashier') NOT NULL,
phone VARCHAR(32) NULL,
is_active TINYINT(1) NOT NULL DEFAULT 1,
created_at DATETIME NOT NULL,
updated_at DATETIME NOT NULL
```

### clients

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
first_name VARCHAR(120) NOT NULL,
last_name VARCHAR(120) NOT NULL,
phone VARCHAR(32) NOT NULL,
email VARCHAR(255) NULL,
address TEXT NULL,
notes TEXT NULL,
created_at DATETIME NOT NULL,
updated_at DATETIME NOT NULL
```

### devices

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
client_id BIGINT NOT NULL,
type VARCHAR(32) NOT NULL,
brand VARCHAR(120) NOT NULL,
model VARCHAR(120) NOT NULL,
serial_number VARCHAR(120) NULL,
imei VARCHAR(120) NULL,
color VARCHAR(64) NULL,
device_condition VARCHAR(32) NOT NULL,
external_condition TEXT NULL,
created_at DATETIME NOT NULL
```

### orders

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
order_number VARCHAR(32) NOT NULL UNIQUE,
client_id BIGINT NOT NULL,
device_id BIGINT NOT NULL,
technician_id BIGINT NULL,
intake_manager_id BIGINT NULL,
delivery_manager_id BIGINT NULL,
status VARCHAR(32) NOT NULL,
priority VARCHAR(32) NOT NULL,
description TEXT NOT NULL,
diagnosis TEXT NULL,
estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
final_cost DECIMAL(10,2) NULL,
estimated_days INT NULL,
actual_days INT NULL,
estimated_time VARCHAR(64) NULL,
is_paid TINYINT(1) NOT NULL DEFAULT 0,
completed_at DATETIME NULL,
created_at DATETIME NOT NULL,
updated_at DATETIME NOT NULL
```

### order_parts

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
order_id BIGINT NOT NULL,
part_id BIGINT NULL,
work_name VARCHAR(255) NULL,
work_type VARCHAR(64) NULL,
quantity INT NOT NULL,
unit_price DECIMAL(10,2) NOT NULL,
total_price DECIMAL(10,2) NOT NULL,
is_used TINYINT(1) NOT NULL DEFAULT 1,
meta_json JSON NULL
```

### payments

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
order_id BIGINT NOT NULL,
amount DECIMAL(10,2) NOT NULL,
method VARCHAR(32) NOT NULL,
status VARCHAR(32) NOT NULL,
processed_by BIGINT NULL,
notes TEXT NULL,
processed_at DATETIME NOT NULL
```

### inventory_parts

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
name VARCHAR(255) NOT NULL,
part_number VARCHAR(120) NOT NULL UNIQUE,
category VARCHAR(120) NOT NULL,
brand VARCHAR(120) NOT NULL,
model VARCHAR(120) NOT NULL,
description TEXT NULL,
quantity INT NOT NULL DEFAULT 0,
min_quantity INT NOT NULL DEFAULT 0,
unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
supplier VARCHAR(255) NULL,
supplier_contact VARCHAR(255) NULL,
location VARCHAR(255) NULL,
created_at DATETIME NOT NULL,
updated_at DATETIME NOT NULL
```

### stock_movements

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
part_id BIGINT NOT NULL,
order_id BIGINT NULL,
direction ENUM('in','out','adjustment') NOT NULL,
quantity INT NOT NULL,
reason VARCHAR(255) NOT NULL,
processed_by BIGINT NULL,
created_at DATETIME NOT NULL
```

### cash_operations

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
type ENUM('income','expense') NOT NULL,
amount DECIMAL(10,2) NOT NULL,
description VARCHAR(255) NOT NULL,
category VARCHAR(120) NOT NULL,
order_id BIGINT NULL,
processed_by BIGINT NULL,
notes TEXT NULL,
processed_at DATETIME NOT NULL
```

### order_communications

```sql
id BIGINT PRIMARY KEY AUTO_INCREMENT,
order_id BIGINT NOT NULL,
channel ENUM('whatsapp','telegram') NOT NULL,
author_id BIGINT NULL,
message TEXT NOT NULL,
created_at DATETIME NOT NULL
```

## Последовательность миграции

1. Поднять `auth`, `users`, `clients`.
2. Перевести `clientService` и авторизацию на API.
3. Поднять `devices`, `orders`, `payments`.
4. Перевести страницу заказов.
5. Поднять `inventory_parts`, `stock_movements`, `cash_operations`.
6. Перевести склад и кассу.
7. Поднять `documents` и `order_communications`.

## Практический next step

Сначала на Timeweb достаточно реализовать:

- `POST /auth/login`
- `GET /clients`
- `POST /clients`
- `GET /orders`
- `POST /orders`
- `POST /orders/:id/payments`
- `GET /inventory/parts`
- `POST /inventory/parts/:id/deduct-stock`

Этого уже хватит, чтобы убрать самые критичные моки из CRM.
