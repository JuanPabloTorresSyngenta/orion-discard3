/**
 * Orion Discard Plugin - Material Discard System
 * Enhanced cascading dropdown with proper default selection behavior
 */
jQuery(document).ready(function ($) {

  // Global variables
  let fieldsData = [];

  let dataTable = null;
  
  let barcodeValidationTimeout = null;

  // Initialize the form with DOM ready check
  initializeForm();

  function initializeForm() {
    console.log('Initializing form...');
    
    // Check if the vform elements exist
    if ($('#vform-form').length === 0 || $('#farms').length === 0) {
      console.log('Form elements not found, retrying in 500ms...');
      setTimeout(initializeForm, 500);
      return;
    }
    
    console.log('Form elements found, proceeding with initialization');
    
    // Bind event handlers first
    bindEventHandlers();
    
    // Load data and initialize components
    loadFieldsData();
    initializeDataTable();
    
    // Check CSV handler availability after a delay
    setTimeout(checkCsvHandlerAvailability, 1000);
  }

  function loadFieldsData() {
    console.log('Loading fields data...');

    const site = orionDiscard.site || "PRSA";
    console.log('Site:', site);

    // Usar la función de ajax.js con callbacks
    if (typeof window.loadOrionFieldsData === 'function') {
      console.log('loadOrionFieldsData function found, calling...');

        window.loadOrionFieldsData(
            site,
            // Callback de éxito
            function(data) {
                console.log('Data loaded successfully:', data);
                fieldsData = data;
                debugFieldsData();
                populateFarmDropdown();
            },
            // Callback de error
            function(errorMessage) {
                console.error('Error loading fields data:', errorMessage);
                showMessage(errorMessage, "error");
            }
        );

    } else {
        console.error('loadOrionFieldsData function not found!');
        showMessage("Error: Funciones AJAX no cargadas", "error");
    }
  }

  function debugFieldsData() {
    
    const farms = fieldsData.filter((item) => item.field_type === "farm");
    const sections = fieldsData.filter((item) => item.field_type === "sections");
    const fields = fieldsData.filter((item) => item.field_type === "fields");
    
    // Farm-Section relationship analysis
    farms.forEach(farm => {
      const relatedSections = sections.filter(section => 
        String(section.farm_name) === String(farm.id)
      );
    });

    // Section-Field relationship analysis
    sections.forEach(section => {
      const relatedFields = fields.filter(field => 
        String(field.farm_name) === String(section.farm_name) && 
        String(field.section_name) === String(section.id)
      );
    });
  }

  function populateFarmDropdown() {
    console.log('Populating farm dropdown...');

    const $farmSelect = $("#farms");
    console.log('Farm select element found:', $farmSelect.length > 0);
    
    if ($farmSelect.length === 0) {
      console.error('Farm select element not found!');
      return;
    }
    
    const farms = fieldsData.filter((item) => item.field_type === "farm");
    console.log('Farms found:', farms.length, farms);
    
    // Clear existing options (except the first placeholder)
    $farmSelect.find("option:not(:first)").remove();

    // Add farm options
    farms.forEach(function (farm) {
      console.log('Adding farm option:', farm.id, farm.title);
      $farmSelect.append(
        $("<option></option>").attr("value", farm.id).text(farm.title)
      );
    });
    
    console.log('Farm dropdown populated with', farms.length, 'options');
    
    // ENHANCEMENT: Auto-select if only one farm available
    if (farms.length === 1) {
      console.log('Auto-selecting single farm:', farms[0].title);
      
      $farmSelect.val(farms[0].id);

      // Manually trigger change to populate sections
      $farmSelect.trigger('change');
    }
  }

  function populateSectionDropdown(farmId) {
    
    const $sectionSelect = $("#sections");
    
    if ($sectionSelect.length === 0) {
      return;
    }

    if (!fieldsData || fieldsData.length === 0) {
      showMessage("Datos no cargados. Intente recargar la página.", "error");
      return;
    }

    // Filter sections for the selected farm
    let sections = fieldsData.filter((item) => {
      const isSection = item.field_type === "sections";
      if (!isSection) return false;
      
      const farmMatches = String(item.farm_name) === String(farmId);
      
      return farmMatches;
    });

    // FIXED: Clear ALL options and rebuild from scratch
    $sectionSelect.empty();
    
    // ENHANCED: Add default option with proper selection    
    $sectionSelect.append(
      $("<option></option>").attr("value", "").text("Seleccione una sección...")
    );

    // Add section options
    sections.forEach(function (section) {
      $sectionSelect.append(
        $("<option></option>").attr("value", section.id).text(section.title)
      );
    });

    // Auto-select first section if available
    if (sections.length > 0) {
      $sectionSelect.val(sections[0].id);
      
      // Trigger change event to populate fields
      setTimeout(() => {
        $sectionSelect.trigger('change');
      }, 100);
    }

    // Enable the section dropdown
    $sectionSelect.prop("disabled", false);
    
    // ENHANCED: Auto-select logic with better UX - solo si hay UNA sección
    if (sections.length === 1) {
      
      // CRITICAL: Set value and trigger change, but keep default option available
      $sectionSelect.val(sections[0].id);
      
      setTimeout(() => {
        
        // Only trigger if the value is still selected (user didn't change it)
        if ($sectionSelect.val() === sections[0].id) {
          $sectionSelect.trigger('change');
        }
      }, 100); // Reduced timeout for better responsiveness

    } else {
      // Multiple sections available - keep default selected for user choice
      $sectionSelect.val(""); // Ensure default option remains selected
    }
  }

  function populateFieldDropdown(farmId, sectionId) {
    
    const $fieldSelect = $("#fields");

    if ($fieldSelect.length === 0) {
      return;
    }

    // Filter fields for the selected farm and section
    const fields = fieldsData.filter((item) => {
      const isField = item.field_type === "fields";
      if (!isField) return false;
      
      const farmMatches = String(item.farm_name) === String(farmId);
      const sectionMatches = String(item.section_name) === String(sectionId);
      const matches = farmMatches && sectionMatches;
      
      return matches;
    });

    // FIXED: Clear ALL options and rebuild from scratch
    $fieldSelect.empty();
    
    // ENHANCED: Add default option with proper selection
    $fieldSelect.append(
      $('<option value="" selected>Select a field...</option>')
    );

    if (fields.length === 0) {
      $fieldSelect.prop("disabled", true);
      showMessage("Esta sección no tiene campos disponibles", "warning");
      return;
    }

    // Add field options
    fields.forEach(function (field) {
      $fieldSelect.append(
        $("<option></option>").attr("value", field.title).text(field.title)
      );
    });

    // Enable the field dropdown
    $fieldSelect.prop("disabled", false);
    
    // ENHANCED: Auto-select logic for fields - solo si hay UN campo
    if (fields.length === 1) {
      
      $fieldSelect.val(fields[0].id);
      
      setTimeout(() => {
        
        // Only trigger if the value is still selected
        if ($fieldSelect.val() === fields[0].id) {
          $fieldSelect.trigger('change');
        }
      }, 100);
    } else {
      // Multiple fields available - keep default selected for user choice
      $fieldSelect.val(""); // Ensure default option remains selected
    }
  }

  function resetSectionDropdown() {

    const $sectionSelect = $("#sections");
    
    // ENHANCED: Complete reset with proper default option
    $sectionSelect.empty().prop("disabled", true);
    
    // Add the default option back as selected
    $sectionSelect.append(
      $('<option value="" selected>Select a section...</option>')
    );
  }

  function resetFieldDropdown() {

    const $fieldSelect = $("#fields");
    
    // ENHANCED: Complete reset with proper default option
    $fieldSelect.empty().prop("disabled", true);
    
    // Add the default option back as selected
    $fieldSelect.append(
      $('<option value="" selected>Select a field...</option>')
    );
  }

  // ENHANCED: Event handlers with improved default option handling
  function bindEventHandlers() {
    
    // Farm selection handler with enhanced UX
    $(document).off('change.orion-farms').on('change.orion-farms', '#farms', function () {

      const farmId = $(this).val();
      const farmName = $(this).find('option:selected').text();
      
      // Reset dependent dropdowns with proper defaults
      resetSectionDropdown();
      resetFieldDropdown();
      
      // Clear any existing messages
      $(".orion-message").remove();

      // Populate sections if farm selected (not default option)
      if (farmId && farmId !== "") {
        populateSectionDropdown(farmId);
      }
    });

    // Section selection handler with enhanced validation
    $(document).off('change.orion-sections').on('change.orion-sections', '#sections', function () {

      const sectionId = $(this).val();
      const sectionName = $(this).find('option:selected').text();
      const farmId = $("#farms").val();
      
      // Reset field dropdown
      resetFieldDropdown();
      
      // Clear any existing messages
      $(".orion-message").remove();

      // Only populate fields if both farm and section are properly selected (not default options)
      if (sectionId && sectionId !== "" && farmId && farmId !== "") {
        populateFieldDropdown(farmId, sectionId);
      }
    });

    // Field selection handler with CSV integration
    $(document).off('change.orion-fields').on('change.orion-fields', '#fields', function () {

      const fieldId = $(this).val();
      const fieldName = $(this).find('option:selected').text();
      
      // Clear any existing messages
      $(".orion-message").remove();
      
      // Only trigger CSV download for valid field selection (not default option)
      if (fieldId && fieldId !== "") {

        // FIXED: Correct function check - use csvHandler.checkIfFieldSelected
        if (window.csvHandler && typeof window.csvHandler.checkIfFieldSelected === 'function') {
          window.csvHandler.checkIfFieldSelected();
        } else {
          
          // Try fallback to direct function if available
          if (typeof window.checkIfFieldSelected === 'function') {
            window.checkIfFieldSelected();
          }
        }

      }
    });

    // Form submission handler
    $(document).off('submit.orion-form').on('submit.orion-form', '#vform-form', function (e) {
      e.preventDefault();
      submitDiscardForm();
    });

    // Scanner input handlers
    $(document).off('focus.orion-scanner').on('focus.orion-scanner', '#scanner-input', function () {
      $(this).select();
    });

    $(document).off('input.orion-scanner change.orion-scanner').on('input.orion-scanner change.orion-scanner', '#scanner-input', function () {
      barCodeInputChange();
    });
    
  }

  // ENHANCED: Form validation with proper default option checking
  function submitDiscardForm() {
    
    const farmId = $("#farms").val();

    const sectionId = $("#sections").val();

    const fieldId = $("#fields").val();

    const scannedCode = $("#scanner-input").val();

    // ENHANCED: Validate all required fields (excluding default options)
    const validationErrors = [];
    
    if (!farmId || farmId === "") {
      validationErrors.push("Debe seleccionar una finca");
    }
    
    if (!sectionId || sectionId === "") {
      validationErrors.push("Debe seleccionar una sección");
    }
    
    if (!fieldId || fieldId === "") {
      validationErrors.push("Debe seleccionar un campo");
    }
    
    if (!scannedCode || scannedCode.trim() === "") {
      validationErrors.push("Debe escanear un código");
    }

    if (validationErrors.length > 0) {
      showMessage("Por favor complete todos los campos: " + validationErrors.join(", "), "error");
      return;
    }

    // Check for duplicate barcode
    window.checkDuplicateBarcode(scannedCode, function (isDuplicate) {
      if (isDuplicate) {
        showDuplicateModal(scannedCode);
      } else {
        window.proceedWithSubmission();
      }
    });
  }

  function showDuplicateModal(barcode) {
    $("#duplicate-code-display").text(barcode);
    $("#duplicate-barcode-modal").show();
  }

  // Modal close handlers
  $(document).on("click", "#modal-close-btn, .orion-modal-close", function () {
    $("#duplicate-barcode-modal").hide();
  });

 

  function resetForm() {
    
    // Reset form fields
    $("#vform-form")[0].reset();
    
    // Reset dropdowns with proper defaults
    resetSectionDropdown();

    resetFieldDropdown();
    
    // ENHANCED: Ensure farm dropdown shows default option
    const $farmSelect = $("#farms");

    if ($farmSelect.length > 0) {

      $farmSelect.val(""); // Reset to default option

    }
    
    // Clear messages
    $(".orion-message").remove();
    
    // Focus on scanner input
    setTimeout(() => {
      $("#scanner-input").focus();
    }, 100);
  }

  function barCodeInputChange() {

    const barCodeValue = $("#scanner-input").val().trim();
    
    // Clear any existing validation timeout
    if (barcodeValidationTimeout) {
      clearTimeout(barcodeValidationTimeout);
    }
    
    // If barcode is empty, don't proceed
    if (!barCodeValue) {
      return;
    }
    
    // Add a small delay to avoid excessive API calls while typing
    barcodeValidationTimeout = setTimeout(() => {
      console.log('Checking barcode:', barCodeValue);
      
      // Check if barcode exists in the current DataTable and update its status
      checkBarcodeInTable(barCodeValue);
      
      // Trigger CSV download if barcode is valid and function available
      if (barCodeValue && typeof window.downloadAndProcessCSV === 'function') {
        // Note: CSV functionality can be triggered here if needed
      }
    }, 300); // 300ms delay
  }

  // Check CSV handler availability after initialization
  function checkCsvHandlerAvailability() {
    
    if (!window.csvHandler && !window.checkIfFieldSelected) {
      showMessage("Funcionalidad CSV no disponible", "warning");
    }
  }

  /**
   * Check if barcode exists in the current DataTable and update its status
   * @param {string} barcode - The barcode to search for
   */
  function checkBarcodeInTable(barcode) {
    
    console.log('=== BARCODE VALIDATION START ===');
    console.log('🔍 Checking barcode:', barcode);
    
    if (!dataTable) {
      console.warn('❌ DataTable not initialized');
      return false;
    }

    if (!barcode || barcode.trim() === '') {
      console.log('⚠️  Empty barcode');
      return false;
    }

    // Get all data from the table with additional debugging
    const tableData = dataTable.data().toArray();
    const visibleRows = dataTable.rows().count();
    const totalRows = dataTable.data().length;
    
    console.log('📊 DataTable status:');
    console.log('  - Table data length:', tableData.length);
    console.log('  - Visible rows count:', visibleRows);
    console.log('  - Total rows:', totalRows);
    console.log('  - DataTable initialized:', dataTable.settings().length > 0);
    
    // Check if table is showing data but DataTable thinks it's empty
    const $tableBody = $('#discards-table tbody tr');
    const visibleTableRows = $tableBody.length;
    console.log('  - DOM visible rows:', visibleTableRows);
    
    if (visibleTableRows > 0 && tableData.length === 0) {
      console.warn('⚠️  MISMATCH: DOM shows', visibleTableRows, 'rows but DataTable has 0 data');
      console.warn('⚠️  This suggests the data is in the DOM but not in DataTable data structure');
      
      // Try to extract data directly from DOM as fallback
      return checkBarcodeInDOM(barcode);
    }
    
    if (!tableData || tableData.length === 0) {
      console.log('❌ No data in DataTable - table might still be loading');
      
      // Try to reload data
      console.log('🔄 Attempting to reload table data...');
      loadTableData();
      
      return false;
    }
    
    // Log all barcodes in table for debugging
    const allBarcodes = tableData.map(row => row.barcd).filter(Boolean);
    console.log('📋 All barcodes in table:', allBarcodes);
    
    // Normalize search barcode
    const searchBarcode = String(barcode).trim().toLowerCase();
    console.log('🔍 Normalized search barcode:', searchBarcode);
    
    // Find the row index that matches the barcode
    let matchingRowIndex = -1;
    let matchingRowData = null;
    
    tableData.forEach((row, index) => {
      if (row.barcd) {
        const tableBarcode = String(row.barcd).trim().toLowerCase();
        if (tableBarcode === searchBarcode) {
          matchingRowIndex = index;
          matchingRowData = row;
        }
      }
    });

    console.log('🎯 Matching row index:', matchingRowIndex);
    console.log('📝 Matching row data:', matchingRowData);

    // Update the status column for the matching row
    if (matchingRowIndex >= 0 && matchingRowData) {
      
      // Update the status field in the row data (change from X to checkmark)
      matchingRowData.status = '✅'; // Green checkmark
      
      // Update the row in the DataTable
      dataTable.row(matchingRowIndex).data(matchingRowData).draw(false);
      
      console.log('✅ Barcode found and row status updated:', barcode);
      
      // Optional: Highlight the row temporarily
      highlightTableRow(matchingRowIndex);
      
      console.log('=== BARCODE VALIDATION END ===');
      return true;
    } else {
      console.log('❌ Barcode not found in DataTable:', barcode);
      console.log('=== BARCODE VALIDATION END ===');
      return false;
    }
  }

  /**
   * Fallback function to check barcode directly in DOM when DataTable data is not synced
   * @param {string} barcode - The barcode to search for
   */
  function checkBarcodeInDOM(barcode) {
    console.log('🔍 DOM FALLBACK: Searching barcode in DOM elements');
    
    const searchBarcode = String(barcode).trim().toLowerCase();
    let found = false;
    
    // Search through all table rows in the DOM
    $('#discards-table tbody tr').each(function(index, row) {
      const $row = $(row);
      
      // Find the barcode column (assuming it's the 9th column based on your structure)
      const $barcodeCell = $row.find('td').eq(8); // 0-indexed, so 8 = 9th column (*BARCD)
      
      if ($barcodeCell.length > 0) {
        const cellBarcode = String($barcodeCell.text()).trim().toLowerCase();
        
        if (cellBarcode === searchBarcode) {
          console.log('✅ DOM FALLBACK: Found barcode in row', index);
          
          // Update the status column (first column, index 0)
          const $statusCell = $row.find('td').eq(0);
          $statusCell.html('✅');
          
          // Highlight the row
          $row.addClass('row-highlight');
          setTimeout(() => {
            $row.removeClass('row-highlight');
          }, 2000);
          
          found = true;
          return false; // Break the loop
        }
      }
    });
    
    if (found) {
      console.log('✅ DOM FALLBACK: Successfully updated barcode status');
    } else {
      console.log('❌ DOM FALLBACK: Barcode not found in DOM');
    }
    
    return found;
  }  /**
   * Highlight a table row temporarily
   * @param {number} rowIndex - The index of the row to highlight
   */
  function highlightTableRow(rowIndex) {
    if (!dataTable || rowIndex < 0) return;
    
    try {
      // Get the row element
      const $row = $(dataTable.row(rowIndex).node());
      
      if ($row.length > 0) {
        // Add highlight class
        $row.addClass('row-highlight');
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
          $row.removeClass('row-highlight');
        }, 2000);
      }
    } catch (error) {
      console.warn('Error highlighting row:', error);
    }
  }

  /**
   * Update the barcode validation icon
   * @param {string} type - 'check', 'x', or 'clear'
   */
  function updateBarcodeValidationIcon(type) {
    
    const $scannerInput = $("#scanner-input");

    let $iconContainer = $("#barcode-validation-icon");
    
    // Create icon container if it doesn't exist
    if ($iconContainer.length === 0) {
      // Look for the scanner input's parent container
      const $inputContainer = $scannerInput.closest('.form-group, .input-group, .field-container, div');
      
      if ($inputContainer.length > 0 && $inputContainer.hasClass('input-group')) {
        // If it's an input group, add to the end of the group
        $inputContainer.append('<span id="barcode-validation-icon" class="barcode-validation-icon"></span>');
      } else {
        // Fallback: add after the input directly
        $scannerInput.after('<span id="barcode-validation-icon" class="barcode-validation-icon"></span>');
      }
      
      $iconContainer = $("#barcode-validation-icon");
    }
    
    // Clear existing classes and content
    $iconContainer.removeClass('validation-check validation-x validation-clear validation-loading').empty();
    
    switch (type) {
      case 'check':
        $iconContainer.addClass('validation-check')
             .html('&#10004;') // ✓ checkmark
             .attr('title', 'Código encontrado en la tabla')
             .css({
               'color': '#28a745',
               'font-weight': 'bold',
               'font-size': '18px',
               'margin-left': '8px',
               'vertical-align': 'middle',
               'display': 'inline-block'
             });
        break;
        
      case 'x':
        $iconContainer.addClass('validation-x')
             .html('&#10006;') // ✗ X mark
             .attr('title', 'Código no encontrado en la tabla')
             .css({
               'color': '#dc3545',
               'font-weight': 'bold',
               'font-size': '18px',
               'margin-left': '8px',
               'vertical-align': 'middle',
               'display': 'inline-block'
             });
        break;
        
      case 'loading':
        $iconContainer.addClass('validation-loading')
             .html('&#8987;') // ⏻ loading/clock symbol
             .attr('title', 'Verificando código...')
             .css({
               'color': '#ffc107',
               'font-weight': 'bold',
               'font-size': '16px',
               'margin-left': '8px',
               'vertical-align': 'middle',
               'display': 'inline-block',
               'animation': 'spin 1s linear infinite'
             });
        break;
        
      case 'clear':
      default:
        $iconContainer.addClass('validation-clear')
             .html('')
             .removeAttr('title')
             .css({
               'display': 'none'
             });
        break;
    }
  }

  // DataTable initialization and management functions remain the same...
  function initializeDataTable() {
    
    if (!$.fn.DataTable) {
      showMessage("Error: DataTables no está cargado", "error");

      return;
    }

    if ($("#discards-table").length === 0) {

      showMessage("Error: Tabla no encontrada", "error");

      return;
    }

    try {
      dataTable = $("#discards-table").DataTable({
        data: [],
        columns: [
          { 
            data: "status", 
            title: "Estado", 
            className: "text-center", 
            defaultContent: "❌",
            render: function(data, type, row) {
              // If status is empty or undefined, show X by default
              if (!data || data === "") {
                return "❌"; // Default X icon
              }
              return data; // Return the actual status (could be ✅ after barcode scan)
            }
          },
          { data: "crop", title: "Crop", defaultContent: "" },
          { data: "owner", title: "Owner", defaultContent: "" },
          { data: "submission_id", title: "Submission ID", defaultContent: "" },
          { data: "field", title: "Field", defaultContent: "" },
          { data: "extno", title: "EXTNO", defaultContent: "" },
          { data: "range_val", title: "Range", defaultContent: "" },
          { data: "row_val", title: "Row", defaultContent: "" },
          { data: "barcd", title: "*BARCD", className: "font-weight-bold", defaultContent: "" },
          { data: "plot_id", title: "Plot ID", defaultContent: "" },
          { data: "subplot_id", title: "Subplot ID", defaultContent: "" },
          { data: "matid", title: "MATID", defaultContent: "" },
          { data: "abbrc", title: "ABBRC", defaultContent: "" },
          { data: "sd_instruction", title: "SD Instruction", defaultContent: "" },
          { data: "vform_record_type", title: "vform-record-type", defaultContent: "" },
          { data: "vdata_site", title: "vdata-site", defaultContent: "" },
          { data: "vdata_year", title: "vdata-year", defaultContent: "" },
        ],
        pageLength: 10,
        responsive: true,
        scrollX: true,
        language: {
          emptyTable: "No hay datos disponibles",
          info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
          infoEmpty: "Mostrando 0 a 0 de 0 entradas",
          infoFiltered: "(filtrado de _MAX_ entradas totales)",
          lengthMenu: "Mostrar _MENU_ entradas",
          loadingRecords: "Cargando...",
          processing: "Procesando...",
          search: "Buscar:",
          zeroRecords: "No se encontraron registros coincidentes",
          paginate: {
            first: "Primero",
            last: "Último",
            next: "Siguiente",
            previous: "Anterior",
          },
        },
        initComplete: function () {
          console.log('DataTable initialization complete');
          loadTableData();
        },
      });
    } catch (e) {
      showMessage("Error al inicializar la tabla: " + e.message, "error");
    }
  }

  function loadTableData() {
    
    console.log('🔄 Starting AJAX request to load table data...');
    
    $.ajax({
      url: orionDiscard.ajaxUrl,
      type: "POST",
      data: {
        action: "get_discards",
        nonce: orionDiscard.nonce,
      },
      success: function (response) {
        
        console.log('📡 AJAX Response received:', response);
        
        if (response.success && dataTable) {
          const data = response.data || [];
          console.log('✅ Loading table data:', data.length, 'records');
          console.log('📊 Raw data structure:', data);
          
          // Process data to ensure status field is set
          const processedData = data.map(row => {
            // Set default status to X if not present
            if (!row.status || row.status === "") {
              row.status = "❌"; // Default X icon
            }
            return row;
          });
          
          // Log sample data for debugging
          if (processedData.length > 0) {
            console.log('✅ Sample processed record:', processedData[0]);
            console.log('🏷️  Barcode field in sample:', processedData[0].barcd);
          } else {
            console.warn('⚠️  No data received from server');
          }
          
          // Clear and reload data
          console.log('🔄 Clearing DataTable and adding new data...');
          dataTable.clear().rows.add(processedData).draw();
          
          // Verify data was loaded
          const loadedCount = dataTable.data().length;
          console.log('✅ DataTable now contains:', loadedCount, 'rows');
          
          if (loadedCount !== processedData.length) {
            console.error('❌ Data count mismatch! Expected:', processedData.length, 'Got:', loadedCount);
          }
          
          // Re-check barcode validation after data is loaded
          setTimeout(() => {
            const currentBarcode = $("#scanner-input").val().trim();
            if (currentBarcode) {
              console.log('🔍 Re-checking barcode after data load:', currentBarcode);
              checkBarcodeInTable(currentBarcode);
            }
          }, 100);
          
        } else {
          console.error('❌ Failed to load table data:', response);
          
          if (!response.success) {
            console.error('❌ Server returned success=false:', response.data);
          }
          
          if (!dataTable) {
            console.error('❌ DataTable not initialized');
          }
          
          showMessage("Error al cargar datos: " + (response.data || "Error desconocido"), "error");
        }
      },
      error: function (xhr, status, error) {
        console.error('❌ AJAX error loading table data:');
        console.error('Status:', status);
        console.error('Error:', error);
        console.error('Response:', xhr.responseText);
        showMessage("Error de conexión al cargar datos", "error");
      },
    });
  }

  function refreshDataTable() {
    if (dataTable) {
      loadTableData();
    }
  }

  function showMessage(message, type) {
    
    const messageHtml = `<div class="orion-message ${type}">${message}</div>`;

    $(".orion-message").remove();
    
    $("#vform-form").before(messageHtml);
    
    setTimeout(function () {
      $(".orion-message").fadeOut(500, function () {
        $(this).remove();
      });
    }, 5000);
  }

  // Focus on scanner input when page loads
  setTimeout(function () {
    $("#scanner-input").focus();
  }, 500);

  // Expose functions globally for testing and external access
  window.orionDiscardValidation = {
    checkBarcodeInTable: checkBarcodeInTable,
    checkBarcodeInDOM: checkBarcodeInDOM,
    highlightTableRow: highlightTableRow,
    refreshDataTable: refreshDataTable,
    
    // Debug helpers
    getTableData: function() {
      return dataTable ? dataTable.data().toArray() : [];
    },
    getCurrentBarcode: function() {
      return $("#scanner-input").val().trim();
    },
    testValidation: function(testBarcode) {
      const barcode = testBarcode || $("#scanner-input").val().trim();
      console.log('🧪 Manual validation test for:', barcode);
      return checkBarcodeInTable(barcode);
    },
    testDOMValidation: function(testBarcode) {
      const barcode = testBarcode || $("#scanner-input").val().trim();
      console.log('🌐 Manual DOM validation test for:', barcode);
      return checkBarcodeInDOM(barcode);
    }
  };

  // Expose debug function for testing
  window.debugOrionDiscard = function() {
    const tableData = dataTable ? dataTable.data().toArray() : [];
    const currentBarcode = $("#scanner-input").val().trim();
    
    console.log('=== DEBUG ORION DISCARD ===');
    console.log('🔧 DataTable initialized:', !!dataTable);
    console.log('📊 Table data count:', tableData.length);
    console.log('🔍 Current barcode input:', currentBarcode);
    console.log('🌾 Fields data loaded:', fieldsData.length);
    
    // DOM debugging
    const $tableRows = $('#discards-table tbody tr');
    console.log('🌐 DOM visible rows:', $tableRows.length);
    
    if ($tableRows.length > 0) {
      console.log('📋 Sample DOM row data:');
      const $firstRow = $tableRows.first();
      const cells = [];
      $firstRow.find('td').each(function(i, cell) {
        cells.push($(cell).text().trim());
      });
      console.log('  Row cells:', cells);
    }
    
    if (tableData.length > 0) {
      console.log('📊 Sample DataTable record:', tableData[0]);
      console.log('🏷️  All barcodes in DataTable:', tableData.map(row => row.barcd).filter(Boolean));
    } else if ($tableRows.length > 0) {
      console.warn('⚠️  MISMATCH: DOM has rows but DataTable has no data!');
      
      // Extract barcodes from DOM
      const domBarcodes = [];
      $tableRows.each(function() {
        const barcode = $(this).find('td').eq(8).text().trim();
        if (barcode) domBarcodes.push(barcode);
      });
      console.log('🌐 Barcodes found in DOM:', domBarcodes);
    }
    
    // Test current barcode if exists
    if (currentBarcode) {
      console.log('🧪 Testing current barcode...');
      checkBarcodeInTable(currentBarcode);
    }
    
    return {
      fieldsData: fieldsData,
      dataTable: dataTable,
      tableData: tableData,
      currentBarcode: currentBarcode,
      domRowCount: $tableRows.length,
      validation: window.orionDiscardValidation
    };
  };
});
