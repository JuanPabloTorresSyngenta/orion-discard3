<?php
/**
 * OrionDiscard_Utils_SecurityHelper
 * Utilidades de seguridad y helpers para AJAX y validación
 */
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Utils_SecurityHelper {
    public static function ajax_error($msg) {
        wp_send_json_error(['error' => $msg]);
        wp_die();
    }
    public static function ajax_success($data) {
        wp_send_json_success($data);
        wp_die();
    }
    public static function sanitize_post_data($post, $rules) {
        $sanitized = [];
        foreach ($rules as $key => $type) {
            if (!isset($post[$key])) continue;
            switch ($type) {
                case 'int': $sanitized[$key] = intval($post[$key]); break;
                case 'json': $sanitized[$key] = json_decode($post[$key], true); break;
                case 'text': default: $sanitized[$key] = sanitize_text_field($post[$key]); break;
            }
        }
        return $sanitized;
    }
    public static function validate_required_params($required) {
        $missing = [];
        foreach ($required as $key) {
            if (empty($_POST[$key])) $missing[] = $key;
        }
        return [
            'valid' => empty($missing),
            'missing' => $missing
        ];
    }
    public static function verify_ajax_nonce() {
        return isset($_POST['_ajax_nonce']) && wp_verify_nonce($_POST['_ajax_nonce'], 'orion_discard_ajax');
    }
    public static function verify_user_capability() {
        return current_user_can('edit_posts');
    }
    public static function log_security_event($msg, $data = []) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[ORION DISCARD SECURITY] ' . $msg . ' | ' . print_r($data, true));
        }
    }
    public static function escape_attr($val) {
        return esc_attr($val);
    }
    public static function escape_html($val) {
        return esc_html($val);
    }
}
