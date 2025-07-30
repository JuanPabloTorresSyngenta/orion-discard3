/**
 * CSV Handler for Orion Discard Plugin
 * Complete and precise implementation for field selection data loading
 * 
 * ARCHITECTURE:
 * - Monitors field dropdown changes with precision
 * - Loads data via API with comprehensive error handling
 * - Delegates all table operations to centralized manager
 * - Robust data processing and normalization
 * - User feedback and loading states
 */

jQuery(document).ready(function($) {
    'use strict';
    
    console.log('CSV Handler: Starting initialization');
    
    // ============================================================================
    // GLOBAL VARIABLES
    // ============================================================================
    
    let csvData = [];
    let isLoading = false;
    let currentFieldId = null;
    
    const site = orionDiscard.site || "PRSA";
    const year = orionDiscard.year || new Date().getFullYear();
    
    // ============================================================================
    // INITIALIZATION SEQUENCE
    // ============================================================================
    
    /**
     * Initialize CSV handler with dependency management
     */
    function initializeCsvHandler() {
        console.log('CSV Handler: Starting initialization sequence');
        
        // Wait for dependencies with timeout
        waitForDependencies(function(ready) {
            if (ready) {
                setupFieldMonitoring();
                setupDataProcessing();
                console.log('CSV Handler: Initialization complete');
            } else {
                console.error('CSV Handler: Failed to initialize - dependencies timeout');
                showMessage('Error: No se pudieron cargar las dependencias del sistema', 'error');
            }
        });
    }
    
    /**
     * Wait for required dependencies with comprehensive checking
     */
    function waitForDependencies(callback) {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max
        const checkInterval = 100;
        
        function checkDependencies() {
            attempts++;
            
            if (attempts > maxAttempts) {
                console.error('CSV Handler: Timeout waiting for dependencies');
                console.error('CSV Handler: Final dependency state:', getDependencyState());
                callback(false);
                return;
            }
            
            const dependencyState = getDependencyState();
            
            // Check if all required dependencies are available
            if (dependencyState.allReady) {
                console.log('CSV Handler: All dependencies ready');
                console.log('CSV Handler: Dependency state:', dependencyState);
                callback(true);
            } else {
                // Log progress every second
                if (attempts % 10 === 0) {
                    console.log(`CSV Handler: Waiting for dependencies (${attempts}/10s):`, dependencyState);
                }
                setTimeout(checkDependencies, checkInterval);
            }
        }
        
        checkDependencies();
    }
    
    /**
     * Get current dependency state
     */
    function getDependencyState() {
        const state = {
            tableManager: typeof window.discardsTableManager !== 'undefined',
            factory: typeof window.Factory !== 'undefined',
            ajax: typeof window.ajax_getDataFrom_vFromRecordType !== 'undefined',
            httpMethods: typeof window.HTTP_METHODS !== 'undefined',
            tableElement: $('#discards-table').length > 0,
            fieldsDropdown: $('#fields').length > 0
        };
        
        state.allReady = Object.values(state).every(ready => ready);
        
        return state;
    }
    
    // ============================================================================
    // FIELD MONITORING SYSTEM
    // ============================================================================
    
    /**
     * Setup field dropdown monitoring with advanced event handling
     */
    function setupFieldMonitoring() {
        console.log('CSV Handler: Setting up comprehensive field monitoring');
        
        // Use event delegation for robustness
        $(document).on('change', '#fields', function() {
            const selectedField = $(this).val();
            const fieldName = $(this).find('option:selected').text();
            
            console.log('CSV Handler: Field changed to:', selectedField, '(' + fieldName + ')');
            
            // Update current field tracking
            currentFieldId = selectedField;
            
            if (selectedField && selectedField !== '') {
                handleFieldSelection(selectedField, fieldName);
            } else {
                handleFieldDeselection();
            }
        });
        
        // Also monitor for programmatic changes
        $(document).on('change blur', '#fields', function() {
            // Double-check for any missed changes
            const currentVal = $(this).val();
            if (currentVal !== currentFieldId) {
                $(this).trigger('change');
            }
        });
        
        console.log('CSV Handler: Field monitoring setup complete');
    }
    
    /**
     * Handle field selection
     */
    function handleFieldSelection(fieldId, fieldName) {
        console.log('CSV Handler: Handling field selection:', fieldId);
        
        // Prevent multiple simultaneous loads
        if (isLoading) {
            console.warn('CSV Handler: Already loading data, ignoring duplicate request');
            return;
        }
        
        // Show immediate feedback
        showMessage(`Cargando datos para el campo: ${fieldName}`, 'info');
        
        // Clear existing data first
        clearTableData();
        
        // Load new data
        loadFieldData(fieldId, fieldName);
    }
    
    /**
     * Handle field deselection
     */
    function handleFieldDeselection() {
        console.log('CSV Handler: Handling field deselection');
        
        // Cancel any ongoing load
        isLoading = false;
        
        // Clear data and table
        clearTableData();
        
        // Reset state
        currentFieldId = null;
        csvData = [];
        
        showMessage('Seleccione un campo para ver los datos', 'info');
    }
    
    // ============================================================================
    // DATA LOADING SYSTEM
    // ============================================================================
    
    /**
     * Load data for selected field with comprehensive error handling
     */
    function loadFieldData(fieldId, fieldName) {
        console.log('CSV Handler: Loading data for field:', fieldId);
        
        // Set loading state
        isLoading = true;
        showLoadingIndicator(true);
        
        try {
            // Build AJAX parameters using factory
            const ajaxParams = window.Factory.BuildAjaxParamToDownloadVFormRecordTypeData(
                "orion-discard",
                site,
                year,
                "get_data_from_vForm_recordType"
            );
            
            console.log('CSV Handler: AJAX parameters built:', ajaxParams);
            
            // Make API call with comprehensive callbacks
            window.ajax_getDataFrom_vFromRecordType(
                ajaxParams,
                window.HTTP_METHODS.POST,
                function(response) {
                    // Success callback
                    handleApiSuccess(response, fieldId, fieldName);
                },
                function(error) {
                    // Error callback
                    handleApiError(error, fieldId, fieldName);
                },
                function() {
                    // Complete callback
                    handleApiComplete();
                }
            );
            
        } catch (error) {
            console.error('CSV Handler: Error setting up API call:', error);
            handleApiError(error, fieldId, fieldName);
            handleApiComplete();
        }
    }
    
    /**
     * Handle successful API response
     */
    function handleApiSuccess(response, fieldId, fieldName) {
        console.log('CSV Handler: API success for field:', fieldId);
        console.log('CSV Handler: Response received:', response);
        
        try {
            processApiResponse(response, fieldName);
        } catch (error) {
            console.error('CSV Handler: Error processing API response:', error);
            showMessage(`Error al procesar datos del campo ${fieldName}: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle API error
     */
    function handleApiError(error, fieldId, fieldName) {
        console.error('CSV Handler: API error for field:', fieldId, error);
        
        const errorMessage = error && error.message ? error.message : 'Error desconocido';
        showMessage(`Error al cargar datos del campo ${fieldName}: ${errorMessage}`, 'error');
        
        // Provide retry option
        setTimeout(function() {
            if (currentFieldId === fieldId && confirm(`¿Desea intentar cargar los datos del campo "${fieldName}" nuevamente?`)) {
                loadFieldData(fieldId, fieldName);
            }
        }, 2000);
    }
    
    /**
     * Handle API call completion
     */
    function handleApiComplete() {
        console.log('CSV Handler: API call completed');
        isLoading = false;
        showLoadingIndicator(false);
    }
    
    // ============================================================================
    // DATA PROCESSING SYSTEM
    // ============================================================================
    
    /**
     * Setup data processing configuration
     */
    function setupDataProcessing() {
        console.log('CSV Handler: Setting up data processing');
        
        // Configure processing parameters
        window.csvProcessingConfig = {
            maxRecords: 10000, // Prevent memory issues
            requiredFields: ['id', 'barcd'], // Minimum required fields
            defaultStatus: '❌',
            timeoutMs: 30000 // Processing timeout
        };
        
        console.log('CSV Handler: Data processing setup complete');
    }
    
    /**
     * Process API response with comprehensive data handling
     */
    function processApiResponse(response, fieldName) {
        console.log('CSV Handler: Processing API response');
        
        let records = [];
        
        try {
            // Extract data from various response formats
            records = extractDataFromResponse(response);
            
            // Validate extracted data
            validateExtractedData(records);
            
            // Process and normalize records
            const processedData = processRecords(records);
            
            // Store processed data
            csvData = processedData;
            
            // Update table with new data
            updateTableWithProcessedData(processedData, fieldName);
            
            console.log('CSV Handler: Data processing completed successfully');
            
        } catch (error) {
            console.error('CSV Handler: Data processing error:', error);
            throw error; // Re-throw to be handled by caller
        }
    }
    
    /**
     * Extract data from various response formats
     */
    function extractDataFromResponse(response) {
        console.log('CSV Handler: Extracting data from response');
        
        let records = [];
        
        // Handle different response structures
        if (response && response.data && response.data.csv_content) {
            records = response.data.csv_content;
            console.log('CSV Handler: Extracted from response.data.csv_content');
        } else if (response && response.csv_content) {
            records = response.csv_content;
            console.log('CSV Handler: Extracted from response.csv_content');
        } else if (response && response.data) {
            records = response.data;
            console.log('CSV Handler: Extracted from response.data');
        } else if (Array.isArray(response)) {
            records = response;
            console.log('CSV Handler: Used response directly as array');
        } else {
            throw new Error('Formato de respuesta no reconocido');
        }
        
        // Handle string data (parse JSON if needed)
        if (typeof records === 'string') {
            try {
                records = JSON.parse(records);
                console.log('CSV Handler: Parsed JSON string');
            } catch (parseError) {
                throw new Error('Error al analizar datos JSON: ' + parseError.message);
            }
        }
        
        return records;
    }
    
    /**
     * Validate extracted data
     */
    function validateExtractedData(records) {
        console.log('CSV Handler: Validating extracted data');
        
        // Ensure we have an array
        if (!Array.isArray(records)) {
            throw new Error('Los datos extraídos no están en formato de array');
        }
        
        // Check for reasonable data size
        if (records.length === 0) {
            throw new Error('No hay datos disponibles para el campo seleccionado');
        }
        
        if (records.length > window.csvProcessingConfig.maxRecords) {
            throw new Error(`Demasiados registros (${records.length}), máximo permitido: ${window.csvProcessingConfig.maxRecords}`);
        }
        
        console.log('CSV Handler: Data validation passed -', records.length, 'records');
    }
    
    /**
     * Process and normalize records
     */
    function processRecords(records) {
        console.log('CSV Handler: Processing and normalizing', records.length, 'records');
        
        const processedRecords = records.map(function(record, index) {
            try {
                return normalizeRecord(record, index);
            } catch (error) {
                console.warn(`CSV Handler: Error processing record ${index}:`, error);
                // Return a minimal valid record
                return {
                    id: 'error_' + index,
                    status: '❌',
                    field: '',
                    range_val: '',
                    row_val: '',
                    plot_id: '',
                    subplot_id: '',
                    matid: '',
                    barcd: 'ERROR_' + index,
                    _error: error.message
                };
            }
        });
        
        console.log('CSV Handler: Record processing complete');
        return processedRecords;
    }
    
    /**
     * Normalize individual record
     */
    function normalizeRecord(record, index) {
        // Generate unique ID if missing
        const id = record.id || 
                   record.record_id || 
                   record.post_id || 
                   ('record_' + Date.now() + '_' + index);
        
        // Normalize all fields with proper defaults
        return {
            id: id,
            status: record.status || window.csvProcessingConfig.defaultStatus,
            field: String(record.field || '').trim(),
            range_val: String(record.range_val || record.range || '').trim(),
            row_val: String(record.row_val || record.row || '').trim(),
            plot_id: String(record.plot_id || '').trim(),
            subplot_id: String(record.subplot_id || '').trim(),
            matid: String(record.matid || '').trim(),
            barcd: String(record.barcd || record.barcode || '').trim(),
            
            // Additional metadata
            _original: record,
            _processed_at: new Date().toISOString()
        };
    }
    
    // ============================================================================
    // TABLE INTEGRATION SYSTEM
    // ============================================================================
    
    /**
     * Update table with processed data
     */
    function updateTableWithProcessedData(data, fieldName) {
        console.log('CSV Handler: Updating table with', data.length, 'processed records');
        
        // Verify table manager availability
        if (!verifyTableManager()) {
            throw new Error('Gestor de tabla no disponible');
        }
        
        try {
            // Update table via centralized manager
            const updateResult = window.discardsTableManager.updateTableData(data);
            
            if (updateResult) {
                console.log('CSV Handler: Table update successful');
                showMessage(`✅ Datos cargados para ${fieldName}: ${data.length} registros`, 'success');
                
                // Show additional statistics
                showDataStatistics(data, fieldName);
                
            } else {
                throw new Error('La actualización de la tabla falló');
            }
            
        } catch (error) {
            console.error('CSV Handler: Table update error:', error);
            throw new Error('Error al actualizar la tabla: ' + error.message);
        }
    }
    
    /**
     * Verify table manager is ready
     */
    function verifyTableManager() {
        if (!window.discardsTableManager) {
            console.error('CSV Handler: Table manager not available');
            return false;
        }
        
        if (!window.discardsTableManager.isInitialized()) {
            console.error('CSV Handler: Table manager not initialized');
            return false;
        }
        
        return true;
    }
    
    /**
     * Show data statistics
     */
    function showDataStatistics(data, fieldName) {
        const stats = {
            total: data.length,
            withBarcodes: data.filter(r => r.barcd && r.barcd.length > 0).length,
            withoutBarcodes: data.filter(r => !r.barcd || r.barcd.length === 0).length
        };
        
        console.log('CSV Handler: Data statistics:', stats);
        
        if (stats.withoutBarcodes > 0) {
            showMessage(`Advertencia: ${stats.withoutBarcodes} registros sin código de barras`, 'warning');
        }
    }
    
    /**
     * Clear table data with verification
     */
    function clearTableData() {
        console.log('CSV Handler: Clearing table data');
        
        // Clear local data
        csvData = [];
        
        // Clear table via manager if available
        if (window.discardsTableManager && window.discardsTableManager.isInitialized()) {
            const clearResult = window.discardsTableManager.clearTable();
            if (clearResult) {
                console.log('CSV Handler: Table cleared successfully');
            } else {
                console.warn('CSV Handler: Table clear operation failed');
            }
        } else {
            console.warn('CSV Handler: Table manager not available for clearing');
        }
    }
    
    // ============================================================================
    // UI UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Show/hide loading indicator with enhanced styling
     */
    function showLoadingIndicator(show) {
        const loadingId = 'csv-loading-indicator';
        
        if (show) {
            // Remove existing indicator
            $('#' + loadingId).remove();
            
            // Create new loading indicator
            const $loading = $(`
                <div id="${loadingId}" class="csv-loading-indicator" style="
                    text-align: center; 
                    padding: 20px; 
                    background: linear-gradient(90deg, #f0f8ff, #e6f3ff);
                    border: 2px solid #4CAF50; 
                    border-radius: 8px;
                    margin: 10px 0; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    animation: pulse 2s infinite;
                ">
                    <div style="font-size: 18px; color: #2E7D32;">
                        🔄 <strong>Cargando datos...</strong>
                    </div>
                    <div style="font-size: 14px; color: #555; margin-top: 5px;">
                        Por favor espere mientras se cargan los registros
                    </div>
                </div>
            `);
            
            // Insert before table
            $('#discards-table').before($loading);
            
            // Add CSS animation if not already present
            if (!$('#csv-loading-styles').length) {
                $('head').append(`
                    <style id="csv-loading-styles">
                        @keyframes pulse {
                            0% { opacity: 1; }
                            50% { opacity: 0.7; }
                            100% { opacity: 1; }
                        }
                    </style>
                `);
            }
            
        } else {
            // Remove loading indicator with fade effect
            $('#' + loadingId).fadeOut(500, function() {
                $(this).remove();
            });
        }
    }
    
    /**
     * Show message to user with enhanced functionality
     */
    function showMessage(message, type = 'info') {
        console.log(`CSV Handler Message [${type}]: ${message}`);
        
        // Use global message function if available
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else if (typeof window.orionDiscardApp?.showMessage === 'function') {
            window.orionDiscardApp.showMessage(message, type);
        } else {
            // Enhanced fallback notification system
            showFallbackMessage(message, type);
        }
    }
    
    /**
     * Fallback message system
     */
    function showFallbackMessage(message, type) {
        const alertClass = type === 'error' ? 'alert-danger' : 
                           type === 'success' ? 'alert-success' : 
                           type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const icon = type === 'error' ? '❌' : 
                    type === 'success' ? '✅' : 
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        const $alert = $(`
            <div class="alert ${alertClass} alert-dismissible fade show csv-message" role="alert" style="
                margin: 10px 0; 
                border-radius: 6px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <strong>${icon}</strong> ${message}
                <button type="button" class="btn-close" onclick="$(this).parent().fadeOut();" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    float: right;
                    cursor: pointer;
                ">&times;</button>
            </div>
        `);
        
        // Find best container for message
        let $container = $('#csv-messages');
        if ($container.length === 0) {
            $container = $('#vform-container');
        }
        if ($container.length === 0) {
            $container = $('body');
        }
        
        $container.prepend($alert);
        
        // Auto-remove after delay
        const delay = type === 'error' ? 10000 : type === 'success' ? 5000 : 7000;
        setTimeout(function() {
            $alert.fadeOut(function() {
                $(this).remove();
            });
        }, delay);
    }
    
    // ============================================================================
    // DIAGNOSTIC AND UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Get current handler state for debugging
     */
    function getHandlerState() {
        return {
            isLoading: isLoading,
            currentFieldId: currentFieldId,
            csvDataLength: csvData.length,
            dependencies: getDependencyState(),
            tableManager: {
                available: typeof window.discardsTableManager !== 'undefined',
                initialized: window.discardsTableManager ? window.discardsTableManager.isInitialized() : false
            }
        };
    }
    
    /**
     * Run comprehensive diagnostic
     */
    function runDiagnostic() {
        console.group('🔍 CSV HANDLER DIAGNOSTIC');
        
        console.log('📋 Current State:', getHandlerState());
        console.log('📊 Data Info:', {
            recordCount: csvData.length,
            sampleRecord: csvData.length > 0 ? csvData[0] : null
        });
        console.log('🔧 Configuration:', window.csvProcessingConfig);
        
        console.groupEnd();
        
        return getHandlerState();
    }
    
    // ============================================================================
    // INITIALIZATION TRIGGER
    // ============================================================================
    
    // Initialize with delay to ensure DOM and dependencies are ready
    setTimeout(initializeCsvHandler, 1200);
    
    console.log('CSV Handler: Module loaded, initialization scheduled');
    
    // ============================================================================
    // GLOBAL EXPORTS
    // ============================================================================
    
    // Export comprehensive API for external access and debugging
    window.csvHandler = {
        // Data access
        getCsvData: function() { return csvData.slice(); }, // Return copy
        getCurrentFieldId: function() { return currentFieldId; },
        getDataCount: function() { return csvData.length; },
        
        // Operations
        loadFieldData: loadFieldData,
        clearTableData: clearTableData,
        updateTable: function() { 
            if (csvData.length > 0) {
                updateTableWithProcessedData(csvData, 'Current Field');
            }
        },
        
        // State management
        isLoading: function() { return isLoading; },
        getHandlerState: getHandlerState,
        
        // Diagnostic
        runDiagnostic: runDiagnostic,
        getDependencyState: getDependencyState,
        
        // Utility
        showMessage: showMessage,
        showLoadingIndicator: showLoadingIndicator
    };
    
    console.log('CSV Handler: Global exports configured');
});