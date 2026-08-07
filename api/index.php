<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/employee_access.php';
require_once __DIR__ . '/document_templates.php';

$allowedOrigins = (function () {
    $cfg = app_config('app')['cors_origin'] ?? '*';
    if (is_array($cfg)) {
        return array_values(array_filter(array_map('strval', $cfg)));
    }
    if (is_string($cfg)) {
        return array_values(array_filter(array_map('trim', explode(',', $cfg))));
    }
    return ['*'];
})();

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
$hostOrigin = $host !== '' ? (($isHttps ? 'https' : 'http') . '://' . $host) : '';

$allowOrigin = null;
if (in_array('*', $allowedOrigins, true)) {
    $allowOrigin = $requestOrigin !== '' ? $requestOrigin : '*';
} elseif ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    $allowOrigin = $requestOrigin;
} elseif ($requestOrigin !== '' && $hostOrigin !== '' && $requestOrigin === $hostOrigin) {
    $allowOrigin = $requestOrigin;
} elseif ($requestOrigin !== '' && preg_match('#^https?://([a-z0-9-]+\\.)?nakcrm\\.ru$#i', $requestOrigin) === 1) {
    $allowOrigin = $requestOrigin;
} elseif ($requestOrigin !== '' && preg_match('#^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$#', $requestOrigin) === 1) {
    $allowOrigin = $requestOrigin;
}

if ($allowOrigin === null || $allowOrigin === '') {
    $allowOrigin = $allowedOrigins[0] ?? '*';
}

if ($allowOrigin !== '*') {
    header('Access-Control-Allow-Origin: ' . $allowOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
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

function default_employee_allowed_modules(): array
{
    return [
        '/dashboard',
        '/orders',
        '/messages',
        '/clients',
        '/inventory',
        '/employees',
        '/cash-register',
        '/reports',
        '/my-profile',
    ];
}

function default_employee_visible_sections(): array
{
    return [
        'documents',
        'business',
        'locations',
        'employees',
        'integrations',
        'orders',
        'quickSales',
        'statuses',
        'notifications',
        'paymentCategories',
        'paymentMethods',
        'clientFields',
    ];
}

function is_legacy_minimal_visible_sections(?array $sections): bool
{
    return is_array($sections) && count($sections) === 1 && ($sections[0] ?? '') === 'profile';
}

function default_self_editable_fields(): array
{
    return ['avatar', 'phone'];
}

function allowed_settings_section_keys(): array
{
    return [
        'business',
        'locations',
        'employees',
        'documents',
        'integrations',
        'orders',
        'quickSales',
        'statuses',
        'notifications',
        'paymentCategories',
        'paymentMethods',
        'clientTypes',
        'clientFields',
        'directories',
    ];
}

function normalize_visible_sections(?array $sections, ?array $fallback = null): array
{
    if (is_legacy_minimal_visible_sections($sections)) {
        $sections = null;
    }
    if (is_legacy_minimal_visible_sections($fallback)) {
        $fallback = null;
    }

    $allowed = allowed_settings_section_keys();
    $source = is_array($sections) && count($sections) > 0
        ? $sections
        : (is_array($fallback) && count($fallback) > 0 ? $fallback : default_employee_visible_sections());

    $mapped = array_map(static fn($key) => $key === 'warehouse' ? 'locations' : $key, $source);
    $filtered = array_values(array_intersect($mapped, $allowed));

    if (!in_array('quickSales', $filtered, true)
        && (in_array('orders', $filtered, true) || in_array('statuses', $filtered, true))) {
        $ordersIndex = array_search('orders', $filtered, true);
        if ($ordersIndex !== false) {
            array_splice($filtered, (int) $ordersIndex + 1, 0, ['quickSales']);
        } else {
            $filtered[] = 'quickSales';
        }
        $filtered = array_values(array_unique($filtered));
    }

    return count($filtered) > 0 ? $filtered : default_employee_visible_sections();
}

function normalize_self_editable_fields(?array $fields, ?array $fallback = null): array
{
    $allowed = ['avatar', 'phone', 'name'];
    $source = is_array($fields) && count($fields) > 0
        ? $fields
        : (is_array($fallback) && count($fallback) > 0 ? $fallback : default_self_editable_fields());

    $filtered = array_values(array_intersect($source, $allowed));
    return count($filtered) > 0 ? $filtered : default_self_editable_fields();
}

function parse_user_access_from_row(array $row): array
{
    $global = get_employee_access_from_settings();
    $raw = trim((string) ($row['access_json'] ?? ''));
    if ($raw === '') {
        return [
            'allowedModules' => default_employee_allowed_modules(),
            'visibleSections' => normalize_visible_sections(null, $global['visibleSections'] ?? null),
            'selfEditableFields' => normalize_self_editable_fields(null, $global['selfEditableFields'] ?? null),
        ];
    }

    $decoded = decode_json_column($raw, []);
    $modules = isset($decoded['allowedModules']) && is_array($decoded['allowedModules'])
        ? array_values(array_intersect($decoded['allowedModules'], default_employee_allowed_modules()))
        : [];

    $hasVisibleSections = array_key_exists('visibleSections', $decoded);
    $hasSelfEditableFields = array_key_exists('selfEditableFields', $decoded);

    return [
        'allowedModules' => count($modules) > 0 ? $modules : default_employee_allowed_modules(),
        'visibleSections' => normalize_visible_sections(
            $hasVisibleSections ? ($decoded['visibleSections'] ?? null) : null,
            $hasVisibleSections ? null : ($global['visibleSections'] ?? null)
        ),
        'selfEditableFields' => normalize_self_editable_fields(
            $hasSelfEditableFields ? ($decoded['selfEditableFields'] ?? null) : null,
            $hasSelfEditableFields ? null : ($global['selfEditableFields'] ?? null)
        ),
    ];
}

function encode_user_access_json(?array $access): string
{
    $modules = default_employee_allowed_modules();
    $visibleSections = default_employee_visible_sections();
    $selfEditableFields = default_self_editable_fields();

    if (is_array($access)) {
        if (isset($access['allowedModules']) && is_array($access['allowedModules'])) {
            $filtered = array_values(array_intersect($access['allowedModules'], default_employee_allowed_modules()));
            if (count($filtered) > 0) {
                $modules = $filtered;
            }
        }
        if (array_key_exists('visibleSections', $access)) {
            $visibleSections = normalize_visible_sections(is_array($access['visibleSections']) ? $access['visibleSections'] : null);
        }
        if (array_key_exists('selfEditableFields', $access)) {
            $selfEditableFields = normalize_self_editable_fields(is_array($access['selfEditableFields']) ? $access['selfEditableFields'] : null);
        }
    }

    return json_encode([
        'allowedModules' => $modules,
        'visibleSections' => $visibleSections,
        'selfEditableFields' => $selfEditableFields,
    ], JSON_UNESCAPED_UNICODE);
}

function merge_employee_access_for_user(array $row): array
{
    $userAccess = parse_user_access_from_row($row);

    return [
        'visibleSections' => $userAccess['visibleSections'],
        'selfEditableFields' => $userAccess['selfEditableFields'],
        'allowedModules' => $userAccess['allowedModules'],
    ];
}

function attach_employee_access_if_needed(array $payload, array $row): array
{
    if (($row['role'] ?? '') === 'admin') {
        return $payload;
    }

    $payload['employeeAccess'] = merge_employee_access_for_user($row);
    return $payload;
}

function map_user(array $row, bool $includeAvatar = true): array
{
    $mapped = [
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
        'emailVerified' => normalize_bool($row['email_verified'] ?? true),
        'hireDate' => (string) ($row['hire_date'] ?? ''),
        'lastLogin' => (string) ($row['last_login'] ?? ''),
        'access' => (($row['role'] ?? '') === 'admin') ? null : parse_user_access_from_row($row),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];

    if ($includeAvatar) {
        $mapped['avatar'] = (string) ($row['avatar'] ?? '');
    }

    return $mapped;
}

function get_employee_access_from_settings(): array
{
    $row = fetch_one_assoc('SELECT payload_json FROM app_settings WHERE `key` = :key LIMIT 1', ['key' => 'default']);
    if (!$row) {
        return [
            'visibleSections' => default_employee_visible_sections(),
            'selfEditableFields' => ['avatar', 'phone'],
        ];
    }
    $payload = decode_json_column($row['payload_json'], []);
    $access = is_array($payload['employeeAccess'] ?? null) ? $payload['employeeAccess'] : [];
    $visibleSections = isset($access['visibleSections']) && is_array($access['visibleSections'])
        ? array_values($access['visibleSections'])
        : default_employee_visible_sections();
    if (is_legacy_minimal_visible_sections($visibleSections)) {
        $visibleSections = default_employee_visible_sections();
    }
    return [
        'visibleSections' => $visibleSections,
        'selfEditableFields' => isset($access['selfEditableFields']) && is_array($access['selfEditableFields'])
            ? array_values(array_intersect($access['selfEditableFields'], ['avatar', 'phone', 'name']))
            : ['avatar', 'phone'],
    ];
}

function map_client(array $row): array
{
    $customFields = [];
    if (!empty($row['custom_fields_json'])) {
        $decoded = json_decode((string) $row['custom_fields_json'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $key => $value) {
                if (is_string($key)) {
                    $customFields[$key] = (string) $value;
                }
            }
        }
    }

    return [
        'id' => (string) $row['id'],
        'firstName' => (string) $row['first_name'],
        'lastName' => (string) ($row['last_name'] ?? ''),
        'phone' => (string) $row['phone'],
        'telegramChatId' => (string) ($row['telegram_chat_id'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'address' => (string) ($row['address'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'customFields' => $customFields,
        'totalOrders' => (int) ($row['total_orders'] ?? 0),
        'totalSpent' => (float) ($row['total_spent'] ?? 0),
        'lastOrderDate' => $row['last_order_date'],
        'createdAt' => (string) $row['created_at'],
        'updatedAt' => (string) $row['updated_at'],
    ];
}

function encode_client_custom_fields($payload, ?array $current = null): string
{
    $customFields = is_array($current) ? $current : [];
    if (isset($payload['customFields']) && is_array($payload['customFields'])) {
        $customFields = [];
        foreach ($payload['customFields'] as $key => $value) {
            if (is_string($key)) {
                $customFields[$key] = (string) $value;
            }
        }
    }

    return json_encode($customFields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
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

function map_order(array $row, bool $lite = false): array
{
    $row = apply_live_client_fields_to_order_row($row);

    $mapped = [
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
        'createdAt' => (string) $row['created_at'],
        'updatedAt' => (string) $row['updated_at'],
        'completedAt' => $row['completed_at'],
        'isPaid' => normalize_bool($row['is_paid'] ?? false),
        'isWarranty' => normalize_bool($row['is_warranty'] ?? false),
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

    $mapped['devicePassword'] = (string) ($row['device_password'] ?? '');

    if ($lite) {
        $mapped['communicationHistory'] = [];
    } else {
        $mapped['communicationHistory'] = decode_json_column($row['communication_history_json'] ?? '[]');
    }

    return $mapped;
}

/**
 * Prefer live client card name/phone over denormalized order snapshots.
 */
function apply_live_client_fields_to_order_row(array $row): array
{
    static $clientCache = [];

    $liveName = trim((string) ($row['live_client_name'] ?? ''));
    $livePhone = trim((string) ($row['live_client_phone'] ?? ''));
    if ($liveName !== '' || $livePhone !== '') {
        if ($liveName !== '') {
            $row['client_name'] = $liveName;
        }
        if ($livePhone !== '') {
            $row['client_phone'] = $livePhone;
        }
        unset($row['live_client_name'], $row['live_client_phone']);
        return $row;
    }

    $clientId = trim((string) ($row['client_id'] ?? ''));
    if ($clientId === '') {
        return $row;
    }

    if (!array_key_exists($clientId, $clientCache)) {
        $clientCache[$clientId] = fetch_one_assoc(
            'SELECT first_name, last_name, phone FROM clients WHERE id = :id LIMIT 1',
            ['id' => $clientId]
        ) ?: null;
    }

    $client = $clientCache[$clientId];
    if (!$client) {
        return $row;
    }

    $name = trim(trim((string) ($client['first_name'] ?? '')) . ' ' . trim((string) ($client['last_name'] ?? '')));
    if ($name !== '') {
        $row['client_name'] = $name;
    }
    $phone = trim((string) ($client['phone'] ?? ''));
    if ($phone !== '') {
        $row['client_phone'] = $phone;
    }

    return $row;
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
        'notificationsEnabled' => normalize_bool($row['notifications_enabled'] ?? false),
        'unitPrice' => (float) ($row['unit_price'] ?? 0),
        'wholesalePrice' => (float) ($row['wholesale_price'] ?? ($row['unit_price'] ?? 0)),
        'supplier' => (string) ($row['supplier'] ?? ''),
        'supplierContact' => (string) ($row['supplier_contact'] ?? ''),
        'location' => (string) ($row['location_name'] ?? ''),
        'warehouseId' => (string) ($row['warehouse_id'] ?? ''),
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
        'estimatedDays' => (int) ($row['estimated_days'] ?? 0),
        'estimatedCompletionDate' => (string) ($row['estimated_completion_date'] ?? ''),
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
    $user = $GLOBALS['__current_auth_user'] ?? null;
    $tenantId = is_array($user) ? user_tenant_id($user) : 1;
    save_settings_for_tenant($tenantId, $payload);
    invalidate_app_settings_migrated_cache();
}

function load_app_settings(?int $tenantId = null): array
{
    if ($tenantId === null) {
        $user = $GLOBALS['__current_auth_user'] ?? null;
        $tenantId = is_array($user) ? user_tenant_id($user) : 1;
    }
    $key = tenant_settings_key($tenantId);
    $settings = fetch_one_assoc('SELECT payload_json FROM app_settings WHERE `key` = :key LIMIT 1', ['key' => $key]);
    return $settings ? decode_json_column($settings['payload_json'], []) : [];
}

function filter_settings_for_employee(array $settings): array
{
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];

    $settings['integrations'] = [
        'smsProvider' => $integrations['smsProvider'] ?? 'none',
        'smsConnected' => (bool) ($integrations['smsConnected'] ?? false),
        'smsCredentials' => [],
        'smsWebhookUrl' => '',
        'smsApiToken' => '',
        'smsSenderName' => $integrations['smsSenderName'] ?? '',
        'smsTemplateReady' => $integrations['smsTemplateReady'] ?? '',
        'smsStatusTemplates' => is_array($integrations['smsStatusTemplates'] ?? null) ? $integrations['smsStatusTemplates'] : [],
        'smsWebhookMethod' => $integrations['smsWebhookMethod'] ?? 'POST',
        'telegramMode' => $integrations['telegramMode'] ?? 'crm',
        'telegramLinkTemplate' => $integrations['telegramLinkTemplate'] ?? '',
        'telegramConnected' => (bool) ($integrations['telegramConnected'] ?? false),
        'telegramBotToken' => '',
        'telegramBotUsername' => $integrations['telegramBotUsername'] ?? '',
        'callMode' => $integrations['callMode'] ?? 'tel',
        'callLinkTemplate' => $integrations['callLinkTemplate'] ?? '',
    ];

    if (isset($settings['license']) && is_array($settings['license'])) {
        $settings['license'] = [
            'plan' => $settings['license']['plan'] ?? 'standard',
            'key' => '',
        ];
    }

    unset($settings['employeeAccess']);

    return $settings;
}

function settings_for_user(array $user): array
{
    $settings = load_app_settings_migrated();

    if (($user['role'] ?? '') === 'admin') {
        return $settings;
    }

    return filter_settings_for_employee($settings);
}

function normalize_sms_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) === 11 && str_starts_with($digits, '8')) {
        return '7' . substr($digits, 1);
    }
    if (strlen($digits) === 10) {
        return '7' . $digits;
    }
    return $digits;
}

function sms_provider_credentials(array $integrations): array
{
    $credentials = is_array($integrations['smsCredentials'] ?? null) ? $integrations['smsCredentials'] : [];
    if ($credentials) {
        return $credentials;
    }

    return [
        'webhookUrl' => (string) ($integrations['smsWebhookUrl'] ?? ''),
        'webhookToken' => (string) ($integrations['smsApiToken'] ?? ''),
        'webhookMethod' => (string) ($integrations['smsWebhookMethod'] ?? 'POST'),
        'senderName' => (string) ($integrations['smsSenderName'] ?? ''),
    ];
}

function sms_sender_name(array $integrations, array $settings): string
{
    $credentials = sms_provider_credentials($integrations);
    $sender = trim((string) ($credentials['senderName'] ?? ''));
    if ($sender !== '') {
        return $sender;
    }
    $fallback = trim((string) ($integrations['smsSenderName'] ?? ''));
    if ($fallback !== '') {
        return $fallback;
    }
    return trim((string) ($settings['business']['companyName'] ?? 'CRM'));
}

function sanitize_sms_template(string $template): string
{
    $text = strip_tags($template);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace_callback('/\{\{(.*?)\}\}/us', static function (array $matches): string {
        $key = preg_replace('/\s+/u', '', html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? $matches[1];

        return '{{' . $key . '}}';
    }, $text) ?? $text;

    $text = preg_replace("/\r\n?/", "\n", $text) ?? $text;
    $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;

    return trim($text);
}

function calculate_order_total(array $order): float
{
    $parts = is_array($order['parts'] ?? null) ? $order['parts'] : [];
    $itemsTotal = 0.0;
    foreach ($parts as $part) {
        if (!is_array($part)) {
            continue;
        }
        $itemsTotal += (float) ($part['totalPrice'] ?? 0);
    }

    if ($itemsTotal > 0) {
        return $itemsTotal;
    }

    return (float) ($order['finalCost'] ?? $order['estimatedCost'] ?? 0);
}

function resolve_telegram_bot_username(array $integrations): string
{
    $username = ltrim(trim((string) ($integrations['telegramBotUsername'] ?? '')), '@');
    if ($username !== '') {
        return $username;
    }
    if (empty($integrations['telegramConnected'])) {
        return '';
    }
    $token = trim((string) ($integrations['telegramBotToken'] ?? ''));
    if ($token === '') {
        return '';
    }
    $me = telegram_api_request($token, 'getMe', []);
    if (empty($me['success']) || !is_array($me['result'] ?? null)) {
        return '';
    }

    return ltrim(trim((string) ($me['result']['username'] ?? '')), '@');
}

function ensure_telegram_bot_username_in_settings(array $settings): array
{
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $username = resolve_telegram_bot_username($integrations);
    if ($username === '') {
        return $settings;
    }
    if (ltrim(trim((string) ($integrations['telegramBotUsername'] ?? '')), '@') === $username) {
        return $settings;
    }
    $integrations['telegramBotUsername'] = $username;
    $settings['integrations'] = $integrations;
    save_settings($settings);

    return $settings;
}

function build_telegram_bot_link_for_order(array $order, array $integrations): string
{
    $botUsername = resolve_telegram_bot_username($integrations);
    if ($botUsername === '') {
        return '';
    }
    $phoneDigits = preg_replace('/\D+/', '', (string) ($order['clientPhone'] ?? '')) ?? '';
    $telegramStartSuffix = strlen($phoneDigits) > 10 ? substr($phoneDigits, -10) : $phoneDigits;
    if ($telegramStartSuffix === '') {
        return 'https://t.me/' . $botUsername;
    }

    return 'https://t.me/' . $botUsername . '?start=link_' . $telegramStartSuffix;
}

function build_sms_replacements(array $order, array $settings, float $debt): array
{
    $business = is_array($settings['business'] ?? null) ? $settings['business'] : [];
    $device = trim(((string) ($order['deviceBrand'] ?? '')) . ' ' . ((string) ($order['deviceModel'] ?? '')));
    $clientName = trim((string) ($order['clientName'] ?? ''));
    if ($clientName === '') {
        $clientName = 'клиент';
    }
    $orderNumber = trim((string) ($order['orderNumber'] ?? ''));
    $companyName = trim((string) ($business['companyName'] ?? ''));
    $companyPhone = trim((string) ($business['phone'] ?? ''));
    $companyAddress = trim((string) ($business['address'] ?? ''));
    $clientPhone = format_phone_for_display(trim((string) ($order['clientPhone'] ?? '')));
    $totalCost = calculate_order_total($order);
    $status = (string) ($order['status'] ?? '');
    $statusLabel = resolve_order_status_label($status, $settings);
    $debtFormatted = number_format($debt, 0, '.', ' ');
    $totalFormatted = number_format($totalCost, 0, '.', ' ');
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $botUsername = resolve_telegram_bot_username($integrations);
    $phoneDigits = preg_replace('/\D+/', '', (string) ($order['clientPhone'] ?? '')) ?? '';
    $telegramStartSuffix = strlen($phoneDigits) > 10 ? substr($phoneDigits, -10) : $phoneDigits;
    $telegramStartParam = $telegramStartSuffix !== '' ? 'link_' . $telegramStartSuffix : '';
    $telegramBotLink = build_telegram_bot_link_for_order($order, $integrations);

    return [
        'ФИОКлиента' => $clientName,
        'clientName' => $clientName,
        'НомерЗаказа' => $orderNumber,
        'orderNumber' => $orderNumber,
        'НазваниеКомпании' => $companyName,
        'companyName' => $companyName,
        'ТелефонКомпании' => $companyPhone,
        'companyPhone' => $companyPhone,
        'АдресКомпании' => $companyAddress,
        'companyAddress' => $companyAddress,
        'ТелефонКлиента' => $clientPhone,
        'phone' => $clientPhone,
        'Долг' => $debtFormatted,
        'debt' => $debtFormatted,
        'amount' => $debtFormatted,
        'ИтоговаяСтоимость' => $totalFormatted,
        'total' => $totalFormatted,
        'Устройство' => $device,
        'device' => $device,
        'status' => $statusLabel,
        'СтатусЗаказа' => $statusLabel,
        'telegramBotLink' => $telegramBotLink,
        'telegramStartParam' => $telegramStartParam,
    ];
}

function sms_telegram_link_suffix(): string
{
    return ' Чат в Telegram: {{telegramBotLink}}';
}

function migrate_sms_status_keys(array $settings): array
{
    $legacyMap = [
        'waitingParts' => 'waiting_parts',
        'waitingClient' => 'waiting_client',
        'inProgress' => 'in_progress',
    ];

    $notifications = is_array($settings['notifications'] ?? null) ? $settings['notifications'] : [];
    $triggers = is_array($notifications['smsStatusTriggers'] ?? null) ? $notifications['smsStatusTriggers'] : [];
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $templates = is_array($integrations['smsStatusTemplates'] ?? null) ? $integrations['smsStatusTemplates'] : [];
    $changed = false;

    foreach ($legacyMap as $legacy => $modern) {
        if (array_key_exists($legacy, $triggers)) {
            if (!array_key_exists($modern, $triggers)) {
                $triggers[$modern] = $triggers[$legacy];
            }
            unset($triggers[$legacy]);
            $changed = true;
        }
        if (array_key_exists($legacy, $templates)) {
            if (!array_key_exists($modern, $templates) || trim((string) $templates[$modern]) === '') {
                $templates[$modern] = $templates[$legacy];
            }
            unset($templates[$legacy]);
            $changed = true;
        }
    }

    if (!$changed) {
        return $settings;
    }

    $notifications['smsStatusTriggers'] = $triggers;
    $integrations['smsStatusTemplates'] = $templates;
    $settings['notifications'] = $notifications;
    $settings['integrations'] = $integrations;
    save_settings($settings);

    return $settings;
}

function migrate_sms_templates_telegram_link(array $settings): array
{
    $migrationVersion = (int) ($settings['integrations']['smsTemplatesTelegramMigrated'] ?? 0);
    if ($migrationVersion >= 2) {
        return $settings;
    }

    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $suffix = sms_telegram_link_suffix();
    $changed = false;

    $templates = is_array($integrations['smsStatusTemplates'] ?? null) ? $integrations['smsStatusTemplates'] : [];
    foreach ($templates as $key => $value) {
        $text = trim((string) $value);
        if ($text !== '' && !str_contains($text, 'telegramBotLink')) {
            $templates[$key] = $text . $suffix;
            $changed = true;
        }
    }

    $ready = trim((string) ($integrations['smsTemplateReady'] ?? ''));
    if ($ready !== '' && !str_contains($ready, 'telegramBotLink')) {
        $integrations['smsTemplateReady'] = $ready . $suffix;
        $changed = true;
    }

    if ($changed) {
        $integrations['smsStatusTemplates'] = $templates;
    }

    $integrations['smsTemplatesTelegramMigrated'] = 2;
    $settings['integrations'] = $integrations;
    save_settings($settings);

    return $settings;
}

function &app_settings_migrated_cache_storage(): array
{
    static $cache = ['value' => null, 'valid' => false];

    return $cache;
}

function invalidate_app_settings_migrated_cache(): void
{
    $storage = &app_settings_migrated_cache_storage();
    $storage['valid'] = false;
    $storage['value'] = null;
}

function load_app_settings_migrated(): array
{
    $storage = &app_settings_migrated_cache_storage();
    if ($storage['valid'] && is_array($storage['value'])) {
        return $storage['value'];
    }

    $storage['value'] = migrate_document_templates_in_settings(
        ensure_telegram_bot_username_in_settings(
            migrate_sms_status_keys(migrate_sms_templates_telegram_link(load_app_settings()))
        )
    );
    $storage['valid'] = true;

    return $storage['value'];
}

function build_sms_message(string $template, array $order, array $settings, float $debt): string
{
    $template = sanitize_sms_template($template);
    $replacements = build_sms_replacements($order, $settings, $debt);

    $message = preg_replace_callback('/\{\{(.*?)\}\}/u', static function (array $matches) use ($replacements): string {
        $key = preg_replace('/\s+/u', '', html_entity_decode(trim($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? trim($matches[1]);
        $value = $replacements[$key] ?? '';
        if ($key === 'telegramBotLink' && $value !== '') {
            return "\n" . $value;
        }

        return $value;
    }, $template) ?? $template;

    return trim($message);
}

function resolve_sms_template_key(string $status): string
{
    $legacy = [
        'waiting_parts' => 'waitingParts',
        'waiting_client' => 'waitingClient',
        'in_progress' => 'inProgress',
    ];
    return $legacy[$status] ?? $status;
}

function resolve_sms_template(array $integrations, string $status): string
{
    $templates = is_array($integrations['smsStatusTemplates'] ?? null) ? $integrations['smsStatusTemplates'] : [];
    $legacyKey = resolve_sms_template_key($status);
    $template = trim((string) ($templates[$status] ?? $templates[$legacyKey] ?? ''));
    if ($template !== '') {
        return $template;
    }
    return trim((string) ($integrations['smsTemplateReady'] ?? ''));
}

function calculate_order_debt(array $order): float
{
    $total = calculate_order_total($order);
    $payments = is_array($order['payments'] ?? null) ? $order['payments'] : [];
    $paid = 0.0;
    foreach ($payments as $payment) {
        if (!is_array($payment)) {
            continue;
        }
        if (($payment['status'] ?? '') === 'completed') {
            $paid += (float) ($payment['amount'] ?? 0);
        }
    }

    return max($total - $paid, 0.0);
}

function format_phone_for_display(string $phone): string
{
    $normalized = normalize_sms_phone($phone);
    if (strlen($normalized) === 11 && str_starts_with($normalized, '7')) {
        return '+7' . substr($normalized, 1);
    }

    $trimmed = trim($phone);
    return $trimmed !== '' ? $trimmed : 'не указан';
}

function resolve_order_status_label(string $status, array $settings): string
{
    $statuses = is_array($settings['orders']['statuses'] ?? null) ? $settings['orders']['statuses'] : [];
    foreach ($statuses as $item) {
        if (!is_array($item)) {
            continue;
        }
        if ((string) ($item['code'] ?? '') === $status) {
            $label = trim((string) ($item['label'] ?? ''));
            if ($label !== '') {
                return $label;
            }
        }
    }

    return $status;
}

function create_communication_history_entry(
    string $channel,
    string $message,
    string $author = 'CRM',
    ?string $direction = null
): array {
    $entry = [
        'id' => (string) round(microtime(true) * 1000) . '_' . bin2hex(random_bytes(3)),
        'channel' => $channel,
        'author' => $author,
        'message' => $message,
        'createdAt' => date('c'),
    ];
    if ($direction === 'inbound' || $direction === 'outbound') {
        $entry['direction'] = $direction;
    }

    return $entry;
}

function phone_lookup_suffix(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) > 10) {
        return substr($digits, -10);
    }

    return $digits;
}

function find_orders_by_client_phone(string $phone, int $limit = 5): array
{
    $suffix = phone_lookup_suffix($phone);
    if ($suffix === '') {
        return [];
    }

    $limit = max(1, min($limit, 10));
    $rows = fetch_all_assoc(
        'SELECT * FROM orders WHERE client_phone <> \'\' ORDER BY updated_at DESC LIMIT 5000'
    );
    $matched = [];
    foreach ($rows as $row) {
        if (phone_lookup_suffix((string) ($row['client_phone'] ?? '')) !== $suffix) {
            continue;
        }
        $matched[] = $row;
        if (count($matched) >= $limit) {
            break;
        }
    }

    return $matched;
}

function find_orders_by_client_id(string $clientId, int $limit = 3): array
{
    $clientId = trim($clientId);
    if ($clientId === '') {
        return [];
    }

    $limit = max(1, min($limit, 10));

    return fetch_all_assoc(
        'SELECT * FROM orders WHERE client_id = :client_id ORDER BY updated_at DESC LIMIT ' . $limit,
        ['client_id' => $clientId]
    );
}

function find_orders_for_telegram_client(array $client, int $limit = 3): array
{
    $orders = find_orders_by_client_id((string) ($client['id'] ?? ''), $limit);
    if ($orders) {
        return $orders;
    }

    return find_orders_by_client_phone((string) ($client['phone'] ?? ''), $limit);
}

function append_sms_to_order_row(array $orderRow, string $phone, string $text, string $direction): bool
{
    $history = decode_json_column($orderRow['communication_history_json'] ?? '[]', []);
    $phoneDisplay = format_phone_for_display($phone);
    $normalizedText = trim($text);
    if ($normalizedText === '') {
        return false;
    }

    foreach ($history as $entry) {
        if (!is_array($entry) || ($entry['channel'] ?? '') !== 'sms') {
            continue;
        }
        if (($entry['message'] ?? '') === $normalizedText && ($entry['direction'] ?? '') === $direction) {
            $createdAt = strtotime((string) ($entry['createdAt'] ?? ''));
            if ($createdAt && (time() - $createdAt) < 120) {
                return false;
            }
        }
    }

    if ($direction === 'inbound') {
        $author = trim((string) ($orderRow['client_name'] ?? '')) !== ''
            ? (string) $orderRow['client_name']
            : 'Клиент';
        $message = 'Входящая SMS с ' . $phoneDisplay . ': ' . $normalizedText;
    } else {
        $author = 'CRM';
        $message = 'Исходящая SMS на ' . $phoneDisplay . ': ' . $normalizedText;
    }

    $history[] = create_communication_history_entry('sms', $message, $author, $direction);
    db()->prepare(
        'UPDATE orders SET communication_history_json = :history, updated_at = :updated_at WHERE id = :id'
    )->execute([
        'id' => (string) $orderRow['id'],
        'history' => json_encode($history, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'updated_at' => now_mysql(),
    ]);

    return true;
}

function telegram_webhook_url(): string
{
    $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host === '') {
        return '';
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');

    return ($isHttps ? 'https' : 'http') . '://' . $host . '/api/webhooks/telegram';
}

function telegram_translate_error(string $description): string
{
    $description = trim($description);
    if ($description === '') {
        return 'неизвестная ошибка API';
    }
    if (str_contains($description, "bots can't send messages to bots")) {
        return 'нельзя указывать @имя_бота — нужен ваш числовой chat_id из @userinfobot';
    }
    if (str_contains($description, 'chat not found')) {
        return 'чат не найден. Сначала откройте бота и нажмите /start';
    }
    if (str_contains($description, 'bot was blocked by the user')) {
        return 'пользователь заблокировал бота';
    }
    if (str_contains($description, "can't initiate conversation with a user")) {
        return 'пользователь ещё не нажал /start у бота';
    }
    if (str_contains($description, 'Connection timed out') || str_contains($description, 'Failed to connect')) {
        return 'сервер не достучался до Telegram. Повторите через минуту';
    }

    return $description;
}

function normalize_telegram_chat_id_input(string $chatId): string
{
    $chatId = trim($chatId);
    if ($chatId === '' || str_starts_with($chatId, '@')) {
        return '';
    }

    return $chatId;
}

function telegram_api_request(string $token, string $method, array $params = []): array
{
    $token = trim($token);
    if ($token === '') {
        return ['success' => false, 'message' => 'Токен Telegram-бота не указан'];
    }

    $url = 'https://api.telegram.org/bot' . $token . '/' . $method;
    $body = json_encode($params, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $result = sms_http_request('POST', $url, ['Content-Type: application/json'], $body ?: '{}');
    $payload = json_decode((string) ($result['body'] ?? ''), true);
    if (!$result['ok']) {
        if (is_array($payload) && !empty($payload['description'])) {
            return ['success' => false, 'message' => 'Telegram: ' . telegram_translate_error((string) $payload['description'])];
        }
        $curlError = trim((string) ($result['error'] ?? ''));
        if ($curlError !== '') {
            return ['success' => false, 'message' => 'Telegram: ' . telegram_translate_error($curlError)];
        }

        return ['success' => false, 'message' => sms_format_provider_error('Telegram', $result)];
    }

    if (!is_array($payload) || empty($payload['ok'])) {
        $description = is_array($payload) ? trim((string) ($payload['description'] ?? '')) : '';

        return [
            'success' => false,
            'message' => $description !== '' ? 'Telegram: ' . telegram_translate_error($description) : 'Telegram: неизвестная ошибка API',
        ];
    }

    return ['success' => true, 'result' => $payload['result'] ?? null];
}

function find_client_by_phone_suffix_db(string $phone): ?array
{
    $suffix = phone_lookup_suffix($phone);
    if ($suffix === '') {
        return null;
    }

    $rows = fetch_all_assoc('SELECT * FROM clients ORDER BY updated_at DESC LIMIT 5000');
    foreach ($rows as $row) {
        if (phone_lookup_suffix((string) ($row['phone'] ?? '')) === $suffix) {
            return $row;
        }
    }

    return null;
}

function link_client_telegram_chat(string $phone, string $chatId): bool
{
    $client = find_client_by_phone_suffix_db($phone);
    if (!$client) {
        return false;
    }

    db()->prepare(
        'UPDATE clients SET telegram_chat_id = :telegram_chat_id, updated_at = :updated_at WHERE id = :id'
    )->execute([
        'id' => (string) $client['id'],
        'telegram_chat_id' => trim($chatId),
        'updated_at' => now_mysql(),
    ]);

    return true;
}

function get_order_client_telegram_chat_id(array $orderRow): string
{
    $clientId = trim((string) ($orderRow['client_id'] ?? ''));
    if ($clientId === '') {
        return '';
    }

    $client = fetch_one_assoc('SELECT telegram_chat_id FROM clients WHERE id = :id LIMIT 1', ['id' => $clientId]);

    return trim((string) ($client['telegram_chat_id'] ?? ''));
}

function append_telegram_to_order_row(array $orderRow, string $text, string $direction): bool
{
    $history = decode_json_column($orderRow['communication_history_json'] ?? '[]', []);
    $normalizedText = trim($text);
    if ($normalizedText === '') {
        return false;
    }

    if ($direction === 'inbound') {
        $author = trim((string) ($orderRow['client_name'] ?? '')) !== ''
            ? (string) $orderRow['client_name']
            : 'Клиент';
        $message = 'Входящее Telegram: ' . $normalizedText;
    } else {
        $author = 'CRM';
        $message = 'Исходящее Telegram: ' . $normalizedText;
    }

    if ($direction === 'inbound') {
        foreach ($history as $entry) {
            if (!is_array($entry) || ($entry['channel'] ?? '') !== 'telegram') {
                continue;
            }
            if (($entry['message'] ?? '') === $message && ($entry['direction'] ?? '') === $direction) {
                $createdAt = strtotime((string) ($entry['createdAt'] ?? ''));
                if ($createdAt && (time() - $createdAt) < 120) {
                    return false;
                }
            }
        }
    }

    $history[] = create_communication_history_entry('telegram', $message, $author, $direction);
    db()->prepare(
        'UPDATE orders SET communication_history_json = :history, updated_at = :updated_at WHERE id = :id'
    )->execute([
        'id' => (string) $orderRow['id'],
        'history' => json_encode($history, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'updated_at' => now_mysql(),
    ]);

    if ($direction === 'inbound') {
        store_telegram_inbox_item(
            get_order_client_telegram_chat_id($orderRow),
            $normalizedText,
            'inbound',
            $orderRow
        );
    }

    return true;
}

function resolve_inbox_tenant_id(?array $orderRow = null, ?array $clientRow = null): int
{
    if (is_array($orderRow) && isset($orderRow['tenant_id'])) {
        return max(1, (int) $orderRow['tenant_id']);
    }
    if (is_array($clientRow) && isset($clientRow['tenant_id'])) {
        return max(1, (int) $clientRow['tenant_id']);
    }

    $user = $GLOBALS['__current_auth_user'] ?? null;
    if (is_array($user)) {
        return user_tenant_id($user);
    }

    return 1;
}

function map_telegram_inbox_row(array $row): array
{
    return [
        'id' => (string) ($row['id'] ?? ''),
        'chatId' => (string) ($row['chat_id'] ?? ''),
        'clientId' => (string) ($row['client_id'] ?? ''),
        'orderId' => (string) ($row['order_id'] ?? ''),
        'orderNumber' => (string) ($row['order_number'] ?? ''),
        'clientName' => (string) ($row['client_name'] ?? ''),
        'clientPhone' => (string) ($row['client_phone'] ?? ''),
        'message' => (string) ($row['message'] ?? ''),
        'direction' => (string) ($row['direction'] ?? 'inbound'),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'readAt' => !empty($row['read_at']) ? (string) $row['read_at'] : null,
    ];
}

function telegram_inbox_status_for_tenant(int $tenantId): array
{
    $latest = fetch_one_assoc(
        'SELECT id, created_at FROM telegram_inbox WHERE tenant_id = :tenant_id ORDER BY created_at DESC, id DESC LIMIT 1',
        ['tenant_id' => $tenantId]
    );
    $unread = fetch_one_assoc(
        'SELECT COUNT(*) AS total FROM telegram_inbox
         WHERE tenant_id = :tenant_id AND direction = :direction AND read_at IS NULL',
        ['tenant_id' => $tenantId, 'direction' => 'inbound']
    );

    return [
        'latestId' => (string) ($latest['id'] ?? ''),
        'latestAt' => !empty($latest['created_at']) ? (string) $latest['created_at'] : null,
        'unreadCount' => (int) ($unread['total'] ?? 0),
    ];
}

function mark_telegram_inbox_read(int $tenantId, array $payload): int
{
    $readAt = date('Y-m-d H:i:s');

    if (!empty($payload['markAll'])) {
        $statement = db()->prepare(
            'UPDATE telegram_inbox SET read_at = :read_at
             WHERE tenant_id = :tenant_id AND direction = :direction AND read_at IS NULL'
        );
        $statement->execute([
            'read_at' => $readAt,
            'tenant_id' => $tenantId,
            'direction' => 'inbound',
        ]);

        return $statement->rowCount();
    }

    $orParts = [];
    $params = [
        'tenant_id' => $tenantId,
        'direction' => 'inbound',
        'read_at' => $readAt,
    ];

    $ids = is_array($payload['ids'] ?? null) ? $payload['ids'] : [];
    $ids = array_values(array_filter(array_map(static fn($id) => trim((string) $id), $ids)));
    if ($ids !== []) {
        $idPlaceholders = [];
        foreach ($ids as $index => $id) {
            $key = 'id_' . $index;
            $idPlaceholders[] = ':' . $key;
            $params[$key] = $id;
        }
        $orParts[] = 'id IN (' . implode(', ', $idPlaceholders) . ')';
    }

    $orderId = trim((string) ($payload['orderId'] ?? ''));
    if ($orderId !== '') {
        $params['order_id'] = $orderId;
        $orParts[] = 'order_id = :order_id';
    }

    $chatId = trim((string) ($payload['chatId'] ?? ''));
    if ($chatId !== '') {
        $params['chat_id'] = $chatId;
        $orParts[] = 'chat_id = :chat_id';
    }

    $clientId = trim((string) ($payload['clientId'] ?? ''));
    if ($clientId !== '') {
        $params['client_id'] = $clientId;
        $orParts[] = 'client_id = :client_id';
    }

    $phone = normalize_sms_phone((string) ($payload['phone'] ?? ''));
    if (strlen($phone) >= 10) {
        $params['phone_suffix'] = '%' . substr($phone, -10);
        $orParts[] = "REPLACE(REPLACE(REPLACE(REPLACE(client_phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE :phone_suffix";
    }

    if ($orParts === []) {
        return 0;
    }

    $statement = db()->prepare(
        'UPDATE telegram_inbox SET read_at = :read_at
         WHERE tenant_id = :tenant_id AND direction = :direction AND read_at IS NULL
           AND (' . implode(' OR ', $orParts) . ')'
    );
    $statement->execute($params);

    return $statement->rowCount();
}

function migrate_existing_telegram_inbox_as_read(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    if (!table_has_column('telegram_inbox', 'read_at')) {
        return;
    }

    $marker = fetch_one_assoc('SELECT `key` FROM app_settings WHERE `key` = :key LIMIT 1', [
        'key' => 'migration_telegram_inbox_read_v1',
    ]);
    if ($marker) {
        return;
    }

    db()->exec(
        "UPDATE telegram_inbox SET read_at = COALESCE(created_at, NOW())
         WHERE direction = 'inbound' AND read_at IS NULL"
    );
    db()->prepare(
        'INSERT INTO app_settings (`key`, payload_json, updated_at) VALUES (:key, :payload_json, :updated_at)'
    )->execute([
        'key' => 'migration_telegram_inbox_read_v1',
        'payload_json' => json_encode(['done' => true], JSON_UNESCAPED_UNICODE),
        'updated_at' => now_mysql(),
    ]);
}

function store_telegram_inbox_item(
    string $chatId,
    string $message,
    string $direction = 'inbound',
    ?array $orderRow = null,
    ?array $clientRow = null,
    string $displayName = ''
): void {
    $normalizedMessage = trim($message);
    if ($normalizedMessage === '') {
        return;
    }

    $orderId = $orderRow ? (string) ($orderRow['id'] ?? '') : '';
    $orderNumber = $orderRow ? (string) ($orderRow['order_number'] ?? '') : '';
    $clientId = $clientRow
        ? (string) ($clientRow['id'] ?? '')
        : ($orderRow ? (string) ($orderRow['client_id'] ?? '') : '');
    $clientName = $clientRow
        ? trim((string) ($clientRow['name'] ?? ''))
        : ($orderRow ? trim((string) ($orderRow['client_name'] ?? '')) : '');
    if ($clientName === '' && trim($displayName) !== '') {
        $clientName = trim($displayName);
    }
    $clientPhone = $clientRow
        ? format_phone_for_display((string) ($clientRow['phone'] ?? ''))
        : ($orderRow ? format_phone_for_display((string) ($orderRow['client_phone'] ?? '')) : '');
    $tenantId = resolve_inbox_tenant_id($orderRow, $clientRow);

    db()->prepare(
        'INSERT INTO telegram_inbox (
            id, chat_id, client_id, order_id, order_number, client_name, client_phone, message, direction, tenant_id, created_at
         ) VALUES (
            :id, :chat_id, :client_id, :order_id, :order_number, :client_name, :client_phone, :message, :direction, :tenant_id, :created_at
         )'
    )->execute([
        'id' => (string) round(microtime(true) * 1000) . '_' . bin2hex(random_bytes(3)),
        'chat_id' => trim($chatId),
        'client_id' => $clientId,
        'order_id' => $orderId,
        'order_number' => $orderNumber,
        'client_name' => $clientName,
        'client_phone' => $clientPhone,
        'message' => $normalizedMessage,
        'direction' => $direction === 'outbound' ? 'outbound' : 'inbound',
        'tenant_id' => $tenantId,
        'created_at' => now_mysql(),
    ]);
}

function send_telegram_via_bot(array $settings, string $chatId, string $message): array
{
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $token = trim((string) ($integrations['telegramBotToken'] ?? ''));
    if ($token === '' || empty($integrations['telegramConnected'])) {
        return ['success' => false, 'message' => 'Telegram-бот не подключен'];
    }

    $chatId = trim($chatId);
    if ($chatId === '') {
        return ['success' => false, 'message' => 'У клиента не привязан Telegram'];
    }

    return telegram_api_request($token, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $message,
    ]);
}

function process_telegram_webhook_payload(array $update): array
{
    $message = $update['message'] ?? $update['edited_message'] ?? null;
    if (!is_array($message)) {
        return ['ok' => true, 'skipped' => true];
    }

    $settings = load_app_settings();
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $token = trim((string) ($integrations['telegramBotToken'] ?? ''));
    if ($token === '' || empty($integrations['telegramConnected'])) {
        return ['ok' => true, 'skipped' => true, 'reason' => 'bot_not_connected'];
    }

    $chatId = (string) ($message['chat']['id'] ?? '');
    $text = trim((string) ($message['text'] ?? ''));
    $contact = $message['contact'] ?? null;

    if ($chatId === '') {
        return ['ok' => true, 'skipped' => true];
    }

    if (str_starts_with($text, '/start')) {
        $parts = preg_split('/\s+/', $text, 2) ?: [];
        $param = trim((string) ($parts[1] ?? ''));
        if (str_starts_with($param, 'link_')) {
            $phoneSuffix = preg_replace('/\D+/', '', substr($param, 5)) ?? '';
            if ($phoneSuffix === '') {
                telegram_api_request($token, 'sendMessage', [
                    'chat_id' => $chatId,
                    'text' => 'Ссылка для привязки некорректна. Попросите сервис отправить новую ссылку из заказа или SMS.',
                    'reply_markup' => json_encode(['remove_keyboard' => true], JSON_UNESCAPED_UNICODE),
                ]);
                return ['ok' => true, 'linked' => false, 'reason' => 'invalid_link_param'];
            }

            $client = find_client_by_phone_suffix_db($phoneSuffix);
            if ($client) {
                db()->prepare(
                    'UPDATE clients SET telegram_chat_id = :telegram_chat_id, updated_at = :updated_at WHERE id = :id'
                )->execute([
                    'id' => (string) $client['id'],
                    'telegram_chat_id' => $chatId,
                    'updated_at' => now_mysql(),
                ]);
                telegram_api_request($token, 'sendMessage', [
                    'chat_id' => $chatId,
                    'text' => 'Готово! Telegram привязан. Пишите сюда — сервис увидит ваше сообщение.',
                    'reply_markup' => json_encode(['remove_keyboard' => true], JSON_UNESCAPED_UNICODE),
                ]);
                return ['ok' => true, 'linked' => true];
            }

            telegram_api_request($token, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => 'Не нашли клиента с номером, оканчивающимся на ' . $phoneSuffix . '. Обратитесь в сервис — мы поможем привязать Telegram или отправьте контакт кнопкой ниже.',
                'reply_markup' => json_encode([
                    'keyboard' => [[['text' => 'Отправить телефон', 'request_contact' => true]]],
                    'resize_keyboard' => true,
                    'one_time_keyboard' => true,
                ], JSON_UNESCAPED_UNICODE),
            ]);
            return ['ok' => true, 'linked' => false, 'reason' => 'client_not_found'];
        }

        telegram_api_request($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => 'Здравствуйте! Чтобы получать сообщения от сервиса, нажмите кнопку ниже и отправьте номер телефона.',
            'reply_markup' => json_encode([
                'keyboard' => [[['text' => 'Отправить телефон', 'request_contact' => true]]],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ], JSON_UNESCAPED_UNICODE),
        ]);

        return ['ok' => true, 'linked' => false];
    }

    if (is_array($contact) && !empty($contact['phone_number'])) {
        $linked = link_client_telegram_chat((string) $contact['phone_number'], $chatId);
        telegram_api_request($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $linked
                ? 'Спасибо! Telegram привязан к вашему номеру.'
                : 'Не нашли клиента с таким номером. Обратитесь в сервис — мы поможем привязать Telegram.',
            'reply_markup' => json_encode(['remove_keyboard' => true], JSON_UNESCAPED_UNICODE),
        ]);

        return ['ok' => true, 'linked' => $linked];
    }

    if ($text === '' || str_starts_with($text, '/')) {
        return ['ok' => true, 'skipped' => true];
    }

    $fromUser = is_array($message['from'] ?? null) ? $message['from'] : [];
    $telegramDisplayName = trim((string) ($fromUser['first_name'] ?? ''));
    $lastName = trim((string) ($fromUser['last_name'] ?? ''));
    if ($lastName !== '') {
        $telegramDisplayName = trim($telegramDisplayName . ' ' . $lastName);
    }
    if ($telegramDisplayName === '' && !empty($fromUser['username'])) {
        $telegramDisplayName = '@' . (string) $fromUser['username'];
    }

    $client = fetch_one_assoc('SELECT * FROM clients WHERE telegram_chat_id = :chat_id LIMIT 1', ['chat_id' => $chatId]);
    if (!$client) {
        store_telegram_inbox_item($chatId, $text, 'inbound', null, null, $telegramDisplayName);
        return ['ok' => true, 'saved' => true, 'linked' => false];
    }

    $orders = find_orders_for_telegram_client($client, 3);
    $saved = 0;
    if ($orders) {
        foreach ($orders as $orderRow) {
            if (append_telegram_to_order_row($orderRow, $text, 'inbound')) {
                $saved += 1;
            }
        }
    } else {
        store_telegram_inbox_item($chatId, $text, 'inbound', null, $client, $telegramDisplayName);
        $saved = 1;
    }

    return ['ok' => true, 'saved' => $saved > 0, 'orders' => count($orders), 'linked' => true];
}

function store_unmatched_sms(string $phone, string $text, string $direction, string $clientName = '', ?array $clientRow = null): void
{
    $tenantId = resolve_inbox_tenant_id(null, $clientRow);
    db()->prepare(
        'INSERT INTO sms_inbox (id, phone, client_name, message, direction, tenant_id, created_at) VALUES (:id, :phone, :client_name, :message, :direction, :tenant_id, :created_at)'
    )->execute([
        'id' => (string) round(microtime(true) * 1000) . '_' . bin2hex(random_bytes(3)),
        'phone' => format_phone_for_display($phone),
        'client_name' => $clientName,
        'message' => trim($text),
        'direction' => $direction,
        'tenant_id' => $tenantId,
        'created_at' => now_mysql(),
    ]);
}

function process_moizvonki_webhook_payload(array $payload): array
{
    $event = is_array($payload['event'] ?? null) ? $payload['event'] : [];
    $eventType = (int) ($event['event_type'] ?? 0);
    if ($eventType !== 32) {
        return ['handled' => false, 'reason' => 'not_sms_event'];
    }

    $directionCode = (int) ($event['direction'] ?? 0);
    $direction = $directionCode === 0 ? 'inbound' : 'outbound';
    $phone = trim((string) ($event['client_number'] ?? ''));
    $text = trim((string) ($event['text'] ?? ''));
    $clientName = trim((string) ($event['client_name'] ?? ''));

    if ($phone === '' || $text === '') {
        return ['handled' => false, 'reason' => 'missing_phone_or_text'];
    }

    $orders = find_orders_by_client_phone($phone, 1);
    if (!$orders) {
        store_unmatched_sms($phone, $text, $direction, $clientName);
        return ['handled' => true, 'matched' => false, 'direction' => $direction];
    }

    $saved = append_sms_to_order_row($orders[0], $phone, $text, $direction);

    return [
        'handled' => true,
        'matched' => true,
        'saved' => $saved,
        'orderId' => (string) ($orders[0]['id'] ?? ''),
        'direction' => $direction,
    ];
}

function moizvonki_api_call(array $settings, string $action, array $extra = []): array
{
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $credentials = sms_provider_credentials($integrations);
    $apiUrl = normalize_moizvonki_api_url((string) ($credentials['domain'] ?? ''));
    $userName = trim((string) ($credentials['userName'] ?? $credentials['email'] ?? ''));
    $apiKey = trim((string) ($credentials['apiKey'] ?? ''));
    if ($apiUrl === '' || $userName === '' || $apiKey === '') {
        return ['success' => false, 'message' => 'Укажите адрес API, email и API-ключ Мои Звонки'];
    }

    $requestData = json_encode(array_merge([
        'user_name' => $userName,
        'api_key' => $apiKey,
        'action' => $action,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $result = sms_http_request(
        'POST',
        $apiUrl,
        ['Content-Type: application/x-www-form-urlencoded'],
        http_build_query(['request_data' => $requestData ?: '{}'])
    );

    if (!$result['ok']) {
        return ['success' => false, 'message' => sms_format_provider_error('Мои Звонки', $result)];
    }

    $payload = json_decode($result['body'], true);
    if (is_array($payload)) {
        $errorText = trim((string) ($payload['error'] ?? $payload['message'] ?? ''));
        if ($errorText !== '') {
            return ['success' => false, 'message' => 'Мои Звонки: ' . $errorText, 'payload' => $payload];
        }
    }

    return ['success' => true, 'message' => 'OK', 'payload' => is_array($payload) ? $payload : []];
}

function public_webhook_base_url(): string
{
    $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host === '') {
        return '';
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');

    return ($isHttps ? 'https' : 'http') . '://' . $host . '/api/webhooks/moizvonki';
}

function merge_communication_history(array $serverHistory, array $clientHistory): array
{
    $knownIds = [];
    foreach ($serverHistory as $entry) {
        if (is_array($entry) && !empty($entry['id'])) {
            $knownIds[(string) $entry['id']] = true;
        }
    }

    $merged = $serverHistory;
    foreach ($clientHistory as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $id = (string) ($entry['id'] ?? '');
        if ($id === '' || empty($knownIds[$id])) {
            $merged[] = $entry;
            if ($id !== '') {
                $knownIds[$id] = true;
            }
        }
    }

    return $merged;
}

function is_sms_trigger_enabled(array $notifications, string $status): bool
{
    $triggers = is_array($notifications['smsStatusTriggers'] ?? null) ? $notifications['smsStatusTriggers'] : [];
    $legacyKey = resolve_sms_template_key($status);

    if (!empty($triggers[$status]) || !empty($triggers[$legacyKey])) {
        return true;
    }

    if ($status === 'new' && !empty($triggers['pending'])) {
        return true;
    }

    if ($status === 'pending' && !empty($triggers['new'])) {
        return true;
    }

    return false;
}

function resolve_default_new_order_status(array $settings): string
{
    $statuses = is_array($settings['orders']['statuses'] ?? null) ? $settings['orders']['statuses'] : [];
    foreach ($statuses as $item) {
        if (!is_array($item)) {
            continue;
        }
        if (array_key_exists('enabled', $item) && empty($item['enabled'])) {
            continue;
        }
        $id = (string) ($item['id'] ?? '');
        $code = (string) ($item['code'] ?? '');
        $label = mb_strtolower(trim((string) ($item['label'] ?? '')));
        if ($id === 'status_new' || $code === 'new' || $label === 'новый' || $code === 'pending') {
            return $code !== '' ? $code : 'new';
        }
    }

    foreach ($statuses as $item) {
        if (!is_array($item)) {
            continue;
        }
        if (array_key_exists('enabled', $item) && empty($item['enabled'])) {
            continue;
        }
        if (empty($item['isFinal'])) {
            $code = (string) ($item['code'] ?? '');
            if ($code !== '') {
                return $code;
            }
        }
    }

    return 'new';
}

function apply_order_created_sms(array $orderRow): array
{
    $settings = load_app_settings_migrated();
    $order = map_order($orderRow);
    $history = decode_json_column($orderRow['communication_history_json'] ?? '[]', []);

    return append_order_status_sms_history($order, $settings, $history);
}

function merge_order_payload(array $currentRow, array $payload): array
{
    $mapped = map_order($currentRow);
    foreach ($payload as $key => $value) {
        if ($value === null) {
            continue;
        }
        if ($value === '' && is_string($mapped[$key] ?? null) && ($mapped[$key] ?? '') !== '') {
            continue;
        }
        if (is_array($value) && $value === [] && is_array($mapped[$key] ?? null) && !empty($mapped[$key])) {
            continue;
        }
        $mapped[$key] = $value;
    }

    return $mapped;
}

function build_order_for_sms(array $currentRow, array $payload, string $newStatus): array
{
    $order = map_order($currentRow);
    $order['status'] = $newStatus;

    foreach ([
        'clientName',
        'clientPhone',
        'orderNumber',
        'parts',
        'payments',
        'finalCost',
        'estimatedCost',
        'deviceBrand',
        'deviceModel',
        'description',
        'diagnosis',
    ] as $field) {
        if (!array_key_exists($field, $payload)) {
            continue;
        }
        $value = $payload[$field];
        if ($value === null || $value === '') {
            continue;
        }
        if (is_array($value) && $value === []) {
            continue;
        }
        $order[$field] = $value;
    }

    return $order;
}

function append_order_status_sms_history(array $order, array $settings, array $history): array
{
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $notifications = is_array($settings['notifications'] ?? null) ? $settings['notifications'] : [];
    $status = (string) ($order['status'] ?? '');
    $statusLabel = resolve_order_status_label($status, $settings);
    $phone = trim((string) ($order['clientPhone'] ?? ''));
    $phoneDisplay = format_phone_for_display($phone);

    if (empty($notifications['smsNotifications'])) {
        return $history;
    }

    if (!is_sms_trigger_enabled($notifications, $status)) {
        return $history;
    }

    if (($integrations['smsProvider'] ?? 'none') === 'none' || empty($integrations['smsConnected'])) {
        $history[] = create_communication_history_entry(
            'sms',
            'Авто-SMS при смене статуса на «' . $statusLabel . '»: не отправлено — SMS-провайдер не подключен.'
        );

        return $history;
    }

    if ($phone === '') {
        $history[] = create_communication_history_entry(
            'sms',
            'Авто-SMS при смене статуса на «' . $statusLabel . '»: не отправлено — у клиента не указан телефон.'
        );

        return $history;
    }

    $template = resolve_sms_template($integrations, $status);
    if ($template === '') {
        $history[] = create_communication_history_entry(
            'sms',
            'Авто-SMS при смене статуса на «' . $statusLabel . '»: не отправлено — не настроен текст SMS для этого статуса.'
        );

        return $history;
    }

    $debt = calculate_order_debt($order);
    $message = build_sms_message($template, $order, $settings, $debt);
    $result = send_sms_via_provider($settings, $phone, $message, [
        'event' => 'order_' . $status,
        'orderNumber' => (string) ($order['orderNumber'] ?? ''),
        'clientName' => (string) ($order['clientName'] ?? ''),
        'status' => $status,
        'debt' => $debt,
    ]);

    if (!empty($result['success'])) {
        $history[] = create_communication_history_entry(
            'sms',
            'SMS отправлено на ' . $phoneDisplay . ' при смене статуса на «' . $statusLabel . '». Текст: ' . $message,
            'CRM',
            'outbound'
        );
    } else {
        $errorMessage = trim((string) ($result['message'] ?? 'ошибка отправки'));
        $history[] = create_communication_history_entry(
            'sms',
            'Авто-SMS при смене статуса на «' . $statusLabel . '» (' . $phoneDisplay . '): не отправлено — ' . $errorMessage
        );
    }

    return $history;
}

function apply_order_status_sms_on_change(array $currentRow, array $payload): array
{
    $newStatus = (string) ($payload['status'] ?? $currentRow['status'] ?? '');
    $oldStatus = (string) ($currentRow['status'] ?? '');
    if ($newStatus === $oldStatus) {
        return $payload;
    }

    $serverHistory = decode_json_column($currentRow['communication_history_json'] ?? '[]', []);
    $clientHistory = is_array($payload['communicationHistory'] ?? null) ? $payload['communicationHistory'] : [];
    $history = merge_communication_history($serverHistory, $clientHistory);
    $orderForSms = build_order_for_sms($currentRow, $payload, $newStatus);
    $payload['communicationHistory'] = append_order_status_sms_history(
        $orderForSms,
        load_app_settings_migrated(),
        $history
    );

    return $payload;
}

function normalize_http_url(string $url): string
{
    $value = trim($url);
    if ($value === '') {
        return '';
    }
    if (!preg_match('/^https?:\/\//i', $value)) {
        $value = 'https://' . $value;
    }
    return $value;
}

function normalize_moizvonki_api_url(string $domain): string
{
    $value = trim($domain);
    if ($value === '') {
        return '';
    }
    $value = preg_replace('/^https?:\/\//i', '', $value) ?? $value;
    $value = rtrim($value, '/');
    if (!str_contains($value, 'moizvonki.ru')) {
        $value .= '.moizvonki.ru';
    }
    if (!str_ends_with($value, '/api/v1')) {
        $value .= '/api/v1';
    }
    return 'https://' . ltrim($value, '/');
}

function sms_http_request(string $method, string $url, array $headers = [], ?string $body = null): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $responseBody = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($responseBody === false) {
        return ['ok' => false, 'status' => $statusCode, 'body' => '', 'error' => $error ?: 'Ошибка HTTP'];
    }

    return ['ok' => $statusCode >= 200 && $statusCode < 300, 'status' => $statusCode, 'body' => (string) $responseBody, 'error' => ''];
}

function sms_format_provider_error(string $prefix, array $result): string
{
    $details = trim($result['error'] ?? '');
    $body = trim($result['body'] ?? '');
    if ($body !== '') {
        $decoded = json_decode($body, true);
        if (is_array($decoded)) {
            $message = trim((string) ($decoded['message'] ?? $decoded['error'] ?? $decoded['status_text'] ?? ''));
            if ($message !== '') {
                $details = $details !== '' ? $details . '. ' . $message : $message;
            }
        } elseif (strlen($body) <= 240) {
            $details = $details !== '' ? $details . '. ' . $body : $body;
        }
    }
    if ($details === '') {
        $details = 'код ' . (int) ($result['status'] ?? 0);
    }
    return $prefix . ': ' . $details;
}

function send_sms_via_moizvonki(array $settings, array $credentials, string $phone, string $message): array
{
    $apiUrl = normalize_moizvonki_api_url((string) ($credentials['domain'] ?? ''));
    $userName = trim((string) ($credentials['userName'] ?? $credentials['email'] ?? ''));
    $apiKey = trim((string) ($credentials['apiKey'] ?? ''));
    if ($apiUrl === '' || $userName === '' || $apiKey === '') {
        return ['success' => false, 'message' => 'Укажите адрес API, email и API-ключ Мои Звонки'];
    }

    $requestData = json_encode([
        'user_name' => $userName,
        'api_key' => $apiKey,
        'action' => 'calls.send_sms',
        'to' => $phone,
        'text' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $result = sms_http_request(
        'POST',
        $apiUrl,
        ['Content-Type: application/x-www-form-urlencoded'],
        http_build_query(['request_data' => $requestData ?: '{}'])
    );

    if (!$result['ok']) {
        return ['success' => false, 'message' => sms_format_provider_error('Мои Звонки', $result)];
    }

    $payload = json_decode($result['body'], true);
    if (is_array($payload)) {
        $errorText = trim((string) ($payload['error'] ?? $payload['message'] ?? ''));
        if ($errorText !== '') {
            return ['success' => false, 'message' => 'Мои Звонки: ' . $errorText];
        }
    }

    return [
        'success' => true,
        'message' => 'SMS отправлена через Мои Звонки. Подтвердите отправку на телефоне, если включено подтверждение.',
    ];
}

function send_sms_via_provider(array $settings, string $phone, string $message, array $meta = []): array
{
    $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
    $provider = (string) ($integrations['smsProvider'] ?? 'none');
    $credentials = sms_provider_credentials($integrations);
    $normalizedPhone = normalize_sms_phone($phone);

    if ($provider === 'none' || $normalizedPhone === '') {
        return ['success' => false, 'message' => 'SMS-провайдер не настроен или телефон пустой'];
    }

    if ($provider === 'moizvonki') {
        return send_sms_via_moizvonki($settings, $credentials, $normalizedPhone, $message);
    }

    if ($provider === 'smsru') {
        $apiId = trim((string) ($credentials['apiId'] ?? ''));
        if ($apiId === '') {
            return ['success' => false, 'message' => 'Укажите API ID SMS.ru'];
        }
        $query = http_build_query([
            'api_id' => $apiId,
            'to' => $normalizedPhone,
            'msg' => $message,
            'json' => 1,
        ]);
        $sender = sms_sender_name($integrations, $settings);
        if ($sender !== '') {
            $query .= '&from=' . rawurlencode($sender);
        }
        $result = sms_http_request('GET', 'https://sms.ru/sms/send?' . $query);
        if (!$result['ok']) {
            return ['success' => false, 'message' => 'SMS.ru ответил с кодом ' . $result['status']];
        }
        $payload = json_decode($result['body'], true);
        if (is_array($payload) && ($payload['status'] ?? '') === 'OK') {
            return ['success' => true, 'message' => 'SMS отправлена через SMS.ru'];
        }
        return ['success' => false, 'message' => is_array($payload) ? (string) ($payload['status_text'] ?? 'Ошибка SMS.ru') : 'Ошибка SMS.ru'];
    }

    if ($provider === 'smsc') {
        $login = trim((string) ($credentials['login'] ?? ''));
        $password = trim((string) ($credentials['password'] ?? ''));
        if ($login === '' || $password === '') {
            return ['success' => false, 'message' => 'Укажите логин и пароль SMSC.ru'];
        }
        $query = http_build_query([
            'login' => $login,
            'psw' => $password,
            'phones' => $normalizedPhone,
            'mes' => $message,
            'fmt' => 3,
        ]);
        $sender = sms_sender_name($integrations, $settings);
        if ($sender !== '') {
            $query .= '&sender=' . rawurlencode($sender);
        }
        $result = sms_http_request('GET', 'https://smsc.ru/sys/send.php?' . $query);
        if (!$result['ok']) {
            return ['success' => false, 'message' => 'SMSC.ru ответил с кодом ' . $result['status']];
        }
        $payload = json_decode($result['body'], true);
        if (is_array($payload) && empty($payload['error'])) {
            return ['success' => true, 'message' => 'SMS отправлена через SMSC.ru'];
        }
        return ['success' => false, 'message' => is_array($payload) ? (string) ($payload['error'] ?? 'Ошибка SMSC.ru') : 'Ошибка SMSC.ru'];
    }

    if ($provider === 'smsaero') {
        $email = trim((string) ($credentials['email'] ?? ''));
        $apiKey = trim((string) ($credentials['apiKey'] ?? ''));
        $sign = trim((string) ($credentials['senderName'] ?? sms_sender_name($integrations, $settings)));
        if ($email === '' || $apiKey === '' || $sign === '') {
            return ['success' => false, 'message' => 'Укажите email, API-ключ и подпись SMS Aero'];
        }
        $auth = base64_encode($email . ':' . $apiKey);
        $body = json_encode([
            'number' => $normalizedPhone,
            'text' => $message,
            'sign' => $sign,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $result = sms_http_request('POST', 'https://gate.smsaero.ru/v2/sms/send', [
            'Authorization: Basic ' . $auth,
            'Content-Type: application/json',
        ], $body ?: '{}');
        if (!$result['ok']) {
            return ['success' => false, 'message' => 'SMS Aero ответил с кодом ' . $result['status']];
        }
        $payload = json_decode($result['body'], true);
        if (is_array($payload) && !empty($payload['success'])) {
            return ['success' => true, 'message' => 'SMS отправлена через SMS Aero'];
        }
        return ['success' => false, 'message' => is_array($payload) ? (string) ($payload['message'] ?? 'Ошибка SMS Aero') : 'Ошибка SMS Aero'];
    }

    if ($provider === 'webhook') {
        $webhookUrl = normalize_http_url((string) ($credentials['webhookUrl'] ?? $integrations['smsWebhookUrl'] ?? ''));
        if ($webhookUrl === '') {
            return ['success' => false, 'message' => 'Не указан URL SMS webhook'];
        }
        if (str_contains($webhookUrl, 'moizvonki.ru')) {
            return [
                'success' => false,
                'message' => 'Для Мои Звонки выберите провайдера «Мои Звонки», а не webhook. Нужен POST на /api/v1 с email и API-ключом.',
            ];
        }
        $token = trim((string) ($credentials['webhookToken'] ?? $integrations['smsApiToken'] ?? ''));
        $method = strtoupper(trim((string) ($credentials['webhookMethod'] ?? $integrations['smsWebhookMethod'] ?? 'POST')));
        $payload = array_merge([
            'provider' => 'webhook',
            'phone' => $normalizedPhone,
            'message' => $message,
            'sender' => sms_sender_name($integrations, $settings),
        ], $meta);
        if ($method === 'GET') {
            $url = $webhookUrl . (str_contains($webhookUrl, '?') ? '&' : '?') . 'payload=' . rawurlencode(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $headers = $token !== '' ? ['Authorization: Bearer ' . $token] : [];
            $result = sms_http_request('GET', $url, $headers);
        } else {
            $headers = ['Content-Type: application/json'];
            if ($token !== '') {
                $headers[] = 'Authorization: Bearer ' . $token;
            }
            $result = sms_http_request('POST', $webhookUrl, $headers, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}');
        }
        if (!$result['ok']) {
            return ['success' => false, 'message' => sms_format_provider_error('Webhook', $result)];
        }
        return ['success' => true, 'message' => 'SMS отправлена через webhook'];
    }

    return ['success' => false, 'message' => 'Неизвестный SMS-провайдер'];
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

    if (!table_has_column('acceptance_acts', 'estimated_days')) {
        db()->exec('ALTER TABLE acceptance_acts ADD COLUMN estimated_days INT NOT NULL DEFAULT 0 AFTER advance_payment');
    }

    if (!table_has_column('acceptance_acts', 'estimated_completion_date')) {
        db()->exec('ALTER TABLE acceptance_acts ADD COLUMN estimated_completion_date DATETIME NULL AFTER estimated_days');
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

    db()->exec(
        "CREATE TABLE IF NOT EXISTS sms_inbox (
            id VARCHAR(64) PRIMARY KEY,
            phone VARCHAR(64) NOT NULL,
            client_name VARCHAR(255) NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            direction VARCHAR(16) NOT NULL DEFAULT 'inbound',
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS telegram_inbox (
            id VARCHAR(64) PRIMARY KEY,
            chat_id VARCHAR(64) NOT NULL DEFAULT '',
            client_id VARCHAR(64) NOT NULL DEFAULT '',
            order_id VARCHAR(64) NOT NULL DEFAULT '',
            order_number VARCHAR(64) NOT NULL DEFAULT '',
            client_name VARCHAR(255) NOT NULL DEFAULT '',
            client_phone VARCHAR(64) NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            direction VARCHAR(16) NOT NULL DEFAULT 'inbound',
            created_at DATETIME NOT NULL,
            KEY idx_telegram_inbox_created (created_at),
            KEY idx_telegram_inbox_order (order_id),
            KEY idx_telegram_inbox_chat (chat_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    if (!table_has_column('telegram_inbox', 'chat_id')) {
        db()->exec("ALTER TABLE telegram_inbox ADD COLUMN chat_id VARCHAR(64) NOT NULL DEFAULT '' AFTER id");
    }

    if (!table_has_column('telegram_inbox', 'client_id')) {
        db()->exec("ALTER TABLE telegram_inbox ADD COLUMN client_id VARCHAR(64) NOT NULL DEFAULT '' AFTER chat_id");
    }

    if (!table_has_column('telegram_inbox', 'direction')) {
        db()->exec("ALTER TABLE telegram_inbox ADD COLUMN direction VARCHAR(16) NOT NULL DEFAULT 'inbound' AFTER message");
    }

    $chatIndex = fetch_one_assoc(
        'SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND INDEX_NAME = :index_name',
        ['table_name' => 'telegram_inbox', 'index_name' => 'idx_telegram_inbox_chat']
    );
    if ((int) ($chatIndex['total'] ?? 0) === 0) {
        db()->exec('ALTER TABLE telegram_inbox ADD KEY idx_telegram_inbox_chat (chat_id)');
    }

    if (!table_has_column('telegram_inbox', 'read_at')) {
        db()->exec('ALTER TABLE telegram_inbox ADD COLUMN read_at DATETIME NULL DEFAULT NULL AFTER created_at');
    }

    migrate_existing_telegram_inbox_as_read();
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = request_path();

try {
    require_once __DIR__ . '/platform.php';
    require_once __DIR__ . '/platform_notifications.php';
    ensure_platform_schema(db(), (string) app_config('db')['database']);
    ensure_extra_tables();

    if (handle_platform_routes($method, $path)) {
        return;
    }
    if ($method === 'GET' && $path === '/health') {
        json_response([
            'status' => 'ok',
            'time' => now_mysql(),
            'database' => db()->query('SELECT 1')->fetchColumn() ? 'connected' : 'unknown',
        ]);
    }

    if ($method === 'POST' && $path === '/webhooks/moizvonki') {
        $payload = json_input();
        $result = process_moizvonki_webhook_payload($payload);
        json_response($result, 200, 'Webhook received');
    }

    if ($method === 'POST' && $path === '/webhooks/telegram') {
        $payload = json_input();
        $result = process_telegram_webhook_payload($payload);
        json_response($result, 200, 'Webhook received');
    }

    if ($method === 'POST' && $path === '/auth/emergency-reset') {
        if (!app_debug()) {
            json_error('Доступ запрещён', 404);
        }
        $payload = json_input();
        $token = (string) ($payload['token'] ?? '');
        $expected = (string) (app_config('app')['emergency_reset_token'] ?? '');
        if ($expected === '' || !hash_equals($expected, $token)) {
            json_error('Доступ запрещён', 403);
        }

        $password = trim((string) ($payload['password'] ?? 'admin123'));
        if (strlen($password) < 6) {
            json_error('Пароль должен быть не короче 6 символов', 422);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = db()->prepare(
            'UPDATE users SET password_hash = :hash, updated_at = :updated_at WHERE can_login = 1'
        );
        $stmt->execute([
            'hash' => $hash,
            'updated_at' => now_mysql(),
        ]);

        $users = db()->query(
            'SELECT login_email, name, role FROM users WHERE can_login = 1 ORDER BY role, login_email'
        )->fetchAll(PDO::FETCH_ASSOC);

        json_response([
            'updated' => $stmt->rowCount(),
            'password' => $password,
            'users' => array_map(static fn(array $row): array => [
                'login' => (string) $row['login_email'],
                'name' => (string) $row['name'],
                'role' => (string) $row['role'],
            ], $users),
        ], 200, 'Пароли сброшены');
    }

    if ($method === 'POST' && $path === '/auth/login') {
        require_once __DIR__ . '/rate_limit.php';
        require_once __DIR__ . '/email_verification.php';

        $payload = json_input();
        $email = normalize_auth_email((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            json_error('Укажите логин и пароль', 422);
        }

        $ip = rate_limit_client_ip();
        $rateMessage = rate_limit_check('login_ip', $ip, 30, 900);
        if ($rateMessage !== null) {
            json_error($rateMessage, 429);
        }

        $user = find_user_for_email_login($email);

        if (!$user) {
            rate_limit_hit('login_ip', $ip, 900);
            json_error('Пользователь не найден', 401);
        }

        $hash = (string) ($user['password_hash'] ?? '');
        $isValid = false;
        if ($hash !== '') {
            if (str_starts_with($hash, '$2y$') || str_starts_with($hash, '$2a$') || str_starts_with($hash, '$argon2')) {
                $isValid = password_verify($password, $hash);
            } else {
                $isValid = hash_equals($hash, $password);
            }
        }
        if (!$isValid) {
            rate_limit_hit('login_ip', $ip, 900);
            json_error('Неверный пароль', 401);
        }

        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET password_hash = :password_hash, updated_at = :updated_at WHERE id = :id')->execute([
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'updated_at' => now_mysql(),
                'id' => $user['id'],
            ]);
        }

        rate_limit_clear('login_ip', $ip);
        login_response_for_user($user);
    }

    if ($method === 'GET' && $path === '/auth/me') {
        $user = require_auth();
        require_active_tenant($user);
        $payload = attach_platform_user_fields(attach_employee_access_if_needed(map_user($user), $user), $user);
        json_response($payload);
    }

    if ($method === 'GET' && $path === '/auth/notifications') {
        $user = require_auth();
        json_response(fetch_user_notifications_for_user((string) ($user['id'] ?? '')));
    }

    if ($method === 'POST' && route_matches('#^/auth/notifications/(\d+)/read$#', $path, $matches)) {
        $user = require_auth();
        $notificationId = (int) $matches[1];
        $updated = mark_user_notification_read((string) ($user['id'] ?? ''), $notificationId);
        if (!$updated) {
            json_error('Уведомление не найдено', 404);
        }
        json_response(['read' => true], 200, 'Уведомление прочитано');
    }

    if ($method === 'PATCH' && $path === '/auth/profile') {
        $user = require_auth();
        $payload = json_input();

        $access = merge_employee_access_for_user($user);
        $editable = $access['selfEditableFields'] ?? default_self_editable_fields();
        $isAdmin = ($user['role'] ?? '') === 'admin';

        $updates = [];
        $params = ['id' => (string) $user['id']];

        if (array_key_exists('avatar', $payload)) {
            if (!$isAdmin && !in_array('avatar', $editable, true)) {
                json_error('Изменение аватара недоступно по настройкам доступа', 403);
            }
            $avatar = (string) $payload['avatar'];
            if (strlen($avatar) > 5 * 1024 * 1024) {
                json_error('Слишком большой файл аватара (макс. 5 МБ)', 413);
            }
            $updates[] = 'avatar = :avatar';
            $params['avatar'] = $avatar;
        }

        if (array_key_exists('phone', $payload)) {
            if (!$isAdmin && !in_array('phone', $editable, true)) {
                json_error('Изменение телефона недоступно по настройкам доступа', 403);
            }
            $updates[] = 'phone = :phone';
            $params['phone'] = (string) $payload['phone'];
        }

        if (array_key_exists('name', $payload)) {
            if (!$isAdmin && !in_array('name', $editable, true)) {
                json_error('Изменение имени недоступно по настройкам доступа', 403);
            }
            $updates[] = 'name = :name';
            $params['name'] = (string) $payload['name'];
        }

        if (empty($updates)) {
            json_error('Нет полей для обновления', 400);
        }

        $updates[] = 'updated_at = :updated_at';
        $params['updated_at'] = now_mysql();

        $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = :id';
        db()->prepare($sql)->execute($params);

        $updated = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => (string) $user['id']]);
        $response = attach_employee_access_if_needed(map_user($updated ?: []), $updated ?: $user);
        json_response($response, 200, 'Профиль обновлен');
    }

    if ($method === 'POST' && $path === '/auth/logout') {
        require_auth();
        $token = current_bearer_token();
        db()->prepare('DELETE FROM user_tokens WHERE token = :token')->execute(['token' => $token]);
        json_response(['loggedOut' => true], 200, 'Сессия завершена');
    }

    if ($method === 'GET' && $path === '/settings') {
        $user = require_auth();
        require_active_tenant($user);
        enforce_employee_api_path($user, $path);
        json_response(settings_for_user($user));
    }

    if ($method === 'PUT' && $path === '/settings') {
        $user = require_auth();
        require_active_tenant($user);
        enforce_employee_api_path($user, $path);
        require_settings_write_access($user);
        $payload = json_input();
        $merged = merge_employee_settings_payload($user, $payload);
        enforce_tenant_location_limit(user_tenant_id($user), $merged);
        save_settings($merged);
        json_response(settings_for_user($user), 200, 'Настройки сохранены');
    }

    if ($method === 'POST' && $path === '/integrations/sms/test') {
        require_admin();
        $payload = json_input();
        $phone = trim((string) ($payload['phone'] ?? ''));
        if ($phone === '') {
            json_error('Укажите телефон для тестовой SMS', 422);
        }
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        if (($integrations['smsProvider'] ?? 'none') === 'none') {
            json_error('Сначала выберите SMS-провайдера', 422);
        }
        $company = trim((string) ($settings['business']['companyName'] ?? 'CRM'));
        $message = 'Тестовое SMS из ' . $company . '. Подключение работает.';
        $result = send_sms_via_provider($settings, $phone, $message, ['event' => 'test']);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось отправить тестовую SMS'), 502);
        }
        json_response($result, 200, 'Тестовая SMS отправлена');
    }

    if ($method === 'POST' && $path === '/integrations/sms/send') {
        require_auth_with_module('/orders');
        $payload = json_input();
        $order = is_array($payload['order'] ?? null) ? $payload['order'] : [];
        $debt = (float) ($payload['debt'] ?? 0);
        $status = (string) ($order['status'] ?? '');
        $phone = trim((string) ($order['clientPhone'] ?? ''));
        if ($status === '' || $phone === '') {
            json_error('Для SMS нужны статус заказа и телефон клиента', 422);
        }
        $settings = load_app_settings_migrated();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        $notifications = is_array($settings['notifications'] ?? null) ? $settings['notifications'] : [];
        if (empty($notifications['smsNotifications'])) {
            json_response(['success' => false, 'skipped' => true, 'message' => 'SMS-уведомления отключены в настройках'], 200);
        }
        $legacyKey = resolve_sms_template_key($status);
        $triggerEnabled = !empty($notifications['smsStatusTriggers'][$status]) || !empty($notifications['smsStatusTriggers'][$legacyKey]);
        if (!$triggerEnabled) {
            json_response(['success' => false, 'skipped' => true, 'message' => 'SMS для этого статуса отключены'], 200);
        }
        if (($integrations['smsProvider'] ?? 'none') === 'none' || empty($integrations['smsConnected'])) {
            json_response(['success' => false, 'skipped' => true, 'message' => 'SMS-провайдер не подключен'], 200);
        }
        $template = resolve_sms_template($integrations, $status);
        if ($template === '') {
            json_error('Не настроен текст SMS для этого статуса', 422);
        }
        $message = build_sms_message($template, $order, $settings, $debt);
        $result = send_sms_via_provider($settings, $phone, $message, [
            'event' => 'order_' . $status,
            'orderNumber' => (string) ($order['orderNumber'] ?? ''),
            'clientName' => (string) ($order['clientName'] ?? ''),
            'status' => $status,
            'debt' => $debt,
        ]);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось отправить SMS'), 502);
        }
        json_response(array_merge($result, [
            'smsText' => $message,
            'phone' => format_phone_for_display($phone),
        ]), 200, 'SMS отправлена');
    }

    if ($method === 'POST' && $path === '/integrations/sms/send-custom') {
        require_auth_with_module('/orders');
        $payload = json_input();
        $orderId = (string) ($payload['orderId'] ?? '');
        $message = trim((string) ($payload['message'] ?? ''));
        if ($orderId === '' || $message === '') {
            json_error('Укажите заказ и текст SMS', 422);
        }
        $orderRow = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $orderId]);
        if (!$orderRow) {
            json_error('Заказ не найден', 404);
        }
        $phone = trim((string) ($orderRow['client_phone'] ?? ''));
        if ($phone === '') {
            json_error('У клиента не указан телефон', 422);
        }
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        if (($integrations['smsProvider'] ?? 'none') === 'none' || empty($integrations['smsConnected'])) {
            json_error('SMS-провайдер не подключен', 422);
        }
        $result = send_sms_via_provider($settings, $phone, $message, [
            'event' => 'manual_order_message',
            'orderNumber' => (string) ($orderRow['order_number'] ?? ''),
            'clientName' => (string) ($orderRow['client_name'] ?? ''),
        ]);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось отправить SMS'), 502);
        }
        append_sms_to_order_row($orderRow, $phone, $message, 'outbound');
        $updated = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $orderId]);
        json_response([
            'order' => map_order($updated ?: []),
            'smsText' => $message,
            'phone' => format_phone_for_display($phone),
        ], 200, 'SMS отправлена');
    }

    if ($method === 'POST' && $path === '/integrations/telegram/connect') {
        require_admin();
        $payload = json_input();
        $botToken = trim((string) ($payload['botToken'] ?? ''));
        if ($botToken === '') {
            json_error('Укажите токен Telegram-бота', 422);
        }
        $me = telegram_api_request($botToken, 'getMe', []);
        if (empty($me['success'])) {
            json_error((string) ($me['message'] ?? 'Не удалось проверить бота'), 422);
        }
        $bot = is_array($me['result'] ?? null) ? $me['result'] : [];
        $webhookUrl = telegram_webhook_url();
        if ($webhookUrl === '') {
            json_error('Не удалось определить URL webhook', 422);
        }
        if (!str_starts_with($webhookUrl, 'https://')) {
            json_error('Telegram webhook требует HTTPS. Откройте CRM по защищённому адресу и повторите подключение.', 422);
        }
        $hook = telegram_api_request($botToken, 'setWebhook', ['url' => $webhookUrl]);
        if (empty($hook['success'])) {
            json_error((string) ($hook['message'] ?? 'Не удалось настроить webhook'), 502);
        }
        $botUsername = ltrim(trim((string) ($bot['username'] ?? '')), '@');
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        $integrations['telegramConnected'] = true;
        $integrations['telegramBotToken'] = $botToken;
        $integrations['telegramBotUsername'] = $botUsername;
        $settings['integrations'] = $integrations;
        save_settings($settings);
        json_response([
            'id' => (int) ($bot['id'] ?? 0),
            'username' => $botUsername,
            'firstName' => (string) ($bot['first_name'] ?? ''),
            'webhookUrl' => $webhookUrl,
        ], 200, 'Telegram-бот подключен');
    }

    if ($method === 'POST' && $path === '/integrations/telegram/disconnect') {
        require_admin();
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        $token = trim((string) ($integrations['telegramBotToken'] ?? ''));
        if ($token !== '') {
            telegram_api_request($token, 'deleteWebhook', []);
        }
        json_response(['success' => true], 200, 'Telegram-бот отключен');
    }

    if ($method === 'POST' && $path === '/integrations/telegram/test') {
        require_admin();
        $payload = json_input();
        $chatId = normalize_telegram_chat_id_input((string) ($payload['chatId'] ?? ''));
        if ($chatId === '') {
            json_error('Укажите числовой chat_id (не @имя_бота). Узнайте свой id у @userinfobot', 422);
        }
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        if (empty($integrations['telegramConnected']) || trim((string) ($integrations['telegramBotToken'] ?? '')) === '') {
            json_error('Telegram-бот не подключен', 422);
        }
        $company = trim((string) ($settings['business']['companyName'] ?? 'CRM'));
        $message = trim((string) ($payload['message'] ?? ''));
        if ($message === '') {
            $message = 'Тестовое сообщение из ' . $company . '. Подключение работает.';
        }
        $result = send_telegram_via_bot($settings, $chatId, $message);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось отправить тестовое сообщение'), 502);
        }
        json_response($result, 200, 'Тестовое сообщение отправлено');
    }

    if ($method === 'POST' && $path === '/integrations/telegram/send-custom') {
        require_auth_with_module('/orders');
        $payload = json_input();
        $orderId = (string) ($payload['orderId'] ?? '');
        $message = trim((string) ($payload['message'] ?? ''));
        if ($orderId === '' || $message === '') {
            json_error('Укажите заказ и текст сообщения', 422);
        }
        $orderRow = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $orderId]);
        if (!$orderRow) {
            json_error('Заказ не найден', 404);
        }
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        if (empty($integrations['telegramConnected']) || trim((string) ($integrations['telegramBotToken'] ?? '')) === '') {
            json_error('Telegram-бот не подключен', 422);
        }
        $chatId = get_order_client_telegram_chat_id($orderRow);
        if ($chatId === '') {
            json_error('У клиента не привязан Telegram. Попросите написать боту и отправить номер телефона.', 422);
        }
        $result = send_telegram_via_bot($settings, $chatId, $message);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось отправить Telegram'), 502);
        }
        append_telegram_to_order_row($orderRow, $message, 'outbound');
        $updated = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $orderId]);
        json_response([
            'order' => map_order($updated ?: []),
            'message' => $message,
            'chatId' => $chatId,
        ], 200, 'Сообщение отправлено в Telegram');
    }

    if ($method === 'POST' && $path === '/integrations/telegram/send-to-chat') {
        require_auth_with_module('/messages');
        $payload = json_input();
        $chatId = trim((string) ($payload['chatId'] ?? ''));
        $message = trim((string) ($payload['message'] ?? ''));
        if ($chatId === '' || $message === '') {
            json_error('Укажите chatId и текст сообщения', 422);
        }
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        if (empty($integrations['telegramConnected']) || trim((string) ($integrations['telegramBotToken'] ?? '')) === '') {
            json_error('Telegram-бот не подключен', 422);
        }
        $result = send_telegram_via_bot($settings, $chatId, $message);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось отправить Telegram'), 502);
        }

        $client = fetch_one_assoc('SELECT * FROM clients WHERE telegram_chat_id = :chat_id LIMIT 1', ['chat_id' => $chatId]);
        $orderRow = null;
        if ($client) {
            $orders = find_orders_for_telegram_client($client, 1);
            $orderRow = $orders[0] ?? null;
            if ($orderRow) {
                append_telegram_to_order_row($orderRow, $message, 'outbound');
            }
        }
        store_telegram_inbox_item($chatId, $message, 'outbound', $orderRow, $client ?: null);

        json_response([
            'message' => $message,
            'chatId' => $chatId,
        ], 200, 'Сообщение отправлено в Telegram');
    }

    if ($method === 'GET' && $path === '/integrations/sms/inbox') {
        require_auth_with_module('/messages');
        $tenantId = auth_tenant_id();
        $rows = fetch_all_assoc(
            'SELECT * FROM sms_inbox WHERE tenant_id = :tenant_id ORDER BY created_at DESC LIMIT 100',
            ['tenant_id' => $tenantId]
        );
        json_response(array_map(static function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'phone' => (string) ($row['phone'] ?? ''),
                'clientName' => (string) ($row['client_name'] ?? ''),
                'message' => (string) ($row['message'] ?? ''),
                'direction' => (string) ($row['direction'] ?? 'inbound'),
                'createdAt' => (string) ($row['created_at'] ?? ''),
            ];
        }, $rows));
    }

    if ($method === 'GET' && $path === '/integrations/telegram/inbox/status') {
        require_auth_with_module('/messages');
        $tenantId = auth_tenant_id();
        json_response(telegram_inbox_status_for_tenant($tenantId));
    }

    if ($method === 'POST' && $path === '/integrations/telegram/inbox/read') {
        require_auth_with_module('/messages');
        $tenantId = auth_tenant_id();
        $payload = request_json();
        $updated = mark_telegram_inbox_read($tenantId, is_array($payload) ? $payload : []);
        json_response(['updated' => $updated]);
    }

    if ($method === 'GET' && $path === '/integrations/telegram/inbox') {
        require_auth_with_module('/messages');
        $tenantId = auth_tenant_id();
        $rows = fetch_all_assoc(
            'SELECT * FROM telegram_inbox WHERE tenant_id = :tenant_id ORDER BY created_at DESC LIMIT 50',
            ['tenant_id' => $tenantId]
        );
        json_response(array_map(static fn(array $row): array => map_telegram_inbox_row($row), $rows));
    }

    if ($method === 'GET' && $path === '/integrations/sms/incoming-webhook') {
        require_admin();
        json_response([
            'url' => public_webhook_base_url(),
            'provider' => load_app_settings()['integrations']['smsProvider'] ?? 'none',
        ]);
    }

    if ($method === 'POST' && $path === '/integrations/sms/incoming-webhook/subscribe') {
        require_admin();
        $settings = load_app_settings();
        $integrations = is_array($settings['integrations'] ?? null) ? $settings['integrations'] : [];
        if (($integrations['smsProvider'] ?? 'none') !== 'moizvonki' || empty($integrations['smsConnected'])) {
            json_error('Сначала подключите провайдера «Мои Звонки»', 422);
        }
        $hookUrl = public_webhook_base_url();
        if ($hookUrl === '') {
            json_error('Не удалось определить URL webhook', 500);
        }
        $result = moizvonki_api_call($settings, 'webhook.subscribe', [
            'hooks' => ['sms.message' => $hookUrl],
        ]);
        if (empty($result['success'])) {
            json_error((string) ($result['message'] ?? 'Не удалось подписаться на входящие SMS'), 502);
        }
        json_response([
            'url' => $hookUrl,
            'subscriptions' => $result['payload'] ?? [],
        ], 200, 'Подписка на входящие SMS активирована');
    }

    if ($method === 'GET' && $path === '/users') {
        $user = require_auth_with_module('/employees');
        $tenantId = user_tenant_id($user);
        $rows = fetch_all_assoc(
            'SELECT id, name, email, phone, login_email, can_login, role, department, position,
                    salary, intake_rate, execution_rate, delivery_rate, rating, total_orders,
                    completed_orders, total_earnings, is_active, hire_date, last_login,
                    access_json, created_at, updated_at
             FROM users WHERE tenant_id = :tenant_id ORDER BY created_at DESC',
            ['tenant_id' => $tenantId]
        );
        json_response(array_map(static fn(array $row): array => map_user($row, false), $rows));
    }

    if ($method === 'POST' && $path === '/users') {
        $user = require_auth();
        require_active_tenant($user);
        require_admin();
        $tenantId = user_tenant_id($user);
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $role = (string) ($payload['role'] ?? 'manager');
        $accessJson = $role === 'admin'
            ? ''
            : encode_user_access_json(is_array($payload['access'] ?? null) ? $payload['access'] : null);
        $stmt = db()->prepare(
            'INSERT INTO users (
                id, name, email, phone, avatar, login_email, password_hash, can_login, role, department, position,
                salary, intake_rate, execution_rate, delivery_rate, rating, total_orders, completed_orders,
                total_earnings, is_active, hire_date, last_login, access_json, tenant_id, created_at, updated_at
            ) VALUES (
                :id, :name, :email, :phone, :avatar, :login_email, :password_hash, :can_login, :role, :department, :position,
                :salary, :intake_rate, :execution_rate, :delivery_rate, :rating, :total_orders, :completed_orders,
                :total_earnings, :is_active, :hire_date, :last_login, :access_json, :tenant_id, :created_at, :updated_at
            )'
        );
        $stmt->execute([
            'id' => $id,
            'name' => $payload['name'] ?? '',
            'email' => $payload['email'] ?? '',
            'phone' => $payload['phone'] ?? '',
            'avatar' => (string) ($payload['avatar'] ?? ''),
            'login_email' => $payload['loginEmail'] ?? '',
            'password_hash' => !empty($payload['password']) ? password_hash((string) $payload['password'], PASSWORD_DEFAULT) : '',
            'can_login' => bool_to_int($payload['canLogin'] ?? false),
            'role' => $role,
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
            'access_json' => $accessJson,
            'tenant_id' => $tenantId,
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $created = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_user($created ?: []), 201, 'Сотрудник создан');
    }

    if ($method === 'PUT' && route_matches('#^/users/([^/]+)$#', $path, $matches)) {
        $user = require_auth();
        require_active_tenant($user);
        require_admin();
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        $current = require_user_for_tenant($id, $tenantId);

        $payload = json_input();
        $passwordHash = $current['password_hash'];
        if (array_key_exists('password', $payload) && $payload['password'] !== '') {
            $passwordHash = password_hash((string) $payload['password'], PASSWORD_DEFAULT);
        }

        $accessJson = (string) ($current['access_json'] ?? '');
        $nextRole = (string) ($payload['role'] ?? $current['role']);
        if ($nextRole === 'admin') {
            $accessJson = '';
        } elseif (array_key_exists('access', $payload) && is_array($payload['access'])) {
            $accessJson = encode_user_access_json($payload['access']);
        }

        db()->prepare(
            'UPDATE users SET
                name = :name, email = :email, phone = :phone, avatar = :avatar, login_email = :login_email, password_hash = :password_hash,
                can_login = :can_login, role = :role, department = :department, position = :position, salary = :salary,
                intake_rate = :intake_rate, execution_rate = :execution_rate, delivery_rate = :delivery_rate,
                rating = :rating, total_orders = :total_orders, completed_orders = :completed_orders,
                total_earnings = :total_earnings, is_active = :is_active, hire_date = :hire_date,
                last_login = :last_login, access_json = :access_json, updated_at = :updated_at
             WHERE id = :id'
        )->execute([
            'id' => $id,
            'name' => $payload['name'] ?? $current['name'],
            'email' => $payload['email'] ?? $current['email'],
            'phone' => $payload['phone'] ?? $current['phone'],
            'avatar' => array_key_exists('avatar', $payload) ? (string) $payload['avatar'] : (string) ($current['avatar'] ?? ''),
            'login_email' => $payload['loginEmail'] ?? $current['login_email'],
            'password_hash' => $passwordHash,
            'can_login' => bool_to_int($payload['canLogin'] ?? $current['can_login']),
            'role' => $nextRole,
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
            'access_json' => $accessJson,
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_user($updated ?: []), 200, 'Сотрудник обновлен');
    }

    if ($method === 'DELETE' && route_matches('#^/users/([^/]+)$#', $path, $matches)) {
        $user = require_auth();
        require_active_tenant($user);
        require_admin();
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        require_user_for_tenant($id, $tenantId);
        db()->prepare('DELETE FROM user_tokens WHERE user_id = :id')->execute(['id' => $id]);
        db()->prepare('DELETE FROM users WHERE id = :id AND tenant_id = :tenant_id')->execute([
            'id' => $id,
            'tenant_id' => $tenantId,
        ]);
        json_response(['deleted' => true], 200, 'Сотрудник удален');
    }

    if ($method === 'GET' && $path === '/clients') {
        $user = require_auth_with_module('/clients');
        $tenantId = user_tenant_id($user);
        $rows = fetch_all_assoc('SELECT * FROM clients WHERE tenant_id = :tenant_id ORDER BY created_at DESC', ['tenant_id' => $tenantId]);
        json_response(array_map('map_client', $rows));
    }

    if ($method === 'POST' && $path === '/clients') {
        $user = require_auth_with_module('/clients');
        $tenantId = user_tenant_id($user);
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO clients (
                id, first_name, last_name, phone, telegram_chat_id, email, address, notes, custom_fields_json, total_orders, total_spent, last_order_date, tenant_id, created_at, updated_at
             ) VALUES (
                :id, :first_name, :last_name, :phone, :telegram_chat_id, :email, :address, :notes, :custom_fields_json, :total_orders, :total_spent, :last_order_date, :tenant_id, :created_at, :updated_at
             )'
        )->execute([
            'id' => $id,
            'first_name' => $payload['firstName'] ?? '',
            'last_name' => $payload['lastName'] ?? '',
            'phone' => $payload['phone'] ?? '',
            'telegram_chat_id' => $payload['telegramChatId'] ?? '',
            'email' => $payload['email'] ?? '',
            'address' => $payload['address'] ?? '',
            'notes' => $payload['notes'] ?? '',
            'custom_fields_json' => encode_client_custom_fields($payload),
            'total_orders' => $payload['totalOrders'] ?? 0,
            'total_spent' => $payload['totalSpent'] ?? 0,
            'last_order_date' => $payload['lastOrderDate'] ?? null,
            'tenant_id' => $tenantId,
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $client = fetch_one_assoc('SELECT * FROM clients WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_client($client ?: []), 201, 'Клиент создан');
    }

    if ($method === 'GET' && route_matches('#^/clients/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/clients');
        $client = require_client_for_tenant($matches[1], user_tenant_id($user));
        json_response(map_client($client));
    }

    if ($method === 'PUT' && route_matches('#^/clients/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/clients');
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        $current = require_client_for_tenant($id, $tenantId);
        $payload = json_input();
        $firstName = (string) ($payload['firstName'] ?? $current['first_name']);
        $lastName = (string) ($payload['lastName'] ?? $current['last_name']);
        $phone = (string) ($payload['phone'] ?? $current['phone']);
        $clientDisplayName = trim(trim($firstName) . ' ' . trim($lastName));
        db()->prepare(
            'UPDATE clients SET
                first_name = :first_name, last_name = :last_name, phone = :phone, telegram_chat_id = :telegram_chat_id,
                email = :email, address = :address, notes = :notes, custom_fields_json = :custom_fields_json,
                total_orders = :total_orders, total_spent = :total_spent,
                last_order_date = :last_order_date, updated_at = :updated_at
             WHERE id = :id'
        )->execute([
            'id' => $id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => $phone,
            'telegram_chat_id' => array_key_exists('telegramChatId', $payload)
                ? (string) ($payload['telegramChatId'] ?? '')
                : (string) ($current['telegram_chat_id'] ?? ''),
            'email' => $payload['email'] ?? $current['email'],
            'address' => $payload['address'] ?? $current['address'],
            'notes' => $payload['notes'] ?? $current['notes'],
            'custom_fields_json' => encode_client_custom_fields(
                $payload,
                json_decode((string) ($current['custom_fields_json'] ?? ''), true) ?: []
            ),
            'total_orders' => $payload['totalOrders'] ?? $current['total_orders'],
            'total_spent' => $payload['totalSpent'] ?? $current['total_spent'],
            'last_order_date' => $payload['lastOrderDate'] ?? $current['last_order_date'],
            'updated_at' => now_mysql(),
        ]);

        // Keep denormalized order fields in sync with the client card.
        db()->prepare(
            'UPDATE orders
             SET client_name = :client_name, client_phone = :client_phone, updated_at = :updated_at
             WHERE client_id = :client_id AND tenant_id = :tenant_id'
        )->execute([
            'client_name' => $clientDisplayName,
            'client_phone' => $phone,
            'updated_at' => now_mysql(),
            'client_id' => $id,
            'tenant_id' => $tenantId,
        ]);

        $updated = fetch_one_assoc('SELECT * FROM clients WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_client($updated ?: []), 200, 'Клиент обновлен');
    }

    if ($method === 'DELETE' && route_matches('#^/clients/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/clients');
        $tenantId = user_tenant_id($user);
        require_client_for_tenant($matches[1], $tenantId);
        db()->prepare('DELETE FROM clients WHERE id = :id AND tenant_id = :tenant_id')->execute([
            'id' => $matches[1],
            'tenant_id' => $tenantId,
        ]);
        json_response(['deleted' => true], 200, 'Клиент удален');
    }

    if ($method === 'GET' && $path === '/devices') {
        $user = require_auth_with_module('/clients');
        $tenantId = user_tenant_id($user);
        $sql = 'SELECT d.* FROM devices d INNER JOIN clients c ON c.id = d.client_id WHERE c.tenant_id = :tenant_id';
        $params = ['tenant_id' => $tenantId];
        if (!empty($_GET['clientId'])) {
            $sql .= ' AND d.client_id = :client_id';
            $params['client_id'] = (string) $_GET['clientId'];
        }
        $sql .= ' ORDER BY d.created_at DESC';
        $rows = fetch_all_assoc($sql, $params);
        json_response(array_map('map_device', $rows));
    }

    if ($method === 'POST' && $path === '/devices') {
        $user = require_auth_with_module('/clients');
        $tenantId = user_tenant_id($user);
        $payload = json_input();
        $clientId = (string) ($payload['clientId'] ?? '');
        require_client_id_for_tenant($clientId, $tenantId);
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
        json_response(map_device($device ?: []), 201, 'Устройство создано');
    }

    if ($method === 'GET' && route_matches('#^/devices/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/clients');
        $device = require_device_for_tenant($matches[1], user_tenant_id($user));
        json_response(map_device($device));
    }

    if ($method === 'GET' && $path === '/orders') {
        $user = require_auth_with_module('/orders');
        $tenantId = user_tenant_id($user);
        $lite = !isset($_GET['lite']) || !in_array((string) $_GET['lite'], ['0', 'false'], true);
        if ($lite) {
            $rows = fetch_all_assoc(
                'SELECT id, order_number, client_id, device_id, technician_id, technician_name,
                        intake_manager_name, delivery_manager_name, status, priority, description, diagnosis,
                        estimated_cost, final_cost, estimated_days, actual_days, estimated_time,
                        parts_json, payments_json, completed_at, is_paid, is_warranty, device_password,
                        client_name, client_phone, device_brand, device_model, device_serial, device_imei,
                        device_color, device_condition, device_external_condition, created_at, updated_at
                 FROM orders WHERE tenant_id = :tenant_id ORDER BY created_at DESC',
                ['tenant_id' => $tenantId]
            );
            json_response(array_map(static fn(array $row): array => map_order($row, true), $rows));
        } else {
            $rows = fetch_all_assoc('SELECT * FROM orders WHERE tenant_id = :tenant_id ORDER BY created_at DESC', ['tenant_id' => $tenantId]);
            json_response(array_map(static fn(array $row): array => map_order($row, false), $rows));
        }
    }

    if ($method === 'POST' && $path === '/orders') {
        $user = require_auth_with_module('/orders');
        $tenantId = user_tenant_id($user);
        $payload = json_input();
        $settings = load_app_settings_migrated();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $orderNumber = trim((string) ($payload['orderNumber'] ?? ''));
        if ($orderNumber === '') {
            $orderNumber = generate_order_number();
        }
        $status = resolve_default_new_order_status($settings);
        $communicationHistory = is_array($payload['communicationHistory'] ?? null) ? $payload['communicationHistory'] : [];
        db()->prepare(
            'INSERT INTO orders (
                id, order_number, client_id, device_id, technician_id, technician_name, intake_manager_name, delivery_manager_name,
                status, priority, description, diagnosis, estimated_cost, final_cost, estimated_days, actual_days, estimated_time,
                parts_json, payments_json, communication_history_json, completed_at, is_paid, is_warranty, device_password,
                client_name, client_phone, device_brand, device_model, device_serial, device_imei, device_color,
                device_condition, device_external_condition, tenant_id, created_at, updated_at
             ) VALUES (
                :id, :order_number, :client_id, :device_id, :technician_id, :technician_name, :intake_manager_name, :delivery_manager_name,
                :status, :priority, :description, :diagnosis, :estimated_cost, :final_cost, :estimated_days, :actual_days, :estimated_time,
                :parts_json, :payments_json, :communication_history_json, :completed_at, :is_paid, :is_warranty, :device_password,
                :client_name, :client_phone, :device_brand, :device_model, :device_serial, :device_imei, :device_color,
                :device_condition, :device_external_condition, :tenant_id, :created_at, :updated_at
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
            'status' => $status,
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
            'communication_history_json' => json_encode($communicationHistory, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'completed_at' => $payload['completedAt'] ?? null,
            'is_paid' => bool_to_int($payload['isPaid'] ?? false),
            'is_warranty' => bool_to_int($payload['isWarranty'] ?? false),
            'device_password' => $payload['devicePassword'] ?? '',
            'client_name' => $payload['clientName'] ?? '',
            'client_phone' => $payload['clientPhone'] ?? '',
            'device_brand' => $payload['deviceBrand'] ?? '',
            'device_model' => $payload['deviceModel'] ?? '',
            'device_serial' => $payload['deviceSerial'] ?? '',
            'device_imei' => $payload['deviceImei'] ?? '',
            'device_color' => $payload['deviceColor'] ?? '',
            'device_condition' => $payload['deviceCondition'] ?? '',
            'device_external_condition' => $payload['deviceExternalCondition'] ?? '',
            'tenant_id' => $tenantId,
            'created_at' => $payload['createdAt'] ?? now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $order = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
        if ($order) {
            $smsHistory = apply_order_created_sms($order);
            $currentHistory = decode_json_column($order['communication_history_json'] ?? '[]', []);
            if (count($smsHistory) > count($currentHistory)) {
                db()->prepare('UPDATE orders SET communication_history_json = :history, updated_at = :updated_at WHERE id = :id AND tenant_id = :tenant_id')->execute([
                    'history' => json_encode($smsHistory, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'updated_at' => now_mysql(),
                    'id' => $id,
                    'tenant_id' => $tenantId,
                ]);
                $order = fetch_one_assoc('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $id]);
            }
        }
        json_response(map_order($order ?: []), 201, 'Заказ создан');
    }

    if ($method === 'GET' && route_matches('#^/orders/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/orders');
        $order = require_order_for_tenant($matches[1], user_tenant_id($user));
        json_response(map_order($order));
    }

    if ($method === 'DELETE' && route_matches('#^/orders/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/orders');
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        require_order_for_tenant($id, $tenantId);
        db()->prepare('DELETE FROM orders WHERE id = :id AND tenant_id = :tenant_id')->execute([
            'id' => $id,
            'tenant_id' => $tenantId,
        ]);
        json_response(['deleted' => true], 200, 'Заказ удален');
    }

    if ($method === 'PUT' && route_matches('#^/orders/([^/]+)$#', $path, $matches)) {
        $user = require_auth_with_module('/orders');
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        $current = require_order_for_tenant($id, $tenantId);
        $payload = json_input();
        $payload = apply_order_status_sms_on_change($current, $payload);
        $serverHistory = decode_json_column($current['communication_history_json'] ?? '[]', []);
        if (array_key_exists('communicationHistory', $payload) && is_array($payload['communicationHistory'])) {
            $communicationHistory = merge_communication_history($serverHistory, $payload['communicationHistory']);
        } else {
            $communicationHistory = $serverHistory;
        }
        db()->prepare(
            'UPDATE orders SET
                order_number = :order_number, client_id = :client_id, device_id = :device_id, technician_id = :technician_id,
                technician_name = :technician_name, intake_manager_name = :intake_manager_name, delivery_manager_name = :delivery_manager_name,
                status = :status, priority = :priority, description = :description, diagnosis = :diagnosis,
                estimated_cost = :estimated_cost, final_cost = :final_cost, estimated_days = :estimated_days,
                actual_days = :actual_days, estimated_time = :estimated_time, parts_json = :parts_json,
                payments_json = :payments_json, communication_history_json = :communication_history_json,
                completed_at = :completed_at, is_paid = :is_paid, is_warranty = :is_warranty, device_password = :device_password,
                client_name = :client_name, client_phone = :client_phone,
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
            'communication_history_json' => json_encode($communicationHistory, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'completed_at' => $payload['completedAt'] ?? $current['completed_at'],
            'is_paid' => bool_to_int($payload['isPaid'] ?? $current['is_paid']),
            'is_warranty' => bool_to_int($payload['isWarranty'] ?? $current['is_warranty']),
            'device_password' => (static function (array $payload, array $current): string {
                if (!array_key_exists('devicePassword', $payload)) {
                    return (string) ($current['device_password'] ?? '');
                }
                $next = (string) $payload['devicePassword'];
                if ($next === '' && ($current['device_password'] ?? '') !== '') {
                    return (string) $current['device_password'];
                }

                return $next;
            })($payload, $current),
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
        json_response(map_order($updated ?: []), 200, 'Заказ обновлен');
    }

    if ($method === 'PATCH' && route_matches('#^/orders/([^/]+)/status$#', $path, $matches)) {
        $user = require_auth_with_module('/orders');
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        $current = require_order_for_tenant($id, $tenantId);
        $payload = json_input();
        $payload = apply_order_status_sms_on_change($current, $payload);
        db()->prepare(
            'UPDATE orders SET status = :status, communication_history_json = :communication_history_json, updated_at = :updated_at WHERE id = :id'
        )->execute([
            'id' => $id,
            'status' => $payload['status'] ?? $current['status'],
            'communication_history_json' => json_encode(
                $payload['communicationHistory'] ?? decode_json_column($current['communication_history_json'] ?? '[]', []),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_order_for_tenant($id, $tenantId);
        if (!$updated) {
            json_error('Заказ не найден', 404);
        }
        json_response(map_order($updated), 200, 'Статус обновлен');
    }

    if ($method === 'POST' && route_matches('#^/orders/([^/]+)/payments$#', $path, $matches)) {
        $user = require_auth_with_module('/orders');
        $tenantId = user_tenant_id($user);
        $id = $matches[1];
        $current = require_order_for_tenant($id, $tenantId);

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
        json_response(map_order($updated ?: []), 200, 'Оплата добавлена');
    }

    if ($method === 'GET' && $path === '/inventory/parts') {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $rows = fetch_all_assoc(
            'SELECT * FROM inventory_parts WHERE tenant_id = :tenant_id ORDER BY created_at DESC',
            ['tenant_id' => $tenantId]
        );
        json_response(array_map('map_part', $rows));
    }

    if ($method === 'POST' && $path === '/inventory/parts') {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO inventory_parts (
                id, part_type, name, part_number, category, subcategory, brand, model, description, quantity, min_quantity,
                alert_threshold, notifications_enabled, wholesale_price, unit_price, supplier, supplier_contact, location_name, warehouse_id, tenant_id, created_at, updated_at
             ) VALUES (
                :id, :part_type, :name, :part_number, :category, :subcategory, :brand, :model, :description, :quantity, :min_quantity,
                :alert_threshold, :notifications_enabled, :wholesale_price, :unit_price, :supplier, :supplier_contact, :location_name, :warehouse_id, :tenant_id, :created_at, :updated_at
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
            'notifications_enabled' => bool_to_int($payload['notificationsEnabled'] ?? false),
            'wholesale_price' => $payload['wholesalePrice'] ?? ($payload['unitPrice'] ?? 0),
            'unit_price' => $payload['unitPrice'] ?? 0,
            'supplier' => $payload['supplier'] ?? '',
            'supplier_contact' => $payload['supplierContact'] ?? '',
            'location_name' => $payload['location'] ?? '',
            'warehouse_id' => $payload['warehouseId'] ?? '',
            'tenant_id' => $tenantId,
            'created_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_part($part ?: []), 201, 'Запчасть создана');
    }

    if ($method === 'GET' && route_matches('#^/inventory/parts/([^/]+)$#', $path, $matches)) {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        assert_tenant_row($part, $tenantId, 'Запчасть не найдена');
        json_response(map_part($part));
    }

    if ($method === 'PUT' && route_matches('#^/inventory/parts/([^/]+)$#', $path, $matches)) {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $id = $matches[1];
        $current = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        assert_tenant_row($current, $tenantId, 'Запчасть не найдена');
        $payload = json_input();
        db()->prepare(
            'UPDATE inventory_parts SET
                part_type = :part_type, name = :name, part_number = :part_number, category = :category, subcategory = :subcategory,
                brand = :brand, model = :model, description = :description, quantity = :quantity,
                min_quantity = :min_quantity, alert_threshold = :alert_threshold, notifications_enabled = :notifications_enabled,
                wholesale_price = :wholesale_price, unit_price = :unit_price, supplier = :supplier, supplier_contact = :supplier_contact,
                location_name = :location_name, warehouse_id = :warehouse_id, updated_at = :updated_at
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
            'warehouse_id' => $payload['warehouseId'] ?? ($current['warehouse_id'] ?? ''),
            'updated_at' => now_mysql(),
        ]);
        $updated = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_part($updated ?: []), 200, 'Запчасть обновлена');
    }

    if ($method === 'DELETE' && route_matches('#^/inventory/parts/([^/]+)$#', $path, $matches)) {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $id = $matches[1];
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        assert_tenant_row($part, $tenantId, 'Запчасть не найдена');
        db()->prepare('DELETE FROM stock_movements WHERE part_id = :part_id')->execute([
            'part_id' => $id,
        ]);
        db()->prepare('DELETE FROM inventory_parts WHERE id = :id')->execute([
            'id' => $id,
        ]);
        json_response(['deleted' => true], 200, 'Запчасть удалена');
    }
    if ($method === 'POST' && route_matches('#^/inventory/parts/([^/]+)/(add-stock|deduct-stock)$#', $path, $matches)) {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $id = $matches[1];
        $mode = $matches[2];
        $payload = json_input();
        $part = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        assert_tenant_row($part, $tenantId, 'Запчасть не найдена');

        $quantity = (int) ($payload['quantity'] ?? 0);
        if ($quantity <= 0) {
            json_error('Количество должно быть больше нуля', 422);
        }

        $delta = $mode === 'add-stock' ? $quantity : -$quantity;
        $newQty = (int) $part['quantity'] + $delta;
        if ($newQty < 0) {
            json_error('Недостаточно остатка на складе', 422);
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
            'reason' => $payload['reason'] ?? ($mode === 'add-stock' ? 'Оприходование' : 'Списание'),
            'unit_cost' => $payload['unitCost'] ?? $part['unit_price'],
            'total_cost' => ((float) ($payload['unitCost'] ?? $part['unit_price'])) * $quantity,
            'supplier' => $payload['supplier'] ?? $part['supplier'],
            'document_number' => $payload['documentNumber'] ?? '',
            'order_number' => $payload['orderNumber'] ?? '',
            'processed_by' => $payload['processedBy'] ?? 'CRM',
            'created_at' => now_mysql(),
        ]);

        $updated = fetch_one_assoc('SELECT * FROM inventory_parts WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_part($updated ?: []), 200, $mode === 'add-stock' ? 'Оприходование выполнено' : 'Списание выполнено');
    }

    if ($method === 'GET' && $path === '/inventory/movements') {
        require_auth_with_module('/inventory');
        $tenantId = auth_tenant_id();
        $rows = fetch_all_assoc(
            'SELECT sm.*
             FROM stock_movements sm
             INNER JOIN inventory_parts ip ON ip.id = sm.part_id
             WHERE ip.tenant_id = :tenant_id
             ORDER BY sm.created_at DESC',
            ['tenant_id' => $tenantId]
        );
        json_response(array_map('map_movement', $rows));
    }

    if ($method === 'GET' && $path === '/cash/operations') {
        require_auth_with_module('/cash-register');
        $tenantId = auth_tenant_id();
        $rows = fetch_all_assoc(
            'SELECT * FROM cash_operations WHERE tenant_id = :tenant_id ORDER BY processed_at DESC',
            ['tenant_id' => $tenantId]
        );
        json_response(array_map('map_cash_operation', $rows));
    }

    if ($method === 'POST' && $path === '/cash/operations') {
        require_auth_with_module('/cash-register');
        $tenantId = auth_tenant_id();
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        db()->prepare(
            'INSERT INTO cash_operations (
                id, type, amount, description, category, subcategory, payment_method, register_type,
                source, order_id, processed_by, processed_at, notes, tenant_id
             ) VALUES (
                :id, :type, :amount, :description, :category, :subcategory, :payment_method, :register_type,
                :source, :order_id, :processed_by, :processed_at, :notes, :tenant_id
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
            'tenant_id' => $tenantId,
        ]);
        $operation = fetch_one_assoc('SELECT * FROM cash_operations WHERE id = :id LIMIT 1', ['id' => $id]);
        json_response(map_cash_operation($operation ?: []), 201, 'Операция сохранена');
    }

    if ($method === 'DELETE' && route_matches('#^/cash/operations/([^/]+)$#', $path, $matches)) {
        require_auth_with_module('/cash-register');
        $tenantId = auth_tenant_id();
        $operation = fetch_one_assoc('SELECT * FROM cash_operations WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        assert_tenant_row($operation, $tenantId, 'Операция не найдена');
        db()->prepare('DELETE FROM cash_operations WHERE id = :id AND tenant_id = :tenant_id')->execute([
            'id' => $matches[1],
            'tenant_id' => $tenantId,
        ]);
        json_response(['deleted' => true], 200, 'Операция удалена');
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
        require_auth_with_module('/orders');
        $orderId = trim((string) ($_GET['orderId'] ?? ''));
        if ($orderId !== '') {
            $row = fetch_one_assoc('SELECT * FROM acceptance_acts WHERE order_id = :order_id LIMIT 1', ['order_id' => $orderId]);
            json_response($row ? map_acceptance_act($row) : null);
        }
        $rows = fetch_all_assoc('SELECT * FROM acceptance_acts ORDER BY created_at DESC');
        json_response(array_map('map_acceptance_act', $rows));
    }

    if ($method === 'POST' && $path === '/documents/acceptance-acts') {
        require_auth_with_module('/orders');
        $payload = json_input();
        $id = (string) ($payload['id'] ?? (string) round(microtime(true) * 1000));
        $orderId = (string) ($payload['orderId'] ?? '');
        $orderNumber = (string) ($payload['orderNumber'] ?? '');
        db()->prepare('INSERT INTO acceptance_acts (id, order_id, order_number, document_number, client_json, device_json, problem_description, preliminary_cost, advance_payment, estimated_days, estimated_completion_date, acceptance_date, accepted_by, conditions_text, client_signature_json, master_signature_json, printed_at, created_at, updated_at) VALUES (:id, :order_id, :order_number, :document_number, :client_json, :device_json, :problem_description, :preliminary_cost, :advance_payment, :estimated_days, :estimated_completion_date, :acceptance_date, :accepted_by, :conditions_text, :client_signature_json, :master_signature_json, :printed_at, :created_at, :updated_at) ON DUPLICATE KEY UPDATE order_number = VALUES(order_number), document_number = VALUES(document_number), client_json = VALUES(client_json), device_json = VALUES(device_json), problem_description = VALUES(problem_description), preliminary_cost = VALUES(preliminary_cost), advance_payment = VALUES(advance_payment), estimated_days = VALUES(estimated_days), estimated_completion_date = VALUES(estimated_completion_date), acceptance_date = VALUES(acceptance_date), accepted_by = VALUES(accepted_by), conditions_text = VALUES(conditions_text), updated_at = VALUES(updated_at)')->execute([
            'id' => $id,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'document_number' => 'АП-' . $orderNumber,
            'client_json' => json_encode($payload['client'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'device_json' => json_encode($payload['device'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'problem_description' => $payload['problemDescription'] ?? '',
            'preliminary_cost' => $payload['preliminaryCost'] ?? 0,
            'advance_payment' => $payload['advancePayment'] ?? 0,
            'estimated_days' => (int) ($payload['estimatedDays'] ?? 0),
            'estimated_completion_date' => to_mysql_datetime($payload['estimatedCompletionDate'] ?? null, null),
            'acceptance_date' => to_mysql_datetime($payload['acceptanceDate'] ?? null, now_mysql()),
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
        require_auth_with_module('/orders');
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
        require_auth_with_module('/orders');
        db()->prepare('UPDATE acceptance_acts SET printed_at = :printed_at, updated_at = :updated_at WHERE id = :id')->execute([
            'id' => $matches[1],
            'printed_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM acceptance_acts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_acceptance_act($row ?: []), 200, 'РЎС‚Р°С‚СѓСЃ РїРµС‡Р°С‚Рё РѕР±РЅРѕРІР»РµРЅ');
    }

    if ($method === 'GET' && $path === '/documents/completion-acts') {
        require_auth_with_module('/orders');
        $orderId = trim((string) ($_GET['orderId'] ?? ''));
        if ($orderId !== '') {
            $row = fetch_one_assoc('SELECT * FROM work_completion_acts WHERE order_id = :order_id LIMIT 1', ['order_id' => $orderId]);
            json_response($row ? map_work_completion_act($row) : null);
        }
        $rows = fetch_all_assoc('SELECT * FROM work_completion_acts ORDER BY created_at DESC');
        json_response(array_map('map_work_completion_act', $rows));
    }

    if ($method === 'POST' && $path === '/documents/completion-acts') {
        require_auth_with_module('/orders');
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
            'completion_date' => to_mysql_datetime($payload['completionDate'] ?? null, now_mysql()),
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
        require_auth_with_module('/orders');
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
        require_auth_with_module('/orders');
        db()->prepare('UPDATE work_completion_acts SET printed_at = :printed_at, updated_at = :updated_at WHERE id = :id')->execute([
            'id' => $matches[1],
            'printed_at' => now_mysql(),
            'updated_at' => now_mysql(),
        ]);
        $row = fetch_one_assoc('SELECT * FROM work_completion_acts WHERE id = :id LIMIT 1', ['id' => $matches[1]]);
        json_response(map_work_completion_act($row ?: []), 200, 'РЎС‚Р°С‚СѓСЃ РїРµС‡Р°С‚Рё РѕР±РЅРѕРІР»РµРЅ');
    }

    if ($method === 'GET' && $path === '/documents/storage') {
        require_auth_with_module('/orders');
        $orderId = trim((string) ($_GET['orderId'] ?? ''));
        if ($orderId !== '') {
            $rows = fetch_all_assoc('SELECT * FROM document_storage WHERE order_id = :order_id ORDER BY created_at DESC', ['order_id' => $orderId]);
        } else {
            $rows = fetch_all_assoc('SELECT * FROM document_storage ORDER BY created_at DESC');
        }
        json_response(array_map('map_document_storage', $rows));
    }

    if ($method === 'POST' && $path === '/documents/storage') {
        require_auth_with_module('/orders');
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

    json_error('Маршрут не найден', 404, ['path' => $path, 'method' => $method]);
} catch (PDOException $exception) {
    json_error('Ошибка базы данных: ' . $exception->getMessage(), 500);
} catch (Throwable $exception) {
    json_error('Внутренняя ошибка: ' . $exception->getMessage(), 500);
}

