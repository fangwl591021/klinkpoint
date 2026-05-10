<?php
/**
 * Plugin Name: KlinkPoint Users API
 * Description: Exposes a protected REST API for exporting WordPress user IDs and LINE user IDs for KlinkPoint.
 * Version: 0.1.0
 * Author: KlinkPoint
 */

if (!defined('ABSPATH')) {
    exit;
}

const KLINKPOINT_USERS_OPTION_API_KEY = 'klinkpoint_users_api_key';
const KLINKPOINT_USERS_OPTION_META_KEYS = 'klinkpoint_users_line_meta_keys';

function klinkpoint_users_default_meta_keys() {
    return array(
        'LINE_user_id',
        'line_user_id',
        'line_uid',
        'line_id',
        'line_userid',
        'line_login_user_id',
        'wetw_line_id',
        'wetw_line_user_id',
        'weline_line_user_id',
        'user_line_id',
    );
}

function klinkpoint_users_get_api_key() {
    $api_key = get_option(KLINKPOINT_USERS_OPTION_API_KEY);
    if (!$api_key) {
        $api_key = wp_generate_password(48, false, false);
        update_option(KLINKPOINT_USERS_OPTION_API_KEY, $api_key, false);
    }

    return $api_key;
}

function klinkpoint_users_get_meta_keys() {
    $raw = get_option(KLINKPOINT_USERS_OPTION_META_KEYS, '');
    if (!$raw) {
        return klinkpoint_users_default_meta_keys();
    }

    $keys = array_filter(array_map('trim', explode(',', $raw)));
    return $keys ? $keys : klinkpoint_users_default_meta_keys();
}

function klinkpoint_users_is_line_uid($value) {
    return is_string($value) && preg_match('/^U[a-fA-F0-9]{32}$/', $value);
}

function klinkpoint_users_permission(WP_REST_Request $request) {
    $configured_key = klinkpoint_users_get_api_key();
    $request_key = $request->get_header('x-klinkpoint-api-key');

    if (!$request_key) {
        $request_key = $request->get_param('api_key');
    }

    return hash_equals($configured_key, (string) $request_key);
}

function klinkpoint_users_detect_line_uid($user_id, $meta_keys) {
    foreach ($meta_keys as $meta_key) {
        $value = get_user_meta($user_id, $meta_key, true);
        if (klinkpoint_users_is_line_uid($value)) {
            return array(
                'line_user_id' => $value,
                'meta_key' => $meta_key,
            );
        }
    }

    $all_meta = get_user_meta($user_id);
    foreach ($all_meta as $meta_key => $values) {
        foreach ((array) $values as $value) {
            if (klinkpoint_users_is_line_uid($value)) {
                return array(
                    'line_user_id' => $value,
                    'meta_key' => $meta_key,
                );
            }
        }
    }

    return null;
}

function klinkpoint_users_list(WP_REST_Request $request) {
    $page = max(1, (int) $request->get_param('page'));
    $per_page = min(200, max(1, (int) ($request->get_param('per_page') ?: 100)));
    $role = sanitize_text_field((string) $request->get_param('role'));
    $include_without_line = (bool) $request->get_param('include_without_line');

    $args = array(
        'number' => $per_page,
        'paged' => $page,
        'fields' => array('ID', 'user_login', 'display_name', 'user_email'),
        'count_total' => true,
    );

    if ($role) {
        $args['role'] = $role;
    }

    $query = new WP_User_Query($args);
    $meta_keys = klinkpoint_users_get_meta_keys();
    $users = array();

    foreach ($query->get_results() as $user) {
        $line = klinkpoint_users_detect_line_uid($user->ID, $meta_keys);
        if (!$line && !$include_without_line) {
            continue;
        }

        $users[] = array(
            'wp_user_id' => (int) $user->ID,
            'user_login' => $user->user_login,
            'display_name' => $user->display_name,
            'email' => $user->user_email,
            'line_user_id' => $line ? $line['line_user_id'] : null,
            'line_meta_key' => $line ? $line['meta_key'] : null,
        );
    }

    return rest_ensure_response(array(
        'success' => true,
        'page' => $page,
        'per_page' => $per_page,
        'total' => (int) $query->get_total(),
        'total_pages' => (int) ceil($query->get_total() / $per_page),
        'users' => $users,
    ));
}

function klinkpoint_users_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    if (isset($_POST['klinkpoint_users_save'])) {
        check_admin_referer('klinkpoint_users_save');
        update_option(
            KLINKPOINT_USERS_OPTION_META_KEYS,
            sanitize_text_field((string) wp_unslash($_POST['line_meta_keys'] ?? '')),
            false
        );
        echo '<div class="updated"><p>Saved.</p></div>';
    }

    $api_key = esc_html(klinkpoint_users_get_api_key());
    $meta_keys = esc_attr(implode(',', klinkpoint_users_get_meta_keys()));
    $endpoint = esc_url(rest_url('klinkpoint/v1/users'));

    echo '<div class="wrap">';
    echo '<h1>KlinkPoint Users API</h1>';
    echo '<p><strong>Endpoint:</strong> <code>' . $endpoint . '</code></p>';
    echo '<p><strong>API Key:</strong> <code>' . $api_key . '</code></p>';
    echo '<form method="post">';
    wp_nonce_field('klinkpoint_users_save');
    echo '<table class="form-table"><tr>';
    echo '<th scope="row"><label for="line_meta_keys">LINE meta keys</label></th>';
    echo '<td><input name="line_meta_keys" id="line_meta_keys" type="text" class="regular-text" value="' . $meta_keys . '">';
    echo '<p class="description">Comma-separated keys. If none match, the plugin scans all user meta values for LINE UID format.</p></td>';
    echo '</tr></table>';
    submit_button('Save', 'primary', 'klinkpoint_users_save');
    echo '</form>';
    echo '</div>';
}

add_action('admin_menu', function () {
    add_options_page(
        'KlinkPoint Users API',
        'KlinkPoint Users',
        'manage_options',
        'klinkpoint-users',
        'klinkpoint_users_settings_page'
    );
});

add_action('rest_api_init', function () {
    register_rest_route('klinkpoint/v1', '/users', array(
        'methods' => 'GET',
        'callback' => 'klinkpoint_users_list',
        'permission_callback' => 'klinkpoint_users_permission',
        'args' => array(
            'page' => array('default' => 1),
            'per_page' => array('default' => 100),
            'role' => array('default' => ''),
            'include_without_line' => array('default' => false),
        ),
    ));
});
