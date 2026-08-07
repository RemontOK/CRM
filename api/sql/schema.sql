CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(64) NOT NULL DEFAULT '',
    login_email VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    can_login TINYINT(1) NOT NULL DEFAULT 0,
    role ENUM('admin', 'manager', 'technician', 'cashier') NOT NULL DEFAULT 'manager',
    department VARCHAR(255) NOT NULL DEFAULT '',
    position VARCHAR(255) NOT NULL DEFAULT '',
    salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    intake_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
    execution_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
    delivery_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
    rating DECIMAL(4,2) NOT NULL DEFAULT 0,
    total_orders INT NOT NULL DEFAULT 0,
    completed_orders INT NOT NULL DEFAULT 0,
    total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    hire_date DATETIME NULL,
    last_login DATETIME NULL,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    email_verification_token VARCHAR(64) NULL DEFAULT NULL,
    email_verification_sent_at DATETIME NULL DEFAULT NULL,
    email_verified_at DATETIME NULL DEFAULT NULL,
    access_json TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_users_login_email (login_email),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    token VARCHAR(128) NOT NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uniq_user_tokens_token (token),
    KEY idx_user_tokens_user_id (user_id),
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(64) NOT NULL,
    telegram_chat_id VARCHAR(64) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    address VARCHAR(255) NOT NULL DEFAULT '',
    notes TEXT NULL,
    custom_fields_json TEXT NULL,
    total_orders INT NOT NULL DEFAULT 0,
    total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_order_date DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_clients_phone (phone),
    KEY idx_clients_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'other',
    brand VARCHAR(255) NOT NULL DEFAULT '',
    model VARCHAR(255) NOT NULL DEFAULT '',
    serial_number VARCHAR(255) NOT NULL DEFAULT '',
    imei VARCHAR(255) NOT NULL DEFAULT '',
    color VARCHAR(64) NOT NULL DEFAULT '',
    device_condition VARCHAR(32) NOT NULL DEFAULT 'good',
    external_condition TEXT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_devices_client_id (client_id),
    CONSTRAINT fk_devices_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    order_number VARCHAR(32) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    technician_id VARCHAR(64) NOT NULL DEFAULT '',
    technician_name VARCHAR(255) NOT NULL DEFAULT '',
    intake_manager_name VARCHAR(255) NOT NULL DEFAULT '',
    delivery_manager_name VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'diagnosis',
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    description TEXT NULL,
    diagnosis TEXT NULL,
    estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    final_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    estimated_days INT NOT NULL DEFAULT 0,
    actual_days INT NOT NULL DEFAULT 0,
    estimated_time VARCHAR(64) NOT NULL DEFAULT '',
    parts_json JSON NULL,
    payments_json JSON NULL,
    communication_history_json JSON NULL,
    completed_at DATETIME NULL,
    is_paid TINYINT(1) NOT NULL DEFAULT 0,
    is_warranty TINYINT(1) NOT NULL DEFAULT 0,
    device_password VARCHAR(255) NOT NULL DEFAULT '',
    client_name VARCHAR(255) NOT NULL DEFAULT '',
    client_phone VARCHAR(64) NOT NULL DEFAULT '',
    device_brand VARCHAR(255) NOT NULL DEFAULT '',
    device_model VARCHAR(255) NOT NULL DEFAULT '',
    device_serial VARCHAR(255) NOT NULL DEFAULT '',
    device_imei VARCHAR(255) NOT NULL DEFAULT '',
    device_color VARCHAR(64) NOT NULL DEFAULT '',
    device_condition VARCHAR(32) NOT NULL DEFAULT '',
    device_external_condition TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_orders_order_number (order_number),
    KEY idx_orders_status (status),
    KEY idx_orders_created_at (created_at),
    KEY idx_orders_client_id (client_id),
    KEY idx_orders_device_id (device_id),
    CONSTRAINT fk_orders_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_parts (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    part_type VARCHAR(32) NOT NULL DEFAULT 'spare_part',
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(255) NOT NULL DEFAULT '',
    category VARCHAR(255) NOT NULL DEFAULT '',
    subcategory VARCHAR(255) NOT NULL DEFAULT '',
    brand VARCHAR(255) NOT NULL DEFAULT '',
    model VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_quantity INT NOT NULL DEFAULT 0,
    alert_threshold INT NOT NULL DEFAULT 0,
    notifications_enabled TINYINT(1) NOT NULL DEFAULT 0,
    wholesale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255) NOT NULL DEFAULT '',
    supplier_contact VARCHAR(255) NOT NULL DEFAULT '',
    location_name VARCHAR(255) NOT NULL DEFAULT '',
    warehouse_id VARCHAR(64) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_inventory_parts_category (category),
    KEY idx_inventory_parts_type (part_type),
    KEY idx_inventory_parts_quantity (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    part_id VARCHAR(64) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    direction ENUM('in', 'out', 'adjustment') NOT NULL DEFAULT 'in',
    reason VARCHAR(255) NOT NULL DEFAULT '',
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255) NOT NULL DEFAULT '',
    document_number VARCHAR(255) NOT NULL DEFAULT '',
    order_number VARCHAR(64) NOT NULL DEFAULT '',
    processed_by VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL,
    KEY idx_stock_movements_part_id (part_id),
    KEY idx_stock_movements_created_at (created_at),
    CONSTRAINT fk_stock_movements_part FOREIGN KEY (part_id) REFERENCES inventory_parts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_operations (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    type ENUM('income', 'expense') NOT NULL DEFAULT 'income',
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description VARCHAR(255) NOT NULL DEFAULT '',
    category VARCHAR(255) NOT NULL DEFAULT '',
    subcategory VARCHAR(255) NOT NULL DEFAULT '',
    payment_method VARCHAR(32) NOT NULL DEFAULT '',
    register_type VARCHAR(32) NOT NULL DEFAULT '',
    source VARCHAR(64) NOT NULL DEFAULT '',
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    processed_by VARCHAR(255) NOT NULL DEFAULT '',
    processed_at DATETIME NOT NULL,
    notes TEXT NULL,
    KEY idx_cash_operations_processed_at (processed_at),
    KEY idx_cash_operations_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
    `key` VARCHAR(64) NOT NULL PRIMARY KEY,
    payload_json JSON NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    owner_user_id VARCHAR(64) NULL,
    status ENUM('trial', 'active', 'suspended', 'expired') NOT NULL DEFAULT 'trial',
    trial_ends_at DATETIME NULL,
    subscription_ends_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_tenants_slug (slug),
    KEY idx_tenants_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_activity_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NULL,
    user_id VARCHAR(64) NULL,
    action VARCHAR(64) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL,
    KEY idx_activity_tenant (tenant_id),
    KEY idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uniq_plans_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
