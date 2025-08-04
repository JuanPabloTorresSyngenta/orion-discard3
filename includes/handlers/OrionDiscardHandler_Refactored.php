<?php

/**
 * Orion Discard Handler - Refactored Main Class
 * 
 * This is the main handler class using the new refactored architecture.
 * This replaces the original OrionDiscardHandler with a clean, organized structure.
 * 
 * @package OrionDiscard
 * @since 1.0.1
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main plugin handler using refactored architecture
 */
class OrionDiscardHandler
{
    /**
     * Plugin core instance
     * 
     * @var OrionDiscard_Core_Plugin
     */
    private $plugin_core;

    /**
     * Constructor
     */
    public function __construct()
    {
        // Initialize the plugin core (Singleton pattern)
        $this->plugin_core = OrionDiscard_Core_Plugin::get_instance();
        
        // Register hooks
        add_action('init', array($this, 'init'));
    }

    /**
     * Initialize the plugin
     */
    public function init()
    {
        // Register shortcode through the UI component
        add_shortcode('orionDiscardForm', array($this, 'render_form_shortcode'));

        // Enqueue assets through the Assets component
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // Register AJAX handlers through the Ajax component
        add_action('wp_ajax_get_data_from_vForm_recordType', array($this, 'handle_get_data_from_vForm_recordType'));                
        add_action('wp_ajax_get_data_from_vForm_recordType_To_ValidateBarCode', array($this, 'handle_get_data_from_vForm_recordType_To_ValidateBarCode'));
        add_action('wp_ajax_updated_MaterialDiscard', array($this, 'handle_updated_MaterialDiscard'));
    }

    /**
     * Plugin activation
     */
    public function activate()
    {
        $this->plugin_core->activate();
        $this->setup_default_options();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate()
    {
        $this->plugin_core->deactivate();
    }

    /**
     * Render form shortcode using UI component
     */
    public function render_form_shortcode($atts)
    {
        $shortcode_component = $this->plugin_core->get_component('shortcode');
        
        if ($shortcode_component) {
            return $shortcode_component->render_form_shortcode($atts);
        }
        
        // Fallback if component not available
        return '<div class="orion-error">Shortcode component not available. Please check plugin configuration.</div>';
    }

    /**
     * Enqueue frontend assets using Assets component
     */
    public function enqueue_assets()
    {
        $assets_component = $this->plugin_core->get_component('assets');
        
        if ($assets_component) {
            $assets_component->enqueue_frontend_assets();
        }
    }

    /**
     * Enqueue admin assets using Assets component
     */
    public function enqueue_admin_assets($hook_suffix)
    {
        $assets_component = $this->plugin_core->get_component('assets');
        
        if ($assets_component) {
            $assets_component->enqueue_admin_assets($hook_suffix);
        }
    }

    /**
     * Handle get data from vForm using Ajax component
     */
    public function handle_get_data_from_vForm_recordType()
    {
        $ajax_component = $this->plugin_core->get_component('ajax');
        
        if ($ajax_component) {
            $ajax_component->handle_get_data_from_vForm_recordType();
        } else {
            wp_send_json_error('Ajax component not available');
        }
    }

    /**
     * Handle barcode validation using Ajax component
     */
    public function handle_get_data_from_vForm_recordType_To_ValidateBarCode()
    {
        $ajax_component = $this->plugin_core->get_component('ajax');
        if ($ajax_component) {
            // Usar el método original y funcional para validar y actualizar barcode
            $ajax_component->handle_get_data_from_vForm_recordType_To_ValidateBarCode();
        } else {
            wp_send_json_error('Ajax component not available');
        }
    }

    /**
     * Handle material discard update using Ajax component
     */
    public function handle_updated_MaterialDiscard()
    {
        $ajax_component = $this->plugin_core->get_component('ajax');
        
        if ($ajax_component) {
            $ajax_component->handle_updated_material_discard();
        } else {
            wp_send_json_error('Ajax component not available');
        }
    }

    /**
     * Get plugin component (public access)
     */
    public function get_component($component)
    {
        return $this->plugin_core->get_component($component);
    }

    /**
     * Get plugin core instance (public access)
     */
    public function get_plugin_core()
    {
        return $this->plugin_core;
    }

    /**
     * Setup default options during activation
     */
    private function setup_default_options()
    {
        // Set default options if they don't exist
        if (false === get_option('orion_discard_default_site')) {
            add_option('orion_discard_default_site', 'PRSA');
        }
        
        if (false === get_option('orion_discard_default_year')) {
            add_option('orion_discard_default_year', date('Y'));
        }
    }
}
