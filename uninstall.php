<?php
/**
 * Orion Discard Plugin Uninstall
 * 
 * This file runs when the plugin is uninstalled (deleted).
 */

// Prevent direct access
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Remove database tables
global $wpdb;

// $table_name = $wpdb->prefix . 'orion_discards';
// $wpdb->query("DROP TABLE IF EXISTS $table_name");

// Remove any plugin options (if we had any)
// delete_option('orion_discard_option_name');

// Clear any cached data
wp_cache_flush();