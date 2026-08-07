<?php

declare(strict_types=1);

function rate_limit_storage_dir(): string
{
    $dir = __DIR__ . '/data/rate_limits';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }

    return $dir;
}

function rate_limit_client_ip(): string
{
    $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    if ($ip === '') {
        return 'unknown';
    }

    return $ip;
}

function rate_limit_key(string $action, string $subject): string
{
    return hash('sha256', $action . '|' . $subject);
}

function rate_limit_file_path(string $action, string $subject): string
{
    return rate_limit_storage_dir() . '/' . rate_limit_key($action, $subject) . '.json';
}

function rate_limit_read(string $action, string $subject): array
{
    $path = rate_limit_file_path($action, $subject);
    if (!is_file($path)) {
        return ['hits' => [], 'blocked_until' => 0];
    }

    $raw = file_get_contents($path);
    $data = json_decode(is_string($raw) ? $raw : '', true);
    if (!is_array($data)) {
        return ['hits' => [], 'blocked_until' => 0];
    }

    return [
        'hits' => is_array($data['hits'] ?? null) ? array_values($data['hits']) : [],
        'blocked_until' => (int) ($data['blocked_until'] ?? 0),
    ];
}

function rate_limit_write(string $action, string $subject, array $data): void
{
    $path = rate_limit_file_path($action, $subject);
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function rate_limit_prune_hits(array $hits, int $windowSeconds): array
{
    $cutoff = time() - $windowSeconds;

    return array_values(array_filter($hits, static function ($timestamp) use ($cutoff): bool {
        return (int) $timestamp >= $cutoff;
    }));
}

function rate_limit_check(string $action, string $subject, int $maxAttempts, int $windowSeconds): ?string
{
    $data = rate_limit_read($action, $subject);
    if (($data['blocked_until'] ?? 0) > time()) {
        return 'Слишком много попыток. Попробуйте позже.';
    }

    $hits = rate_limit_prune_hits($data['hits'], $windowSeconds);
    if (count($hits) >= $maxAttempts) {
        $data['hits'] = $hits;
        $data['blocked_until'] = time() + min($windowSeconds, 900);
        rate_limit_write($action, $subject, $data);

        return 'Слишком много попыток. Попробуйте позже.';
    }

    return null;
}

function rate_limit_hit(string $action, string $subject, int $windowSeconds): void
{
    $data = rate_limit_read($action, $subject);
    $hits = rate_limit_prune_hits($data['hits'], $windowSeconds);
    $hits[] = time();
    $data['hits'] = $hits;
    rate_limit_write($action, $subject, $data);
}

function rate_limit_clear(string $action, string $subject): void
{
    $path = rate_limit_file_path($action, $subject);
    if (is_file($path)) {
        unlink($path);
    }
}
