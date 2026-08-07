<?php

declare(strict_types=1);

function yoomoney_billing_config(): array
{
    $config = app_config('yoomoney');
    return is_array($config) ? $config : [];
}

function yoomoney_billing_is_configured(): bool
{
    $config = yoomoney_billing_config();
    $wallet = trim((string) ($config['wallet'] ?? ''));
    $secret = trim((string) ($config['notification_secret'] ?? ''));

    return $wallet !== '' && $secret !== '';
}

function yoomoney_billing_wallet(): string
{
    return trim((string) (yoomoney_billing_config()['wallet'] ?? ''));
}

function yoomoney_billing_notification_secret(): string
{
    return trim((string) (yoomoney_billing_config()['notification_secret'] ?? ''));
}

function yoomoney_billing_monthly_price(): float
{
    $configPrice = (float) (yoomoney_billing_config()['monthly_price'] ?? 0);
    if ($configPrice > 0) {
        return $configPrice;
    }

    $plan = fetch_one_assoc(
        'SELECT price_monthly FROM subscription_plans WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
    );

    return (float) ($plan['price_monthly'] ?? 2290);
}

function billing_allowed_months(): array
{
    return [1, 3, 6, 12];
}

function normalize_billing_months(int $months): int
{
    return in_array($months, billing_allowed_months(), true) ? $months : 1;
}

function calculate_subscription_price(int $months, ?float $monthlyPrice = null): float
{
    $monthlyPrice = $monthlyPrice ?? yoomoney_billing_monthly_price();
    $months = max(1, $months);

    if ($months <= 1) {
        return round($monthlyPrice, 2);
    }

    $discountedMonth = $monthlyPrice * 0.9;
    return round($monthlyPrice + ($months - 1) * $discountedMonth, 2);
}

function build_subscription_plans(?float $monthlyPrice = null): array
{
    $monthlyPrice = $monthlyPrice ?? yoomoney_billing_monthly_price();

    return array_map(static function (int $months) use ($monthlyPrice) {
        $amount = calculate_subscription_price($months, $monthlyPrice);
        $fullPrice = $monthlyPrice * $months;

        return [
            'months' => $months,
            'amount' => $amount,
            'monthlyEquivalent' => (int) round($amount / $months),
            'savings' => max(0, (int) round($fullPrice - $amount)),
            'discountPercent' => $months > 1 ? 10 : 0,
        ];
    }, billing_allowed_months());
}

function ensure_billing_payments_schema(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS billing_payments (
            id VARCHAR(32) PRIMARY KEY,
            tenant_id BIGINT UNSIGNED NOT NULL,
            user_id VARCHAR(64) NOT NULL DEFAULT '',
            amount DECIMAL(12,2) NOT NULL,
            label VARCHAR(64) NOT NULL,
            status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
            operation_id VARCHAR(64) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            paid_at DATETIME NULL,
            UNIQUE KEY uniq_billing_label (label),
            KEY idx_billing_tenant (tenant_id),
            KEY idx_billing_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    try {
        db()->exec('ALTER TABLE billing_payments ADD COLUMN months INT NOT NULL DEFAULT 1');
    } catch (Throwable $e) {
        // column already exists
    }

    try {
        db()->exec("ALTER TABLE billing_payments ADD COLUMN payment_type VARCHAR(32) NOT NULL DEFAULT 'subscription'");
    } catch (Throwable $e) {
        // column already exists
    }
}

function parse_billing_label_tenant_id(string $label): ?int
{
    if (!preg_match('/^crm_(\d+)_/i', $label, $matches)) {
        return null;
    }

    return (int) $matches[1];
}

function activate_tenant_subscription(int $tenantId, int $months = 1): void
{
    $tenant = fetch_tenant_by_id($tenantId);
    if (!$tenant) {
        return;
    }

    $subscriptionEndsAt = trim((string) ($tenant['subscription_ends_at'] ?? ''));
    $baseTs = time();
    if ($subscriptionEndsAt !== '' && strtotime($subscriptionEndsAt) > $baseTs) {
        $baseTs = (int) strtotime($subscriptionEndsAt);
    }

    $newEndsAt = date('Y-m-d H:i:s', strtotime('+' . $months . ' month', $baseTs));

    db()->prepare(
        'UPDATE tenants SET status = :status, subscription_ends_at = :subscription_ends_at, updated_at = :updated_at WHERE id = :id'
    )->execute([
        'status' => 'active',
        'subscription_ends_at' => $newEndsAt,
        'updated_at' => now_mysql(),
        'id' => $tenantId,
    ]);
}

function create_yoomoney_subscription_payment(array $user, int $months = 1, string $paymentType = 'subscription'): array
{
    ensure_billing_payments_schema();

    $paymentType = in_array($paymentType, ['subscription', 'location_slot'], true) ? $paymentType : 'subscription';
    $tenantId = user_tenant_id($user);
    $months = normalize_billing_months($months);
    $amount = calculate_subscription_price($months);
    if ($amount <= 0) {
        json_error('Стоимость подписки не настроена', 500);
    }

    $paymentId = bin2hex(random_bytes(8));
    $label = 'crm_' . $tenantId . '_' . $paymentId;
    $now = now_mysql();

    db()->prepare(
        'INSERT INTO billing_payments (id, tenant_id, user_id, amount, label, status, months, payment_type, created_at)
         VALUES (:id, :tenant_id, :user_id, :amount, :label, :status, :months, :payment_type, :created_at)'
    )->execute([
        'id' => $paymentId,
        'tenant_id' => $tenantId,
        'user_id' => (string) ($user['id'] ?? ''),
        'amount' => $amount,
        'label' => $label,
        'status' => 'pending',
        'months' => $months,
        'payment_type' => $paymentType,
        'created_at' => $now,
    ]);

    $publicUrl = rtrim((string) (app_config('app')['public_url'] ?? 'https://nakcrm.ru'), '/');
    $successQuery = $paymentType === 'location_slot' ? 'paid=location' : 'paid=1';
    $targets = $paymentType === 'location_slot'
        ? 'Подписка CRM — дополнительная локация, ' . $months . ' мес.'
        : 'Подписка CRM — ' . $months . ' мес.';
    $query = http_build_query([
        'receiver' => yoomoney_billing_wallet(),
        'quickpay-form' => 'shop',
        'targets' => $targets,
        'paymentType' => 'AC',
        'sum' => number_format($amount, 2, '.', ''),
        'label' => $label,
        'successURL' => $publicUrl . '/subscribe?' . $successQuery,
    ]);

    log_tenant_activity($tenantId, (string) ($user['id'] ?? ''), 'billing_payment_created', json_encode([
        'amount' => $amount,
        'label' => $label,
        'months' => $months,
        'paymentType' => $paymentType,
    ], JSON_UNESCAPED_UNICODE));

    return [
        'paymentUrl' => 'https://yoomoney.ru/quickpay/confirm.xml?' . $query,
        'amount' => $amount,
        'months' => $months,
        'label' => $label,
        'currency' => 'RUB',
        'paymentType' => $paymentType,
    ];
}

function create_yoomoney_location_payment(array $user, int $months = 1): array
{
    return create_yoomoney_subscription_payment($user, $months, 'location_slot');
}

function verify_yoomoney_notification_hash(array $payload): bool
{
    $secret = yoomoney_billing_notification_secret();
    if ($secret === '') {
        return false;
    }

    $notificationType = (string) ($payload['notification_type'] ?? '');
    $operationId = (string) ($payload['operation_id'] ?? '');
    $amount = (string) ($payload['amount'] ?? '');
    $currency = (string) ($payload['currency'] ?? '');
    $datetime = (string) ($payload['datetime'] ?? '');
    $sender = (string) ($payload['sender'] ?? '');
    $codepro = (string) ($payload['codepro'] ?? 'false');
    $notificationSecret = (string) ($payload['notification_secret'] ?? '');
    $label = (string) ($payload['label'] ?? '');
    $sha1Hash = strtolower((string) ($payload['sha1_hash'] ?? ''));

    $checkString = implode('&', [
        $notificationType,
        $operationId,
        $amount,
        $currency,
        $datetime,
        $sender,
        $codepro,
        $notificationSecret,
        $label,
        $secret,
    ]);

    return hash_equals(sha1($checkString), $sha1Hash);
}

function complete_yoomoney_notification(array $payload): bool
{
    ensure_billing_payments_schema();

    if (!verify_yoomoney_notification_hash($payload)) {
        return false;
    }

    $label = trim((string) ($payload['label'] ?? ''));
    $operationId = trim((string) ($payload['operation_id'] ?? ''));
    $amount = (float) ($payload['amount'] ?? 0);
    if ($label === '' || $amount <= 0) {
        return false;
    }

    $payment = fetch_one_assoc(
        'SELECT * FROM billing_payments WHERE label = :label LIMIT 1',
        ['label' => $label]
    );

    $tenantId = $payment ? (int) ($payment['tenant_id'] ?? 0) : (parse_billing_label_tenant_id($label) ?? 0);
    if ($tenantId <= 0) {
        return false;
    }

    if ($payment && (string) ($payment['status'] ?? '') === 'paid') {
        return true;
    }

    $expectedAmount = $payment
        ? (float) ($payment['amount'] ?? 0)
        : yoomoney_billing_monthly_price();
    if ($expectedAmount > 0 && abs($amount - $expectedAmount) > 0.01) {
        return false;
    }

    $now = now_mysql();
    if ($payment) {
        db()->prepare(
            'UPDATE billing_payments
             SET status = :status, operation_id = :operation_id, paid_at = :paid_at
             WHERE label = :label'
        )->execute([
            'status' => 'paid',
            'operation_id' => $operationId,
            'paid_at' => $now,
            'label' => $label,
        ]);
    } else {
        db()->prepare(
            'INSERT INTO billing_payments (id, tenant_id, user_id, amount, label, status, operation_id, created_at, paid_at)
             VALUES (:id, :tenant_id, :user_id, :amount, :label, :status, :operation_id, :created_at, :paid_at)'
        )->execute([
            'id' => bin2hex(random_bytes(8)),
            'tenant_id' => $tenantId,
            'user_id' => '',
            'amount' => $amount,
            'label' => $label,
            'status' => 'paid',
            'operation_id' => $operationId,
            'created_at' => $now,
            'paid_at' => $now,
        ]);
    }

    $paidMonths = normalize_billing_months($payment ? (int) ($payment['months'] ?? 1) : 1);
    $paymentType = $payment ? (string) ($payment['payment_type'] ?? 'subscription') : 'subscription';
    activate_tenant_subscription($tenantId, $paidMonths);
    if ($paymentType === 'location_slot') {
        grant_tenant_location_slot($tenantId, 1);
    }
    log_tenant_activity($tenantId, null, 'billing_payment_paid', json_encode([
        'label' => $label,
        'amount' => $amount,
        'operationId' => $operationId,
        'months' => $paidMonths,
        'paymentType' => $paymentType,
    ], JSON_UNESCAPED_UNICODE));

    return true;
}

function handle_yoomoney_billing_routes(string $method, string $path): bool
{
    if ($method === 'GET' && $path === '/platform/billing/config') {
        $user = require_auth();
        $tenantId = user_tenant_id($user);
        $monthlyPrice = yoomoney_billing_monthly_price();
        $locationSlots = tenant_location_slots($tenantId);
        $locationsCount = tenant_locations_count($tenantId);
        json_response([
            'enabled' => yoomoney_billing_is_configured(),
            'wallet' => yoomoney_billing_is_configured() ? yoomoney_billing_wallet() : '',
            'amount' => $monthlyPrice,
            'monthlyPrice' => $monthlyPrice,
            'plans' => build_subscription_plans($monthlyPrice),
            'currency' => 'RUB',
            'locationSlots' => $locationSlots,
            'locationsCount' => $locationsCount,
            'canAddLocation' => tenant_can_add_location($tenantId),
            'includedLocationSlots' => 1,
            'tenant' => map_tenant(fetch_tenant_by_id($tenantId) ?: []),
        ]);
        return true;
    }

    if ($method === 'POST' && $path === '/platform/billing/yoomoney/create') {
        $user = require_auth();
        if (!yoomoney_billing_is_configured()) {
            json_error('ЮMoney не настроен на сервере', 503);
        }
        $payload = json_input();
        $months = normalize_billing_months((int) ($payload['months'] ?? 1));
        json_response(create_yoomoney_subscription_payment($user, $months));
        return true;
    }

    if ($method === 'POST' && $path === '/platform/billing/yoomoney/create-location') {
        $user = require_auth();
        if (!yoomoney_billing_is_configured()) {
            json_error('ЮMoney не настроен на сервере', 503);
        }
        $payload = json_input();
        $months = normalize_billing_months((int) ($payload['months'] ?? 1));
        json_response(create_yoomoney_location_payment($user, $months));
        return true;
    }

    if ($method === 'POST' && $path === '/platform/billing/yoomoney/notify') {
        $payload = $_POST;
        if (!is_array($payload) || $payload === []) {
            $payload = json_input();
        }
        if (!is_array($payload)) {
            $payload = [];
        }

        if (!complete_yoomoney_notification($payload)) {
            http_response_code(400);
            echo 'invalid';
            exit;
        }

        echo 'OK';
        exit;
    }

    return false;
}
