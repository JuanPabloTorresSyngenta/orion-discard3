/**
 * Orion Discard Plugin - Main Application Logic
 * Complete and precise implementation of the material discard system
 * 
 * ARCHITECTURE:
 * - Sequential initialization with dependency management
 * - Centralized table management delegation
 * - Clean dropdown cascading logic (Farm → Section → Field)
 * - Focused barcode scanning with validation
 * - Comprehensive error handling and user feedback
 */

jQuery(document).ready(function($) {
    'use strict';
    
    console.log('App: Starting Orion Discard Plugin');
    
    // ============================================================================
    // GLOBAL VARIABLES & CONFIGURATION
    // ============================================================================
    
    const config = {
        site: orionDiscard.site || "PRSA",
        year: orionDiscard.year || new Date().getFullYear(),
        apiUrl: "http://192.168.96.84:8080/orion/wp-json/orion-maps-fields/v1/fields",
        barcodeTimeout: 300,
        maxInitAttempts: 10,
        retryDelay: 200,
        messageTimeouts: {
            error: 3000,
            default: 3000
        }
    };
    
    const state = {
        fieldsData: [],
        barcodeValidationTimeout: null,
        initializationComplete: false,
        cachedElements: null
    };
    
    // ============================================================================
    // INITIALIZATION SEQUENCE
    // ============================================================================
    
    /**
     * Main initialization function
     */
    function initializeApp() {
        console.log('App: Starting initialization sequence');
        
        // Check basic dependencies first
        if (!checkBasicDependencies()) {
            console.error('App: Basic dependencies not met');

            return;
        }
        
        // Wait for table manager to be available
        waitForTableManager(function(tableReady) {
            if (tableReady) {
                console.log('App: Table manager ready, proceeding with full initialization');
                
                // Initialize in sequence
                setupForm();
                
                // Load dropdown data and handle promise
                loadDropdownData()
                    .then(() => {
                        console.log('App: Dropdown data loaded successfully');
                    })
                    .catch((error) => {
                        console.error('App: Failed to load dropdown data:', error);

                        showMessage('Error al cargar datos de dropdowns: ' + error.message, 'error');
                    });
                    
                setupEventHandlers();

                setupBarcodeScanning();
                
                state.initializationComplete = true;

                console.log('App: Initialization complete');

                showMessage('Sistema de descarte inicializado correctamente', 'success');
                
            } else {
                console.error('App: Failed to initialize - table manager not available');

                showMessage('Error: No se pudo inicializar el sistema de tablas', 'error');
            }
        });
    }
    
    /**
     * Check basic dependencies with early exit
     */
    function checkBasicDependencies() {
        const essentialChecks = {
            jQuery: typeof $ !== 'undefined',
            orionDiscard: typeof orionDiscard !== 'undefined',
            site: !!config.site,
            factory: typeof window.Factory !== 'undefined',
            ajaxFunction: typeof window.ajax_fetchOrionFieldsData !== 'undefined',
            httpMethods: typeof window.HTTP_METHODS !== 'undefined'
        };
        
        console.log('App: Essential dependency check:', essentialChecks);
        
        const failedChecks = Object.entries(essentialChecks)
            .filter(([, passed]) => !passed)
            .map(([name]) => name);
        
        if (failedChecks.length > 0) {
            console.error('App: Essential dependencies failed:', failedChecks);
            showMessage(`Dependencias esenciales faltantes: ${failedChecks.join(', ')}`, 'error');
            return false;
        }
        
        // Check optional dependencies
        const optionalChecks = {
            formContainer: findAnyFormContainer(),
            tableElement: $('#discards-table').length > 0
        };
        
        Object.entries(optionalChecks).forEach(([name, exists]) => {
            if (!exists) {
                console.warn(`App: Optional dependency missing: ${name}`);
            }
        });
        
        return true;
    }
    
    /**
     * Find any form container using cached results
     */
    function findAnyFormContainer() {
        const selectors = [
            '#vform-container',
            '[id*="orion-discard-form"]',
            '.orion-discard-admin-form',
            '.vform-container'
        ];
        
        return selectors.some(selector => $(selector).length > 0);
    }
    
    /**
     * Wait for table manager with optimized retry logic
     */
    function waitForTableManager(callback) {
        let attempts = 0;
        
        function checkTableManager() {
            attempts++;
            
            if (attempts > config.maxInitAttempts) {
                console.warn('App: Table manager not available after', config.maxInitAttempts, 'attempts - continuing without it');
                callback(true);
                return;
            }
            
            if (typeof window.discardsTableManager !== 'undefined') {

                const $table = $('#discards-table');

                if ($table.length === 0) {

                    console.warn('App: No table element found - skipping table manager initialization');
                  
                    callback(true);

                    return;
                }
                
                if (!window.discardsTableManager.isInitialized()) {

                    console.log('App: Initializing table manager');

                    try {
                        const initResult = window.discardsTableManager.init();

                        if (initResult) {

                            console.log('App: Table manager initialized successfully');

                            callback(true);

                            return;
                        }
                        console.warn('App: Table manager initialization failed, retrying...');
                    } catch (error) {

                        console.error('App: Table manager initialization error:', error);

                        callback(true);
                        return;
                    }
                } else {
                    console.log('App: Table manager already initialized');
                    callback(true);
                    return;
                }
            }
            
            setTimeout(checkTableManager, config.retryDelay);
        }
        
        checkTableManager();
    }
    
    // ============================================================================
    // UTILITY FUNCTIONS FOR ELEMENT DISCOVERY
    // ============================================================================
    
    /**
     * Find form elements with caching and flexible selectors
     */
    function findFormElements() {

        // Return cached elements if available and still valid
        if (state.cachedElements && validateCachedElements()) {
            console.log('App: Using cached form elements');
            return state.cachedElements;
        }
        
        console.log('App: Discovering form elements...');
        
        const selectors = {
            farms: ['#farms', '[name="farms"]', 'select[name*="farm"]', 'select[id*="farm"]'],
            sections: ['#sections', '[name="sections"]', 'select[name*="section"]', 'select[id*="section"]'],
            fields: ['#fields', '[name="fields"]', 'select[name*="field"]', 'select[id*="field"]'],
            scanner: ['#scanner-input', '[name="scanner"]', 'input[name*="scanner"]', 'input[id*="scanner"]', 'input[name*="barcode"]'],
            container: ['#vform-container', '.vform-container', '.orion-discard-admin-form', '[id*="orion-discard-form"]']
        };
        
        const elements = {};
        
        Object.entries(selectors).forEach(([key, selectorArray]) => {

            elements[key] = findElementBySelectors(selectorArray, key);
            
        });
        
        // Cache the results
        state.cachedElements = elements;
        
        return elements;
    }
    
    /**
     * Find element using array of selectors
     */
    function findElementBySelectors(selectors, elementType) {

        for (const selector of selectors) {

            const $element = $(selector);

            if ($element.length > 0) {

                console.log(`App: Found ${elementType} element with selector: ${selector}`);

                return $element;
            }
        }
        console.warn(`App: Could not find ${elementType} element with selectors:`, selectors);

        return null;
    }
    
    /**
     * Validate cached elements are still in DOM
     */
    function validateCachedElements() {

        if (!state.cachedElements) return false;
        
        return Object.values(state.cachedElements).every(element => {
            return !element || (element.length && $.contains(document, element[0]));
        });
    }
    
    /**
     * Get or find specific element with caching
     */
    function getElement(type) {

        if (!state.cachedElements || !validateCachedElements()) {

            state.cachedElements = findFormElements();
        }
        return state.cachedElements[type];
    }
    
    /**
     * Refresh element cache
     */
    function refreshElements() {
        state.cachedElements = null; // Clear cache
        state.cachedElements = findFormElements();
        console.log('App: Elements refreshed:', state.cachedElements);
        ensureCriticalElements();
    }
    
    /**
     * Ensure critical elements exist with enhanced detection
     */
    function ensureCriticalElements() {
        const elements = state.cachedElements;
        
        if (!elements.farms && !elements.sections && !elements.fields) {
            console.warn('App: No form elements found - looking for vForm containers');
            
            const $vformElements = $('form select, form input[type="text"]');
            console.log('App: Found', $vformElements.length, 'form elements in page');
            
            if ($vformElements.length > 0) {
                showMessage('Formulario detectado - Configurando compatibilidad', 'info');
                assignElementsByPosition($vformElements, elements);
            }
        }
        
        state.cachedElements = elements;
    }
    
    /**
     * Assign elements by position and labels
     */
    function assignElementsByPosition($vformElements, elements) {
        const assignments = [
            { key: 'farms', patterns: ['farm', 'granja'], index: 0 },
            { key: 'sections', patterns: ['section', 'sección'], index: 1 },
            { key: 'fields', patterns: ['field', 'campo'], index: 2 }
        ];
        
        $vformElements.each(function(index, element) {
            const $elem = $(element);
            const label = getElementLabel($elem);
            
            console.log(`App: Form element ${index}: ${element.tagName} - "${label}"`);
            
            for (const assignment of assignments) {
                if (!elements[assignment.key] && 
                    (assignment.patterns.some(pattern => label.includes(pattern)) || index === assignment.index)) {
                    
                    $elem.attr('id', `${assignment.key}-dynamic`);
                    elements[assignment.key] = $elem;
                    console.log(`App: Assigned ${assignment.key} element`);
                    break;
                }
            }
            
            // Handle scanner input
            if (!elements.scanner && $elem.is('input[type="text"]') && 
                ['scan', 'código', 'barcode'].some(pattern => label.includes(pattern))) {
                $elem.attr('id', 'scanner-dynamic');
                elements.scanner = $elem;
                console.log('App: Assigned scanner element');
            }
        });
    }
    
    /**
     * Get element label text
     */
    function getElementLabel($elem) {
        return ($elem.prev('label').text() || 
                $elem.parent().find('label').text() ||
                $elem.attr('placeholder') || '').toLowerCase();
    }
    
    /**
     * Setup initial form state
     */
    function setupForm() {
        console.log('App: Setting up form');
        
        // Discover form elements dynamically
        refreshElements();
        
        const $sections = getElement('sections');
        const $fields = getElement('fields');
        const $scanner = getElement('scanner');
        
        // Clear all dropdowns except farm (if found)
        if ($sections) {
            $sections.empty().append('<option value="">Seleccione una sección</option>');
        }
        if ($fields) {
            $fields.empty().append('<option value="">Seleccione un campo</option>');
        }
        
        // Clear scanner input and ensure it's ready (if found)
        if ($scanner) {
            $scanner.val('').attr('placeholder', 'Escanee código de barras aquí...');
            $scanner.prop('disabled', true);
        }
        
        // Add form styling if needed
        $('.form-control').addClass('orion-form-control');
        
        // Ensure CSS is loaded
        ensureOrionStyles();
        
        console.log('App: Form setup complete');
    }
    
    /**
     * Ensure Orion styles are loaded
     */
    function ensureOrionStyles() {
        if ($('#orion-discard-styles').length === 0) {
            $('head').append(`
                <style id="orion-discard-styles">
                    .loading {
                        background-image: url('data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAA');
                        background-repeat: no-repeat;
                        background-position: right 8px center;
                        padding-right: 30px;
                    }
                    
                    .orion-form-control {
                        border-radius: 4px;
                        border: 2px solid #ddd;
                        transition: border-color 0.3s ease;
                    }
                    
                    .orion-form-control:focus {
                        border-color: #4CAF50;
                        box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
                    }
                    
                    .orion-message {
                        animation: slideInDown 0.3s ease;
                    }
                    
                    @keyframes slideInDown {
                        from {
                            transform: translateY(-10px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                </style>
            `);
        }
    }
    
    // ============================================================================
    // DATA LOADING AND API INTEGRATION
    // ============================================================================
    
    /**
     * Load dropdown data with error handling and validation
     */
    function loadDropdownData() {
        console.log('App: Loading dropdown data for site:', config.site);
        
        refreshElements();
        const $farms = getElement('farms');
        
        if (!$farms) {
            const errorMsg = 'Error: No se encontró el dropdown de granjas';
            console.error('App: No farms dropdown found - cannot load data');
            showMessage(errorMsg, 'error');
            return Promise.reject(new Error(errorMsg));
        }
        
        console.log('App: Using farms element:', $farms[0]);
        $farms.addClass('loading');
        
        return new Promise((resolve, reject) => {
            try {
                const ajaxParam = window.Factory.BuildAjaxParamToDownloadDropdownsData(config.site);
                
                if (!ajaxParam) {
                    throw new Error('No se pudieron generar los parámetros AJAX');
                }
                
                console.log('App: Generated dropdown parameters:', ajaxParam);
                console.log('App: Making AJAX request to:', config.apiUrl);
                
                window.ajax_fetchOrionFieldsData(
                    ajaxParam,
                    config.apiUrl,
                    window.HTTP_METHODS.GET,
                    // Success callback
                    function(data) {
                        console.log('App: Raw AJAX response received:', data);
                        
                        if (!data || !data.data || !data.data.fields) {
                            console.error('App: Invalid response structure:', data);
                            const errorMsg = 'Respuesta inválida del servidor';
                            showMessage(errorMsg, 'error');
                            reject(new Error(errorMsg));
                            return;
                        }
                        
                        state.fieldsData = data.data.fields || [];
                        console.log('App: Fields data loaded successfully:', state.fieldsData.length, 'items');
                        console.log('App: Sample field data:', state.fieldsData.slice(0, 3));
                        
                        processApiData(state.fieldsData);
                        resolve(state.fieldsData);
                    },
                    // Error callback
                    function(errorMessage) {
                        console.error('App: AJAX error loading fields data:', errorMessage);
                        showMessage(errorMessage, 'error');
                        
                        setTimeout(() => {
                            if (confirm('¿Desea intentar cargar los datos nuevamente?')) {
                                loadDropdownData().then(resolve).catch(reject);
                            } else {
                                reject(new Error(errorMessage));
                            }
                        }, 2000);
                    },
                    // Complete callback
                    function() {
                        console.log('App: AJAX request completed');
                        $farms.removeClass('loading');
                    }
                );
            } catch (error) {
                console.error('App: Exception in loadDropdownData:', error);
                $farms.removeClass('loading');
                showMessage(`Error: ${error.message}`, 'error');
                reject(error);
            }
        });
    }
    
    /**
     * Process API data with validation
     */
    function processApiData(data) {
        if (!Array.isArray(data)) {
            const errorMsg = 'Formato de datos inválido recibido del servidor';
            console.error('App: Invalid API data format');
            showMessage(errorMsg, 'error');
            throw new Error(errorMsg);
        }
        
        state.fieldsData = data;
        console.log('App: Processing data for', state.fieldsData.length, 'items');
        
        const farms = data.filter(item => item.field_type === 'farm');
        
        if (farms.length === 0) {
            console.warn('App: No farms found in data');
            showMessage('No se encontraron granjas en los datos', 'warning');
            return;
        }
        
        populateFarmDropdown(farms);
        console.log('App: Data processing complete');
        showMessage(`Datos cargados: ${farms.length} granjas disponibles`, 'success');
    }
    
    /**
     * Populate farm dropdown
     */
    function populateFarmDropdown(farms) {
        const $farmSelect = getElement('farms');
        
        if (!$farmSelect) {
            console.error('App: Farms dropdown not found');
            showMessage('Error: No se pudo encontrar el dropdown de granjas', 'error');
            return;
        }
        
        $farmSelect.empty().append('<option value="">Seleccione una granja</option>');
        
        farms.forEach(farm => {
            $farmSelect.append(`<option value="${farm.id}">${farm.title}</option>`);
        });
        
        // Enable the farms dropdown
        $farmSelect.prop('disabled', false);
        
        console.log('App: Farm dropdown populated with', farms.length, 'options');
    }
    
    /**
     * Populate sections dropdown with error handling
     */
    function populateSectionsDropdown(farmId) {
        const $sectionsSelect = getElement('sections');
        
        if (!$sectionsSelect) {
            console.error('App: Sections dropdown not found');
            showMessage('Error: No se pudo encontrar el dropdown de secciones', 'error');
            return;
        }
        
        $sectionsSelect.empty().append('<option value="">Seleccione una sección</option>');
        showLoadingIndicator('sections', true);
        
        try {
            const sections = state.fieldsData.filter(item => 
                item.field_type === 'sections' && item.farm_name === farmId
            );
            
            sections.forEach(section => {
                $sectionsSelect.append(`<option value="${section.id}">${section.title}</option>`);
            });
            
            $sectionsSelect.prop('disabled', false);
            console.log('App: Sections dropdown populated with', sections.length, 'options');
        } catch (error) {
            console.error('App: Error populating sections:', error);
            showMessage('Error al cargar secciones', 'error');
        } finally {
            showLoadingIndicator('sections', false);
        }
    }
    
    /**
     * Populate fields dropdown with error handling
     */
    function populateFieldsDropdown(sectionId) {
        const $fieldsSelect = getElement('fields');
        
        if (!$fieldsSelect) {
            console.error('App: Fields dropdown not found');
            showMessage('Error: No se pudo encontrar el dropdown de campos', 'error');
            return;
        }
        
        $fieldsSelect.empty().append('<option value="">Seleccione un campo</option>');
        showLoadingIndicator('fields', true);
        
        try {
            const fields = state.fieldsData.filter(item => 
                item.field_type === 'fields' && item.section_name === sectionId
            );
            
            fields.forEach(field => {
                $fieldsSelect.append(`<option value="${field.id}">${field.title}</option>`);
            });
            
            $fieldsSelect.prop('disabled', false);
            console.log('App: Fields dropdown populated with', fields.length, 'options');
        } catch (error) {
            console.error('App: Error populating fields:', error);
            showMessage('Error al cargar campos', 'error');
        } finally {
            showLoadingIndicator('fields', false);
        }
    }
    
    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    
    /**
     * Setup all event handlers
     */
    function setupEventHandlers() {
        console.log('App: Setting up event handlers');
        
        // Use event delegation for compatibility with dynamically generated forms
        const $container = getElement('container') || $(document);
        
        // Farm selection change - use event delegation
        $container.on('change', 'select[name*="farm"], select[id*="farm"], #farms', function() {

            const farmId = $(this).val();

            console.log('App: Farm selected:', farmId);
            
            const $sections = getElement('sections');

            const $fields = getElement('fields');

            const $scanner = getElement('scanner');
            
            // Clear and disable dependent dropdowns
            if ($sections) {

                $sections.empty().append('<option value="">Seleccione una sección</option>').prop('disabled', true);
            }
            if ($fields) {

                $fields.empty().append('<option value="">Seleccione un campo</option>').prop('disabled', true);
            }
            
            // Disable scanner
            if ($scanner) {

                $scanner.prop('disabled', true).val('');
            }
            
            // Clear table
            clearTable();
            
            if (farmId) {

                populateSectionsDropdown(farmId);

                showMessage('Granja seleccionada: ' + $(this).find('option:selected').text(), 'info');
            }
        });
        
        // Section selection change - use event delegation
        $container.on('change', 'select[name*="section"], select[id*="section"], #sections', function() {

            const sectionId = $(this).val();

            console.log('App: Section selected:', sectionId);
            
            const $fields = getElement('fields');

            const $scanner = getElement('scanner');
            
            // Clear and disable dependent dropdown
            if ($fields) {
                $fields.empty().append('<option value="">Seleccione un campo</option>').prop('disabled', true);
            }
            
            // Disable scanner
            if ($scanner) {
                $scanner.prop('disabled', true).val('');
            }
            
            // Clear table
            clearTable();
            
            if (sectionId) {
                populateFieldsDropdown(sectionId);

                showMessage('Sección seleccionada: ' + $(this).find('option:selected').text(), 'info');
            }
        });
        
        // Field selection change - use event delegation
        $container.on('change', 'select[name*="field"], select[id*="field"], #fields', function() {

            const fieldId = $(this).val();

            console.log('App: Field selected:', fieldId);
            
            const $scanner = getElement('scanner');
            
            if (fieldId) {
                // Enable scanner input
                if ($scanner) {

                    $scanner.prop('disabled', false).focus();
                }
                showMessage('Campo seleccionado: ' + $(this).find('option:selected').text() + '. Ya puede escanear códigos.', 'success');
                
                // Note: CSV data loading is handled by csv-handler.js
            } else {
                // Disable scanner
                if ($scanner) {
                    
                    $scanner.prop('disabled', true).val('');
                }
                clearTable();
            }
        });
        
        console.log('App: Event handlers setup complete');
    }
    
    // ============================================================================
    // BARCODE SCANNING SYSTEM
    // ============================================================================
    
    /**
     * Setup barcode scanning with optimized event handling
     */
    function setupBarcodeScanning() {
        console.log('App: Setting up barcode scanning');
        
        const $container = getElement('container') || $(document);
        const scannerSelectors = 'input[name*="scanner"], input[id*="scanner"], input[name*="barcode"], #scanner-input';
        
        // Debounced input handling
        $container.on('input', scannerSelectors, debounce(function() {
            const scannedCode = $(this).val().trim();
            console.log('📥 App: Scanner input detected, value:', scannedCode);
            
            if (scannedCode.length > 0) {
                console.log('App: Valid barcode input detected, setting timeout...');
                processBarcodeWithTimeout(scannedCode);
            }
        }, 100));
        
        // Immediate processing on Enter key
        $container.on('keypress', scannerSelectors, function(e) {
            if (e.which === 13) {
                e.preventDefault();
                const scannedCode = $(this).val().trim();
                console.log('App: Processing barcode from Enter key:', scannedCode);
                
                if (scannedCode.length > 0) {
                    clearBarcodeTimeout();
                    processBarcodeInput(scannedCode);
                    $(this).val('');
                }
            }
        });
        
        // Focus management
        $container.on('focus', scannerSelectors, function() {
            $(this).select();
        });
        
        console.log('App: Barcode scanning setup complete');
    }
    
    /**
     * Process barcode with timeout management
     */
    function processBarcodeWithTimeout(scannedCode) {
        clearBarcodeTimeout();
        
        state.barcodeValidationTimeout = setTimeout(() => {
            console.log('⏰ App: Timeout executed, processing barcode:', scannedCode);
            processBarcodeInput(scannedCode);
            
            const $scanner = getElement('scanner');
            if ($scanner) {
                $scanner.val('');
                console.log('App: Scanner input cleared');
            }
        }, config.barcodeTimeout);
    }
    
    /**
     * Clear barcode timeout
     */
    function clearBarcodeTimeout() {
        if (state.barcodeValidationTimeout) {
            clearTimeout(state.barcodeValidationTimeout);
            state.barcodeValidationTimeout = null;
        }
    }
    
    /**
     * Debounce function for performance optimization
     */
    function debounce(func, wait) {
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
     * Process scanned barcode with improved error handling and validation
     */
    function processBarcodeInput(barcode) {
        console.log('🔍 App: Processing barcode:', barcode);
        
        try {
            // Validate barcode format
            if (!validateBarcodeFormat(barcode)) {
                console.warn('App: Invalid barcode format:', barcode);
                showMessage(`Código de barras inválido: ${barcode}`, 'warning');
                return;
            }
            
            // Check table manager availability
            if (!isTableManagerReady()) {
                console.warn('App: Table manager not ready');
                showMessage('La tabla no está lista. Seleccione un campo primero.', 'warning');
                return;
            }
            
            // Check if barcode exists in current data
            const existingRecords = window.discardsTableManager.findByBarcode(barcode);
            if (existingRecords.length === 0) {
                console.warn('App: Barcode not found in current table:', barcode);
                showMessage(`Material ${barcode} no encontrado en la tabla actual`, 'warning');
                return;
            }
            
            // Check if material is already discarded (pre-discarded)
            const record = existingRecords[0];
            if (record._wasPreDiscarded || record.isDiscarded) {
                console.warn('App: Material already discarded previously:', barcode);
                showMessage(`⚠️ Material ${barcode} ya fue descartado anteriormente`, 'warning');
                
                // Highlight the already discarded row briefly
                highlightDiscardedRow(record.post_id || record.id);
                return;
            }
            
            // Show loading message and proceed with validation
            showMessage(`🔄 Validando código de barras: ${barcode}...`, 'info');
            validateBarcodeWithAjax(barcode);
            
        } catch (error) {
            console.error('App: Error processing barcode:', error);
            showMessage(`Error procesando código de barras: ${error.message}`, 'error');
        }
    }
    
    /**
     * Highlight an already discarded row to show user where it is
     */
    function highlightDiscardedRow(postId) {
        try {
            // Find the row by post_id
            const $row = $(`#discards-table tr[data-post-id="${postId}"]`);
            if ($row.length > 0) {
                // Add highlight effect
                $row.addClass('row-already-discarded-highlight');
                
                // Remove highlight after delay
                setTimeout(() => {
                    $row.removeClass('row-already-discarded-highlight');
                }, 3000);
                
                // Scroll to row if not visible
                $row[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (error) {
            console.error('App: Error highlighting discarded row:', error);
        }
    }
    
    /**
     * Check if table manager is ready
     */
    function isTableManagerReady() {
        return window.discardsTableManager && window.discardsTableManager.isInitialized();
    }
    
    /**
     * Validate barcode with AJAX call
     */
    function validateBarcodeWithAjax(barcode) {
        if (!window.Factory?.BuildAjaxParamToValidateBarcode) {
            throw new Error('Factory de validación no disponible');
        }
        
        const ajaxParam = window.Factory.BuildAjaxParamToValidateBarcode(
            config.site,
            config.year,
            'orion-discard',
            barcode
        );
        
        if (!ajaxParam) {
            throw new Error('No se pudieron generar los parámetros AJAX');
        }
        
        if (!window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode) {
            throw new Error('Función de validación AJAX no disponible');
        }
        
        console.log('🚀 App: Calling AJAX validation function...');
        
        window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode(
            ajaxParam,
            window.HTTP_METHODS.POST,
            // Success callback
            (response) => handleBarcodeValidationSuccess(response, barcode),
            // Error callback
            (errorMessage) => handleBarcodeValidationError(errorMessage, barcode),
            // Complete callback
            () => console.log('🏁 App: Barcode validation request completed')
        );
    }
    
    /**
     * Handle successful barcode validation
     */
    function handleBarcodeValidationSuccess(response, barcode) {
        console.log('✅ App: Barcode validation successful:', response);
        
        // Instead of relying on post_id from server response, 
        // update row directly by barcode to ensure correct row is marked
        const updated = window.discardsTableManager.updateRowStatusByBarcode(barcode, '✅');
        
        if (updated) {

            console.log('App: Successfully updated row for barcode:', barcode);

            showMessage(`✅ Material ${barcode} marcado como descartado exitosamente`, 'success');
            
            // Focus back to scanner after delay
            setTimeout(() => {

                const $scanner = getElement('scanner');

                if ($scanner) {

                    $scanner.focus();

                }

            }, 500);

        } else {
            console.warn('App: Failed to update row status in table for barcode:', barcode);
            
            // Fallback: try using post_id from response if barcode update failed
            const postId = response.post_id;
            if (postId) {
                console.log('App: Attempting fallback update using post_id from response:', postId);
                const fallbackUpdated = window.discardsTableManager.updateRowStatusById(postId, '✅');
                
                if (fallbackUpdated) {
                    showMessage(`✅ Material ${barcode} marcado como descartado exitosamente (fallback)`, 'success');
                } else {
                    showMessage(`Error al actualizar el estado visual del material ${barcode}`, 'error');
                }
            } else {
                showMessage(`Error al actualizar el estado visual del material ${barcode}`, 'error');
            }
        }
    }
    
    /**
     * Test barcode scanner functionality without AJAX call
     * This function simulates successful barcode validation for testing
     * NOTE: Uses internal barcode data (hidden from user interface)
     */
    function testBarcodeScanner(testBarcode) {
        console.log('🧪 Testing barcode scanner with internal barcode:', testBarcode);
        
        if (!testBarcode) {
            console.error('Test: No barcode provided');
            return;
        }
        
        // Check if table manager is ready
        if (!isTableManagerReady()) {
            console.warn('Test: Table manager not ready');
            showMessage('La tabla no está lista. Seleccione un campo primero.', 'warning');
            return;
        }
        
        // Check if barcode exists in internal data (not visible to users)
        const existingRecords = window.discardsTableManager.findByBarcode(testBarcode);
        if (existingRecords.length === 0) {
            console.warn('Test: Internal barcode not found in current table:', testBarcode);
            showMessage(`Material con código interno ${testBarcode} no encontrado en la tabla actual`, 'warning');
            return;
        }
        
        console.log('Test: Found existing records for internal barcode:', existingRecords.length);
        console.log('Test: Note - Barcode is internal data, not visible to users');
        
        // Simulate successful validation and update row using internal barcode
        const updated = window.discardsTableManager.updateRowStatusByBarcode(testBarcode, '🧪');
        
        if (updated) {
            console.log('✅ Test: Successfully updated row for internal barcode:', testBarcode);
            showMessage(`🧪 TEST: Material marcado exitosamente (código interno)`, 'success');
        } else {
            console.error('❌ Test: Failed to update row for internal barcode:', testBarcode);
            showMessage(`❌ TEST: Error al marcar material con código interno`, 'error');
        }
    }
    
    // Expose test function globally for debugging
    window.testBarcodeScanner = testBarcodeScanner;

    /**
     * Handle barcode validation error
     */
    function handleBarcodeValidationError(errorMessage, barcode) {
        console.error('❌ App: Barcode validation failed:', errorMessage);
        
        const errorMessages = {
            'already discarded': `⚠️ Material ${barcode} ya fue descartado anteriormente`,
            'not found': `❌ Material ${barcode} no encontrado en el sistema`,
            'default': `Error al validar código: ${errorMessage}`
        };
        
        const messageKey = Object.keys(errorMessages).find(key => 
            key !== 'default' && errorMessage.includes(key)
        ) || 'default';
        
        const messageType = messageKey === 'already discarded' ? 'warning' : 'error';
        showMessage(errorMessages[messageKey], messageType);
    }
    
    /**
     * Validate barcode format
     */
    function validateBarcodeFormat(barcode) {
        // Basic validation - adjust according to your barcode format requirements
        if (!barcode || barcode.length < 3) {
            return false;
        }
        
        // Remove any non-alphanumeric characters for validation
        const cleanBarcode = barcode.replace(/[^a-zA-Z0-9]/g, '');
        
        // Must have at least 3 alphanumeric characters
        return cleanBarcode.length >= 3;
    }
    
    // ============================================================================
    // TABLE OPERATIONS
    // ============================================================================
    
    /**
     * Clear table data
     */
    function clearTable() {
        if (window.discardsTableManager && window.discardsTableManager.isInitialized()) {
            window.discardsTableManager.clearTable();
            console.log('App: Table cleared');
        }
    }
    
    // ============================================================================
    // UI UTILITY FUNCTIONS
    // ============================================================================
    
    /**
     * Show loading indicator for specific elements
     */
    function showLoadingIndicator(elementType, show) {
        const $element = getElement(elementType);
        
        if (!$element) {
            console.warn(`App: Cannot show loading indicator - ${elementType} element not found`);
            return;
        }
        
        if (show) {
            $element.prop('disabled', true);
            if ($element.find('option[value="loading"]').length === 0) {
                $element.prepend('<option value="loading">🔄 Cargando...</option>');
                $element.val('loading');
            }
        } else {
            $element.find('option[value="loading"]').remove();
            $element.prop('disabled', false);
        }
    }
    
    /**
     * Show message with optimized timeout management
     */
    function showMessage(message, type = 'info') {
        console.log(`App Message [${type}]: ${message}`);
        
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
            return;
        }
        
        // Fallback notification system with improved styling
        const messageConfig = {
            error: { class: 'alert-danger', icon: '❌' },
            success: { class: 'alert-success', icon: '✅' },
            warning: { class: 'alert-warning', icon: '⚠️' },
            info: { class: 'alert-info', icon: 'ℹ️' }
        };
        
        const msgConfig = messageConfig[type] || messageConfig.info;
        
        const $alert = $(`
            <div class="alert ${msgConfig.class} alert-dismissible fade show orion-message" 
                 role="alert" style="margin-bottom: 10px;">
                ${msgConfig.icon} ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `);
        
        const $container = getMessageContainer();
        $container.prepend($alert);
        
        // Auto-remove with appropriate timeout
        const timeout = type === 'error' ? 
            config.messageTimeouts.error : 
            config.messageTimeouts.default;
            
        setTimeout(() => {
            $alert.fadeOut(() => $alert.remove());
        }, timeout);
    }
    
    /**
     * Get message container with fallback logic
     */
    function getMessageContainer() {
        const candidates = [
            '#orion-messages',
            getElement('container'),
            $('body')
        ];
        
        for (const candidate of candidates) {
            const $container = typeof candidate === 'string' ? $(candidate) : candidate;
            if ($container && $container.length > 0) {
                return $container;
            }
        }
        
        return $('body'); // Ultimate fallback
    }
    
    /**
     * Get current selection summary
     */
    function getCurrentSelection() {
        const $farms = getElement('farms');
        const $sections = getElement('sections');
        const $fields = getElement('fields');
        
        return {
            farm: {
                id: $farms ? $farms.val() : '',
                name: $farms ? $farms.find('option:selected').text() : ''
            },
            section: {
                id: $sections ? $sections.val() : '',
                name: $sections ? $sections.find('option:selected').text() : ''
            },
            field: {
                id: $fields ? $fields.val() : '',
                name: $fields ? $fields.find('option:selected').text() : ''
            }
        };
    }
    
    // ============================================================================
    // DIAGNOSTIC FUNCTIONS
    // ============================================================================
    
    /**
     * Run comprehensive diagnostic
     */
    function runDiagnostic() {
        console.group('🔍 ORION DISCARD DIAGNOSTIC');
        
        console.log('📋 Environment:', {
            jQuery: typeof $ !== 'undefined',
            orionDiscard: typeof orionDiscard !== 'undefined',
            site: config.site,
            year: config.year,
            apiUrl: config.apiUrl
        });
        
        // Refresh elements discovery and show results
        refreshElements();
        const elements = state.cachedElements || {};
        
        console.log('🏗️ DOM Elements Discovery:', {
            tableElement: $('#discards-table').length > 0,
            farmsDropdown: elements.farms ? elements.farms.length > 0 : false,
            sectionsDropdown: elements.sections ? elements.sections.length > 0 : false,
            fieldsDropdown: elements.fields ? elements.fields.length > 0 : false,
            scannerInput: elements.scanner ? elements.scanner.length > 0 : false,
            formContainer: elements.container ? elements.container.length > 0 : false
        });
        
        console.log('🔍 Element Selectors Found:', {
            farms: elements.farms ? elements.farms.get(0)?.tagName + (elements.farms.get(0)?.id ? '#' + elements.farms.get(0).id : '') + (elements.farms.get(0)?.name ? '[name="' + elements.farms.get(0).name + '"]' : '') : 'Not found',
            sections: elements.sections ? elements.sections.get(0)?.tagName + (elements.sections.get(0)?.id ? '#' + elements.sections.get(0).id : '') + (elements.sections.get(0)?.name ? '[name="' + elements.sections.get(0).name + '"]' : '') : 'Not found',
            fields: elements.fields ? elements.fields.get(0)?.tagName + (elements.fields.get(0)?.id ? '#' + elements.fields.get(0).id : '') + (elements.fields.get(0)?.name ? '[name="' + elements.fields.get(0).name + '"]' : '') : 'Not found',
            scanner: elements.scanner ? elements.scanner.get(0)?.tagName + (elements.scanner.get(0)?.id ? '#' + elements.scanner.get(0).id : '') + (elements.scanner.get(0)?.name ? '[name="' + elements.scanner.get(0).name + '"]' : '') : 'Not found'
        });
        
        console.log('📊 Managers & Functions:', {
            tableManager: typeof window.discardsTableManager !== 'undefined',
            tableManagerInitialized: window.discardsTableManager ? window.discardsTableManager.isInitialized() : false,
            csvHandler: typeof window.csvHandler !== 'undefined',
            factory: typeof window.Factory !== 'undefined',
            ajaxFunction: typeof window.ajax_fetchOrionFieldsData !== 'undefined',
            httpMethods: typeof window.HTTP_METHODS !== 'undefined'
        });
        
        console.log('🔧 Initialization:', {
            initializationComplete: state.initializationComplete,
            fieldsDataLoaded: state.fieldsData.length > 0
        });
        
        console.groupEnd();
    }
    
    // ============================================================================
    // INITIALIZATION TRIGGER
    // ============================================================================
    
    // Run diagnostic first
    runDiagnostic();
    
    // Wait for DOM to be fully ready, then initialize
    setTimeout(initializeApp, 500);
    
    console.log('App: Module loaded and initialization scheduled');
    
    // ============================================================================
    // GLOBAL EXPORTS
    // ============================================================================
    
    // Export key functions for external access and debugging
    window.orionDiscardApp = {
        // Public API
        showMessage: showMessage,
        processBarcodeInput: processBarcodeInput,
        loadDropdownData: loadDropdownData,
        getCurrentSelection: getCurrentSelection,
        
        // Diagnostic functions
        runDiagnostic: runDiagnostic,
        checkBasicDependencies: checkBasicDependencies,
        
        // State information
        isInitialized: () => state.initializationComplete,
        getFieldsData: () => state.fieldsData,
        
        // Utility functions
        clearTable: clearTable,
        validateBarcodeFormat: validateBarcodeFormat,
        
        // Test functions for debugging
        testBarcodeProcessing: function(testBarcode) {
            console.log('🧪 Testing barcode processing with:', testBarcode);
            processBarcodeInput(testBarcode || 'TEST123');
        },
        
        // Debug function: Force reload dropdown data
        forceReloadDropdowns: function() {
            console.log('🔄 Force reloading dropdown data...');
            refreshElements();
            const $farms = getElement('farms');
            if ($farms) {
                console.log('✅ Farms element found:', $farms[0]);
            } else {
                console.log('❌ Farms element not found');
                return;
            }
            
            return loadDropdownData()
                .then((data) => {
                    console.log('✅ Dropdown data reloaded successfully:', data.length, 'items');
                    return data;
                })
                .catch((error) => {
                    console.error('❌ Failed to reload dropdown data:', error);
                    throw error;
                });
        },
        
        // Debug function: Check current dropdown state
        checkDropdownState: function() {
            console.log('🔍 Checking dropdown state...');
            refreshElements();
            const elements = state.cachedElements;
            
            console.log('Found elements:', {
                farms: elements?.farms ? `${elements.farms.length} element(s)` : 'NOT FOUND',
                sections: elements?.sections ? `${elements.sections.length} element(s)` : 'NOT FOUND',
                fields: elements?.fields ? `${elements.fields.length} element(s)` : 'NOT FOUND',
                scanner: elements?.scanner ? `${elements.scanner.length} element(s)` : 'NOT FOUND'
            });
            
            if (elements?.farms) {
                const $farms = elements.farms;
                console.log('Farms dropdown:', {
                    element: $farms[0],
                    options: $farms.find('option').length,
                    disabled: $farms.prop('disabled'),
                    value: $farms.val()
                });
            }
            
            console.log('Fields data:', {
                loaded: state.fieldsData.length > 0,
                count: state.fieldsData.length,
                farms: state.fieldsData.filter(item => item.field_type === 'farm').length,
                sections: state.fieldsData.filter(item => item.field_type === 'sections').length,
                fields: state.fieldsData.filter(item => item.field_type === 'fields').length
            });
            
            return {
                elements: elements,
                fieldsData: state.fieldsData
            };
        },
        
        testAjaxFunction: function() {
            console.log('🧪 Testing AJAX function availability:');
            const tests = {
                'Factory available': typeof window.Factory !== 'undefined',
                'BuildAjaxParamToValidateBarcode available': typeof window.Factory?.BuildAjaxParamToValidateBarcode === 'function',
                'AJAX function available': typeof window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode === 'function',
                'HTTP_METHODS available': typeof window.HTTP_METHODS !== 'undefined'
            };
            
            Object.entries(tests).forEach(([test, result]) => {
                console.log(`${result ? '✅' : '❌'} ${test}`);
            });
            
            if (window.Factory?.BuildAjaxParamToValidateBarcode) {
                const testParams = window.Factory.BuildAjaxParamToValidateBarcode(
                    config.site, config.year, 'orion-discard', 'TEST123'
                );
                console.log('Test AJAX params:', testParams);
            }
        },
        
        // Debug function: Show table data with IDs
        showTableDataDebug: function() {
            if (!window.discardsTableManager || !window.discardsTableManager.isInitialized()) {
                console.log('❌ Table manager not initialized');
                return;
            }
            
            // Use the table manager's debug function
            const postIds = window.discardsTableManager.debugPostIds();
            
            const data = window.discardsTableManager.getData();
            console.log('📊 Current table data:');
            console.table(data.map((row, index) => ({
                Index: index,
                ID: row.id || 'NO_ID',
                PostID: row.post_id || 'NO_POST_ID', 
                Barcode: row.barcd || 'NO_BARCODE',
                Status: row.status || 'NO_STATUS',
                IsDiscarded: row.isDiscarded || 'NO_FLAG',
                Field: row.field || 'NO_FIELD'
            })));
            
            return data;
        },
        
        // Debug function: Test post_id lookup
        testPostIdLookup: function(testPostId) {
            if (!window.discardsTableManager || !window.discardsTableManager.isInitialized()) {
                console.log('❌ Table manager not initialized');
                return;
            }
            
            const postId = testPostId || '12345';
            console.log('🔍 Testing post_id lookup for:', postId);
            
            const data = window.discardsTableManager.getData();
            const found = data.find(row => String(row.id) === String(postId) || String(row.post_id) === String(postId));
            
            if (found) {
                console.log('✅ Found record with post_id:', postId);
                console.log('Record data:', found);
                
                // Test the update function
                const updated = window.discardsTableManager.updateRowStatusById(postId, '🧪');
                console.log('Update result:', updated);
                
                // Reset after 3 seconds
                setTimeout(() => {
                    window.discardsTableManager.updateRowStatusById(postId, found.status || '❌');
                }, 3000);
                
            } else {
                console.log('❌ No record found with post_id:', postId);
                console.log('Available post_ids:');
                data.forEach((row, index) => {
                    console.log(`  Row ${index}: id=${row.id}, post_id=${row.post_id}`);
                });
            }
        }
    };
    
    console.log('App: Global exports configured');
});