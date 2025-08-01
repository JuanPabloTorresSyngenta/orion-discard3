jQuery(document).ready(function ($) {
  // ✅ SECURITY: Only execute on Orion Discard plugin pages
  if (!isOrionDiscardPage()) {
    return; // Exit early if not on the correct page
  }

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
      console.log('Orion Discard AJAX: Not on plugin page, exiting');
    }
    
    return isValid;
  }

  // ============================================================================
  // HTTP METHODS & RESPONSE TYPES ENUMS
  // ============================================================================

  /**
   * Enum para métodos HTTP utilizados en las peticiones AJAX
   * Centraliza todos los métodos HTTP disponibles para evitar errores de tipeo
   */
  const HTTP_METHODS = {
    // Métodos principales
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",

    // Métodos adicionales
    HEAD: "HEAD",
    OPTIONS: "OPTIONS",
    CONNECT: "CONNECT",
    TRACE: "TRACE",
  };

  /**
   * Enum para tipos de contenido (Content-Type) más comunes
   * Útil para configurar headers en peticiones AJAX
   */
  const CONTENT_TYPES = {
    JSON: "application/json",
    FORM_DATA: "application/x-www-form-urlencoded",
    MULTIPART: "multipart/form-data",
    TEXT: "text/plain",
    HTML: "text/html",
    XML: "application/xml",
    CSV: "text/csv",
  };

  /**
   * Enum para tipos de datos de respuesta (dataType)
   * Define el tipo de datos esperado del servidor
   */
  const RESPONSE_TYPES = {
    JSON: "json",
    XML: "xml",
    HTML: "html",
    TEXT: "text",
    SCRIPT: "script",
    JSONP: "jsonp",
  };

  // ============================================================================
  // AJAX FUNCTIONS - ORION API INTEGRATION
  // ============================================================================

  /**
   * Carga los datos de fincas desde la API de Orion
   * @param {object} ajaxParam - El sitio para el cual cargar los datos (ej: "PRSA")
   * @param {string} url - La URL de la API
   * @param {string} method - Método HTTP a utilizar (GET/POST)
   * @param {function} onSuccess - Callback cuando los datos se cargan exitosamente
   * @param {function} onError - Callback cuando hay un error
   * @param {function} onComplete - Callback que se ejecuta al finalizar la petición
   */
  function ajax_fetchOrionFieldsData(
    ajaxParam,
    url,
    method,
    onSuccess,
    onError,
    onComplete
  ) {
    $.ajax({
      url: url,
      method: method,
      data: ajaxParam,
      success: function (response) {
        if (response.success && response.data && response.data.fields) {
          // Llamar callback de éxito con los datos
          if (typeof onSuccess === "function") {
            onSuccess(response);
          }
        } else {
          if (typeof onError === "function") {
            onError("Error al cargar los datos de las fincas");
          }
        }
      },
      error: function (xhr, status, error) {
        if (typeof onError === "function") {
          onError(error);
        }
      },
      complete: function () {
        if (typeof onComplete === "function") {
          onComplete("Finished loading fields data");
        }
      },
    });
  }

  // ============================================================================
  // AJAX FUNCTIONS - BARCODE VALIDATION
  // ============================================================================

  /**
   * Verifica si un código de barras ya existe en la base de datos
   * @param {object} ajaxParam - Parámetros AJAX adicionales
   * @param {string} method - Método HTTP a utilizar (GET/POST)
   * @param {function} onSuccess - Callback de éxito
   * @param {function} onError - Callback de error
   * @param {function} onComplete - Callback de finalización
   */
  function ajax_checkDuplicateBarcode(
    ajaxParam,
    method,
    onSuccess,
    onError,
    onComplete
  ) {
    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: method,
      data: ajaxParam,
      success: function (response) {
        if (typeof onSuccess === "function") {
          onSuccess(response);
        }
      },
      error: function (xhr, status, error) {
        if (typeof onError === "function") {
          onError(error);
        }
      },
      complete: function () {
        if (typeof onComplete === "function") {
          onComplete();
        }
      },
    });
  }

  // ============================================================================
  // AJAX FUNCTIONS - vFORM INTEGRATION
  // ============================================================================

  /**
   * Obtiene datos CSV desde vForm basado en tipo de registro
   * @param {object} ajaxParam - Parámetros que incluyen vform_record_type, vdata_site, vdata_year
   * @param {string} method - Método HTTP a utilizar (GET/POST)
   * @param {function} onSuccess - Callback de éxito
   * @param {function} onError - Callback de error
   * @param {function} onComplete - Callback de finalización
   */
  function ajax_getDataFrom_vFromRecordType(
    ajaxParam,
    method,
    onSuccess,
    onError,
    onComplete
  ) {
    // Validar parámetros requeridos
    if (!ajaxParam.vform_record_type || !ajaxParam.vdata_site || !ajaxParam.vdata_year) {
      if (typeof onError === "function") {
        onError("Parámetros requeridos faltantes");
      }

      return;
    }

    // Mostrar indicador de carga
    if (typeof window.showCSVLoadingIndicator === "function") {
      window.showCSVLoadingIndicator(true);
    }

    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: method,
      data: ajaxParam,
      dataType: RESPONSE_TYPES.JSON,
      success: function (response) {
        if (typeof onSuccess === "function") {
          onSuccess(response);
        }
      },
      error: function (xhr, status, error) {
        if (typeof onError === "function") {
          onError(error);
        }
      },
      complete: function () {
        if (typeof onComplete === "function") {
          onComplete();
        }
      },
    });
  }

  /**
   * Obtiene datos CSV desde vForm basado en tipo de registro para validar códigos de barras
   * @param {object} ajaxParam - Parámetros que incluyen recordType, site, year
   * @param {string} method - Método HTTP a utilizar (GET/POST)
   * @param {function} onSuccess - Callback de éxito
   * @param {function} onError - Callback de error
   * @param {function} onComplete - Callback de finalización
   */
  function ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode(
    ajaxParam,
    method,
    onSuccess,
    onError,
    onComplete
  ) {
    // Validar parámetros requeridos
    if (!ajaxParam.vform_record_type || !ajaxParam.vdata_site || !ajaxParam.vdata_year || !ajaxParam.barcode_Read) {
      console.error('Ajax: Missing required parameters for barcode validation:', ajaxParam);
      if (typeof onError === "function") {
        onError("Parámetros requeridos faltantes: vform_record_type, vdata_site, vdata_year, barcode_Read");
      }
      return;
    }

    console.log('Ajax: Validating barcode with parameters:', ajaxParam);

    $.ajax({
      url: orionDiscard.ajaxUrl,
      method: method, // POST para WordPress AJAX
      data: ajaxParam,
      dataType: RESPONSE_TYPES.JSON,
      success: function (response) {
        console.log('Ajax: Barcode validation response:', response);
        
        if (response.success && response.data) {
          if (typeof onSuccess === "function") {
            onSuccess(response.data);
          }
        } else {
          console.error('Ajax: Barcode validation failed:', response);
          if (typeof onError === "function") {
            onError(response.data?.message || response.message || "Error al validar código de barras");
          }
        }
      },
      error: function (xhr, status, error) {
        console.error('Ajax: Barcode validation AJAX error:', xhr.responseText, status, error);
        if (typeof onError === "function") {
          onError("Error de conexión al validar código de barras: " + error);
        }
      },
      complete: function () {
        console.log('Ajax: Barcode validation request completed');
        if( typeof onComplete === "function") {
            onComplete("Barcode validation request finished");
        }
      },
    });
  }

  // ============================================================================
  // GLOBAL EXPORTS
  // ============================================================================

  // Exponer funciones AJAX globalmente
  window.ajax_fetchOrionFieldsData = ajax_fetchOrionFieldsData;
  window.ajax_checkDuplicateBarcode = ajax_checkDuplicateBarcode;
  window.ajax_getDataFrom_vFromRecordType = ajax_getDataFrom_vFromRecordType;
  window.ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode =
    ajax_handle_get_data_from_vForm_recordType_To_ValidateBarCode;

  // Exponer enums globalmente
  window.HTTP_METHODS = HTTP_METHODS;
  window.CONTENT_TYPES = CONTENT_TYPES;
  window.RESPONSE_TYPES = RESPONSE_TYPES;
});
