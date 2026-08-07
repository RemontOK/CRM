<?php

declare(strict_types=1);

function public_site_base_url(): string
{
    $configured = trim((string) (app_config('app')['public_url'] ?? ''));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }

    $origins = app_config('app')['cors_origin'] ?? [];
    if (is_array($origins)) {
        foreach ($origins as $origin) {
            if (is_string($origin) && str_starts_with($origin, 'https://')) {
                return rtrim($origin, '/');
            }
        }
    }

    return 'https://nakcrm.ru';
}

function yandex_oauth_settings(): array
{
    $app = app_config('app');

    return [
        'client_id' => trim((string) ($app['yandex_client_id'] ?? getenv('YANDEX_CLIENT_ID') ?: '')),
        'client_secret' => trim((string) ($app['yandex_client_secret'] ?? getenv('YANDEX_CLIENT_SECRET') ?: '')),
        'redirect_uri' => trim((string) ($app['yandex_redirect_uri'] ?? '')),
    ];
}

function yandex_oauth_is_configured(): bool
{
    $settings = yandex_oauth_settings();

    return $settings['client_id'] !== '' && $settings['client_secret'] !== '';
}

function yandex_oauth_redirect_uri(): string
{
    $settings = yandex_oauth_settings();
    if ($settings['redirect_uri'] !== '') {
        return $settings['redirect_uri'];
    }

    return public_site_base_url() . '/auth/yandex/callback';
}

function oauth_state_secret(): string
{
    $secret = trim((string) (app_config('app')['oauth_state_secret'] ?? ''));
    if ($secret !== '') {
        return $secret;
    }

    $yandexSecret = yandex_oauth_settings()['client_secret'];
    if ($yandexSecret !== '') {
        return $yandexSecret;
    }

    return 'crm-oauth-state';
}

function build_oauth_state(string $mode, array $payload = []): string
{
    $data = [
        'mode' => $mode === 'login' ? 'login' : 'register',
        'companyName' => trim((string) ($payload['companyName'] ?? '')),
        'ts' => time(),
        'nonce' => bin2hex(random_bytes(8)),
    ];
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $encoded = rtrim(strtr(base64_encode($json ?: ''), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', $encoded, oauth_state_secret());

    return $encoded . '.' . $signature;
}

function parse_oauth_state(string $state): ?array
{
    $parts = explode('.', trim($state), 2);
    if (count($parts) !== 2) {
        return null;
    }

    [$encoded, $signature] = $parts;
    if (!hash_equals(hash_hmac('sha256', $encoded, oauth_state_secret()), $signature)) {
        return null;
    }

    $json = base64_decode(strtr($encoded, '-_', '+/'), true);
    $data = json_decode(is_string($json) ? $json : '', true);
    if (!is_array($data)) {
        return null;
    }

    $timestamp = (int) ($data['ts'] ?? 0);
    if ($timestamp < time() - 900) {
        return null;
    }

    return $data;
}

function yandex_authorize_url(string $state): string
{
    $settings = yandex_oauth_settings();
    $query = http_build_query([
        'response_type' => 'code',
        'client_id' => $settings['client_id'],
        'redirect_uri' => yandex_oauth_redirect_uri(),
        'state' => $state,
        'force_confirm' => 'yes',
    ]);

    return 'https://oauth.yandex.ru/authorize?' . $query;
}

function yandex_http_post_form(string $url, array $fields): array
{
    $body = http_build_query($fields);
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $body,
            'timeout' => 20,
            'ignore_errors' => true,
        ],
    ]);

    $response = file_get_contents($url, false, $context);
    if ($response === false) {
        throw new RuntimeException('Не удалось связаться с Яндекс OAuth');
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Некорректный ответ Яндекс OAuth');
    }

    return $decoded;
}

function yandex_http_get_json(string $url, string $accessToken): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: OAuth {$accessToken}\r\nAccept: application/json\r\n",
            'timeout' => 20,
            'ignore_errors' => true,
        ],
    ]);

    $response = file_get_contents($url, false, $context);
    if ($response === false) {
        throw new RuntimeException('Не удалось получить профиль Яндекса');
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Некорректный профиль Яндекса');
    }

    return $decoded;
}

function yandex_exchange_code(string $code): array
{
    $settings = yandex_oauth_settings();
    $payload = yandex_http_post_form('https://oauth.yandex.ru/token', [
        'grant_type' => 'authorization_code',
        'code' => $code,
        'client_id' => $settings['client_id'],
        'client_secret' => $settings['client_secret'],
    ]);

    if (empty($payload['access_token'])) {
        $message = (string) ($payload['error_description'] ?? $payload['error'] ?? 'Не удалось получить токен Яндекса');
        throw new RuntimeException($message);
    }

    return $payload;
}

function yandex_fetch_profile(string $accessToken): array
{
    return yandex_http_get_json('https://login.yandex.ru/info?format=json', $accessToken);
}

function normalize_yandex_profile(array $profile): array
{
    $yandexId = trim((string) ($profile['id'] ?? ''));
    $email = trim((string) ($profile['default_email'] ?? ''));
    $realName = trim((string) ($profile['real_name'] ?? ''));
    $displayName = trim((string) ($profile['display_name'] ?? ''));
    $firstName = trim((string) ($profile['first_name'] ?? ''));
    $lastName = trim((string) ($profile['last_name'] ?? ''));
    $phone = trim((string) ($profile['default_phone']['number'] ?? $profile['default_phone'] ?? ''));

    $name = $realName !== '' ? $realName : trim($firstName . ' ' . $lastName);
    if ($name === '') {
        $name = $displayName !== '' ? $displayName : ($email !== '' ? explode('@', $email)[0] : 'Пользователь');
    }

    return [
        'yandexId' => $yandexId,
        'email' => $email,
        'name' => $name,
        'phone' => $phone,
        'avatar' => trim((string) ($profile['default_avatar_id'] ?? '')) !== ''
            ? 'https://avatars.yandex.net/get-yapic/' . rawurlencode((string) $profile['default_avatar_id']) . '/islands-200'
            : '',
    ];
}

function find_user_by_yandex_id(string $yandexId): ?array
{
    if ($yandexId === '') {
        return null;
    }

    return fetch_one_assoc('SELECT * FROM users WHERE yandex_id = :yandex_id LIMIT 1', [
        'yandex_id' => $yandexId,
    ]);
}

function find_user_by_email_login(string $email): ?array
{
    return find_user_for_email_login($email);
}

function create_tenant_with_admin(
    string $companyName,
    string $email,
    string $adminName,
    string $phone,
    string $passwordHash,
    string $yandexId = '',
    bool $emailVerified = true
): array {
    $slug = unique_tenant_slug(slugify_tenant_name($companyName));
    $now = now_mysql();
    $trialEnds = date('Y-m-d H:i:s', time() + (14 * 86400));

    db()->beginTransaction();
    try {
        db()->prepare(
            'INSERT INTO tenants (name, slug, owner_user_id, status, trial_ends_at, subscription_ends_at, created_at, updated_at)
             VALUES (:name, :slug, NULL, :status, :trial_ends_at, NULL, :created_at, :updated_at)'
        )->execute([
            'name' => $companyName,
            'slug' => $slug,
            'status' => 'trial',
            'trial_ends_at' => $trialEnds,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $tenantId = (int) db()->lastInsertId();
        $userId = 'user-' . bin2hex(random_bytes(8));
        $displayName = $adminName !== '' ? $adminName : $companyName;
        $verifiedAt = $emailVerified ? $now : null;

        db()->prepare(
            'INSERT INTO users (
                id, name, email, phone, login_email, password_hash, can_login, role, department, position,
                salary, intake_rate, execution_rate, delivery_rate, rating, total_orders, completed_orders,
                total_earnings, is_active, hire_date, last_login, tenant_id, is_platform_admin, yandex_id,
                email_verified, email_verified_at, created_at, updated_at
            ) VALUES (
                :id, :name, :email, :phone, :login_email, :password_hash, 1, :role, :department, :position,
                0, 0, 0, 0, 0, 0, 0, 0, 1, :hire_date, NULL, :tenant_id, 0, :yandex_id,
                :email_verified, :email_verified_at, :created_at, :updated_at
            )'
        )->execute([
            'id' => $userId,
            'name' => $displayName,
            'email' => $email,
            'phone' => $phone,
            'login_email' => $email,
            'password_hash' => $passwordHash,
            'role' => 'admin',
            'department' => 'Администрация',
            'position' => 'Администратор',
            'hire_date' => $now,
            'tenant_id' => $tenantId,
            'yandex_id' => $yandexId,
            'email_verified' => $emailVerified ? 1 : 0,
            'email_verified_at' => $verifiedAt,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        db()->prepare('UPDATE tenants SET owner_user_id = :owner_user_id, updated_at = :updated_at WHERE id = :id')->execute([
            'owner_user_id' => $userId,
            'updated_at' => $now,
            'id' => $tenantId,
        ]);

        seed_tenant_settings($tenantId, $companyName, $email, $phone);
        log_tenant_activity($tenantId, $userId, 'register', $companyName);

        db()->commit();
    } catch (Throwable $exception) {
        db()->rollBack();
        throw $exception;
    }

    $user = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $userId]);

    return $user ?: [];
}

function link_yandex_account(array $user, array $profile): array
{
    $updates = ['updated_at = :updated_at'];
    $params = [
        'id' => (string) $user['id'],
        'updated_at' => now_mysql(),
    ];

    if (trim((string) ($user['yandex_id'] ?? '')) === '' && $profile['yandexId'] !== '') {
        $updates[] = 'yandex_id = :yandex_id';
        $params['yandex_id'] = $profile['yandexId'];
    }

    if (trim((string) ($user['name'] ?? '')) === '' && $profile['name'] !== '') {
        $updates[] = 'name = :name';
        $params['name'] = $profile['name'];
    }

    if (trim((string) ($user['phone'] ?? '')) === '' && $profile['phone'] !== '') {
        $updates[] = 'phone = :phone';
        $params['phone'] = $profile['phone'];
    }

    if (!normalize_bool($user['email_verified'] ?? false)) {
        $updates[] = 'email_verified = 1';
        $updates[] = 'email_verified_at = :email_verified_at';
        $updates[] = 'email_verification_token = NULL';
        $updates[] = 'email_verification_sent_at = NULL';
        $params['email_verified_at'] = now_mysql();
    }

    if (count($updates) > 1) {
        db()->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = :id')->execute($params);
        $user = fetch_one_assoc('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => (string) $user['id']]) ?: $user;
    }

    return $user;
}

function complete_yandex_oauth(string $code, string $state, string $companyNameOverride = ''): array
{
    if (!yandex_oauth_is_configured()) {
        json_error('Яндекс OAuth не настроен на сервере', 503);
    }

    $stateData = parse_oauth_state($state);
    if (!$stateData) {
        json_error('Сессия авторизации истекла. Попробуйте снова.', 400);
    }

    $mode = (string) ($stateData['mode'] ?? 'register');
    $tokenPayload = yandex_exchange_code($code);
    $profile = normalize_yandex_profile(yandex_fetch_profile((string) $tokenPayload['access_token']));

    if ($profile['yandexId'] === '') {
        json_error('Яндекс не вернул идентификатор пользователя', 502);
    }

    if ($profile['email'] === '') {
        json_error('У аккаунта Яндекса нет email. Разрешите доступ к email или зарегистрируйтесь по почте.', 422);
    }

    $user = find_user_by_yandex_id($profile['yandexId']);
    if (!$user) {
        $user = find_user_by_email_login($profile['email']);
    }

    if ($user) {
        $existingYandexId = trim((string) ($user['yandex_id'] ?? ''));
        if ($existingYandexId !== '' && $existingYandexId !== $profile['yandexId']) {
            json_error('Этот email уже привязан к другому аккаунту Яндекса', 409);
        }

        $user = link_yandex_account($user, $profile);
        login_response_for_user($user);
        exit;
    }

    if ($mode === 'login') {
        json_error('Аккаунт не найден. Сначала зарегистрируйтесь через Яндекс.', 404);
    }

    $companyName = trim($companyNameOverride !== '' ? $companyNameOverride : (string) ($stateData['companyName'] ?? ''));
    if ($companyName === '') {
        $companyName = $profile['name'] !== '' ? ($profile['name'] . ' — сервис') : ('Сервис ' . explode('@', $profile['email'])[0]);
    }

    if (login_email_is_taken($profile['email'])) {
        json_error('Пользователь с таким email уже зарегистрирован', 409);
    }

    $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $user = create_tenant_with_admin(
        $companyName,
        $profile['email'],
        $profile['name'],
        $profile['phone'],
        $passwordHash,
        $profile['yandexId'],
        true
    );

    login_response_for_user($user);
    exit;
}
