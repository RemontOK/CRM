<?php

declare(strict_types=1);

/**
 * Создать/обновить владельца платформы (platform-admin).
 *
 * Запуск на сервере:
 *   php api/scripts/setup-platform-admin.php email@example.com 'password'
 */
$bootstrap = dirname(__DIR__) . '/bootstrap.php';
if (!is_file($bootstrap)) {
    fwrite(STDERR, "bootstrap.php not found\n");
    exit(1);
}

require $bootstrap;

$email = strtolower(trim((string) ($argv[1] ?? '')));
$password = (string) ($argv[2] ?? '');
$name = trim((string) ($argv[3] ?? 'Владелец платформы'));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php setup-platform-admin.php email@example.com password [name]\n");
    exit(1);
}
if ($password === '' || strlen($password) < 6) {
    fwrite(STDERR, "Password must be at least 6 characters.\n");
    exit(1);
}

$pdo = db();
$now = date('Y-m-d H:i:s');
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('SELECT id FROM users WHERE login_email = :email OR email = :email2 LIMIT 1');
$stmt->execute(['email' => $email, 'email2' => $email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (is_array($row)) {
    $userId = (string) $row['id'];
    $pdo->prepare(
        'UPDATE users SET
            name = :name,
            email = :email,
            login_email = :login_email,
            password_hash = :password_hash,
            can_login = 1,
            role = \'admin\',
            is_active = 1,
            is_platform_admin = 1,
            email_verified = 1,
            email_verified_at = COALESCE(email_verified_at, :verified_at),
            email_verification_token = NULL,
            updated_at = :updated_at
         WHERE id = :id'
    )->execute([
        'name' => $name,
        'email' => $email,
        'login_email' => $email,
        'password_hash' => $hash,
        'verified_at' => $now,
        'updated_at' => $now,
        'id' => $userId,
    ]);
    echo "Updated existing user: {$userId}\n";
} else {
    $userId = 'platform-admin-' . bin2hex(random_bytes(4));
    $pdo->prepare(
        'INSERT INTO users (
            id, name, email, phone, login_email, password_hash, can_login, role,
            department, position, salary, intake_rate, execution_rate, delivery_rate,
            rating, total_orders, completed_orders, total_earnings, is_active,
            hire_date, last_login, tenant_id, is_platform_admin, email_verified,
            email_verified_at, created_at, updated_at
        ) VALUES (
            :id, :name, :email, \'\', :login_email, :password_hash, 1, \'admin\',
            \'Платформа\', \'Владелец платформы\', 0, 0, 0, 0,
            5, 0, 0, 0, 1,
            :hire_date, NULL, 1, 1, 1,
            :email_verified_at, :created_at, :updated_at
        )'
    )->execute([
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'login_email' => $email,
        'password_hash' => $hash,
        'hire_date' => $now,
        'email_verified_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    echo "Created platform admin user: {$userId}\n";
}

$pdo->exec('UPDATE users SET is_platform_admin = 0');
$pdo->prepare(
    'UPDATE users SET is_platform_admin = 1 WHERE login_email = :email OR email = :email2 LIMIT 1'
)->execute(['email' => $email, 'email2' => $email]);

$configPath = dirname(__DIR__) . '/config.local.php';
if (is_file($configPath)) {
    $configText = file_get_contents($configPath);
    if ($configText !== false) {
        if (preg_match("/'platform_admin_email'\\s*=>/", $configText)) {
            $configText = preg_replace(
                "/'platform_admin_email'\\s*=>\\s*'[^']*'/",
                "'platform_admin_email' => '" . addslashes($email) . "'",
                $configText,
                1
            );
        } else {
            $configText = preg_replace(
                "/('app'\\s*=>\\s*\\[)/",
                "$1\n        'platform_admin_email' => '" . addslashes($email) . "',",
                $configText,
                1
            );
        }
        file_put_contents($configPath, $configText);
        echo "Updated config.local.php platform_admin_email\n";
    }
} else {
    fwrite(STDERR, "Warning: config.local.php not found — set platform_admin_email manually.\n");
}

$check = $pdo->prepare('SELECT id, name, login_email, is_platform_admin FROM users WHERE id = :id LIMIT 1');
$check->execute(['id' => $userId]);
$result = $check->fetch(PDO::FETCH_ASSOC);
echo "Done.\n";
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
