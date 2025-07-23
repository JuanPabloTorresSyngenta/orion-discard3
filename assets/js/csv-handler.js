/**
 * CSV Handler for Orion Discard Plugin
 * Manages CSV download and processing when all selections are complete
 */

jQuery(document).ready(function($) {
    
    // Variables globales
    let csvData = [];
    let isDownloadingCSV = false;
    
    /**
     * Initialize CSV handler when all dropdowns are populated
     */
    function initializeCsvHandler() {
        // Monitor when all three dropdowns have selections
        $('#farm-select, #section-select, #field-select').on('change', function() {
            checkIfAllSelectionsComplete();
        });
    }
    
    /**
     * Check if all three dropdowns have valid selections
     */
    function checkIfAllSelectionsComplete() {
        const farmSelected = $('#farm-select').val();

        const sectionSelected = $('#section-select').val();

        const fieldSelected = $('#field-select').val();
        
        console.log('Checking selections:', {
            farm: farmSelected,
            section: sectionSelected,
            field: fieldSelected
        });
        
        // If all three have selections, trigger CSV download
        if (farmSelected && sectionSelected && fieldSelected) {
            console.log('All selections complete, downloading CSV...');
            downloadAndProcessCSV(farmSelected, sectionSelected, fieldSelected);
        }
    }
    
    /**
     * Download CSV file via AJAX and process it
     */
    function downloadAndProcessCSV(farmId, sectionId, fieldId) {
        // Prevent multiple simultaneous downloads
        if (isDownloadingCSV) {
            console.log('CSV download already in progress...');
            return;
        }
        
        isDownloadingCSV = true;

      
        
        // Show loading indicator
        showCSVLoadingIndicator(true);
        
        // AJAX request to get CSV data
        $.ajax({
            url: orionDiscard.ajaxUrl,
            type: 'POST',
            data: {
                action: 'get_csv_data',
                nonce: orionDiscard.nonce,
                farm_id: farmId,
                section_id: sectionId,
                field_id: fieldId,
                site: orionDiscard.site
            },
            success: function(response) {
                console.log('CSV AJAX Response:', response);
                
                if (response.success && response.data) {
                    // Process the CSV data
                    processCsvData(response.data.csv_content);

                $("#discards-table").DataTable().ajax.reload();

                    // Update the table with processed data
                    updateTableWithCsvData();
                    
                    console.log('CSV processed successfully, rows:', csvData.length);
                } else {
                    console.error('Error in CSV response:', response.message || 'Unknown error');
                    showMessage('Error al descargar datos CSV: ' + (response.message || 'Error desconocido'), 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('CSV AJAX Error:', {
                    status: status,
                    error: error,
                    response: xhr.responseText
                });
                showMessage('Error de conexión al descargar CSV', 'error');
            },
            complete: function() {
                isDownloadingCSV = false;
                showCSVLoadingIndicator(false);
            }
        });
    }
    
    /**
     * Process CSV content and convert to JavaScript array
     */
    function processCsvData(csvContent) {
        console.log('Processing CSV content...');
        
        // Clear previous data
        csvData = [];
        
        // Split CSV into lines
        const lines = csvContent.split('\n');
        
        if (lines.length < 2) {
            console.log('CSV has insufficient data');
            return;
        }
        
        // Get headers from first line
        const headers = parseCSVLine(lines[0]);

        console.log('CSV Headers:', headers);
        
        // Process data lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === '') continue; // Skip empty lines
            
            const values = parseCSVLine(line);
            
            if (values.length === headers.length) {
                const rowObject = {};
                
                // Map values to headers
                headers.forEach((header, index) => {
                    rowObject[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
                });
                
                csvData.push(rowObject);
            }
        }
        
        console.log('Processed CSV data:', csvData.length + ' rows');
    }
    
    /**
     * Parse a single CSV line handling quoted values
     */
    function parseCSVLine(line) {
        const result = [];

        let current = '';

        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {

                inQuotes = !inQuotes;

            } else if (char === ',' && !inQuotes) {

                result.push(current.trim());

                current = '';

            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        return result;
    }
    
    /**
     * Update DataTable with CSV data
     */
    function updateTableWithCsvData() {
        if (!window.discardsTable) {
            console.log('DataTable not initialized yet, initializing...');
            initializeDataTable();
            return;
        }
        
        // Clear existing data
        window.discardsTable.clear();
        
        // Format data for DataTable
        const formattedData = csvData.map(function(row) {
            return {
                status: '✗', // New data, not discarded yet
                crop: row.crop || '',
                owner: row.owner || '',
                submission_id: row.submission_id || '',
                field: row.field || '',
                extno: row.extno || '',
                range_val: row.range || '',
                row_val: row.row || '',
                barcd: row.barcd || row['*barcd'] || '', // Handle both formats
                plot_id: row.plot_id || '',
                subplot_id: row.subplot_id || '',
                matid: row.matid || '',
                abbrc: row.abbrc || '',
                sd_instruction: row.sd_instruction || '',
                vform_record_type: row['vform-record-type'] || '',
                vdata_site: row['vdata-site'] || '',
                vdata_year: row['vdata-year'] || ''
            };
        });
        
        // Add data to table
        window.discardsTable.rows.add(formattedData);

        window.discardsTable.draw();
        
        console.log('DataTable updated with CSV data:', formattedData.length + ' rows');
        
        // Show success message
        showMessage('Datos CSV cargados: ' + formattedData.length + ' registros', 'success');
    }
    
    /**
     * Show/hide CSV loading indicator
     */
    function showCSVLoadingIndicator(show) {
        if (show) {
            // Add loading indicator to the table area
            if ($('#csv-loading').length === 0) {

                $('#discards-table').before('<div id="csv-loading" class="csv-loading"><p>🔄 Descargando datos CSV...</p></div>');
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
        // Create message element if it doesn't exist
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
        
        // Auto-hide after 5 seconds
        setTimeout(function() {
            $message.fadeOut();
        }, 5000);
    }
    
    // Initialize when document is ready
    initializeCsvHandler();
    
    // Export functions to global scope for access from other scripts
    window.csvHandler = {
        downloadAndProcessCSV: downloadAndProcessCSV,
        processCsvData: processCsvData,
        updateTableWithCsvData: updateTableWithCsvData,
        getCsvData: function() { return csvData; }
    };
});