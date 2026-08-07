<?php

declare(strict_types=1);

function ensure_platform_schema(PDO $pdo, string $databaseName): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS tenants (
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
            KEY idx_tenants_status (status),
            KEY idx_tenants_owner (owner_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS tenant_activity_log (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            tenant_id BIGINT UNSIGNED NULL,
            user_id VARCHAR(64) NULL,
            action VARCHAR(64) NOT NULL,
            details TEXT NULL,
            ip_address VARCHAR(45) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            KEY idx_activity_tenant (tenant_id),
            KEY idx_activity_created (created_at),
            KEY idx_activity_action (action)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS subscription_plans (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(32) NOT NULL,
            name VARCHAR(255) NOT NULL,
            price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uniq_plans_code (code)
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
        if ((int) $stmt->fetchColumn() === 0) {
            $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', $table, $column, $definition));
        }
    };

    $ensureColumn('users', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('users', 'is_platform_admin', 'TINYINT(1) NOT NULL DEFAULT 0');
    $ensureColumn('clients', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('orders', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('inventory_parts', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('cash_operations', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('telegram_inbox', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('sms_inbox', 'tenant_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
    $ensureColumn('users', 'yandex_id', 'VARCHAR(64) NOT NULL DEFAULT \'\'');
    $ensureColumn('users', 'email_verified', 'TINYINT(1) NOT NULL DEFAULT 0');
    $ensureColumn('users', 'email_verification_token', 'VARCHAR(64) NULL DEFAULT NULL');
    $ensureColumn('users', 'email_verification_sent_at', 'DATETIME NULL DEFAULT NULL');
    $ensureColumn('users', 'email_verified_at', 'DATETIME NULL DEFAULT NULL');
    $ensureColumn('tenants', 'location_slots', 'INT UNSIGNED NOT NULL DEFAULT 1');

    $ensureIndex = static function (string $table, string $indexName, string $definition) use ($pdo, $databaseName): void {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table_name AND INDEX_NAME = :index_name'
        );
        $stmt->execute([
            'schema' => $databaseName,
            'table_name' => $table,
            'index_name' => $indexName,
        ]);
        if ((int) $stmt->fetchColumn() === 0) {
            $pdo->exec(sprintf('ALTER TABLE `%s` ADD %s', $table, $definition));
        }
    };

    $ensureIndex('users', 'uniq_users_login_email', 'UNIQUE KEY uniq_users_login_email (login_email)');

    require_once __DIR__ . '/email_verification.php';
    migrate_existing_users_email_verified($pdo);

    seed_platform_defaults($pdo);
    ensure_user_notifications_schema($pdo);
}

function user_tenant_id(array $user): int
{
    return max(1, (int) ($user['tenant_id'] ?? 1));
}

function auth_tenant_id(): int
{
    $user = $GLOBALS['__current_auth_user'] ?? null;
    if (!is_array($user)) {
        json_error('Требуется авторизация', 401);
    }

    return user_tenant_id($user);
}

function assert_tenant_row(?array $row, int $tenantId, string $message = 'Запись не найдена'): void
{
    if (!$row || (int) ($row['tenant_id'] ?? 1) !== $tenantId) {
        json_error($message, 404);
    }
}

function fetch_client_for_tenant(string $id, int $tenantId): ?array
{
    return fetch_one_assoc(
        'SELECT * FROM clients WHERE id = :id AND tenant_id = :tenant_id LIMIT 1',
        ['id' => $id, 'tenant_id' => $tenantId]
    );
}

function require_client_for_tenant(string $id, int $tenantId): array
{
    $row = fetch_client_for_tenant($id, $tenantId);
    if (!$row) {
        json_error('Клиент не найден', 404);
    }

    return $row;
}

function fetch_order_for_tenant(string $id, int $tenantId): ?array
{
    return fetch_one_assoc(
        'SELECT * FROM orders WHERE id = :id AND tenant_id = :tenant_id LIMIT 1',
        ['id' => $id, 'tenant_id' => $tenantId]
    );
}

function require_order_for_tenant(string $id, int $tenantId): array
{
    $row = fetch_order_for_tenant($id, $tenantId);
    if (!$row) {
        json_error('Заказ не найден', 404);
    }

    return $row;
}

function fetch_user_for_tenant(string $id, int $tenantId): ?array
{
    return fetch_one_assoc(
        'SELECT * FROM users WHERE id = :id AND tenant_id = :tenant_id LIMIT 1',
        ['id' => $id, 'tenant_id' => $tenantId]
    );
}

function require_user_for_tenant(string $id, int $tenantId): array
{
    $row = fetch_user_for_tenant($id, $tenantId);
    if (!$row) {
        json_error('Сотрудник не найден', 404);
    }

    return $row;
}

function require_device_for_tenant(string $id, int $tenantId): array
{
    $row = fetch_one_assoc(
        'SELECT d.* FROM devices d
         INNER JOIN clients c ON c.id = d.client_id
         WHERE d.id = :id AND c.tenant_id = :tenant_id
         LIMIT 1',
        ['id' => $id, 'tenant_id' => $tenantId]
    );
    if (!$row) {
        json_error('Устройство не найдено', 404);
    }

    return $row;
}

function require_client_id_for_tenant(string $clientId, int $tenantId): void
{
    if ($clientId === '') {
        json_error('Клиент не указан', 422);
    }

    require_client_for_tenant($clientId, $tenantId);
}

function tenant_settings_key(int $tenantId): string
{
    return $tenantId === 1 ? 'default' : 'tenant_' . $tenantId;
}

function slugify_tenant_name(string $name): string
{
    $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
    $base = strtolower(trim((string) ($transliterated ?: $name)));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $base) ?? '';
    $slug = trim($slug, '-');
    if ($slug === '') {
        $slug = 'org-' . bin2hex(random_bytes(3));
    }
    return substr($slug, 0, 100);
}

function seed_platform_defaults(PDO $pdo): void
{
    $tenantCount = (int) $pdo->query('SELECT COUNT(*) FROM tenants')->fetchColumn();
    if ($tenantCount === 0) {
        $now = now_mysql();
        $pdo->prepare(
            'INSERT INTO tenants (id, name, slug, owner_user_id, status, trial_ends_at, subscription_ends_at, created_at, updated_at)
             VALUES (1, :name, :slug, NULL, :status, NULL, NULL, :created_at, :updated_at)'
        )->execute([
            'name' => 'Демо-организация',
            'slug' => 'demo-organizaciya',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    $pdo->exec(
        'UPDATE tenants t
         SET owner_user_id = (
             SELECT u.id FROM users u
             WHERE u.tenant_id = t.id AND u.role = \'admin\' AND u.can_login = 1
             ORDER BY u.created_at ASC
             LIMIT 1
         )
         WHERE (t.owner_user_id IS NULL OR t.owner_user_id = \'\')'
    );

    $planCount = (int) $pdo->query('SELECT COUNT(*) FROM subscription_plans')->fetchColumn();
    if ($planCount === 0) {
        $now = now_mysql();
        $pdo->prepare(
            'INSERT INTO subscription_plans (code, name, price_monthly, is_active, created_at)
             VALUES (:code, :name, :price, 1, :created_at)'
        )->execute([
            'code' => 'standard',
            'name' => 'Стандартный тариф',
            'price' => 2290,
            'created_at' => $now,
        ]);
    }

    $pdo->exec('UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0');

    $platformEmail = trim((string) (app_config('app')['platform_admin_email'] ?? getenv('PLATFORM_ADMIN_EMAIL') ?: ''));
    $pdo->exec('UPDATE users SET is_platform_admin = 0');
    if ($platformEmail !== '') {
        $stmt = $pdo->prepare(
            'UPDATE users SET is_platform_admin = 1 WHERE login_email = :email OR email = :email2 LIMIT 1'
        );
        $stmt->execute(['email' => $platformEmail, 'email2' => $platformEmail]);
    }
}

function unique_tenant_slug(string $baseSlug): string
{
    $slug = $baseSlug;
    $suffix = 1;
    while (true) {
        $stmt = db()->prepare('SELECT id FROM tenants WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $baseSlug . '-' . $suffix;
        $suffix++;
    }
}

function fetch_tenant_by_id(int $tenantId): ?array
{
    $stmt = db()->prepare('SELECT * FROM tenants WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $tenantId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return is_array($row) ? $row : null;
}

function map_tenant(array $row): array
{
    $status = (string) ($row['status'] ?? 'trial');
    $trialEndsAt = (string) ($row['trial_ends_at'] ?? '');
    $subscriptionEndsAt = (string) ($row['subscription_ends_at'] ?? '');
    $accessStatus = resolve_tenant_access_status($status, $trialEndsAt, $subscriptionEndsAt);
    $daysRemaining = compute_trial_days_remaining($status, $trialEndsAt);

    $locationSlots = max(1, (int) ($row['location_slots'] ?? 1));

    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => (string) ($row['name'] ?? ''),
        'slug' => (string) ($row['slug'] ?? ''),
        'ownerUserId' => (string) ($row['owner_user_id'] ?? ''),
        'status' => $status,
        'accessStatus' => $accessStatus,
        'trialEndsAt' => $trialEndsAt,
        'subscriptionEndsAt' => $subscriptionEndsAt,
        'trialDaysRemaining' => $daysRemaining,
        'locationSlots' => $locationSlots,
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function tenant_locations_count(int $tenantId): int
{
    $settings = load_app_settings_for_tenant($tenantId);
    $items = is_array($settings['locations']['items'] ?? null) ? $settings['locations']['items'] : [];

    return count(array_values(array_filter(array_map(
        static fn ($item) => trim((string) $item),
        $items
    ), static fn ($item) => $item !== '')));
}

function sync_tenant_location_slots_floor(int $tenantId): int
{
    $tenant = fetch_tenant_by_id($tenantId);
    if (!$tenant) {
        return 1;
    }

    $storedSlots = max(1, (int) ($tenant['location_slots'] ?? 1));
    $usedCount = tenant_locations_count($tenantId);
    $requiredSlots = max(1, $usedCount);
    $nextSlots = max($storedSlots, $requiredSlots);

    if ($nextSlots !== $storedSlots) {
        db()->prepare('UPDATE tenants SET location_slots = :location_slots, updated_at = :updated_at WHERE id = :id')->execute([
            'location_slots' => $nextSlots,
            'updated_at' => now_mysql(),
            'id' => $tenantId,
        ]);
    }

    return $nextSlots;
}

function tenant_location_slots(int $tenantId): int
{
    return sync_tenant_location_slots_floor($tenantId);
}

function tenant_can_add_location(int $tenantId): bool
{
    return tenant_locations_count($tenantId) < tenant_location_slots($tenantId);
}

function enforce_tenant_location_limit(int $tenantId, array $settingsPayload): void
{
    if (!function_exists('yoomoney_billing_is_configured') || !yoomoney_billing_is_configured()) {
        return;
    }

    $items = is_array($settingsPayload['locations']['items'] ?? null) ? $settingsPayload['locations']['items'] : [];
    $nextCount = count(array_values(array_filter(array_map(
        static fn ($item) => trim((string) $item),
        $items
    ), static fn ($item) => $item !== '')));
    $allowedSlots = tenant_location_slots($tenantId);

    if ($nextCount > $allowedSlots) {
        json_error(
            'Превышен лимит локаций. Оплатите подписку для дополнительной локации (доступно ' . $allowedSlots . ', указано ' . $nextCount . ').',
            402,
            [
                'code' => 'location_limit_exceeded',
                'locationSlots' => $allowedSlots,
                'locationsCount' => tenant_locations_count($tenantId),
                'requestedCount' => $nextCount,
            ]
        );
    }
}

function grant_tenant_location_slot(int $tenantId, int $slots = 1): void
{
    $slots = max(1, $slots);
    db()->prepare(
        'UPDATE tenants SET location_slots = GREATEST(location_slots, 1) + :slots, updated_at = :updated_at WHERE id = :id'
    )->execute([
        'slots' => $slots,
        'updated_at' => now_mysql(),
        'id' => $tenantId,
    ]);
}

function resolve_tenant_access_status(string $status, string $trialEndsAt, string $subscriptionEndsAt): string
{
    if ($status === 'suspended') {
        return 'suspended';
    }
    if ($status === 'expired') {
        return 'expired';
    }
    if ($status === 'active') {
        if ($subscriptionEndsAt !== '' && strtotime($subscriptionEndsAt) < time()) {
            return 'expired';
        }
        return 'active';
    }
    if ($status === 'trial') {
        if ($trialEndsAt !== '' && strtotime($trialEndsAt) < time()) {
            return 'expired';
        }
        return 'trial';
    }
    return 'expired';
}

function compute_trial_days_remaining(string $status, string $trialEndsAt): ?int
{
    if ($status !== 'trial' || $trialEndsAt === '') {
        return null;
    }
    $diff = (int) ceil((strtotime($trialEndsAt) - time()) / 86400);
    return max(0, $diff);
}

function login_email_is_taken(string $email): bool
{
    $email = strtolower(trim($email));
    if ($email === '') {
        return true;
    }

    $row = fetch_one_assoc(
        'SELECT id FROM users WHERE LOWER(login_email) = :email LIMIT 1',
        ['email' => $email]
    );

    return $row !== null;
}

function find_user_for_email_login(string $email): ?array
{
    $email = strtolower(trim($email));
    if ($email === '') {
        return null;
    }

    $byLogin = fetch_one_assoc(
        'SELECT * FROM users WHERE LOWER(login_email) = :email AND can_login = 1 LIMIT 1',
        ['email' => $email]
    );
    if ($byLogin) {
        return $byLogin;
    }

    return fetch_one_assoc(
        'SELECT * FROM users WHERE LOWER(email) = :email AND LOWER(login_email) = :login_email AND can_login = 1 LIMIT 1',
        ['email' => $email, 'login_email' => $email]
    );
}

function is_platform_admin_user(array $user): bool
{
    return normalize_bool($user['is_platform_admin'] ?? false);
}

function require_platform_admin(): array
{
    $user = require_auth();
    if (!is_platform_admin_user($user)) {
        json_error('Доступ запрещён: требуется роль владельца платформы', 403);
    }
    return $user;
}

function tenant_blocks_access(array $tenant, ?array $user = null): ?string
{
    $authUser = is_array($user) ? $user : ($GLOBALS['__current_auth_user'] ?? []);
    if (is_platform_admin_user($authUser)) {
        return null;
    }

    $mapped = map_tenant($tenant);
    $access = $mapped['accessStatus'];

    if ($access === 'suspended') {
        return 'Доступ к CRM заблокирован администратором платформы. Свяжитесь с поддержкой.';
    }
    if ($access === 'expired') {
        return 'Пробный период или подписка истекли. Оформите подписку для продолжения работы.';
    }

    return null;
}

function require_active_tenant(array $user): array
{
    if (is_platform_admin_user($user)) {
        return $user;
    }

    $tenant = fetch_tenant_by_id(user_tenant_id($user));
    if (!$tenant) {
        json_error('Организация не найдена', 403);
    }

    $blockReason = tenant_blocks_access($tenant, $user);
    if ($blockReason !== null) {
        json_error($blockReason, 403, ['tenant' => map_tenant($tenant)]);
    }

    return $user;
}

function log_tenant_activity(?int $tenantId, ?string $userId, string $action, ?string $details = null): void
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    db()->prepare(
        'INSERT INTO tenant_activity_log (tenant_id, user_id, action, details, ip_address, created_at)
         VALUES (:tenant_id, :user_id, :action, :details, :ip_address, :created_at)'
    )->execute([
        'tenant_id' => $tenantId,
        'user_id' => $userId,
        'action' => $action,
        'details' => $details,
        'ip_address' => $ip,
        'created_at' => now_mysql(),
    ]);
}

function attach_platform_user_fields(array $payload, array $row): array
{
    $payload['isPlatformAdmin'] = is_platform_admin_user($row);
    $payload['tenantId'] = user_tenant_id($row);

    $tenant = fetch_tenant_by_id(user_tenant_id($row));
    if ($tenant) {
        $payload['tenant'] = map_tenant($tenant);
    }

    return $payload;
}

function create_auth_token_for_user(array $user): array
{
    $token = uuid_token();
    $expiresAt = date('Y-m-d H:i:s', time() + ((int) app_config('app')['token_ttl_days'] * 86400));

    db()->prepare('INSERT INTO user_tokens (user_id, token, expires_at, created_at) VALUES (:user_id, :token, :expires_at, :created_at)')->execute([
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

    return ['token' => $token, 'expiresAt' => $expiresAt];
}

function login_response_for_user(array $user): void
{
    assert_email_verified_for_login($user);

    if (!is_platform_admin_user($user)) {
        $tenant = fetch_tenant_by_id(user_tenant_id($user));
        if (!$tenant) {
            json_error('Организация не найдена', 403);
        }
        $blockReason = tenant_blocks_access($tenant, $user);
        if ($blockReason !== null) {
            json_error($blockReason, 403, ['tenant' => map_tenant($tenant)]);
        }
    }

    $auth = create_auth_token_for_user($user);
    log_tenant_activity(user_tenant_id($user), (string) $user['id'], 'login', (string) ($user['login_email'] ?? ''));

    $loginUser = attach_platform_user_fields(attach_employee_access_if_needed(map_user($user), $user), $user);
    json_response([
        'token' => $auth['token'],
        'expiresAt' => $auth['expiresAt'],
        'user' => $loginUser,
    ], 200, 'Авторизация выполнена');
}

function seed_tenant_settings(int $tenantId, string $companyName, string $ownerEmail = '', string $ownerPhone = ''): void
{
    $defaults = load_app_settings_for_tenant(1);
    if (empty($defaults)) {
        $defaults = [
            'business' => ['companyName' => $companyName],
            'appearance' => [
                'preset' => 'default',
                'primaryColor' => '#ea580c',
                'primaryLight' => '#fb923c',
                'primaryDark' => '#c2410c',
                'secondaryColor' => '#0f766e',
                'sidebarColor' => '#0f172a',
                'surfaceColor' => '#f8fafc',
                'inkColor' => '#0f172a',
                'mode' => 'light',
            ],
        ];
    }

    $defaults['business']['companyName'] = $companyName;
    $defaults['business']['logoUrl'] = '';
    $defaults['business']['address'] = '';
    $defaults['business']['phone'] = $ownerPhone;
    $defaults['business']['email'] = $ownerEmail;
    $defaults['business']['workingHours'] = '10:00 - 19:00';
    $defaults['business']['timezone'] = 'Asia/Yekaterinburg';
    $defaults['orders']['warehouses'] = [];
    if (isset($defaults['orders']['quickSaleOptions']) && is_array($defaults['orders']['quickSaleOptions'])) {
        $defaults['orders']['quickSaleOptions'] = [];
    }
    $defaults['locations']['items'] = [];
    $defaults['system']['onboardingCompleted'] = false;

    if (isset($defaults['integrations']) && is_array($defaults['integrations'])) {
        $defaults['integrations']['telegramConnected'] = false;
        $defaults['integrations']['telegramBotToken'] = '';
        $defaults['integrations']['telegramBotUsername'] = '';
        $defaults['integrations']['smsConnected'] = false;
        $defaults['integrations']['smsApiToken'] = '';
        $defaults['integrations']['smsWebhookUrl'] = '';
        $defaults['integrations']['smsCredentials'] = [];
    }

    save_settings_for_tenant($tenantId, $defaults);
}

function load_app_settings_for_tenant(int $tenantId): array
{
    $key = tenant_settings_key($tenantId);
    $settings = fetch_one_assoc('SELECT payload_json FROM app_settings WHERE `key` = :key LIMIT 1', ['key' => $key]);
    return $settings ? decode_json_column($settings['payload_json'], []) : [];
}

function save_settings_for_tenant(int $tenantId, array $payload): void
{
    $sql = 'INSERT INTO app_settings (`key`, payload_json, updated_at)
            VALUES (:key, :payload_json, :updated_at)
            ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = VALUES(updated_at)';
    $stmt = db()->prepare($sql);
    $stmt->execute([
        'key' => tenant_settings_key($tenantId),
        'payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'updated_at' => now_mysql(),
    ]);

    if (function_exists('invalidate_app_settings_migrated_cache')) {
        invalidate_app_settings_migrated_cache();
    }
}

function map_admin_tenant_row(array $row): array
{
    $mapped = map_tenant($row);
    $mapped['userCount'] = (int) ($row['user_count'] ?? 0);
    $mapped['lastActivityAt'] = (string) ($row['last_activity_at'] ?? '');
    $mapped['ownerEmail'] = (string) ($row['owner_email'] ?? '');
    return $mapped;
}

function map_admin_tenant_user_row(array $row): array
{
    return [
        'id' => (string) ($row['id'] ?? ''),
        'name' => (string) ($row['name'] ?? ''),
        'loginEmail' => (string) ($row['login_email'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'role' => (string) ($row['role'] ?? ''),
        'canLogin' => normalize_bool($row['can_login'] ?? false),
        'isActive' => normalize_bool($row['is_active'] ?? false),
        'emailVerified' => normalize_bool($row['email_verified'] ?? false),
        'lastLogin' => (string) ($row['last_login'] ?? ''),
        'createdAt' => (string) ($row['created_at'] ?? ''),
    ];
}

function delete_tenant_completely(int $tenantId): void
{
    if ($tenantId <= 1) {
        json_error('Нельзя удалить системную организацию', 403);
    }

    $tenant = fetch_tenant_by_id($tenantId);
    if (!$tenant) {
        json_error('Организация не найдена', 404);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $userStmt = $pdo->prepare('SELECT id FROM users WHERE tenant_id = :tenant_id');
        $userStmt->execute(['tenant_id' => $tenantId]);
        $userIds = $userStmt->fetchAll(PDO::FETCH_COLUMN);

        if ($userIds) {
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $pdo->prepare("DELETE FROM user_tokens WHERE user_id IN ({$placeholders})")->execute($userIds);
            $pdo->prepare('DELETE FROM users WHERE tenant_id = :tenant_id')->execute(['tenant_id' => $tenantId]);
        }

        $tenantScopedTables = [
            'tenant_activity_log',
            'billing_payments',
            'telegram_inbox',
            'sms_inbox',
            'cash_operations',
            'inventory_parts',
            'orders',
            'clients',
        ];
        foreach ($tenantScopedTables as $table) {
            $pdo->prepare("DELETE FROM {$table} WHERE tenant_id = :tenant_id")->execute(['tenant_id' => $tenantId]);
        }

        $pdo->prepare('DELETE FROM app_settings WHERE `key` = :key')->execute([
            'key' => tenant_settings_key($tenantId),
        ]);
        $pdo->prepare('DELETE FROM tenants WHERE id = :id')->execute(['id' => $tenantId]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function handle_platform_routes(string $method, string $path): bool
{
    require_once __DIR__ . '/yandex_oauth.php';
    require_once __DIR__ . '/email_verification.php';
    require_once __DIR__ . '/rate_limit.php';
    require_once __DIR__ . '/yoomoney_billing.php';
    require_once __DIR__ . '/platform_notifications.php';

    if (handle_yoomoney_billing_routes($method, $path)) {
        return true;
    }

    if (handle_platform_maintenance_routes($method, $path)) {
        return true;
    }

    if ($method === 'GET' && $path === '/platform/auth/yandex/config') {
        json_response([
            'enabled' => yandex_oauth_is_configured(),
            'redirectUri' => yandex_oauth_redirect_uri(),
        ]);
        return true;
    }

    if ($method === 'GET' && $path === '/platform/auth/yandex/url') {
        if (!yandex_oauth_is_configured()) {
            json_error('Яндекс OAuth не настроен на сервере', 503);
        }

        $mode = trim((string) ($_GET['mode'] ?? 'register'));
        $companyName = trim((string) ($_GET['companyName'] ?? ''));
        $state = build_oauth_state($mode === 'login' ? 'login' : 'register', [
            'companyName' => $companyName,
        ]);

        json_response([
            'url' => yandex_authorize_url($state),
            'state' => $state,
        ]);
        return true;
    }

    if ($method === 'POST' && $path === '/platform/auth/yandex/complete') {
        $payload = json_input();
        $code = trim((string) ($payload['code'] ?? ''));
        $state = trim((string) ($payload['state'] ?? ''));
        $companyName = trim((string) ($payload['companyName'] ?? ''));

        if ($code === '' || $state === '') {
            json_error('Не удалось завершить авторизацию через Яндекс', 422);
        }

        complete_yandex_oauth($code, $state, $companyName);
        return true;
    }

    if ($method === 'GET' && $path === '/platform/auth/verify-email') {
        $token = trim((string) ($_GET['token'] ?? ''));
        if ($token === '') {
            json_error('Ссылка подтверждения недействительна', 422);
        }

        $user = verify_user_email_by_token($token);
        if (!$user) {
            json_error('Ссылка подтверждения недействительна или уже использована', 400);
        }

        log_tenant_activity(user_tenant_id($user), (string) $user['id'], 'email_verified', (string) ($user['login_email'] ?? ''));
        json_response([
            'verified' => true,
            'email' => mask_email((string) ($user['login_email'] ?? $user['email'] ?? '')),
        ], 200, 'Email успешно подтверждён');
        return true;
    }

    if ($method === 'POST' && $path === '/platform/auth/resend-verification') {
        $payload = json_input();
        $email = normalize_auth_email((string) ($payload['email'] ?? ''));
        if ($email === '' || !is_valid_email($email)) {
            json_error('Укажите корректный email', 422);
        }

        $ip = rate_limit_client_ip();
        $rateMessage = rate_limit_check('resend_verification_ip', $ip, 10, 3600);
        if ($rateMessage !== null) {
            json_error($rateMessage, 429);
        }
        $rateMessage = rate_limit_check('resend_verification_email', $email, 5, 3600);
        if ($rateMessage !== null) {
            json_error($rateMessage, 429);
        }

        $user = fetch_one_assoc(
            'SELECT * FROM users WHERE (login_email = :email OR email = :email2) AND can_login = 1 LIMIT 1',
            ['email' => $email, 'email2' => $email]
        );

        rate_limit_hit('resend_verification_ip', $ip, 3600);
        rate_limit_hit('resend_verification_email', $email, 3600);

        if (!$user || is_user_email_verified($user)) {
            json_response([
                'sent' => true,
                'email' => mask_email($email),
            ], 200, 'Если аккаунт существует и email не подтверждён, мы отправили письмо.');
            return true;
        }

        $sentAt = strtotime((string) ($user['email_verification_sent_at'] ?? ''));
        if ($sentAt !== false && $sentAt > time() - 60) {
            json_error('Письмо уже отправлено. Повторите попытку через минуту.', 429);
        }

        $sent = issue_email_verification_for_user((string) $user['id'], $email);
        if (!$sent) {
            json_error('Не удалось отправить письмо с подтверждением. Проверьте настройки почты или повторите позже.', 502);
        }
        json_response([
            'sent' => true,
            'email' => mask_email($email),
        ], 200, 'Письмо с подтверждением отправлено');
        return true;
    }

    if ($method === 'POST' && $path === '/platform/register') {
        $payload = json_input();
        $companyName = trim((string) ($payload['companyName'] ?? ''));
        $email = normalize_auth_email((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        $phone = trim((string) ($payload['phone'] ?? ''));
        $adminName = trim((string) ($payload['name'] ?? ''));

        if ($companyName === '' || $email === '' || $password === '') {
            json_error('Укажите название компании, email и пароль', 422);
        }
        if (!is_valid_email($email)) {
            json_error('Укажите корректный email', 422);
        }
        if (strlen($password) < 6) {
            json_error('Пароль должен содержать минимум 6 символов', 422);
        }

        $ip = rate_limit_client_ip();
        $rateMessage = rate_limit_check('register_ip', $ip, 10, 3600);
        if ($rateMessage !== null) {
            json_error($rateMessage, 429);
        }

        $existing = login_email_is_taken($email);
        if ($existing) {
            rate_limit_hit('register_ip', $ip, 3600);
            json_error('Пользователь с таким email уже зарегистрирован', 409);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $user = create_tenant_with_admin($companyName, $email, $adminName, $phone, $passwordHash, '', false);
        $verificationSent = issue_email_verification_for_user((string) $user['id'], $email);
        rate_limit_hit('register_ip', $ip, 3600);

        json_response([
            'verificationSent' => $verificationSent,
            'email' => mask_email($email),
        ], 201, $verificationSent
            ? 'Регистрация создана. Проверьте почту для подтверждения email.'
            : 'Аккаунт создан, но письмо с подтверждением не отправилось. Повторите отправку на странице входа.');
        return true;
    }

    if ($method === 'GET' && $path === '/platform/admin/tenants') {
        require_platform_admin();
        $rows = fetch_all_assoc(
            'SELECT t.*,
                    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
                    (SELECT MAX(created_at) FROM tenant_activity_log al WHERE al.tenant_id = t.id) AS last_activity_at,
                    COALESCE(
                        (SELECT login_email FROM users ou WHERE ou.id = t.owner_user_id LIMIT 1),
                        (SELECT login_email FROM users au
                         WHERE au.tenant_id = t.id AND au.role = \'admin\' AND au.can_login = 1
                         ORDER BY au.created_at ASC LIMIT 1),
                        (SELECT login_email FROM users fu
                         WHERE fu.tenant_id = t.id AND fu.can_login = 1
                         ORDER BY fu.created_at ASC LIMIT 1)
                    ) AS owner_email
             FROM tenants t
             ORDER BY t.created_at DESC'
        );
        json_response(array_values(array_map('map_admin_tenant_row', $rows)));
        return true;
    }

    if ($method === 'PUT' && route_matches('#^/platform/admin/tenants/(\d+)$#', $path, $matches)) {
        require_platform_admin();
        $tenantId = (int) $matches[1];
        $tenant = fetch_tenant_by_id($tenantId);
        if (!$tenant) {
            json_error('Организация не найдена', 404);
        }

        $payload = json_input();
        $updates = [];
        $params = ['id' => $tenantId, 'updated_at' => now_mysql()];

        if (array_key_exists('status', $payload)) {
            $status = (string) $payload['status'];
            if (!in_array($status, ['trial', 'active', 'suspended', 'expired'], true)) {
                json_error('Некорректный статус', 422);
            }
            $updates[] = 'status = :status';
            $params['status'] = $status;
        }

        if (!empty($payload['extendTrialDays'])) {
            $days = max(1, (int) $payload['extendTrialDays']);
            $base = $tenant['trial_ends_at'] ?? now_mysql();
            $baseTs = strtotime((string) $base) ?: time();
            if ($baseTs < time()) {
                $baseTs = time();
            }
            $updates[] = 'trial_ends_at = :trial_ends_at';
            $params['trial_ends_at'] = date('Y-m-d H:i:s', $baseTs + ($days * 86400));
            $updates[] = 'status = :status';
            $params['status'] = 'trial';
        }

        if (array_key_exists('subscriptionEndsAt', $payload)) {
            $updates[] = 'subscription_ends_at = :subscription_ends_at';
            $params['subscription_ends_at'] = to_mysql_datetime($payload['subscriptionEndsAt']);
            if (!array_key_exists('status', $payload)) {
                $updates[] = 'status = :status';
                $params['status'] = 'active';
            }
        }

        if (array_key_exists('locationSlots', $payload)) {
            $updates[] = 'location_slots = :location_slots';
            $params['location_slots'] = max(1, (int) $payload['locationSlots']);
        }

        if (empty($updates)) {
            json_error('Нет полей для обновления', 400);
        }

        $updates[] = 'updated_at = :updated_at';
        $sql = 'UPDATE tenants SET ' . implode(', ', $updates) . ' WHERE id = :id';
        db()->prepare($sql)->execute($params);

        log_tenant_activity($tenantId, null, 'admin_update', json_encode($payload, JSON_UNESCAPED_UNICODE));
        $updated = fetch_tenant_by_id($tenantId);
        json_response(map_tenant($updated ?: []), 200, 'Организация обновлена');
        return true;
    }

    if ($method === 'GET' && route_matches('#^/platform/admin/tenants/(\d+)/users$#', $path, $matches)) {
        require_platform_admin();
        $tenantId = (int) $matches[1];
        if (!fetch_tenant_by_id($tenantId)) {
            json_error('Организация не найдена', 404);
        }

        $rows = fetch_all_assoc(
            'SELECT id, name, login_email, email, role, can_login, is_active, email_verified, last_login, created_at
             FROM users
             WHERE tenant_id = :tenant_id
             ORDER BY created_at ASC',
            ['tenant_id' => $tenantId]
        );
        json_response(array_values(array_map('map_admin_tenant_user_row', $rows)));
        return true;
    }

    if ($method === 'DELETE' && route_matches('#^/platform/admin/tenants/(\d+)$#', $path, $matches)) {
        require_platform_admin();
        $tenantId = (int) $matches[1];
        delete_tenant_completely($tenantId);
        json_response(['deleted' => true, 'tenantId' => $tenantId], 200, 'Организация удалена');
        return true;
    }

    if ($method === 'GET' && $path === '/platform/admin/activity') {
        require_platform_admin();
        $limit = min(200, max(1, (int) ($_GET['limit'] ?? 50)));
        $rows = fetch_all_assoc(
            'SELECT al.*, t.name AS tenant_name, u.name AS user_name, u.login_email AS user_email
             FROM tenant_activity_log al
             LEFT JOIN tenants t ON t.id = al.tenant_id
             LEFT JOIN users u ON u.id = al.user_id
             ORDER BY al.created_at DESC
             LIMIT ' . $limit
        );
        $mapped = array_map(static function (array $row): array {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'tenantId' => $row['tenant_id'] !== null ? (int) $row['tenant_id'] : null,
                'tenantName' => (string) ($row['tenant_name'] ?? ''),
                'userId' => (string) ($row['user_id'] ?? ''),
                'userName' => (string) ($row['user_name'] ?? ''),
                'userEmail' => (string) ($row['user_email'] ?? ''),
                'action' => (string) ($row['action'] ?? ''),
                'details' => (string) ($row['details'] ?? ''),
                'ipAddress' => (string) ($row['ip_address'] ?? ''),
                'createdAt' => (string) ($row['created_at'] ?? ''),
            ];
        }, $rows);
        json_response(array_values($mapped));
        return true;
    }

    return false;
}
