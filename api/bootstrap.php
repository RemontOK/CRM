<?php

declare(strict_types=1);

$configFile = __DIR__ . '/config.local.php';
if (!file_exists($configFile)) {
    $configFile = __DIR__ . '/config.local.php.example';
}

$config = require $configFile;

function app_config(?string $section = null): array
{
    global $config;
    if ($section === null) {
        return $config;
    }
    return $config[$section] ?? [];
}

function app_debug(): bool
{
    $app = app_config('app');
    return (bool) ($app['debug'] ?? false);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = app_config('db');
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['database'],
        $db['charset']
    );

    $pdo = new PDO($dsn, $db['username'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    ensure_runtime_schema($pdo, (string) $db['database']);

    return $pdo;
}

function ensure_runtime_schema(PDO $pdo, string $databaseName): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS taxonomy_nodes (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            scope VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            parent_id VARCHAR(64) NULL,
            created_at DATETIME NOT NULL,
            KEY idx_taxonomy_nodes_scope (scope),
            KEY idx_taxonomy_nodes_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $ensureColumn = static function (string $table, string $column, string $definition) use ($pdo, $databaseName): void {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name'
        );
        $stmt->execute([
            'schema' => $databaseName,
            'table_name' => $table,
            'column_name' => $column,
        ]);
        $exists = (int) $stmt->fetchColumn() > 0;
        if (!$exists) {
            $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', $table, $column, $definition));
        }
    };

    $ensureColumn('inventory_parts', 'subcategory', "VARCHAR(255) NOT NULL DEFAULT ''");
    $ensureColumn('inventory_parts', 'part_type', "VARCHAR(32) NOT NULL DEFAULT 'spare_part'");
    $ensureColumn('inventory_parts', 'alert_threshold', "INT NOT NULL DEFAULT 0");
    $ensureColumn('inventory_parts', 'notifications_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
    $ensureColumn('inventory_parts', 'wholesale_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
    $ensureColumn('inventory_parts', 'supplier_contact', "VARCHAR(255) NOT NULL DEFAULT ''");
    $ensureColumn('inventory_parts', 'location_name', "VARCHAR(255) NOT NULL DEFAULT ''");
}

function json_input(): array
{
    if (!empty($_POST) && is_array($_POST)) {
        return $_POST;
    }

    $input = file_get_contents('php://input');
    if (!$input) {
        return [];
    }

    $input = preg_replace('/^\xEF\xBB\xBF/', '', $input) ?? $input;
    $decoded = json_decode($input, true);
    if (is_array($decoded)) {
        return $decoded;
    }

    $parsed = [];
    parse_str($input, $parsed);
    return is_array($parsed) ? $parsed : [];
}

function json_response($data = null, int $status = 200, ?string $message = null): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');

    $response = [
        'success' => $status < 400,
        'data' => $data,
    ];

    if ($message !== null) {
        $response['message'] = $message;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400, $data = null): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'data' => $data,
        'error' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function string_starts_with(string $haystack, string $needle): bool
{
    return $needle === '' || strpos($haystack, $needle) === 0;
}

function request_path(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $basePath = rtrim(app_config('app')['base_path'] ?? '/api', '/');
    if ($basePath && string_starts_with($uri, $basePath)) {
        $uri = substr($uri, strlen($basePath));
    }

    $uri = '/' . trim($uri ?: '/', '/');
    return $uri === '//' ? '/' : $uri;
}

function current_bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return trim($matches[1]);
    }

    return null;
}

function require_auth(): array
{
    $token = current_bearer_token();
    if (!$token) {
        json_error('Требуется авторизация', 401);
    }

    $sql = 'SELECT ut.token, ut.expires_at, u.*
            FROM user_tokens ut
            INNER JOIN users u ON u.id = ut.user_id
            WHERE ut.token = :token
            LIMIT 1';
    $stmt = db()->prepare($sql);
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('Сессия не найдена', 401);
    }

    if (!empty($user['expires_at']) && strtotime((string) $user['expires_at']) < time()) {
        json_error('Срок действия сессии истек', 401);
    }

    return $user;
}

function now_mysql(): string
{
    return date('Y-m-d H:i:s');
}

function uuid_token(): string
{
    return bin2hex(random_bytes(32));
}

function paginate_array(array $items): array
{
    return [
        'data' => array_values($items),
        'total' => count($items),
        'page' => 1,
        'limit' => count($items),
        'totalPages' => 1,
    ];
}

function bool_to_int($value): int
{
    return $value ? 1 : 0;
}

function generate_order_number(): string
{
    $last = db()->query("SELECT order_number FROM orders WHERE order_number <> '' ORDER BY created_at DESC, order_number DESC LIMIT 1")->fetchColumn();
    $next = 1;

    if (is_string($last) && preg_match('/(\d+)/', $last, $matches)) {
        $next = ((int) $matches[1]) + 1;
    }

    return str_pad((string) $next, 6, '0', STR_PAD_LEFT);
}
