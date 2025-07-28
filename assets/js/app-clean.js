/**
 * Orion Discard Plugin - Material Discard System
 * Enhanced cascading dropdown with proper default selection behavior
 */
jQuery(document).ready(function ($) {

  // Global variables
  let fieldsData = [];
  let dataTable = null;

  // Initialize the form
  initializeForm();

  function initializeForm() {
    
    // Bind event handlers first
    bindEventHandlers();
    
    // Load data and initialize components
    loadFieldsData();
    initializeDataTable();
    
    // Check CSV handler availability after a delay
    setTimeout(checkCsvHandlerAvailability, 1000);
  }

  function loadFieldsData() {

    const site = orionDiscard.site || "PRSA";

    // Usar la función de ajax.js con callbacks
    if (typeof window.loadOrionFieldsData === 'function') {

        window.loadOrionFieldsData(
            site,
            // Callback de éxito
            function(data) {
                fieldsData = data;
                debugFieldsData();
                populateFarmDropdown();
            },
            // Callback de error
            function(errorMessage) {
                showMessage(errorMessage, "error");
            }
        );

    } else {
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

    const $farmSelect = $("#farms");
    
    if ($farmSelect.length === 0) {
      return;
    }
    
    const farms = fieldsData.filter((item) => item.field_type === "farm");
    
    // Clear existing options (except the first placeholder)
    $farmSelect.find("option:not(:first)").remove();

    // Add farm options
    farms.forEach(function (farm) {
      $farmSelect.append(
        $("<option></option>").attr("value", farm.id).text(farm.title)
      );
    });
    
    // ENHANCEMENT: Auto-select if only one farm available
    if (farms.length === 1) {
      
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
        proceedWithSubmission();
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

  function proceedWithSubmission() {
    
    const formData = {
      action: "submit_discard",
      nonce: orionDiscard.nonce,
      farm_id: $("#farms").val(),
      farm_name: $("#farms option:selected").text(),
      section_id: $("#sections").val(),
      section_name: $("#sections option:selected").text(),
      field_id: $("#fields").val(),
      field_name: $("#fields option:selected").text(),
      scanned_code: $("#scanner-input").val(),
    };

    // Disable submit button
    $("#btn-submit").prop("disabled", true).text("Procesando...");

    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: "POST",
      data: formData,
      success: function (response) {
        
        if (response.success) {
          showMessage("Descarte registrado exitosamente", "success");
          resetForm();
          refreshDataTable();
        } else {
          showMessage("Error al registrar el descarte: " + (response.data || "Error desconocido"), "error");
        }
      },
      error: function (xhr, status, error) {
        showMessage("Error de conexión al enviar el formulario", "error");
      },
      complete: function () {
        $("#btn-submit").prop("disabled", false).text("Submit");
      },
    });
  }

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

    const barCodeValue = $("#scanner-input").val();
    
    // Trigger CSV download if barcode is valid and function available
    if (barCodeValue && typeof window.downloadAndProcessCSV === 'function') {
      window.downloadAndProcessCSV(barCodeValue);
    }
  }

  // Check CSV handler availability after initialization
  function checkCsvHandlerAvailability() {
    
    if (!window.csvHandler && !window.checkIfFieldSelected) {
      showMessage("Funcionalidad CSV no disponible", "warning");
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
          { data: "status", title: "Estado", className: "text-center", defaultContent: "" },
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
          loadTableData();
        },
      });
    } catch (e) {
      showMessage("Error al inicializar la tabla: " + e.message, "error");
    }
  }

  function loadTableData() {
    
    $.ajax({
      url: orionDiscard.ajaxUrl,
      type: "POST",
      data: {
        action: "get_discards",
        nonce: orionDiscard.nonce,
      },
      success: function (response) {
        
        if (response.success && dataTable) {
          dataTable.clear().rows.add(response.data || []).draw();
        } else {
          showMessage("Error al cargar datos: " + (response.data || "Error desconocido"), "error");
        }
      },
      error: function (xhr, status, error) {
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

  // Expose debug function for testing
  window.debugOrionDiscard = function() {
    // Debug function available for testing
  };
});
