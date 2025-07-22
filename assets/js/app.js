/**
 * Orion Discard Plugin JavaScript
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
    // Load initial data from Orion API
    loadFieldsData();

    // Initialize DataTable
    initializeDataTable();

    // Bind event handlers
    bindEventHandlers();
  }

  function loadFieldsData() {
    // Show loading state
    $("#farm-select").addClass("loading");

    // Get site from current user (passed from PHP)
    const site = orionDiscard.site || "PRSA";

    // Make AJAX request to get fields data
    $.ajax({
      url: "http://192.168.96.84:8080/orion/wp-json/orion-maps-fields/v1/fields",
      method: "GET",
      data: { site: site },
      success: function (response) {
        console.log("API Response:", response);
        if (response.success && response.data && response.data.fields) {
          fieldsData = response.data.fields;
          populateFarmDropdown();
          console.log(
            "Loaded fields data for site:",
            site,
            "Total items:",
            fieldsData.length
          );
        } else {
          console.log("Response structure:", response);
          showMessage("Error al cargar los datos de las fincas", "error");
        }
      },
      error: function (xhr, status, error) {
        console.error("Error loading fields data:", error);
        console.error("XHR:", xhr);
        showMessage("Error de conexión al cargar los datos", "error");
      },
      complete: function () {
        $("#farm-select").removeClass("loading");
      },
    });
  }

  function populateFarmDropdown() {
    const $farmSelect = $("#farm-select");
    const farms = fieldsData.filter((item) => item.field_type === "farm");

    // Clear existing options (except the first one)
    $farmSelect.find("option:not(:first)").remove();

    // Add farm options
    farms.forEach(function (farm) {
      $farmSelect.append(
        $("<option></option>").attr("value", farm.id).text(farm.title)
      );
    });

    console.log("Populated farms:", farms.length);
  }

  function populateSectionDropdown(farmId) {
    const $sectionSelect = $("#section-select");
    const sections = fieldsData.filter(
      (item) => item.field_type === "sections" && item.farm_name === farmId
    );

    // Clear existing options (except the first one)
    $sectionSelect.find("option:not(:first)").remove();

    // Add section options
    sections.forEach(function (section) {
      $sectionSelect.append(
        $("<option></option>").attr("value", section.id).text(section.title)
      );
    });

    // Enable or disable the section dropdown
    if (sections.length > 0) {
      $sectionSelect.prop("disabled", false);
    } else {
      $sectionSelect.prop("disabled", true);
    }

    console.log("Populated sections for farm", farmId, ":", sections.length);
  }

  function populateFieldDropdown(farmId, sectionId) {
    const $fieldSelect = $("#field-select");
    const fields = fieldsData.filter(
      (item) =>
        item.field_type === "fields" &&
        item.farm_name === farmId &&
        item.section_name === sectionId
    );

    // Clear existing options (except the first one)
    $fieldSelect.find("option:not(:first)").remove();

    // Add field options
    fields.forEach(function (field) {
      $fieldSelect.append(
        $("<option></option>").attr("value", field.id).text(field.title)
      );
    });

    // Enable or disable the field dropdown
    if (fields.length > 0) {
      $fieldSelect.prop("disabled", false);
    } else {
      $fieldSelect.prop("disabled", true);
    }

    console.log(
      "Populated fields for farm",
      farmId,
      "section",
      sectionId,
      ":",
      fields.length
    );
  }

  function bindEventHandlers() {
    // Farm selection change
    $("#farm-select").on("change", function () {
      const farmId = $(this).val();

      // Reset dependent dropdowns
      $("#section-select")
        .val("")
        .prop("disabled", true)
        .find("option:not(:first)")
        .remove();
      $("#field-select")
        .val("")
        .prop("disabled", true)
        .find("option:not(:first)")
        .remove();

      if (farmId) {
        populateSectionDropdown(farmId);
      }
    });

    // Section selection change
    $("#section-select").on("change", function () {
      const sectionId = $(this).val();
      const farmId = $("#farm-select").val();

      // Reset field dropdown
      $("#field-select")
        .val("")
        .prop("disabled", true)
        .find("option:not(:first)")
        .remove();

      if (sectionId && farmId) {
        populateFieldDropdown(farmId, sectionId);
      }
    });

    // Form submission
    $("#discard-form").on("submit", function (e) {
      e.preventDefault();
      submitDiscardForm();
    });

    // Scanner input - auto-focus for barcode scanners
    $("#scanner-input").on("focus", function () {
      $(this).select();
    });
  }

  function submitDiscardForm() {
    const scannedCode = $("#scanner-input").val();

    // Validate form
    if (
      !$("#farm-select").val() ||
      !$("#section-select").val() ||
      !$("#field-select").val() ||
      !scannedCode
    ) {
      showMessage("Por favor complete todos los campos", "error");
      return;
    }

    // Check for duplicate BARCD
    checkDuplicateBarcode(scannedCode, function (isDuplicate) {
      if (isDuplicate) {
        showDuplicateModal(scannedCode);
      } else {
        proceedWithSubmission();
      }
    });
  }

  // Function to check for duplicate barcode
  function checkDuplicateBarcode(barcode, callback) {
    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: "POST",
      data: {
        action: "check_duplicate_barcd",
        barcode: barcode,
        nonce: orionDiscard.nonce,
      },
      success: function (response) {
        if (response.success) {
          callback(response.data.exists);
        } else {
          callback(false);
        }
      },
      error: function () {
        callback(false);
      },
    });
  }

  // Function to show duplicate modal
  function showDuplicateModal(barcode) {
    $("#duplicate-code-display").text(barcode);
    $("#duplicate-barcode-modal").show();
  }

  // Modal event handlers
  $(document).on("click", "#modal-close-btn", function () {
    $("#duplicate-barcode-modal").hide();
  });

  $(document).on("click", ".orion-modal-close", function () {
    $("#duplicate-barcode-modal").hide();
  });

  // Function to proceed with form submission
  function proceedWithSubmission() {
    const formData = {
      action: "submit_discard",
      nonce: orionDiscard.nonce,
      farm_id: $("#farm-select").val(),
      farm_name: $("#farm-select option:selected").text(),
      section_id: $("#section-select").val(),
      section_name: $("#section-select option:selected").text(),
      field_id: $("#field-select").val(),
      field_name: $("#field-select option:selected").text(),
      scanned_code: $("#scanner-input").val(),
    };

    // Disable submit button
    $("#submit-discard").prop("disabled", true).text("Procesando...");

    // Submit via AJAX
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
          showMessage(
            "Error al registrar el descarte: " +
              (response.data || "Error desconocido"),
            "error"
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("Error submitting form:", error);
        showMessage("Error de conexión al enviar el formulario", "error");
      },
      complete: function () {
        $("#submit-discard").prop("disabled", false).text("Registrar Descarte");
      },
    });
  }

  function resetForm() {
    $("#discard-form")[0].reset();
    $("#section-select")
      .prop("disabled", true)
      .find("option:not(:first)")
      .remove();
    $("#field-select")
      .prop("disabled", true)
      .find("option:not(:first)")
      .remove();
    $("#scanner-input").focus();
  }

  function initializeDataTable() {
    console.log("Initializing DataTable...");

    // Check if DataTables is loaded
    if (!$.fn.DataTable) {
      console.error("DataTables is not loaded");
      showMessage("Error: DataTables no está cargado", "error");
      return;
    }

    // Check if table exists
    if ($("#discards-table").length === 0) {
      console.error("Table #discards-table not found");
      showMessage("Error: Tabla no encontrada", "error");
      return;
    }

    console.log("Table found, proceeding with DataTable initialization...");

    try {
      // First try with simple initialization
      dataTable = $("#discards-table").DataTable({
        data: [], // Start with empty data
        columns: [
          {
            data: "status",
            title: "Estado",
            className: "text-center",
            defaultContent: "",
          },
          { data: "crop", title: "Crop", defaultContent: "" },
          { data: "owner", title: "Owner", defaultContent: "" },
          { data: "submission_id", title: "Submission ID", defaultContent: "" },
          { data: "field", title: "Field", defaultContent: "" },
          { data: "extno", title: "EXTNO", defaultContent: "" },
          { data: "range_val", title: "Range", defaultContent: "" },
          { data: "row_val", title: "Row", defaultContent: "" },
          {
            data: "barcd",
            title: "*BARCD",
            className: "font-weight-bold",
            defaultContent: "",
          },
          { data: "plot_id", title: "Plot ID", defaultContent: "" },
          { data: "subplot_id", title: "Subplot ID", defaultContent: "" },
          { data: "matid", title: "MATID", defaultContent: "" },
          { data: "abbrc", title: "ABBRC", defaultContent: "" },
          {
            data: "sd_instruction",
            title: "SD Instruction",
            defaultContent: "",
          },
          {
            data: "vform_record_type",
            title: "vform-record-type",
            defaultContent: "",
          },
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
          console.log("DataTable initialized successfully");
          // Now load data via AJAX
          loadTableData();
        },
      });
    } catch (e) {
      console.error("Error initializing DataTable:", e);
      showMessage("Error al inicializar la tabla: " + e.message, "error");
    }
  }

  function loadTableData() {
    console.log("Loading table data...");
    $.ajax({
      url: orionDiscard.ajaxUrl,
      type: "POST",
      data: {
        action: "get_discards",
        nonce: orionDiscard.nonce,
      },
      success: function (response) {
        console.log("Table data response:", response);
        if (response.success && dataTable) {
          dataTable
            .clear()
            .rows.add(response.data || [])
            .draw();
        } else {
          console.error("Table data error:", response.data);
          showMessage(
            "Error al cargar datos: " + (response.data || "Error desconocido"),
            "error"
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("Table data request failed:", status, error);
        showMessage("Error de conexión al cargar datos", "error");
      },
    });
  }

  function refreshDataTable() {
    if (dataTable) {
      console.log("Refreshing DataTable...");
      loadTableData();
    }
  }

  function showMessage(message, type) {
    const messageHtml = `<div class="orion-message ${type}">${message}</div>`;

    // Remove existing messages
    $(".orion-message").remove();

    // Add new message
    $("#discard-form").before(messageHtml);

    // Auto-remove after 5 seconds
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

  function bindEventHandlers() {
    // ...existing code...

    // Bind dropdown change events for CSV downloading
    $("#farm-select").on("change", function () {
      const farmValue = $(this).val();
      console.log("Farm changed:", farmValue);

      if (farmValue) {
        populateSectionDropdown(farmValue);
      } else {
        // Clear dependent dropdowns
        resetSectionDropdown();
        resetFieldDropdown();
      }
    });

    $("#section-select").on("change", function () {
      const sectionValue = $(this).val();
      const farmValue = $("#farm-select").val();

      console.log("Section changed:", sectionValue);

      if (sectionValue && farmValue) {
        populateFieldDropdown(farmValue, sectionValue);
      } else {
        resetFieldDropdown();
      }
    });

    // Field selection will trigger CSV download via csv-handler.js
    $("#field-select").on("change", function () {
      const fieldValue = $(this).val();
      console.log("Field changed:", fieldValue);

      // CSV handler will automatically detect this change and download CSV
    });
  }
});
