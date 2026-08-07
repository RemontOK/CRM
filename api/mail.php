<?php

declare(strict_types=1);

function mail_settings(): array
{
    $mail = app_config('mail');

    return [
        'enabled' => normalize_bool($mail['enabled'] ?? true),
        'from_email' => trim((string) ($mail['from_email'] ?? 'noreply@nakcrm.ru')),
        'from_name' => trim((string) ($mail['from_name'] ?? 'NAK CRM')),
        'smtp_host' => trim((string) ($mail['smtp_host'] ?? '')),
        'smtp_port' => (int) ($mail['smtp_port'] ?? 587),
        'smtp_username' => trim((string) ($mail['smtp_username'] ?? '')),
        'smtp_password' => trim((string) ($mail['smtp_password'] ?? '')),
        'smtp_encryption' => trim((string) ($mail['smtp_encryption'] ?? 'tls')),
    ];
}

function send_mail_message(string $to, string $subject, string $htmlBody, ?string $textBody = null): bool
{
    $settings = mail_settings();
    if (!$settings['enabled']) {
        if (app_debug()) {
            error_log('[mail] disabled, skipped send to ' . $to . ': ' . $subject);
        }

        return false;
    }

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $fromEmail = $settings['from_email'];
    $fromName = $settings['from_name'];
    $textBody = $textBody ?? trim(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody)));

    if ($settings['smtp_host'] !== '') {
        return send_mail_via_smtp($settings, $to, $subject, $htmlBody, $textBody);
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . mail_format_address($fromEmail, $fromName),
        'Reply-To: ' . $fromEmail,
        'X-Mailer: NAK-CRM',
    ];

    return mail($to, $encodedSubject, $htmlBody, implode("\r\n", $headers));
}

function mail_format_address(string $email, string $name = ''): string
{
    if ($name === '') {
        return $email;
    }

    $encodedName = '=?UTF-8?B?' . base64_encode($name) . '?=';

    return $encodedName . ' <' . $email . '>';
}

function send_mail_via_smtp(array $settings, string $to, string $subject, string $htmlBody, string $textBody): bool
{
    $host = (string) $settings['smtp_host'];
    $port = (int) $settings['smtp_port'];
    $encryption = strtolower((string) $settings['smtp_encryption']);
    $remote = ($encryption === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;

    $socket = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        error_log('[mail] SMTP connect failed: ' . $errstr);
        return false;
    }

    stream_set_timeout($socket, 20);

    if (!smtp_expect($socket, [220])) {
        fclose($socket);
        return false;
    }

    $hostname = gethostname() ?: 'localhost';
    if (!smtp_command($socket, 'EHLO ' . $hostname, [250])) {
        fclose($socket);
        return false;
    }

    if ($encryption === 'tls') {
        if (!smtp_command($socket, 'STARTTLS', [220])) {
            fclose($socket);
            return false;
        }
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket);
            return false;
        }
        if (!smtp_command($socket, 'EHLO ' . $hostname, [250])) {
            fclose($socket);
            return false;
        }
    }

    $username = (string) $settings['smtp_username'];
    $password = (string) $settings['smtp_password'];
    if ($username !== '') {
        if (!smtp_command($socket, 'AUTH LOGIN', [334])) {
            fclose($socket);
            return false;
        }
        if (!smtp_command($socket, base64_encode($username), [334])) {
            fclose($socket);
            return false;
        }
        if (!smtp_command($socket, base64_encode($password), [235])) {
            fclose($socket);
            return false;
        }
    }

    $fromEmail = (string) $settings['from_email'];
    if (!smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250])) {
        fclose($socket);
        return false;
    }
    if (!smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251])) {
        fclose($socket);
        return false;
    }
    if (!smtp_command($socket, 'DATA', [354])) {
        fclose($socket);
        return false;
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $boundary = 'crm_' . bin2hex(random_bytes(8));
    $message = implode("\r\n", [
        'From: ' . mail_format_address($fromEmail, (string) $settings['from_name']),
        'To: ' . $to,
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        '',
        '--' . $boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        $textBody,
        '',
        '--' . $boundary,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        $htmlBody,
        '',
        '--' . $boundary . '--',
        '.',
    ]);

    fwrite($socket, $message . "\r\n");
    if (!smtp_expect($socket, [250])) {
        fclose($socket);
        return false;
    }

    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);

    return true;
}

function smtp_command($socket, string $command, array $expectedCodes): bool
{
    fwrite($socket, $command . "\r\n");

    return smtp_expect($socket, $expectedCodes);
}

function smtp_expect($socket, array $expectedCodes): bool
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    $code = (int) substr(trim($response), 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        error_log('[mail] SMTP unexpected response: ' . trim($response));
        return false;
    }

    return true;
}
