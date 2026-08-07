<?php

declare(strict_types=1);

function user_is_admin(array $user): bool
{
    return ($user['role'] ?? '') === 'admin';
}

function employee_access_for_user(array $user): array
{
    return merge_employee_access_for_user($user);
}

function employee_can_access_module(array $user, string $module): bool
{
    if (user_is_admin($user)) {
        return true;
    }

    $access = employee_access_for_user($user);
    $allowed = $access['allowedModules'] ?? default_employee_allowed_modules();

    return in_array($module, $allowed, true);
}

function employee_has_settings_access(array $user): bool
{
    if (user_is_admin($user)) {
        return true;
    }

    $access = employee_access_for_user($user);
    $sections = normalize_visible_sections($access['visibleSections'] ?? null);

    return count($sections) > 0;
}

function require_employee_module(array $user, string $module): void
{
    if (!employee_can_access_module($user, $module)) {
        json_error('Доступ к разделу запрещён', 403);
    }
}

function require_settings_read_access(array $user): void
{
    if (!employee_has_settings_access($user)) {
        json_error('Доступ к настройкам запрещён', 403);
    }
}

function require_settings_write_access(array $user): void
{
    require_settings_read_access($user);
}

function resolve_settings_section_key(string $section): string
{
    return match ($section) {
        'email' => 'notifications',
        'sms' => 'integrations',
        default => $section,
    };
}

function employee_visible_settings_sections(array $user): array
{
    if (user_is_admin($user)) {
        return allowed_settings_section_keys();
    }

    $access = employee_access_for_user($user);

    return normalize_visible_sections($access['visibleSections'] ?? null);
}

function employee_can_access_settings_section(array $user, string $section): bool
{
    if (user_is_admin($user)) {
        return true;
    }

    $resolved = resolve_settings_section_key($section);

    return in_array($resolved, employee_visible_settings_sections($user), true);
}

function merge_integrations_settings_for_employee(array $current, array $incoming): array
{
    $merged = array_merge($current, $incoming);
    foreach (['smsCredentials', 'smsApiToken', 'telegramBotToken'] as $secretKey) {
        if (array_key_exists($secretKey, $current)) {
            $merged[$secretKey] = $current[$secretKey];
        }
    }

    return $merged;
}

function merge_orders_settings_for_employee(array $current, array $incoming, array $allowedParts): array
{
    $merged = $current;
    if (!empty($allowedParts['all'])) {
        return array_merge($current, $incoming);
    }

    if (!empty($allowedParts['statuses'])) {
        foreach (['statuses', 'statusLabels', 'statusColors'] as $key) {
            if (array_key_exists($key, $incoming)) {
                $merged[$key] = $incoming[$key];
            }
        }
    }

    if (!empty($allowedParts['quickSales']) && array_key_exists('quickSaleOptions', $incoming)) {
        $merged['quickSaleOptions'] = $incoming['quickSaleOptions'];
    }

    if (!empty($allowedParts['general'])) {
        foreach (['defaultPriority', 'autoOpenCompletionAfterPayment', 'createMode'] as $key) {
            if (array_key_exists($key, $incoming)) {
                $merged[$key] = $incoming[$key];
            }
        }
    }

    return $merged;
}

function merge_forms_settings_for_employee(array $current, array $incoming, array $formKeys): array
{
    $merged = $current;
    foreach ($formKeys as $key) {
        if (array_key_exists($key, $incoming)) {
            $merged[$key] = $incoming[$key];
        }
    }

    return $merged;
}

function merge_employee_settings_payload(array $user, array $incoming): array
{
    $current = load_app_settings_migrated();
    if (user_is_admin($user)) {
        return $incoming;
    }

    $merged = $current;
    $sections = employee_visible_settings_sections($user);

    foreach ($sections as $section) {
        $section = resolve_settings_section_key((string) $section);
        switch ($section) {
            case 'business':
                if (isset($incoming['business']) && is_array($incoming['business'])) {
                    $merged['business'] = $incoming['business'];
                }
                break;
            case 'locations':
                if (isset($incoming['locations']) && is_array($incoming['locations'])) {
                    $merged['locations'] = $incoming['locations'];
                }
                break;
            case 'employees':
                if (isset($incoming['employees']) && is_array($incoming['employees'])) {
                    $merged['employees'] = $incoming['employees'];
                }
                if (isset($incoming['employeeWork']) && is_array($incoming['employeeWork'])) {
                    $merged['employeeWork'] = $incoming['employeeWork'];
                }
                break;
            case 'documents':
                if (isset($incoming['documents']) && is_array($incoming['documents'])) {
                    $merged['documents'] = $incoming['documents'];
                }
                break;
            case 'integrations':
                if (isset($incoming['integrations']) && is_array($incoming['integrations'])) {
                    $merged['integrations'] = merge_integrations_settings_for_employee(
                        is_array($current['integrations'] ?? null) ? $current['integrations'] : [],
                        $incoming['integrations']
                    );
                }
                break;
            case 'orders':
                if (isset($incoming['orders']) && is_array($incoming['orders'])) {
                    $merged['orders'] = merge_orders_settings_for_employee(
                        is_array($current['orders'] ?? null) ? $current['orders'] : [],
                        $incoming['orders'],
                        ['all' => true]
                    );
                }
                break;
            case 'quickSales':
                if (isset($incoming['orders']) && is_array($incoming['orders'])) {
                    $merged['orders'] = merge_orders_settings_for_employee(
                        is_array($merged['orders'] ?? null) ? $merged['orders'] : [],
                        $incoming['orders'],
                        ['quickSales' => true]
                    );
                }
                break;
            case 'statuses':
                if (isset($incoming['orders']) && is_array($incoming['orders'])) {
                    $merged['orders'] = merge_orders_settings_for_employee(
                        is_array($merged['orders'] ?? null) ? $merged['orders'] : [],
                        $incoming['orders'],
                        ['statuses' => true]
                    );
                }
                break;
            case 'notifications':
                if (isset($incoming['notifications']) && is_array($incoming['notifications'])) {
                    $merged['notifications'] = $incoming['notifications'];
                }
                break;
            case 'paymentMethods':
                if (isset($incoming['payment']) && is_array($incoming['payment'])) {
                    $merged['payment'] = array_merge(
                        is_array($merged['payment'] ?? null) ? $merged['payment'] : [],
                        $incoming['payment']
                    );
                }
                break;
            case 'paymentCategories':
                if (isset($incoming['payment']) && is_array($incoming['payment'])) {
                    $merged['payment'] = array_merge(
                        is_array($merged['payment'] ?? null) ? $merged['payment'] : [],
                        $incoming['payment']
                    );
                }
                break;
            case 'clientTypes':
                if (isset($incoming['forms']) && is_array($incoming['forms'])) {
                    $merged['forms'] = merge_forms_settings_for_employee(
                        is_array($merged['forms'] ?? null) ? $merged['forms'] : [],
                        $incoming['forms'],
                        ['clientTypes']
                    );
                }
                break;
            case 'clientFields':
                if (isset($incoming['forms']) && is_array($incoming['forms'])) {
                    $merged['forms'] = merge_forms_settings_for_employee(
                        is_array($merged['forms'] ?? null) ? $merged['forms'] : [],
                        $incoming['forms'],
                        ['clientFields']
                    );
                }
                break;
            case 'directories':
                if (isset($incoming['forms']) && is_array($incoming['forms'])) {
                    $merged['forms'] = merge_forms_settings_for_employee(
                        is_array($merged['forms'] ?? null) ? $merged['forms'] : [],
                        $incoming['forms'],
                        ['directories']
                    );
                }
                break;
            default:
                break;
        }
    }

    return $merged;
}

function require_auth_with_module(?string $module = null, bool $checkTenant = true): array
{
    $user = require_auth();
    if ($checkTenant) {
        require_active_tenant($user);
    }
    if ($module !== null) {
        require_employee_module($user, $module);
    }

    return $user;
}

function enforce_employee_api_path(array $user, string $path): void
{
    if (user_is_admin($user)) {
        return;
    }

    if ($path === '/settings' || str_starts_with($path, '/settings/')) {
        require_settings_read_access($user);
        return;
    }

    if (str_starts_with($path, '/orders')) {
        require_employee_module($user, '/orders');
        return;
    }

    if (str_starts_with($path, '/clients') || str_starts_with($path, '/devices')) {
        require_employee_module($user, '/clients');
        return;
    }

    if (str_starts_with($path, '/users')) {
        require_employee_module($user, '/employees');
        return;
    }

    if (str_starts_with($path, '/inventory')) {
        require_employee_module($user, '/inventory');
        return;
    }

    if (str_starts_with($path, '/cash')) {
        require_employee_module($user, '/cash-register');
        return;
    }

    if (str_starts_with($path, '/sms/inbox') || str_starts_with($path, '/telegram/inbox')) {
        require_employee_module($user, '/messages');
    }
}
