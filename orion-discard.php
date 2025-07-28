<?php

/** 
 * Plugin Name: orion-discard 
 * Description: Plugin base generado automaticamente. 
 * Version: 1.0.0 
 * Author: Juan P. Torres 
 * License: GPL2 
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html 
 * Text Domain: orion-discard 
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ORION_DISCARD_VERSION', '1.0.0');

define('ORION_DISCARD_PLUGIN_URL', plugin_dir_url(__FILE__));

define('ORION_DISCARD_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Load the main plugin class
require_once ORION_DISCARD_PLUGIN_PATH . 'includes/class-orion-discard-handler.php';



// Initialize the plugin
new OrionDiscardHandler();


