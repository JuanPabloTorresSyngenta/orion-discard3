<?php

/**
 * The main plugin class for Orion Discard Material System
 *
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscardHandler
{
    public function __construct()
    {
        add_action('init', array($this, 'init'));
    }

    public function init()
    {
        // Load text domain for internationalization
        load_plugin_textdomain('orion-discard', false, dirname(plugin_basename(__FILE__)) . '/languages');

        // Register shortcode
        add_shortcode('orionDiscardForm', array($this, 'render_form_shortcode'));

        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // Register AJAX handlers - ONLY DECLARED ONCE
        add_action('wp_ajax_submit_discard', array($this, 'handle_submit_discard'));
        add_action('wp_ajax_nopriv_submit_discard', array($this, 'handle_submit_discard'));

        add_action('wp_ajax_get_discards', array($this, 'handle_get_discards'));
        add_action('wp_ajax_nopriv_get_discards', array($this, 'handle_get_discards'));

        add_action('wp_ajax_check_duplicate_barcd', array($this, 'handle_check_duplicate_barcd'));
        add_action('wp_ajax_nopriv_check_duplicate_barcd', array($this, 'handle_check_duplicate_barcd'));

        // add_action('wp_ajax_get_csv_data', array($this, 'handle_get_csv_data'));
        // add_action('wp_ajax_nopriv_get_csv_data', array($this, 'handle_get_csv_data'));

        add_action('wp_ajax_get_data_from_vForm_recordType', array($this, 'handle_get_data_from_vForm_recordType'));
        add_action('wp_ajax_nopriv_get_data_from_vForm_recordType', array($this, 'handle_get_data_from_vForm_recordType'));
    }

    public function activate()
    {
        $this->create_database_tables();
    }

    public function deactivate()
    {
        // Cleanup tasks if needed
    }

    /**
     * Renders the shortcode for the discard form
     */
    public function render_form_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'id' => '353876'
        ), $atts);

        // Start output buffering
        ob_start();
?>
        <div id="orion-discard-form-<?php echo esc_attr($atts['id']); ?>" class="wrap orion-discard-admin-form">
            <h1 class="wp-heading-inline"><?php _e('Formulario de Descarte de Material de Soya', 'orion-discard'); ?></h1>

            <!-- Shortcode for the control dropdowns -->
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

        <!-- Modal para código duplicado -->
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

    /**
     * CORRECTED: Proper script loading order for frontend
     */
    public function enqueue_assets()
    {
        // Only load on pages with the shortcode
        global $post;
        if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'orionDiscardForm')) {
            return;
        }

        // Enqueue DataTables first
        wp_enqueue_style('datatables-css', 'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css', array(), '1.11.5');
        wp_enqueue_script('datatables-js', 'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js', array('jquery'), '1.11.5', true);

        // Plugin styles
        wp_enqueue_style('orion-discard-style', ORION_DISCARD_PLUGIN_URL . 'assets/css/style.css', array(), ORION_DISCARD_VERSION);

        // CRITICAL: Correct dependency order
        // 1. AJAX handler first
        wp_enqueue_script(
            'orion-discard-ajax',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/ajax.js',
            array('jquery'),
            ORION_DISCARD_VERSION,
            true
        );

        // 2. CSV handler second
        wp_enqueue_script(
            'orion-csv-handler',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/csv-handler.js',
            array('jquery', 'orion-discard-ajax'),
            ORION_DISCARD_VERSION,
            true
        );

        // 3. Main app script last
        wp_enqueue_script(
            'orion-discard-script',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js',
            array('jquery', 'datatables-js', 'orion-discard-ajax', 'orion-csv-handler'),
            ORION_DISCARD_VERSION,
            true
        );

        // Get user data
        $user_id = get_current_user_id();
        $site = get_user_meta($user_id, 'site', true);
        $year = get_user_meta($user_id, 'year', true);

        // Localize script
        wp_localize_script('orion-discard-ajax', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA',
            'year' => $year ? $year : date('Y')
        ));
    }

    /**
     * CORRECTED: Admin assets with same proper order
     */
    public function enqueue_admin_assets()
    {
        $user_id = get_current_user_id();
        $site = get_user_meta($user_id, 'site', true);
        $year = get_user_meta($user_id, 'year', true);

        // DataTables
        wp_enqueue_style('datatables-css', 'https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css', array(), '1.11.5');
        wp_enqueue_script('datatables-js', 'https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js', array('jquery'), '1.11.5', true);

        // Plugin styles
        wp_enqueue_style('orion-discard-style', ORION_DISCARD_PLUGIN_URL . 'assets/css/style.css', array(), ORION_DISCARD_VERSION);

        // Same order as frontend
        wp_enqueue_script('orion-discard-ajax', ORION_DISCARD_PLUGIN_URL . 'assets/js/ajax.js', array('jquery'), ORION_DISCARD_VERSION, true);
        wp_enqueue_script('orion-discard-script-csv', ORION_DISCARD_PLUGIN_URL . 'assets/js/csv-handler.js', array('jquery', 'datatables-js', 'orion-discard-ajax'), ORION_DISCARD_VERSION, true);
        wp_enqueue_script('orion-discard-script', ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js', array('jquery', 'datatables-js', 'orion-discard-ajax', 'orion-discard-script-csv'), ORION_DISCARD_VERSION, true);

        wp_localize_script('orion-discard-ajax', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA',
            'year' => $year ? $year : date('Y')
        ));
    }

    /**
     * Create database tables on activation
     */
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
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {
            wp_send_json_error('Nonce verification failed');
            return;
        }

        // Get current user
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error('User not authenticated');
            return;
        }

        // Sanitize input data
        $farm_id = sanitize_text_field($_POST['farm_id'] ?? '');
        $farm_name = sanitize_text_field($_POST['farm_name'] ?? '');
        $section_id = sanitize_text_field($_POST['section_id'] ?? '');
        $section_name = sanitize_text_field($_POST['section_name'] ?? '');
        $field_id = sanitize_text_field($_POST['field_id'] ?? '');
        $field_name = sanitize_text_field($_POST['field_name'] ?? '');
        $scanned_code = sanitize_text_field($_POST['scanned_code'] ?? '');

        // Validate required fields
        if (empty($farm_id) || empty($section_id) || empty($field_id) || empty($scanned_code)) {
            wp_send_json_error('Missing required fields');
            return;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'orion_discards';

        // Check for duplicate barcode
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table_name WHERE barcd = %s",
            $scanned_code
        ));

        if ($existing) {
            wp_send_json_error('Barcode already discarded');
            return;
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
                'barcd' => $scanned_code,
                'is_discarded' => 1,
                'user_id' => $user_id,
                'created_at' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s')
        );

        if ($result === false) {
            wp_send_json_error('Database error: ' . $wpdb->last_error);
            return;
        }

        wp_send_json_success(array(
            'message' => 'Discard record created successfully',
            'id' => $wpdb->insert_id
        ));
    }

    /**
     * Handle get discards AJAX request
     */
    public function handle_get_discards()
    {
        // Verify nonce
        if (!isset($_GET['nonce']) || !wp_verify_nonce($_GET['nonce'], 'orion_discard_nonce')) {
            wp_send_json_error('Nonce verification failed');
            return;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'orion_discards';

        // Get all discard records
        $discards = $wpdb->get_results(
            "SELECT * FROM $table_name ORDER BY created_at DESC",
            ARRAY_A
        );

        if ($wpdb->last_error) {
            wp_send_json_error('Database error: ' . $wpdb->last_error);
            return;
        }

        wp_send_json_success(array(
            'data' => $discards,
            'total' => count($discards)
        ));
    }

    /**
     * Handle check duplicate barcode AJAX request
     */
    public function handle_check_duplicate_barcd()
    {
        // Verify nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'orion_discard_nonce')) {
            wp_send_json_error('Nonce verification failed');
            return;
        }

        $barcode = sanitize_text_field($_POST['barcode'] ?? '');

        if (empty($barcode)) {
            wp_send_json_error('Barcode is required');
            return;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'orion_discards';

        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE barcd = %s",
            $barcode
        ), ARRAY_A);

        wp_send_json_success(array(
            'exists' => !empty($existing),
            'data' => $existing
        ));
    }

    /**
     * Handle get CSV data AJAX request
     */
    // public function handle_get_csv_data()
    // {
    //     // Verify nonce
    //     if (!isset($_GET['nonce']) || !wp_verify_nonce($_GET['nonce'], 'orion_discard_nonce')) {
    //         wp_send_json_error('Nonce verification failed');
    //         return;
    //     }

    //     $farm_id = sanitize_text_field($_GET['farm_id'] ?? '');
    //     $section_id = sanitize_text_field($_GET['section_id'] ?? '');
    //     $field_id = sanitize_text_field($_GET['field_id'] ?? '');
    //     $site = sanitize_text_field($_GET['site'] ?? 'PRSA');

    //     if (empty($farm_id) || empty($section_id) || empty($field_id)) {
    //         wp_send_json_error('Missing required parameters');
    //         return;
    //     }

    //     // Build CSV URL
    //     $csv_url = $this->build_csv_url($farm_id, $section_id, $field_id, $site);

    //     // Download CSV content
    //     $csv_content = $this->download_csv_content($csv_url);

    //     if ($csv_content === false) {
    //         wp_send_json_error('Failed to download CSV data');
    //         return;
    //     }

    //     wp_send_json_success(array(
    //         'csv_content' => $csv_content,
    //         'csv_url' => $csv_url
    //     ));
    // }

    /**
     * Handle get data from vForm record type AJAX request
     */
    public function handle_get_data_from_vForm_recordType()
    {
        // ✅ CORRECCIÓN: Usar $_POST en lugar de $_GET
        // ✅ CORRECCIÓN: Buscar '_ajax_nonce' en lugar de 'nonce'
        if (!isset($_POST['_ajax_nonce']) || !wp_verify_nonce($_POST['_ajax_nonce'], 'orion_discard_nonce')) {

            error_log('❌ Nonce verification failed. Received: ' . ($_POST['_ajax_nonce'] ?? 'null'));

            wp_send_json_error('Invalid nonce');

            return;
        }

        // ✅ CORRECCIÓN: Cambiar $_GET por $_POST
        $site = sanitize_text_field($_POST['vdata_site'] ?? '');

        $year = sanitize_text_field($_POST['vdata_year'] ?? '');

        $form_type = sanitize_text_field($_POST['vform_record_type'] ?? '');

        // $field_selected = sanitize_text_field($_POST['fieldId'] ?? '');

         $field_selected = 'AB-RA';

        // Log para debugging
        error_log('📊 CSV Request Parameters: ' . json_encode([
            'site' => $site,
            'year' => $year, 
            'form_type' => $form_type,
            'field_selected' => $field_selected
        ]));

        if (empty($site) || empty($year) || empty($form_type) || empty($field_selected)) {
            
            wp_send_json_error('Missing required parameters');

            return;
        }

        // Query posts
        $posts = get_posts(array(
            'post_type' => 'vdata',
            'posts_per_page' => -1,
            'meta_query' => array(
                'relation' => 'AND',
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

        error_log('📊 Found posts: ' . count($posts));

        if (empty($posts)) {

            wp_send_json_error('No data found');

            return;
        }

        // Process posts
        $csv_data = array();

        $csv_headers = array();

        error_log('📊 Found posts: ' . json_encode($posts));

        $processed_count = 0;
        $filtered_count = 0;

     foreach ($posts as $post) {
        $processed_count++;
        
        // Decodificar contenido JSON
        $post_content = json_decode($post->post_content, true);

        error_log('📊 Found post content: ' . json_encode($post_content));

        if (!is_array($post_content)) {
            error_log("⚠️ Post ID {$post->ID}: Invalid JSON content");
            continue;
        }

        // Log del contenido para debugging (solo primeros 3 posts)
        if ($processed_count <= 3) {
            error_log("📋 Post ID {$post->ID} content: " . json_encode($post_content));
        }
        
        // Verificar si el campo coincide
        if (isset($post_content['field']) && $post_content['field'] == $field_selected) {
            $filtered_count++;
            $csv_data[] = $post_content;
            $csv_headers = array_unique(array_merge($csv_headers, array_keys($post_content)));
            
            // Log de coincidencia encontrada
            if ($filtered_count <= 5) {
                error_log("✅ Match found - Post ID {$post->ID}: field='{$post_content['field']}', barcd='{$post_content['barcd']}'");
            }
        } else {
            // Log de por qué no coincide (solo primeros 3)
            if ($processed_count <= 3) {
                $actual_field = $post_content['field'] ?? 'NOT_SET';
                error_log("❌ Post ID {$post->ID}: field mismatch - expected: '{$field_selected}', actual: '{$actual_field}'");
            }
        }
    }

        error_log("📊 Processing summary: {$processed_count} posts processed, {$filtered_count} matches found for field '{$field_selected}'");

    if (empty($csv_data)) {

        error_log("❌ No data found for field: {$field_selected}");

        wp_send_json_error('No data found for field');

        return;
    }

    // ✅ Generar CSV con headers ordenados
    sort($csv_headers); // Ordenar headers alfabéticamente
    // $csv_content = $this->array_to_csv($csv_data, $csv_headers);

    error_log("✅ CSV generated successfully: {$filtered_count} records, " . count($csv_headers) . " columns");

    wp_send_json_success(array(
        'csv_content' => $csv_data,
        'total_records' => $filtered_count,
        'field_id' => $field_selected,
        'headers' => $csv_headers,
        'processed_posts' => $processed_count
    ));
    }

    /**
     * Build CSV URL
     */
    private function build_csv_url($farm_id, $section_id, $field_id, $site)
    {
        $base_url = 'https://example.com/api/csv';
        $params = array(
            'farm_id' => $farm_id,
            'section_id' => $section_id,
            'field_id' => $field_id,
            'site' => $site
        );

        return $base_url . '?' . http_build_query($params);
    }

    /**
     * Download CSV content
     */
    private function download_csv_content($url)
    {
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array(
                'Accept' => 'text/csv'
            )
        ));

        if (is_wp_error($response)) {
            return false;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            return false;
        }

        return wp_remote_retrieve_body($response);
    }



  
}
