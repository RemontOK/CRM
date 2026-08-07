<?php
require dirname(__DIR__) . '/bootstrap.php';
$pdo = db();
echo "TENANTS:\n";
foreach ($pdo->query('SELECT id, name, slug, owner_user_id, status, created_at FROM tenants ORDER BY id') as $r) {
    echo json_encode($r, JSON_UNESCAPED_UNICODE) . "\n";
}
echo "\nUSERS BY TENANT:\n";
foreach ($pdo->query('SELECT tenant_id, COUNT(*) AS c FROM users GROUP BY tenant_id ORDER BY tenant_id') as $r) {
    echo json_encode($r) . "\n";
}
echo "\nADMINS:\n";
echo "\nACTIVITY:\n";
foreach ($pdo->query('SELECT * FROM tenant_activity_log ORDER BY id DESC LIMIT 20') as $r) {
    echo json_encode($r, JSON_UNESCAPED_UNICODE) . "\n";
}
echo "\nSETTINGS KEYS:\n";
foreach ($pdo->query("SELECT `key`, LEFT(payload_json, 80) AS preview FROM app_settings WHERE `key` LIKE 'tenant_%' OR `key`='default'") as $r) {
    echo json_encode($r, JSON_UNESCAPED_UNICODE) . "\n";
}
