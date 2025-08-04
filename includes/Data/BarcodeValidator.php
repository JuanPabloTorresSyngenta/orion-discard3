<?php

/**
 * Barcode Validator Class
 * 
 * Handles barcode validation, duplicate checking, and discard marking.
 * Provides efficient search and validation logic.
 * 
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Data_BarcodeValidator
{
    /**
     * Post handler instance
     * 
     * @var OrionDiscard_Data_PostHandler
     */
    private $post_handler;

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->post_handler = new OrionDiscard_Data_PostHandler();
    }

    /**
     * Validate barcode and mark as discarded
     * 
     * @param array $data Validation data containing barcode and criteria
     * @return array|WP_Error Result or error
     */
    public function validate_and_mark_discard($data)
    {
        $barcode = $data['barcode_Read'];
        $criteria = array(
            'vdata_site' => $data['vdata_site'],
            'vdata_year' => $data['vdata_year'],
            'vform_record_type' => $data['vform_record_type']
        );

        // Set default field if not provided
        $criteria['fieldId'] = 'AB-RA'; // TODO: Make configurable

        // Find the post with this barcode
        $post = $this->post_handler->find_post_by_barcode($barcode, $criteria);

        if (!$post) {
            return new WP_Error('barcode_not_found', 'Barcode not found', array(
                'barcode' => $barcode
            ));
        }

        // Check post content
        $content = json_decode($post->post_content, true);
        
        if (!is_array($content)) {
            return new WP_Error('invalid_content', 'Invalid post content format');
        }

        // Check if already discarded
        if (!empty($content['isDiscarded'])) {
            return new WP_Error('already_discarded', 'Barcode already discarded', array(
                'barcode' => $barcode,
                'data' => $content,
                'discarded_at' => $content['discarded_at'] ?? 'unknown',
                'discarded_by' => $content['discarded_by'] ?? 'unknown'
            ));
        }

        // Mark as discarded
        $update_result = $this->post_handler->update_material_discard(array(
            'post_id' => $post->ID,
            'action_type' => 'mark_discarded'
        ));

        if (is_wp_error($update_result)) {
            return $update_result;
        }

        // Get updated content
        $updated_post = get_post($post->ID);
        $updated_content = json_decode($updated_post->post_content, true);

        return array(
            'success' => true,
            'message' => 'Barcode successfully marked as discarded',
            'barcode' => $barcode,
            'post_id' => $post->ID,
            'data' => $updated_content,
            'discarded_at' => $updated_content['discarded_at'] ?? current_time('mysql'),
            'discarded_by' => $updated_content['discarded_by'] ?? get_current_user_id()
        );
    }

    /**
     * Check if barcode exists
     * 
     * @param string $barcode Barcode to check
     * @param array $criteria Search criteria
     * @return array Status information
     */
    public function check_barcode_status($barcode, $criteria = array())
    {
        $post = $this->post_handler->find_post_by_barcode($barcode, $criteria);

        if (!$post) {
            return array(
                'exists' => false,
                'discarded' => false,
                'barcode' => $barcode,
                'message' => 'Barcode not found'
            );
        }

        $content = json_decode($post->post_content, true);
        $is_discarded = !empty($content['isDiscarded']);

        return array(
            'exists' => true,
            'discarded' => $is_discarded,
            'post_id' => $post->ID,
            'barcode' => $barcode,
            'data' => $content,
            'message' => $is_discarded ? 'Barcode already discarded' : 'Barcode found and available'
        );
    }

    /**
     * Unmark barcode as discarded (undo operation)
     * 
     * @param string $barcode Barcode to unmark
     * @param array $criteria Search criteria
     * @return array|WP_Error Result or error
     */
    public function unmark_barcode_discard($barcode, $criteria = array())
    {
        $post = $this->post_handler->find_post_by_barcode($barcode, $criteria);

        if (!$post) {
            return new WP_Error('barcode_not_found', 'Barcode not found', array(
                'barcode' => $barcode
            ));
        }

        $content = json_decode($post->post_content, true);
        
        if (empty($content['isDiscarded'])) {
            return new WP_Error('not_discarded', 'Barcode is not marked as discarded', array(
                'barcode' => $barcode,
                'data' => $content
            ));
        }

        // Unmark as discarded
        $update_result = $this->post_handler->update_material_discard(array(
            'post_id' => $post->ID,
            'action_type' => 'unmark_discarded'
        ));

        if (is_wp_error($update_result)) {
            return $update_result;
        }

        return array(
            'success' => true,
            'message' => 'Barcode discard status removed successfully',
            'barcode' => $barcode,
            'post_id' => $post->ID
        );
    }

    /**
     * Bulk validate barcodes
     * 
     * @param array $barcodes Array of barcodes to validate
     * @param array $criteria Search criteria
     * @return array Validation results
     */
    public function bulk_validate_barcodes($barcodes, $criteria = array())
    {
        $results = array(
            'success' => array(),
            'errors' => array(),
            'already_discarded' => array(),
            'not_found' => array(),
            'summary' => array(
                'total' => count($barcodes),
                'processed' => 0,
                'success_count' => 0,
                'error_count' => 0
            )
        );

        foreach ($barcodes as $barcode) {
            $results['summary']['processed']++;

            $validation_data = array_merge($criteria, array(
                'barcode_Read' => $barcode
            ));

            $result = $this->validate_and_mark_discard($validation_data);

            if (is_wp_error($result)) {
                $error_code = $result->get_error_code();
                
                switch ($error_code) {
                    case 'barcode_not_found':
                        $results['not_found'][] = $barcode;
                        break;
                        
                    case 'already_discarded':
                        $results['already_discarded'][] = $barcode;
                        break;
                        
                    default:
                        $results['errors'][] = array(
                            'barcode' => $barcode,
                            'error' => $result->get_error_message()
                        );
                        break;
                }
                
                $results['summary']['error_count']++;
            } else {
                $results['success'][] = $barcode;
                $results['summary']['success_count']++;
            }
        }

        return $results;
    }

    /**
     * Get barcode validation statistics
     * 
     * @param array $criteria Filter criteria
     * @return array Statistics
     */
    public function get_validation_statistics($criteria = array())
    {
        return $this->post_handler->get_statistics($criteria);
    }

    /**
     * Validate barcode format
     * 
     * @param string $barcode Barcode to validate
     * @return bool True if format is valid
     */
    public function validate_barcode_format($barcode)
    {
        // Remove whitespace
        $barcode = trim($barcode);
        
        // Check if empty
        if (empty($barcode)) {
            return false;
        }

        // Check length (adjust based on your barcode specifications)
        if (strlen($barcode) < 3 || strlen($barcode) > 50) {
            return false;
        }

        // Check for valid characters (alphanumeric and some special chars)
        if (!preg_match('/^[A-Za-z0-9\-_\.]+$/', $barcode)) {
            return false;
        }

        return true;
    }

    /**
     * Clean barcode input
     * 
     * @param string $barcode Raw barcode input
     * @return string Cleaned barcode
     */
    public function clean_barcode($barcode)
    {
        // Remove whitespace and convert to uppercase
        $barcode = strtoupper(trim($barcode));
        
        // Remove common scanner artifacts
        $barcode = str_replace(array("\r", "\n", "\t"), '', $barcode);
        
        return $barcode;
    }
}
