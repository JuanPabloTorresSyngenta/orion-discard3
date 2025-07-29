/**
 * CSV Handler for Orion Discard Plugin
 * Manages CSV download and processing when all selections are complete
 */

jQuery(document).ready(function($) {
    
    // Variables globales
    let csvData = [];
    var site = orionDiscard.site || 'PRSA';
    var year = orionDiscard.year || new Date().getFullYear();
    
    /**
     * Check if field is selected and trigger data loading
     */
    function checkIfFieldSelected() {
        const fieldSelected = $('#fields').val();
        
        if (fieldSelected && fieldSelected !== '') {
            
            showCSVLoadingIndicator(true);
            
            // Call API with proper callbacks
            window.getDataFrom_vFromRecordType(
                'orion-discard', 
                site, 
                year,
                function(data) {
                    // Success callback
                    processCsvData(data);
                },
                function(error) {
                    // Error callback
                    showCSVLoadingIndicator(false);
                    showMessage('Error al obtener datos: ' + error.message, 'error');
                }
            );
        } else {
            
            // Destroy DataTable if exists and show empty message
            if ($.fn.DataTable.isDataTable('#discards-table')) {
                $('#discards-table').DataTable().destroy();
                window.discardsTable = null;
            }
            
            // Show empty table message
            $('#discards-table tbody').html('<tr><td colspan="17" class="text-center" style="padding: 40px;">Seleccione un campo para cargar los datos</td></tr>');
        }
    }
    
    /**
     * Process JSON data and normalize it
     */
    function processCsvData(jsonContent) {
        
        csvData = [];
        
        try {
            let data = jsonContent;
            
            // Parse if string
            if (typeof jsonContent === 'string') {
                data = JSON.parse(jsonContent);
            }
            
            // Extract records array with the correct property name
            let records = [];
            if (Array.isArray(data)) {
                records = data;
            } else if (data.csv_content && Array.isArray(data.csv_content)) {
                // This is the actual structure being received
                records = data.csv_content;
            } else if (data.data && Array.isArray(data.data)) {
                records = data.data;
            } else if (data.records && Array.isArray(data.records)) {
                records = data.records;
            } else {
                throw new Error('Formato de datos no reconocido - se esperaba csv_content array');
            }
            
            if (records.length === 0) {
                showCSVLoadingIndicator(false);
                showMessage('No hay datos disponibles para el campo seleccionado', 'warning');
                return;
            }
            
            // Normalize each record
            records.forEach(function(record) {
                const normalizedRecord = {
                    crop: record.crop || '',
                    owner: record.owner || '',
                    submission_id: record.submission_id || '',
                    field: record.field || '',
                    extno: record.extno || '',
                    range: record.range || '',
                    row: record.row || '',
                    barcd: record.barcd || '',
                    plot_id: record.plot_id || '',
                    subplot_id: record.subplot_id || '',
                    matid: record.matid || '',
                    abbrc: record.abbrc || '',
                    sd_instruction: record.sd_instruction || '',
                    vform_record_type: record['vform-record-type'] || record.vform_record_type || '',
                    vdata_site: record['vdata-site'] || record.vdata_site || '',
                    vdata_year: record['vdata-year'] || record.vdata_year || '',
                    unique_val: record.UniqueVal || record.unique_val || ''
                };
                
                csvData.push(normalizedRecord);
            });
            
            showCSVLoadingIndicator(false);

            updateTableWithCsvData();
            
        } catch (error) {
            showCSVLoadingIndicator(false);
            showMessage('Error al procesar los datos: ' + error.message, 'error');
        }
    }
    
    /**
     * Update DataTable with processed data - COMPLETELY RECONSTRUCTED
     */
    function updateTableWithCsvData() {
        
        if (csvData.length === 0) {
            showMessage('No hay datos disponibles para mostrar', 'warning');
            return;
        }
        
        // STEP 1: Verificar elemento tabla existe
        const tableElement = document.getElementById('discards-table');

        if (!tableElement) {
            showMessage('Error crítico: Tabla no encontrada en la página', 'error');
            return;
        }
        
        // STEP 2: Verificar estructura de tabla
        const thead = tableElement.querySelector('thead');

        const tbody = tableElement.querySelector('tbody');
        
        if (!thead || !tbody) {
            showMessage('Error: Estructura de tabla incompleta', 'error');
            return;
        }
        
        // STEP 3: Format data for display
        const formattedData = csvData.map(function(row, index) {
            return {
                status: '✗',
                crop: row.crop || '',
                owner: row.owner || '',
                submission_id: row.submission_id || '',
                field: row.field || '',
                extno: row.extno || '',
                range_val: row.range || '',
                row_val: row.row || '',
                barcd: row.barcd || '',
                plot_id: row.plot_id || '',
                subplot_id: row.subplot_id || '',
                matid: row.matid || '',
                abbrc: row.abbrc || '',
                sd_instruction: row.sd_instruction || '',
                vform_record_type: row.vform_record_type || '',
                vdata_site: row.vdata_site || '',
                vdata_year: row.vdata_year || '',
                unique_val: row.unique_val || ''
            };
        });
        
        // STEP 4: Intentar DataTable primero, fallback a tabla simple
        try {
            
            // Destruir cualquier DataTable existente
            if (window.discardsTable && typeof window.discardsTable.destroy === 'function') {

                window.discardsTable.destroy();

                window.discardsTable = null;
            }
            
            // Limpiar cualquier inicialización previa de DataTable
            if ($.fn.DataTable.isDataTable('#discards-table')) {
                $('#discards-table').DataTable().destroy();
            }
            
            // Esperar un momento para asegurar limpieza completa
            setTimeout(function() {
                attemptDataTableCreation(formattedData, tableElement);
            }, 100);
            
        } catch (error) {
            // Fallback inmediato a tabla simple
            showDataInSimpleTable(formattedData);
        }
    }
    
    /**
     * Attempt to create DataTable with extensive error handling
     */
    function attemptDataTableCreation(formattedData, tableElement) {
        try {
            
            // Verificar que jQuery y DataTable estén disponibles
            if (typeof $ === 'undefined') {
                throw new Error('jQuery no está disponible');
            }
            
            if (typeof $.fn.DataTable === 'undefined') {
                throw new Error('DataTable plugin no está disponible');
            }
            
            // Verificar elemento una vez más
            const $table = $('#discards-table');
            if ($table.length === 0) {
                throw new Error('Elemento tabla no encontrado con jQuery');
            }
            
            // Crear DataTable con configuración mínima primero
            window.discardsTable = $table.DataTable({
                data: formattedData,
                destroy: true, // Importante: permite recrear
                columns: [
                    { data: 'status', title: 'Estado', width: '60px', className: 'text-center' },
                    { data: 'crop', title: 'Cultivo' },
                    { data: 'owner', title: 'Propietario' },
                    { data: 'submission_id', title: 'Submission ID' },
                    { data: 'field', title: 'Campo' },
                    { data: 'extno', title: 'ExtNo' },
                    { data: 'range_val', title: 'Range' },
                    { data: 'row_val', title: 'Row' },
                    { data: 'barcd', title: 'Código de Barras' },
                    { data: 'plot_id', title: 'Plot ID' },
                    { data: 'subplot_id', title: 'Subplot ID' },
                    { data: 'matid', title: 'Material ID' },
                    { data: 'abbrc', title: 'ABBRC' },
                    { data: 'sd_instruction', title: 'Instrucción' },
                    { data: 'vform_record_type', title: 'Record Type' },
                    { data: 'vdata_site', title: 'Site' },
                    { data: 'vdata_year', title: 'Year' }
                ],
                pageLength: 25,
                responsive: true,
                language: {
                    emptyTable: "No hay datos disponibles",
                    search: "Buscar:",
                    lengthMenu: "Mostrar _MENU_ registros por página",
                    info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
                    paginate: {
                        first: "Primero",
                        last: "Último", 
                        next: "Siguiente",
                        previous: "Anterior"
                    }
                },
                drawCallback: function(settings) {
                    // DataTable dibujada
                }
            });
            
            showMessage(`DataTable creada: ${formattedData.length} registros`, 'success');
            
        } catch (error) {
            // Fallback a tabla simple
            showDataInSimpleTable(formattedData);
        }
    }
    
    /**
     * Fallback function to show data in simple HTML table - COMPLETELY RECONSTRUCTED
     */
    function showDataInSimpleTable(data) {
        
        try {
            // Verificar elemento tabla
            const tableElement = document.getElementById('discards-table');
            if (!tableElement) {
                showMessage('Error crítico: Tabla no encontrada', 'error');
                return;
            }
            
            // Verificar tbody existe
            let tbody = tableElement.querySelector('tbody');
            if (!tbody) {
                tbody = document.createElement('tbody');
                tableElement.appendChild(tbody);
            }
            
            // Limpiar contenido actual del tbody
            tbody.innerHTML = '';
            
            // Generar filas de datos
            data.forEach(function(row, index) {
                const tr = document.createElement('tr');
                
                // Aplicar clase alternada para filas
                if (index % 2 === 1) {
                    tr.classList.add('alternate');
                }
                
                // Array de valores en el orden correcto según el HTML
                const cellValues = [
                    `<span class="status-pending" title="Pendiente de descarte">${row.status}</span>`, // Estado
                    row.crop,           // Crop
                    row.owner,          // Owner  
                    row.submission_id,  // Submission ID
                    row.field,          // Field
                    row.extno,          // EXTNO
                    row.range_val,      // Range
                    row.row_val,        // Row
                    row.barcd,          // BARCD
                    row.plot_id,        // Plot ID
                    row.subplot_id,     // Subplot ID
                    row.matid,          // MATID
                    row.abbrc,          // ABBRC
                    row.sd_instruction, // SD Instruction
                    row.vform_record_type, // Record Type
                    row.vdata_site,     // Site
                    row.vdata_year      // Year
                ];
                
                // Crear celdas
                cellValues.forEach(function(value, cellIndex) {
                    const td = document.createElement('td');
                    
                    // Aplicar clase text-center a la primera columna (Estado)
                    if (cellIndex === 0) {
                        td.classList.add('text-center');
                    }
                    
                    td.innerHTML = value || '';
                    tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
            });
            
            // Asegurar que la tabla tenga las clases correctas
            if (!tableElement.classList.contains('wp-list-table')) {
                tableElement.classList.add('wp-list-table', 'widefat', 'fixed', 'striped');
            }
            
            showMessage(`Datos mostrados en tabla: ${data.length} registros`, 'success');
            
        } catch (error) {
            // Último recurso: mostrar datos en formato texto
            showMessage('Error crítico: No se pudieron mostrar los datos', 'error');
        }
    }
    
    /**
     * Show/hide loading indicator
     */
    function showCSVLoadingIndicator(show) {
        if (show) {
            if ($('#csv-loading').length === 0) {
                $('#discards-table').before('<div id="csv-loading" class="csv-loading"><p>🔄 Cargando datos...</p></div>');
            }
            $('#csv-loading').show();
        } else {
            $('#csv-loading').hide();
        }
    }
    
    /**
     * Show message to user
     */
    function showMessage(message, type) {
        if ($('#csv-message').length === 0) {
            $('#discards-table').before('<div id="csv-message" class="notice"></div>');
        }
        
        const $message = $('#csv-message');
        $message.removeClass('notice-success notice-error notice-warning');
        
        if (type === 'success') {
            $message.addClass('notice-success');
        } else if (type === 'error') {
            $message.addClass('notice-error');
        } else {
            $message.addClass('notice-warning');
        }
        
        $message.html('<p>' + message + '</p>').show();
        
        setTimeout(function() {
            $message.fadeOut();
        }, 5000);
    }
    
    /**
     * Initialize CSV handler when DOM is ready
     */
    function initializeCsvHandler() {
        
        // DON'T initialize DataTable here - let it be created when data arrives
        
        // Monitor field dropdown changes
        $(document).on('change', '#fields', function() {

            const selectedField = $(this).val();
            
            if (selectedField && selectedField !== '') {
                
                checkIfFieldSelected();
            } else {
                // Clear and destroy table if no field selected
                
                if ($.fn.DataTable.isDataTable('#discards-table')) {

                    $('#discards-table').DataTable().destroy();

                    window.discardsTable = null;
                }
                
                // Show empty table message in the HTML table body
                $('#discards-table tbody').html('<tr><td colspan="17" class="text-center" style="padding: 40px;">Seleccione un campo para cargar los datos</td></tr>');
            }
        });
        
    }
    
    // Initialize when document is ready
    initializeCsvHandler();
    
    // Export functions to global scope for external access
    window.csvHandler = {
        processCsvData: processCsvData,
        updateTableWithCsvData: updateTableWithCsvData,
        checkIfFieldSelected: checkIfFieldSelected,
        showCSVLoadingIndicator: showCSVLoadingIndicator,
        showMessage: showMessage,
        showDataInSimpleTable: showDataInSimpleTable,
        processRetrievedData: processRetrievedData,
        getCsvData: function() { return csvData; },
        getDataTable: function() { return window.discardsTable; }
    };
    
    /**
     * Process retrieved data - COMPREHENSIVE DATA PROCESSING
     */
    function processRetrievedData(response) {
        
        try {
            // Verificar respuesta inicial
            if (!response) {
                showMessage('Error: No se recibieron datos del servidor', 'error');
                return;
            }
            
            // Handle different response formats
            let csvContent = null;
            
            // Caso 1: response.csv_content exists (formato JSON)
            if (response.csv_content) {
                csvContent = response.csv_content;
            }
            // Caso 2: response is the data directly
            else if (Array.isArray(response)) {
                csvContent = response;
            }
            // Caso 3: response.data exists
            else if (response.data) {
                csvContent = response.data;
            }
            else {
                showMessage('Error: Formato de datos no reconocido', 'error');
                return;
            }
            
            // Verificar que csvContent no esté vacío
            if (!csvContent) {
                showMessage('Error: No hay datos para procesar', 'error');
                return;
            }
            
            // Procesar según el tipo de csvContent
            let finalData = null;
            
            if (typeof csvContent === 'string') {
                try {
                    // Intentar parsear como JSON
                    finalData = JSON.parse(csvContent);

                } catch (parseError) {
                    showMessage('Error: Formato CSV string no soportado', 'error');
                    
                    return;
                }
            } else if (Array.isArray(csvContent)) {
                finalData = csvContent;
            } else if (typeof csvContent === 'object') {
                
                // Buscar propiedad que contenga array de datos
                const possibleDataKeys = ['data', 'rows', 'records', 'items', 'results'];
                let found = false;
                
                for (const key of possibleDataKeys) {
                    if (csvContent[key] && Array.isArray(csvContent[key])) {
                        finalData = csvContent[key];
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    finalData = [csvContent];
                }
            } else {
                showMessage('Error: Tipo de datos no soportado', 'error');
                return;
            }
            
            // Verificar datos finales
            if (!finalData || !Array.isArray(finalData)) {
                showMessage('Error: Los datos no tienen el formato correcto', 'error');
                return;
            }
            
            if (finalData.length === 0) {
                showMessage('No hay datos disponibles para mostrar', 'notice');
                return;
            }
            
            // Pasar los datos directamente como array, no como objeto con csv_content
            processCsvData(finalData);
            
        } catch (error) {
            showMessage('Error crítico procesando datos: ' + error.message, 'error');
        }
    }
    
    // Make key functions available globally
    window.showCSVLoadingIndicator = showCSVLoadingIndicator;

    window.showMessage = showMessage;
    
});
