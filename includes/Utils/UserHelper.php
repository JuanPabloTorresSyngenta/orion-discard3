<?php
/**
 * OrionDiscard_Utils_UserHelper
 * Helper para datos de usuario en el plugin Orion Discard
 */
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_Utils_UserHelper {
    public function get_user_site() {
        $site = get_user_meta(get_current_user_id(), 'orion_discard_site', true);
        return $site ? $site : 'PRSA';
    }
    public function get_user_year() {
        $year = get_user_meta(get_current_user_id(), 'orion_discard_year', true);
        return $year ? $year : date('Y');
    }
}
