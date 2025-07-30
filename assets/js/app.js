/**
 * Orion Discard Plugin - Material Discard System
 * Enhanced cascading dropdown with proper default selection behavior
 *
 * Architecture: Uses centralized table management via window.discardsTableManager
 * Dependencies: jQuery, DataTables, ajax.js, discards-table-manager.js
 */

// required('')

jQuery(document).ready(function ($) {
  // ============================================================================
  // GLOBAL VARIABLES
  // ============================================================================

  let fieldsData = [];

  let barcodeValidationTimeout = null;

  var site = orionDiscard.site || "PRSA";

  var year = orionDiscard.year || new Date().getFullYear();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Initialize the form with DOM ready check
  initializeForm();

  /**
   * Main initialization function
   * Coordinates the startup sequence of all components
   */
  function initializeForm() {
    // Check if the vform elements exist
    if ($("#vform-form").length === 0 || $("#farms").length === 0) {
      setTimeout(initializeForm, 500);
      return;
    }

    // Initialize components in proper order
    bindEventHandlers();

    loadFieldsData();

    // waitForTableManager();

    // Check CSV handler availability after a delay
    setTimeout(checkCsvHandlerAvailability, 1000);
  }

  /**
   * Wait for the centralized table manager to be initialized
   * Ensures proper dependency loading before proceeding
   */
  function waitForTableManager() {
    if (
      window.discardsTableManager &&
      window.discardsTableManager.isInitialized()
    ) {
      console.log("App.js: Table manager is ready");
      loadInitialTableData();
    } else {
      console.log("App.js: Waiting for table manager...");
      setTimeout(waitForTableManager, 100);
    }
  }

  // ============================================================================
  // DATA LOADING & API INTEGRATION
  // ============================================================================

  /**
   * Load Orion fields data from API
   * Populates fieldsData array with farms, sections, and fields
   * Note: This function is called only after Factory is confirmed available
   */
  function loadFieldsData() {
    const site = orionDiscard.site || "PRSA";

    console.log("App.js: Loading fields data for site:", site);

    // Agregar clase loading al dropdown de fincas
    $("#farms").addClass("loading");

    // Factory is guaranteed to be available at this point
    var ajaxParam = window.Factory.BuildAjaxParamToDownloadDropdownsData(site);

    // Verificar que los parámetros se generaron correctamente
    if (!ajaxParam) {
      showMessage("Error: No se pudieron generar los parámetros AJAX", "error");
      $("#farms").removeClass("loading");
      console.error("App.js: Factory returned null for dropdown parameters");
      return;
    }

    console.log("App.js: Generated dropdown parameters:", ajaxParam);

    // Use AJAX function from ajax.js with callbacks
    if (typeof window.ajax_fetchOrionFieldsData !== "function") {
      showMessage("Error: Funciones AJAX no cargadas", "error");
      $("#farms").removeClass("loading");
      return;
    }

    console.log("Param:", ajaxParam);

    window.ajax_fetchOrionFieldsData(
      ajaxParam,
      "http://192.168.96.84:8080/orion/wp-json/orion-maps-fields/v1/fields",
      window.HTTP_METHODS.GET,
      function (data) {
        fieldsData = data.data.fields || [];

        console.log(
          "App.js: Fields data loaded successfully:",
          fieldsData.length,
          "items"
        );

        populateFarmDropdown();
      },
      // Error callback
      function (errorMessage) {
        console.error("App.js: Error loading fields data:", errorMessage);

        showMessage(errorMessage, "error");
      },
      function () {
        $("#farms").removeClass("loading");
      }
    );
  }

  /**
   * Load initial table data using the centralized manager
   * Delegates to AJAX functions for data retrieval
   */
  function loadInitialTableData() {
    if (!window.discardsTableManager) {
      console.warn("App.js: Table manager not available for loading data");
      return;
    }

    // Use AJAX function from ajax.js with callbacks
    if (typeof window.ajax_getDataFrom_vFromRecordType !== "function") {
      showMessage("Error: Funciones AJAX no cargadas", "error");

      return;
    }

    var ajaxParams = window.Factory.BuildAjaxParamToDownloadVFormRecordTypeData(
      "orion-discard",
      site,
      year,
      "get_data_from_vForm_recordType"
    );

    // Load initial data via AJAX
    window.ajax_getDataFrom_vFromRecordType(
      ajaxParams,
      window.HTTP_METHODS.POST,
      function (data) {
        // Handle success
        if (data.success && data.data) {
          // Use centralized table manager to update data
          if (
            window.discardsTableManager &&
            typeof window.discardsTableManager.updateTableData === "function"
          ) {
            window.discardsTableManager.updateTableData(
              data.data.csv_content || data.data
            );
          } else if (
            typeof window.csvHandler !== "undefined" &&
            typeof window.csvHandler.processRetrievedData === "function"
          ) {
            // Fallback to CSV handler for backward compatibility
            window.csvHandler.processRetrievedData(response.data);
          } else {
            console.warn(
              "App.js: No table manager or CSV handler available for data update"
            );
          }
        }
      },
      function (errorMessage) {
        // Handle error
        console.error("Error loading initial table data:", errorMessage);
      },
      function () {
        // Handle complete
        console.log("Initial table data loading complete");
      }
    );
  }

  /**
   * Check CSV handler availability after initialization
   * Shows warning if CSV functionality is not available
   */
  function checkCsvHandlerAvailability() {
    if (!window.csvHandler && !window.checkIfFieldSelected) {
      showMessage("Funcionalidad CSV no disponible", "warning");
    }
  }

  // ============================================================================
  // DROPDOWN POPULATION & MANAGEMENT
  // ============================================================================

  /**
   * Populate the farm dropdown with available farms
   * Auto-selects if only one farm is available
   */
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

    // Auto-select if only one farm available
    if (farms.length === 1) {
      $farmSelect.val(farms[0].id);
      $farmSelect.trigger("change");
    }
  }

  /**
   * Populate sections dropdown based on selected farm
   * Implements cascading dropdown logic with auto-selection
   */
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

    // Clear ALL options and rebuild from scratch
    $sectionSelect.empty();

    // Add default option with proper selection
    $sectionSelect.append(
      $("<option></option>").attr("value", "").text("Seleccione una sección...")
    );

    // Add section options
    sections.forEach(function (section) {
      $sectionSelect.append(
        $("<option></option>").attr("value", section.id).text(section.title)
      );
    });

    // Enable the section dropdown
    $sectionSelect.prop("disabled", false);

    // Auto-select logic - only if there's exactly one section
    if (sections.length === 1) {
      $sectionSelect.val(sections[0].id);

      setTimeout(() => {
        // Only trigger if the value is still selected (user didn't change it)
        if ($sectionSelect.val() === sections[0].id) {
          $sectionSelect.trigger("change");
        }
      }, 100);
    } else {
      // Multiple sections available - keep default selected for user choice
      $sectionSelect.val("");
    }
  }

  /**
   * Populate fields dropdown based on selected farm and section
   * Final level of cascading dropdown hierarchy
   */
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

      return farmMatches && sectionMatches;
    });

    // Clear ALL options and rebuild from scratch
    $fieldSelect.empty();

    // Add default option with proper selection
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

    // Auto-select logic for fields - only if there's exactly one field
    if (fields.length === 1) {
      $fieldSelect.val(fields[0].id);

      setTimeout(() => {
        // Only trigger if the value is still selected
        if ($fieldSelect.val() === fields[0].id) {
          $fieldSelect.trigger("change");
        }
      }, 100);
    } else {
      // Multiple fields available - keep default selected for user choice
      $fieldSelect.val("");
    }
  }

  /**
   * Reset section dropdown to default state
   * Used when farm selection changes
   */
  function resetSectionDropdown() {
    const $sectionSelect = $("#sections");

    // Complete reset with proper default option
    $sectionSelect.empty().prop("disabled", true);

    // Add the default option back as selected
    $sectionSelect.append(
      $('<option value="" selected>Select a section...</option>')
    );
  }

  /**
   * Reset field dropdown to default state
   * Used when section selection changes
   */
  function resetFieldDropdown() {
    const $fieldSelect = $("#fields");

    // Complete reset with proper default option
    $fieldSelect.empty().prop("disabled", true);

    // Add the default option back as selected
    $fieldSelect.append(
      $('<option value="" selected>Select a field...</option>')
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  /**
   * Bind all event handlers for form interactions
   * Sets up cascading dropdown logic and scanner input handling
   */
  function bindEventHandlers() {
    // Farm selection handler - triggers section population
    $(document)
      .off("change.orion-farms")
      .on("change.orion-farms", "#farms", function () {
        const farmId = $(this).val();

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

    // Section selection handler - triggers field population
    $(document)
      .off("change.orion-sections")
      .on("change.orion-sections", "#sections", function () {
        const sectionId = $(this).val();
        const farmId = $("#farms").val();

        // Reset field dropdown
        resetFieldDropdown();

        // Clear any existing messages
        $(".orion-message").remove();

        // Only populate fields if both farm and section are properly selected
        if (sectionId && sectionId !== "" && farmId && farmId !== "") {
          populateFieldDropdown(farmId, sectionId);
        }
      });

    // Field selection handler - triggers CSV integration
    $(document)
      .off("change.orion-fields")
      .on("change.orion-fields", "#fields", function () {
        const fieldId = $(this).val();

        // Clear any existing messages
        $(".orion-message").remove();

        // Only trigger CSV download for valid field selection (not default option)
        if (fieldId && fieldId !== "") {
          // Try fallback to direct function if available
          if (typeof window.checkIfFieldSelected === "function") {
            window.checkIfFieldSelected();
          }
        }
      });

    // Scanner input handlers
    $(document)
      .off("focus.orion-scanner")
      .on("focus.orion-scanner", "#scanner-input", function () {
        $(this).select();
      });

    $(document)
      .off("input.orion-scanner change.orion-scanner")
      .on(
        "input.orion-scanner change.orion-scanner",
        "#scanner-input",
        function () {
          barCodeInputChange();
        }
      );
  }

  // Modal close handlers - global event delegation
  $(document).on("click", "#modal-close-btn, .orion-modal-close", function () {
    $("#duplicate-barcode-modal").hide();
  });

  // ============================================================================
  // BARCODE VALIDATION & SCANNING
  // ============================================================================

  /**
   * Handle barcode input changes with debouncing
   * Validates barcode against table data and triggers CSV processing
   */
  function barCodeInputChange() {
    const barCodeValue = $("#scanner-input").val().trim();

    // Clear any existing validation timeout
    if (barcodeValidationTimeout) {
      clearTimeout(barcodeValidationTimeout);
    }

    // If barcode is empty, clear validation icon
    if (!barCodeValue) {
      updateBarcodeValidationIcon("clear");

      return;
    }

    // Add a small delay to avoid excessive API calls while typing
    barcodeValidationTimeout = setTimeout(() => {
      // Check if barcode exists in the current DataTable and update its status
      // checkBarcodeInTable(barCodeValue);

      // Trigger CSV download if barcode is valid and function available
      if (barCodeValue && typeof window.downloadAndProcessCSV === "function") {
        // Note: CSV functionality can be triggered here if needed
      }
    }, 300); // 300ms delay
  }

  /**
   * Check if barcode exists in the current DataTable and update its status
   * Uses centralized table manager for consistent data handling
   * @param {string} barcode - The barcode to search for
   * @returns {boolean} - True if barcode found and updated
   */
  function checkBarcodeInTable(barcode) {
    if (
      !window.discardsTableManager ||
      !window.discardsTableManager.isInitialized()
    ) {
      console.warn("App.js: Table manager not available for barcode check");
      updateBarcodeValidationIcon("x");
      return false;
    }

    if (!barcode || barcode.trim() === "") {
      updateBarcodeValidationIcon("clear");
      return false;
    }

    // Show loading state while checking
    updateBarcodeValidationIcon("loading");

    try {
      // Use the centralized manager to check and update barcode status
      const found = window.discardsTableManager.updateRowStatus(barcode, "✅");

      if (found) {
        updateBarcodeValidationIcon("check");
        console.log("App.js: Barcode found and status updated:", barcode);
      } else {
        updateBarcodeValidationIcon("x");
        console.log("App.js: Barcode not found in table:", barcode);
      }

      return found;
    } catch (error) {
      console.error("App.js: Error checking barcode in table:", error);
      updateBarcodeValidationIcon("x");
      return false;
    }
  }

  // ============================================================================
  // UI VALIDATION & FEEDBACK
  // ============================================================================
  function updateBarcodeValidationIcon(type) {
    const $scannerInput = $("#scanner-input");

    let $iconContainer = $("#barcode-validation-icon");

    // Create icon container if it doesn't exist
    if ($iconContainer.length === 0) {
      // Look for the scanner input's parent container
      const $inputContainer = $scannerInput.closest(
        ".form-group, .input-group, .field-container, div"
      );

      if (
        $inputContainer.length > 0 &&
        $inputContainer.hasClass("input-group")
      ) {
        // If it's an input group, add to the end of the group
        $inputContainer.append(
          '<span id="barcode-validation-icon" class="barcode-validation-icon"></span>'
        );
      } else {
        // Fallback: add after the input directly
        $scannerInput.after(
          '<span id="barcode-validation-icon" class="barcode-validation-icon"></span>'
        );
      }

      $iconContainer = $("#barcode-validation-icon");
    }

    // Clear existing classes and content
    $iconContainer
      .removeClass(
        "validation-check validation-x validation-clear validation-loading"
      )
      .empty();

    switch (type) {
      case "check":
        $iconContainer
          .addClass("validation-check")
          .html("&#10004;") // ✓ checkmark
          .attr("title", "Código encontrado en la tabla")
          .css({
            color: "#28a745",
            "font-weight": "bold",
            "font-size": "18px",
            "margin-left": "8px",
            "vertical-align": "middle",
            display: "inline-block",
          });
        break;

      case "x":
        $iconContainer
          .addClass("validation-x")
          .html("&#10006;") // ✗ X mark
          .attr("title", "Código no encontrado en la tabla")
          .css({
            color: "#dc3545",
            "font-weight": "bold",
            "font-size": "18px",
            "margin-left": "8px",
            "vertical-align": "middle",
            display: "inline-block",
          });
        break;

      case "loading":
        $iconContainer
          .addClass("validation-loading")
          .html("&#8987;") // ⏻ loading/clock symbol
          .attr("title", "Verificando código...")
          .css({
            color: "#ffc107",
            "font-weight": "bold",
            "font-size": "16px",
            "margin-left": "8px",
            "vertical-align": "middle",
            display: "inline-block",
            animation: "spin 1s linear infinite",
          });
        break;

      case "clear":
      default:
        $iconContainer
          .addClass("validation-clear")
          .html("")
          .removeAttr("title")
          .css({
            display: "none",
          });
        break;
    }
  }

  // ============================================================================
  // TABLE INTERACTION & DELEGATION
  // ============================================================================

  /**
   * Highlight a table row temporarily (delegated to table manager)
   * @param {number} rowIndex - The index of the row to highlight
   */
  function highlightTableRow(rowIndex) {
    if (
      window.discardsTableManager &&
      window.discardsTableManager.highlightRow
    ) {
      window.discardsTableManager.highlightRow(rowIndex);
    } else {
      console.warn("App.js: Table manager highlight function not available");
    }
  }

  // ============================================================================
  // AUTO-FOCUS & INITIALIZATION COMPLETION
  // ============================================================================

  // Focus on scanner input when page loads for immediate usability
  setTimeout(function () {
    $("#scanner-input").focus();
  }, 500);

  /**
   * Show message to user (centralized function)
   * @param {string} message - The message to display
   * @param {string} type - The type of message: 'success', 'error', 'warning'
   */
  function showMessage(message, type) {
    // Prevent infinite recursion by checking if we're already the global function
    if (
      window.showMessage &&
      window.showMessage !== showMessage &&
      typeof window.showMessage === "function"
    ) {
      window.showMessage(message, type);
      return;
    }

    // Enhanced message display with better styling and positioning
    const messageHtml = `<div class="orion-message ${type}" style="padding: 12px; margin: 15px 0; border-radius: 4px; font-weight: 500; border-left: 4px solid;">${message}</div>`;

    // Remove existing messages
    $(".orion-message").remove();

    // Find a good place to insert the message
    if ($("#vform-form").length > 0) {
      $("#vform-form").before(messageHtml);
    } else if ($("#discards-table").length > 0) {
      $("#discards-table").before(messageHtml);
    } else {
      $("body").prepend(messageHtml);
    }

    // Auto-hide after 5 seconds
    setTimeout(function () {
      $(".orion-message").fadeOut(500, function () {
        $(this).remove();
      });
    }, 5000);
  }

  // Expose showMessage globally for use by other modules
  window.showMessage = showMessage;
}); // End of jQuery document ready

// ============================================================================
// END OF ORION DISCARD APP.JS
// ============================================================================
/**
 * ARCHITECTURE SUMMARY:
 *
 * 1. INITIALIZATION: Coordinates startup sequence and dependency checking
 * 2. DATA LOADING: Manages API integration and field data population
 * 3. DROPDOWN MANAGEMENT: Handles cascading farm → section → field logic
 * 4. EVENT HANDLERS: Manages all user interactions and form events
 * 5. BARCODE VALIDATION: Real-time scanning and table validation
 * 6. UI VALIDATION: Visual feedback and icon management
 * 7. TABLE INTERACTION: Delegates to centralized table manager
 * 8. UTILITY FUNCTIONS: Message display and helper functions
 *
 * DEPENDENCIES:
 * - jQuery 3.x
 * - DataTables 1.11.5
 * - ajax.js (AJAX operations)
 * - discards-table-manager.js (centralized table management)
 * - csv-handler.js (CSV processing)
 *
 * INTEGRATION POINTS:
 * - window.discardsTableManager: Centralized table operations
 * - window.loadOrionFieldsData: API data loading
 * - window.getDataFrom_vFromRecordType: Table data retrieval
 * - window.showMessage: Centralized message display
 * - window.checkIfFieldSelected: CSV integration trigger
 */
