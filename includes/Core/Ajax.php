<?php

/**
 * AJAX Handler Class
 * 
 * Centralizes all AJAX request handling for the plugin.
 * Provides security, validation, and clean separation of concerns.
 * 
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Core_Ajax
{
    /**
     * AJAX: Validar código de barras y marcar como descartado
     */
    public function handle_get_data_from_vForm_recordType_To_ValidateBarCode() {
        // Seguridad
        if (
            empty($_POST['_ajax_nonce']) ||
            !wp_verify_nonce($_POST['_ajax_nonce'], 'orion_discard_nonce')
        ) {
            wp_send_json_error('Invalid nonce');
        }

        // Sanitización
        $site = sanitize_text_field($_POST['vdata_site'] ?? '');
        $year = sanitize_text_field($_POST['vdata_year'] ?? '');
        $form_type = sanitize_text_field($_POST['vform_record_type'] ?? '');
        $barcode_read = sanitize_text_field($_POST['barcode_Read'] ?? '');
        $field_selected = 'AB-RA';

        // Validación mínima antes de continuar
        if (!$site || !$year || !$form_type || !$barcode_read) {
            wp_send_json_error('Missing required parameters');
        }

        // Buscar posts por meta (limitamos los campos para rendimiento)
        $query = new WP_Query([
            'post_type' => 'vdata',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'no_found_rows' => true,
            'meta_query' => [
                'relation' => 'AND',
                [
                    'key' => 'vdata-site',
                    'value' => $site,
                ],
                [
                    'key' => 'vdata-year',
                    'value' => $year,
                ],
                [
                    'key' => 'vform-record-type',
                    'value' => $form_type,
                ],
            ],
        ]);

        if (!$query->have_posts()) {
            wp_send_json_error('No data found for the specified criteria');
        }

        foreach ($query->posts as $post_id) {
            $content = get_post_field('post_content', $post_id);

            if (!$content) {
                continue;
            }

            $data = json_decode($content, true);
            if (!is_array($data) || empty($data['barcd'])) {
                continue;
            }

            // Comparación de código de barras
            if (trim($data['barcd']) === $barcode_read) {

                // Verificar usando isDiscarded como flag
                if (!empty($data['isDiscarded']) && $data['isDiscarded'] === true) {
                    wp_send_json_error([
                        'message' => 'Barcode already discarded',
                        'barcode' => $barcode_read,
                        'post_id' => $post_id,
                        'data' => $data,
                    ]);
                }

                // Actualizar el estado de descarte
                $data['isDiscarded'] = true;
                $data['discarded_at'] = current_time('mysql');
                $data['discarded_by'] = get_current_user_id();

                $update = wp_update_post([
                    'ID' => $post_id,
                    'post_content' => wp_json_encode($data),
                ], true);

                if (is_wp_error($update)) {
                    wp_send_json_error([
                        'message' => 'Failed to update discard status',
                        'error' => $update->get_error_message(),
                        'post_id' => $post_id,
                    ]);
                }

                // Incluir post_id en la respuesta exitosa para identificar la fila correcta
                wp_send_json_success([
                    'message' => 'Barcode successfully marked as discarded',
                    'barcode' => $barcode_read,
                    'post_id' => $post_id,
                    'data' => $data,
                    'debug_info' => [
                        'query_found_posts' => count($query->posts),
                        'matched_post_id' => $post_id,
                        'barcode_matched' => $barcode_read
                    ]
                ]);
            }
        }

        // Código no encontrado
        wp_send_json_error([
            'message' => 'Barcode not found',
            'barcode' => $barcode_read,
        ]);
    }

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->init_hooks();
    }

    /**
     * Initialize AJAX hooks
     */
    private function init_hooks()
    {
        // Register AJAX handlers
        add_action('wp_ajax_get_data_from_vForm_recordType', array($this, 'handle_get_data_from_vForm_recordType'));
        // CORRECCIÓN: Apuntar el hook a la función original que valida y descarta el barcode
        add_action('wp_ajax_get_data_from_vForm_recordType_To_ValidateBarCode', array($this, 'handle_get_data_from_vForm_recordType_To_ValidateBarCode'));
        add_action('wp_ajax_updated_MaterialDiscard', array($this, 'handle_updated_material_discard'));
        
        // For logged-in users only (add nopriv versions if needed for public access)
        // add_action('wp_ajax_nopriv_action_name', array($this, 'method_name'));
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
                array('key' => 'vdata-site', 'value' => $site, 'compare' => '='),
                array('key' => 'vdata-year', 'value' => $year, 'compare' => '='),
                array('key' => 'vform-record-type', 'value' => $form_type, 'compare' => '=')
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
                // ✅ CORRECCIÓN: Incluir post_id en los datos para identificar correctamente las filas
                $post_content['post_id'] = $post->ID;
                $post_content['id'] = $post->ID; // Alias para compatibilidad con table manager
                // ✅ CORRECCIÓN: Establecer estado inicial basándose en isDiscarded
                if (!empty($post_content['isDiscarded'])) {
                    $post_content['status'] = '✅'; // Ya descartado
                } else {
                    $post_content['status'] = '❌'; // Pendiente de descarte
                }
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
     * Handle barcode validation and discard marking
     */
    public function handle_validate_barcode()
    {
        // Security verification
        if (!OrionDiscard_Utils_SecurityHelper::verify_ajax_nonce()) {
            OrionDiscard_Utils_SecurityHelper::ajax_error('Invalid nonce');
            return;
        }

        if (!OrionDiscard_Utils_SecurityHelper::verify_user_capability()) {
            OrionDiscard_Utils_SecurityHelper::ajax_error('Insufficient permissions');
            return;
        }

        // Sanitize input
        $sanitization_rules = array(
            'vdata_site' => 'text',
            'vdata_year' => 'text',
            'vform_record_type' => 'text',
            'barcode_Read' => 'text'
        );

        $data = OrionDiscard_Utils_SecurityHelper::sanitize_post_data($_POST, $sanitization_rules);

        // Validate required parameters
        $validation = OrionDiscard_Utils_SecurityHelper::validate_required_params(
            array('vdata_site', 'vdata_year', 'vform_record_type', 'barcode_Read')
        );

        if (!$validation['valid']) {
            OrionDiscard_Utils_SecurityHelper::ajax_error('Missing required parameters: ' . implode(', ', $validation['missing']));
            return;
        }

        // Use the barcode validator
        $barcode_validator = new OrionDiscard_Data_BarcodeValidator();
        $result = $barcode_validator->validate_and_mark_discard($data);

        if (is_wp_error($result)) {
            OrionDiscard_Utils_SecurityHelper::ajax_error($result->get_error_message());
            return;
        }

        OrionDiscard_Utils_SecurityHelper::ajax_success($result);
    }

    
}
