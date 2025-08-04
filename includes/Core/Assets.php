<?php

/**
 * Assets Management Class
 * 
 * Handles all CSS and JavaScript loading for the plugin.
 * Ensures proper dependency order and conditional loading.
 * 
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Core_Assets
{
    /**
     * Plugin instance
     * 
     * @var OrionDiscard_Core_Plugin
     */
    private $plugin;

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->plugin = OrionDiscard_Core_Plugin::get_instance();
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks()
    {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
    }

    /**
     * Enqueue frontend assets (for shortcode pages)
     */
    public function enqueue_frontend_assets()
    {
        // Only load on pages with the shortcode
        if (!$this->should_load_assets()) {
            return;
        }

        $this->load_external_dependencies();
        $this->load_plugin_styles();
        $this->load_plugin_scripts();
        $this->localize_scripts();
    }

    /**
     * Enqueue admin assets (for admin pages with shortcode)
     */
    public function enqueue_admin_assets($hook_suffix)
    {
        // Security: Only load scripts on specific plugin pages or shortcode pages
        if (!$this->should_load_admin_assets($hook_suffix)) {
            return;
        }

        $this->load_external_dependencies();
        $this->load_plugin_styles();
        $this->load_plugin_scripts();
        $this->localize_scripts();
    }

    /**
     * Check if we should load assets on current page
     * 
     * @return bool
     */
    private function should_load_assets()
    {
        global $post;

        if (!is_a($post, 'WP_Post')) {
            return false;
        }

        return has_shortcode($post->post_content, 'orionDiscardForm');
    }

    /**
     * Check if we should load admin assets
     * 
     * @param string $hook_suffix Current admin page hook
     * @return bool
     */
    private function should_load_admin_assets($hook_suffix)
    {
        $allowed_pages = array(
            'toplevel_page_orion-discard',
            'orion-discard_page_settings',
            'post.php',
            'post-new.php'
        );

        if (!in_array($hook_suffix, $allowed_pages)) {
            return false;
        }

        // For post edit pages, check if shortcode is present
        if (in_array($hook_suffix, array('post.php', 'post-new.php'))) {
            global $post;
            if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'orionDiscardForm')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Load external dependencies (DataTables, etc.)
     */
    private function load_external_dependencies()
    {
        // DataTables CSS
        wp_enqueue_style(
            'datatables-css',
            'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css',
            array(),
            '1.11.5'
        );

        // DataTables JavaScript
        wp_enqueue_script(
            'datatables-js',
            'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js',
            array('jquery'),
            '1.11.5',
            true
        );
    }

    /**
     * Load plugin stylesheets
     */
    private function load_plugin_styles()
    {
        wp_enqueue_style(
            'orion-discard-style',
            $this->plugin->get_plugin_url() . 'assets/css/style.css',
            array(),
            $this->plugin->get_version()
        );
    }

    /**
     * Load plugin scripts in correct dependency order
     */
    private function load_plugin_scripts()
    {
        $plugin_url = $this->plugin->get_plugin_url();
        $version = $this->plugin->get_version();

        // 1. AJAX handler (base dependency)
        wp_enqueue_script(
            'orion-discard-ajax',
            $plugin_url . 'assets/js/ajax.js',
            array('jquery'),
            $version,
            true
        );

        // 2. Table manager (depends on DataTables and AJAX)
        wp_enqueue_script(
            'orion-discards-table-manager',
            $plugin_url . 'assets/js/discards-table-manager.js',
            array('jquery', 'datatables-js'),
            $version,
            true
        );

        // 3. CSV handler (depends on AJAX and table manager)
        wp_enqueue_script(
            'orion-csv-handler',
            $plugin_url . 'assets/js/csv-handler.js',
            array('jquery', 'orion-discard-ajax', 'orion-discards-table-manager'),
            $version,
            true
        );

        // 4. Factory (depends on AJAX)
        wp_enqueue_script(
            'orion-discard-factory',
            $plugin_url . 'assets/js/Factories/ajax-param-factory.js',
            array('jquery', 'orion-discard-ajax'),
            $version,
            true
        );

        // 5. Main app script (depends on all others)
        wp_enqueue_script(
            'orion-discard-script',
            $plugin_url . 'assets/js/app.js',
            array(
                'jquery',
                'datatables-js',
                'orion-discard-ajax',
                'orion-discards-table-manager',
                'orion-csv-handler',
                'orion-discard-factory'
            ),
            $version,
            true
        );
    }

    /**
     * Localize scripts with necessary data
     */
    private function localize_scripts()
    {
        $user_helper = new OrionDiscard_Utils_UserHelper();
        
        wp_localize_script('orion-discard-ajax', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $user_helper->get_user_site(),
            'year' => $user_helper->get_user_year()
        ));
    }

    /**
     * Get asset URL
     * 
     * @param string $asset Asset path relative to assets directory
     * @return string Full URL to asset
     */
    public function get_asset_url($asset)
    {
        return $this->plugin->get_plugin_url() . 'assets/' . ltrim($asset, '/');
    }
}
