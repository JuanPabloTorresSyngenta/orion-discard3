jQuery(document).ready(function ($) {
  
  // ============================================================================
  // AJAX PARAMETER FACTORY
  // ============================================================================
  
  /**
   * Factory para crear parámetros AJAX consistentes
   * Centraliza la construcción de objetos de parámetros para peticiones AJAX
   */
  window.Factory = window.Factory || {};

  /**
   * Construye parámetros AJAX para descargar datos de dropdowns
   * @param {string} site - Código del sitio (ej: "PRSA")
   * @returns {object} Objeto con parámetros AJAX
   */
  window.Factory.BuildAjaxParamToDownloadDropdownsData = function (site) {
    // Validar parámetro requerido
    if (!site) {
      console.warn('Factory: site parameter is required');
      return null;
    }

    const ajaxParam = {
      site: site,
    };

    return ajaxParam;
  };

  /**
   * Construye parámetros AJAX para descargar datos de vForm por tipo de registro
   * @param {string} recordType - Tipo de registro del formulario
   * @param {string} site - Código del sitio
   * @param {string} year - Año para filtrar datos
   * @param {string} action - Acción WordPress AJAX
   * @returns {object} Objeto con parámetros AJAX
   */
  window.Factory.BuildAjaxParamToDownloadVFormRecordTypeData = function (
    recordType,
    site,
    year,
    action
  ) {
    // Validar parámetros requeridos
    if (!recordType || !site || !year || !action) {
      console.warn('Factory: recordType, site, year, and action parameters are required');
      return null;
    }

    // Validar que orionDiscard esté disponible
    if (typeof orionDiscard === 'undefined' || !orionDiscard.nonce) {
      console.error('Factory: orionDiscard object or nonce not available');
      return null;
    }

    const ajaxParams = {
      action: action, // ✅ Coincide con wp_ajax hook
      _ajax_nonce: orionDiscard.nonce,
      vform_record_type: recordType,
      vdata_site: site,
      vdata_year: year,
      fieldId: $("#fields").val() || '', // Obtener el ID del campo seleccionado
    };
    
    return ajaxParams;
  };

  /**
   * Construye parámetros AJAX para enviar datos de código de barras
   * @param {string} recordType - Tipo de registro del formulario
   * @param {string} site - Código del sitio
   * @param {string} year - Año para filtrar datos
   * @param {string} barcode - Código de barras a enviar
   * @param {string} action - Acción WordPress AJAX
   * @returns {object} Objeto con parámetros AJAX
   */
  window.Factory.BuildAjaxParamToSubmitBarcodeData = function (
    recordType,
    site,
    year,
    barcode,
    action
  ) {
    // Validar parámetros requeridos
    if (!recordType || !site || !year || !action) {
      console.warn('Factory: recordType, site, year, and action parameters are required');
      return null;
    }

    // Validar que orionDiscard esté disponible
    if (typeof orionDiscard === 'undefined' || !orionDiscard.nonce) {
      console.error('Factory: orionDiscard object or nonce not available');
      return null;
    }

    const ajaxParams = {
      action: action, // ✅ Coincide con wp_ajax hook
      _ajax_nonce: orionDiscard.nonce,
      vform_record_type: recordType,
      vdata_site: site,
      vdata_year: year,
      barcode: barcode || '', // Obtener el código escaneado
    };
    
    return ajaxParams;
  };

  /**
   * Construye parámetros AJAX para verificar códigos de barras duplicados
   * @param {string} barcode - Código de barras a verificar
   * @param {string} action - Acción WordPress AJAX (opcional, usa default)
   * @returns {object} Objeto con parámetros AJAX
   */
  window.Factory.BuildAjaxParamToCheckDuplicateBarcode = function (barcode, action = 'check_duplicate_barcode') {
    // Validar parámetro requerido
    if (!barcode) {
      console.warn('Factory: barcode parameter is required');
      return null;
    }

    // Validar que orionDiscard esté disponible
    if (typeof orionDiscard === 'undefined' || !orionDiscard.nonce) {
      console.error('Factory: orionDiscard object or nonce not available');
      return null;
    }

    const ajaxParams = {
      action: action,
      _ajax_nonce: orionDiscard.nonce,
      barcode: barcode,
    };
    
    return ajaxParams;
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Valida que todos los parámetros requeridos estén presentes
   * @param {object} params - Objeto con parámetros
   * @param {array} required - Array con nombres de parámetros requeridos
   * @returns {boolean} True si todos los parámetros están presentes
   */
  window.Factory.validateRequiredParams = function(params, required) {
    if (!params || !required) return false;
    
    for (let param of required) {
      if (!params[param]) {
        console.warn(`Factory: Missing required parameter: ${param}`);
        return false;
      }
    }
    
    return true;
  };

});
