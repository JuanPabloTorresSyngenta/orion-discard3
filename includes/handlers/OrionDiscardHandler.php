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

        add_action('wp_ajax_get_data_from_vForm_recordType_To_ValidateBarCode', array($this, 'handle_get_data_from_vForm_recordType_To_ValidateBarCode'));

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
            'id' => '10'
        ), $atts);

        // Start output buffering
        ob_start();
?>
        <div id="orion-discard-form-<?php echo esc_attr($atts['id']); ?>" >
          
            <!-- Shortcode for the control dropdowns -->
            <?= do_shortcode('[vform id=' . esc_attr($atts['id']) . ']'); ?>

            <hr class="wp-header-end">

            <!-- Dashboard de Estadísticas -->
            <div id="orion-dashboard" class="orion-dashboard-container">
                <h3 class="dashboard-title">Dashboard de Materiales</h3>
                <div class="dashboard-cards-row">
                    <!-- Total Materiales -->
                    <div class="dashboard-card total-card">
                        <div class="card-header">
                            <h5>📊 Total Materiales</h5>
                        </div>
                        <div class="card-body">
                            <div class="dashboard-number" id="total-materials">0</div>
                            <p class="card-text">Materiales en sistema</p>
                        </div>
                    </div>
                    
                    <!-- Descartados -->
                    <div class="dashboard-card discarded-card">
                        <div class="card-header">
                            <h5>✅ Descartados</h5>
                        </div>
                        <div class="card-body">
                            <div class="dashboard-number" id="discarded-materials">0</div>
                            <p class="card-text">Completados</p>
                        </div>
                    </div>
                    
                    <!-- No Descartados -->
                    <div class="dashboard-card pending-card">
                        <div class="card-header">
                            <h5>⏳ Pendientes</h5>
                        </div>
                        <div class="card-body">
                            <div class="dashboard-number" id="pending-materials">0</div>
                            <p class="card-text">Por descartar</p>
                        </div>
                    </div>
                    
                    <!-- Progreso -->
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
                </div>
            </div>

            <!-- Script inline para forzar layout del dashboard -->
            <script>
            (function() {
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
                
                // Función de emergencia para forzar la carga correcta del table manager
                window.debugTableManagerAPI = function() {
                    console.log('🔍 === DEBUG TABLE MANAGER API ===');
                    
                    if (window.discardsTableManager) {
                        console.log('📋 Todos los métodos disponibles:');
                        const methods = Object.keys(window.discardsTableManager);
                        methods.forEach(method => {
                            console.log(`  ${method}: ${typeof window.discardsTableManager[method]}`);
                        });
                        
                        // Intentar métodos específicos
                        const testMethods = ['getDashboardStats', 'updateDashboard', 'getStatistics', 'debugDashboard'];
                        testMethods.forEach(methodName => {
                            if (window.discardsTableManager[methodName]) {
                                console.log(`✅ ${methodName} disponible`);
                                try {
                                    if (methodName === 'getDashboardStats' || methodName === 'getStatistics') {
                                        const result = window.discardsTableManager[methodName]();
                                        console.log(`📊 ${methodName} resultado:`, result);
                                    } else if (methodName === 'debugDashboard') {
                                        const result = window.discardsTableManager[methodName]();
                                        console.log(`🔍 ${methodName} resultado:`, result);
                                    }
                                } catch (error) {
                                    console.error(`❌ Error ejecutando ${methodName}:`, error);
                                }
                            } else {
                                console.log(`❌ ${methodName} NO disponible`);
                            }
                        });
                    } else {
                        console.log('❌ discardsTableManager no disponible');
                    }
                    
                    console.log('🔍 === FIN DEBUG ===');
                };
                
                // Ejecutar debug del API después de 2 segundos
                setTimeout(function() {
                    console.log('🔄 Ejecutando debug del API...');
                    window.debugTableManagerAPI();
                }, 2000);
                
                // Función de emergencia para actualizar dashboard sin table manager
                window.emergencyDashboardUpdate = function() {
                    console.log('🚨 === EMERGENCY DASHBOARD UPDATE ===');
                    
                    // Obtener elementos del dashboard
                    const elements = {
                        total: document.querySelector('#total-materials'),
                        discarded: document.querySelector('#discarded-materials'),
                        pending: document.querySelector('#pending-materials'),
                        progress: document.querySelector('#progress-percentage'),
                        progressBar: document.querySelector('#progress-bar')
                    };
                    
                    // Verificar que los elementos existan
                    const missingElements = Object.entries(elements)
                        .filter(([key, el]) => !el)
                        .map(([key]) => key);
                    
                    if (missingElements.length > 0) {
                        console.error('❌ Elementos faltantes:', missingElements);
                        return false;
                    }
                    
                    // Buscar la tabla directamente usando DataTables API
                    let table = null;
                    let total = 0;
                    let discarded = 0;
                    
                    // Método 1: Usar DataTables API si está disponible
                    if (window.$ && window.$.fn.DataTable) {
                        try {
                            table = window.$('#discards-table').DataTable();
                            if (table) {
                                // Obtener TODOS los datos, no solo los visibles
                                const allData = table.rows().data().toArray();
                                total = allData.length;
                                
                                // Contar los descartados
                                allData.forEach(function(rowData) {
                                    // Verificar el estado en la primera columna o en los datos
                                    if (Array.isArray(rowData)) {
                                        // Si es array, el estado está en la primera posición
                                        if (rowData[0] && rowData[0].includes('✅')) {
                                            discarded++;
                                        }
                                    } else if (typeof rowData === 'object') {
                                        // Si es objeto, buscar por propiedades
                                        if (rowData.status && rowData.status.includes('✅')) {
                                            discarded++;
                                        } else if (rowData.isDiscarded === true) {
                                            discarded++;
                                        }
                                    }
                                });
                                
                                console.log('📊 Usando DataTables API - Total:', total, 'Descartados:', discarded);
                            }
                        } catch (error) {
                            console.log('⚠️ DataTables API falló, usando método HTML:', error);
                            table = null;
                        }
                    }
                    
                    // Método 2: Fallback al HTML si DataTables no está disponible
                    if (!table || total === 0) {
                        const tableElement = document.querySelector('#discards-table tbody');
                        if (!tableElement) {
                            console.error('❌ Tabla no encontrada');
                            elements.total.textContent = 'Error';
                            elements.discarded.textContent = 'Error';
                            elements.pending.textContent = 'Error';
                            elements.progress.textContent = 'Error';
                            return false;
                        }
                        
                        // Contar filas HTML visibles (método anterior como fallback)
                        const rows = tableElement.querySelectorAll('tr');
                        total = 0;
                        discarded = 0;
                        
                        for (let row of rows) {
                            if (row.children.length > 0) {
                                total++;
                                const statusCell = row.querySelector('td:first-child');
                                if (statusCell && statusCell.textContent.includes('✅')) {
                                    discarded++;
                                }
                            }
                        }
                        
                        console.log('📊 Usando método HTML - Total:', total, 'Descartados:', discarded);
                    }
                    
                    const pending = total - discarded;
                    const percentage = total > 0 ? Math.round((discarded / total) * 100) : 0;
                    
                    // Actualizar elementos
                    elements.total.textContent = total;
                    elements.discarded.textContent = discarded;
                    elements.pending.textContent = pending;
                    elements.progress.textContent = percentage + '%';
                    
                    if (elements.progressBar) {
                        elements.progressBar.style.width = percentage + '%';
                        elements.progressBar.setAttribute('aria-valuenow', percentage);
                    }
                    
                    console.log('✅ Dashboard actualizado (emergencia):', {
                        total, discarded, pending, percentage: percentage + '%'
                    });
                    
                    return true;
                };
                
                // Función para probar todos los métodos disponibles
                window.testAllDashboardMethods = function() {
                    console.log('🧪 === TESTING ALL DASHBOARD METHODS ===');
                    
                    const results = {
                        emergency: false,
                        tableManager: false,
                        globalUpdate: false,
                        forceUpdate: false
                    };
                    
                    // Test 1: Emergency method
                    try {
                        results.emergency = window.emergencyDashboardUpdate();
                        console.log('✅ Emergency method:', results.emergency);
                    } catch (error) {
                        console.error('❌ Emergency method failed:', error);
                    }
                    
                    // Test 2: Table Manager method (usando getDashboardStats o updateDashboard)
                    try {
                        if (window.discardsTableManager && window.discardsTableManager.getDashboardStats) {
                            const stats = window.discardsTableManager.getDashboardStats();
                            console.log('📊 Table Manager getDashboardStats:', stats);
                            
                            // Aplicar stats al dashboard
                            const elements = {
                                total: document.querySelector('#total-materials'),
                                discarded: document.querySelector('#discarded-materials'),
                                pending: document.querySelector('#pending-materials'),
                                progress: document.querySelector('#progress-percentage')
                            };
                            
                            if (stats && elements.total) {
                                elements.total.textContent = stats.total || 0;
                                elements.discarded.textContent = stats.discarded || 0;
                                elements.pending.textContent = stats.pending || 0;
                                elements.progress.textContent = (stats.percentage || 0) + '%';
                            }
                            
                            results.tableManager = true;
                            console.log('✅ Table Manager method (getDashboardStats): true');
                        } else if (window.discardsTableManager && window.discardsTableManager.updateDashboard) {
                            window.discardsTableManager.updateDashboard();
                            results.tableManager = true;
                            console.log('✅ Table Manager method (updateDashboard): true');
                        } else {
                            console.log('❌ Table Manager method: ni getDashboardStats ni updateDashboard disponibles');
                        }
                    } catch (error) {
                        console.error('❌ Table Manager method failed:', error);
                    }
                    
                    // Test 3: Global update method
                    try {
                        if (window.forceTableManagerDashboardUpdate) {
                            results.globalUpdate = window.forceTableManagerDashboardUpdate();
                            console.log('✅ Global update method:', results.globalUpdate);
                        } else {
                            console.log('❌ Global update method: not available');
                        }
                    } catch (error) {
                        console.error('❌ Global update method failed:', error);
                    }
                    
                    // Test 4: Force update method
                    try {
                        if (window.forceDirectDashboardUpdate) {
                            results.forceUpdate = window.forceDirectDashboardUpdate();
                            console.log('✅ Force update method:', results.forceUpdate);
                        } else {
                            console.log('❌ Force update method: not available');
                        }
                    } catch (error) {
                        console.error('❌ Force update method failed:', error);
                    }
                    
                    console.log('🧪 === TEST RESULTS ===', results);
                    return results;
                };
                
                // Ejecutar test automático después de 5 segundos
                setTimeout(function() {
                    console.log('🔄 Ejecutando test automático de métodos...');
                    window.testAllDashboardMethods();
                }, 5000);
                
                // Auto-update usando método disponible cada 5 segundos
                setInterval(function() {
                    if (window.discardsTableManager && window.discardsTableManager.getDashboardStats) {
                        try {
                            const stats = window.discardsTableManager.getDashboardStats();
                            if (stats) {
                                const elements = {
                                    total: document.querySelector('#total-materials'),
                                    discarded: document.querySelector('#discarded-materials'),
                                    pending: document.querySelector('#pending-materials'),
                                    progress: document.querySelector('#progress-percentage'),
                                    progressBar: document.querySelector('#progress-bar')
                                };
                                
                                if (elements.total) {
                                    elements.total.textContent = stats.total || 0;
                                    elements.discarded.textContent = stats.discarded || 0;
                                    elements.pending.textContent = stats.pending || 0;
                                    elements.progress.textContent = (stats.percentage || 0) + '%';
                                    
                                    if (elements.progressBar) {
                                        elements.progressBar.style.width = (stats.percentage || 0) + '%';
                                    }
                                    
                                    console.log('🔄 Dashboard auto-actualizado (getDashboardStats):', stats);
                                }
                            }
                        } catch (error) {
                            console.log('⚠️ getDashboardStats falló, usando método de emergencia');
                            window.emergencyDashboardUpdate();
                        }
                    } else if (window.discardsTableManager && window.discardsTableManager.updateDashboard) {
                        try {
                            window.discardsTableManager.updateDashboard();
                            console.log('🔄 Dashboard auto-actualizado (updateDashboard)');
                        } catch (error) {
                            console.log('⚠️ updateDashboard falló, usando método de emergencia');
                            window.emergencyDashboardUpdate();
                        }
                    } else {
                        // Fallback al método de emergencia
                        window.emergencyDashboardUpdate();
                    }
                }, 5000);
                
                // Diagnóstico completo del dashboard cada 3 segundos
                function diagnosticDashboard() {
                    console.log('🔍 === DIAGNÓSTICO DASHBOARD ===');
                    
                    // Verificar elementos
                    const total = document.querySelector('#total-materials');
                    const discarded = document.querySelector('#discarded-materials');
                    const pending = document.querySelector('#pending-materials');
                    const progress = document.querySelector('#progress-percentage');
                    
                    console.log('📊 Elementos encontrados:', {
                        total: !!total,
                        discarded: !!discarded,
                        pending: !!pending,
                        progress: !!progress
                    });
                    
                    if (total) console.log('  Total actual:', total.textContent);
                    if (discarded) console.log('  Discarded actual:', discarded.textContent);
                    if (pending) console.log('  Pending actual:', pending.textContent);
                    if (progress) console.log('  Progress actual:', progress.textContent);
                    
                    // Verificar Table Manager con más detalle
                    if (window.discardsTableManager) {
                        console.log('🔧 Table Manager disponible');
                        console.log('📋 Métodos disponibles en Table Manager:', Object.keys(window.discardsTableManager));
                        console.log('🔍 getDashboardStats existe?', typeof window.discardsTableManager.getDashboardStats);
                        console.log('🔍 updateDashboard existe?', typeof window.discardsTableManager.updateDashboard);
                        
                        if (window.discardsTableManager.isInitialized && window.discardsTableManager.isInitialized()) {
                            console.log('✅ Table Manager inicializado');
                            
                            // Probar métodos disponibles confirmados por debugTableManagerAPI
                            try {
                                // Solo intentar métodos que sabemos que están disponibles
                                const availableMethods = Object.keys(window.discardsTableManager);
                                console.log('🔍 Métodos confirmados disponibles:', availableMethods);
                                
                                // Método 1: debugDashboard si está disponible
                                if (availableMethods.includes('debugDashboard')) {
                                    console.log('🔄 Intentando debugDashboard...');
                                    try {
                                        const debugResult = window.discardsTableManager.debugDashboard();
                                        console.log('� debugDashboard resultado:', debugResult);
                                        
                                        // Si debugDashboard devuelve stats, usarlas
                                        if (debugResult && debugResult.stats) {
                                            const stats = debugResult.stats;
                                            if (total && stats.total !== undefined) {
                                                total.textContent = stats.total;
                                                console.log('🔄 Total actualizado a:', stats.total);
                                            }
                                            if (discarded && stats.discarded !== undefined) {
                                                discarded.textContent = stats.discarded;
                                                console.log('🔄 Discarded actualizado a:', stats.discarded);
                                            }
                                            if (pending && stats.pending !== undefined) {
                                                pending.textContent = stats.pending;
                                                console.log('🔄 Pending actualizado a:', stats.pending);
                                            }
                                            if (progress && stats.percentage !== undefined) {
                                                progress.textContent = stats.percentage + '%';
                                                console.log('🔄 Progress actualizado a:', stats.percentage + '%');
                                            }
                                        }
                                    } catch (error) {
                                        console.error('❌ debugDashboard falló:', error);
                                    }
                                }
                                
                                // Método 2: Usar método de emergencia mejorado como respaldo
                                console.log('🔄 Ejecutando actualización de emergencia mejorada...');
                                window.emergencyDashboardUpdate();
                                console.log('✅ Actualización de emergencia completada');
                                
                            } catch (error) {
                                console.error('❌ Error en diagnóstico:', error);
                                console.error('Stack trace:', error.stack);
                            }
                        } else {
                            console.log('⏳ Table Manager no inicializado aún');
                        }
                    } else {
                        console.log('❌ Table Manager no disponible');
                    }
                    
                    console.log('🔍 === FIN DIAGNÓSTICO ===');
                }
                
                // Ejecutar diagnóstico cada 3 segundos
                setInterval(diagnosticDashboard, 3000);
                
                // Diagnóstico inicial
                setTimeout(diagnosticDashboard, 1000);
            })();
            </script>

            <table id="discards-table" class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th class="manage-column text-center">Estado</th>                       
                        <th class="manage-column text-center">Field</th>                      
                        <th class="manage-column text-center">Range</th>
                        <th class="manage-column text-center">Row</th>                       
                        <th class="manage-column text-center">Plot ID</th>
                        <th class="manage-column text-center">Subplot ID</th>
                        <th class="manage-column text-center">MATID</th>
                        <th class="manage-column text-center">Código</th>
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
            <div class="orion-modal-header"></div>
                <h3>Barcode already discarded</h3>
                <span class="orion-modal-close">&times;</span>
            </div>
            <div class="orion-modal-body">
                <p>The scanned barcode has already been discarded.</p>
                <p><strong>Barcode:</strong> <span id="duplicate-code-display"></span></p>
            </div>
            <div class="orion-modal-footer">
                <button type="button" class="button button-primary" id="modal-close-btn">
                OK
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
     * CORRECTED: Admin assets with same proper order - ONLY ON PLUGIN PAGES
     */
    public function enqueue_admin_assets($hook_suffix)
    {
        // ✅ SECURITY: Only load scripts on specific plugin pages or shortcode pages
        
        // Exit early for most admin pages that don't need our scripts
        $allowed_pages = [
            'toplevel_page_orion-discard',      // Main plugin page
            'orion-discard_page_settings',      // Settings subpage  
            'post.php',                         // Edit post page
            'post-new.php'                      // New post page
        ];
        
        // Quick exit for pages we definitely don't need
        if (!in_array($hook_suffix, $allowed_pages)) {

            return;

        }
        
        // For post edit pages, check if shortcode is present
        if (in_array($hook_suffix, ['post.php', 'post-new.php'])) {

            global $post;

            if (!is_a($post, 'WP_Post')) {

                return;

            }
            
            // Check if the post contains our shortcode
            if (!has_shortcode($post->post_content, 'orionDiscardForm')) {

                return;
            }
        }

        // ✅ If we reach this point, we're on a page that needs our scripts
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

   
    //  * Efficiently handle barcode validation and discard marking AJAX request
    //  */
    // public function handle_get_data_from_vForm_recordType_To_ValidateBarCode()
    // {
    //     // Security check
    //     if (
    //         empty($_POST['_ajax_nonce']) ||
    //         !wp_verify_nonce($_POST['_ajax_nonce'], 'orion_discard_nonce')
    //     ) {
    //         wp_send_json_error('Invalid nonce');
    //         return;
    //     }

    //     // Sanitize and validate input
    //     $site = sanitize_text_field($_POST['vdata_site'] ?? '');
    //     $year = sanitize_text_field($_POST['vdata_year'] ?? '');
    //     $form_type = sanitize_text_field($_POST['vform_record_type'] ?? '');
    //     $barcode_read = sanitize_text_field($_POST['barcode_Read'] ?? '');
    //     $field_selected = 'AB-RA'; // TODO: Make configurable

    //     if (!$site || !$year || !$form_type || !$field_selected || !$barcode_read) {
    //         wp_send_json_error('Missing required parameters');
    //         return;
    //     }

    //     // Query only posts that may contain the barcode
    //     $posts = get_posts([
    //         'post_type'      => 'vdata',
    //         'posts_per_page' => -1,
    //         'fields'         => 'ids',
    //         'meta_query'     => [
    //             'relation' => 'AND',
    //             [
    //                 'key'   => 'vdata-site',
    //                 'value' => $site,
    //             ],
    //             [
    //                 'key'   => 'vdata-year',
    //                 'value' => $year,
    //             ],
    //             [
    //                 'key'   => 'vform-record-type',
    //                 'value' => $form_type,
    //             ],
    //         ],
    //     ]);

    //     if (empty($posts)) {
    //         wp_send_json_error('No data found for the specified criteria');
    //         return;
    //     }

    //     // Efficient barcode search
    //     foreach ($posts as $post_id) {
    //         $content = get_post_field('post_content', $post_id);
    //         $data = json_decode($content, true);

    //         if (!is_array($data) || empty($data['barcd'])) {
    //             continue;
    //         }

    //         if ($data['barcd'] === $barcode_read) {
    //             // Already discarded?
    //             if (!empty($data['isDiscarded'])) {
    //                 wp_send_json_error([
    //                     'message' => 'Barcode already discarded',
    //                     'barcode' => $barcode_read,
    //                     'data'    => $data,
    //                 ]);
    //                 return;
    //             }

    //             // Mark as discarded
    //             $data['isDiscarded']   = true;
    //             $data['discarded_at']  = current_time('mysql');
    //             $data['discarded_by']  = get_current_user_id();

    //             $update = wp_update_post([
    //                 'ID'           => $post_id,
    //                 'post_content' => wp_json_encode($data),
    //             ], true);

    //             if (is_wp_error($update)) {
    //                 wp_send_json_error([
    //                     'message' => 'Failed to update discard status',
    //                     'error'   => $update->get_error_message(),
    //                 ]);
    //                 return;
    //             }

    //             wp_send_json_success([
    //                 'message'           => 'Barcode successfully marked as discarded',
    //                 'barcode'           => $barcode_read,
    //                 'post_id'           => $post_id,
    //                 'data'              => $data,
    //             ]);
    //             return;
    //         }
    //     }

    //     // Not found
    //     wp_send_json_error([
    //         'message' => 'Barcode not found',
    //         'barcode' => $barcode_read,
    //     ]);
    // }

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

                // ✅ CORRECCIÓN: Verificar usando isDiscarded como flag
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
     
                // ✅ CORRECCIÓN: Incluir post_id en la respuesta exitosa para identificar la fila correcta
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
