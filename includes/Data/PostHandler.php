<?php

/**
 * Post Handler Class
 * 
 * Handles all WordPress post operations for vdata posts.
 * Provides clean interface for data retrieval and manipulation.
 * 
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Data_PostHandler
{
    /**
     * Post type for vdata
     * 
     * @var string
     */
    private $post_type = 'vdata';

    /**
     * Get vForm data based on criteria
     * 
     * @param array $criteria Search criteria
     * @return array|WP_Error Result data or error
     */
    public function get_vform_data($criteria)
    {
        // Build meta query
        $meta_query = $this->build_meta_query($criteria);

        // Query posts
        $posts = get_posts(array(
            'post_type' => $this->post_type,
            'posts_per_page' => -1,
            'meta_query' => $meta_query,
            'post_status' => 'publish'
        ));

        if (empty($posts)) {
            return new WP_Error('no_data', 'No data found for the specified criteria');
        }

        return $this->process_vform_posts($posts, $criteria);
    }

    /**
     * Update material discard status
     * 
     * @param array $data Update data
     * @return array|WP_Error Result or error
     */
    public function update_material_discard($data)
    {
        $post_id = $data['post_id'];
        
        // Verify post exists and is correct type
        $post = get_post($post_id);
        if (!$post || $post->post_type !== $this->post_type) {
            return new WP_Error('invalid_post', 'Invalid post ID or post type');
        }

        // Get current content
        $content = json_decode($post->post_content, true);
        if (!is_array($content)) {
            return new WP_Error('invalid_content', 'Invalid post content format');
        }

        // Update based on action type
        switch ($data['action_type']) {
            case 'mark_discarded':
                $content = $this->mark_as_discarded($content);
                break;
                
            case 'unmark_discarded':
                $content = $this->unmark_as_discarded($content);
                break;
                
            case 'update_data':
                if (isset($data['data']) && is_array($data['data'])) {
                    $content = array_merge($content, $data['data']);
                }
                break;
                
            default:
                return new WP_Error('invalid_action', 'Invalid action type');
        }

        // Update post
        $update_result = wp_update_post(array(
            'ID' => $post_id,
            'post_content' => wp_json_encode($content)
        ), true);

        if (is_wp_error($update_result)) {
            return $update_result;
        }

        return array(
            'success' => true,
            'post_id' => $post_id,
            'updated_content' => $content,
            'message' => 'Material discard status updated successfully'
        );
    }

    /**
     * Find post by barcode
     * 
     * @param string $barcode Barcode to search for
     * @param array $criteria Additional search criteria
     * @return WP_Post|null Post object or null if not found
     */
    public function find_post_by_barcode($barcode, $criteria = array())
    {
        // Build meta query
        $meta_query = $this->build_meta_query($criteria);

        // Query posts with potential barcode match
        $posts = get_posts(array(
            'post_type' => $this->post_type,
            'posts_per_page' => -1,
            'meta_query' => $meta_query,
            'post_status' => 'publish'
        ));

        // Search through post content for barcode
        foreach ($posts as $post) {
            $content = json_decode($post->post_content, true);
            
            if (is_array($content) && isset($content['barcd']) && $content['barcd'] === $barcode) {
                return $post;
            }
        }

        return null;
    }

    /**
     * Get statistics for dashboard
     * 
     * @param array $criteria Filter criteria
     * @return array Statistics data
     */
    public function get_statistics($criteria = array())
    {
        $meta_query = $this->build_meta_query($criteria);

        $posts = get_posts(array(
            'post_type' => $this->post_type,
            'posts_per_page' => -1,
            'meta_query' => $meta_query,
            'post_status' => 'publish'
        ));

        $total = 0;
        $discarded = 0;

        foreach ($posts as $post) {
            $content = json_decode($post->post_content, true);
            
            if (!is_array($content)) {
                continue;
            }

            // Apply field filter if specified
            if (isset($criteria['fieldId']) && !empty($criteria['fieldId'])) {
                if (!isset($content['field']) || $content['field'] !== $criteria['fieldId']) {
                    continue;
                }
            }

            $total++;
            
            if (!empty($content['isDiscarded'])) {
                $discarded++;
            }
        }

        $pending = $total - $discarded;
        $percentage = $total > 0 ? round(($discarded / $total) * 100) : 0;

        return array(
            'total' => $total,
            'discarded' => $discarded,
            'pending' => $pending,
            'percentage' => $percentage
        );
    }

    /**
     * Build meta query from criteria
     * 
     * @param array $criteria Search criteria
     * @return array Meta query array
     */
    private function build_meta_query($criteria)
    {
        $meta_query = array('relation' => 'AND');

        $meta_field_mapping = array(
            'vdata_site' => 'vdata-site',
            'vdata_year' => 'vdata-year',
            'vform_record_type' => 'vform-record-type'
        );

        foreach ($meta_field_mapping as $criteria_key => $meta_key) {
            if (!empty($criteria[$criteria_key])) {
                $meta_query[] = array(
                    'key' => $meta_key,
                    'value' => $criteria[$criteria_key],
                    'compare' => '='
                );
            }
        }

        return $meta_query;
    }

    /**
     * Process vForm posts for output
     * 
     * @param array $posts Array of WP_Post objects
     * @param array $criteria Original criteria
     * @return array Processed data
     */
    private function process_vform_posts($posts, $criteria)
    {
        $csv_data = array();
        $csv_headers = array();
        $processed_count = 0;
        $filtered_count = 0;

        foreach ($posts as $post) {
            $processed_count++;

            $content = json_decode($post->post_content, true);
            
            if (!is_array($content)) {
                continue;
            }

            // Apply field filter if specified
            if (isset($criteria['fieldId']) && !empty($criteria['fieldId'])) {
                if (!isset($content['field']) || $content['field'] !== $criteria['fieldId']) {
                    continue;
                }
            }

            $filtered_count++;
            
            // Add post ID for identification
            $content['post_id'] = $post->ID;
            
            $csv_data[] = $content;

            // Collect headers from first item
            if (empty($csv_headers) && !empty($content)) {
                $csv_headers = array_keys($content);
            }
        }

        return array(
            'csv_content' => $csv_data,
            'total_records' => $filtered_count,
            'field_id' => $criteria['fieldId'] ?? '',
            'headers' => $csv_headers,
            'processed_posts' => $processed_count
        );
    }

    /**
     * Mark content as discarded
     * 
     * @param array $content Post content
     * @return array Updated content
     */
    private function mark_as_discarded($content)
    {
        $content['isDiscarded'] = true;
        $content['discarded_at'] = current_time('mysql');
        $content['discarded_by'] = get_current_user_id();
        
        return $content;
    }

    /**
     * Remove discard marking from content
     * 
     * @param array $content Post content
     * @return array Updated content
     */
    private function unmark_as_discarded($content)
    {
        unset($content['isDiscarded']);
        unset($content['discarded_at']);
        unset($content['discarded_by']);
        
        return $content;
    }

    /**
     * Validate post content structure
     * 
     * @param array $content Content to validate
     * @return bool True if valid
     */
    private function validate_content_structure($content)
    {
        if (!is_array($content)) {
            return false;
        }

        // Required fields for a valid vdata post
        $required_fields = array('field'); // Add other required fields as needed
        
        foreach ($required_fields as $field) {
            if (!isset($content[$field])) {
                return false;
            }
        }

        return true;
    }
}
