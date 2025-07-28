<?php

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

add_action('wp_ajax_orion_discard_validation', 'orion_discard_validation_handler');

function orion_discard_validation_handler() {
 
    // $posts get_posts(array(
//     'post_type' => 'vdata',
//     'posts_per_page' => -1,
//     'post_status' => 'publish',
//     'meta_query' => array(
//         'relation' => 'AND',
//         array(
//             'key' => 'vdata-site',
//             'compare' => '=',
//             'value' => 'PRSA',
//         ),
//         array(
//             'key' => 'vdata-year',
//             'compare' => '=',
//             'value' => '2023',
//             ),
//         array(
//             'key' => 'vform-record-type',
//             'compare' => '=',
//             'value' => 'orion-discard',
//         )
//     )
// ));
}