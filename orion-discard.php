<?php

/** 
 * Plugin Name: Orion Discard
 * Plugin URI: https://example.com
 * Description: Plugin base generado automaticamente
 * Version: 1.0.0
 * Author: Juan P. Torres
 * Text Domain: orion-discard
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ORION_DISCARD_VERSION', '1.0.0');

define('ORION_DISCARD_PLUGIN_URL', plugin_dir_url(__FILE__));

define('ORION_DISCARD_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Include the main plugin class
require_once ORION_DISCARD_PLUGIN_PATH . 'includes/handlers/OrionDiscardHandler.php';

// Initialize the plugin
function orion_discard_init() {

    global $orion_discard_handler;

    $orion_discard_handler = new OrionDiscardHandler();
}
add_action('plugins_loaded', 'orion_discard_init');

// Plugin activation hook
register_activation_hook(__FILE__, 'orion_discard_activate');
function orion_discard_activate() {

    global $orion_discard_handler;

    if (isset($orion_discard_handler)) {

        $orion_discard_handler->activate();
    }
}

// Plugin deactivation hook
register_deactivation_hook(__FILE__, 'orion_discard_deactivate');
function orion_discard_deactivate() {
    
    global $orion_discard_handler;

    if (isset($orion_discard_handler)) {

        $orion_discard_handler->deactivate();

    }
}

// Uninstall hook
register_uninstall_hook(__FILE__, 'orion_discard_uninstall');
function orion_discard_uninstall() {
    // Clean up database tables and options on uninstall
    global $wpdb;

    $table_name = $wpdb->prefix . 'orion_discards';

    $wpdb->query("DROP TABLE IF EXISTS $table_name");
}


