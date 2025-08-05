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
    
    // ✅ SECURITY: Only execute on Orion Discard plugin pages
    if (!isOrionDiscardPage()) {
        return; // Exit early if not on the correct page
    }
    
    console.log('App: Starting Orion Discard Plugin on verified page');
    
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
            console.log('Orion Discard App: Not on plugin page, exiting');
        }
        
        return isValid;
    }
    
    // ============================================================================
    // GLOBAL VARIABLES & CONFIGURATION
    // ============================================================================
    
    const config = {
        site: orionDiscard.site || "PRSA",
        year: orionDiscard.year || new Date().getFullYear(),
        apiUrl: "http://orion.test:8080//orion/wp-json/orion-maps-fields/v1/fields",
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
                
                // Inicializar el dashboard inmediatamente después de que todo esté listo
                initializeDashboardWithRetry();
                
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
        
        // Debug function: Test dashboard
        testDashboard: function() {
            console.log('🧪 Testing dashboard...');
            
            // 1. Verificar que existen los elementos
            const elements = {
                container: document.querySelector('#orion-dashboard'),
                title: document.querySelector('.dashboard-title'),
                cardsRow: document.querySelector('.dashboard-cards-row'),
                totalCard: document.querySelector('.total-card'),
                discardedCard: document.querySelector('.discarded-card'),
                pendingCard: document.querySelector('.pending-card'),
                progressCard: document.querySelector('.progress-card'),
                total: document.querySelector('#total-materials'),
                discarded: document.querySelector('#discarded-materials'),
                pending: document.querySelector('#pending-materials'),
                progress: document.querySelector('#progress-percentage'),
                progressBar: document.querySelector('#progress-bar')
            };
            
            console.log('Dashboard elements check:', elements);
            
            // 2. Si no existe el container, mostrar error
            if (!elements.container) {
                console.error('❌ Dashboard container not found! HTML may not be loaded.');
                return false;
            }
            
            console.log('✅ Dashboard HTML structure found');
            
            // 3. Verificar CSS del layout horizontal
            if (elements.cardsRow) {
                const cardsRowStyle = window.getComputedStyle(elements.cardsRow);
                console.log('Cards row CSS:', {
                    display: cardsRowStyle.display,
                    flexDirection: cardsRowStyle.flexDirection,
                    flexWrap: cardsRowStyle.flexWrap,
                    gap: cardsRowStyle.gap,
                    justifyContent: cardsRowStyle.justifyContent
                });
            }
            
            // 4. Probar actualización manual con valores de ejemplo
            if (elements.total) elements.total.textContent = '150';
            if (elements.discarded) elements.discarded.textContent = '38';
            if (elements.pending) elements.pending.textContent = '112';
            if (elements.progress) elements.progress.textContent = '25%';
            if (elements.progressBar) {
                elements.progressBar.style.width = '25%';
                elements.progressBar.setAttribute('aria-valuenow', '25');
            }
            
            console.log('✅ Dashboard manually updated with test values');
            
            // 5. Probar función del table manager
            if (window.discardsTableManager && window.discardsTableManager.updateDashboard) {
                setTimeout(() => {
                    console.log('🔄 Testing table manager dashboard update...');
                    window.discardsTableManager.updateDashboard();
                    
                    // Ejecutar debug del dashboard del table manager
                    if (window.discardsTableManager.debugDashboard) {
                        console.log('🔍 Running table manager dashboard debug...');
                        const debugResult = window.discardsTableManager.debugDashboard();
                        console.log('Debug result:', debugResult);
                    }
                }, 1000);
            }
            
            return 'Dashboard test completed - check console for details';
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
        },
        
        // Full diagnostic test
        runFullDiagnostic: function() {
            console.log('\n🧪 =================');
            console.log('🧪 FULL DIAGNOSTIC TEST');
            console.log('🧪 =================\n');
            
            // 1. Check DOM elements
            console.log('1️⃣ Checking DOM elements...');
            const elements = {
                'Discards table': $('#discards-table').length,
                'Form container': $('#vform-container').length,
                'Scanner input': $('#orion-barcode-scanner').length
            };
            
            console.table(elements);
            
            // 2. Check JavaScript objects
            console.log('\n2️⃣ Checking JavaScript objects...');
            const objects = {
                'window.orionDiscardsTable': !!window.orionDiscardsTable,
                'window.discardsTableManager': !!window.discardsTableManager,
                'DataTable initialized': !!(window.orionDiscardsTable && window.orionDiscardsTable.data),
                'Table has data': !!(window.orionDiscardsTable && window.orionDiscardsTable.data && window.orionDiscardsTable.data().count() > 0)
            };
            
            console.table(objects);
            
            console.log('\n🧪 DIAGNOSTIC TEST COMPLETED 🧪\n');
            
            return 'Diagnostic test completed - check console for results';
        }
    };

    // ============================================================================
    // DASHBOARD INITIALIZATION HELPER
    // ============================================================================
    
    /**
     * Inicializar dashboard con reintentos
     */
    function initializeDashboardWithRetry(attempts = 0, maxAttempts = 5) {
        console.log(`App: Intento ${attempts + 1} de inicialización del dashboard`);
        
        // Verificar que existan los elementos HTML del dashboard
        const dashboardContainer = document.querySelector('#orion-dashboard');
        const dashboardCards = document.querySelector('.dashboard-cards-row');
        
        if (!dashboardContainer || !dashboardCards) {
            console.warn('App: Elementos del dashboard no encontrados en el DOM');
            if (attempts < maxAttempts) {
                setTimeout(() => initializeDashboardWithRetry(attempts + 1, maxAttempts), 500);
                return;
            }
            console.error('App: No se pudieron encontrar los elementos del dashboard después de varios intentos');
            return;
        }
        
        // Verificar que el table manager esté disponible
        if (!window.discardsTableManager) {
            console.warn('App: Table manager no disponible');
            if (attempts < maxAttempts) {
                setTimeout(() => initializeDashboardWithRetry(attempts + 1, maxAttempts), 500);
                return;
            }
            console.error('App: Table manager no disponible después de varios intentos');
            return;
        }
        
        // Inicializar dashboard
        try {
            if (window.discardsTableManager.initializeDashboard) {
                const success = window.discardsTableManager.initializeDashboard();
                if (success !== false) {
                    console.log('App: Dashboard inicializado correctamente');
                    
                    // Forzar actualización inmediata
                    setTimeout(() => {
                        if (window.discardsTableManager.updateDashboard) {
                            window.discardsTableManager.updateDashboard();
                            console.log('App: Dashboard actualizado inmediatamente');
                        }
                    }, 100);
                } else {
                    console.warn('App: Inicialización del dashboard falló');
                    if (attempts < maxAttempts) {
                        setTimeout(() => initializeDashboardWithRetry(attempts + 1, maxAttempts), 500);
                    }
                }
            }
        } catch (error) {
            console.error('App: Error al inicializar dashboard:', error);
            if (attempts < maxAttempts) {
                setTimeout(() => initializeDashboardWithRetry(attempts + 1, maxAttempts), 500);
            }
        }
    }
    
    // ============================================================================
    // FUNCIONES GLOBALES DE DEBUG
    // ============================================================================
    
    /**
     * Función global para debug inmediato del dashboard
     */
    window.debugOrionDashboard = function() {
        console.log('🔍 DEBUG INMEDIATO DEL DASHBOARD');
        
        // 1. Verificar elementos HTML
        const elements = {
            container: document.querySelector('#orion-dashboard'),
            cardsRow: document.querySelector('.dashboard-cards-row'),
            total: document.querySelector('#total-materials'),
            discarded: document.querySelector('#discarded-materials'),
            pending: document.querySelector('#pending-materials'),
            progress: document.querySelector('#progress-percentage'),
            progressBar: document.querySelector('#progress-bar')
        };
        
        console.log('1. Elementos HTML:', elements);
        
        // 2. Verificar CSS de layout
        if (elements.cardsRow) {
            const style = window.getComputedStyle(elements.cardsRow);
            console.log('2. CSS del layout:', {
                display: style.display,
                flexWrap: style.flexWrap,
                gap: style.gap,
                justifyContent: style.justifyContent
            });
        }
        
        // 3. Verificar Table Manager
        console.log('3. Table Manager disponible:', !!window.discardsTableManager);
        
        // 4. Forzar actualización manual
        if (elements.total) elements.total.textContent = '42';
        if (elements.discarded) elements.discarded.textContent = '15';
        if (elements.pending) elements.pending.textContent = '27';
        if (elements.progress) elements.progress.textContent = '36%';
        if (elements.progressBar) {
            elements.progressBar.style.width = '36%';
            elements.progressBar.setAttribute('aria-valuenow', '36');
        }
        console.log('4. ✅ Valores manuales aplicados');
        
        // 5. Probar función del table manager
        if (window.discardsTableManager) {
            setTimeout(() => {
                console.log('5. 🔄 Probando updateDashboard...');
                window.discardsTableManager.updateDashboard();
                
                if (window.discardsTableManager.debugDashboard) {
                    const debugResult = window.discardsTableManager.debugDashboard();
                    console.log('6. 📊 Debug result:', debugResult);
                }
            }, 1000);
        }
        
        return 'Debug completado - revisar consola';
    };
    
    /**
     * Función para forzar la actualización del dashboard con datos simulados
     */
    window.forceUpdateDashboard = function() {
        console.log('🔥 FORZANDO ACTUALIZACIÓN DEL DASHBOARD');
        
        const elements = {
            total: document.querySelector('#total-materials'),
            discarded: document.querySelector('#discarded-materials'),
            pending: document.querySelector('#pending-materials'),
            progress: document.querySelector('#progress-percentage'),
            progressBar: document.querySelector('#progress-bar')
        };
        
        // Datos simulados para test
        const testData = {
            total: 150,
            discarded: 89,
            pending: 61,
            percentage: 59
        };
        
        // Actualizar elementos directamente
        if (elements.total) {
            elements.total.textContent = testData.total;
            elements.total.style.color = '#17a2b8';
        }
        
        if (elements.discarded) {
            elements.discarded.textContent = testData.discarded;
            elements.discarded.style.color = '#28a745';
        }
        
        if (elements.pending) {
            elements.pending.textContent = testData.pending;
            elements.pending.style.color = '#e67e22';
        }
        
        if (elements.progress) {
            elements.progress.textContent = testData.percentage + '%';
            elements.progress.style.color = '#6f42c1';
        }
        
        if (elements.progressBar) {
            elements.progressBar.style.width = testData.percentage + '%';
            elements.progressBar.setAttribute('aria-valuenow', testData.percentage);
        }
        
        console.log('✅ Dashboard actualizado con datos de prueba:', testData);
        return 'Dashboard actualizado manualmente';
    };

    // Function to force dashboard horizontal layout
    window.forceDashboardLayout = function() {
        console.log('🔧 FORZANDO LAYOUT HORIZONTAL DEL DASHBOARD');
        
        const dashboard = document.querySelector('#orion-dashboard');
        const cardsRow = document.querySelector('.dashboard-cards-row');
        const cards = document.querySelectorAll('.dashboard-card');
        
        if (!dashboard || !cardsRow) {
            console.error('❌ No se encontraron elementos del dashboard');
            return false;
        }
        
        console.log('📊 Elementos encontrados:', {
            dashboard: !!dashboard,
            cardsRow: !!cardsRow,
            cards: cards.length
        });
        
        // Force styles on container
        dashboard.style.cssText = `
            display: block !important;
            width: 100% !important;
            margin: 20px 0 !important;
            padding: 25px !important;
            background: #ffffff !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid #e9ecef !important;
        `;
        
        // Force styles on cards row
        cardsRow.style.cssText = `
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 20px !important;
            justify-content: space-between !important;
            align-items: stretch !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: auto !important;
        `;
        
        // Force styles on individual cards
        cards.forEach((card, index) => {
            card.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                flex: 1 1 0% !important;
                min-width: 200px !important;
                max-width: none !important;
                background: #ffffff !important;
                border-radius: 12px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                border: 2px solid #e9ecef !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
            `;
        });
        
        console.log('✅ Layout horizontal forzado en', cards.length, 'tarjetas');
        return true;
    };

    // Auto-force layout after DOM is loaded
    setTimeout(() => {
        if (window.forceDashboardLayout) {
            console.log('🚀 Auto-aplicando layout horizontal del dashboard...');
            window.forceDashboardLayout();
        }
    }, 1000);
    
    // Debug function for dashboard issues
    window.debugDashboard = function() {
        console.log('🔍 === DASHBOARD DEBUG REPORT ===');
        
        const dashboard = document.querySelector('#orion-dashboard');
        const cardsRow = document.querySelector('.dashboard-cards-row');
        const cards = document.querySelectorAll('.dashboard-card');
        const elements = {
            total: document.querySelector('#total-materials'),
            discarded: document.querySelector('#discarded-materials'),
            pending: document.querySelector('#pending-materials'),
            progress: document.querySelector('#progress-percentage'),
            progressBar: document.querySelector('#progress-bar')
        };
        
        console.log('📊 Elements found:', {
            dashboard: !!dashboard,
            cardsRow: !!cardsRow,
            cardsCount: cards.length,
            totalElement: !!elements.total,
            discardedElement: !!elements.discarded,
            pendingElement: !!elements.pending,
            progressElement: !!elements.progress,
            progressBarElement: !!elements.progressBar
        });
        
        if (dashboard) {
            const dashboardStyles = window.getComputedStyle(dashboard);
            console.log('🎨 Dashboard computed styles:', {
                display: dashboardStyles.display,
                width: dashboardStyles.width,
                visibility: dashboardStyles.visibility,
                opacity: dashboardStyles.opacity,
                position: dashboardStyles.position
            });
        }
        
        if (cardsRow) {
            const cardsRowStyles = window.getComputedStyle(cardsRow);
            console.log('🎨 Cards row computed styles:', {
                display: cardsRowStyles.display,
                flexDirection: cardsRowStyles.flexDirection,
                flexWrap: cardsRowStyles.flexWrap,
                justifyContent: cardsRowStyles.justifyContent,
                alignItems: cardsRowStyles.alignItems,
                gap: cardsRowStyles.gap
            });
        }
        
        console.log('📋 Card contents:');
        elements.total && console.log('  Total:', elements.total.textContent);
        elements.discarded && console.log('  Discarded:', elements.discarded.textContent);
        elements.pending && console.log('  Pending:', elements.pending.textContent);
        elements.progress && console.log('  Progress:', elements.progress.textContent);
        
        // Check table manager
        console.log('🔧 Table Manager Status:', {
            available: !!window.discardsTableManager,
            initialized: window.discardsTableManager?.isInitialized?.(),
            updateDashboard: typeof window.discardsTableManager?.updateDashboard,
            getDashboardStats: typeof window.discardsTableManager?.getDashboardStats
        });
        
        // Test manual dashboard update
        if (window.discardsTableManager && window.discardsTableManager.updateDashboard) {
            console.log('� Testing manual dashboard update...');
            try {
                window.discardsTableManager.updateDashboard();
                console.log('✅ Manual update completed');
            } catch (error) {
                console.error('❌ Manual update failed:', error);
            }
        }
        
        console.log('�🔍 === END DEBUG REPORT ===');
        return 'Debug completed - check console for details';
    };
    
    // Quick dashboard update function
    window.quickUpdateDashboard = function() {
        console.log('⚡ Quick Dashboard Update');
        
        if (!window.discardsTableManager) {
            console.error('❌ Table Manager not available');
            return false;
        }
        
        if (!window.discardsTableManager.isInitialized()) {
            console.error('❌ Table Manager not initialized');
            return false;
        }
        
        try {
            const stats = window.discardsTableManager.getDashboardStats();
            console.log('📊 Current stats:', stats);
            
            // Update elements directly
            const elements = {
                total: document.querySelector('#total-materials'),
                discarded: document.querySelector('#discarded-materials'),
                pending: document.querySelector('#pending-materials'),
                progress: document.querySelector('#progress-percentage'),
                progressBar: document.querySelector('#progress-bar')
            };
            
            if (elements.total) elements.total.textContent = stats.total;
            if (elements.discarded) elements.discarded.textContent = stats.discarded;
            if (elements.pending) elements.pending.textContent = stats.pending;
            if (elements.progress) elements.progress.textContent = stats.percentage + '%';
            if (elements.progressBar) {
                elements.progressBar.style.width = stats.percentage + '%';
                elements.progressBar.setAttribute('aria-valuenow', stats.percentage);
            }
            
            console.log('✅ Dashboard updated directly');
            return true;
        } catch (error) {
            console.error('❌ Quick update failed:', error);
            return false;
        }
    };
    
    // Aggressive dashboard updater - ejecuta sin importar el estado
    window.aggressiveDashboardUpdate = function() {
        console.log('💪 AGGRESSIVE DASHBOARD UPDATE');
        
        const elements = {
            total: document.querySelector('#total-materials'),
            discarded: document.querySelector('#discarded-materials'),
            pending: document.querySelector('#pending-materials'),
            progress: document.querySelector('#progress-percentage'),
            progressBar: document.querySelector('#progress-bar')
        };
        
        console.log('📊 Elements available:', {
            total: !!elements.total,
            discarded: !!elements.discarded,
            pending: !!elements.pending,
            progress: !!elements.progress,
            progressBar: !!elements.progressBar
        });
        
        // Method 1: Try table manager stats
        let stats = null;
        if (window.discardsTableManager && 
            window.discardsTableManager.isInitialized && 
            window.discardsTableManager.isInitialized()) {
            
            try {
                stats = window.discardsTableManager.getDashboardStats();
                console.log('📈 Stats from table manager:', stats);
            } catch (error) {
                console.error('❌ Error getting table manager stats:', error);
            }
        }
        
        // Method 2: Calculate stats directly from table
        if (!stats && window.discardsTableManager && window.discardsTableManager.table) {
            try {
                const table = window.discardsTableManager.table;
                const data = table.data();
                const total = data.count();
                
                let discarded = 0;
                data.each(function(rowData, index) {
                    if (rowData && rowData.status === '✅') {
                        discarded++;
                    }
                });
                
                const pending = total - discarded;
                const percentage = total > 0 ? Math.round((discarded / total) * 100) : 0;
                
                stats = { total, discarded, pending, percentage };
                console.log('📊 Stats calculated directly:', stats);
                
            } catch (error) {
                console.error('❌ Error calculating stats directly:', error);
            }
        }
        
        // Method 3: Use default/test values if nothing else works
        if (!stats) {
            stats = { total: 0, discarded: 0, pending: 0, percentage: 0 };
            console.log('📝 Using default stats:', stats);
        }
        
        // Force update elements
        let updated = false;
        
        if (elements.total) {
            elements.total.textContent = stats.total;
            elements.total.style.color = '#17a2b8';
            console.log('✅ Total updated to:', stats.total);
            updated = true;
        }
        
        if (elements.discarded) {
            elements.discarded.textContent = stats.discarded;
            elements.discarded.style.color = '#28a745';
            console.log('✅ Discarded updated to:', stats.discarded);
            updated = true;
        }
        
        if (elements.pending) {
            elements.pending.textContent = stats.pending;
            elements.pending.style.color = '#e67e22';
            console.log('✅ Pending updated to:', stats.pending);
            updated = true;
        }
        
        if (elements.progress) {
            elements.progress.textContent = stats.percentage + '%';
            elements.progress.style.color = '#6f42c1';
            console.log('✅ Progress updated to:', stats.percentage + '%');
            updated = true;
        }
        
        if (elements.progressBar) {
            elements.progressBar.style.width = stats.percentage + '%';
            elements.progressBar.setAttribute('aria-valuenow', stats.percentage);
            
            // Color based on progress
            if (stats.percentage >= 80) {
                elements.progressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
            } else if (stats.percentage >= 50) {
                elements.progressBar.style.background = 'linear-gradient(90deg, #ffc107, #fd7e14)';
            } else {
                elements.progressBar.style.background = 'linear-gradient(90deg, #6f42c1, #8e44ad)';
            }
            
            console.log('✅ Progress bar updated to:', stats.percentage + '%');
            updated = true;
        }
        
        console.log('💪 Aggressive update result:', updated ? 'SUCCESS' : 'FAILED');
        return { success: updated, stats: stats };
    };
    
    // Auto-aggressive update timer
    window.startAgressiveDashboardTimer = function() {
        console.log('🚀 Starting aggressive dashboard timer...');
        
        // Clear any existing timer
        if (window.aggressiveTimer) {
            clearInterval(window.aggressiveTimer);
        }
        
        // Update every 2 seconds
        window.aggressiveTimer = setInterval(() => {
            // Only update if elements exist
            const totalElement = document.querySelector('#total-materials');
            if (totalElement) {
                window.aggressiveDashboardUpdate();
            }
        }, 2000);
        
        // Initial update
        setTimeout(() => {
            window.aggressiveDashboardUpdate();
        }, 500);
        
        return 'Aggressive timer started';
    };
    
    // Auto-start aggressive timer after DOM is ready
    setTimeout(() => {
        console.log('🚀 Auto-starting aggressive dashboard timer...');
        if (document.querySelector('#orion-dashboard')) {
            window.startAgressiveDashboardTimer();
        }
    }, 2000);
    
    // Master dashboard test function
    window.testAllDashboardMethods = function() {
        console.log('🧪 === TESTING ALL DASHBOARD METHODS ===');
        
        const methods = [
            'debugDashboard',
            'quickUpdateDashboard', 
            'aggressiveDashboardUpdate',
            'debugTableManagerDashboard',
            'forceTableManagerDashboardUpdate',
            'forceDirectDashboardUpdate'
        ];
        
        methods.forEach(method => {
            if (window[method]) {
                console.log(`🔧 Testing ${method}...`);
                try {
                    const result = window[method]();
                    console.log(`✅ ${method} result:`, result);
                } catch (error) {
                    console.error(`❌ ${method} error:`, error);
                }
            } else {
                console.log(`⚠️ ${method} not available`);
            }
        });
        
        console.log('🧪 === END TESTING ===');
        return 'All tests completed - check console for results';
    };
    
    console.log('App: Global exports configured');
});