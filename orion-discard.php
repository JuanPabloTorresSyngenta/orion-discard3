<?php

/** 
 * Plugin Name: Orion Discard
 * Plugin URI: https://example.com
 * Description: Plugin base generado automaticamente
 * Version: 1.0.1
 * Author: Juan P. Torres
 * Text Domain: orion-discard
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ORION_DISCARD_VERSION', '1.0.1');
define('ORION_DISCARD_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ORION_DISCARD_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('ORION_DISCARD_DEBUG_MODE', defined('WP_DEBUG') && WP_DEBUG);

// Load required files
require_once ORION_DISCARD_PLUGIN_PATH . 'includes/bootstrap.php';

// Global handler instance
global $orion_discard_handler;

/**
 * Initialize the plugin
 */
function orion_discard_init() {
    global $orion_discard_handler;
    
    // Load core classes through bootstrap
    orion_discard_init_refactored_system();
    
    // Create and store the handler instance
    $orion_discard_handler = new OrionDiscardHandler();
}
add_action('plugins_loaded', 'orion_discard_init');

/**
 * Plugin activation hook
 */
register_activation_hook(__FILE__, 'orion_discard_activate');
function orion_discard_activate() {
    global $orion_discard_handler;
    
    // Ensure core classes are loaded
    orion_discard_init_refactored_system();
    
    // Create temporary handler if needed
    if (!isset($orion_discard_handler)) {
        $orion_discard_handler = new OrionDiscardHandler();
    }
    
    // Run activation through handler
    $orion_discard_handler->activate();
    
    // Log activation
    if (ORION_DISCARD_DEBUG_MODE) {
        error_log('[ORION DISCARD] Plugin activated with version ' . ORION_DISCARD_VERSION);
    }
}

/**
 * Plugin deactivation hook
 */
register_deactivation_hook(__FILE__, 'orion_discard_deactivate');
function orion_discard_deactivate() {
    global $orion_discard_handler;
    
    // Ensure handler exists
    if (isset($orion_discard_handler)) {
        $orion_discard_handler->deactivate();
    }
    
    // Log deactivation
    if (ORION_DISCARD_DEBUG_MODE) {
        error_log('[ORION DISCARD] Plugin deactivated');
    }
}

/**
 * Plugin uninstall hook - cannot use handler here because the plugin is already being uninstalled
 */
register_uninstall_hook(__FILE__, 'orion_discard_uninstall');
function orion_discard_uninstall() {
    global $wpdb;

    // Remove custom tables if any
    $table_name = $wpdb->prefix . 'orion_discards';
    $wpdb->query("DROP TABLE IF EXISTS $table_name");
    
    // Remove plugin options
    delete_option('orion_discard_version');
    delete_option('orion_discard_default_site');
    delete_option('orion_discard_default_year');
    
    // Remove user meta
    $wpdb->delete($wpdb->usermeta, array('meta_key' => 'orion_discard_site'));
    $wpdb->delete($wpdb->usermeta, array('meta_key' => 'orion_discard_year'));
    
    // Log uninstall
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('[ORION DISCARD] Plugin uninstalled and data cleaned');
    }
}

/**
 * Helper function to get handler instance
 * 
 * @return OrionDiscardHandler|null
 */
function orion_discard_get_handler() {
    global $orion_discard_handler;
    return $orion_discard_handler;
}

