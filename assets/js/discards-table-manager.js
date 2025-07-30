/**
 * Discards Table Manager - Centralized DataTable Management
 * Single source of truth for all table operations in Orion Discard Plugin
 * 
 * CLEAN ARCHITECTURE:
 * - Simple and reliable initialization
 * - Clear status tracking with isReady flag
 * - Standard DataTables configuration
 * - Complete functionality with error handling
 */

jQuery(document).ready(function($) {
    'use strict';
    
    // Global table manager instance
    window.discardsTableManager = {
        table: null,
        isReady: false,
        
        /**
         * Initialize the DataTable
         * @returns {boolean} Success status
         */
        init: function() {
            console.log('TableManager: Starting initialization');
            
            // Check prerequisites
            if (!this.checkPrerequisites()) {
                return false;
            }
            
            // Clean up any existing table
            this.destroy();
            
            try {
                // Destroy any existing table first
                if ($.fn.DataTable.isDataTable('#discards-table')) {
                    $('#discards-table').DataTable().destroy();
                }
                
                // Create DataTable with configuration matching the HTML structure
                this.table = $('#discards-table').DataTable({
                    data: [], // Start empty
                    columns: [
                        { 
                            data: 'status', 
                            title: 'Estado',
                            className: 'text-center',
                            defaultContent: '❌',
                            width: '80px',
                            render: function(data, type, row) {
                                if (type === 'display') {
                                    if (data === '✅') {
                                        return '<span class="status-completed" title="Descartado">✅</span>';
                                    } else {
                                        return '<span class="status-pending" title="Pendiente">❌</span>';
                                    }
                                }
                                return data;
                            }
                        },
                        { data: 'field', title: 'Field', defaultContent: '', width: '120px' },
                        { data: 'range_val', title: 'Range', defaultContent: '', width: '100px' },
                        { data: 'row_val', title: 'Row', defaultContent: '', width: '80px' },
                        { data: 'plot_id', title: 'Plot ID', defaultContent: '', width: '100px' },
                        { data: 'subplot_id', title: 'Subplot ID', defaultContent: '', width: '120px' },
                        { data: 'matid', title: 'MATID', defaultContent: '', width: '120px' },
                        { data: 'barcd', title: 'Código', defaultContent: '', width: '150px' }
                    ],
                    pageLength: 25,
                    responsive: false, // ✅ CORRECCIÓN: Deshabilitar responsive para evitar conflictos
                    scrollX: false,    // ✅ CORRECCIÓN: Deshabilitar scroll horizontal
                    autoWidth: true,   // ✅ CORRECCIÓN: Permitir cálculo automático de anchos
                    fixedHeader: false, // ✅ CORRECCIÓN: Deshabilitar header fijo
                    ordering: true,     // ✅ CORRECCIÓN: Mantener ordenamiento habilitado
                    order: [[0, 'asc']], // ✅ CORRECCIÓN: Ordenar por primera columna por defecto
                    columnDefs: [       // ✅ CORRECCIÓN: Definir comportamiento de columnas
                        {
                            targets: 0, // Columna de Estado
                            orderable: true,
                            className: 'text-center'
                        },
                        {
                            targets: '_all', // Todas las demás columnas
                            orderable: true
                        }
                    ],
                    language: {
                        emptyTable: "No hay datos disponibles",
                        info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                        infoEmpty: "Mostrando 0 a 0 de 0 entradas",
                        infoFiltered: "(filtrado de _MAX_ entradas totales)",
                        lengthMenu: "Mostrar _MENU_ entradas",
                        loadingRecords: "Cargando...",
                        processing: "Procesando...",
                        search: "Buscar:",
                        zeroRecords: "No se encontraron registros",
                        paginate: {
                            first: "Primero",
                            last: "Último", 
                            next: "Siguiente",
                            previous: "Anterior"
                        }
                    },
                    createdRow: function(row, data) {
                        // ✅ CORRECCIÓN: Usar post_id como identificador principal
                        if (data.post_id) {
                            $(row).attr('data-record-id', data.post_id);
                            $(row).attr('data-post-id', data.post_id);
                        } else if (data.id) {
                            $(row).attr('data-record-id', data.id);
                        }
                        
                        if (data.barcd) {
                            $(row).attr('data-barcode', data.barcd);
                        }
                        
                        // Add CSS classes based on status
                        if (data.status === '✅') {
                            $(row).addClass('row-completed');
                        } else {
                            $(row).addClass('row-pending');
                        }
                    }
                });
                
                this.isReady = true;
                console.log('TableManager: Initialization successful');
                return true;
                
            } catch (error) {
                console.error('TableManager: Initialization failed:', error);
                this.table = null;
                this.isReady = false;
                return false;
            }
        },
        
        /**
         * Check if prerequisites are met for initialization
         * @returns {boolean} Prerequisites status
         */
        checkPrerequisites: function() {
            // Check jQuery
            if (typeof $ === 'undefined') {
                console.error('TableManager: jQuery not available');
                return false;
            }
            
            // Check DataTables
            if (!$.fn.DataTable) {
                console.error('TableManager: DataTables not available');
                return false;
            }
            
            // Check table element
            if ($('#discards-table').length === 0) {
                console.error('TableManager: Table element #discards-table not found');
                return false;
            }
            
            return true;
        },
        
        /**
         * Check if table manager is initialized and ready
         * @returns {boolean} Ready status
         */
        isInitialized: function() {
            return this.isReady && this.table !== null;
        },
        
        /**
         * Update table with new data
         * @param {Array} data Array of data objects
         * @returns {boolean} Success status
         */
        updateTableData: function(data) {
            if (!this.isInitialized()) {
                console.error('TableManager: Not initialized for data update');
                return false;
            }
            
            if (!Array.isArray(data)) {
                console.error('TableManager: Data must be an array');
                return false;
            }
            
            try {
                // Normalize data to ensure required fields
                const normalizedData = data.map(function(row, index) {
                    return {
                        // ✅ CORRECCIÓN: Preservar post_id como identificador principal
                        id: row.post_id || row.id || row.record_id || ('row_' + Date.now() + '_' + index),
                        post_id: row.post_id || row.id || row.record_id, // Mantener post_id explícitamente
                        status: row.status || '❌',
                        field: row.field || '',
                        range_val: row.range_val || row.range || '',
                        row_val: row.row_val || row.row || '',
                        plot_id: row.plot_id || '',
                        subplot_id: row.subplot_id || '',
                        matid: row.matid || '',
                        barcd: row.barcd || row.barcode || '',
                        // Preservar cualquier campo adicional que pueda venir del PHP
                        isDiscarded: row.isDiscarded || false
                    };
                });
                
                // Update table data
                this.table.clear().rows.add(normalizedData).draw();
                console.log('TableManager: Updated with ' + normalizedData.length + ' records');
                return true;
                
            } catch (error) {
                console.error('TableManager: Error updating data:', error);
                return false;
            }
        },
        
        /**
         * Clear all table data
         * @returns {boolean} Success status
         */
        clearTable: function() {
            if (!this.isInitialized()) {
                console.warn('TableManager: Not initialized for clearing');
                return false;
            }
            
            try {
                this.table.clear().draw();
                console.log('TableManager: Table cleared');
                return true;
            } catch (error) {
                console.error('TableManager: Error clearing table:', error);
                return false;
            }
        },
        
        /**
         * Update status of a specific row by barcode
         * @param {string} barcode Barcode to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatus: function(barcode, newStatus) {
            if (!this.isInitialized()) {
                console.warn('TableManager: Not initialized for status update');
                return false;
            }
            
            if (!barcode) {
                console.error('TableManager: Barcode is required for status update');
                return false;
            }
            
            try {
                let found = false;
                const status = newStatus || '✅';
                
                this.table.rows().every(function() {
                    const data = this.data();
                    const rowBarcode = String(data.barcd || '').trim();
                    const searchBarcode = String(barcode).trim();
                    
                    if (rowBarcode === searchBarcode) {
                        data.status = status;
                        this.data(data);
                        
                        // Update row classes
                        const $row = $(this.node());
                        $row.removeClass('row-completed row-pending');
                        if (status === '✅') {
                            $row.addClass('row-completed');
                        } else {
                            $row.addClass('row-pending');
                        }
                        
                        // Add highlight effect
                        $row.addClass('row-highlight');
                        setTimeout(function() {
                            $row.removeClass('row-highlight');
                        }, 2000);
                        
                        found = true;
                        return false; // Stop iteration
                    }
                });
                
                if (found) {
                    this.table.draw(false); // Redraw without changing pagination
                    console.log('TableManager: Updated status for barcode:', barcode, 'to', status);
                }
                
                return found;
            } catch (error) {
                console.error('TableManager: Error updating row status:', error);
                return false;
            }
        },
        
        /**
         * Update status of a specific row by ID
         * @param {string} recordId Record ID to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatusById: function(recordId, newStatus) {
            if (!this.isInitialized()) {
                console.warn('TableManager: Not initialized for status update');
                return false;
            }
            
            if (!recordId) {
                console.error('TableManager: Record ID is required for status update');
                return false;
            }
            
            console.log('TableManager: Searching for record ID:', recordId, 'to update status to:', newStatus);
            
            try {
                let found = false;
                const status = newStatus || '✅';
                
                this.table.rows().every(function() {
                    const data = this.data();
                    const dataId = String(data.id || '');
                    const dataPostId = String(data.post_id || '');
                    const searchId = String(recordId);
                    
                    console.log('TableManager: Row data debug:', {
                        'data.id': data.id,
                        'data.post_id': data.post_id,
                        'dataId': dataId,
                        'dataPostId': dataPostId,
                        'searchId': searchId,
                        'barcode': data.barcd
                    });
                    
                    // ✅ CORRECCIÓN: Buscar tanto por id como por post_id
                    if (dataId === searchId || dataPostId === searchId) {
                        console.log('TableManager: Found matching record by ID, updating status');
                        data.status = status;
                        this.data(data);
                        
                        // Update row classes
                        const $row = $(this.node());
                        $row.removeClass('row-completed row-pending');
                        if (status === '✅') {
                            $row.addClass('row-completed');
                        } else {
                            $row.addClass('row-pending');
                        }
                        
                        // Add highlight effect
                        $row.addClass('row-highlight');
                        setTimeout(function() {
                            $row.removeClass('row-highlight');
                        }, 2000);
                        
                        found = true;
                        return false; // Stop iteration
                    }
                });
                
                if (found) {
                    this.table.draw(false); // Redraw without changing pagination
                    console.log('TableManager: Successfully updated status for record ID:', recordId, 'to', status);
                } else {
                    console.warn('TableManager: Record ID not found:', recordId);
                }
                
                return found;
            } catch (error) {
                console.error('TableManager: Error updating row status by ID:', error);
                return false;
            }
        },
        
        /**
         * Get current table data
         * @returns {Array} Current data array
         */
        getData: function() {
            if (!this.isInitialized()) {
                return [];
            }
            
            try {
                return this.table.data().toArray();
            } catch (error) {
                console.error('TableManager: Error getting data:', error);
                return [];
            }
        },
        
        /**
         * Get table statistics
         * @returns {Object} Statistics object
         */
        getStatistics: function() {
            if (!this.isInitialized()) {
                return { total: 0, completed: 0, pending: 0 };
            }
            
            try {
                const data = this.table.data().toArray();
                const total = data.length;
                const completed = data.filter(row => row.status === '✅').length;
                const pending = total - completed;
                
                return { total, completed, pending };
            } catch (error) {
                console.error('TableManager: Error getting statistics:', error);
                return { total: 0, completed: 0, pending: 0 };
            }
        },
        
        /**
         * Search for records by barcode
         * @param {string} barcode Barcode to search for
         * @returns {Array} Matching records
         */
        findByBarcode: function(barcode) {
            if (!this.isInitialized()) {
                return [];
            }
            
            try {
                const data = this.table.data().toArray();
                return data.filter(row => 
                    String(row.barcd || '').trim() === String(barcode).trim()
                );
            } catch (error) {
                console.error('TableManager: Error finding by barcode:', error);
                return [];
            }
        },
        
        /**
         * Debug function: Log all post_ids in the table
         * @returns {Array} Array of post_ids
         */
        debugPostIds: function() {
            if (!this.isInitialized()) {
                console.log('❌ TableManager: Not initialized');
                return [];
            }
            
            try {
                const data = this.table.data().toArray();
                console.log('🔍 TableManager: Debugging post_ids in table:');
                
                const postIds = data.map((row, index) => {
                    const info = {
                        index: index,
                        id: row.id,
                        post_id: row.post_id,
                        barcode: row.barcd,
                        status: row.status
                    };
                    console.log(`  Row ${index}:`, info);
                    return info;
                });
                
                console.table(postIds);
                return postIds;
            } catch (error) {
                console.error('TableManager: Error debugging post_ids:', error);
                return [];
            }
        },
        
        /**
         * Destroy the table instance
         */
        destroy: function() {
            if (this.table) {
                try {
                    if ($.fn.DataTable.isDataTable('#discards-table')) {
                        this.table.destroy();
                        console.log('TableManager: Table destroyed');
                    }
                } catch (error) {
                    console.error('TableManager: Error destroying table:', error);
                }
            }
            
            this.table = null;
            this.isReady = false;
        },
        
        /**
         * Reinitialize the table
         * @returns {boolean} Success status
         */
        reinitialize: function() {
            console.log('TableManager: Reinitializing table');
            this.destroy();
            return this.init();
        }
    };
    
    console.log('TableManager: Module loaded and ready');
});