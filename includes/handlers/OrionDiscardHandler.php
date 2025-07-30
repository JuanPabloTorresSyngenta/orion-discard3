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

        add_action('wp_ajax_get_data_from_vForm_recordType', array($this, 'handle_get_data_from_vForm_recordType'));       

        add_action('wp_ajax_updated_MaterialDiscard', array($this, 'handle_updated_MaterialDiscard'));
    
    }

    public function activate()
    {
        // Activation tasks if needed
        // For example, creating custom database tables or options
        // This is a good place to set up initial configurations
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
            <?= do_shortcode('[vform id=' . esc_attr($atts['id']) . ']'); ?>

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
                        <th class="manage-column"><?php _e('Field', 'orion-discard'); ?></th>                      
                        <th class="manage-column"><?php _e('Range', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Row', 'orion-discard'); ?></th>                       
                        <th class="manage-column"><?php _e('Plot ID', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('Subplot ID', 'orion-discard'); ?></th>
                        <th class="manage-column"><?php _e('MATID', 'orion-discard'); ?></th>
                     
                
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

        // 2. Table manager second (needs DataTables)
        wp_enqueue_script(
            'orion-discards-table-manager',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/discards-table-manager.js',
            array('jquery', 'datatables-js'),
            ORION_DISCARD_VERSION,
            true
        );

        // 3. CSV handler third
        wp_enqueue_script(
            'orion-csv-handler',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/csv-handler.js',
            array('jquery', 'orion-discard-ajax', 'orion-discards-table-manager'),
            ORION_DISCARD_VERSION,
            true
        );

        // 4. Factory fourth (before main app)
        wp_enqueue_script(
            'orion-discard-factory',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/Factories/ajax-param-factory.js',
            array('jquery', 'orion-discard-ajax'),
            ORION_DISCARD_VERSION,
            true
        );

        // 5. Main app script last (depends on all others)
        wp_enqueue_script(
            'orion-discard-script',
            ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js',
            array('jquery', 'datatables-js', 'orion-discard-ajax', 'orion-discards-table-manager', 'orion-csv-handler', 'orion-discard-factory'),
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
        wp_enqueue_script('orion-discards-table-manager', ORION_DISCARD_PLUGIN_URL . 'assets/js/discards-table-manager.js', array('jquery', 'datatables-js'), ORION_DISCARD_VERSION, true);
        wp_enqueue_script('orion-discard-script-csv', ORION_DISCARD_PLUGIN_URL . 'assets/js/csv-handler.js', array('jquery', 'datatables-js', 'orion-discard-ajax', 'orion-discards-table-manager'), ORION_DISCARD_VERSION, true);
        wp_enqueue_script('orion-discard-factory', ORION_DISCARD_PLUGIN_URL . 'assets/js/Factories/ajax-param-factory.js', array('jquery', 'orion-discard-ajax'), ORION_DISCARD_VERSION, true);
        wp_enqueue_script('orion-discard-script', ORION_DISCARD_PLUGIN_URL . 'assets/js/app.js', array('jquery', 'datatables-js', 'orion-discard-ajax', 'orion-discards-table-manager', 'orion-discard-script-csv', 'orion-discard-factory'), ORION_DISCARD_VERSION, true);

        wp_localize_script('orion-discard-ajax', 'orionDiscard', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('orion_discard_nonce'),
            'site' => $site ? $site : 'PRSA',
            'year' => $year ? $year : date('Y')
        ));
    }

    /**
     * Handle get data from vForm record type AJAX request
     */
    public function handle_get_data_from_vForm_recordType()
    {
        // ✅ CORRECCIÓN: Usar $_POST en lugar de $_GET
        // ✅ CORRECCIÓN: Buscar '_ajax_nonce' en lugar de 'nonce'
        if (!isset($_POST['_ajax_nonce']) || !wp_verify_nonce($_POST['_ajax_nonce'], 'orion_discard_nonce')) {

            wp_send_json_error('Invalid nonce');

            return;

        }

        // ✅ CORRECCIÓN: Cambiar $_GET por $_POST
        $site = sanitize_text_field($_POST['vdata_site'] ?? '');

        $year = sanitize_text_field($_POST['vdata_year'] ?? '');

        $form_type = sanitize_text_field($_POST['vform_record_type'] ?? '');

        // $field_selected = sanitize_text_field($_POST['fieldId'] ?? '');

        $field_selected = 'AB-RA';

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

        if (empty($posts)) {

            wp_send_json_error('No data found');

            return;

        }

        // Process posts
        $csv_data = array();

        $csv_headers = array();

        $processed_count = 0;

        $filtered_count = 0;

        foreach ($posts as $post) {
            $processed_count++;

            // Decodificar contenido JSON
            $post_content = json_decode($post->post_content, true);

            if (!is_array($post_content)) {
                continue;
            }

            // Verificar si el campo coincide
            if (isset($post_content['field']) && $post_content['field'] == $field_selected) {
                $filtered_count++;

                $csv_data[] = $post_content;

                $csv_headers = array_unique(array_merge($csv_headers, array_keys($post_content)));

            }
        }

        if (empty($csv_data)) {

            wp_send_json_error('No data found for field');

            return;

        }

        wp_send_json_success(array(
            'csv_content' => $csv_data,
            'total_records' => $filtered_count,
            'field_id' => $field_selected,
            'headers' => $csv_headers,
            'processed_posts' => $processed_count
        ));

    }

      /**
     * Handle get data from vForm record type AJAX request
     */
    public function handle_get_data_from_vForm_recordType_To_ValidateBarCode()
    {
        // ✅ CORRECCIÓN: Usar $_POST en lugar de $_GET
        // ✅ CORRECCIÓN: Buscar '_ajax_nonce' en lugar de 'nonce'
        if (!isset($_POST['_ajax_nonce']) || !wp_verify_nonce($_POST['_ajax_nonce'], 'orion_discard_nonce')) {

            wp_send_json_error('Invalid nonce');

            return;

        }

        // ✅ CORRECCIÓN: Cambiar $_GET por $_POST
        $site = sanitize_text_field($_POST['vdata_site'] ?? '');

        $year = sanitize_text_field($_POST['vdata_year'] ?? '');

        $form_type = sanitize_text_field($_POST['vform_record_type'] ?? '');   

        $field_selected = 'AB-RA';

        $barcode_Read = sanitize_text_field($_POST['barcode_Read'] ??  '');

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

        if (empty($posts)) {

            wp_send_json_error('No data found');

            return;

        }

        // Process posts - buscar el barcode específico
        $processed_count = 0;

        $found_post_content = null;

        foreach ($posts as $post) {
            $processed_count++;

            // Decodificar contenido JSON
            $post_content = json_decode($post->post_content, true);

            if (!is_array($post_content)) {
                continue;
            }

            // Verificar si el barcode coincide - retornar inmediatamente cuando se encuentre
            if (isset($post_content['barcd']) && $post_content['barcd'] == $barcode_Read) {

                $found_post_content = $post_content;

                break; // Salir del loop una vez encontrado
            }
        }

        if (is_null($found_post_content)) {
            wp_send_json_error('Barcode not found');

            return;
        }

        // Retornar directamente el post content encontrado
        wp_send_json_success($found_post_content);

    }

    function handle_updated_MaterialDiscard()
    {
        $ID = $_POST['ID'] ?? null;

        if (!$ID) {
            wp_send_json_error('Missing ID parameter');

            wp_die();
        }


        $post = get_post($ID);
        if (!$post) {
            wp_send_json_error('Post not found');

            wp_die();
        }

        $post_content = json_decode($post->post_content);

        $post_content['isDiscarded'] = true;

        $post->post_content = json_encode($post_content);

        $updated = wp_update_post($post);

        $updated 
            ? wp_send_json_success('Material discard updated successfully')
            : wp_send_json_error('Failed to update material discard');



        // This function can be used to handle updates to the material discard process
        // For example, updating records in the database or performing cleanup tasks
        // Currently, it does nothing but can be extended as needed
    }   
}
