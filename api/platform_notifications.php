<?php

declare(strict_types=1);

function ensure_user_notifications_schema(PDO $pdo): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS user_notifications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            type VARCHAR(32) NOT NULL DEFAULT 'maintenance',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            maintenance_at DATETIME NULL,
            read_at DATETIME NULL,
            batch_id VARCHAR(64) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            KEY idx_user_notifications_user (user_id),
            KEY idx_user_notifications_unread (user_id, read_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function platform_maintenance_settings_key(): string
{
    return 'platform:maintenance';
}

function load_platform_maintenance_settings(): array
{
    $row = fetch_one_assoc(
        'SELECT payload_json FROM app_settings WHERE `key` = :key LIMIT 1',
        ['key' => platform_maintenance_settings_key()]
    );
    $payload = $row ? decode_json_column($row['payload_json'], []) : [];

    return [
        'scheduledAt' => (string) ($payload['scheduledAt'] ?? ''),
        'lastNotifiedAt' => (string) ($payload['lastNotifiedAt'] ?? ''),
        'lastRecipients' => (int) ($payload['lastRecipients'] ?? 0),
    ];
}

function save_platform_maintenance_settings(array $payload): void
{
    $sql = 'INSERT INTO app_settings (`key`, payload_json, updated_at)
            VALUES (:key, :payload_json, :updated_at)
            ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = VALUES(updated_at)';
    db()->prepare($sql)->execute([
        'key' => platform_maintenance_settings_key(),
        'payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'updated_at' => now_mysql(),
    ]);
}

function format_maintenance_datetime_ru(string $datetime): string
{
    $timestamp = strtotime($datetime);
    if ($timestamp === false) {
        return $datetime;
    }

    return date('d.m.Y H:i', $timestamp);
}

function map_user_notification_row(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'type' => (string) ($row['type'] ?? 'maintenance'),
        'title' => (string) ($row['title'] ?? ''),
        'message' => (string) ($row['message'] ?? ''),
        'maintenanceAt' => (string) ($row['maintenance_at'] ?? ''),
        'readAt' => $row['read_at'] ? (string) $row['read_at'] : null,
        'createdAt' => (string) ($row['created_at'] ?? ''),
    ];
}

function fetch_user_notifications_for_user(string $userId, int $limit = 30): array
{
    $limit = min(100, max(1, $limit));
    $rows = fetch_all_assoc(
        'SELECT * FROM user_notifications
         WHERE user_id = :user_id
         ORDER BY read_at IS NULL DESC, created_at DESC
         LIMIT ' . $limit,
        ['user_id' => $userId]
    );

    return array_map('map_user_notification_row', $rows);
}

function mark_user_notification_read(string $userId, int $notificationId): bool
{
    $stmt = db()->prepare(
        'UPDATE user_notifications
         SET read_at = :read_at
         WHERE id = :id AND user_id = :user_id AND read_at IS NULL'
    );
    $stmt->execute([
        'id' => $notificationId,
        'user_id' => $userId,
        'read_at' => now_mysql(),
    ]);

    return $stmt->rowCount() > 0;
}

function broadcast_maintenance_notifications(string $scheduledAt, string $createdByUserId): array
{
    $whenLabel = format_maintenance_datetime_ru($scheduledAt);
    $title = 'Технические работы на сайте';
    $message = 'Запланированы работы по обновлению CRM: ' . $whenLabel
        . '. В это время возможны перебои в работе сервиса.';
    $batchId = 'maint_' . bin2hex(random_bytes(8));
    $maintenanceMysql = to_mysql_datetime($scheduledAt, null);
    if ($maintenanceMysql === null) {
        json_error('Укажите корректные дату и время работ', 422);
    }

    $users = fetch_all_assoc(
        'SELECT id FROM users WHERE is_active = 1 ORDER BY created_at ASC'
    );

    $insert = db()->prepare(
        'INSERT INTO user_notifications (
            user_id, type, title, message, maintenance_at, read_at, batch_id, created_at
         ) VALUES (
            :user_id, :type, :title, :message, :maintenance_at, NULL, :batch_id, :created_at
         )'
    );

    $sent = 0;
    foreach ($users as $userRow) {
        $userId = (string) ($userRow['id'] ?? '');
        if ($userId === '') {
            continue;
        }
        $insert->execute([
            'user_id' => $userId,
            'type' => 'maintenance',
            'title' => $title,
            'message' => $message,
            'maintenance_at' => $maintenanceMysql,
            'batch_id' => $batchId,
            'created_at' => now_mysql(),
        ]);
        $sent++;
    }

    $settings = load_platform_maintenance_settings();
    $settings['scheduledAt'] = $maintenanceMysql;
    $settings['lastNotifiedAt'] = now_mysql();
    $settings['lastRecipients'] = $sent;
    $settings['lastBatchId'] = $batchId;
    save_platform_maintenance_settings($settings);

    log_tenant_activity(null, $createdByUserId, 'maintenance_notify', json_encode([
        'scheduledAt' => $maintenanceMysql,
        'sent' => $sent,
        'batchId' => $batchId,
    ], JSON_UNESCAPED_UNICODE));

    return [
        'sent' => $sent,
        'batchId' => $batchId,
        'scheduledAt' => $maintenanceMysql,
        'title' => $title,
        'message' => $message,
    ];
}

function handle_platform_maintenance_routes(string $method, string $path): bool
{
    if ($method === 'GET' && $path === '/platform/admin/maintenance') {
        require_platform_admin();
        json_response(load_platform_maintenance_settings());
        return true;
    }

    if ($method === 'PUT' && $path === '/platform/admin/maintenance') {
        require_platform_admin();
        $payload = json_input();
        $scheduledAt = trim((string) ($payload['scheduledAt'] ?? ''));
        if ($scheduledAt === '') {
            json_error('Укажите дату и время работ', 422);
        }
        $mysql = to_mysql_datetime($scheduledAt, null);
        if ($mysql === null) {
            json_error('Некорректная дата и время', 422);
        }

        $settings = load_platform_maintenance_settings();
        $settings['scheduledAt'] = $mysql;
        save_platform_maintenance_settings($settings);
        json_response($settings, 200, 'Дата работ сохранена');
        return true;
    }

    if ($method === 'POST' && $path === '/platform/admin/maintenance/notify') {
        $admin = require_platform_admin();
        $payload = json_input();
        $scheduledAt = trim((string) ($payload['scheduledAt'] ?? ''));
        if ($scheduledAt === '') {
            $settings = load_platform_maintenance_settings();
            $scheduledAt = (string) ($settings['scheduledAt'] ?? '');
        }
        if ($scheduledAt === '') {
            json_error('Сначала укажите дату и время работ', 422);
        }

        $result = broadcast_maintenance_notifications($scheduledAt, (string) ($admin['id'] ?? ''));
        json_response($result, 200, 'Уведомления отправлены');
        return true;
    }

    return false;
}
