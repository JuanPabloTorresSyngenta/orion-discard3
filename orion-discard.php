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

// Main plugin class
class OrionDiscardPlugin {
    
    public function __construct() {
        add_action('init', array($this, 'init'));

        register_activation_hook(__FILE__, array($this, 'activate'));

        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // Load text domain for internationalization
        load_plugin_textdomain('orion-discard', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Register shortcode
        add_shortcode('vform', array($this, 'render_form_shortcode'));
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue scripts and styles for frontend and admin
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        
        // Register AJAX handlers
        add_action('wp_ajax_submit_discard', array($this, 'handle_submit_discard'));
        add_action('wp_ajax_nopriv_submit_discard', array($this, 'handle_submit_discard'));
        add_action('wp_ajax_get_discards', array($this, 'handle_get_discards'));
        add_action('wp_ajax_nopriv_get_discards', array($this, 'handle_get_discards'));
        add_action('wp_ajax_check_duplicate_barcd', array($this, 'handle_check_duplicate_barcd'));
        add_action('wp_ajax_nopriv_check_duplicate_barcd', array($this, 'handle_check_duplicate_barcd'));
    }
    
    public function activate() {
        // Create database tables on activation
        $this->create_database_tables();
    }
    
    public function deactivate() {
        // Cleanup tasks on deactivation (if needed)
    }
    
    public function render_form_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '353876'
        ), $atts);
        
        // Force load admin assets when shortcode is used
        $this->enqueue_admin_assets();
        
        // Redirect to admin form
        $admin_url = admin_url('admin.php?page=orion-discard-form&form_id=' . $atts['id']);
        
        // Return a message with link to admin form
        ob_start();
        ?>
        <div class="orion-shortcode-redirect">
            <div class="notice notice-info">
                <p><?php _e('Para acceder al formulario de descarte, por favor utilice el área de administración:', 'orion-discard'); ?></p>
                <p>
                    <a href="<?php echo esc_url($admin_url); ?>" class="button button-primary">
                        <?php _e('Ir al Formulario de Descarte', 'orion-discard'); ?>
                    </a>
                </p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function enqueue_assets() {
        // Enqueue DataTables CSS and JS
        wp_enqueue_style('datatables-css', 'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css');
       
        wp_enqueue_script('datatables-js', 'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js', array('jquery'), '1.11.5', true);
        
        // Enqueue plugin styles and scripts
        wp_enqueue_style('orion-discard-style', ORION_DISCARD_PLUGIN_URL . 'assets/css/style.css', array(), ORION_DISCARD_VERSION);
      
        wp_enqueue_script('orion-discard-script', ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js', array('jquery', 'datatables-js'), ORION_DISCARD_VERSION, true);
        
        // Get current user site
        $user_id = get_current_user_id();

        $site = get_user_meta($user_id, 'site', true);
        
        // Localize script for AJAX
        wp_localize_script('orion-discard-script', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA' // Default to PRSA if no site is set
        ));
    }
    
    public function enqueue_admin_assets() {
        // Get current user site
        $user_id = get_current_user_id();

        $site = get_user_meta($user_id, 'site', true);
        
        // Enqueue DataTables CSS and JS for admin
        wp_enqueue_style('datatables-css', 'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css');

        wp_enqueue_script('datatables-js', 'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js', array('jquery'), '1.11.5', true);
        
        // Enqueue plugin styles and scripts for admin
        wp_enqueue_style('orion-discard-style', ORION_DISCARD_PLUGIN_URL . 'assets/css/style.css', array(), ORION_DISCARD_VERSION);
        
        wp_enqueue_script('orion-discard-script', ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js', array('jquery', 'datatables-js'), ORION_DISCARD_VERSION, true);
        
        // Localize script for AJAX in admin
        wp_localize_script('orion-discard-script', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA' // Default to PRSA if no site is set
        ));
    }
    
    private function create_database_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'orion_discards';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            farm_id varchar(20) NOT NULL,
            farm_name varchar(255) NOT NULL,
            section_id varchar(20) NOT NULL,
            section_name varchar(255) NOT NULL,
            field_id varchar(20) NOT NULL,
            field_name varchar(255) NOT NULL,
            scanned_code varchar(255) NOT NULL,
            crop varchar(255) DEFAULT '',
            owner varchar(255) DEFAULT '',
            submission_id varchar(255) DEFAULT '',
            field varchar(255) DEFAULT '',
            extno varchar(255) DEFAULT '',
            range_val varchar(255) DEFAULT '',
            row_val varchar(255) DEFAULT '',
            barcd varchar(255) NOT NULL,
            plot_id varchar(255) DEFAULT '',
            subplot_id varchar(255) DEFAULT '',
            matid varchar(255) DEFAULT '',
            abbrc varchar(255) DEFAULT '',
            sd_instruction text DEFAULT '',
            vform_record_type varchar(255) DEFAULT '',
            vdata_site varchar(255) DEFAULT '',
            vdata_year varchar(20) DEFAULT '',
            is_discarded tinyint(1) DEFAULT 0,
            user_id bigint(20) unsigned NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_barcd (barcd)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Handle submit discard AJAX request
     */
    public function handle_submit_discard() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error('Usuario no autenticado');
        }
        
        // Sanitize input data
        $farm_id = sanitize_text_field($_POST['farm_id']);

        $farm_name = sanitize_text_field($_POST['farm_name']);

        $section_id = sanitize_text_field($_POST['section_id']);

        $section_name = sanitize_text_field($_POST['section_name']);

        $field_id = sanitize_text_field($_POST['field_id']);

        $field_name = sanitize_text_field($_POST['field_name']);

        $scanned_code = sanitize_text_field($_POST['scanned_code']);
        
        // Sanitize new fields
        $crop = sanitize_text_field($_POST['crop'] ?? '');

        $owner = sanitize_text_field($_POST['owner'] ?? '');

        $submission_id = sanitize_text_field($_POST['submission_id'] ?? '');

        $field = sanitize_text_field($_POST['field'] ?? '');

        $extno = sanitize_text_field($_POST['extno'] ?? '');

        $range_val = sanitize_text_field($_POST['range_val'] ?? '');

        $row_val = sanitize_text_field($_POST['row_val'] ?? '');

        $barcd = sanitize_text_field($_POST['barcd'] ?? $scanned_code);

        $plot_id = sanitize_text_field($_POST['plot_id'] ?? '');

        $subplot_id = sanitize_text_field($_POST['subplot_id'] ?? '');

        $matid = sanitize_text_field($_POST['matid'] ?? '');

        $abbrc = sanitize_text_field($_POST['abbrc'] ?? '');

        $sd_instruction = sanitize_textarea_field($_POST['sd_instruction'] ?? '');

        $vform_record_type = sanitize_text_field($_POST['vform_record_type'] ?? '');

        $vdata_site = sanitize_text_field($_POST['vdata_site'] ?? '');

        $vdata_year = sanitize_text_field($_POST['vdata_year'] ?? '');
        
        // Validate required fields
        if (empty($farm_id) || empty($section_id) || empty($field_id) || empty($scanned_code)) {
            wp_send_json_error('Todos los campos son requeridos');
        }
        
        global $wpdb;

        $table_name = $wpdb->prefix . 'orion_discards';
        
        // Check if BARCD already exists and is discarded
        $existing_record = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE barcd = %s AND is_discarded = 1",
            $barcd
        ));
        
        if ($existing_record) {
            wp_send_json_error(array(
                'message' => 'Código ya descartado',
                'barcode' => $barcd,
                'duplicate' => true
            ));
        }
        
        // Insert new discard record
        $result = $wpdb->insert(
            $table_name,
            array(
                'farm_id' => $farm_id,
                'farm_name' => $farm_name,
                'section_id' => $section_id,
                'section_name' => $section_name,
                'field_id' => $field_id,
                'field_name' => $field_name,
                'scanned_code' => $scanned_code,
                'crop' => $crop,
                'owner' => $owner,
                'submission_id' => $submission_id,
                'field' => $field,
                'extno' => $extno,
                'range_val' => $range_val,
                'row_val' => $row_val,
                'barcd' => $barcd,
                'plot_id' => $plot_id,
                'subplot_id' => $subplot_id,
                'matid' => $matid,
                'abbrc' => $abbrc,
                'sd_instruction' => $sd_instruction,
                'vform_record_type' => $vform_record_type,
                'vdata_site' => $vdata_site,
                'vdata_year' => $vdata_year,
                'is_discarded' => 1,
                'user_id' => get_current_user_id(),
                'created_at' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s')
        );
        
        if ($result !== false) {
            wp_send_json_success('Descarte registrado exitosamente');
        } else {
            wp_send_json_error('Error al guardar en la base de datos');
        }
    }
    
    /**
     * Handle get discards AJAX request
     */
    public function handle_get_discards() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {
            wp_die('Security check failed');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'orion_discards';
        
        // Get current user's site
        $user_id = get_current_user_id();

        $user_site = get_user_meta($user_id, 'site', true);
        
        // Query discards (you might want to filter by user or site)
        $results = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC", ARRAY_A );
        
        // Format the data for DataTables
        $formatted_data = array();
        
        foreach ($results as $row) {

            $status_icon = $row['is_discarded'] ? '✓' : '✗';

            $formatted_data[] = array(
                'status' => $status_icon,
                'crop' => $row['crop'],
                'owner' => $row['owner'],
                'submission_id' => $row['submission_id'],
                'field' => $row['field'],
                'extno' => $row['extno'],
                'range_val' => $row['range_val'],
                'row_val' => $row['row_val'],
                'barcd' => $row['barcd'],
                'plot_id' => $row['plot_id'],
                'subplot_id' => $row['subplot_id'],
                'matid' => $row['matid'],
                'abbrc' => $row['abbrc'],
                'sd_instruction' => $row['sd_instruction'],
                'vform_record_type' => $row['vform_record_type'],
                'vdata_site' => $row['vdata_site'],
                'vdata_year' => $row['vdata_year']
            );
        }
        
        wp_send_json_success($formatted_data);
    }

    /**
     * Handle check duplicate barcode AJAX request
     */
    public function handle_check_duplicate_barcd() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }

        $barcode = sanitize_text_field($_POST['barcode']);
        
        if (empty($barcode)) {
            wp_send_json_error('Barcode is required');

            return;
        }

        global $wpdb;

        $table_name = $wpdb->prefix . 'orion_discards';
        
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE barcd = %s",
            $barcode
        ));

        wp_send_json_success(array('exists' => $exists > 0));
    }
}

// Initialize the plugin
new OrionDiscardPlugin(); 
