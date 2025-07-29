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

    /**
     * Procesa el envío del formulario de descarte con validaciones mejoradas
     */
    function proceedWithSubmission() {
        const ajaxParam = {
            action: "submit_discard",
            nonce: orionDiscard.nonce,
            farm_id: $("#farms").val(),    
            section_id: $("#sections").val(),   
            field_id: $("#fields").val(),   
            scanned_code: $("#scanner-input").val(),
        };

        // Disable submit button
        $("#btn-submit").prop("disabled", true).text("Procesando...");

        $.ajax({
            url: orionDiscard.ajaxUrl,
            method: "POST",
            data: ajaxParam,
            dataType: 'json',
            success: function (response) {
                
                // Verificar estructura de respuesta válida
                if (typeof response === 'object' && response !== null) {
                    
                    if (response.success === true) {
                        // Éxito: Registro creado exitosamente
                        showMessage("Descarte registrado exitosamente", "success");
                        resetForm();
                        
                        // Refrescar tabla si existe
                        if (typeof refreshDataTable === 'function') {
                            refreshDataTable();
                        }
                        
                        // Limpiar campo de scanner para próximo escaneo
                        $("#scanner-input").val('').focus();
                        
                    } else {
                        // Error del servidor con mensaje específico
                        const errorMessage = response.data && response.data.message 
                            ? response.data.message 
                            : response.message || "Error desconocido del servidor";
                        
                        showMessage("Error al registrar el descarte: " + errorMessage, "error");
                        
                        // Si es error de duplicado, enfocar el campo scanner
                        if (errorMessage.toLowerCase().includes('duplicado') || 
                            errorMessage.toLowerCase().includes('existe')) {
                            $("#scanner-input").focus().select();
                        }
                    }
                    
                } else {
                    // Respuesta inválida del servidor
                    showMessage("Respuesta inválida del servidor", "error");
                }
            },
            error: function (xhr, status, error) {
                
                let errorMessage = "Error de conexión al enviar el formulario";
                
                // Analizar el tipo de error para dar feedback específico
                if (xhr.status === 0) {
                    errorMessage = "Sin conexión a internet. Verifique su conexión.";
                } else if (xhr.status === 403) {
                    errorMessage = "No tiene permisos para realizar esta acción.";
                } else if (xhr.status === 404) {
                    errorMessage = "Endpoint no encontrado. Contacte al administrador.";
                } else if (xhr.status === 500) {
                    errorMessage = "Error interno del servidor. Intente nuevamente.";
                } else if (xhr.status >= 400 && xhr.status < 500) {
                    errorMessage = "Error en la solicitud. Verifique los datos ingresados.";
                } else if (xhr.status >= 500) {
                    errorMessage = "Error del servidor. Contacte al administrador.";
                }
                
                showMessage(errorMessage, "error");
                
                // Log detallado para debugging
                console.error('Ajax submission error:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText,
                    error: error
                });
            },
            complete: function () {
                // Siempre restaurar el botón sin importar el resultado
                $("#btn-submit").prop("disabled", false).text("Submit");
            }
        });
    }

    // Exponer funciones globalmente
    window.loadOrionFieldsData = loadOrionFieldsData;
    window.checkDuplicateBarcode = checkDuplicateBarcode;
    window.getDataFrom_vFromRecordType = getDataFrom_vFromRecordType;
    window.proceedWithSubmission = proceedWithSubmission;
});
