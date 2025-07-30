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
    // GLOBAL VARIABLES
    // ============================================================================
    
    let fieldsData = [];
    let barcodeValidationTimeout = null;
    let initializationComplete = false;
    
    const site = orionDiscard.site || "PRSA";
    const year = orionDiscard.year || new Date().getFullYear();
    const apiUrl = "http://192.168.96.84:8080/orion/wp-json/orion-maps-fields/v1/fields";
    
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
                loadDropdownData();
                setupEventHandlers();
                setupBarcodeScanning();
                
                initializationComplete = true;
                console.log('App: Initialization complete');
                showMessage('Sistema de descarte inicializado correctamente', 'success');
                
            } else {
                console.error('App: Failed to initialize - table manager not available');
                showMessage('Error: No se pudo inicializar el sistema de tablas', 'error');
            }
        });
    }
    
    /**
     * Check basic dependencies
     */
    function checkBasicDependencies() {
        // Try multiple selectors for form containers (vForm compatibility)
        const formContainer = $('#vform-container').length > 0 || 
                             $('[id*="orion-discard-form"]').length > 0 ||
                             $('.orion-discard-admin-form').length > 0 ||
                             $('.vform-container').length > 0;
        
        const checks = {
            jQuery: typeof $ !== 'undefined',
            orionDiscard: typeof orionDiscard !== 'undefined',
            site: !!site,
            formContainer: formContainer,
            tableElement: $('#discards-table').length > 0,
            factory: typeof window.Factory !== 'undefined',
            ajaxFunction: typeof window.ajax_fetchOrionFieldsData !== 'undefined',
            httpMethods: typeof window.HTTP_METHODS !== 'undefined'
        };
        
        console.log('App: Basic dependency check:', checks);
        
        // More flexible check - only require essential dependencies
        const essentialChecks = {
            jQuery: checks.jQuery,
            orionDiscard: checks.orionDiscard,
            site: checks.site,
            factory: checks.factory,
            ajaxFunction: checks.ajaxFunction,
            httpMethods: checks.httpMethods
        };
        
        const allGood = Object.values(essentialChecks).every(check => check);
        if (!allGood) {
            console.error('App: Essential dependencies failed:', essentialChecks);
            
            // Show specific missing dependencies
            const missing = Object.keys(essentialChecks).filter(key => !essentialChecks[key]);
            showMessage(`Dependencias esenciales faltantes: ${missing.join(', ')}`, 'error');
        }
        
        // Warn about optional dependencies
        if (!checks.formContainer) {
            console.warn('App: Form container not found - will search for form elements dynamically');
        }
        if (!checks.tableElement) {
            console.warn('App: Table element not found - table features may be limited');
        }
        
        return allGood;
    }
    
    /**
     * Wait for table manager to be available and initialize it
     */
    function waitForTableManager(callback) {
        let attempts = 0;
        const maxAttempts = 10; // Reduced from 50 to 10 attempts
        
        function checkTableManager() {
            attempts++;
            
            if (attempts > maxAttempts) {
                console.warn('App: Table manager not available after', maxAttempts, 'attempts - continuing without it');
                callback(true); // Continue even if table manager fails
                return;
            }
            
            // Check if table manager is available
            if (typeof window.discardsTableManager !== 'undefined') {
                // Check if table element exists before initializing
                const $table = $('#discards-table');
                if ($table.length === 0) {
                    console.warn('App: No table element found - skipping table manager initialization');
                    callback(true); // Continue without table
                    return;
                }
                
                // Try to initialize it
                if (!window.discardsTableManager.isInitialized()) {
                    console.log('App: Initializing table manager');
                    try {
                        const initResult = window.discardsTableManager.init();
                        if (initResult) {
                            console.log('App: Table manager initialized successfully');
                            callback(true);
                            return;
                        } else {
                            console.warn('App: Table manager initialization failed, retrying...');
                        }
                    } catch (error) {
                        console.error('App: Table manager initialization error:', error);
                        console.warn('App: Continuing without table manager');
                        callback(true); // Continue even if initialization fails
                        return;
                    }
                } else {
                    console.log('App: Table manager already initialized');
                    callback(true);
                    return;
                }
            }
            
            // Retry after delay
            setTimeout(checkTableManager, 200); // Increased delay
        }
        
        checkTableManager();
    }
    
    // ============================================================================
    // UTILITY FUNCTIONS FOR ELEMENT DISCOVERY
    // ============================================================================
    
    /**
     * Find form elements with flexible selectors (vForm compatibility)
     */
    function findFormElements() {
        const elements = {
            farms: null,
            sections: null,
            fields: null,
            scanner: null,
            container: null
        };
        
        // Try multiple selector patterns for each element
        const selectors = {
            farms: ['#farms', '[name="farms"]', 'select[name*="farm"]', 'select[id*="farm"]'],
            sections: ['#sections', '[name="sections"]', 'select[name*="section"]', 'select[id*="section"]'],
            fields: ['#fields', '[name="fields"]', 'select[name*="field"]', 'select[id*="field"]'],
            scanner: ['#scanner-input', '[name="scanner"]', 'input[name*="scanner"]', 'input[id*="scanner"]', 'input[name*="barcode"]'],
            container: ['#vform-container', '.vform-container', '.orion-discard-admin-form', '[id*="orion-discard-form"]']
        };
        
        for (const [key, selectorArray] of Object.entries(selectors)) {
            for (const selector of selectorArray) {
                const $element = $(selector);
                if ($element.length > 0) {
                    elements[key] = $element;
                    console.log(`App: Found ${key} element with selector: ${selector}`);
                    break;
                }
            }
            
            if (!elements[key]) {
                console.warn(`App: Could not find ${key} element with any selector:`, selectorArray);
            }
        }
        
        return elements;
    }
    
    /**
     * Get or find specific element
     */
    function getElement(type) {
        if (!window.appElements) {
            window.appElements = findFormElements();
        }
        return window.appElements[type];
    }
    
    /**
     * Refresh element discovery (call when DOM changes)
     */
    function refreshElements() {
        window.appElements = findFormElements();
        console.log('App: Elements refreshed:', window.appElements);
        
        // If critical elements are missing, try to create them or provide fallbacks
        ensureCriticalElements();
    }
    
    /**
     * Ensure critical elements exist (create fallbacks if necessary)
     */
    function ensureCriticalElements() {
        const elements = window.appElements;
        
        // If we can't find form elements but there's a vForm, try to enhance it
        if (!elements.farms && !elements.sections && !elements.fields) {
            console.warn('App: No form elements found - looking for vForm containers');
            
            // Look for any form elements that might be from vForm
            const $vformElements = $('form select, form input[type="text"]');
            console.log('App: Found', $vformElements.length, 'form elements in page');
            
            if ($vformElements.length > 0) {
                showMessage('Formulario detectado - Configurando compatibilidad', 'info');
                
                // Try to identify elements by their position or labels
                $vformElements.each(function(index, element) {
                    const $elem = $(element);
                    const label = $elem.prev('label').text().toLowerCase() || 
                                  $elem.parent().find('label').text().toLowerCase() ||
                                  $elem.attr('placeholder')?.toLowerCase() || '';
                    
                    console.log(`App: Form element ${index}: ${element.tagName} - "${label}"`);
                    
                    // Assign IDs based on likely content
                    if (!elements.farms && (label.includes('farm') || label.includes('granja') || index === 0)) {
                        $elem.attr('id', 'farms-dynamic');
                        elements.farms = $elem;
                        console.log('App: Assigned farms element');
                    } else if (!elements.sections && (label.includes('section') || label.includes('sección') || index === 1)) {
                        $elem.attr('id', 'sections-dynamic');
                        elements.sections = $elem;
                        console.log('App: Assigned sections element');
                    } else if (!elements.fields && (label.includes('field') || label.includes('campo') || index === 2)) {
                        $elem.attr('id', 'fields-dynamic');
                        elements.fields = $elem;
                        console.log('App: Assigned fields element');
                    } else if (!elements.scanner && ($elem.is('input[type="text"]') && (label.includes('scan') || label.includes('código') || label.includes('barcode')))) {
                        $elem.attr('id', 'scanner-dynamic');
                        elements.scanner = $elem;
                        console.log('App: Assigned scanner element');
                    }
                });
            }
        }
        
        window.appElements = elements;
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
        
        // Add CSS for loading states if not already present
        if (!$('#orion-loading-styles').length) {
            $('head').append(`
                <style id="orion-loading-styles">
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
        
        console.log('App: Form setup complete');
    }
    
    // ============================================================================
    // DATA LOADING AND API INTEGRATION
    // ============================================================================
    
    /**
     * Load dropdown data from API using Factory and AJAX functions
     */
    function loadDropdownData() {
        console.log('App: Loading dropdown data for site:', site);
        
        // Refresh elements to get latest form state
        refreshElements();
        
        const $farms = getElement('farms');
        
        if (!$farms) {
            console.error('App: No farms dropdown found - cannot load data');
            showMessage('Error: No se encontró el dropdown de granjas', 'error');
            return;
        }
        
        console.log('App: Using farms element:', $farms[0]);
        
        // Add loading class to farms dropdown
        $farms.addClass('loading');
        
        // Factory is guaranteed to be available at this point
        var ajaxParam = window.Factory.BuildAjaxParamToDownloadDropdownsData(site);
        
        // Verify that parameters were generated correctly
        if (!ajaxParam) {
            showMessage('Error: No se pudieron generar los parámetros AJAX', 'error');
            $farms.removeClass('loading');
            console.error('App: Factory returned null for dropdown parameters');
            return;
        }
        
        console.log('App: Generated dropdown parameters:', ajaxParam);
        
        // Use AJAX function from ajax.js with callbacks
        if (typeof window.ajax_fetchOrionFieldsData !== 'function') {
            showMessage('Error: Funciones AJAX no cargadas', 'error');
            $farms.removeClass('loading');
            return;
        }
        
        console.log('App: AJAX Param:', ajaxParam);
        
        window.ajax_fetchOrionFieldsData(
            ajaxParam,
            apiUrl,
            window.HTTP_METHODS.GET,
            function(data) {
                // Success callback
                fieldsData = data.data.fields || [];
                
                console.log('App: Fields data loaded successfully:', fieldsData.length, 'items');
                
                processApiData(fieldsData);
            },
            // Error callback
            function(errorMessage) {
                console.error('App: Error loading fields data:', errorMessage);
                showMessage(errorMessage, 'error');
                
                // Provide retry option
                setTimeout(function() {
                    if (confirm('¿Desea intentar cargar los datos nuevamente?')) {
                        loadDropdownData();
                    }
                }, 2000);
            },
            // Complete callback
            function() {
                if ($farms) {
                    $farms.removeClass('loading');
                }
            }
        );
    }
    
    /**
     * Process API data and populate dropdowns
     */
    function processApiData(data) {
        if (!data || !Array.isArray(data)) {
            console.error('App: Invalid API data format');
            showMessage('Formato de datos inválido recibido del servidor', 'error');
            return;
        }
        
        // fieldsData is already set in loadDropdownData, but ensure it's properly assigned
        fieldsData = data;
        console.log('App: Processing data for', fieldsData.length, 'items');
        
        // Extract and populate farms
        const farms = fieldsData.filter(item => item.field_type === 'farm');
        
        if (farms.length === 0) {
            console.warn('App: No farms found in data');
            showMessage('No se encontraron granjas en los datos', 'warning');
            return;
        }
        
        populateFarmDropdown(farms);

        console.log('App: Data processing complete');
        
        // Show success message
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
     * Populate sections dropdown based on selected farm
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
        
        const sections = fieldsData.filter(item => 
            item.field_type === 'sections' && item.farm_name === farmId
        );
        
        sections.forEach(section => {
            $sectionsSelect.append(`<option value="${section.id}">${section.title}</option>`);
        });
        
        // Enable sections dropdown
        $sectionsSelect.prop('disabled', false);
        showLoadingIndicator('sections', false);
        
        console.log('App: Sections dropdown populated with', sections.length, 'options');
    }
    
    /**
     * Populate fields dropdown based on selected section
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
        
        const fields = fieldsData.filter(item => 
            item.field_type === 'fields' && item.section_name === sectionId
        );
        
        fields.forEach(field => {
            $fieldsSelect.append(`<option value="${field.id}">${field.title}</option>`);
        });
        
        // Enable fields dropdown
        $fieldsSelect.prop('disabled', false);
        showLoadingIndicator('fields', false);
        
        console.log('App: Fields dropdown populated with', fields.length, 'options');
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
     * Setup barcode scanning functionality
     */
    function setupBarcodeScanning() {
        console.log('App: Setting up barcode scanning');
        
        // Use event delegation for scanner input to work with dynamic forms
        const $container = getElement('container') || $(document);
        
        // Scanner input handling - use event delegation
        $container.on('input', 'input[name*="scanner"], input[id*="scanner"], input[name*="barcode"], #scanner-input', function() {
            const scannedCode = $(this).val().trim();
            console.log('📥 App: Scanner input detected, value:', scannedCode);
            
            if (scannedCode.length > 0) {
                console.log('App: Valid barcode input detected, setting timeout...');
                
                // Clear previous timeout
                if (barcodeValidationTimeout) {
                    clearTimeout(barcodeValidationTimeout);
                    console.log('App: Cleared previous validation timeout');
                }
                
                // Set new timeout for validation
                barcodeValidationTimeout = setTimeout(function() {
                    console.log('⏰ App: Timeout executed, processing barcode:', scannedCode);
                    processBarcodeInput(scannedCode);
                    // Clear input after processing - find the specific element that triggered
                    const $scanner = getElement('scanner');
                    if ($scanner) {
                        $scanner.val('');
                        console.log('App: Scanner input cleared');
                    }
                }, 300); // Small delay to allow complete barcode entry
            } else {
                console.log('App: Empty scanner input, ignoring');
            }
        });
        
        // Scanner input enter key - use event delegation
        $container.on('keypress', 'input[name*="scanner"], input[id*="scanner"], input[name*="barcode"], #scanner-input', function(e) {
            console.log('⌨️ App: Keypress detected on scanner input, key:', e.which);
            
            if (e.which === 13) { // Enter key
                console.log('App: Enter key pressed on scanner input');
                e.preventDefault();
                const scannedCode = $(this).val().trim();
                console.log('App: Processing barcode from Enter key:', scannedCode);
                
                if (scannedCode.length > 0) {
                    // Clear timeout since we're processing immediately
                    if (barcodeValidationTimeout) {
                        clearTimeout(barcodeValidationTimeout);
                        console.log('App: Cleared validation timeout for immediate processing');
                    }
                    processBarcodeInput(scannedCode);
                    $(this).val('');
                    console.log('App: Scanner input cleared after Enter key processing');
                } else {
                    console.log('App: Empty scanner input on Enter key, ignoring');
                }
            }
        });
        
        // Focus management - use event delegation
        $container.on('focus', 'input[name*="scanner"], input[id*="scanner"], input[name*="barcode"], #scanner-input', function() {
            $(this).select(); // Select all text when focused
        });
        
        console.log('App: Barcode scanning setup complete');
    }
    
    /**
     * Process scanned barcode input with AJAX validation
     */
    function processBarcodeInput(barcode) {
        console.log('🔍 App: Processing barcode:', barcode);
        
        // Validate barcode format (basic validation)
        if (!validateBarcodeFormat(barcode)) {
            console.warn('App: Invalid barcode format:', barcode);
            showMessage(`Código de barras inválido: ${barcode}`, 'warning');
            return;
        }
        console.log('✅ App: Barcode format validation passed');
        
        // Check if table is initialized
        if (!window.discardsTableManager || !window.discardsTableManager.isInitialized()) {
            console.warn('App: Table manager not initialized');
            showMessage('La tabla no está lista. Seleccione un campo primero.', 'warning');
            return;
        }
        console.log('✅ App: Table manager is initialized');
        
        // Check if barcode exists in table first
        const existingRecords = window.discardsTableManager.findByBarcode(barcode);
        console.log('App: Found existing records for barcode:', existingRecords.length);
        
        if (existingRecords.length === 0) {
            console.warn('App: Barcode not found in current table:', barcode);
            showMessage(`Material ${barcode} no encontrado en la tabla actual`, 'warning');
            return;
        }
        console.log('✅ App: Barcode exists in table, proceeding with validation');
        
        // Show loading message
        showMessage(`🔄 Validando código de barras: ${barcode}...`, 'info');
        
        // Check if Factory is available
        if (!window.Factory || typeof window.Factory.BuildAjaxParamToValidateBarcode !== 'function') {
            console.error('App: Factory or BuildAjaxParamToValidateBarcode function not available');
            showMessage('Error: Factory de parámetros AJAX no disponible', 'error');
            return;
        }
        console.log('✅ App: Factory is available');
        
        // Build AJAX parameters for barcode validation
        console.log('App: Building AJAX params with:', { site, year, recordType: 'orion-discard', barcode });
        const ajaxParam = window.Factory.BuildAjaxParamToValidateBarcode(
            site,
            year,
            'orion-discard',
            barcode
        );
        
        if (!ajaxParam) {
            console.error('App: Failed to build AJAX parameters');
            showMessage('Error: No se pudieron generar los parámetros AJAX', 'error');
            return;
        }
        
        console.log('✅ App: AJAX parameters built successfully:', ajaxParam);
        
        // Check if AJAX function is available
        if (!window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode) {
            console.error('App: AJAX validation function not available');
            showMessage('Error: Función de validación AJAX no disponible', 'error');
            return;
        }
        console.log('✅ App: AJAX validation function is available');
        
        // Call AJAX function to validate and mark barcode as discarded
        console.log('🚀 App: Calling AJAX validation function...');
        window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode(
            ajaxParam,
            window.HTTP_METHODS.POST,
            // Success callback
            function(response) {
                console.log('✅ App: Barcode validation successful:', response);
                
                // Update row status in table to show checkmark
                const updated = window.discardsTableManager.updateRowStatus(barcode, '✅');
                
                if (updated) {
                    showMessage(`✅ Material ${barcode} marcado como descartado exitosamente`, 'success');
                    
                    // Show statistics
                    const stats = window.discardsTableManager.getStatistics();
                    console.log('App: Current statistics:', stats);
                    
                    // Focus back to scanner
                    setTimeout(function() {
                        const $scanner = getElement('scanner');
                        if ($scanner) {
                            $scanner.focus();
                        }
                    }, 500);
                    
                } else {
                    console.warn('App: Failed to update row status in table');
                    showMessage(`Error al actualizar el estado visual del material ${barcode}`, 'warning');
                }
            },
            // Error callback
            function(errorMessage) {
                console.error('❌ App: Barcode validation failed:', errorMessage);
                
                if (errorMessage.includes('already discarded')) {
                    showMessage(`⚠️ Material ${barcode} ya fue descartado anteriormente`, 'warning');
                } else if (errorMessage.includes('not found')) {
                    showMessage(`❌ Material ${barcode} no encontrado en el sistema`, 'error');
                } else {
                    showMessage(`Error al validar código: ${errorMessage}`, 'error');
                }
            },
            // Complete callback
            function() {
                console.log('🏁 App: Barcode validation request completed');
            }
        );
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
     * Show message to user with enhanced styling
     */
    function showMessage(message, type = 'info') {
        console.log(`App Message [${type}]: ${message}`);
        
        // Use global message function if available
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            // Fallback notification system
            const alertClass = type === 'error' ? 'alert-danger' : 
                               type === 'success' ? 'alert-success' : 
                               type === 'warning' ? 'alert-warning' : 'alert-info';
            
            const icon = type === 'error' ? '❌' : 
                        type === 'success' ? '✅' : 
                        type === 'warning' ? '⚠️' : 'ℹ️';
            
            const $alert = $(`
                <div class="alert ${alertClass} alert-dismissible fade show orion-message" role="alert" style="margin-bottom: 10px;">
                    ${icon} ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
            
            // Find message container using flexible approach
            const $container = getElement('container');
            let $messageContainer = $('#orion-messages');
            
            if ($messageContainer.length === 0 && $container) {
                $messageContainer = $container;
            }
            if ($messageContainer.length === 0) {
                $messageContainer = $('body');
            }
            
            $messageContainer.prepend($alert);
            
            // Auto-remove after delay
            setTimeout(function() {
                $alert.fadeOut(function() {
                    $(this).remove();
                });
            }, type === 'error' ? 8000 : 5000);
        }
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
            site: site,
            year: year,
            apiUrl: apiUrl
        });
        
        // Refresh elements discovery and show results
        refreshElements();
        const elements = window.appElements || {};
        
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
            initializationComplete: initializationComplete,
            fieldsDataLoaded: fieldsData.length > 0
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
        isInitialized: function() { return initializationComplete; },
        getFieldsData: function() { return fieldsData; },
        
        // Utility functions
        clearTable: clearTable,
        validateBarcodeFormat: validateBarcodeFormat,
        
        // Test functions for debugging
        testBarcodeProcessing: function(testBarcode) {
            console.log('🧪 Testing barcode processing with:', testBarcode);
            processBarcodeInput(testBarcode || 'TEST123');
        },
        
        testAjaxFunction: function() {
            console.log('🧪 Testing AJAX function availability:');
            console.log('Factory available:', typeof window.Factory !== 'undefined');
            console.log('BuildAjaxParamToValidateBarcode available:', typeof window.Factory?.BuildAjaxParamToValidateBarcode === 'function');
            console.log('AJAX function available:', typeof window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode === 'function');
            console.log('HTTP_METHODS available:', typeof window.HTTP_METHODS !== 'undefined');
            
            if (window.Factory && window.Factory.BuildAjaxParamToValidateBarcode) {
                const testParams = window.Factory.BuildAjaxParamToValidateBarcode(site, year, 'orion-discard', 'TEST123');
                console.log('Test AJAX params:', testParams);
            }
        }
    };
    
    console.log('App: Global exports configured');
});