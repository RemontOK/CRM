<?php
require dirname(__DIR__) . '/bootstrap.php';
$pdo = db();

$email = strtolower(trim((string) ($argv[1] ?? 'alexei.kravchenko2015@yandex.ru')));
echo "Lookup: {$email}\n\n";

$stmt = $pdo->prepare(
    'SELECT id, name, login_email, email, role, tenant_id, can_login, is_active,
            email_verified, yandex_id, created_at
     FROM users
     WHERE LOWER(login_email) = :email OR LOWER(email) = :email2'
);
$stmt->execute(['email' => $email, 'email2' => $email]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$rows) {
    echo "No user rows found.\n";
    exit(0);
}

foreach ($rows as $row) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
    $tenantId = (int) ($row['tenant_id'] ?? 0);
    if ($tenantId > 0) {
        $t = $pdo->prepare('SELECT id, name, slug, status, owner_user_id FROM tenants WHERE id = :id LIMIT 1');
        $t->execute(['id' => $tenantId]);
        $tenant = $t->fetch(PDO::FETCH_ASSOC);
        echo "Tenant: " . json_encode($tenant, JSON_UNESCAPED_UNICODE) . "\n";
    }
}
