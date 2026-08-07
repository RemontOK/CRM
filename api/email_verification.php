<?php

declare(strict_types=1);

require_once __DIR__ . '/mail.php';

function is_valid_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function normalize_auth_email(string $email): string
{
    return strtolower(trim($email));
}

function mask_email(string $email): string
{
    $email = trim($email);
    if ($email === '' || !str_contains($email, '@')) {
        return $email;
    }

    [$local, $domain] = explode('@', $email, 2);
    if ($local === '') {
        return '***@' . $domain;
    }

    $visible = substr($local, 0, 1);
    if (strlen($local) > 2) {
        $visible .= str_repeat('*', min(4, strlen($local) - 2)) . substr($local, -1);
    } else {
        $visible .= '*';
    }

    return $visible . '@' . $domain;
}

function is_user_email_verified(array $user): bool
{
    return normalize_bool($user['email_verified'] ?? false);
}

function generate_email_verification_token(): array
{
    $token = bin2hex(random_bytes(32));

    return [
        'token' => $token,
        'hash' => hash('sha256', $token),
    ];
}

function hash_email_verification_token(string $token): string
{
    return hash('sha256', trim($token));
}

function public_app_url(): string
{
    $configured = trim((string) (app_config('app')['public_url'] ?? ''));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }

    return 'https://nakcrm.ru';
}

function verification_link_for_token(string $token): string
{
    return public_app_url() . '/verify-email?token=' . rawurlencode($token);
}

function build_verification_email_content(string $token): array
{
    $link = verification_link_for_token($token);
    $subject = 'Подтвердите email — NAK CRM';
    $html = '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">'
        . '<p>Здравствуйте!</p>'
        . '<p>Для завершения регистрации в NAK CRM подтвердите ваш email:</p>'
        . '<p><a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;padding:12px 18px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;">Подтвердить email</a></p>'
        . '<p>Если кнопка не работает, скопируйте ссылку в браузер:<br>'
        . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="color:#64748b;font-size:13px;">Если вы не регистрировались в NAK CRM, просто проигнорируйте это письмо.</p>'
        . '</body></html>';
    $text = "Здравствуйте!\n\n"
        . "Для завершения регистрации в NAK CRM подтвердите ваш email по ссылке:\n"
        . $link . "\n\n"
        . "Если вы не регистрировались в NAK CRM, просто проигнорируйте это письмо.";

    return [
        'subject' => $subject,
        'html' => $html,
        'text' => $text,
    ];
}

function issue_email_verification_for_user(string $userId, string $email): bool
{
    $pair = generate_email_verification_token();
    $now = now_mysql();

    db()->prepare(
        'UPDATE users SET email_verification_token = :token, email_verification_sent_at = :sent_at, updated_at = :updated_at
         WHERE id = :id'
    )->execute([
        'token' => $pair['hash'],
        'sent_at' => $now,
        'updated_at' => $now,
        'id' => $userId,
    ]);

    $content = build_verification_email_content($pair['token']);

    return send_mail_message($email, $content['subject'], $content['html'], $content['text']);
}

function find_user_by_verification_token(string $token): ?array
{
    $hash = hash_email_verification_token($token);
    if ($hash === hash('sha256', '')) {
        return null;
    }

    return fetch_one_assoc(
        'SELECT * FROM users WHERE email_verification_token = :token AND email_verified = 0 LIMIT 1',
        ['token' => $hash]
    );
}

function verify_user_email_by_token(string $token): ?array
{
    $user = find_user_by_verification_token($token);
    if (!$user) {
        return null;
    }

    $now = now_mysql();
    db()->prepare(
        'UPDATE users SET email_verified = 1, email_verified_at = :verified_at, email_verification_token = NULL,
         email_verification_sent_at = NULL, updated_at = :updated_at
         WHERE id = :id'
    )->execute([
        'verified_at' => $now,
        'updated_at' => $now,
        'id' => (string) $user['id'],
    ]);

    return fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => (string) $user['id']]);
}

function assert_email_verified_for_login(array $user): void
{
    if (is_platform_admin_user($user) || is_user_email_verified($user)) {
        return;
    }

    $email = trim((string) ($user['login_email'] ?? $user['email'] ?? ''));
    json_error(
        'Подтвердите email перед входом. Проверьте почту или запросите письмо повторно.',
        403,
        [
            'code' => 'EMAIL_NOT_VERIFIED',
            'email' => mask_email($email),
        ]
    );
}

function migrate_existing_users_email_verified(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    $marker = fetch_one_assoc('SELECT `key` FROM app_settings WHERE `key` = :key LIMIT 1', [
        'key' => 'migration_email_verified_v1',
    ]);
    if ($marker) {
        return;
    }

    $pdo->exec('UPDATE users SET email_verified = 1, email_verified_at = COALESCE(last_login, created_at, NOW()) WHERE email_verified = 0');
    $pdo->prepare(
        'INSERT INTO app_settings (`key`, payload_json, updated_at) VALUES (:key, :payload_json, :updated_at)'
    )->execute([
        'key' => 'migration_email_verified_v1',
        'payload_json' => json_encode(['done' => true], JSON_UNESCAPED_UNICODE),
        'updated_at' => now_mysql(),
    ]);
}
