<?php

declare(strict_types=1);

const DOCUMENT_WORKS_TABLE_TOKEN = '{{ТаблицаРабот}}';
const DOCUMENT_CLIENT_DATA_TABLE_TOKEN = '{{ТаблицаДанныхКлиента}}';

function find_balanced_div_ranges(string $html, string $tokenName): array
{
    $ranges = [];
    $pattern = '/<div\b[^>]*\bdata-crm-token="' . preg_quote($tokenName, '/') . '"[^>]*>/iu';
    $offset = 0;

    while (preg_match($pattern, $html, $match, PREG_OFFSET_CAPTURE, $offset)) {
        $start = (int) $match[0][1];
        $cursor = $start + strlen($match[0][0]);
        $depth = 1;

        while ($cursor < strlen($html) && $depth > 0) {
            $lower = strtolower(substr($html, $cursor));
            $nextOpen = strpos($lower, '<div');
            $nextClose = strpos($lower, '</div>');

            if ($nextClose === false) {
                break;
            }

            if ($nextOpen !== false && $nextOpen < $nextClose) {
                $depth += 1;
                $cursor += $nextOpen + 4;
                continue;
            }

            $depth -= 1;
            $cursor += $nextClose + 6;

            if ($depth === 0) {
                $ranges[] = ['start' => $start, 'end' => $cursor];
            }
        }

        $offset = $cursor;
    }

    return $ranges;
}

function replace_editor_token_blocks(string $html, string $tokenName, string $replacement): string
{
    $ranges = find_balanced_div_ranges($html, $tokenName);
    if ($ranges === []) {
        return $html;
    }

    $result = $html;
    for ($index = count($ranges) - 1; $index >= 0; $index -= 1) {
        $start = $ranges[$index]['start'];
        $end = $ranges[$index]['end'];
        $result = substr($result, 0, $start) . $replacement . substr($result, $end);
    }

    return $result;
}

function unwrap_editor_token_blocks(string $html, string $tokenName): string
{
    $ranges = find_balanced_div_ranges($html, $tokenName);
    if ($ranges === []) {
        return $html;
    }

    $result = $html;
    $openPattern = '/^<div\b[^>]*\bdata-crm-token="' . preg_quote($tokenName, '/') . '"[^>]*>/iu';

    for ($index = count($ranges) - 1; $index >= 0; $index -= 1) {
        $start = $ranges[$index]['start'];
        $end = $ranges[$index]['end'];
        $slice = substr($result, $start);
        if (!preg_match($openPattern, $slice, $openMatch)) {
            continue;
        }

        $innerStart = $start + strlen($openMatch[0]);
        $innerHtml = substr($result, $innerStart, $end - 6 - $innerStart);
        $result = substr($result, 0, $start) . $innerHtml . substr($result, $end);
    }

    return $result;
}

function collapse_repeated_token(string $html, string $token): string
{
    $escaped = preg_quote($token, '/');

    return preg_replace('/(\s*' . $escaped . '\s*)+/u', "\n" . $token . "\n", $html) ?? $html;
}

function has_legacy_inline_client_data_table(string $html): bool
{
    return (bool) preg_match(
        '/<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/iu',
        $html
    );
}

function is_persisted_client_data_table_template(string $html): bool
{
    if (str_contains($html, 'data-crm-client-table=')) {
        return true;
    }

    return str_contains($html, '{{ФИОКлиента}}') && has_legacy_inline_client_data_table($html);
}

function repair_client_data_table_template(string $html): string
{
    if (is_persisted_client_data_table_template($html)) {
        $result = replace_editor_token_blocks($html, 'ТаблицаДанныхКлиента', '');
        $result = unwrap_editor_token_blocks($result, 'ТаблицаДанныхКлиента');

        if (preg_match_all('/Номер телефона клиента\s*:/iu', $result) > 1) {
            $result = preg_replace(
                '/(?:<div[^>]*>\s*)*(?:<p[^>]*>\s*)*(?:<strong>\s*)?Номер телефона клиента\s*:[\s\S]*?(?=(?:<strong>\s*)?Номер телефона клиента\s*:|$)/iu',
                '',
                $result
            ) ?? $result;
        }

        return trim(preg_replace('/\n{3,}/u', "\n\n", $result) ?? $result);
    }

    $result = replace_editor_token_blocks($html, 'ТаблицаДанныхКлиента', DOCUMENT_CLIENT_DATA_TABLE_TOKEN);
    $result = collapse_repeated_token($result, DOCUMENT_CLIENT_DATA_TABLE_TOKEN);

    $hasToken = str_contains($result, DOCUMENT_CLIENT_DATA_TABLE_TOKEN);

    if ($hasToken) {
        while (has_legacy_inline_client_data_table($result)) {
            $result = preg_replace(
                '/<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/iu',
                '',
                $result,
                1
            ) ?? $result;
        }
    }

    if (preg_match_all('/Номер телефона клиента\s*:/iu', $result) > 1) {
        $result = preg_replace(
            '/(?:<div[^>]*>\s*)*(?:<p[^>]*>\s*)*(?:<strong>\s*)?Номер телефона клиента\s*:[\s\S]*?(?=(?:<strong>\s*)?Номер телефона клиента\s*:|$)/iu',
            '',
            $result
        ) ?? $result;
    }

    if (!str_contains($result, DOCUMENT_CLIENT_DATA_TABLE_TOKEN)
        && has_legacy_inline_client_data_table($result)
        && !is_persisted_client_data_table_template($result)) {
        $result = preg_replace(
            '/<table[\s\S]*?<th[^>]*>\s*Клиент\s*<\/th>[\s\S]*?<th[^>]*>\s*Устройство\s*<\/th>[\s\S]*?<th[^>]*>\s*Ремонт\s*<\/th>[\s\S]*?<\/table>/iu',
            DOCUMENT_CLIENT_DATA_TABLE_TOKEN,
            $result,
            1
        ) ?? $result;
    }

    return trim(preg_replace('/\n{3,}/u', "\n\n", $result) ?? $result);
}

function migrate_document_template_html(string $html): string
{
    $result = $html;

    if (str_contains($result, DOCUMENT_WORKS_TABLE_TOKEN)
        && preg_match('/<table[\s\S]*?<th[\s\S]*?>[\s\S]*?№[\s\S]*?<\/th>[\s\S]*?\{\{ТаблицаРабот\}\}/iu', $result)) {
        $result = preg_replace(
            '/<table[\s\S]*?\{\{ТаблицаРабот\}\}[\s\S]*?<\/table>/iu',
            DOCUMENT_WORKS_TABLE_TOKEN,
            $result,
            1
        ) ?? $result;
    }

    if (str_contains($result, DOCUMENT_WORKS_TABLE_TOKEN)
        && preg_match('/<table[\s\S]*?Наименование работы[\s\S]*?<\/table>/iu', $result)) {
        $result = preg_replace_callback(
            '/<table[\s\S]*?Наименование работы[\s\S]*?<\/table>/iu',
            static function (array $matches): string {
                if (str_contains($matches[0], DOCUMENT_WORKS_TABLE_TOKEN)) {
                    return DOCUMENT_WORKS_TABLE_TOKEN;
                }

                return '';
            },
            $result
        ) ?? $result;
        $result = preg_replace('/(\s*\{\{ТаблицаРабот\}\}\s*)+/u', "\n" . DOCUMENT_WORKS_TABLE_TOKEN . "\n", $result) ?? $result;
    }

    return repair_client_data_table_template($result);
}

function migrate_document_templates_in_settings(array $settings): array
{
    $documents = is_array($settings['documents'] ?? null) ? $settings['documents'] : [];
    $templates = is_array($documents['templates'] ?? null) ? $documents['templates'] : [];
    if ($templates === []) {
        return $settings;
    }

    $changed = false;
    foreach ($templates as $index => $template) {
        if (!is_array($template)) {
            continue;
        }

        $html = (string) ($template['template'] ?? '');
        $migrated = migrate_document_template_html($html);
        if ($migrated === $html) {
            continue;
        }

        $templates[$index]['template'] = $migrated;
        $templates[$index]['updatedAt'] = date('c');
        $changed = true;
    }

    if (!$changed) {
        return $settings;
    }

    $documents['templates'] = array_values($templates);
    $settings['documents'] = $documents;

    return $settings;
}
