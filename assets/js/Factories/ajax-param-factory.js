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
      console.log('Orion Discard Factory: Not on plugin page, exiting');
    }
    
    return isValid;
  }
  
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

  /**
   * Construye parámetros AJAX para validar y marcar código de barras como descartado
   * @param {string} site - Código del sitio
   * @param {string} year - Año para filtrar datos
   * @param {string} recordType - Tipo de registro del formulario
   * @param {string} barcode - Código de barras a validar
   * @returns {object} Objeto con parámetros AJAX
   */
  window.Factory.BuildAjaxParamToValidateBarcode = function (site, year, recordType, barcode) {
    // Validar parámetros requeridos
    if (!site || !year || !recordType || !barcode) {

      console.warn('Factory: site, year, recordType, and barcode parameters are required');

      return null;
    }

    // Validar que orionDiscard esté disponible
    if (typeof orionDiscard === 'undefined' || !orionDiscard.nonce) {
      console.error('Factory: orionDiscard object or nonce not available');
      return null;
    }

    const ajaxParams = {
      action: 'get_data_from_vForm_recordType_To_ValidateBarCode',
      _ajax_nonce: orionDiscard.nonce,
      vdata_site: site,
      vdata_year: year,
      vform_record_type: recordType,
      barcode_Read: barcode
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
