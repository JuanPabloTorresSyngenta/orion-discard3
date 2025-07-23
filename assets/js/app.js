/**
 * Orion Discard Plugin - Material Discard System
 * Enhanced cascading dropdown with proper default selection behavior
 */
jQuery(document).ready(function ($) {
  console.log("Orion Discard Script Loading...");

  console.log("orionDiscard object:", orionDiscard);

  // Global variables
  let fieldsData = [];

  let dataTable = null;

  // Initialize the form
  initializeForm();

  function initializeForm() {
    console.log("=== INITIALIZING ORION DISCARD FORM ===");
    
    // Bind event handlers first
    bindEventHandlers();
    
    // Load data and initialize components
    loadFieldsData();

    initializeDataTable();
  }

  function loadFieldsData() {
    console.log("=== LOADING ORION API DATA ===");

    $("#farms").addClass("loading");

    const site = orionDiscard.site || "PRSA";

    $.ajax({
      url: "http://192.168.96.84:8080/orion/wp-json/orion-maps-fields/v1/fields",
      method: "GET",
      data: { site: site },
      success: function (response) {
        console.log("✅ Orion API Response:", response);
        
        if (response.success && response.data && response.data.fields) {
          fieldsData = response.data.fields;
          
          debugFieldsData();

          populateFarmDropdown();
          
          console.log("✅ Loaded fields data for site:", site, "Total items:", fieldsData.length);
        } else {
          console.error("❌ Invalid API response structure:", response);

          showMessage("Error al cargar los datos de las fincas", "error");
        }
      },
      error: function (xhr, status, error) {
        console.error("❌ Error loading Orion API data:", error);

        console.error("XHR details:", xhr);

        showMessage("Error de conexión al cargar los datos", "error");
      },
      complete: function () {
        $("#farms").removeClass("loading");
      },
    });
  }

  function debugFieldsData() {
    console.log("=== ORION DATA STRUCTURE ANALYSIS ===");

    console.log("Total items:", fieldsData.length);
    
    const farms = fieldsData.filter((item) => item.field_type === "farm");

    const sections = fieldsData.filter((item) => item.field_type === "sections");

    const fields = fieldsData.filter((item) => item.field_type === "fields");
    
    console.log("Farms:", farms.length, farms);

    console.log("Sections:", sections.length, sections);

    console.log("Fields:", fields.length, fields);

    // Farm-Section relationship analysis
    console.log("=== FARM-SECTION RELATIONSHIPS ===");

    farms.forEach(farm => {
      const relatedSections = sections.filter(section => 
        String(section.farm_name) === String(farm.id)
      );

      console.log(`Farm "${farm.title}" (ID: ${farm.id}) has ${relatedSections.length} sections:`, 
        relatedSections.map(s => s.title));
    });

    // Section-Field relationship analysis
    console.log("=== SECTION-FIELD RELATIONSHIPS ===");

    sections.forEach(section => {
      const relatedFields = fields.filter(field => 
        String(field.farm_name) === String(section.farm_name) && 
        String(field.section_name) === String(section.id)
      );

      console.log(`Section "${section.title}" (ID: ${section.id}) has ${relatedFields.length} fields:`, 
        relatedFields.map(f => f.title));
    });
  }

  function populateFarmDropdown() {
    console.log("=== POPULATING FARM DROPDOWN ===");

    const $farmSelect = $("#farms");
    
    if ($farmSelect.length === 0) {
      console.error("❌ Farm select element not found!");

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

    console.log("✅ Populated farms:", farms.length);
    
    // ENHANCEMENT: Auto-select if only one farm available
    if (farms.length === 1) {
      console.log("🎯 Auto-selecting single farm:", farms[0].title);

      $farmSelect.val(farms[0].id);

      // Manually trigger change to populate sections
      $farmSelect.trigger('change');
    }
  }

  function populateSectionDropdown(farmId) {
    console.log("=== POPULATING SECTION DROPDOWN ===");

    console.log("🔍 Farm ID:", farmId, "Type:", typeof farmId);
    
    const $sectionSelect = $("#sections");
    
    if ($sectionSelect.length === 0) {
      console.error("❌ Section select element not found!");

      return;
    }

    if (!fieldsData || fieldsData.length === 0) {
      console.error("❌ No Orion data available!");

      showMessage("Datos no cargados. Intente recargar la página.", "error");

      return;
    }

    // Filter sections for the selected farm
    let sections = fieldsData.filter((item) => {
      const isSection = item.field_type === "sections";

      if (!isSection) return false;
      
      const farmMatches = String(item.farm_name) === String(farmId);
      
      console.log("🔍 Checking section:", {
        id: item.id,
        title: item.title,
        farm_name: item.farm_name,
        farmId: farmId,
        matches: farmMatches
      });
      
      return farmMatches;
    });

    console.log("✅ Found sections for farm:", sections.length, sections);

    // // FIXED: Clear ALL options and rebuild from scratch
    // $sectionSelect.empty();
    
    // // ENHANCED: Add default option with proper selection
    // $sectionSelect.append(
    //   $('<option value="" selected>Select a section...</option>')
    // );
    
    if (sections.length === 0) {
      console.warn("⚠️ No sections found for farm ID:", farmId);

      $sectionSelect.prop("disabled", true);

      showMessage("Esta finca no tiene secciones disponibles", "warning");

      return;
    }

    // Add section options
    sections.forEach(function (section) {
      $sectionSelect.append(
        $("<option></option>").attr("value", section.id).text(section.title)
      );
    });

    // Enable the section dropdown
    $sectionSelect.prop("disabled", false);

    console.log("✅ Section dropdown enabled with", sections.length, "options");
    
    // ENHANCED: Auto-select logic with better UX - solo si hay UNA sección
    if (sections.length === 1) {
      console.log("🎯 Single section available - auto-selecting:", sections[0].title);
      
      // CRITICAL: Set value and trigger change, but keep default option available
      $sectionSelect.val(sections[0].id);
      
      setTimeout(() => {
        console.log("🚀 Triggering section change event for auto-selection");
        
        // Only trigger if the value is still selected (user didn't change it)
        if ($sectionSelect.val() === sections[0].id) {
          $sectionSelect.trigger('change');
        }
      }, 100); // Reduced timeout for better responsiveness
    } else {
      // Multiple sections available - keep default selected for user choice
      console.log("📋 Multiple sections available - user must choose");

      $sectionSelect.val(""); // Ensure default option remains selected
    }
  }

  function populateFieldDropdown(farmId, sectionId) {
    console.log("=== POPULATING FIELD DROPDOWN ===");

    console.log("🔍 Farm ID:", farmId, "Section ID:", sectionId);
    
    const $fieldSelect = $("#fields");

    if ($fieldSelect.length === 0) {
      console.error("❌ Field select element not found!");

      return;
    }

    // Filter fields for the selected farm and section
    const fields = fieldsData.filter((item) => {
      const isField = item.field_type === "fields";

      if (!isField) return false;
      
      const farmMatches = String(item.farm_name) === String(farmId);

      const sectionMatches = String(item.section_name) === String(sectionId);

      const matches = farmMatches && sectionMatches;
      
      console.log("🔍 Checking field:", {
        id: item.id,
        title: item.title,
        farm_name: item.farm_name,
        section_name: item.section_name,
        farmId: farmId,
        sectionId: sectionId,
        matches: matches
      });
      
      return matches;
    });

    console.log("✅ Found fields for section:", fields.length, fields);

    // FIXED: Clear ALL options and rebuild from scratch
    $fieldSelect.empty();
    
    // ENHANCED: Add default option with proper selection
    $fieldSelect.append(
      $('<option value="" selected>Select a field...</option>')
    );

    if (fields.length === 0) {
      console.warn("⚠️ No fields found for farm:", farmId, "section:", sectionId);

      $fieldSelect.prop("disabled", true);

      showMessage("Esta sección no tiene campos disponibles", "warning");

      return;
    }

    // Add field options
    fields.forEach(function (field) {
      $fieldSelect.append(
        $("<option></option>").attr("value", field.id).text(field.title)
      );
    });

    // Enable the field dropdown
    $fieldSelect.prop("disabled", false);

    console.log("✅ Field dropdown enabled with", fields.length, "options");
    
    // ENHANCED: Auto-select logic for fields - solo si hay UN campo
    if (fields.length === 1) {
      console.log("🎯 Single field available - auto-selecting:", fields[0].title);
      
      $fieldSelect.val(fields[0].id);
      
      setTimeout(() => {
        console.log("🚀 Triggering field change event for auto-selection");
        
        // Only trigger if the value is still selected
        if ($fieldSelect.val() === fields[0].id) {
          $fieldSelect.trigger('change');
        }
      }, 100);
    } else {
      // Multiple fields available - keep default selected for user choice
      console.log("📋 Multiple fields available - user must choose");

      $fieldSelect.val(""); // Ensure default option remains selected
    }
  }

  function resetSectionDropdown() {
    console.log("🔄 Resetting section dropdown");

    const $sectionSelect = $("#sections");
    
    // ENHANCED: Complete reset with proper default option
    $sectionSelect.empty().prop("disabled", true);
    
    // Add the default option back as selected
    $sectionSelect.append(
      $('<option value="" selected>Select a section...</option>')
    );
  }

  function resetFieldDropdown() {
    console.log("🔄 Resetting field dropdown");

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
    console.log("=== BINDING ORION DISCARD EVENT HANDLERS ===");
    
    // Farm selection handler with enhanced UX
    $(document).off('change.orion-farms').on('change.orion-farms', '#farms', function () {
      const farmId = $(this).val();

      const farmName = $(this).find('option:selected').text();
      
      console.log("=== FARM SELECTION CHANGED ===");

      console.log("🌱 Selected farm:", farmName, "(ID:", farmId, ")");
      
      // Reset dependent dropdowns with proper defaults
      resetSectionDropdown();

      resetFieldDropdown();
      
      // Clear any existing messages
      $(".orion-message").remove();

      // Populate sections if farm selected (not default option)
      if (farmId && farmId !== "") {
        console.log("🔄 Loading sections for farm:", farmId);

        populateSectionDropdown(farmId);
      } else {
        console.log("📝 Default farm option selected - sections remain disabled");
      }
    });

    // Section selection handler with enhanced validation
    $(document).off('change.orion-sections').on('change.orion-sections', '#sections', function () {
      const sectionId = $(this).val();

      const sectionName = $(this).find('option:selected').text();

      const farmId = $("#farms").val();
      
      console.log("=== SECTION SELECTION CHANGED ===");

      console.log("🌾 Selected section:", sectionName, "(ID:", sectionId, ")");

      console.log("🔗 Current farm ID:", farmId);

      // Reset field dropdown
      resetFieldDropdown();
      
      // Clear any existing messages
      $(".orion-message").remove();

      // Only populate fields if both farm and section are properly selected (not default options)
      if (sectionId && sectionId !== "" && farmId && farmId !== "") {
        console.log("🔄 Loading fields for farm:", farmId, "section:", sectionId);

        populateFieldDropdown(farmId, sectionId);
      } else {
        console.log("📝 Default section option selected - fields remain disabled");
      }
    });

    // Field selection handler with CSV integration
    $(document).off('change.orion-fields').on('change.orion-fields', '#fields', function () {
      const fieldId = $(this).val();

      const fieldName = $(this).find('option:selected').text();
      
      console.log("=== FIELD SELECTION CHANGED ===");

      console.log("🌻 Selected field:", fieldName, "(ID:", fieldId, ")");
      
      // Clear any existing messages
      $(".orion-message").remove();
      
      // Only trigger CSV download for valid field selection (not default option)
      if (fieldId && fieldId !== "" && typeof window.downloadAndProcessCSV === 'function') {
        console.log("📥 Triggering CSV download for field:", fieldId);

        window.downloadAndProcessCSV(fieldId);
      } else if (fieldId && fieldId !== "") {
        console.warn("⚠️ CSV download function not available");
      } else {
        console.log("📝 Default field option selected - no CSV download");
      }
    });

    // Form submission handler
    $(document).off('submit.orion-form').on('submit.orion-form', '#vform-form', function (e) {
      e.preventDefault();

      console.log("=== FORM SUBMISSION ===");

      submitDiscardForm();
    });

    // Scanner input handlers
    $(document).off('focus.orion-scanner').on('focus.orion-scanner', '#scanner-input', function () {
      $(this).select();
    });

    $(document).off('input.orion-scanner change.orion-scanner').on('input.orion-scanner change.orion-scanner', '#scanner-input', function () {
      barCodeInputChange();
    });
    
    // Log successful binding
    console.log("✅ Orion Discard event handlers bound successfully");

    console.log("📊 Elements found:");

    console.log("- Farms dropdown:", $("#farms").length);

    console.log("- Sections dropdown:", $("#sections").length);

    console.log("- Fields dropdown:", $("#fields").length);

    console.log("- Form:", $("#vform-form").length);

    console.log("- Scanner input:", $("#scanner-input").length);
  }

  // ENHANCED: Form validation with proper default option checking
  function submitDiscardForm() {
    console.log("=== SUBMITTING DISCARD FORM ===");
    
    const farmId = $("#farms").val();

    const sectionId = $("#sections").val();

    const fieldId = $("#fields").val();

    const scannedCode = $("#scanner-input").val();
    
    console.log("📋 Form data:", {
      farmId: farmId,
      sectionId: sectionId,
      fieldId: fieldId,
      scannedCode: scannedCode
    });

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
      console.error("❌ Form validation failed:", validationErrors);

      showMessage("Por favor complete todos los campos: " + validationErrors.join(", "), "error");

      return;
    }

    // Check for duplicate barcode
    checkDuplicateBarcode(scannedCode, function (isDuplicate) {
      if (isDuplicate) {
        console.warn("⚠️ Duplicate barcode detected:", scannedCode);

        showDuplicateModal(scannedCode);
      } else {
        console.log("✅ Barcode validation passed - proceeding with submission");

        proceedWithSubmission();
      }
    });
  }

  function checkDuplicateBarcode(barcode, callback) {
    console.log("🔍 Checking for duplicate barcode:", barcode);
    
    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: "POST",
      data: {
        action: "check_duplicate_barcd",
        barcode: barcode,
        nonce: orionDiscard.nonce,
      },
      success: function (response) {
        console.log("✅ Duplicate check response:", response);

        callback(response.success ? response.data.exists : false);
      },
      error: function (xhr, status, error) {
        console.error("❌ Duplicate check failed:", error);

        callback(false);
      },
    });
  }

  function showDuplicateModal(barcode) {
    console.log("🚨 Showing duplicate barcode modal for:", barcode);

    $("#duplicate-code-display").text(barcode);

    $("#duplicate-barcode-modal").show();
  }

  // Modal close handlers
  $(document).on("click", "#modal-close-btn, .orion-modal-close", function () {
    console.log("❌ Closing duplicate barcode modal");

    $("#duplicate-barcode-modal").hide();
  });

  function proceedWithSubmission() {
    console.log("🚀 Proceeding with form submission");
    
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

    console.log("📤 Submitting form data:", formData);

    // Disable submit button
    $("#btn-submit").prop("disabled", true).text("Procesando...");

    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: "POST",
      data: formData,
      success: function (response) {
        console.log("✅ Form submission response:", response);
        
        if (response.success) {
          showMessage("Descarte registrado exitosamente", "success");

          resetForm();

          refreshDataTable();
        } else {
          console.error("❌ Form submission failed:", response.data);

          showMessage("Error al registrar el descarte: " + (response.data || "Error desconocido"), "error");
        }
      },
      error: function (xhr, status, error) {
        console.error("❌ Form submission error:", error);

        showMessage("Error de conexión al enviar el formulario", "error");
      },
      complete: function () {
        $("#btn-submit").prop("disabled", false).text("Submit");
      },
    });
  }

  function resetForm() {
    console.log("🔄 Resetting Orion Discard form");
    
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

    console.log("📱 Barcode input changed:", barCodeValue);
    
    // Trigger CSV download if barcode is valid and function available
    if (barCodeValue && typeof window.downloadAndProcessCSV === 'function') {
      console.log("📥 Triggering CSV download for barcode:", barCodeValue);

      window.downloadAndProcessCSV(barCodeValue);
    }
  }

  // DataTable initialization and management functions remain the same...
  function initializeDataTable() {
    console.log("📊 Initializing Orion Discard DataTable...");
    
    if (!$.fn.DataTable) {
      console.error("❌ DataTables library not loaded");

      showMessage("Error: DataTables no está cargado", "error");

      return;
    }

    if ($("#discards-table").length === 0) {
      console.error("❌ Discards table element not found");

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
          console.log("✅ DataTable initialized successfully");

          loadTableData();
        },
      });
    } catch (e) {
      console.error("❌ DataTable initialization error:", e);

      showMessage("Error al inicializar la tabla: " + e.message, "error");
    }
  }

  function loadTableData() {
    console.log("📊 Loading table data...");
    
    $.ajax({
      url: orionDiscard.ajaxUrl,
      type: "POST",
      data: {
        action: "get_discards",
        nonce: orionDiscard.nonce,
      },
      success: function (response) {
        console.log("✅ Table data loaded:", response);
        
        if (response.success && dataTable) {
          dataTable.clear().rows.add(response.data || []).draw();
        } else {
          console.error("❌ Table data error:", response.data);

          showMessage("Error al cargar datos: " + (response.data || "Error desconocido"), "error");
        }
      },
      error: function (xhr, status, error) {
        console.error("❌ Table data request failed:", status, error);

        showMessage("Error de conexión al cargar datos", "error");
      },
    });
  }

  function refreshDataTable() {
    if (dataTable) {
      console.log("🔄 Refreshing DataTable...");

      loadTableData();
    }
  }

  function showMessage(message, type) {
    console.log(`💬 Showing ${type} message:`, message);
    
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
    console.log("=== ORION DISCARD DEBUG INFO ===");

    console.log("Fields data loaded:", fieldsData.length);

    console.log("Farms dropdown:", $("#farms").val());

    console.log("Sections dropdown:", $("#sections").val());

    console.log("Fields dropdown:", $("#fields").val());

    console.log("Scanner input:", $("#scanner-input").val());
  };
});