/**
 * CSV Handler for Orion Discard Plugin
 * Manages CSV download and processing when all selections are complete
 *
 * Architecture: Uses centralized table management via window.discardsTableManager
 * Dependencies: jQuery, discards-table-manager.js, ajax.js
 */

jQuery(document).ready(function ($) {
  // ============================================================================
  // GLOBAL VARIABLES
  // ============================================================================

  let csvData = [];
  var site = orionDiscard.site || "PRSA";
  var year = orionDiscard.year || new Date().getFullYear();

  // ============================================================================
  // INITIALIZATION & TABLE MANAGER INTEGRATION
  // ============================================================================

  /**
   * Check if field is selected and trigger data loading
   * Uses centralized table manager for data display
   */
  function checkIfFieldSelected() {
    const fieldSelected = $("#fields").val();

    showCSVLoadingIndicator(true);

    // Clear table using centralized manager
    if (
      window.discardsTableManager &&
      window.discardsTableManager.isInitialized()
    ) {
      window.discardsTableManager.clearTable();
    }

    if (fieldSelected && fieldSelected !== "") {
      var ajaxParams =
        window.Factory.BuildAjaxParamToDownloadVFormRecordTypeData(
          "orion-discard",
          site,
          year,
          "get_data_from_vForm_recordType"
        );

      // Call API with proper callbacks
      window.ajax_getDataFrom_vFromRecordType(
        ajaxParams,
        window.HTTP_METHODS.POST,
        function (data) {
          // Success callback
          processCsvData(data.data.csv_content);
        },
        function (error) {
          if (window.showMessage) {
            window.showMessage(
              "Error al obtener datos: " + error.message,
              "error"
            );
          }
        },
        function () {
          // Complete callback
          showCSVLoadingIndicator(false);
        }
      );
    } else {
      // Clear table using centralized manager
      if (
        window.discardsTableManager &&
        window.discardsTableManager.isInitialized()
      ) {
        window.discardsTableManager.clearTable();
      }
    }
  }

  // ============================================================================
  // DATA PROCESSING & NORMALIZATION
  // ============================================================================

  /**
   * Process JSON data and normalize it for the centralized table manager
   * Handles various data formats and structures
   */
  function processCsvData(jsonContent) {
    csvData = [];

    try {
      let data = jsonContent;

      // Parse if string
      if (typeof jsonContent === "string") {
        data = JSON.parse(jsonContent);
      }

      // Extract records array with the correct property name
      let records = [];

      if (Array.isArray(data)) {
        records = data;
      } else if (data && Array.isArray(data)) {
        records = data;
      } else if (data && Array.isArray(data)) {
        records = data;
      } else if (data.records && Array.isArray(data.records)) {
        records = data.records;
      } else {
        throw new Error(
          "Formato de datos no reconocido - se esperaba csv_content array"
        );
      }

      if (records.length === 0) {
        showCSVLoadingIndicator(false);

        if (window.showMessage) {
          window.showMessage(
            "No hay datos disponibles para el campo seleccionado",
            "warning"
          );
        }
        return;
      }

      // Normalize each record for the centralized table format
      records.forEach(function (record) {
        const normalizedRecord = {
          status: "❌", // Default status
          field: record.field || "",
          range_val: record.range || "",
          row_val: record.row || "",
          plot_id: record.plot_id || "",
          subplot_id: record.subplot_id || "",
          matid: record.matid || "",
          barcd: record.barcd || "", // Important for barcode validation
        };

        csvData.push(normalizedRecord);
      });

      showCSVLoadingIndicator(false);

      updateTableWithCsvData();
    } catch (error) {
      showCSVLoadingIndicator(false);

      if (window.showMessage) {
        window.showMessage(
          "Error al procesar los datos: " + error.message,
          "error"
        );
      }
    }
  }

  // ============================================================================
  // CENTRALIZED TABLE INTEGRATION
  // ============================================================================

  /**
   * Update table with CSV data using centralized table manager
   * Eliminates duplicate DataTable management logic
   */
  function updateTableWithCsvData() {
    if (csvData.length === 0) {
      if (window.showMessage) {
        window.showMessage("No hay datos disponibles para mostrar", "warning");
      }
      return;
    }

    // Wait for table manager if not ready
    if (
      !window.discardsTableManager ||
      !window.discardsTableManager.isInitialized()
    ) {
      console.warn("CSV Handler: Table manager not ready, waiting...");
      setTimeout(() => {
        updateTableWithCsvData();
      }, 100);
      return;
    }

    try {
      // Use centralized table manager to update data
      window.discardsTableManager.updateTableData(csvData);

      if (window.showMessage) {
        window.showMessage(
          `Datos cargados: ${csvData.length} registros`,
          "success"
        );
      }
    } catch (error) {
      console.error(
        "CSV Handler: Error updating table with centralized manager:",
        error
      );
      if (window.showMessage) {
        window.showMessage(
          "Error al actualizar la tabla: " + error.message,
          "error"
        );
      }
    }
  }

  // ============================================================================
  // DATA PROCESSING UTILITIES
  // ============================================================================

  /**
   * Show/hide loading indicator for CSV operations
   * Simple UI feedback for data loading state
   */
  function showCSVLoadingIndicator(show) {
    if (show) {
      if ($("#csv-loading").length === 0) {
        $("#discards-table").before(
          '<div id="csv-loading" class="csv-loading"><p>🔄 Cargando datos...</p></div>'
        );
      }
      $("#csv-loading").show();
    } else {
      $("#csv-loading").hide();
    }
  }

  // ============================================================================
  // INITIALIZATION & EVENT HANDLING
  // ============================================================================

  /**
   * Initialize CSV handler when DOM is ready
   * Sets up event listeners and integrates with centralized table manager
   */
  function initializeCsvHandler() {
    // Monitor field dropdown changes
    $(document).on("change", "#fields", function () {
      const selectedField = $(this).val();

      if (selectedField && selectedField !== "") {
        checkIfFieldSelected();
      } else {
        // Clear table using centralized manager
        if (
          window.discardsTableManager &&
          window.discardsTableManager.isInitialized()
        ) {
          window.discardsTableManager.clearTable();
        }
      }
    });
  }

  // ============================================================================
  // INITIALIZATION & GLOBAL EXPORTS
  // ============================================================================

  // Initialize when document is ready
  initializeCsvHandler();

  // Export functions to global scope for external access
  window.csvHandler = {
    processCsvData: processCsvData,
    updateTableWithCsvData: updateTableWithCsvData,
    checkIfFieldSelected: checkIfFieldSelected,
    showCSVLoadingIndicator: showCSVLoadingIndicator,
    processRetrievedData: processRetrievedData,
    getCsvData: function () {
      return csvData;
    },
  };

  // Make key utility functions available globally for backward compatibility
  window.showCSVLoadingIndicator = showCSVLoadingIndicator;
  window.checkIfFieldSelected = checkIfFieldSelected;

  /**
   * Process retrieved data - COMPREHENSIVE DATA PROCESSING
   */
  function processRetrievedData(response) {
    try {
      // Verificar respuesta inicial
      if (!response) {
        showMessage("Error: No se recibieron datos del servidor", "error");
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
      } else {
        if (window.showMessage) {
          window.showMessage("Error: Formato de datos no reconocido", "error");
        }
        return;
      }

      // Verificar que csvContent no esté vacío
      if (!csvContent) {
        if (window.showMessage) {
          window.showMessage("Error: No hay datos para procesar", "error");
        }
        return;
      }

      // Procesar según el tipo de csvContent
      let finalData = null;

      if (typeof csvContent === "string") {
        try {
          // Intentar parsear como JSON
          finalData = JSON.parse(csvContent);
        } catch (parseError) {
          if (window.showMessage) {
            window.showMessage(
              "Error: Formato CSV string no soportado",
              "error"
            );
          }
          return;
        }
      } else if (Array.isArray(csvContent)) {
        finalData = csvContent;
      } else if (typeof csvContent === "object") {
        // Buscar propiedad que contenga array de datos
        const possibleDataKeys = [
          "data",
          "rows",
          "records",
          "items",
          "results",
        ];
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
        if (window.showMessage) {
          window.showMessage("Error: Tipo de datos no soportado", "error");
        }
        return;
      }

      // Verificar datos finales
      if (!finalData || !Array.isArray(finalData)) {
        if (window.showMessage) {
          window.showMessage(
            "Error: Los datos no tienen el formato correcto",
            "error"
          );
        }
        return;
      }

      if (finalData.length === 0) {
        if (window.showMessage) {
          window.showMessage("No hay datos disponibles para mostrar", "notice");
        }
        return;
      }

      // Pasar los datos directamente como array, no como objeto con csv_content
      processCsvData(finalData);
    } catch (error) {
      if (window.showMessage) {
        window.showMessage(
          "Error crítico procesando datos: " + error.message,
          "error"
        );
      }
    }
  }
}); // End of jQuery document ready

// ============================================================================
// END OF CSV HANDLER
// ============================================================================
/**
 * ARCHITECTURE SUMMARY:
 *
 * 1. INITIALIZATION: Sets up field monitoring and table manager integration
 * 2. DATA PROCESSING: Handles various CSV/JSON formats and normalizes data
 * 3. CENTRALIZED INTEGRATION: Uses discardsTableManager for all table operations
 * 4. UI UTILITIES: Loading indicators and feedback systems
 * 5. GLOBAL EXPORTS: Makes functions available for cross-module communication
 *
 * INTEGRATION POINTS:
 * - window.discardsTableManager: Centralized table operations
 * - window.getDataFrom_vFromRecordType: API data retrieval
 * - window.showMessage: Centralized message system
 * - window.csvHandler: Module exports for external access
 *
 * ELIMINATED DUPLICATES:
 * - No longer creates/destroys individual DataTable instances
 * - Removed attemptDataTableCreation() and showDataInSimpleTable()
 * - Uses centralized showMessage instead of local implementation
 * - Delegates all table operations to discardsTableManager
 */
