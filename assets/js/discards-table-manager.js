/**
 * Discards Table Manager - Centralized DataTable management
 * Single source of truth for all table operations
 */
jQuery(document).ready(function($) {
    window.discardsTableManager = {
        table: null,
        
        /**
         * Initialize the DataTable once
         */
        init: function() {
            if (!$.fn.DataTable) {
                console.error('DataTables library not loaded');
                return false;
            }
            
            if ($('#discards-table').length === 0) {
                console.warn('Table element #discards-table not found');
                return false;
            }

            // Destroy existing table if any
            if ($.fn.DataTable.isDataTable('#discards-table')) {
                $('#discards-table').DataTable().destroy();
            }

            try {
                this.table = $('#discards-table').DataTable({
                    data: [], // Start empty
                    columns: [
                        { 
                            data: 'status', 
                            title: 'Estado', 
                            className: 'text-center', 
                            defaultContent: '✗',
                            render: function(data, type, row) {
                                if (type === 'display') {
                                    if (data === '✅' || data === '✓') {
                                        return '<span class="status-completed" title="Descartado">✅</span>';
                                    } else {
                                        return '<span class="status-pending" title="Pendiente de descarte">✗</span>';
                                    }
                                }
                                return data;
                            }
                        },
                        { data: 'field', title: 'Field', defaultContent: '' },
                        { data: 'range_val', title: 'Range', defaultContent: '' },
                        { data: 'row_val', title: 'Row', defaultContent: '' },
                        { data: 'plot_id', title: 'Plot ID', defaultContent: '' },
                        { data: 'subplot_id', title: 'Subplot ID', defaultContent: '' },
                        { data: 'matid', title: 'MATID', defaultContent: '' }
                    ],
                    pageLength: 25,
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
                            previous: "Anterior"
                        }
                    }
                });
                
                console.log('DiscardsTableManager: Table initialized successfully');
                return true;
                
            } catch (error) {
                console.error('DiscardsTableManager: Error initializing table:', error);
                return false;
            }
        },

        /**
         * Update table with new data
         * @param {Array} data - Array of objects with table data
         */
        updateTableData: function(data) {
            if (!this.table) {
                console.warn('DiscardsTableManager: Table not initialized');
                return false;
            }

            if (!Array.isArray(data)) {
                console.error('DiscardsTableManager: Data must be an array');
                return false;
            }

            // Normalize data to ensure all required fields exist
            const normalizedData = data.map(row => ({
                status: row.status || '✗',
                field: row.field || '',
                range_val: row.range_val || row.range || '',
                row_val: row.row_val || row.row || '',
                plot_id: row.plot_id || '',
                subplot_id: row.subplot_id || '',
                matid: row.matid || ''
            }));

            try {
                this.table.clear().rows.add(normalizedData).draw();
                console.log(`DiscardsTableManager: Updated table with ${normalizedData.length} records`);
                return true;
            } catch (error) {
                console.error('DiscardsTableManager: Error updating table data:', error);
                return false;
            }
        },

        /**
         * Clear all table data
         */
        clearTable: function() {
            if (!this.table) {
                console.warn('DiscardsTableManager: Table not initialized');
                return false;
            }

            try {
                this.table.clear().draw();
                console.log('DiscardsTableManager: Table cleared');
                return true;
            } catch (error) {
                console.error('DiscardsTableManager: Error clearing table:', error);
                return false;
            }
        },

        /**
         * Find and update a specific row by barcode
         * @param {string} barcode - The barcode to search for
         * @param {string} newStatus - The new status to set
         */
        updateRowStatus: function(barcode, newStatus) {
            if (!this.table) {
                console.warn('DiscardsTableManager: Table not initialized');
                return false;
            }

            const tableData = this.table.data().toArray();
            let updated = false;

            tableData.forEach((row, index) => {
                if (row.barcd && String(row.barcd).trim().toLowerCase() === String(barcode).trim().toLowerCase()) {
                    row.status = newStatus || '✅';
                    this.table.row(index).data(row).draw(false);
                    
                    // Highlight the row temporarily
                    const $row = $(this.table.row(index).node());
                    if ($row.length > 0) {
                        $row.addClass('row-highlight');
                        setTimeout(() => {
                            $row.removeClass('row-highlight');
                        }, 2000);
                    }
                    
                    updated = true;
                }
            });

            if (updated) {
                console.log(`DiscardsTableManager: Updated status for barcode ${barcode}`);
            } else {
                console.warn(`DiscardsTableManager: Barcode ${barcode} not found in table`);
            }

            return updated;
        },

        /**
         * Get table data
         */
        getTableData: function() {
            if (!this.table) return [];
            return this.table.data().toArray();
        },

        /**
         * Check if table is initialized
         */
        isInitialized: function() {
            return this.table !== null;
        }
    };

    // Initialize the table when DOM is ready
    window.discardsTableManager.init();
});