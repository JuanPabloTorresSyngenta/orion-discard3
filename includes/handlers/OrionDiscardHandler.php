<?php

/**
 * The main plugin class
 *
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Main plugin class
class OrionDiscardHandler
{

    public function __construct()
    {
        add_action('init', array($this, 'init'));

        register_activation_hook(__FILE__, array($this, 'activate'));

        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    public function init()
    {
        // Load text domain for internationalization
        load_plugin_textdomain('orion-discard', false, dirname(plugin_basename(__FILE__)) . '/languages');

        // Register shortcode
        add_shortcode('orionDiscardForm', array($this, 'render_form_shortcode'));

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

        // Register new AJAX handler for CSV data
        add_action('wp_ajax_get_csv_data', array($this, 'handle_get_csv_data'));

        add_action('wp_ajax_nopriv_get_csv_data', array($this, 'handle_get_csv_data'));

        add_action('wp_ajax_get_data_from_vForm_recordType', array($this, 'handle_get_data_from_vForm_recordType'));
    }

    public function activate()
    {
        // Create database tables on activation
        $this->create_database_tables();
    }

    public function deactivate()
    {
        // Cleanup tasks on deactivation (if needed)
    }

 

    public function render_form_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'id' => '353876'
        ), $atts);
        

        // Enqueue assets for frontend shortcode
        $this->enqueue_assets();

        // Start output buffering
        ob_start();
?>
        <div id="orion-discard-form-<?php echo esc_attr($atts['id']); ?>" class="wrap orion-discard-admin-form">

            <h1 class="wp-heading-inline"><?php _e('Formulario de Descarte de Material de Soya', 'orion-discard'); ?></h1>
            
            <!-- Shortcode for the controle dropdowns -->
            <?= do_shortcode('[vform id=353876]'); ?>            

            <hr class="wp-header-end">

            <h2><?php _e('Registros de Descarte', 'orion-discard'); ?></h2>

            <div class="tablenav top">

                <div class="alignleft actions">

                    <p class="description"><?php _e('Histórico de descartes registrados en el sistema.', 'orion-discard'); ?></p>

                </div>

            </div>

            <table id="discards-table" class="wp-list-table widefat fixed striped">

                <thead>
                    <tr>
                        <th class="manage-column"><?php _e('Estado', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Crop', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Owner', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Submission ID', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Field', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('EXTNO', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Range', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Row', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('BARCD', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Plot ID', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Subplot ID', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('MATID', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('ABBRC', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('SD Instruction', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Record Type', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Site', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Year', 'orion-discard'); ?></th>
                    </tr>
                </thead>

                <tbody>
                    <!-- Data will be loaded via JavaScript -->
                </tbody>
            </table>

        </div>    

        <!-- Modal para avisar de código duplicado -->
        <div id="duplicate-barcode-modal" class="orion-modal" style="display: none;">
            <div class="orion-modal-content">
                <div class="orion-modal-header">
                    <h3><?php _e('Código ya descartado', 'orion-discard'); ?></h3>
                    <span class="orion-modal-close">&times;</span>
                </div>
                <div class="orion-modal-body">
                    <p><?php _e('El código escaneado ya ha sido descartado anteriormente.', 'orion-discard'); ?></p>
                    <p><strong><?php _e('Código:', 'orion-discard'); ?></strong> <span id="duplicate-code-display"></span></p>
                </div>
                <div class="orion-modal-footer">
                    <button type="button" class="button button-primary" id="modal-close-btn">
                        <?php _e('Entendido', 'orion-discard'); ?>
                    </button>
                </div>
            </div>
        </div>
<?php
        return ob_get_clean();
    }

    public function enqueue_assets()
    {
        // Enqueue DataTables CSS and JS
        wp_enqueue_style('datatables-css', 'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css');

        wp_enqueue_script('datatables-js', 'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js', array('jquery'), '1.11.5', true);

        // Enqueue plugin styles and scripts
        wp_enqueue_style('orion-discard-style', ORION_DISCARD_PLUGIN_URL . 'assets/css/style.css', array(), ORION_DISCARD_VERSION);

        wp_enqueue_script('orion-discard-script', ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js', array('jquery', 'datatables-js'), ORION_DISCARD_VERSION, true);

        // Enqueue CSV handler script
        wp_enqueue_script('orion-csv-handler', ORION_DISCARD_PLUGIN_URL . 'assets/js/csv-handler.js', array('jquery', 'orion-discard-script'), ORION_DISCARD_VERSION, true);


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

    public function enqueue_admin_assets()
    {
        // Get current user site
        $user_id = get_current_user_id();

        $site = get_user_meta($user_id, 'site', true);

        $year = get_user_meta($user_id, 'year', true);

        // Enqueue DataTables CSS and JS for admin
        wp_enqueue_style('datatables-css', 'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css');

        wp_enqueue_script('datatables-js', 'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js', array('jquery'), '1.11.5', true);

        // Enqueue plugin styles and scripts for admin
        wp_enqueue_style('orion-discard-style', ORION_DISCARD_PLUGIN_URL . 'assets/css/style.css', array(), ORION_DISCARD_VERSION);

        wp_enqueue_script('orion-discard-script', ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js', array('jquery', 'datatables-js'), ORION_DISCARD_VERSION, true);

        wp_enqueue_script('orion-discard-script-csv', ORION_DISCARD_PLUGIN_URL . 'assets/js/csv-handler.js', array('jquery', 'datatables-js'), ORION_DISCARD_VERSION, true);

        // Localize script for AJAX in admin
        wp_localize_script('orion-discard-script', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA' // Default to PRSA if no site is set
        ));

           // Localize script for AJAX in admin
        wp_localize_script('orion-discard-script-csv', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA', // Default to PRSA if no site is set
            'year' => $year ? $year : date('Y') // Default to current year if no year is set
        ));
    }

    private function create_database_tables()
    {
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
    public function handle_submit_discard()
    {
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
    public function handle_get_discards()
    {
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
        $results = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC", ARRAY_A);

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
    public function handle_check_duplicate_barcd()
    {
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

    /**
     * Handle get CSV data AJAX request
     */
    public function handle_get_csv_data()
    {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {

            wp_send_json_error('Invalid nonce');

            return;
        }

        // Sanitize input parameters
        $farm_id = sanitize_text_field($_POST['farm_id']);

        $section_id = sanitize_text_field($_POST['section_id']);

        $field_id = sanitize_text_field($_POST['field_id']);

        $site = sanitize_text_field($_POST['site']);

        // Validate required parameters
        if (empty($farm_id) || empty($section_id) || empty($field_id)) {

            wp_send_json_error('Missing required parameters');

            return;
        }

        // Build CSV download URL - replace with your actual CSV endpoint
        $csv_url = $this->build_csv_url($farm_id, $section_id, $field_id, $site);

        // Download CSV content
        $csv_content = $this->download_csv_content($csv_url);

        if ($csv_content === false) {
            wp_send_json_error('Failed to download CSV data');
            return;
        }

        // Return CSV content
        wp_send_json_success(array(
            'csv_content' => $csv_content,
            'url' => $csv_url,
            'parameters' => array(
                'farm_id' => $farm_id,
                'section_id' => $section_id,
                'field_id' => $field_id,
                'site' => $site
            )
        ));
    }

    /**
     * Build CSV download URL based on selections
     */
    private function build_csv_url($farm_id, $section_id, $field_id, $site)
    {
        // Replace this with your actual CSV endpoint URL structure
        $base_url = 'http://192.168.96.84:8080/orion/wp-json/orion-data/v1/csv';

        $params = array(
            'site' => $site,
            'farm' => $farm_id,
            'section' => $section_id,
            'field' => $field_id,
            'format' => 'csv'
        );

        return $base_url . '?' . http_build_query($params);
    }

    /**
     * Download CSV content from remote URL
     */
    private function download_csv_content($url)
    {
        // Use WordPress HTTP API for safe remote requests
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array(
                'Accept' => 'text/csv,application/csv,text/plain'
            )
        ));

        // Check for errors
        if (is_wp_error($response)) {
            error_log('CSV Download Error: ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            error_log('CSV Download Error: HTTP ' . $response_code);
            return false;
        }

        // Get response body (CSV content)
        $csv_content = wp_remote_retrieve_body($response);

        if (empty($csv_content)) {
            error_log('CSV Download Error: Empty response');
            return false;
        }

        return $csv_content;
    }

    private function handle_get_data_from_vForm_recordType()
    {
 // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {

            wp_send_json_error('Invalid nonce');

            return;
        }

          // Sanitize input parameters
        $site = sanitize_text_field($_POST['vdata_site']);

        $year = sanitize_text_field($_POST['vdata_year']);

        $form_type = sanitize_text_field($_POST['vform_record_type']);

        $posts = get_posts(array(
            'post_type' => 'vdata',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => 'vdata-site',
                    'value' => $site,
                    'compare' => '='
                ),
                array(
                    'key' => 'vdata-year',
                    'value' => $year,
                    'compare' => '='
                ),
                array(
                    'key' => 'vform-record-type',
                    'value' => $form_type,
                    'compare' => '='
                )
            )
        ));

        if (empty($posts)) {
            wp_send_json_error('No posts found for the specified criteria');
            return;
        }

        $field_selected = 'C901X2402GA2'; // Replace with the actual field you want to extract

        $data = array_map(function ($posts) use ($field_selected) {
            $post_content = json_decode($posts->post_content, true);
            if ($post_content['field'] == $field_selected) {
                return array(
                    'id' => $posts->ID,
                    'post_content' => $post_content
                );
            }
        }, $posts);

        wp_send_json_success(array(
            'posts' => $data
        ));

        // $posts = array_column($posts, $post->post_content, $post->ID);

        // $posts = array_map(function ($post) {
        //     return json_decode($post->post_content, true);
        // }, $posts);



        wp_send_json_success('success', array('posts' => $posts));
    }
}
