/**
 * CSV Handler for Orion Discard Plugin
 * Optimized implementation with improved efficiency and maintainability
 * 
 * FEATURES:
 * - ES6 Class-based architecture for better organization
 * - Optimized dependency management and loading
 * - Enhanced error handling with retry mechanisms
 * - Memory-efficient data processing
 * - Debounced field selection for performance
 * 
 * SECURITY & DATA HANDLING:
 * - Barcode data is stored internally and hidden from user interface
 * - Only essential data fields are visible to users in the table
 * - Scanner functionality uses internal barcode validation
 * - Post_id and barcode mapping preserved for system functionality
 */

jQuery(document).ready(function($) {
    'use strict';
    
    // ✅ SECURITY: Only execute on Orion Discard plugin pages
    if (!isOrionDiscardPage()) {
        return; // Exit early if not on the correct page
    }
    
    console.log('CSV Handler: Initializing optimized handler for Orion Discard plugin');
    
    /**
     * Check if we're on an Orion Discard plugin page
     * Enhanced security verification with multiple layers
     * @returns {boolean} True if on plugin page
     */
    function isOrionDiscardPage() {
        // PRIMARY CHECKS: Critical plugin elements that MUST exist
        const criticalChecks = [
            $('#discards-table').length > 0,                  // Main discards table
            typeof orionDiscard !== 'undefined' && orionDiscard.ajaxUrl  // Plugin config with AJAX URL
        ];
        
        // SECONDARY CHECKS: Additional validation
        const secondaryChecks = [
            $('.orion-discard-admin-form').length > 0,        // Admin form exists  
            $('[data-orion-discard]').length > 0,             // Plugin data attributes
            $('body').hasClass('orion-discard-page'),          // Body has plugin class
            $('.orion-discard-container').length > 0,         // Plugin container exists
            window.location.href.includes('orion-discard'),   // URL contains plugin name
            $('[id*="orion-discard"]').length > 0             // Any element with plugin ID
        ];
        
        // STRICT VALIDATION: At least one critical check AND one secondary check must pass
        const hasCritical = criticalChecks.some(check => check === true);
        const hasSecondary = secondaryChecks.some(check => check === true);
        
        const isValid = hasCritical && hasSecondary;
        
        if (!isValid) {
            console.log('Orion Discard CSV Handler: Not on plugin page, exiting');
        }
        
        return isValid;
    }
    
    /**
     * Main CSV Handler Class
     * Encapsulates all CSV handling functionality with improved efficiency
     */
    class CSVHandler {
        constructor() {
            // Core state
            this.csvData = [];
            this.isLoading = false;
            this.currentFieldId = null;
            this.loadingTimeout = null;
            
            // Configuration
            this.config = {
                site: orionDiscard?.site || "PRSA",
                year: orionDiscard?.year || new Date().getFullYear(),
                maxRecords: 10000,
                defaultStatus: '❌',
                debounceDelay: 300,
                retryAttempts: 3,
                retryDelay: 1000
            };
            
            // Dependencies cache
            this.dependencies = new Map();
            this.isInitialized = false;
            
            // Bind methods to maintain context
            this.handleFieldChange = this.handleFieldChange.bind(this);
            this.loadFieldData = this.loadFieldData.bind(this);
        }
    
        
        /**
         * Initialize the CSV handler with optimized dependency checking
         */
        async initialize() {
            console.log('CSV Handler: Starting optimized initialization');
            
            try {
                await this.waitForDependencies();
                this.setupFieldMonitoring();
                this.setupDataProcessing();
                this.isInitialized = true;
                console.log('CSV Handler: Initialization complete');
                return true;
            } catch (error) {
                console.error('CSV Handler: Initialization failed:', error);
                this.showMessage('Error: No se pudieron cargar las dependencias del sistema', 'error');
                return false;
            }
        }
        
        /**
         * Optimized dependency checking with Promise-based approach
         */
        async waitForDependencies(maxWaitTime = 10000) {
            const startTime = Date.now();
            const checkInterval = 100;
            
            return new Promise((resolve, reject) => {
                const checkDependencies = () => {
                    const elapsed = Date.now() - startTime;
                    
                    if (elapsed > maxWaitTime) {
                        reject(new Error('Timeout waiting for dependencies'));
                        return;
                    }
                    
                    if (this.areDependenciesReady()) {
                        console.log('CSV Handler: Dependencies ready in', elapsed, 'ms');
                        resolve(true);
                    } else {
                        setTimeout(checkDependencies, checkInterval);
                    }
                };
                
                checkDependencies();
            });
        }
        
        /**
         * Efficient dependency state checking with caching
         */
        areDependenciesReady() {
            const requiredDeps = {
                tableManager: () => window.discardsTableManager?.isInitialized?.(),
                factory: () => typeof window.Factory !== 'undefined',
                ajax: () => typeof window.ajax_getDataFrom_vFromRecordType !== 'undefined',
                httpMethods: () => typeof window.HTTP_METHODS !== 'undefined',
                elements: () => $('#discards-table').length > 0 && $('#fields').length > 0
            };
            
            // Cache dependency states to avoid repeated DOM queries
            for (const [key, checkFn] of Object.entries(requiredDeps)) {
                if (!this.dependencies.has(key)) {
                    this.dependencies.set(key, checkFn());
                }
            }
            
            return Array.from(this.dependencies.values()).every(ready => ready);
        }
    
        
        /**
         * Setup optimized field monitoring with debouncing
         */
        setupFieldMonitoring() {
            console.log('CSV Handler: Setting up optimized field monitoring');
            
            // Use debounced handler to prevent excessive API calls
            const debouncedHandler = this.debounce(this.handleFieldChange, this.config.debounceDelay);
            
            // Event delegation for robustness
            $(document).off('change.csvHandler', '#fields');
            $(document).on('change.csvHandler', '#fields', debouncedHandler);
            
            // Monitor programmatic changes
            $(document).off('input.csvHandler', '#fields');
            $(document).on('input.csvHandler', '#fields', debouncedHandler);
            
            console.log('CSV Handler: Field monitoring setup complete');
        }
        
        /**
         * Optimized field change handler with validation
         */
        handleFieldChange(event) {
            const $field = $(event.target);
            const selectedField = $field.val();
            const fieldName = $field.find('option:selected').text();
            
            console.log('CSV Handler: Field changed to:', selectedField, '(' + fieldName + ')');
            
            // Clear any pending loads
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            // Update current field tracking
            this.currentFieldId = selectedField;
            
            if (selectedField && selectedField !== '') {
                this.handleFieldSelection(selectedField, fieldName);
            } else {
                this.handleFieldDeselection();
            }
        }
        
        /**
         * Handle field selection with optimized loading
         */
        handleFieldSelection(fieldId, fieldName) {
            console.log('CSV Handler: Handling field selection:', fieldId);
            
            // Prevent multiple simultaneous loads
            if (this.isLoading) {
                console.warn('CSV Handler: Load in progress, cancelling');
                return;
            }
            
            // Show immediate feedback
            this.showMessage(`Cargando datos para: ${fieldName}`, 'info');
            
            // Clear existing data efficiently
            this.clearData();
            
            // Load new data with small delay for UX
            this.loadingTimeout = setTimeout(() => {
                this.loadFieldData(fieldId, fieldName);
            }, 100);
        }
        
        /**
         * Handle field deselection efficiently
         */
        handleFieldDeselection() {
            console.log('CSV Handler: Handling field deselection');
            
            // Cancel any pending operations
            this.cancelPendingOperations();
            
            // Clear data and reset state
            this.clearData();
            this.currentFieldId = null;
            
            this.showMessage('Seleccione un campo para ver los datos', 'info');
        }
    
        
        /**
         * Load field data with enhanced error handling and retry logic
         */
        async loadFieldData(fieldId, fieldName, retryCount = 0) {
            console.log('CSV Handler: Loading data for field:', fieldId, 'Attempt:', retryCount + 1);
            
            // Set loading state
            this.isLoading = true;
            this.showLoadingIndicator(true);
            
            try {
                // Build AJAX parameters
                const ajaxParams = window.Factory.BuildAjaxParamToDownloadVFormRecordTypeData(
                    "orion-discard",
                    this.config.site,
                    this.config.year,
                    "get_data_from_vForm_recordType"
                );
                
                console.log('CSV Handler: AJAX parameters built:', ajaxParams);
                
                // Make API call with Promise wrapper for better error handling
                const response = await this.makeApiCall(ajaxParams);
                await this.handleApiSuccess(response, fieldId, fieldName);
                
            } catch (error) {
                console.error('CSV Handler: Load error:', error);
                
                // Implement retry logic
                if (retryCount < this.config.retryAttempts) {
                    console.log(`CSV Handler: Retrying in ${this.config.retryDelay}ms...`);
                    setTimeout(() => {
                        this.loadFieldData(fieldId, fieldName, retryCount + 1);
                    }, this.config.retryDelay);
                } else {
                    this.handleApiError(error, fieldId, fieldName);
                }
            } finally {
                this.isLoading = false;
                this.showLoadingIndicator(false);
            }
        }
        
        /**
         * Promise-based API call wrapper
         */
        makeApiCall(ajaxParams) {
            return new Promise((resolve, reject) => {
                window.ajax_getDataFrom_vFromRecordType(
                    ajaxParams,
                    window.HTTP_METHODS.POST,
                    resolve,   // Success callback
                    reject,    // Error callback
                    () => {}   // Complete callback (handled in finally)
                );
            });
        }
        
        /**
         * Handle successful API response with optimized processing
         */
        async handleApiSuccess(response, fieldId, fieldName) {
            console.log('CSV Handler: API success for field:', fieldId);
            
            try {
                const processedData = await this.processApiResponse(response, fieldName);
                await this.updateTableWithData(processedData, fieldName);
                
                this.showMessage(`✅ Datos cargados: ${processedData.length} registros`, 'success');
                
            } catch (error) {
                console.error('CSV Handler: Processing error:', error);
                this.showMessage(`Error al procesar datos: ${error.message}`, 'error');
            }
        }
        
        /**
         * Enhanced error handling with user-friendly messages
         */
        handleApiError(error, fieldId, fieldName) {
            const errorMessage = this.getErrorMessage(error);
            console.error('CSV Handler: API error for field:', fieldId, errorMessage);
            
            this.showMessage(`Error al cargar datos de "${fieldName}": ${errorMessage}`, 'error');
        }
        
        /**
         * Extract user-friendly error messages
         */
        getErrorMessage(error) {
            if (error?.responseJSON?.message) return error.responseJSON.message;
            if (error?.message) return error.message;
            if (typeof error === 'string') return error;
            return 'Error desconocido del servidor';
        }
    
        
        /**
         * Setup optimized data processing configuration
         */
        setupDataProcessing() {
            console.log('CSV Handler: Setting up optimized data processing');
            
            // Configure processing parameters
            window.csvProcessingConfig = {
                maxRecords: this.config.maxRecords,
                requiredFields: ['id', 'barcd'],
                defaultStatus: this.config.defaultStatus,
                timeoutMs: 30000
            };
            
            console.log('CSV Handler: Data processing setup complete');
        }
        
        /**
         * Process API response with memory-efficient handling and post_id validation
         */
        async processApiResponse(response, fieldName) {
            console.log('CSV Handler: Processing API response with post_id validation');
            
            try {
                // Extract and validate data
                const rawRecords = this.extractDataFromResponse(response);
                this.validateExtractedData(rawRecords);
                
                // Process records in chunks for better performance
                const processedData = await this.processRecordsInChunks(rawRecords);
                
                // Validate post_id integrity in processed data
                const integrityCheck = this.validatePostIdIntegrity(processedData);
                if (!integrityCheck.valid) {
                    console.warn('CSV Handler: Data integrity issues detected:', integrityCheck.issues);
                    this.showMessage(`⚠️ Se detectaron ${integrityCheck.issues.length} problemas de integridad de datos`, 'warning');
                }
                
                // Store processed data
                this.csvData = processedData;
                
                console.log('CSV Handler: Data processing completed successfully');
                console.log('CSV Handler: Sample processed record:', processedData[0]);
                
                return processedData;
                
            } catch (error) {
                console.error('CSV Handler: Data processing error:', error);
                throw error;
            }
        }
        
        /**
         * Extract data from various response formats efficiently
         */
        extractDataFromResponse(response) {
            console.log('CSV Handler: Extracting data from response');
            
            // Define extraction strategies
            const extractors = [
                r => r?.data?.csv_content,
                r => r?.csv_content,
                r => r?.data,
                r => Array.isArray(r) ? r : null
            ];
            
            let records = null;
            
            // Try each extraction strategy
            for (const extractor of extractors) {
                records = extractor(response);
                if (records) break;
            }
            
            if (!records) {
                throw new Error('Formato de respuesta no reconocido');
            }
            
            // Handle string data (parse JSON if needed)
            if (typeof records === 'string') {
                try {
                    records = JSON.parse(records);
                } catch (parseError) {
                    throw new Error('Error al analizar datos JSON: ' + parseError.message);
                }
            }
            
            console.log('CSV Handler: Extracted', records?.length || 0, 'records');
            return records;
        }
        
        /**
         * Validate extracted data with comprehensive checks
         */
        validateExtractedData(records) {
            if (!Array.isArray(records)) {
                throw new Error('Los datos extraídos no están en formato de array');
            }
            
            if (records.length === 0) {
                throw new Error('No hay datos disponibles para el campo seleccionado');
            }
            
            if (records.length > this.config.maxRecords) {
                throw new Error(`Demasiados registros (${records.length}), máximo: ${this.config.maxRecords}`);
            }
            
            console.log('CSV Handler: Data validation passed -', records.length, 'records');
        }
        
        /**
         * Process records in chunks for better performance and memory usage
         */
        async processRecordsInChunks(records, chunkSize = 1000) {
            console.log('CSV Handler: Processing', records.length, 'records in chunks');
            
            const processedRecords = [];
            
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize);
                const processedChunk = chunk.map((record, index) => 
                    this.normalizeRecord(record, i + index)
                );
                
                processedRecords.push(...processedChunk);
                
                // Allow UI to breathe between chunks
                if (processedRecords.length % chunkSize === 0) {
                    await this.sleep(1);
                }
            }
            
            console.log('CSV Handler: Record processing complete');
            return processedRecords;
        }
        
        /**
         * Normalize individual record with enhanced post_id preservation
         * CRITICAL: Must preserve post_id and barcode for scanning functionality
         * NOTE: Barcode is stored internally and not displayed in user interface
         * IMPORTANT: Handle pre-discarded materials (isDiscarded: true)
         */
        normalizeRecord(record, index) {
            // Enhanced post_id handling - preserve original post_id for scanning
            const postId = record.post_id || record.id || record.record_id || `record_${index}_${Date.now()}`;
            const recordId = record.id || record.record_id || postId;
            
            // CRITICAL: Extract and preserve barcode for internal scanner functionality
            // Barcode is hidden from users but essential for scanning operations
            const internalBarcode = String(record.barcd || record.barcode || '').trim();
            
            // IMPORTANT: Handle pre-discarded materials
            // If isDiscarded is true, set status to ✅ immediately
            const isAlreadyDiscarded = record.isDiscarded === true || record.isDiscarded === 'true' || record.isDiscarded === 1;
            const recordStatus = isAlreadyDiscarded ? '✅' : (record.status || this.config.defaultStatus);
            
            return {
                // Primary identifiers - CRITICAL for scanning functionality
                id: recordId,
                post_id: record.post_id || postId, // ALWAYS preserve post_id
                record_id: record.record_id || recordId,
                
                // Status and visible display fields
                status: recordStatus, // Set ✅ for already discarded materials
                field: String(record.field || '').trim(),
                range_val: String(record.range_val || record.range || '').trim(),
                row_val: String(record.row_val || record.row || '').trim(),
                plot_id: String(record.plot_id || '').trim(),
                subplot_id: String(record.subplot_id || '').trim(),
                matid: String(record.matid || '').trim(),
                
                // INTERNAL DATA - Hidden from user interface but essential for functionality
                barcd: internalBarcode, // Internal barcode - hidden from users, used by scanner
                
                // Additional metadata for debugging and tracking
                isDiscarded: isAlreadyDiscarded, // Preserve discarded state
                _originalPostId: record.post_id, // Keep original for debugging
                _originalBarcode: record.barcd, // Keep original barcode for debugging
                _originalIsDiscarded: record.isDiscarded, // Keep original discarded state for debugging
                _processedAt: new Date().toISOString(),
                _processingIndex: index,
                _isInternalData: true, // Flag to identify processed records
                _wasPreDiscarded: isAlreadyDiscarded // Flag to identify pre-discarded materials
            };
        }
    
        
        /**
         * Update table with processed data - simplified version
         */
        async updateTableWithData(data, fieldName) {
            console.log('CSV Handler: Updating table with', data.length, 'processed records');
            
            // Simple verification
            if (!this.verifyTableManager()) {
                throw new Error('Gestor de tabla no disponible o no inicializado');
            }
            
            try {
                // Basic validation
                if (!Array.isArray(data)) {
                    throw new Error('Los datos procesados no están en formato de array');
                }
                
                if (data.length === 0) {
                    console.warn('CSV Handler: No data to update table with');
                    return true;
                }
                
                // Call table manager directly
                console.log('CSV Handler: Calling table manager updateTableData...');
                console.log('CSV Handler: Data being sent to table manager:', {
                    length: data.length,
                    sample: data.slice(0, 2),
                    dataType: typeof data,
                    isArray: Array.isArray(data)
                });
                
                const updateResult = window.discardsTableManager.updateTableData(data);
                console.log('CSV Handler: Table manager updateTableData result:', updateResult);
                
                if (!updateResult) {
                    console.error('CSV Handler: Table manager returned false');
                    console.error('CSV Handler: Data that failed:', data);
                    throw new Error('La actualización de la tabla falló');
                }
                
                console.log('CSV Handler: Table update successful');
                this.showDataStatistics(data, fieldName);
                
                return true;
                
            } catch (error) {
                console.error('CSV Handler: Table update error:', error);
                throw new Error('Error al actualizar la tabla: ' + error.message);
            }
        }
        
        /**
         * Verify table manager availability - simplified version
         */
        verifyTableManager() {
            console.log('CSV Handler: Verifying table manager...');
            
            // Check basic availability
            if (!window.discardsTableManager) {
                console.error('CSV Handler: Table manager not available');
                return false;
            }
            
            // Check if initialized
            if (!window.discardsTableManager.isInitialized()) {
                console.error('CSV Handler: Table manager not initialized');
                return false;
            }
            
            // Check required methods
            if (typeof window.discardsTableManager.updateTableData !== 'function') {
                console.error('CSV Handler: updateTableData method not available');
                return false;
            }
            
            console.log('CSV Handler: Table manager verification passed');
            return true;
        }
        
        
        /**
         * Show optimized data statistics with post_id validation and pre-discarded analysis
         */
        showDataStatistics(data, fieldName) {
            const stats = {
                total: data.length,
                withBarcodes: data.filter(r => r.barcd?.length > 0).length,
                withPostIds: data.filter(r => r.post_id).length,
                uniquePostIds: new Set(data.map(r => r.post_id).filter(Boolean)).size,
                preDiscarded: data.filter(r => r._wasPreDiscarded || r.isDiscarded).length,
                completed: data.filter(r => r.status === '✅').length
            };
            
            stats.withoutBarcodes = stats.total - stats.withBarcodes;
            stats.withoutPostIds = stats.total - stats.withPostIds;
            stats.pending = stats.total - stats.completed;
            
            console.log('CSV Handler: Enhanced data statistics:', stats);
            
            // Validation warnings
            if (stats.withoutBarcodes > 0) {
                this.showMessage(`⚠️ ${stats.withoutBarcodes} registros sin código de barras`, 'warning');
            }
            
            if (stats.withoutPostIds > 0) {
                this.showMessage(`⚠️ ${stats.withoutPostIds} registros sin post_id`, 'warning');
            }
            
            if (stats.uniquePostIds !== stats.withPostIds) {
                this.showMessage(`⚠️ Se detectaron post_ids duplicados`, 'warning');
            }
            
            // Information about pre-discarded materials
            if (stats.preDiscarded > 0) {
                this.showMessage(`ℹ️ ${stats.preDiscarded} materiales ya fueron descartados anteriormente`, 'info');
            }
            
            // Success message with enhanced info
            const completedInfo = stats.completed > 0 ? ` (${stats.completed} ya descartados)` : '';
            this.showMessage(`✅ ${fieldName}: ${stats.total} registros cargados${completedInfo}`, 'success');
        }
        
        /**
         * Validate post_id integrity in processed data
         */
        validatePostIdIntegrity(data) {
            console.log('CSV Handler: Validating post_id integrity');
            
            const issues = [];
            const postIdCount = new Map();
            
            data.forEach((record, index) => {
                // Check for missing post_id
                if (!record.post_id) {
                    issues.push(`Record ${index}: Missing post_id`);
                }
                
                // Check for duplicate post_ids
                const postId = record.post_id;
                if (postId) {
                    postIdCount.set(postId, (postIdCount.get(postId) || 0) + 1);
                }
                
                // Check barcode-postId relationship
                if (record.barcd && !record.post_id) {
                    issues.push(`Record ${index}: Has barcode '${record.barcd}' but no post_id`);
                }
            });
            
            // Report duplicates
            for (const [postId, count] of postIdCount.entries()) {
                if (count > 1) {
                    issues.push(`Duplicate post_id '${postId}' found ${count} times`);
                }
            }
            
            if (issues.length > 0) {
                console.warn('CSV Handler: Post_id integrity issues found:', issues);
                return { valid: false, issues };
            }
            
            console.log('CSV Handler: Post_id integrity validation passed');
            return { valid: true, issues: [] };
        }
        
        /**
         * Clear data efficiently with proper cleanup
         */
        clearData() {
            console.log('CSV Handler: Clearing data');
            
            // Clear local data
            this.csvData = [];
            
            // Clear table via manager if available
            if (window.discardsTableManager?.isInitialized?.()) {
                const clearResult = window.discardsTableManager.clearTable();
                if (!clearResult) {
                    console.warn('CSV Handler: Table clear operation failed');
                }
            }
        }
        
        /**
         * Cancel all pending operations
         */
        cancelPendingOperations() {
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            this.isLoading = false;
            this.showLoadingIndicator(false);
        }
    
        
        /**
         * Show/hide optimized loading indicator inside the table
         */
        showLoadingIndicator(show) {
            const loadingId = 'csv-loading-indicator';
            
            if (show) {
                // Remove existing indicator
                $('#' + loadingId).remove();
                
                // Check if table exists and has tbody
                const $table = $('#discards-table');
                if ($table.length === 0) {
                    console.warn('CSV Handler: Table not found for loading indicator');
                    return;
                }
                
                // Get or create tbody
                let $tbody = $table.find('tbody');
                if ($tbody.length === 0) {
                    $tbody = $('<tbody></tbody>').appendTo($table);
                }
                
                // Count visible columns for colspan
                const visibleColumns = $table.find('thead th:visible').length || 7; // Default to 7 visible columns
                
                // Create loading row that fits inside the table
                const $loadingRow = $(`
                    <tr id="${loadingId}" class="csv-loading-row">
                        <td colspan="${visibleColumns}" style="
                            text-align: center; 
                            padding: 30px 15px; 
                            background: linear-gradient(90deg, #f8f9fa, #e9ecef);
                            border: 2px solid #28a745; 
                            border-radius: 6px;
                            animation: cssload-pulse 1.5s infinite;
                            vertical-align: middle;
                        ">
                            <div style="font-size: 18px; color: #155724; font-weight: 600; margin-bottom: 8px;">
                                🔄 Cargando datos...
                            </div>
                            <div style="font-size: 14px; color: #6c757d;">
                                Procesando registros del campo seleccionado
                            </div>
                        </td>
                    </tr>
                `);
                
                // Clear existing table content and add loading row
                $tbody.empty().append($loadingRow);

                this.ensureLoadingStyles();
                
            } else {
                // Remove loading indicator with fade effect
                $('#' + loadingId).fadeOut(300, function() { 
                    $(this).remove(); 
                });
            }
        }
        
        /**
         * Ensure loading styles are present for table-based loading
         */
        ensureLoadingStyles() {
            if (!$('#csv-loading-styles').length) {
                $('head').append(`
                    <style id="csv-loading-styles">
                        @keyframes cssload-pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.8; transform: scale(1.02); }
                        }
                        
                        .csv-loading-row {
                            background: linear-gradient(90deg, #f8f9fa, #e9ecef) !important;
                        }
                        
                        .csv-loading-row:hover {
                            background: linear-gradient(90deg, #e9ecef, #dee2e6) !important;
                        }
                        
                        .csv-loading-row td {
                            border: none !important;
                        }
                    </style>
                `);
            }
        }
        
        /**
         * Enhanced message system with consistent styling
         */
        showMessage(message, type = 'info') {
            console.log(`CSV Handler [${type.toUpperCase()}]: ${message}`);
            
            // Try global message systems first
            if (window.showMessage) {
                window.showMessage(message, type);
                return;
            }
            
            if (window.orionDiscardApp?.showMessage) {
                window.orionDiscardApp.showMessage(message, type);
                return;
            }
            
            // Enhanced fallback system
            this.showFallbackMessage(message, type);
        }
        
        /**
         * Optimized fallback message system
         */
        showFallbackMessage(message, type) {
            const config = {
                error: { class: 'alert-danger', icon: '❌', delay: 5000 },
                success: { class: 'alert-success', icon: '✅', delay: 5000 },
                warning: { class: 'alert-warning', icon: '⚠️', delay: 5000 },
                info: { class: 'alert-info', icon: 'ℹ️', delay: 5000 }
            };
            
            const { class: alertClass, icon, delay } = config[type] || config.info;
            
            const $alert = $(`
                <div class="alert ${alertClass} csv-message" style="
                    margin: 8px 0; 
                    padding: 10px 15px;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    position: relative;
                ">
                    <strong>${icon}</strong> ${message}
                    <button type="button" class="close" style="
                        position: absolute;
                        top: 8px;
                        right: 12px;
                        background: none;
                        border: none;
                        font-size: 16px;
                        cursor: pointer;
                        opacity: 0.7;
                    ">&times;</button>
                </div>
            `);
            
            // Handle close button
            $alert.find('.close').on('click', () => $alert.fadeOut(200, () => $alert.remove()));
            
            // Find best container
            const $container = $('#csv-messages').length ? $('#csv-messages') : 
                              $('#vform-container').length ? $('#vform-container') : $('body');
            
            $container.prepend($alert);
            
            // Auto-remove with fade
            setTimeout(() => $alert.fadeOut(400, () => $alert.remove()), delay);
        }
        
        /**
         * Utility: debounce function for performance optimization
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        /**
         * Utility: sleep function for yielding control
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        /**
         * Get current handler state for debugging
         */
        getState() {
            return {
                isLoading: this.isLoading,
                currentFieldId: this.currentFieldId,
                dataCount: this.csvData.length,
                isInitialized: this.isInitialized,
                config: this.config,
                dependencies: Object.fromEntries(this.dependencies)
            };
        }
        
        /**
         * Run comprehensive diagnostic with post_id validation
         */
        runDiagnostic() {
            console.group('🔍 CSV HANDLER COMPREHENSIVE DIAGNOSTIC');
            
            // Basic state
            console.log('📋 Handler State:', this.getState());
            console.log('📊 Data Count:', this.csvData.length);
            console.log('🔧 Dependencies Ready:', this.areDependenciesReady());
            
            // Sample data analysis
            if (this.csvData.length > 0) {
                console.log('📄 Sample Record (First):', this.csvData[0]);
                console.log('📄 Sample Record (Last):', this.csvData[this.csvData.length - 1]);
                
                // Post_id analysis
                this.analyzePostIds();
                
                // Barcode analysis
                this.analyzeBarcodes();
            }
            
            // Table Manager compatibility check
            this.checkTableManagerCompatibility();
            
            console.groupEnd();
            return this.getState();
        }
        
        /**
         * Analyze post_id distribution and integrity
         */
        analyzePostIds() {
            console.group('🆔 POST_ID ANALYSIS');
            
            const postIds = this.csvData.map(r => r.post_id).filter(Boolean);
            const uniquePostIds = new Set(postIds);
            const duplicates = postIds.filter((id, index) => postIds.indexOf(id) !== index);
            
            console.log('Total records:', this.csvData.length);
            console.log('Records with post_id:', postIds.length);
            console.log('Unique post_ids:', uniquePostIds.size);
            console.log('Duplicate post_ids:', new Set(duplicates).size);
            
            if (duplicates.length > 0) {
                console.warn('Duplicate post_ids found:', [...new Set(duplicates)]);
            }
            
            // Sample post_ids
            console.log('Sample post_ids:', Array.from(uniquePostIds).slice(0, 5));
            
            console.groupEnd();
        }
        
        /**
         * Analyze barcode distribution and mapping
         */
        analyzeBarcodes() {
            console.group('� BARCODE ANALYSIS');
            
            const withBarcodes = this.csvData.filter(r => r.barcd?.length > 0);
            const withoutBarcodes = this.csvData.filter(r => !r.barcd || r.barcd.length === 0);
            const barcodePostIdMap = new Map();
            
            withBarcodes.forEach(record => {
                barcodePostIdMap.set(record.barcd, record.post_id);
            });
            
            console.log('Records with barcodes:', withBarcodes.length);
            console.log('Records without barcodes:', withoutBarcodes.length);
            console.log('Unique barcodes:', barcodePostIdMap.size);
            
            // Sample barcode-postId mapping
            const sampleMappings = Array.from(barcodePostIdMap.entries()).slice(0, 3);
            console.table(sampleMappings.map(([barcode, postId]) => ({ barcode, postId })));
            
            console.groupEnd();
        }
        
        /**
         * Check compatibility with Table Manager
         */
        checkTableManagerCompatibility() {
            console.group('🔗 TABLE MANAGER COMPATIBILITY CHECK');
            
            let isCompatible = true;
            const issues = [];
            
            // Check if Table Manager exists
            if (!window.discardsTableManager) {
                issues.push('Table Manager not available');
                isCompatible = false;
            } else {
                console.log('✅ Table Manager available');
                
                // Check if Table Manager is initialized
                if (!window.discardsTableManager.isInitialized()) {
                    issues.push('Table Manager not initialized');
                    isCompatible = false;
                } else {
                    console.log('✅ Table Manager initialized');
                    
                    // Test data format compatibility
                    if (this.csvData.length > 0) {
                        const sampleRecord = this.csvData[0];
                        const requiredFields = ['id', 'post_id', 'barcd', 'status'];
                        const missingFields = requiredFields.filter(field => !(field in sampleRecord));
                        
                        if (missingFields.length > 0) {
                            issues.push(`Missing required fields: ${missingFields.join(', ')}`);
                            isCompatible = false;
                        } else {
                            console.log('✅ Data format compatible');
                        }
                    }
                }
            }
            
            if (isCompatible) {
                console.log('✅ Full compatibility confirmed');
            } else {
                console.error('❌ Compatibility issues found:', issues);
            }
            
            console.groupEnd();
            return { compatible: isCompatible, issues };
        }
        
        /**
         * Test scanning functionality simulation
         */
        testScanningFunctionality() {
            console.group('🔬 SCANNING FUNCTIONALITY TEST');
            
            if (this.csvData.length === 0) {
                console.warn('No data available for testing');
                console.groupEnd();
                return false;
            }
            
            // Get a record with barcode for testing
            const testRecord = this.csvData.find(r => r.barcd && r.post_id);
            
            if (!testRecord) {
                console.warn('No suitable record found for testing (needs barcode and post_id)');
                console.groupEnd();
                return false;
            }
            
            console.log('Test record:', {
                post_id: testRecord.post_id,
                barcode: testRecord.barcd,
                current_status: testRecord.status
            });
            
            // Simulate Table Manager calls
            if (window.discardsTableManager) {
                console.log('Testing updateRowStatusById...');
                const byIdResult = window.discardsTableManager.updateRowStatusById(testRecord.post_id, '✅');
                console.log('updateRowStatusById result:', byIdResult);
                
                console.log('Testing updateRowStatus (by barcode)...');
                const byBarcodeResult = window.discardsTableManager.updateRowStatus(testRecord.barcd, '❌');
                console.log('updateRowStatus result:', byBarcodeResult);
                
                console.log('Testing findByBarcode...');
                const foundRecords = window.discardsTableManager.findByBarcode(testRecord.barcd);
                console.log('findByBarcode result:', foundRecords);
            }
            
            console.log('✅ Scanning functionality test completed');
            console.groupEnd();
            return true;
        }
        
        /**
         * Enhanced public API for external access with validation methods
         * NOTE: Barcode data is handled internally and hidden from user interface
         */
        getPublicAPI() {
            return {
                // Data access (read-only)
                getCsvData: () => [...this.csvData],
                getCurrentFieldId: () => this.currentFieldId,
                getDataCount: () => this.csvData.length,
                isLoading: () => this.isLoading,
                isInitialized: () => this.isInitialized,
                
                // Operations
                loadFieldData: this.loadFieldData.bind(this),
                clearData: this.clearData.bind(this),
                
                // State and diagnostics
                getState: this.getState.bind(this),
                runDiagnostic: this.runDiagnostic.bind(this),
                
                // Enhanced validation and testing methods
                validatePostIdIntegrity: (data) => this.validatePostIdIntegrity(data || this.csvData),
                analyzePostIds: this.analyzePostIds.bind(this),
                analyzeBarcodes: this.analyzeBarcodes.bind(this),
                checkTableManagerCompatibility: this.checkTableManagerCompatibility.bind(this),
                testScanningFunctionality: this.testScanningFunctionality.bind(this),
                
                // Utilities
                showMessage: this.showMessage.bind(this),
                
                // Quick validation helpers
                hasValidData: () => this.csvData.length > 0,
                getPostIdCount: () => this.csvData.filter(r => r.post_id).length,
                getBarcodeCount: () => this.csvData.filter(r => r.barcd?.length > 0).length,
                getSampleRecord: () => this.csvData.length > 0 ? this.csvData[0] : null,
                
                // SECURITY: Methods for safe barcode handling (internal use only)
                getInternalBarcodeCount: () => this.csvData.filter(r => r.barcd?.length > 0).length,
                validateInternalBarcode: (barcode) => {
                    // Only for internal scanner validation - not exposed to UI
                    return this.csvData.some(r => r.barcd === barcode);
                }
            };
        }
    }
    
    // ============================================================================
    // INITIALIZATION AND GLOBAL EXPORTS
    // ============================================================================
    
    // Create and initialize handler instance
    const csvHandler = new CSVHandler();
    
    // Initialize with optimized timing
    setTimeout(async () => {
        const success = await csvHandler.initialize();
        if (success) {
            console.log('CSV Handler: Optimized initialization completed successfully');
        } else {
            console.error('CSV Handler: Initialization failed');
        }
    }, 800); // Reduced delay for faster initialization
    
    // Export optimized global API
    window.csvHandler = csvHandler.getPublicAPI();
    
    // Enhanced global exports for debugging
    window.csvHandlerDev = {
        instance: csvHandler,
        testAll: async function() {
            console.group('🧪 CSV HANDLER COMPREHENSIVE TEST SUITE');
            
            console.log('1️⃣ Testing CSV Handler state...');
            const state = window.csvHandler.getState();
            console.log('State:', state);
            
            console.log('2️⃣ Testing Table Manager compatibility...');
            const compatibility = window.csvHandler.checkTableManagerCompatibility();
            console.log('Compatibility:', compatibility);
            
            if (window.csvHandler.hasValidData()) {
                console.log('3️⃣ Testing post_id integrity...');
                const integrity = window.csvHandler.validatePostIdIntegrity();
                console.log('Integrity:', integrity);
                
                console.log('4️⃣ Analyzing post_ids...');
                window.csvHandler.analyzePostIds();
                
                console.log('5️⃣ Analyzing barcodes...');
                window.csvHandler.analyzeBarcodes();
                
                console.log('6️⃣ Testing scanning functionality...');
                const scanTest = window.csvHandler.testScanningFunctionality();
                console.log('Scan test result:', scanTest);
            } else {
                console.log('⚠️ No data available for advanced testing');
                console.log('💡 Load data by selecting a field first');
            }
            
            console.log('✅ Test suite completed');
            console.groupEnd();
            
            return {
                state,
                compatibility,
                hasData: window.csvHandler.hasValidData(),
                postIdCount: window.csvHandler.getPostIdCount(),
                barcodeCount: window.csvHandler.getBarcodeCount(),
                sampleRecord: window.csvHandler.getSampleRecord()
            };
        },
        
        quickTest: function() {
            console.log('🚀 CSV Handler Quick Test');
            console.log('Is initialized:', window.csvHandler.isInitialized());
            console.log('Data count:', window.csvHandler.getDataCount());
            console.log('Current field:', window.csvHandler.getCurrentFieldId());
            console.log('Post_id count:', window.csvHandler.getPostIdCount());
            console.log('Barcode count:', window.csvHandler.getBarcodeCount());
            
            if (window.csvHandler.hasValidData()) {
                console.log('Sample record:', window.csvHandler.getSampleRecord());
            }
            
            return window.csvHandler.getState();
        }
    };
    
    console.log('CSV Handler: Optimized module loaded successfully');
    console.log('🔧 Use csvHandlerDev.testAll() for comprehensive testing');
    console.log('🔧 Use csvHandlerDev.quickTest() for quick validation');
});