<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

header('Access-Control-Allow-Origin: ' . (app_config('app')['cors_origin'] ?? '*'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function route_matches(string $pattern, string $path, ?array &$matches = null): bool
{
    $localMatches = [];
    $result = (bool) preg_match($pattern, $path, $localMatches);
    $matches = $localMatches;
    return $result;
}

function normalize_bool($value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_numeric($value)) {
        return (int) $value === 1;
    }

    return in_array($value, ['1', 'true', 'yes', 'on'], true);
}

function decode_json_column($value, array $fallback = []): array
{
    if (is_array($value)) {
        return $value;
    }

    if (!is_string($value) || $value === '') {
        return $fallback;
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function map_user(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'email' => (string) ($row['email'] ?? ''),
        'phone' => (string) ($row['phone'] ?? ''),
        'loginEmail' => (string) ($row['login_email'] ?? ''),
        'canLogin' => normalize_bool($row['can_login'] ?? false),
        'role' => (string) $row['role'],
        'department' => (string) ($row['department'] ?? ''),
        'position' => (string) ($row['position'] ?? ''),
        'salary' => (float) ($row['salary'] ?? 0),
        'intakeRate' => (float) ($row['intake_rate'] ?? 0),
        'executionRate' => (float) ($row['execution_rate'] ?? 0),
        'deliveryRate' => (float) ($row['delivery_rate'] ?? 0),
        'rating' => (float) ($row['rating'] ?? 0),
        'totalOrders' => (int) ($row['total_orders'] ?? 0),
        'completedOrders' => (int) ($row['completed_orders'] ?? 0),
        'totalEarnings' => (float) ($row['total_earnings'] ?? 0),
        'isActive' => normalize_bool($row['is_active'] ?? true),
        'hireDate' => (string) ($row['hire_date'] ?? ''),
        'lastLogin' => (string) ($row['last_login'] ?? ''),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function map_client(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'firstName' => (string) $row['first_name'],
        'lastName' => (string) ($row['last_name'] ?? ''),
        'phone' => (string) $row['phone'],
        'email' => (string) ($row['email'] ?? ''),
        'address' => (string) ($row['address'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'totalOrders' => (int) ($row['total_orders'] ?? 0),
        'totalSpent' => (float) ($row['total_spent'] ?? 0),
        'lastOrderDate' => $row['last_order_date'],
        'createdAt' => (string) $row['created_at'],
        'updatedAt' => (string) $row['updated_at'],
    ];
}

function map_device(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'clientId' => (string) $row['client_id'],
        'type' => (string) $row['type'],
        'brand' => (string) $row['brand'],
        'model' => (string) $row['model'],
        'serialNumber' => (string) ($row['serial_number'] ?? ''),
        'imei' => (string) ($row['imei'] ?? ''),
        'color' => (string) ($row['color'] ?? ''),
        'condition' => (string) ($row['device_condition'] ?? 'good'),
        'externalCondition' => (string) ($row['external_condition'] ?? ''),
        'createdAt' => (string) $row['created_at'],
    ];
}

function map_order(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'orderNumber' => (string) $row['order_number'],
        'clientId' => (string) $row['client_id'],
        'deviceId' => (string) $row['device_id'],
        'technicianId' => (string) ($row['technician_id'] ?? ''),
        'technicianName' => (string) ($row['technician_name'] ?? ''),
        'intakeManagerName' => (string) ($row['intake_manager_name'] ?? ''),
        'deliveryManagerName' => (string) ($row['delivery_manager_name'] ?? ''),
        'status' => (string) $row['status'],
        'priority' => (string) $row['priority'],
        'description' => (string) ($row['description'] ?? ''),
        'diagnosis' => (string) ($row['diagnosis'] ?? ''),
        'estimatedCost' => (float) ($row['estimated_cost'] ?? 0),
        'finalCost' => (float) ($row['final_cost'] ?? 0),
        'estimatedDays' => (int) ($row['estimated_days'] ?? 0),
        'actualDays' => (int) ($row['actual_days'] ?? 0),
        'estimatedTime' => (string) ($row['estimated_time'] ?? ''),
        'parts' => decode_json_column($row['parts_json'] ?? '[]'),
        'payments' => decode_json_column($row['payments_json'] ?? '[]'),
        'communicationHistory' => decode_json_column($row['communication_history_json'] ?? '[]'),
        'createdAt' => (string) $row['created_at'],
        'updatedAt' => (string) $row['updated_at'],
        'completedAt' => $row['completed_at'],
        'isPaid' => normalize_bool($row['is_paid'] ?? false),
        'clientName' => (string) ($row['client_name'] ?? ''),
        'clientPhone' => (string) ($row['client_phone'] ?? ''),
        'deviceBrand' => (string) ($row['device_brand'] ?? ''),
        'deviceModel' => (string) ($row['device_model'] ?? ''),
        'deviceSerial' => (string) ($row['device_serial'] ?? ''),
        'deviceImei' => (string) ($row['device_imei'] ?? ''),
        'deviceColor' => (string) ($row['device_color'] ?? ''),
        'deviceCondition' => (string) ($row['device_condition'] ?? ''),
        'deviceExternalCondition' => (string) ($row['device_external_condition'] ?? ''),
    ];
}

function map_part(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'partType' => (string) ($row['part_type'] ?? 'spare_part'),
        'name' => (string) $row['name'],
        'partNumber' => (string) $row['part_number'],
        'category' => (string) $row['category'],
        'subcategory' => (string) ($row['subcategory'] ?? ''),
        'brand' => (string) ($row['brand'] ?? ''),
        'model' => (string) ($row['model'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'quantity' => (int) ($row['quantity'] ?? 0),
        'minQuantity' => (int) ($row['min_quantity'] ?? 0),
        'alertThreshold' => (int) ($row['alert_threshold'] ?? 0),
        'notificationsEnabled' => normalize_bool($row['notifications_enabled'] ?? true),
        'unitPrice' => (float) ($row['unit_price'] ?? 0),
        'wholesalePrice' => (float) ($row['wholesale_price'] ?? ($row['unit_price'] ?? 0)),
        'supplier' => (string) ($row['supplier'] ?? ''),
        'supplierContact' => (string) ($row['supplier_contact'] ?? ''),
        'location' => (string) ($row['location_name'] ?? ''),
        'createdAt' => (string) $row['created_at'],
        'updatedAt' => (string) $row['updated_at'],
    ];
}

function map_movement(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'partId' => (string) $row['part_id'],
        'partName' => (string) $row['part_name'],
        'quantity' => (int) $row['quantity'],
        'direction' => (string) $row['direction'],
        'reason' => (string) $row['reason'],
        'unitCost' => (float) ($row['unit_cost'] ?? 0),
        'totalCost' => (float) ($row['total_cost'] ?? 0),
        'supplier' => (string) ($row['supplier'] ?? ''),
        'documentNumber' => (string) ($row['document_number'] ?? ''),
        'orderNumber' => (string) ($row['order_number'] ?? ''),
        'processedBy' => (string) ($row['processed_by'] ?? ''),
        'createdAt' => (string) $row['created_at'],
    ];
}

function map_cash_operation(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'type' => (string) $row['type'],
        'amount' => (float) $row['amount'],
        'description' => (string) $row['description'],
        'category' => (string) $row['category'],
        'subcategory' => (string) ($row['subcategory'] ?? ''),
        'paymentMethod' => (string) ($row['payment_method'] ?? ''),
        'registerType' => (string) ($row['register_type'] ?? ''),
        'source' => (string) ($row['source'] ?? ''),
        'orderId' => (string) ($row['order_id'] ?? ''),
        'processedBy' => (string) ($row['processed_by'] ?? ''),
        'processedAt' => (string) $row['processed_at'],
        'notes' => (string) ($row['notes'] ?? ''),
    ];
}

function map_taxonomy_node(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'scope' => (string) $row['scope'],
        'name' => (string) $row['name'],
        'parentId' => $row['parent_id'] ?: null,
        'createdAt' => (string) $row['created_at'],
    ];
}

function table_has_column(string $table, string $column): bool
{
    $row = fetch_one_assoc(
        'SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name',
        ['table_name' => $table, 'column_name' => $column]
    );
    return (int) ($row['total'] ?? 0) > 0;
}

function map_acceptance_act(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'orderId' => (string) $row['order_id'],
        'orderNumber' => (string) $row['order_number'],
        'client' => decode_json_column($row['client_json'] ?? '{}', []),
        'device' => decode_json_column($row['device_json'] ?? '{}', []),
        'problemDescription' => (string) ($row['problem_description'] ?? ''),
        'preliminaryCost' => (float) ($row['preliminary_cost'] ?? 0),
        'advancePayment' => (float) ($row['advance_payment'] ?? 0),
        'acceptanceDate' => (string) ($row['acceptance_date'] ?? ''),
        'acceptedBy' => (string) ($row['accepted_by'] ?? ''),
        'conditions' => (string) ($row['conditions_text'] ?? ''),
        'clientSignature' => decode_json_column($row['client_signature_json'] ?? '{}', []),
        'masterSignature' => decode_json_column($row['master_signature_json'] ?? '{}', []),
        'documentNumber' => (string) ($row['document_number'] ?? ''),
        'printedAt' => $row['printed_at'],
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function map_work_completion_act(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'orderId' => (string) $row['order_id'],
        'orderNumber' => (string) $row['order_number'],
        'client' => decode_json_column($row['client_json'] ?? '{}', []),
        'device' => decode_json_column($row['device_json'] ?? '{}', []),
        'worksPerformed' => decode_json_column($row['works_json'] ?? '[]', []),
        'partsUsed' => decode_json_column($row['parts_json'] ?? '[]', []),
        'totalCost' => (float) ($row['total_cost'] ?? 0),
        'warrantyPeriod' => (int) ($row['warranty_period'] ?? 0),
        'completionDate' => (string) ($row['completion_date'] ?? ''),
        'completedBy' => (string) ($row['completed_by'] ?? ''),
        'clientSignature' => decode_json_column($row['client_signature_json'] ?? '{}', []),
        'masterSignature' => decode_json_column($row['master_signature_json'] ?? '{}', []),
        'documentNumber' => (string) ($row['document_number'] ?? ''),
        'printedAt' => $row['printed_at'],
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function map_document_storage(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'orderId' => (string) $row['order_id'],
        'documentType' => (string) $row['document_type'],
        'documentId' => (string) $row['document_id'],
        'filePath' => (string) ($row['file_path'] ?? ''),
        'fileSize' => (int) ($row['file_size'] ?? 0),
        'mimeType' => (string) ($row['mime_type'] ?? ''),
        'createdAt' => (string) ($row['created_at'] ?? ''),
    ];
}

function fetch_all_assoc(string $sql, array $params = []): array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function fetch_one_assoc(string $sql, array $params = []): ?array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ?: null;
}

function delete_taxonomy_branch(string $nodeId): void
{
    $children = fetch_all_assoc('SELECT id FROM taxonomy_nodes WHERE parent_id = :parent_id', [
        'parent_id' => $nodeId,
    ]);

    foreach ($children as $child) {
        if (!empty($child['id'])) {
            delete_taxonomy_branch((string) $child['id']);
        }
    }

    db()->prepare('DELETE FROM taxonomy_nodes WHERE id = :id')->execute([
        'id' => $nodeId,
    ]);
}

function save_settings(array $payload): void
{
    $sql = 'INSERT INTO app_settings (`key`, payload_json, updated_at)
            VALUES (:key, :payload_json, :updated_at)
            ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = VALUES(updated_at)';
    $stmt = db()->prepare($sql);
    $stmt->execute([
        'key' => 'default',
        'payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'updated_at' => now_mysql(),
    ]);
}

function ensure_extra_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS taxonomy_nodes (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            scope ENUM('inventory','cash','employee_departments','employee_positions') NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id VARCHAR(64) NULL,
            created_at DATETIME NOT NULL,
            KEY idx_taxonomy_scope (scope),
            KEY idx_taxonomy_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS acceptance_acts (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            order_id VARCHAR(64) NOT NULL,
            order_number VARCHAR(64) NOT NULL,
            document_number VARCHAR(64) NOT NULL,
            client_json JSON NOT NULL,
            device_json JSON NOT NULL,
            problem_description TEXT NULL,
            preliminary_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
            advance_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
            acceptance_date DATETIME NOT NULL,
            accepted_by VARCHAR(255) NOT NULL DEFAULT '',
            conditions_text TEXT NULL,
            client_signature_json JSON NULL,
            master_signature_json JSON NULL,
            printed_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_acceptance_order (order_id),
            KEY idx_acceptance_order_number (order_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    if (!table_has_column('acceptance_acts', 'advance_payment')) {
        db()->exec('ALTER TABLE acceptance_acts ADD COLUMN advance_payment DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER preliminary_cost');
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS work_completion_acts (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            order_id VARCHAR(64) NOT NULL,
            order_number VARCHAR(64) NOT NULL,
            document_number VARCHAR(64) NOT NULL,
            client_json JSON NOT NULL,
            device_json JSON NOT NULL,
            works_json JSON NOT NULL,
            parts_json JSON NOT NULL,
            total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
            warranty_period INT NOT NULL DEFAULT 0,
            completion_date DATETIME NOT NULL,
            completed_by VARCHAR(255) NOT NULL DEFAULT '',
            client_signature_json JSON NULL,
            master_signature_json JSON NULL,
            printed_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_completion_order (order_id),
            KEY idx_completion_order_number (order_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS document_storage (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            order_id VARCHAR(64) NOT NULL,
            document_type ENUM('acceptance','completion') NOT NULL,
            document_id VARCHAR(64) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            file_size INT NOT NULL DEFAULT 0,
            mime_type VARCHAR(128) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            KEY idx_document_storage_order (order_id),
            KEY idx_document_storage_document (document_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = request_path();

try {
    ensure_extra_tables();
    if ($method === 'GET' && $path === '/health') {
        json_response([
            'status' => 'ok',
            'time' => now_mysql(),
            'database' => db()->query('SELECT 1')->fetchColumn() ? 'connected' : 'unknown',
        ]);
    }

    if ($method === 'POST' && $path === '/auth/login') {
        $payload = json_input();
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            json_error('Р Р€Р С”Р В°Р В¶Р С‘РЎвЂљР Вµ Р В»Р С•Р С–Р С‘Р Р… Р С‘ Р С—Р В°РЎР‚Р С•Р В»РЎРЉ', 422);
        }

        $user = fetch_one_assoc(
            'SELECT * FROM users WHERE (login_email = :login_email OR email = :email) AND can_login = 1 LIMIT 1',
            [
                'login_email' => $email,
                'email' => $email,
            ]
        );

        if (!$user) {
            json_error('Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 401);
        }

        $hash = (string) ($user['password_hash'] ?? '');
        $isValid = $hash !== '' && password_verify($password, $hash);
        if (!$isValid) {
            json_error('Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– Р С—Р В°РЎР‚Р С•Р В»РЎРЉ', 401);
        }

        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash = :password_hash, updated_at = :updated_at WHERE id = :id')->execute([
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'updated_at' => now_mysql(),
                'id' => $user['id'],
            ]);
        }

        $token = uuid_token();
        $expiresAt = date('Y-m-d H:i:s', time() + ((int) app_config('app')['token_ttl_days'] * 86400));

        $stmt = db()->prepare('INSERT INTO user_tokens (user_id, token, expires_at, created_at) VALUES (:user_id, :token, :expires_at, :created_at)');
        $stmt->execute([
            'user_id' => $user['id'],
            'token' => $token,
            'expires_at' => $expiresAt,
            'created_at' => now_mysql(),
        ]);

        db()->prepare('UPDATE users SET last_login = :last_login, updated_at = :updated_at WHERE id = :id')->execute([
            'last_login' => now_mysql(),
            'updated_at' => now_mysql(),
            'id' => $user['id'],
        ]);

        json_response([
            'token' => $token,
            'expiresAt' => $expiresAt,
            'user' => map_user($user),
        ], 200, 'Р С’Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р Р†РЎвЂ№Р С—Р С•Р В»Р Р…Р ВµР Р…Р В°');
    }

    if ($method === 'GET' && $path === '/auth/me') {
        $user = require_auth();
        json_response(map_user($user));
    }

    if ($method === 'POST' && $path === '/auth/logout') {
        require_auth();
        $token = current_bearer_token();
        db()->prepare('DELETE FROM user_tokens WHERE token = :token')->execute(['token' => $token]);
        json_response(['loggedOut' => true], 200, 'Р РЋР ВµРЎРѓРЎРѓР С‘РЎРЏ Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°');
    }

    if ($method === 'GET' && $path === '/settings') {
        require_auth();
        $settings = fetch_one_assoc('SELECT payload_json FROM app_settings WHERE `key` = :key LIMIT 1', ['key' => 'default']);
        json_response($settings ? decode_json_column($settings['payload_json'], []) : []);
    }

    if ($method === 'PUT' && $path === '/settings') {
        require_auth();
        $payload = json_input();
        save_settings($payload);
        json_response($payload, 200, 'Р СњР В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…РЎвЂ№');
    }

    if ($method === 'GET' && $path === '/users') {
        require_auth();
        $rows = fetch_all_assoc('SELECT * FROM users ORDER BY created_at DESC');
        json_response(array_map('map_user', $rows));
    }

    if ($method === 'POST' && $path === '/users') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $stmt = db()->prepare(
            'INSERT INTO users (
                id, name, email, phone, login_email, password_hash, can_login, role, department, position,
                salary, intake_rate, execution_rate, delivery_rate, rating, total_orders, completed_orders,
                total_earnings, is_active, hire_date, last_login, created_at, updated_at
            ) VALUES (
                :id, :name, :email, :phone, :login_email, :password_hash, :can_login, :role, :department, :position,
                :salary, :intake_rate, :execution_rate, :delivery_rate, :rating, :total_orders, :completed_orders,
                :total_earnings, :is_active, :hire_date, :last_login, :created_at, :updated_at
            )'
        );
        $stmt->execute([
            'id' => $id,
            'name' => $payload['name'] ?? '',
            'email' => $payload['email'] ?? '',
            'phone' => $payload['phone'] ?? '',
            'login_email' => $payload['loginEmail'] ?? '',
            'password_hash' => !empty($payload['password']) ? password_hash((string) $payload['password'], PASSWORD_DEFAULT) : '',
            'can_login' => bool_to_int($payload['canLogin'] ?? false),
            'role' => $payload['role'] ?? 'manager',
            'department' => $payload['department'] ?? '',
            'position' => $payload['position'] ?? '',
            'salary' => $payload['salary'] ?? 0,
            'intake_rate' => $payload['intakeRate'] ?? 0,
            'execution_rate' => $payload['executionRate'] ?? 0,
            'delivery_rate' => $payload['deliveryRate'] ?? 0,
            'rating' => $payload['rating'] ?? 0,
            'total_orders' => $payload['totalOrders'] ?? 0,
            'completed_orders' => $payload['completedOrders'] ?? 0,
            'total_earnings' => $payload['totalEarnings'] ?? 0,
            'is_active' => bool_to_int($payload['isActive'] ?? true),
            'hire_date' => $payload['hireDate'] ?? now_mysql(),
            'last_login' => $payload['lastLogin'] ?? now_mysql(),
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $created = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_user($created ?: []), 201, 'Р РЋР С•РЎвЂљРЎР‚РЎС“Р Т‘Р Р…Р С‘Р С” РЎРѓР С•Р В·Р Т‘Р В°Р Р…');
    }

    if ($method === 'PUT' && route_matches('#^/users/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $current = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$current) {
            json_error('Р РЋР С•РЎвЂљРЎР‚РЎС“Р Т‘Р Р…Р С‘Р С” Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }

        $payload = json_input();
        $passwordHash = $current['password_hash'];
        if (array_key_exists('password', $payload) && $payload['password'] !== '') {
            $passwordHash = password_hash((string) $payload['password'], PASSWORD_DEFAULT);
        }

        db()->prepare(
            'UPDATE users SET
                name = :name, email = :email, phone = :phone, login_email = :login_email, password_hash = :password_hash,
                can_login = :can_login, role = :role, department = :department, position = :position, salary = :salary,
                intake_rate = :intake_rate, execution_rate = :execution_rate, delivery_rate = :delivery_rate,
                rating = :rating, total_orders = :total_orders, completed_orders = :completed_orders,
                total_earnings = :total_earnings, is_active = :is_active, hire_date = :hire_date,
                last_login = :last_login, updated_at = :updated_at
             WHERE id = :id'
        )->execute([
            'id' => $id,
            'name' => $payload['name'] ?? $current['name'],
            'email' => $payload['email'] ?? $current['email'],
            'phone' => $payload['phone'] ?? $current['phone'],
            'login_email' => $payload['loginEmail'] ?? $current['login_email'],
            'password_hash' => $passwordHash,
            'can_login' => bool_to_int($payload['canLogin'] ?? $current['can_login']),
            'role' => $payload['role'] ?? $current['role'],
            'department' => $payload['department'] ?? $current['department'],
            'position' => $payload['position'] ?? $current['position'],
            'salary' => $payload['salary'] ?? $current['salary'],
            'intake_rate' => $payload['intakeRate'] ?? $current['intake_rate'],
            'execution_rate' => $payload['executionRate'] ?? $current['execution_rate'],
            'delivery_rate' => $payload['deliveryRate'] ?? $current['delivery_rate'],
            'rating' => $payload['rating'] ?? $current['rating'],
            'total_orders' => $payload['totalOrders'] ?? $current['total_orders'],
            'completed_orders' => $payload['completedOrders'] ?? $current['completed_orders'],
            'total_earnings' => $payload['totalEarnings'] ?? $current['total_earnings'],
            'is_active' => bool_to_int($payload['isActive'] ?? $current['is_active']),
            'hire_date' => $payload['hireDate'] ?? $current['hire_date'],
            'last_login' => $payload['lastLogin'] ?? $current['last_login'],
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_user($updated ?: []), 200, 'Р РЋР С•РЎвЂљРЎР‚РЎС“Р Т‘Р Р…Р С‘Р С” Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…');
    }

    if ($method === 'DELETE' && route_matches('#^/users/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        db()->prepare('DELETE FROM user_tokens WHERE user_id = :id')->execute(['id' => $id]);
        db()->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $id]);
        json_response(['deleted' => true], 200, 'Р РЋР С•РЎвЂљРЎР‚РЎС“Р Т‘Р Р…Р С‘Р С” РЎС“Р Т‘Р В°Р В»Р ВµР Р…');
    }

    if ($method === 'GET' && $path === '/clients') {
        require_auth();
        $rows = fetch_all_assoc('SELECT * FROM clients ORDER BY created_at DESC');
        json_response(array_map('map_client', $rows));
    }

    if ($method === 'POST' && $path === '/clients') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO clients (
                id, first_name, last_name, phone, email, address, notes, total_orders, total_spent, last_order_date, created_at, updated_at
             ) VALUES (
                :id, :first_name, :last_name, :phone, :email, :address, :notes, :total_orders, :total_spent, :last_order_date, :created_at, :updated_at
             )'
        )->execute([
            'id' => $id,
            'first_name' => $payload['firstName'] ?? '',
            'last_name' => $payload['lastName'] ?? '',
            'phone' => $payload['phone'] ?? '',
            'email' => $payload['email'] ?? '',
            'address' => $payload['address'] ?? '',
            'notes' => $payload['notes'] ?? '',
            'total_orders' => $payload['totalOrders'] ?? 0,
            'total_spent' => $payload['totalSpent'] ?? 0,
            'last_order_date' => $payload['lastOrderDate'] ?? null,
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $client = fetch_one_assoc('SELECT * FROM clients WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_client($client ?: []), 201, 'Р С™Р В»Р С‘Р ВµР Р…РЎвЂљ РЎРѓР С•Р В·Р Т‘Р В°Р Р…');
    }

    if ($method === 'GET' && route_matches('#^/clients/([^/]+)$#', $path, $matches)) {
        require_auth();
        $client = fetch_one_assoc('SELECT * FROM clients WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        if (!$client) {
            json_error('Р С™Р В»Р С‘Р ВµР Р…РЎвЂљ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }
        json_response(map_client($client));
    }

    if ($method === 'PUT' && route_matches('#^/clients/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $current = fetch_one_assoc('SELECT * FROM clients WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$current) {
            json_error('Р С™Р В»Р С‘Р ВµР Р…РЎвЂљ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }
        $payload = json_input();
        db()->prepare(
            'UPDATE clients SET
                first_name = :first_name, last_name = :last_name, phone = :phone, email = :email,
                address = :address, notes = :notes, total_orders = :total_orders, total_spent = :total_spent,
                last_order_date = :last_order_date, updated_at = :updated_at
             WHERE id = :id'
        )->execute([
            'id' => $id,
            'first_name' => $payload['firstName'] ?? $current['first_name'],
            'last_name' => $payload['lastName'] ?? $current['last_name'],
            'phone' => $payload['phone'] ?? $current['phone'],
            'email' => $payload['email'] ?? $current['email'],
            'address' => $payload['address'] ?? $current['address'],
            'notes' => $payload['notes'] ?? $current['notes'],
            'total_orders' => $payload['totalOrders'] ?? $current['total_orders'],
            'total_spent' => $payload['totalSpent'] ?? $current['total_spent'],
            'last_order_date' => $payload['lastOrderDate'] ?? $current['last_order_date'],
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM clients WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_client($updated ?: []), 200, 'Р С™Р В»Р С‘Р ВµР Р…РЎвЂљ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…');
    }

    if ($method === 'DELETE' && route_matches('#^/clients/([^/]+)$#', $path, $matches)) {
        require_auth();
        db()->prepare('DELETE FROM clients WHERE id = :id')->execute(['id' => $matches[1]]);
        json_response(['deleted' => true], 200, 'Р С™Р В»Р С‘Р ВµР Р…РЎвЂљ РЎС“Р Т‘Р В°Р В»Р ВµР Р…');
    }

    if ($method === 'GET' && $path === '/devices') {
        require_auth();
        $sql = 'SELECT * FROM devices';
        $params = [];
        if (!empty($_GET['clientId'])) {
            $sql .= ' WHERE client_id = :client_id';
            $params['client_id'] = (string) $_GET['clientId'];
        }
        $sql .= ' ORDER BY created_at DESC';
        $rows = fetch_all_assoc($sql, $params);
        json_response(array_map('map_device', $rows));
    }

    if ($method === 'POST' && $path === '/devices') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO devices (
                id, client_id, type, brand, model, serial_number, imei, color, device_condition, external_condition, created_at
            ) VALUES (
                :id, :client_id, :type, :brand, :model, :serial_number, :imei, :color, :device_condition, :external_condition, :created_at
            )'
        )->execute([
            'id' => $id,
            'client_id' => $payload['clientId'] ?? '',
            'type' => $payload['type'] ?? 'other',
            'brand' => $payload['brand'] ?? '',
            'model' => $payload['model'] ?? '',
            'serial_number' => $payload['serialNumber'] ?? '',
            'imei' => $payload['imei'] ?? '',
            'color' => $payload['color'] ?? '',
            'device_condition' => $payload['condition'] ?? 'good',
            'external_condition' => $payload['externalCondition'] ?? '',
            'created_at' => $payload['createdAt'] ?? now_mysql(),
        ]);
        $device = fetch_one_assoc('SELECT * FROM devices WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_device($device ?: []), 201, 'Р Р€РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р С• РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С•');
    }

    if ($method === 'GET' && route_matches('#^/devices/([^/]+)$#', $path, $matches)) {
        require_auth();
        $device = fetch_one_assoc('SELECT * FROM devices WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        if (!$device) {
            json_error('Р Р€РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р С• Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р С•', 404);
        }
        json_response(map_device($device));
    }

    if ($method === 'GET' && $path === '/orders') {
        require_auth();
        $rows = fetch_all_assoc('SELECT * FROM orders ORDER BY created_at DESC');
        json_response(array_map('map_order', $rows));
    }

    if ($method === 'POST' && $path === '/orders') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $orderNumber = trim((string) ($payload['orderNumber'] ?? ''));
        if ($orderNumber === '') {
            $orderNumber = generate_order_number();
        }
        db()->prepare(
            'INSERT INTO orders (
                id, order_number, client_id, device_id, technician_id, technician_name, intake_manager_name, delivery_manager_name,
                status, priority, description, diagnosis, estimated_cost, final_cost, estimated_days, actual_days, estimated_time,
                parts_json, payments_json, communication_history_json, completed_at, is_paid,
                client_name, client_phone, device_brand, device_model, device_serial, device_imei, device_color,
                device_condition, device_external_condition, created_at, updated_at
             ) VALUES (
                :id, :order_number, :client_id, :device_id, :technician_id, :technician_name, :intake_manager_name, :delivery_manager_name,
                :status, :priority, :description, :diagnosis, :estimated_cost, :final_cost, :estimated_days, :actual_days, :estimated_time,
                :parts_json, :payments_json, :communication_history_json, :completed_at, :is_paid,
                :client_name, :client_phone, :device_brand, :device_model, :device_serial, :device_imei, :device_color,
                :device_condition, :device_external_condition, :created_at, :updated_at
             )'
        )->execute([
            'id' => $id,
            'order_number' => $orderNumber,
            'client_id' => $payload['clientId'] ?? '',
            'device_id' => $payload['deviceId'] ?? '',
            'technician_id' => $payload['technicianId'] ?? '',
            'technician_name' => $payload['technicianName'] ?? '',
            'intake_manager_name' => $payload['intakeManagerName'] ?? '',
            'delivery_manager_name' => $payload['deliveryManagerName'] ?? '',
            'status' => $payload['status'] ?? 'diagnosis',
            'priority' => $payload['priority'] ?? 'medium',
            'description' => $payload['description'] ?? '',
            'diagnosis' => $payload['diagnosis'] ?? '',
            'estimated_cost' => $payload['estimatedCost'] ?? 0,
            'final_cost' => $payload['finalCost'] ?? 0,
            'estimated_days' => $payload['estimatedDays'] ?? 0,
            'actual_days' => $payload['actualDays'] ?? 0,
            'estimated_time' => $payload['estimatedTime'] ?? '',
            'parts_json' => json_encode($payload['parts'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'payments_json' => json_encode($payload['payments'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'communication_history_json' => json_encode($payload['communicationHistory'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'completed_at' => $payload['completedAt'] ?? null,
            'is_paid' => bool_to_int($payload['isPaid'] ?? false),
            'client_name' => $payload['clientName'] ?? '',
            'client_phone' => $payload['clientPhone'] ?? '',
            'device_brand' => $payload['deviceBrand'] ?? '',
            'device_model' => $payload['deviceModel'] ?? '',
            'device_serial' => $payload['deviceSerial'] ?? '',
            'device_imei' => $payload['deviceImei'] ?? '',
            'device_color' => $payload['deviceColor'] ?? '',
            'device_condition' => $payload['deviceCondition'] ?? '',
            'device_external_condition' => $payload['deviceExternalCondition'] ?? '',
            'created_at' => $payload['createdAt'] ?? now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $order = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_order($order ?: []), 201, 'Р вЂ”Р В°Р С”Р В°Р В· РЎРѓР С•Р В·Р Т‘Р В°Р Р…');
    }

    if ($method === 'GET' && route_matches('#^/orders/([^/]+)$#', $path, $matches)) {
        require_auth();
        $order = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        if (!$order) {
            json_error('Р вЂ”Р В°Р С”Р В°Р В· Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }
        json_response(map_order($order));
    }

    if ($method === 'DELETE' && route_matches('#^/orders/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        db()->prepare('DELETE FROM orders WHERE id = :id')->execute(['id' => $id]);
        json_response(['deleted' => true], 200, 'Р вЂ”Р В°Р С”Р В°Р В· РЎС“Р Т‘Р В°Р В»Р ВµР Р…');
    }

    if ($method === 'PUT' && route_matches('#^/orders/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $current = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$current) {
            json_error('Р вЂ”Р В°Р С”Р В°Р В· Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }
        $payload = json_input();
        db()->prepare(
            'UPDATE orders SET
                order_number = :order_number, client_id = :client_id, device_id = :device_id, technician_id = :technician_id,
                technician_name = :technician_name, intake_manager_name = :intake_manager_name, delivery_manager_name = :delivery_manager_name,
                status = :status, priority = :priority, description = :description, diagnosis = :diagnosis,
                estimated_cost = :estimated_cost, final_cost = :final_cost, estimated_days = :estimated_days,
                actual_days = :actual_days, estimated_time = :estimated_time, parts_json = :parts_json,
                payments_json = :payments_json, communication_history_json = :communication_history_json,
                completed_at = :completed_at, is_paid = :is_paid, client_name = :client_name, client_phone = :client_phone,
                device_brand = :device_brand, device_model = :device_model, device_serial = :device_serial,
                device_imei = :device_imei, device_color = :device_color, device_condition = :device_condition,
                device_external_condition = :device_external_condition, updated_at = :updated_at
             WHERE id = :id'
        )->execute([
            'id' => $id,
            'order_number' => $payload['orderNumber'] ?? $current['order_number'],
            'client_id' => $payload['clientId'] ?? $current['client_id'],
            'device_id' => $payload['deviceId'] ?? $current['device_id'],
            'technician_id' => $payload['technicianId'] ?? $current['technician_id'],
            'technician_name' => $payload['technicianName'] ?? $current['technician_name'],
            'intake_manager_name' => $payload['intakeManagerName'] ?? $current['intake_manager_name'],
            'delivery_manager_name' => $payload['deliveryManagerName'] ?? $current['delivery_manager_name'],
            'status' => $payload['status'] ?? $current['status'],
            'priority' => $payload['priority'] ?? $current['priority'],
            'description' => $payload['description'] ?? $current['description'],
            'diagnosis' => $payload['diagnosis'] ?? $current['diagnosis'],
            'estimated_cost' => $payload['estimatedCost'] ?? $current['estimated_cost'],
            'final_cost' => $payload['finalCost'] ?? $current['final_cost'],
            'estimated_days' => $payload['estimatedDays'] ?? $current['estimated_days'],
            'actual_days' => $payload['actualDays'] ?? $current['actual_days'],
            'estimated_time' => $payload['estimatedTime'] ?? $current['estimated_time'],
            'parts_json' => json_encode($payload['parts'] ?? decode_json_column($current['parts_json']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'payments_json' => json_encode($payload['payments'] ?? decode_json_column($current['payments_json']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'communication_history_json' => json_encode($payload['communicationHistory'] ?? decode_json_column($current['communication_history_json']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'completed_at' => $payload['completedAt'] ?? $current['completed_at'],
            'is_paid' => bool_to_int($payload['isPaid'] ?? $current['is_paid']),
            'client_name' => $payload['clientName'] ?? $current['client_name'],
            'client_phone' => $payload['clientPhone'] ?? $current['client_phone'],
            'device_brand' => $payload['deviceBrand'] ?? $current['device_brand'],
            'device_model' => $payload['deviceModel'] ?? $current['device_model'],
            'device_serial' => $payload['deviceSerial'] ?? $current['device_serial'],
            'device_imei' => $payload['deviceImei'] ?? $current['device_imei'],
            'device_color' => $payload['deviceColor'] ?? $current['device_color'],
            'device_condition' => $payload['deviceCondition'] ?? $current['device_condition'],
            'device_external_condition' => $payload['deviceExternalCondition'] ?? $current['device_external_condition'],
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_order($updated ?: []), 200, 'Р вЂ”Р В°Р С”Р В°Р В· Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…');
    }

    if ($method === 'PATCH' && route_matches('#^/orders/([^/]+)/status$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $payload = json_input();
        db()->prepare('UPDATE orders SET status = :status, updated_at = :updated_at WHERE id = :id')->execute([
            'id' => $id,
            'status' => $payload['status'] ?? 'diagnosis',
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$updated) {
            json_error('Р вЂ”Р В°Р С”Р В°Р В· Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }
        json_response(map_order($updated), 200, 'Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…');
    }

    if ($method === 'POST' && route_matches('#^/orders/([^/]+)/payments$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $current = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$current) {
            json_error('Р вЂ”Р В°Р С”Р В°Р В· Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404);
        }

        $payload = json_input();
        $payments = decode_json_column($current['payments_json'], []);
        $payments[] = [
            'id' => (string) round(microtime(true) * 1000),
            'orderId' => $id,
            'amount' => (float) ($payload['amount'] ?? 0),
            'method' => $payload['method'] ?? 'cash',
            'status' => 'completed',
            'processedBy' => $payload['processedBy'] ?? 'CRM',
            'processedAt' => now_mysql(),
            'notes' => $payload['notes'] ?? '',
        ];

        $targetAmount = (float) ($current['final_cost'] ?: $current['estimated_cost']);
        $paidAmount = array_reduce($payments, static fn ($sum, $item) => $sum + (float) ($item['amount'] ?? 0), 0.0);
        $isPaid = $targetAmount > 0 && $paidAmount >= $targetAmount;

        db()->prepare(
            'UPDATE orders SET payments_json = :payments_json, is_paid = :is_paid, completed_at = :completed_at, updated_at = :updated_at WHERE id = :id'
        )->execute([
            'id' => $id,
            'payments_json' => json_encode($payments, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'is_paid' => bool_to_int($isPaid),
            'completed_at' => $isPaid ? now_mysql() : $current['completed_at'],
            'updated_at' => now_mysql(),
        ]);

        $updated = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_order($updated ?: []), 200, 'Р С›Р С—Р В»Р В°РЎвЂљР В° Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р В°');
    }

    if ($method === 'GET' && $path === '/inventory/parts') {
        require_auth();
        $rows = fetch_all_assoc('SELECT * FROM inventory_parts ORDER BY created_at DESC');
        json_response(array_map('map_part', $rows));
    }

    if ($method === 'POST' && $path === '/inventory/parts') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO inventory_parts (
                id, part_type, name, part_number, category, subcategory, brand, model, description, quantity, min_quantity,
                alert_threshold, notifications_enabled, wholesale_price, unit_price, supplier, supplier_contact, location_name, created_at, updated_at
             ) VALUES (
                :id, :part_type, :name, :part_number, :category, :subcategory, :brand, :model, :description, :quantity, :min_quantity,
                :alert_threshold, :notifications_enabled, :wholesale_price, :unit_price, :supplier, :supplier_contact, :location_name, :created_at, :updated_at
             )'
        )->execute([
            'id' => $id,
            'part_type' => $payload['partType'] ?? 'spare_part',
            'name' => $payload['name'] ?? '',
            'part_number' => $payload['partNumber'] ?? '',
            'category' => $payload['category'] ?? '',
            'subcategory' => $payload['subcategory'] ?? '',
            'brand' => $payload['brand'] ?? '',
            'model' => $payload['model'] ?? '',
            'description' => $payload['description'] ?? '',
            'quantity' => $payload['quantity'] ?? 0,
            'min_quantity' => $payload['minQuantity'] ?? 0,
            'alert_threshold' => $payload['alertThreshold'] ?? ($payload['minQuantity'] ?? 0),
            'notifications_enabled' => bool_to_int($payload['notificationsEnabled'] ?? true),
            'wholesale_price' => $payload['wholesalePrice'] ?? ($payload['unitPrice'] ?? 0),
            'unit_price' => $payload['unitPrice'] ?? 0,
            'supplier' => $payload['supplier'] ?? '',
            'supplier_contact' => $payload['supplierContact'] ?? '',
            'location_name' => $payload['location'] ?? '',
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_part($part ?: []), 201, 'Р вЂ”Р В°Р С—РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р В°');
    }

    if ($method === 'GET' && route_matches('#^/inventory/parts/([^/]+)$#', $path, $matches)) {
        require_auth();
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        if (!$part) {
            json_error('Р вЂ”Р В°Р С—РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°', 404);
        }
        json_response(map_part($part));
    }

    if ($method === 'PUT' && route_matches('#^/inventory/parts/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $current = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$current) {
            json_error('Р вЂ”Р В°Р С—РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°', 404);
        }
        $payload = json_input();
        db()->prepare(
            'UPDATE inventory_parts SET
                part_type = :part_type, name = :name, part_number = :part_number, category = :category, subcategory = :subcategory,
                brand = :brand, model = :model, description = :description, quantity = :quantity,
                min_quantity = :min_quantity, alert_threshold = :alert_threshold, notifications_enabled = :notifications_enabled,
                wholesale_price = :wholesale_price, unit_price = :unit_price, supplier = :supplier, supplier_contact = :supplier_contact,
                location_name = :location_name, updated_at = :updated_at
             WHERE id = :id'
        )->execute([
            'id' => $id,
            'part_type' => $payload['partType'] ?? ($current['part_type'] ?? 'spare_part'),
            'name' => $payload['name'] ?? $current['name'],
            'part_number' => $payload['partNumber'] ?? $current['part_number'],
            'category' => $payload['category'] ?? $current['category'],
            'subcategory' => $payload['subcategory'] ?? $current['subcategory'],
            'brand' => $payload['brand'] ?? $current['brand'],
            'model' => $payload['model'] ?? $current['model'],
            'description' => $payload['description'] ?? $current['description'],
            'quantity' => $payload['quantity'] ?? $current['quantity'],
            'min_quantity' => $payload['minQuantity'] ?? $current['min_quantity'],
            'alert_threshold' => $payload['alertThreshold'] ?? $current['alert_threshold'],
            'notifications_enabled' => bool_to_int($payload['notificationsEnabled'] ?? $current['notifications_enabled']),
            'wholesale_price' => $payload['wholesalePrice'] ?? ($current['wholesale_price'] ?? $current['unit_price']),
            'unit_price' => $payload['unitPrice'] ?? $current['unit_price'],
            'supplier' => $payload['supplier'] ?? $current['supplier'],
            'supplier_contact' => $payload['supplierContact'] ?? $current['supplier_contact'],
            'location_name' => $payload['location'] ?? $current['location_name'],
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_part($updated ?: []), 200, 'Р вЂ”Р В°Р С—РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р В°');
    }

    if ($method === 'DELETE' && route_matches('#^/inventory/parts/([^/]+)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$part) {
            json_error('???????? ?? ???????', 404);
        }
        db()->prepare('DELETE FROM stock_movements WHERE part_id = :part_id')->execute([
            'part_id' => $id,
        ]);
        db()->prepare('DELETE FROM inventory_parts WHERE id = :id')->execute([
            'id' => $id,
        ]);
        json_response(['deleted' => true], 200, '???????? ???????');
    }
    if ($method === 'POST' && route_matches('#^/inventory/parts/([^/]+)/(add-stock|deduct-stock)$#', $path, $matches)) {
        require_auth();
        $id = $matches[1];
        $mode = $matches[2];
        $payload = json_input();
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$part) {
            json_error('Р вЂ”Р В°Р С—РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°', 404);
        }

        $quantity = (int) ($payload['quantity'] ?? 0);
        if ($quantity <= 0) {
            json_error('Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р Т‘Р С•Р В»Р В¶Р Р…Р С• Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ Р Р…РЎС“Р В»РЎРЏ', 422);
        }

        $delta = $mode === 'add-stock' ? $quantity : -$quantity;
        $newQty = (int) $part['quantity'] + $delta;
        if ($newQty < 0) {
            json_error('Р СњР ВµР Т‘Р С•РЎРѓРЎвЂљР В°РЎвЂљР С•РЎвЂЎР Р…Р С• Р С•РЎРѓРЎвЂљР В°РЎвЂљР С”Р В° Р Р…Р В° РЎРѓР С”Р В»Р В°Р Т‘Р Вµ', 422);
        }

        db()->prepare('UPDATE inventory_parts SET quantity = :quantity, updated_at = :updated_at WHERE id = :id')->execute([
            'id' => $id,
            'quantity' => $newQty,
            'updated_at' => now_mysql(),
        ]);

        db()->prepare(
            'INSERT INTO stock_movements (
                id, part_id, part_name, quantity, direction, reason, unit_cost, total_cost, supplier,
                document_number, order_number, processed_by, created_at
             ) VALUES (
                :id, :part_id, :part_name, :quantity, :direction, :reason, :unit_cost, :total_cost, :supplier,
                :document_number, :order_number, :processed_by, :created_at
             )'
        )->execute([
            'id' => (string) round(microtime(true) * 1000),
            'part_id' => $id,
            'part_name' => $part['name'],
            'quantity' => $quantity,
            'direction' => $mode === 'add-stock' ? 'in' : 'out',
            'reason' => $payload['reason'] ?? ($mode === 'add-stock' ? 'Р С›Р С—РЎР‚Р С‘РЎвЂ¦Р С•Р Т‘Р С•Р Р†Р В°Р Р…Р С‘Р Вµ' : 'Р РЋР С—Р С‘РЎРѓР В°Р Р…Р С‘Р Вµ'),
            'unit_cost' => $payload['unitCost'] ?? $part['unit_price'],
            'total_cost' => ((float) ($payload['unitCost'] ?? $part['unit_price'])) * $quantity,
            'supplier' => $payload['supplier'] ?? $part['supplier'],
            'document_number' => $payload['documentNumber'] ?? '',
            'order_number' => $payload['orderNumber'] ?? '',
            'processed_by' => $payload['processedBy'] ?? 'CRM',
            'created_at' => now_mysql(),
        ]);

        $updated = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_part($updated ?: []), 200, $mode === 'add-stock' ? 'Р С›Р С—РЎР‚Р С‘РЎвЂ¦Р С•Р Т‘Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р Р†РЎвЂ№Р С—Р С•Р В»Р Р…Р ВµР Р…Р С•' : 'Р РЋР С—Р С‘РЎРѓР В°Р Р…Р С‘Р Вµ Р Р†РЎвЂ№Р С—Р С•Р В»Р Р…Р ВµР Р…Р С•');
    }

    if ($method === 'GET' && $path === '/inventory/movements') {
        require_auth();
        $rows = fetch_all_assoc('SELECT * FROM stock_movements ORDER BY created_at DESC');
        json_response(array_map('map_movement', $rows));
    }

    if ($method === 'GET' && $path === '/cash/operations') {
        require_auth();
        $rows = fetch_all_assoc('SELECT * FROM cash_operations ORDER BY processed_at DESC');
        json_response(array_map('map_cash_operation', $rows));
    }

    if ($method === 'POST' && $path === '/cash/operations') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO cash_operations (
                id, type, amount, description, category, subcategory, payment_method, register_type,
                source, order_id, processed_by, processed_at, notes
             ) VALUES (
                :id, :type, :amount, :description, :category, :subcategory, :payment_method, :register_type,
                :source, :order_id, :processed_by, :processed_at, :notes
             )'
        )->execute([
            'id' => $id,
            'type' => $payload['type'] ?? 'income',
            'amount' => $payload['amount'] ?? 0,
            'description' => $payload['description'] ?? '',
            'category' => $payload['category'] ?? '',
            'subcategory' => $payload['subcategory'] ?? '',
            'payment_method' => $payload['paymentMethod'] ?? '',
            'register_type' => $payload['registerType'] ?? '',
            'source' => $payload['source'] ?? 'manual',
            'order_id' => $payload['orderId'] ?? '',
            'processed_by' => $payload['processedBy'] ?? 'CRM',
            'processed_at' => $payload['processedAt'] ?? now_mysql(),
            'notes' => $payload['notes'] ?? '',
        ]);
        $operation = fetch_one_assoc('SELECT * FROM cash_operations WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_cash_operation($operation ?: []), 201, 'Р С›Р С—Р ВµРЎР‚Р В°РЎвЂ Р С‘РЎРЏ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…Р В°');
    }

    if ($method === 'DELETE' && route_matches('#^/cash/operations/([^/]+)$#', $path, $matches)) {
        require_auth();
        db()->prepare('DELETE FROM cash_operations WHERE id = :id')->execute(['id' => $matches[1]]);
        json_response(['deleted' => true], 200, 'Р С›Р С—Р ВµРЎР‚Р В°РЎвЂ Р С‘РЎРЏ РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р В°');
    }

    if ($method === 'GET' && $path === '/taxonomy/nodes') {
        require_auth();
        $scope = trim((string) ($_GET['scope'] ?? ''));
        if ($scope !== '') {
            $rows = fetch_all_assoc('SELECT * FROM taxonomy_nodes WHERE scope = :scope ORDER BY name ASC', ['scope' => $scope]);
        } else {
            $rows = fetch_all_assoc('SELECT * FROM taxonomy_nodes ORDER BY scope ASC, name ASC');
        }
        json_response(array_map('map_taxonomy_node', $rows));
    }

    if ($method === 'POST' && $path === '/taxonomy/nodes') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare('INSERT INTO taxonomy_nodes (id, scope, name, parent_id, created_at) VALUES (:id, :scope, :name, :parent_id, :created_at)')->execute([
            'id' => $id,
            'scope' => $payload['scope'] ?? 'inventory',
            'name' => $payload['name'] ?? '',
            'parent_id' => $payload['parentId'] ?? null,
            'created_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM taxonomy_nodes WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_taxonomy_node($row ?: []), 201, 'РљР°С‚РµРіРѕСЂРёСЏ СЃРѕС…СЂР°РЅРµРЅР°');
    }

    if ($method === 'PUT' && route_matches('#^/taxonomy/nodes/([^/]+)$#', $path, $matches)) {
        require_auth();
        $payload = json_input();
        db()->prepare('UPDATE taxonomy_nodes SET name = :name, parent_id = :parent_id WHERE id = :id')->execute([
            'id' => $matches[1],
            'name' => $payload['name'] ?? '',
            'parent_id' => array_key_exists('parentId', $payload) ? ($payload['parentId'] ?: null) : null,
        ]);
        $row = fetch_one_assoc('SELECT * FROM taxonomy_nodes WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_taxonomy_node($row ?: []), 200, 'РљР°С‚РµРіРѕСЂРёСЏ РѕР±РЅРѕРІР»РµРЅР°');
    }

    if ($method === 'DELETE' && route_matches('#^/taxonomy/nodes/([^/]+)$#', $path, $matches)) {
        require_auth();
        $nodeId = $matches[1];
        $node = fetch_one_assoc('SELECT id FROM taxonomy_nodes WHERE id = :id LIMIT 1', ['id' => $nodeId]);
        if (!$node) {
            json_error('Категория не найдена', 404);
        }

        delete_taxonomy_branch($nodeId);
        json_response(['deleted' => true], 200, 'РљР°С‚РµРіРѕСЂРёСЏ СѓРґР°Р»РµРЅР°');
    }

    if ($method === 'GET' && $path === '/documents/acceptance-acts') {
        require_auth();
        $orderId = trim((string) ($_GET['orderId'] ?? ''));
        if ($orderId !== '') {
            $row = fetch_one_assoc('SELECT * FROM acceptance_acts WHERE order_id = :order_id LIMIT 1', ['order_id' => $orderId]);
            json_response($row ? map_acceptance_act($row) : null);
        }
        $rows = fetch_all_assoc('SELECT * FROM acceptance_acts ORDER BY created_at DESC');
        json_response(array_map('map_acceptance_act', $rows));
    }

    if ($method === 'POST' && $path === '/documents/acceptance-acts') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $orderId = (string) ($payload['orderId'] ?? '');
        $orderNumber = (string) ($payload['orderNumber'] ?? '');
        db()->prepare('INSERT INTO acceptance_acts (id, order_id, order_number, document_number, client_json, device_json, problem_description, preliminary_cost, advance_payment, acceptance_date, accepted_by, conditions_text, client_signature_json, master_signature_json, printed_at, created_at, updated_at) VALUES (:id, :order_id, :order_number, :document_number, :client_json, :device_json, :problem_description, :preliminary_cost, :advance_payment, :acceptance_date, :accepted_by, :conditions_text, :client_signature_json, :master_signature_json, :printed_at, :created_at, :updated_at) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number), document_number = VALUES(document_number), client_json = VALUES(client_json), device_json = VALUES(device_json), problem_description = VALUES(problem_description), preliminary_cost = VALUES(preliminary_cost), advance_payment = VALUES(advance_payment), acceptance_date = VALUES(acceptance_date), accepted_by = VALUES(accepted_by), conditions_text = VALUES(conditions_text), updated_at = VALUES(updated_at)')->execute([
            'id' => $id,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'document_number' => 'РђРџ-' . $orderNumber,
            'client_json' => json_encode($payload['client'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'device_json' => json_encode($payload['device'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'problem_description' => $payload['problemDescription'] ?? '',
            'preliminary_cost' => $payload['preliminaryCost'] ?? 0,
            'advance_payment' => $payload['advancePayment'] ?? 0,
            'acceptance_date' => $payload['acceptanceDate'] ?? now_mysql(),
            'accepted_by' => $payload['acceptedBy'] ?? '',
            'conditions_text' => $payload['conditions'] ?? '',
            'client_signature_json' => json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'master_signature_json' => json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'printed_at' => null,
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM acceptance_acts WHERE order_id = :order_id LIMIT 1', ['order_id' => $orderId]);
        json_response(map_acceptance_act($row ?: []), 201, 'РђРєС‚ РїСЂРёРµРјР°-РїРµСЂРµРґР°С‡Рё СЃРѕС…СЂР°РЅРµРЅ');
    }

    if ($method === 'POST' && route_matches('#^/documents/acceptance-acts/([^/]+)/signature$#', $path, $matches)) {
        require_auth();
        $payload = json_input();
        $field = ($payload['signerRole'] ?? '') === 'client' ? 'client_signature_json' : 'master_signature_json';
        db()->prepare("UPDATE acceptance_acts SET $field = :signature, updated_at = :updated_at WHERE id = :id")->execute([
            'id' => $matches[1],
            'signature' => json_encode([
                'signerName' => $payload['signerName'] ?? '',
                'signerRole' => $payload['signerRole'] ?? '',
                'signatureData' => $payload['signatureData'] ?? '',
                'ipAddress' => $payload['ipAddress'] ?? '',
                'userAgent' => $payload['userAgent'] ?? '',
                'signedAt' => now_mysql(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM acceptance_acts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_acceptance_act($row ?: []), 200, 'РџРѕРґРїРёСЃСЊ СЃРѕС…СЂР°РЅРµРЅР°');
    }

    if ($method === 'POST' && route_matches('#^/documents/acceptance-acts/([^/]+)/printed$#', $path, $matches)) {
        require_auth();
        db()->prepare('UPDATE acceptance_acts SET printed_at = :printed_at, updated_at = :updated_at WHERE id = :id')->execute([
            'id' => $matches[1],
            'printed_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM acceptance_acts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_acceptance_act($row ?: []), 200, 'РЎС‚Р°С‚СѓСЃ РїРµС‡Р°С‚Рё РѕР±РЅРѕРІР»РµРЅ');
    }

    if ($method === 'GET' && $path === '/documents/completion-acts') {
        require_auth();
        $orderId = trim((string) ($_GET['orderId'] ?? ''));
        if ($orderId !== '') {
            $row = fetch_one_assoc('SELECT * FROM work_completion_acts WHERE order_id = :order_id LIMIT 1', ['order_id' => $orderId]);
            json_response($row ? map_work_completion_act($row) : null);
        }
        $rows = fetch_all_assoc('SELECT * FROM work_completion_acts ORDER BY created_at DESC');
        json_response(array_map('map_work_completion_act', $rows));
    }

    if ($method === 'POST' && $path === '/documents/completion-acts') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $orderId = (string) ($payload['orderId'] ?? '');
        $orderNumber = (string) ($payload['orderNumber'] ?? '');
        db()->prepare('INSERT INTO work_completion_acts (id, order_id, order_number, document_number, client_json, device_json, works_json, parts_json, total_cost, warranty_period, completion_date, completed_by, client_signature_json, master_signature_json, printed_at, created_at, updated_at) VALUES (:id, :order_id, :order_number, :document_number, :client_json, :device_json, :works_json, :parts_json, :total_cost, :warranty_period, :completion_date, :completed_by, :client_signature_json, :master_signature_json, :printed_at, :created_at, :updated_at) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number), document_number = VALUES(document_number), client_json = VALUES(client_json), device_json = VALUES(device_json), works_json = VALUES(works_json), parts_json = VALUES(parts_json), total_cost = VALUES(total_cost), warranty_period = VALUES(warranty_period), completion_date = VALUES(completion_date), completed_by = VALUES(completed_by), updated_at = VALUES(updated_at)')->execute([
            'id' => $id,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'document_number' => 'РђР’Р -' . $orderNumber,
            'client_json' => json_encode($payload['client'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'device_json' => json_encode($payload['device'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'works_json' => json_encode($payload['worksPerformed'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'parts_json' => json_encode($payload['partsUsed'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'total_cost' => $payload['totalCost'] ?? 0,
            'warranty_period' => $payload['warrantyPeriod'] ?? 0,
            'completion_date' => $payload['completionDate'] ?? now_mysql(),
            'completed_by' => $payload['completedBy'] ?? '',
            'client_signature_json' => json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'master_signature_json' => json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'printed_at' => null,
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM work_completion_acts WHERE order_id = :order_id LIMIT 1', ['order_id' => $orderId]);
        json_response(map_work_completion_act($row ?: []), 201, 'РђРєС‚ РІС‹РїРѕР»РЅРµРЅРЅС‹С… СЂР°Р±РѕС‚ СЃРѕС…СЂР°РЅРµРЅ');
    }

    if ($method === 'POST' && route_matches('#^/documents/completion-acts/([^/]+)/signature$#', $path, $matches)) {
        require_auth();
        $payload = json_input();
        $field = ($payload['signerRole'] ?? '') === 'client' ? 'client_signature_json' : 'master_signature_json';
        db()->prepare("UPDATE work_completion_acts SET $field = :signature, updated_at = :updated_at WHERE id = :id")->execute([
            'id' => $matches[1],
            'signature' => json_encode([
                'signerName' => $payload['signerName'] ?? '',
                'signerRole' => $payload['signerRole'] ?? '',
                'signatureData' => $payload['signatureData'] ?? '',
                'ipAddress' => $payload['ipAddress'] ?? '',
                'userAgent' => $payload['userAgent'] ?? '',
                'signedAt' => now_mysql(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM work_completion_acts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_work_completion_act($row ?: []), 200, 'РџРѕРґРїРёСЃСЊ СЃРѕС…СЂР°РЅРµРЅР°');
    }

    if ($method === 'POST' && route_matches('#^/documents/completion-acts/([^/]+)/printed$#', $path, $matches)) {
        require_auth();
        db()->prepare('UPDATE work_completion_acts SET printed_at = :printed_at, updated_at = :updated_at WHERE id = :id')->execute([
            'id' => $matches[1],
            'printed_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM work_completion_acts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_work_completion_act($row ?: []), 200, 'РЎС‚Р°С‚СѓСЃ РїРµС‡Р°С‚Рё РѕР±РЅРѕРІР»РµРЅ');
    }

    if ($method === 'GET' && $path === '/documents/storage') {
        require_auth();
        $orderId = trim((string) ($_GET['orderId'] ?? ''));
        if ($orderId !== '') {
            $rows = fetch_all_assoc('SELECT * FROM document_storage WHERE order_id = :order_id ORDER BY created_at DESC', ['order_id' => $orderId]);
        } else {
            $rows = fetch_all_assoc('SELECT * FROM document_storage ORDER BY created_at DESC');
        }
        json_response(array_map('map_document_storage', $rows));
    }

    if ($method === 'POST' && $path === '/documents/storage') {
        require_auth();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare('INSERT INTO document_storage (id, order_id, document_type, document_id, file_path, file_size, mime_type, created_at) VALUES (:id, :order_id, :document_type, :document_id, :file_path, :file_size, :mime_type, :created_at)')->execute([
            'id' => $id,
            'order_id' => $payload['orderId'] ?? '',
            'document_type' => $payload['documentType'] ?? 'acceptance',
            'document_id' => $payload['documentId'] ?? '',
            'file_path' => $payload['filePath'] ?? '',
            'file_size' => $payload['fileSize'] ?? 0,
            'mime_type' => $payload['mimeType'] ?? 'application/pdf',
            'created_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM document_storage WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_document_storage($row ?: []), 201, 'Р”РѕРєСѓРјРµРЅС‚ СЃРѕС…СЂР°РЅРµРЅ');
    }

    json_error('Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…', 404, ['path' => $path, 'method' => $method]);
} catch (PDOException $exception) {
    json_error('Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В±Р В°Р В·РЎвЂ№ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦: ' . $exception->getMessage(), 500);
} catch (Throwable $exception) {
    json_error('Р вЂ™Р Р…РЎС“РЎвЂљРЎР‚Р ВµР Р…Р Р…РЎРЏРЎРЏ Р С•РЎв‚¬Р С‘Р В±Р С”Р В°: ' . $exception->getMessage(), 500);
}

