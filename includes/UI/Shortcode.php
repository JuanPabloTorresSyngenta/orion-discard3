<?php

/**
 * Shortcode UI Class
 * 
 * Handles shortcode registration and HTML output generation.
 * Separates presentation logic from business logic.
 * 
 * @package OrionDiscard
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class OrionDiscard_UI_Shortcode
{
    /**
     * Constructor
     */
    public function __construct()
    {
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks()
    {
        add_shortcode('orionDiscardForm', array($this, 'render_form_shortcode'));
    }

    /**
     * Render the shortcode output
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_form_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'id' => '353876'
        ), $atts, 'orionDiscardForm');

        // Start output buffering
        ob_start();
        
        // Render the form HTML
        $this->render_form_html($atts);
        
        return ob_get_clean();
    }

    /**
     * Render the complete form HTML
     * 
     * @param array $atts Shortcode attributes
     */
    private function render_form_html($atts)
    {
        $form_id = OrionDiscard_Utils_SecurityHelper::escape_attr($atts['id']);
        ?>
        <div id="orion-discard-form-<?php echo $form_id; ?>">
            <?php
            $this->render_vform_integration($atts);
            $this->render_separator();
            $this->render_dashboard();
            $this->render_dashboard_scripts();
            $this->render_data_table();
            $this->render_modal();
            ?>
        </div>
        <?php
    }

    /**
     * Render vForm integration
     * 
     * @param array $atts Shortcode attributes
     */
    private function render_vform_integration($atts)
    {
        $form_id = OrionDiscard_Utils_SecurityHelper::escape_attr($atts['id']);
        ?>
        <!-- Shortcode for the control dropdowns -->
        <?php echo do_shortcode('[vform id=' . $form_id . ']'); ?>
        <?php
    }

    /**
     * Render separator
     */
    private function render_separator()
    {
        ?>
        <hr class="wp-header-end">
        <?php
    }

    /**
     * Render dashboard section
     */
    private function render_dashboard()
    {
        ?>
        <!-- Dashboard de Estadísticas -->
        <div id="orion-dashboard" class="orion-dashboard-container">
            <h3 class="dashboard-title">Dashboard de Materiales</h3>
            <div class="dashboard-cards-row">
                <?php
                $this->render_dashboard_card('total', '📊 Total Materiales', 'total-materials', 'Materiales en sistema');
                $this->render_dashboard_card('discarded', '✅ Descartados', 'discarded-materials', 'Completados');
                $this->render_dashboard_card('pending', '⏳ Pendientes', 'pending-materials', 'Por descartar');
                $this->render_dashboard_progress_card();
                ?>
            </div>
        </div>
        <?php
    }

    /**
     * Render individual dashboard card
     * 
     * @param string $type Card type for CSS class
     * @param string $title Card title
     * @param string $element_id Element ID for the number
     * @param string $description Card description
     */
    private function render_dashboard_card($type, $title, $element_id, $description)
    {
        ?>
        <div class="dashboard-card <?php echo $type; ?>-card">
            <div class="card-header">
                <h5><?php echo OrionDiscard_Utils_SecurityHelper::escape_html($title); ?></h5>
            </div>
            <div class="card-body">
                <div class="dashboard-number" id="<?php echo OrionDiscard_Utils_SecurityHelper::escape_attr($element_id); ?>">0</div>
                <p class="card-text"><?php echo OrionDiscard_Utils_SecurityHelper::escape_html($description); ?></p>
            </div>
        </div>
        <?php
    }

    /**
     * Render progress dashboard card
     */
    private function render_dashboard_progress_card()
    {
        ?>
        <div class="dashboard-card progress-card">
            <div class="card-header">
                <h5>📈 Progreso</h5>
            </div>
            <div class="card-body">
                <div class="dashboard-number" id="progress-percentage">0%</div>
                <p class="card-text">Completitud</p>
                <div class="progress">
                    <div class="progress-bar" id="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render dashboard JavaScript functionality
     */
    private function render_dashboard_scripts()
    {
        ?>
        <script>
        (function() {
            <?php echo $this->get_dashboard_javascript(); ?>
        })();
        </script>
        <?php
    }

    /**
     * Render data table
     */
    private function render_data_table()
    {
        ?>
        <table id="discards-table" class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <?php
                    $headers = array(
                        'Estado' => 'text-center',
                        'Field' => 'text-center',
                        'Range' => 'text-center',
                        'Row' => 'text-center',
                        'Plot ID' => 'text-center',
                        'Subplot ID' => 'text-center',
                        'MATID' => 'text-center',
                        'Código' => 'text-center'
                    );
                    
                    foreach ($headers as $header => $class) {
                        echo '<th class="manage-column ' . OrionDiscard_Utils_SecurityHelper::escape_attr($class) . '">';
                        echo OrionDiscard_Utils_SecurityHelper::escape_html($header);
                        echo '</th>';
                    }
                    ?>
                </tr>
            </thead>
            <tbody>
                <!-- Data will be loaded via JavaScript -->
            </tbody>
        </table>
        <?php
    }

    /**
     * Render modal for duplicate barcode notifications
     */
    private function render_modal()
    {
        ?>
        <!-- Modal para código duplicado -->
        <div id="duplicate-barcode-modal" class="orion-modal" style="display: none;">
            <div class="orion-modal-content">
                <div class="orion-modal-header">
                    <h3>Barcode already discarded</h3>
                    <span class="orion-modal-close">&times;</span>
                </div>
                <div class="orion-modal-body">
                    <p>The scanned barcode has already been discarded.</p>
                    <p><strong>Barcode:</strong> <span id="duplicate-code-display"></span></p>
                </div>
                <div class="orion-modal-footer">
                    <button type="button" class="button button-primary" id="modal-close-btn">OK</button>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Get dashboard JavaScript code
     * 
     * @return string JavaScript code
     */
    private function get_dashboard_javascript()
    {
        return "
            console.log('🔧 Ejecutando script inline para dashboard...');
            
            function forceDashboardLayoutInline() {
                const dashboard = document.querySelector('#orion-dashboard');
                const cardsRow = document.querySelector('.dashboard-cards-row');
                const cards = document.querySelectorAll('.dashboard-card');
                
                if (!dashboard || !cardsRow) {
                    console.log('❌ Elementos del dashboard no encontrados aún');
                    return false;
                }
                
                console.log('📊 Aplicando estilos inline al dashboard...');
                
                // Aplicar estilos inline directamente
                dashboard.style.display = 'block';
                dashboard.style.width = '100%';
                dashboard.style.visibility = 'visible';
                
                cardsRow.style.display = 'flex';
                cardsRow.style.flexDirection = 'row';
                cardsRow.style.flexWrap = 'nowrap';
                cardsRow.style.gap = '20px';
                cardsRow.style.justifyContent = 'space-between';
                cardsRow.style.alignItems = 'stretch';
                cardsRow.style.width = '100%';
                
                cards.forEach(function(card) {
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.flex = '1 1 0%';
                    card.style.minWidth = '200px';
                    card.style.maxWidth = 'none';
                });
                
                console.log('✅ Layout horizontal aplicado a', cards.length, 'tarjetas');
                return true;
            }
            
            // Ejecutar inmediatamente
            forceDashboardLayoutInline();
            
            // Ejecutar de nuevo después de un delay
            setTimeout(forceDashboardLayoutInline, 500);
            setTimeout(forceDashboardLayoutInline, 1000);
            
            // Ejecutar cuando el DOM esté completamente cargado
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', forceDashboardLayoutInline);
            } else {
                forceDashboardLayoutInline();
            }
            
            // Función para mostrar estadísticas de ejemplo
            function showSampleStats() {
                const totalEl = document.querySelector('#total-materials');
                const discardedEl = document.querySelector('#discarded-materials');
                const pendingEl = document.querySelector('#pending-materials');
                const progressEl = document.querySelector('#progress-percentage');
                const progressBarEl = document.querySelector('#progress-bar');
                
                // Simular estadísticas cuando no hay datos
                if (totalEl && totalEl.textContent === '0') {
                    console.log('📊 Mostrando estadísticas de ejemplo...');
                    
                    totalEl.textContent = '---';
                    discardedEl.textContent = '---';
                    pendingEl.textContent = '---';
                    progressEl.textContent = '---%';
                    
                    if (progressBarEl) {
                        progressBarEl.style.width = '0%';
                    }
                }
            }
            
            // Mostrar estadísticas de ejemplo después de 2 segundos
            setTimeout(showSampleStats, 2000);
            
            // Dashboard update functions will be defined by external scripts
            window.orionDashboard = {
                initialized: true,
                forceDashboardLayoutInline: forceDashboardLayoutInline,
                showSampleStats: showSampleStats
            };
        ";
    }
}
