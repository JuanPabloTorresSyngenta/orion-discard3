<?php

/**
 * Orion Discard Plugin Bootstrapper
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Initialize the refactored plugin architecture
 */
function orion_discard_init_refactored_system()
{
    // Check if the new system classes are already loaded
    if (class_exists('OrionDiscard_Core_Plugin')) {
        return; // Already initialized
    }

    // Get plugin constants
    $plugin_path = defined('ORION_DISCARD_PLUGIN_PATH') ? ORION_DISCARD_PLUGIN_PATH : plugin_dir_path(__FILE__);
    
    // Load the new core system
    require_once $plugin_path . 'includes/Utils/SecurityHelper.php';
    require_once $plugin_path . 'includes/Core/Plugin.php';
    require_once $plugin_path . 'includes/Core/Assets.php';
    require_once $plugin_path . 'includes/Core/Ajax.php';
    require_once $plugin_path . 'includes/UI/Shortcode.php';
    require_once $plugin_path . 'includes/Data/PostHandler.php';
    require_once $plugin_path . 'includes/Data/BarcodeValidator.php';
    
    // Load the handler
    require_once $plugin_path . 'includes/handlers/OrionDiscardHandler_Refactored.php';
    
    // Initialize the plugin core
    OrionDiscard_Core_Plugin::get_instance();
}
