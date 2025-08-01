/**
 * Discards Table Manager - Optimized DataTable Management
 * Centralized, efficient table operations with improved post_id handling
 * 
 * OPTIMIZED FEATURES:
 * - ES6 Class-based architecture for better organization
 * - Enhanced post_id tracking and barcode mapping
 * - Memory-efficient operations with caching
 * - Improved error handling and recovery
 * - Performance optimizations for large datasets
 */

jQuery(document).ready(function($) {
    'use strict';
    
    console.log('Table Manager: Initializing optimized manager');
    
    /**
     * Optimized Discards Table Manager Class
     * Handles all DataTable operations with enhanced efficiency
     */
    class DiscardsTableManager {
        constructor() {
            // Core state
            this.table = null;
            this.isReady = false;
            this.dataCache = new Map();
            this.barcodeIndex = new Map();
            this.postIdIndex = new Map();
            
            // Configuration
            this.config = {
                pageLength: 100,
                maxRecords: 50000,
                highlightDuration: 2000,
                searchDelay: 300,
                enableCache: true
            };
            
            // Performance tracking
            this.stats = {
                updateCount: 0,
                searchCount: 0,
                lastUpdate: null
            };
            
            // Bind methods
            this.updateRowStatus = this.updateRowStatus.bind(this);
            this.updateRowStatusById = this.updateRowStatusById.bind(this);
        }
        
        
        /**
         * Initialize the DataTable with optimized configuration
         * @returns {boolean} Success status
         */
        async init() {
            console.log('Table Manager: Starting optimized initialization');
            
            // Check prerequisites
            if (!this.checkPrerequisites()) {
                return false;
            }
            
            // Clean up any existing table
            this.destroy();
            
            try {
                // Destroy any existing DataTable instance
                if ($.fn.DataTable.isDataTable('#discards-table')) {
                    $('#discards-table').DataTable().destroy();
                }
                
                // Create optimized DataTable configuration
                const config = this.getOptimizedTableConfig();
                this.table = $('#discards-table').DataTable(config);
                
                // Initialize indexes
                this.initializeIndexes();
                
                this.isReady = true;
                this.stats.lastUpdate = new Date();
                
                console.log('Table Manager: Initialization successful');
                return true;
                
            } catch (error) {
                console.error('Table Manager: Initialization failed:', error);
                this.table = null;
                this.isReady = false;
                return false;
            }
        }
        
        /**
         * Get optimized DataTable configuration
         */
        getOptimizedTableConfig() {
            return {
                data: [], // Start empty
                columns: this.getColumnConfiguration(),
                pageLength: this.config.pageLength,
                responsive: true, // Enable responsive design
                scrollX: true, // Enable horizontal scroll when needed
                autoWidth: false, // Better control over column widths
                fixedHeader: false,
                ordering: true, // Enable sorting functionality
                order: [[0, 'asc']], // Default sort by first column
                columnDefs: [
                    {
                        targets: '_all',
                        orderable: true, // Enable sorting on all columns
                        className: 'text-center'
                    },
                    // Responsive priority for important columns
                    {
                        targets: [0, 1], // Status and Field columns
                        responsivePriority: 1 // Always visible
                    },
                    {
                        targets: [6], // MATID column
                        responsivePriority: 2 // High priority
                    },
                    {
                        targets: [2, 3, 4, 5], // Range, Row, Plot ID, Subplot ID
                        responsivePriority: 3 // Medium priority
                    }
                ],
                language: this.getLanguageConfig(),
                createdRow: (row, data) => this.onRowCreated(row, data),
                drawCallback: () => this.onTableDraw(),
                // Performance optimizations
                deferRender: true,
                processing: true,
                stateSave: false // Disable state saving for better performance
            };
        }
        
        /**
         * Get column configuration with enhanced rendering and responsive design
         */
        getColumnConfiguration() {
            return [
                { 
                    data: 'status', 
                    title: 'Status',
                    className: 'text-center status-column',
                    defaultContent: '❌',
                    width: '60px',
                    responsivePriority: 1, // Always visible
                    render: (data, type, row) => this.renderStatusColumn(data, type, row)
                },
                { 
                    data: 'field', 
                    title: 'Field',
                    className: 'text-center', 
                    defaultContent: '', 
                    width: '100px',
                    responsivePriority: 1, // Always visible
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'range_val', 
                    title: 'Range',
                    className: 'text-center', 
                    defaultContent: '', 
                    width: '80px',
                    responsivePriority: 3, // Medium priority
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'row_val', 
                    title: 'Row',
                    className: 'text-center', 
                    defaultContent: '', 
                    width: '60px',
                    responsivePriority: 3, // Medium priority
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'plot_id', 
                    title: 'Plot ID',
                    className: 'text-center', 
                    defaultContent: '', 
                    width: '80px',
                    responsivePriority: 4, // Lower priority
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'subplot_id', 
                    title: 'Subplot ID',
                    className: 'text-center', 
                    defaultContent: '', 
                    width: '100px',
                    responsivePriority: 4, // Lower priority
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'matid', 
                    title: 'MATID',
                    className: 'text-center', 
                    defaultContent: '', 
                    width: '100px',
                    responsivePriority: 2, // High priority
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'barcd', 
                    title: 'Código', 
                    defaultContent: '', 
                    visible: false,  // Hide barcode column from users
                    searchable: false,  // Don't include in search
                    orderable: false,   // Don't allow sorting
                    className: 'barcode-internal',
                    render: (data, type, row) => {
                        // Keep data available for internal processing
                        return type === 'display' ? '' : data;
                    }
                },
                // Hidden post_id column for internal scanner functionality
                { 
                    data: 'post_id', 
                    title: 'Post ID', 
                    defaultContent: '', 
                    visible: false,  // Hide from users - internal use only
                    searchable: false,
                    orderable: false,
                    className: 'post-id-internal'
                },
                // Hidden id column for internal reference
                { 
                    data: 'id', 
                    title: 'ID', 
                    defaultContent: '', 
                    visible: false,  // Hide from users - internal use only
                    searchable: false,
                    orderable: false,
                    className: 'id-internal'
                }
            ];
        }
        
        /**
         * Enhanced status column rendering with pre-discarded handling
         */
        renderStatusColumn(data, type, row) {
            if (type === 'display') {

                const isCompleted = data === '✅';

                const isPreDiscarded = row._wasPreDiscarded || row.isDiscarded;

                const icon = isCompleted ? '✅' : '❌';
                
                // Enhanced title with pre-discarded information
                let title = isCompleted ? 'Discarded' : 'Pending';

                if (isCompleted && isPreDiscarded) {

                    title = 'Already discarded previously';

                }
                
                const cssClass = isCompleted ? 'status-completed' : 'status-pending';

                const preDiscardedClass = isPreDiscarded ? ' status-pre-discarded' : '';
                
                return `<span class="${cssClass}${preDiscardedClass}" title="${title}" data-post-id="${row.post_id || row.id}" data-pre-discarded="${isPreDiscarded}">${icon}</span>`;
            }
            return data;
        }
        
        /**
         * Enhanced barcode column rendering - DEPRECATED
         * NOTE: Barcode column is now hidden from users (visible: false)
         * This function is kept for compatibility but not actively used
         */
        renderBarcodeColumn(data, type, row) {
            // This function is no longer used since barcode column is hidden
            // Kept for backwards compatibility only
            if (type === 'display' && data) {
                return `<span class="barcode-value" data-barcode="${this.escapeHtml(data)}" data-post-id="${row.post_id || row.id}">${this.escapeHtml(data)}</span>`;
            }
            return data || '';
        }
        
        /**
         * Get language configuration
         */
        getLanguageConfig() {
            return {
                emptyTable: "No data available",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)",
                lengthMenu: "Show _MENU_ entries",
                loadingRecords: "Loading...",
                processing: "Processing...",
                search: "Search:",
                zeroRecords: "No records found",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            };
        }
        
        /**
         * Enhanced row creation with proper indexing and pre-discarded handling
         */
        onRowCreated(row, data) {

            const postId = data.post_id || data.id;

            const barcode = data.barcd;

            const isPreDiscarded = data._wasPreDiscarded || data.isDiscarded;
            
            // Set data attributes for enhanced tracking
            if (postId) {
                $(row).attr('data-post-id', postId);

                $(row).attr('data-record-id', postId);
            }
            
            if (barcode) {
                $(row).attr('data-barcode', barcode);
            }
            
            // Mark pre-discarded materials
            if (isPreDiscarded) {
                $(row).attr('data-pre-discarded', 'true');
            }
            
            // Add CSS classes based on status - handle pre-discarded materials
            const statusClass = data.status === '✅' ? 'row-completed' : 'row-pending';
            $(row).addClass(statusClass);
            
            // Add special class for pre-discarded materials
            if (isPreDiscarded) {
                $(row).addClass('row-pre-discarded');
            }
            
            // Update indexes if enabled - with normalized barcode keys
            if (this.config.enableCache && postId) {

                this.postIdIndex.set(String(postId), data);

                if (barcode) {
                    // Store barcode with normalized key for consistent lookup
                    const normalizedBarcode = String(barcode).trim().toUpperCase();

                    this.barcodeIndex.set(normalizedBarcode, postId);
                }
            }
        }
        
        /**
         * Handle table draw events
         */
        onTableDraw() {
            // Update statistics
            this.updateStatistics();
            
            // Performance logging
            if (this.stats.updateCount % 10 === 0) {

                console.log('Table Manager: Performance stats:', this.getPerformanceStats());
            }
        }
        
        /**
         * Initialize or rebuild indexes for fast lookups with normalized barcodes
         */
        initializeIndexes() {
            if (!this.config.enableCache) return;
            
            console.log('Table Manager: Initializing indexes with normalized barcodes');
            
            this.dataCache.clear();

            this.barcodeIndex.clear();

            this.postIdIndex.clear();
            
            // Build indexes from current data
            if (this.table) {

                const self = this; // Store reference to class instance

                this.table.rows().every(function() {

                    const data = this.data();

                    const postId = data.post_id || data.id;

                    const barcode = data.barcd;
                    
                    if (postId) {

                        self.postIdIndex.set(String(postId), data);

                        if (barcode) {

                            // Store barcode with normalized key for consistent lookup
                            const normalizedBarcode = String(barcode).trim().toUpperCase();
                            
                            self.barcodeIndex.set(normalizedBarcode, postId);
                        }
                    }
                });
            }
            
            console.log('Table Manager: Indexes built with normalized keys -', 
                       `PostIDs: ${this.postIdIndex.size}, Barcodes: ${this.barcodeIndex.size}`);
        }
        
        
        /**
         * Check if prerequisites are met for initialization
         * @returns {boolean} Prerequisites status
         */
        checkPrerequisites() {
            // Check jQuery
            if (typeof $ === 'undefined') {
                console.error('Table Manager: jQuery not available');
                return false;
            }
            
            // Check DataTables
            if (!$.fn.DataTable) {
                console.error('Table Manager: DataTables not available');
                return false;
            }
            
            // Check table element
            if ($('#discards-table').length === 0) {
                console.error('Table Manager: Table element #discards-table not found');
                return false;
            }
            
            return true;
        }
        
        /**
         * Check if table manager is initialized and ready
         * @returns {boolean} Ready status
         */
        isInitialized() {
            return this.isReady && this.table !== null;
        }
        
        /**
         * Update table with new data using optimized processing
         * @param {Array} data Array of data objects
         * @returns {boolean} Success status
         */
        updateTableData(data) {
            console.log('🚀 Table Manager: ===== STARTING updateTableData =====');
            console.log('Table Manager: updateTableData called with data:', data?.length || 0, 'records');
            console.log('Table Manager: Initialization status:', this.isInitialized());
            console.log('Table Manager: Data type check:', Array.isArray(data), typeof data);
            
            // Basic validation checks
            if (!this.isInitialized()) {
                console.error('❌ Table Manager: Not initialized for data update');
                console.error('Table Manager: isReady:', this.isReady, 'table:', this.table !== null);
                return false;
            }
            
            if (!Array.isArray(data)) {
                console.error('❌ Table Manager: Data must be an array, received:', typeof data);
                console.error('Table Manager: Data sample:', data);
                return false;
            }
            
            if (data.length === 0) {
                console.warn('Table Manager: Empty data array received');
                try {
                    this.table.clear().draw();
                    this.clearIndexes();
                    console.log('Table Manager: Table cleared for empty data');
                    return true;
                } catch (error) {
                    console.error('Table Manager: Error clearing table for empty data:', error);
                    return false;
                }
            }
            
            try {
                console.log('Table Manager: Starting data update...');
                console.log('Table Manager: About to normalize data...');
                
                // Normalize data
                const normalizedData = this.normalizeTableData(data);
                console.log('🔍 Table Manager: normalizeTableData returned:', normalizedData?.length, 'records');
                
                if (!normalizedData || normalizedData.length === 0) {
                    console.error('❌ Table Manager: Data normalization failed');
                    console.error('Table Manager: normalizedData is null/undefined:', normalizedData === null || normalizedData === undefined);
                    console.error('Table Manager: normalizedData length is 0:', normalizedData?.length === 0);
                    console.error('Table Manager: Original data length:', data.length);
                    return false;
                }
                
                console.log('Table Manager: About to clear and update table...');
                
                // Clear and update table
                this.table.clear();
                this.table.rows.add(normalizedData);
                this.table.draw();
                
                console.log('Table Manager: Table operations completed, rebuilding indexes...');
                
                // Rebuild indexes
                this.initializeIndexes();
                
                // Update stats
                this.stats.updateCount++;
                this.stats.lastUpdate = new Date();
                
                console.log('✅ Table Manager: Update completed successfully with', normalizedData.length, 'records');
                console.log('🏁 Table Manager: ===== ENDING updateTableData SUCCESS =====');
                return true;
                
            } catch (error) {
                console.error('❌ Table Manager: Error updating data:', error);
                console.error('🏁 Table Manager: ===== ENDING updateTableData ERROR =====');
                
                // Try to recover
                try {
                    this.table.clear().draw();
                    this.clearIndexes();
                } catch (recoveryError) {
                    console.error('Table Manager: Recovery failed:', recoveryError);
                }
                
                return false;
            }
        }
        
        /**
         * Normalize table data with enhanced post_id preservation and pre-discarded handling
         */
        normalizeTableData(data) {
            if (!Array.isArray(data)) {
                console.error('Table Manager: normalizeTableData - data is not an array');
                console.error('Table Manager: Received data type:', typeof data, data);
                return [];
            }
            
            console.log('Table Manager: Normalizing', data.length, 'records');
            console.log('Table Manager: Sample data for normalization:', data.slice(0, 2));
            
            try {
                console.log('🔄 Table Manager: Starting data.map() normalization...');
                const normalizedData = data.map((row, index) => {
                    try {
                        // Validate row
                        if (!row || typeof row !== 'object') {
                            console.warn(`Table Manager: Invalid row at index ${index}:`, row);
                            return this.createDefaultRow(index);
                        }
                        
                        // Enhanced post_id handling - preserve original post_id
                        const postId = row.post_id || row.id || row.record_id || `row_${Date.now()}_${index}`;
                        
                        // IMPORTANT: Handle pre-discarded materials
                        // If isDiscarded is true, set status to ✅ immediately
                        const isAlreadyDiscarded = row.isDiscarded === true || row.isDiscarded === 'true' || row.isDiscarded === 1;
                        const recordStatus = isAlreadyDiscarded ? '✅' : (row.status || '❌');
                        
                        // Create normalized record with safe string conversion
                        const normalizedRow = {
                            // Primary identifiers
                            id: String(postId || `row_${index}`),
                            post_id: String(row.post_id || postId), // Always preserve post_id
                            
                            // Status and core fields - handle pre-discarded materials
                            status: String(recordStatus), // Set ✅ for already discarded materials
                            field: this.safeString(row.field),
                            range_val: this.safeString(row.range_val || row.range),
                            row_val: this.safeString(row.row_val || row.row),
                            plot_id: this.safeString(row.plot_id),
                            subplot_id: this.safeString(row.subplot_id),
                            matid: this.safeString(row.matid),
                            barcd: this.safeString(row.barcd || row.barcode),
                            
                            // Additional metadata
                            isDiscarded: Boolean(isAlreadyDiscarded), // Preserve discarded state
                            _originalData: this.config.enableCache ? row : null,
                            _wasPreDiscarded: Boolean(isAlreadyDiscarded) // Flag for pre-discarded materials
                        };
                        
                        // Validate normalized row
                        if (!normalizedRow.id || !normalizedRow.post_id) {
                            console.warn(`Table Manager: Row ${index} missing required identifiers`, normalizedRow);
                            normalizedRow.id = normalizedRow.id || `fallback_${index}`;
                            normalizedRow.post_id = normalizedRow.post_id || normalizedRow.id;
                        }
                        
                        return normalizedRow;
                    } catch (rowError) {
                        console.error(`❌ Table Manager: Error processing row ${index}:`, rowError);
                        console.error(`Table Manager: Problematic row data:`, row);
                        return this.createDefaultRow(index);
                    }
                });
                
                console.log('✅ Table Manager: data.map() completed, got', normalizedData.length, 'records');
                console.log('Table Manager: Normalization completed successfully');
                console.log('Table Manager: Returning', normalizedData.length, 'normalized records');
                return normalizedData;
                
            } catch (error) {
                console.error('❌ Table Manager: CRITICAL - Error in normalizeTableData:', error);
                console.error('Table Manager: Error type:', error.name);
                console.error('Table Manager: Error message:', error.message);
                console.error('Table Manager: Error stack:', error.stack);
                console.error('Table Manager: Data length at error:', data?.length);
                console.error('Table Manager: First 3 data items:', data?.slice(0, 3));
                console.error('🚨 Table Manager: Returning empty array due to error');
                return [];
            }
        }
        
        /**
         * Safely convert value to string
         */
        safeString(value) {
            try {
                if (value === null || value === undefined) return '';
                if (typeof value === 'string') return value.trim();
                if (typeof value === 'number') return String(value);
                if (typeof value === 'boolean') return String(value);
                return String(value).trim();
            } catch (error) {
                console.warn('Table Manager: safeString conversion error for value:', value, error);
                return '';
            }
        }
        
        /**
         * Create a default row for invalid data
         */
        createDefaultRow(index) {
            try {
                const timestamp = Date.now();
                const defaultRow = {
                    id: `default_${timestamp}_${index}`,
                    post_id: `default_${timestamp}_${index}`,
                    status: '❌',
                    field: '',
                    range_val: '',
                    row_val: '',
                    plot_id: '',
                    subplot_id: '',
                    matid: '',
                    barcd: '',
                    isDiscarded: false,
                    _originalData: null,
                    _wasPreDiscarded: false
                };
                console.log('Table Manager: Created default row for index', index);
                return defaultRow;
            } catch (error) {
                console.error('Table Manager: Error creating default row:', error);
                return {
                    id: `fallback_${index}`,
                    post_id: `fallback_${index}`,
                    status: '❌',
                    field: '',
                    range_val: '',
                    row_val: '',
                    plot_id: '',
                    subplot_id: '',
                    matid: '',
                    barcd: '',
                    isDiscarded: false,
                    _originalData: null,
                    _wasPreDiscarded: false
                };
            }
        }
        
        /**
         * Clear all table data efficiently
         * @returns {boolean} Success status
         */
        clearTable() {
            if (!this.isInitialized()) {
                console.warn('Table Manager: Not initialized for clearing');
                return false;
            }
            
            try {
                this.table.clear().draw();
                this.clearIndexes();
                
                console.log('Table Manager: Table cleared successfully');
                return true;
            } catch (error) {
                console.error('Table Manager: Error clearing table:', error);
                return false;
            }
        }
        
        /**
         * Optimized row status update by barcode with enhanced post_id tracking
         * @param {string} barcode Barcode to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatus(barcode, newStatus = '✅') {
            if (!this.isInitialized()) {
                console.warn('Table Manager: Not initialized for status update');
                return false;
            }
            
            if (!barcode) {
                console.error('Table Manager: Barcode is required for status update');
                return false;
            }
            
            console.log('Table Manager: Updating status by barcode:', barcode, 'to:', newStatus);
            
            try {
                // Use index for fast lookup if available
                if (this.config.enableCache && this.barcodeIndex.has(String(barcode))) {
                    const postId = this.barcodeIndex.get(String(barcode));
                    return this.updateRowStatusById(postId, newStatus);
                }
                
                // Fallback to row iteration
                return this.updateRowStatusByIteration('barcd', barcode, newStatus);
                
            } catch (error) {
                console.error('Table Manager: Error updating row status by barcode:', error);
                return false;
            }
        }
        
        /**
         * Update row status by barcode - ENHANCED VERSION with detailed logging
         * @param {string} barcode Barcode to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatusByBarcode(barcode, newStatus = '✅') {
            if (!this.isInitialized()) {
                console.warn('Table Manager: Not initialized for status update');
                return false;
            }
            
            if (!barcode) {
                console.error('Table Manager: Barcode is required for status update');
                return false;
            }
            
            // Normalize barcode for comparison
            const normalizedBarcode = String(barcode).trim().toUpperCase();
            console.log('🔍 Table Manager: ===== BARCODE SEARCH STARTED =====');
            console.log('Table Manager: Searching for barcode:', normalizedBarcode);
            console.log('Table Manager: Original barcode input:', barcode);
            console.log('Table Manager: Target status:', newStatus);
            
            try {
                // Strategy 1: Use index for fast lookup if available
                if (this.config.enableCache && this.barcodeIndex.has(normalizedBarcode)) {
                    const postId = this.barcodeIndex.get(normalizedBarcode);
                    console.log('✅ Table Manager: Found barcode in cache, post_id:', postId);
                    
                    // Update cache
                    if (this.postIdIndex.has(String(postId))) {
                        const cachedData = this.postIdIndex.get(String(postId));
                        cachedData.status = newStatus;
                        this.postIdIndex.set(String(postId), cachedData);
                        console.log('Table Manager: Cache updated for post_id:', postId);
                    }
                    
                    // Continue with DataTable update
                } else {
                    console.log('⚠️ Table Manager: Barcode not found in cache, using iteration search');
                    console.log('Table Manager: Cache enabled:', this.config.enableCache);
                    console.log('Table Manager: Cache size:', this.barcodeIndex.size);
                    
                    // Debug cache contents
                    if (this.barcodeIndex.size > 0) {
                        console.log('Table Manager: Sample cached barcodes:', 
                            Array.from(this.barcodeIndex.keys()).slice(0, 5));
                    }
                }
                
                // Strategy 2: Enhanced DataTable iteration with multiple comparison methods
                const result = this.updateRowStatusByBarcodeIteration(normalizedBarcode, newStatus);
                
                if (result) {
                    console.log('✅ Table Manager: ===== BARCODE SEARCH SUCCESS =====');
                } else {
                    console.log('❌ Table Manager: ===== BARCODE SEARCH FAILED =====');
                    // Strategy 3: DOM attribute fallback search
                    console.log('🔄 Table Manager: Attempting DOM attribute search as fallback...');
                    const domResult = this.updateRowStatusByDOMSearch(normalizedBarcode, newStatus);
                    
                    if (domResult) {
                        console.log('✅ Table Manager: DOM search successful');
                        return true;
                    } else {
                        console.log('❌ Table Manager: All search strategies failed');
                        this.debugBarcodeSearch(normalizedBarcode);
                    }
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Table Manager: Error updating row status by barcode:', error);
                console.log('🔚 Table Manager: ===== BARCODE SEARCH ERROR =====');
                return false;
            }
        }

        /**
         * Enhanced row status update by post_id with fast lookup
         * @param {string} recordId Record ID (post_id) to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatusById(recordId, newStatus = '✅') {
            if (!this.isInitialized()) {
                console.warn('Table Manager: Not initialized for status update');
                return false;
            }
            
            if (!recordId) {
                console.error('Table Manager: Record ID is required for status update');
                return false;
            }
            
            console.log('Table Manager: Updating status by post_id:', recordId, 'to:', newStatus);
            
            try {
                // Use index for fast lookup if available
                if (this.config.enableCache && this.postIdIndex.has(String(recordId))) {
                    const cachedData = this.postIdIndex.get(String(recordId));
                    console.log('Table Manager: Found cached data for post_id:', recordId, cachedData);
                    
                    // Update cached data
                    cachedData.status = newStatus;
                    this.postIdIndex.set(String(recordId), cachedData);
                }
                
                // Update in DataTable
                return this.updateRowStatusByIteration('post_id', recordId, newStatus, 'id');
                
            } catch (error) {
                console.error('Table Manager: Error updating row status by ID:', error);
                return false;
            }
        }
        
        /**
         * Enhanced barcode iteration search with detailed logging
         * @param {string} normalizedBarcode Normalized barcode to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatusByBarcodeIteration(normalizedBarcode, newStatus) {
            let found = false;
            let rowsChecked = 0;
            
            console.log('🔄 Table Manager: Starting DataTable iteration search...');
            
            this.table.rows().every(function() {
                rowsChecked++;
                const data = this.data();
                
                // Multiple barcode field checks with normalization
                const barcodeFields = [
                    data.barcd,
                    data.barcode,
                    data.code,
                    data.material_code
                ];
                
                const normalizedFields = barcodeFields.map(field => 
                    field ? String(field).trim().toUpperCase() : ''
                ).filter(field => field.length > 0);
                
                // Detailed logging for first few rows
                if (rowsChecked <= 3) {
                    console.log(`Table Manager: Row ${rowsChecked} check:`, {
                        post_id: data.post_id,
                        id: data.id,
                        barcd: data.barcd,
                        normalizedFields: normalizedFields,
                        searchTarget: normalizedBarcode
                    });
                }
                
                // Check if any normalized field matches
                const isMatch = normalizedFields.some(field => field === normalizedBarcode);
                
                if (isMatch) {
                    console.log('🎯 Table Manager: MATCH FOUND! Updating row...');
                    console.log('Table Manager: Match details:', {
                        post_id: data.post_id,
                        id: data.id,
                        matched_field: normalizedFields.find(field => field === normalizedBarcode),
                        original_barcd: data.barcd,
                        row_number: rowsChecked
                    });
                    
                    // Update row data
                    data.status = newStatus;
                    this.data(data);
                    
                    // Update row visual state
                    const $row = $(this.node());
                    $row.removeClass('row-completed row-pending');
                    $row.addClass(newStatus === '✅' ? 'row-completed' : 'row-pending');
                    
                    // Add highlight effect
                    $row.addClass('row-highlight');
                    setTimeout(() => $row.removeClass('row-highlight'), 
                             window.discardsTableManager.config.highlightDuration);
                    
                    found = true;
                    return false; // Stop iteration
                }
                
                return true; // Continue iteration
            });
            
            console.log(`Table Manager: Iteration complete. Checked ${rowsChecked} rows, found: ${found}`);
            
            if (found) {
                this.table.draw(false); // Redraw without changing pagination
                this.stats.searchCount++;
            }
            
            return found;
        }
        
        /**
         * DOM attribute search fallback method
         * @param {string} normalizedBarcode Normalized barcode to search for
         * @param {string} newStatus New status to set
         * @returns {boolean} Success status
         */
        updateRowStatusByDOMSearch(normalizedBarcode, newStatus) {
            console.log('🔍 Table Manager: Starting DOM attribute search...');
            
            try {
                // Search for row with matching data-barcode attribute
                const $targetRow = $('#discards-table tbody tr').filter(function() {
                    const rowBarcode = $(this).attr('data-barcode');
                    return rowBarcode && String(rowBarcode).trim().toUpperCase() === normalizedBarcode;
                });
                
                console.log('Table Manager: DOM search found rows:', $targetRow.length);
                
                if ($targetRow.length > 0) {
                    const postId = $targetRow.attr('data-post-id');
                    console.log('Table Manager: Found row via DOM search, post_id:', postId);
                    
                    // Update the row using post_id
                    if (postId) {
                        return this.updateRowStatusById(postId, newStatus);
                    }
                }
                
                return false;
            } catch (error) {
                console.error('Table Manager: Error in DOM search:', error);
                return false;
            }
        }
        
        /**
         * Debug barcode search with comprehensive analysis
         * @param {string} searchBarcode The barcode that was searched for
         */
        debugBarcodeSearch(searchBarcode) {
            console.group('🔍 Table Manager: BARCODE SEARCH DEBUG');
            console.log('🎯 Search target:', searchBarcode);
            
            // Analyze table data
            const data = this.getData();
            console.log('📊 Total records in table:', data.length);
            
            // Analyze barcode field presence
            const barcodeAnalysis = data.map((row, index) => ({
                index: index,
                post_id: row.post_id,
                barcd: row.barcd,
                barcd_length: row.barcd ? row.barcd.length : 0,
                barcd_normalized: row.barcd ? String(row.barcd).trim().toUpperCase() : '',
                exact_match: row.barcd ? String(row.barcd).trim().toUpperCase() === searchBarcode : false
            }));
            
            const nonEmptyBarcodes = barcodeAnalysis.filter(item => item.barcd);
            console.log('📋 Records with barcodes:', nonEmptyBarcodes.length);
            console.log('📋 Records without barcodes:', data.length - nonEmptyBarcodes.length);
            
            // Show sample barcodes
            console.log('📝 Sample barcodes (first 10):');
            console.table(barcodeAnalysis.slice(0, 10));
            
            // Check for partial matches
            const partialMatches = barcodeAnalysis.filter(item => 
                item.barcd_normalized.includes(searchBarcode) || 
                searchBarcode.includes(item.barcd_normalized)
            );
            
            if (partialMatches.length > 0) {
                console.log('🔍 Partial matches found:', partialMatches.length);
                console.table(partialMatches);
            }
            
            // Check DOM attributes
            const $rows = $('#discards-table tbody tr');
            const domBarcodes = [];
            $rows.each(function(index) {
                const barcode = $(this).attr('data-barcode');
                if (barcode && index < 10) { // First 10 only
                    domBarcodes.push({
                        index: index,
                        post_id: $(this).attr('data-post-id'),
                        dom_barcode: barcode,
                        normalized: String(barcode).trim().toUpperCase(),
                        matches: String(barcode).trim().toUpperCase() === searchBarcode
                    });
                }
            });
            
            console.log('🏷️ DOM attribute analysis (first 10):');
            console.table(domBarcodes);
            
            // Cache analysis
            console.log('💾 Cache analysis:');
            console.log('Cache enabled:', this.config.enableCache);
            console.log('Barcode index size:', this.barcodeIndex.size);
            console.log('PostID index size:', this.postIdIndex.size);
            
            if (this.barcodeIndex.size > 0) {
                const cacheKeys = Array.from(this.barcodeIndex.keys()).slice(0, 10);
                console.log('Sample cache keys:', cacheKeys);
                console.log('Search target in cache:', this.barcodeIndex.has(searchBarcode));
            }
            
            console.groupEnd();
        }
        
        /**
         * Internal method for row status update by iteration
         * @param {string} searchField Field to search in
         * @param {string} searchValue Value to search for
         * @param {string} newStatus New status to set
         * @param {string} fallbackField Alternative field to search
         * @returns {boolean} Success status
         */
        updateRowStatusByIteration(searchField, searchValue, newStatus, fallbackField = null) {
            let found = false;
            const searchStr = String(searchValue).trim();
            
            this.table.rows().every(function() {
                const data = this.data();
                const primaryValue = String(data[searchField] || '').trim();
                const fallbackValue = fallbackField ? String(data[fallbackField] || '').trim() : '';
                
                // Enhanced matching logic
                if (primaryValue === searchStr || (fallbackField && fallbackValue === searchStr)) {
                    console.log('Table Manager: Found matching record, updating status');
                    console.log('Table Manager: Match details:', {
                        searchField,
                        searchValue: searchStr,
                        primaryValue,
                        fallbackValue,
                        post_id: data.post_id,
                        id: data.id,
                        barcode: data.barcd
                    });
                    
                    // Update row data
                    data.status = newStatus;
                    this.data(data);
                    
                    // Update row visual state
                    const $row = $(this.node());
                    $row.removeClass('row-completed row-pending');
                    $row.addClass(newStatus === '✅' ? 'row-completed' : 'row-pending');
                    
                    // Add highlight effect
                    $row.addClass('row-highlight');
                    setTimeout(() => $row.removeClass('row-highlight'), 
                             window.discardsTableManager.config.highlightDuration);
                    
                    found = true;
                    return false; // Stop iteration
                }
            });
            
            if (found) {
                this.table.draw(false); // Redraw without changing pagination
                this.stats.searchCount++;
                console.log('Table Manager: Successfully updated status for', searchField, ':', searchValue, 'to', newStatus);
            } else {
                console.warn('Table Manager: Record not found for', searchField, ':', searchValue);
                this.debugTableData(searchField, searchValue);
            }
            
            return found;
        }
        
        
        /**
         * Get current table data efficiently
         * @returns {Array} Current data array
         */
        getData() {
            if (!this.isInitialized()) {
                return [];
            }
            
            try {
                return this.table.data().toArray();
            } catch (error) {
                console.error('Table Manager: Error getting data:', error);
                return [];
            }
        }
        
        /**
         * Get enhanced table statistics
         * @returns {Object} Statistics object
         */
        getStatistics() {
            if (!this.isInitialized()) {
                return { total: 0, completed: 0, pending: 0, performance: null };
            }
            
            try {
                const data = this.table.data().toArray();
                const total = data.length;
                const completed = data.filter(row => row.status === '✅').length;
                const pending = total - completed;
                
                return { 
                    total, 
                    completed, 
                    pending,
                    performance: this.getPerformanceStats()
                };
            } catch (error) {
                console.error('Table Manager: Error getting statistics:', error);
                return { total: 0, completed: 0, pending: 0, performance: null };
            }
        }
        
        /**
         * Enhanced barcode search with caching and normalization
         * @param {string} barcode Barcode to search for
         * @returns {Array} Matching records
         */
        findByBarcode(barcode) {
            if (!this.isInitialized()) {
                return [];
            }
            
            try {
                // Normalize barcode for consistent search
                const normalizedBarcode = String(barcode).trim().toUpperCase();
                
                // Use index for fast lookup if available
                if (this.config.enableCache && this.barcodeIndex.has(normalizedBarcode)) {
                    const postId = this.barcodeIndex.get(normalizedBarcode);
                    const cachedData = this.postIdIndex.get(String(postId));
                    return cachedData ? [cachedData] : [];
                }
                
                // Fallback to table iteration with normalization
                const data = this.table.data().toArray();
                return data.filter(row => {
                    const rowBarcode = row.barcd || '';
                    return String(rowBarcode).trim().toUpperCase() === normalizedBarcode;
                });
            } catch (error) {
                console.error('Table Manager: Error finding by barcode:', error);
                return [];
            }
        }
        
        /**
         * Enhanced debugging with comprehensive post_id analysis
         * @returns {Array} Array of debug information
         */
        debugPostIds() {
            if (!this.isInitialized()) {
                console.log('❌ Table Manager: Not initialized');
                return [];
            }
            
            try {
                const data = this.table.data().toArray();
                console.group('🔍 Table Manager: Post ID Debug Analysis');
                console.log('📊 Total records:', data.length);
                console.log('🗃️ Cache status:', {
                    enabled: this.config.enableCache,
                    postIdIndex: this.postIdIndex.size,
                    barcodeIndex: this.barcodeIndex.size
                });
                
                const debugInfo = data.map((row, index) => {
                    const info = {
                        index: index,
                        id: row.id,
                        post_id: row.post_id,
                        barcode: row.barcd,
                        status: row.status,
                        cached: this.postIdIndex.has(String(row.post_id || row.id))
                    };
                    
                    // Detailed logging for first 10 records
                    if (index < 10) {
                        console.log(`  Row ${index}:`, info);
                    }
                    
                    return info;
                });
                
                console.table(debugInfo.slice(0, 20)); // Show first 20 in table
                console.groupEnd();
                
                return debugInfo;
            } catch (error) {
                console.error('Table Manager: Error debugging post_ids:', error);
                return [];
            }
        }
        
        /**
         * Enhanced debug for specific search
         */
        debugTableData(searchField, searchValue) {
            console.group('🔍 Table Manager: Search Debug');
            console.log('Search parameters:', { searchField, searchValue });
            
            const data = this.getData();
            const matches = data.filter(row => {
                const fieldValue = String(row[searchField] || '').trim();
                return fieldValue === String(searchValue).trim();
            });
            
            console.log('Found matches:', matches.length);
            if (matches.length > 0) {
                console.table(matches);
            } else {
                console.log('Sample data for comparison:');
                console.table(data.slice(0, 5).map(row => ({
                    [searchField]: row[searchField],
                    post_id: row.post_id,
                    id: row.id,
                    barcode: row.barcd
                })));
            }
            console.groupEnd();
        }
        
        /**
         * Destroy the table instance with cleanup
         */
        destroy() {
            if (this.table) {
                try {
                    if ($.fn.DataTable.isDataTable('#discards-table')) {
                        this.table.destroy();
                        console.log('Table Manager: Table destroyed');
                    }
                } catch (error) {
                    console.error('Table Manager: Error destroying table:', error);
                }
            }
            
            this.table = null;
            this.isReady = false;
            this.clearIndexes();
        }
        
        /**
         * Reinitialize the table with current configuration
         * @returns {boolean} Success status
         */
        async reinitialize() {
            console.log('Table Manager: Reinitializing table');
            this.destroy();
            return await this.init();
        }
        
        /**
         * Clear all indexes and cache
         */
        clearIndexes() {
            if (this.config.enableCache) {
                this.dataCache.clear();
                this.barcodeIndex.clear();
                this.postIdIndex.clear();
                console.log('Table Manager: Indexes cleared');
            }
        }
        
        /**
         * Update internal statistics
         */
        updateStatistics() {
            // Update performance counters
            this.stats.lastUpdate = new Date();
        }
        
        /**
         * Get performance statistics
         */
        getPerformanceStats() {
            return {
                updateCount: this.stats.updateCount,
                searchCount: this.stats.searchCount,
                lastUpdate: this.stats.lastUpdate,
                cacheEnabled: this.config.enableCache,
                indexSizes: {
                    postIds: this.postIdIndex.size,
                    barcodes: this.barcodeIndex.size
                }
            };
        }
        
        /**
         * Utility function to escape HTML
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        /**
         * Get public API for external access
         */
        getPublicAPI() {
            return {
                // Initialization
                init: this.init.bind(this),
                isInitialized: this.isInitialized.bind(this),
                destroy: this.destroy.bind(this),
                reinitialize: this.reinitialize.bind(this),
                
                // Data operations
                updateTableData: this.updateTableData.bind(this),
                clearTable: this.clearTable.bind(this),
                getData: this.getData.bind(this),
                
                // Status updates (key functionality for scanning)
                updateRowStatus: this.updateRowStatus.bind(this),
                updateRowStatusById: this.updateRowStatusById.bind(this),
                updateRowStatusByBarcode: this.updateRowStatusByBarcode.bind(this),
                
                // Search operations
                findByBarcode: this.findByBarcode.bind(this),
                
                // Statistics and debugging
                getStatistics: this.getStatistics.bind(this),
                debugPostIds: this.debugPostIds.bind(this),
                debugBarcodeSearch: this.debugBarcodeSearch.bind(this),
                getPerformanceStats: this.getPerformanceStats.bind(this),
                
                // Read-only state access
                isReady: () => this.isReady,
                config: { ...this.config } // Return copy
            };
        }
    }
    
    // ============================================================================
    // INITIALIZATION AND GLOBAL EXPORT
    // ============================================================================
    
    // Create optimized table manager instance
    const tableManager = new DiscardsTableManager();
    
    // Export public API to global scope
    window.discardsTableManager = tableManager.getPublicAPI();
    
    console.log('✅ Table Manager: Optimized module loaded and ready for initialization');
    console.log('🔗 Table Manager: API exported to window.discardsTableManager:', !!window.discardsTableManager);
    console.log('🔗 Table Manager: updateTableData method available:', typeof window.discardsTableManager?.updateTableData === 'function');
    
    // Enhanced auto-initialization with retry mechanism
    const attemptInitialization = async (attempt = 1, maxAttempts = 5) => {
        console.log(`Table Manager: Initialization attempt ${attempt}/${maxAttempts}`);
        
        // Check if table element exists
        if ($('#discards-table').length === 0) {
            console.log('Table Manager: Table element not found, waiting...');
            if (attempt < maxAttempts) {
                setTimeout(() => attemptInitialization(attempt + 1, maxAttempts), 1000);
            } else {
                console.warn('Table Manager: Table element not found after', maxAttempts, 'attempts');
            }
            return;
        }
        
        // Check if DataTables is available
        if (!$.fn.DataTable) {
            console.log('Table Manager: DataTables not available, waiting...');
            if (attempt < maxAttempts) {
                setTimeout(() => attemptInitialization(attempt + 1, maxAttempts), 1000);
            } else {
                console.error('Table Manager: DataTables not available after', maxAttempts, 'attempts');
            }
            return;
        }
        
        // Attempt initialization
        try {
            console.log('Table Manager: Starting initialization...');
            const success = await window.discardsTableManager.init();
            
            if (success) {
                console.log('✅ Table Manager: Initialization successful');
            } else {
                console.warn('⚠️ Table Manager: Initialization failed');
                
                // Retry if not successful and attempts remaining
                if (attempt < maxAttempts) {
                    console.log('Table Manager: Retrying initialization in 1 second...');
                    setTimeout(() => attemptInitialization(attempt + 1, maxAttempts), 1000);
                } else {
                    console.error('❌ Table Manager: All initialization attempts failed');
                }
            }
        } catch (error) {
            console.error('Table Manager: Initialization error:', error);
            
            if (attempt < maxAttempts) {
                console.log('Table Manager: Retrying after error in 1 second...');
                setTimeout(() => attemptInitialization(attempt + 1, maxAttempts), 1000);
            } else {
                console.error('❌ Table Manager: All initialization attempts failed due to errors');
            }
        }
    };
    
    // Start auto-initialization
    setTimeout(() => attemptInitialization(), 500);
    
});