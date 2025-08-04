<?php

/**
 * Main Plugin Core Class
 * 
 * This class handles the initialization and coordination of all plugin components.
 * Follows WordPress plugin architecture best practices.
 * 
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Core_Plugin
{
    /**
     * Plugin instance
     * 
     * @var OrionDiscard_Core_Plugin
     */
    private static $instance = null;

    /**
     * Plugin components
     * 
     * @var array
     */
    private $components = array();

    /**
     * Plugin version
     * 
     * @var string
     */
    private $version;

    /**
     * Plugin URL
     * 
     * @var string
     */
    private $plugin_url;

    /**
     * Plugin path
     * 
     * @var string
     */
    private $plugin_path;

    /**
     * Get plugin instance (Singleton pattern)
     * 
     * @return OrionDiscard_Core_Plugin
     */
    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor - Private to enforce singleton
     */
    private function __construct()
    {
        $this->version = defined('ORION_DISCARD_VERSION') ? ORION_DISCARD_VERSION : '1.0.0';
        $this->plugin_url = defined('ORION_DISCARD_PLUGIN_URL') ? ORION_DISCARD_PLUGIN_URL : plugin_dir_url(__FILE__);
        $this->plugin_path = defined('ORION_DISCARD_PLUGIN_PATH') ? ORION_DISCARD_PLUGIN_PATH : plugin_dir_path(__FILE__);
        
        $this->init_hooks();
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks()
    {
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'load_textdomain'));
    }

    /**
     * Initialize plugin components
     */
    public function init()
    {
        // Load core components
        $this->load_components();
        
        // Initialize components
        $this->init_components();
        
        // Fire action for other plugins to hook into
        do_action('orion_discard_init');
    }

    /**
     * Load plugin text domain for internationalization
     */
    public function load_textdomain()
    {
        load_plugin_textdomain(
            'orion-discard',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages'
        );
    }

    /**
     * Load all plugin components
     */
    private function load_components()
    {
        // Core components
        require_once $this->plugin_path . 'includes/Core/Assets.php';
        require_once $this->plugin_path . 'includes/Core/Ajax.php';
        require_once $this->plugin_path . 'includes/UI/Shortcode.php';
        require_once $this->plugin_path . 'includes/Data/PostHandler.php';
        require_once $this->plugin_path . 'includes/Data/BarcodeValidator.php';
        require_once $this->plugin_path . 'includes/Utils/UserHelper.php';
        require_once $this->plugin_path . 'includes/Utils/SecurityHelper.php';
    }

    /**
     * Initialize plugin components
     */
    private function init_components()
    {
        // Initialize core components
        $this->components['assets'] = new OrionDiscard_Core_Assets();
        $this->components['ajax'] = new OrionDiscard_Core_Ajax();
        $this->components['shortcode'] = new OrionDiscard_UI_Shortcode();
        $this->components['post_handler'] = new OrionDiscard_Data_PostHandler();
        $this->components['barcode_validator'] = new OrionDiscard_Data_BarcodeValidator();
    }

    /**
     * Get component instance
     * 
     * @param string $component Component name
     * @return mixed|null Component instance or null if not found
     */
    public function get_component($component)
    {
        return isset($this->components[$component]) ? $this->components[$component] : null;
    }

    /**
     * Plugin activation
     */
    public function activate()
    {
        // Run activation tasks
        $this->create_database_tables();
        $this->set_default_options();
        
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Fire activation hook
        do_action('orion_discard_activated');
    }

    /**
     * Plugin deactivation
     */
    public function deactivate()
    {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Fire deactivation hook
        do_action('orion_discard_deactivated');
    }

    /**
     * Create database tables if needed
     */
    private function create_database_tables()
    {
        // Future: Create custom tables for better performance
        // For now, we use post meta and post content JSON
    }

    /**
     * Set default plugin options
     */
    private function set_default_options()
    {
        // Set default options
        add_option('orion_discard_version', $this->version);
        add_option('orion_discard_default_site', 'PRSA');
        add_option('orion_discard_default_year', date('Y'));
    }

    /**
     * Get plugin version
     * 
     * @return string
     */
    public function get_version()
    {
        return $this->version;
    }

    /**
     * Get plugin URL
     * 
     * @return string
     */
    public function get_plugin_url()
    {
        return $this->plugin_url;
    }

    /**
     * Get plugin path
     * 
     * @return string
     */
    public function get_plugin_path()
    {
        return $this->plugin_path;
    }
}
