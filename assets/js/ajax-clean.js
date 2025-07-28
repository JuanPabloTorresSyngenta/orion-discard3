jQuery(document).ready(function ($) {

    /**
     * Carga los datos de fincas desde la API de Orion
     * @param {string} site - El sitio para el cual cargar los datos (ej: "PRSA")
     * @param {function} onSuccess - Callback cuando los datos se cargan exitosamente
     * @param {function} onError - Callback cuando hay un error
     */
    function loadOrionFieldsData(site, onSuccess, onError) {
        // Agregar clase loading al dropdown de fincas
        $("#farms").addClass("loading");

        $.ajax({
            url: "http://192.168.96.84:8080/orion/wp-json/orion-maps-fields/v1/fields",
            method: "GET",
            data: { site: site },
            success: function (response) {
                
                if (response.success && response.data && response.data.fields) {
                    
                    // Llamar callback de éxito con los datos
                    if (typeof onSuccess === 'function') {
                        onSuccess(response.data.fields);
                    }
                } else {
                    
                    if (typeof onError === 'function') {
                        onError("Error al cargar los datos de las fincas");
                    }
                }
            },
            error: function (xhr, status, error) {
                
                if (typeof onError === 'function') {
                    onError("Error de conexión al cargar los datos");
                }
            },
            complete: function () {
                $("#farms").removeClass("loading");
            }
        });
    }

    /**
     * Verifica si un código de barras ya existe en la base de datos
     * @param {string} barcode - El código de barras a verificar
     * @param {function} callback - Función callback que recibe true si existe, false si no
     */
    function checkDuplicateBarcode(barcode, callback) {

        ajaxParam = {
            action: "check_duplicate_barcd",
            barcode: barcode,
            nonce: orionDiscard.nonce,
        }

        $.ajax({
            url: orionDiscard.ajaxUrl,
            method: "POST",
            data: ajaxParam,
            success: function (response) {
                callback(response.success ? response.data.exists : false);
            },
            error: function (xhr, status, error) {
                callback(false);
            }
        });
    }
    
    /**
     * Obtiene datos CSV desde vForm basado en tipo de registro
     * @param {string} recordType - Tipo de registro del formulario
     * @param {string} site - Sitio (ej: "PRSA")  
     * @param {string} year - Año para filtrar datos
     * @param {function} onSuccess - Callback de éxito
     * @param {function} onError - Callback de error
     */
    function getDataFrom_vFromRecordType(recordType, site, year, onSuccess, onError) {
        
        // Validar parámetros requeridos
        if (!recordType || !site || !year) {

            if (typeof onError === 'function') {
                onError("Parámetros requeridos faltantes");
            }

            return;
        }

        // Mostrar indicador de carga
        if (typeof window.showCSVLoadingIndicator === 'function') {
            window.showCSVLoadingIndicator(true);
        }

        const ajaxParams = {
            action: 'get_data_from_vForm_recordType', // ✅ Coincide con wp_ajax hook
            _ajax_nonce: orionDiscard.nonce,
            vform_record_type: recordType,
            vdata_site: site,
            vdata_year: year,
            fieldId: $('#fields').val(), // Obtener el ID del campo seleccionado
        };

        $.ajax({
            url: orionDiscard.ajaxUrl,
            method: 'POST', // ✅ Cambiar de GET a POST para WordPress AJAX
            data: ajaxParams,
            dataType: 'json',
            success: function(response) {
                
                if (response.success && response.data) {
                    
                    // Usar la nueva función de procesamiento de datos
                    if (typeof window.csvHandler !== 'undefined' && typeof window.csvHandler.processRetrievedData === 'function') {
                        window.csvHandler.processRetrievedData(response.data);
                    } else {
                        // Ejecutar callback de éxito como fallback
                        if (typeof onSuccess === 'function') {
                            onSuccess(response.data);
                        }
                    }

                } else {
                    
                    if (typeof onError === 'function') {
                        onError(response.message || 'Error al obtener datos CSV');
                    }
                }
            },
            error: function(xhr, status, error) {
                
                if (typeof onError === 'function') {
                    onError('Error de conexión al obtener datos CSV');
                }
            },
            complete: function() {
                // Ocultar indicador de carga
                if (typeof window.showCSVLoadingIndicator === 'function') {
                    window.showCSVLoadingIndicator(false);
                }
            }
        });
    }

    // Exponer funciones globalmente
    window.loadOrionFieldsData = loadOrionFieldsData;
    window.checkDuplicateBarcode = checkDuplicateBarcode;
    window.getDataFrom_vFromRecordType = getDataFrom_vFromRecordType;
});
