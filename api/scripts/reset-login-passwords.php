<?php

declare(strict_types=1);

/**
 * Сброс паролей всех активных учёток входа на единый временный пароль.
 * Запуск на сервере: php api/scripts/reset-login-passwords.php [пароль]
 */

$bootstrap = __DIR__ . '/bootstrap.php';
if (!is_file($bootstrap)) {
    $bootstrap = dirname(__DIR__) . '/bootstrap.php';
}
require $bootstrap;

$password = $argv[1] ?? 'admin123';
if ($password === '') {
    fwrite(STDERR, "Укажите пароль аргументом.\n");
    exit(1);
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

echo 'Пароль обновлён для ' . $stmt->rowCount() . " учёток.\n";
echo "Новый пароль: {$password}\n\n";
foreach ($users as $user) {
    echo sprintf(
        "- %s (%s) — логин: %s\n",
        (string) $user['name'],
        (string) $user['role'],
        (string) $user['login_email']
    );
}
