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
                responsive: false,
                scrollX: false,
                autoWidth: true,
                fixedHeader: false,
                ordering: true,
                order: [[0, 'asc']],
                columnDefs: [
                    {
                        targets: 0, // Status column
                        orderable: true,
                        className: 'text-center'
                    },
                    {
                        targets: '_all',
                        orderable: true
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
         * Get column configuration with enhanced rendering
         */
        getColumnConfiguration() {
            return [
                { 
                    data: 'status', 
                    title: 'Estado',
                    className: 'text-center status-column',
                    defaultContent: '❌',
                    width: '80px',
                    render: (data, type, row) => this.renderStatusColumn(data, type, row)
                },
                { 
                    data: 'field', 
                    title: 'Field', 
                    defaultContent: '', 
                    width: '120px',
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'range_val', 
                    title: 'Range', 
                    defaultContent: '', 
                    width: '100px',
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'row_val', 
                    title: 'Row', 
                    defaultContent: '', 
                    width: '80px',
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'plot_id', 
                    title: 'Plot ID', 
                    defaultContent: '', 
                    width: '100px',
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'subplot_id', 
                    title: 'Subplot ID', 
                    defaultContent: '', 
                    width: '120px',
                    render: (data, type) => type === 'display' ? this.escapeHtml(data) : data
                },
                { 
                    data: 'matid', 
                    title: 'MATID', 
                    defaultContent: '', 
                    width: '120px',
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
                let title = isCompleted ? 'Descartado' : 'Pendiente';
                if (isCompleted && isPreDiscarded) {
                    title = 'Ya fue descartado anteriormente';
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
            
            // Update indexes if enabled
            if (this.config.enableCache && postId) {
                this.postIdIndex.set(String(postId), data);
                if (barcode) {
                    this.barcodeIndex.set(String(barcode), postId);
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
         * Initialize or rebuild indexes for fast lookups
         */
        initializeIndexes() {
            if (!this.config.enableCache) return;
            
            console.log('Table Manager: Initializing indexes');
            
            this.dataCache.clear();
            this.barcodeIndex.clear();
            this.postIdIndex.clear();
            
            // Build indexes from current data
            if (this.table) {
                this.table.rows().every(function() {
                    const data = this.data();
                    const postId = data.post_id || data.id;
                    const barcode = data.barcd;
                    
                    if (postId) {
                        window.discardsTableManager.postIdIndex.set(String(postId), data);
                        if (barcode) {
                            window.discardsTableManager.barcodeIndex.set(String(barcode), postId);
                        }
                    }
                });
            }
            
            console.log('Table Manager: Indexes built -', 
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
            if (!this.isInitialized()) {
                console.error('Table Manager: Not initialized for data update');
                return false;
            }
            
            if (!Array.isArray(data)) {
                console.error('Table Manager: Data must be an array');
                return false;
            }
            
            try {
                console.log('Table Manager: Updating with', data.length, 'records');
                
                // Normalize data with enhanced post_id handling
                const normalizedData = this.normalizeTableData(data);
                
                // Clear existing data and indexes
                this.clearIndexes();
                
                // Update table data
                this.table.clear().rows.add(normalizedData).draw();
                
                // Rebuild indexes for fast lookups
                this.initializeIndexes();
                
                // Update statistics
                this.stats.updateCount++;
                this.stats.lastUpdate = new Date();
                
                console.log('Table Manager: Updated successfully with', normalizedData.length, 'records');
                return true;
                
            } catch (error) {
                console.error('Table Manager: Error updating data:', error);
                return false;
            }
        }
        
        /**
         * Normalize table data with enhanced post_id preservation and pre-discarded handling
         */
        normalizeTableData(data) {
            return data.map((row, index) => {
                // Enhanced post_id handling - preserve original post_id
                const postId = row.post_id || row.id || row.record_id || `row_${Date.now()}_${index}`;
                
                // IMPORTANT: Handle pre-discarded materials
                // If isDiscarded is true, set status to ✅ immediately
                const isAlreadyDiscarded = row.isDiscarded === true || row.isDiscarded === 'true' || row.isDiscarded === 1;
                const recordStatus = isAlreadyDiscarded ? '✅' : (row.status || '❌');
                
                return {
                    // Primary identifiers
                    id: postId,
                    post_id: row.post_id || postId, // Always preserve post_id
                    
                    // Status and core fields - handle pre-discarded materials
                    status: recordStatus, // Set ✅ for already discarded materials
                    field: String(row.field || '').trim(),
                    range_val: String(row.range_val || row.range || '').trim(),
                    row_val: String(row.row_val || row.row || '').trim(),
                    plot_id: String(row.plot_id || '').trim(),
                    subplot_id: String(row.subplot_id || '').trim(),
                    matid: String(row.matid || '').trim(),
                    barcd: String(row.barcd || row.barcode || '').trim(),
                    
                    // Additional metadata
                    isDiscarded: isAlreadyDiscarded, // Preserve discarded state
                    _originalData: this.config.enableCache ? row : null,
                    _wasPreDiscarded: isAlreadyDiscarded // Flag for pre-discarded materials
                };
            });
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
         * Update row status by barcode - primary method for scanner functionality
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
            
            console.log('Table Manager: Updating status by barcode:', barcode, 'to:', newStatus);
            
            try {
                // Use index for fast lookup if available
                if (this.config.enableCache && this.barcodeIndex.has(String(barcode))) {
                    const postId = this.barcodeIndex.get(String(barcode));
                    console.log('Table Manager: Found barcode in cache, post_id:', postId);
                    
                    // Update cache
                    if (this.postIdIndex.has(String(postId))) {
                        const cachedData = this.postIdIndex.get(String(postId));
                        cachedData.status = newStatus;
                        this.postIdIndex.set(String(postId), cachedData);
                    }
                }
                
                // Update in DataTable by barcode
                return this.updateRowStatusByIteration('barcd', barcode, newStatus, 'barcode');
                
            } catch (error) {
                console.error('Table Manager: Error updating row status by barcode:', error);
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
         * Enhanced barcode search with caching
         * @param {string} barcode Barcode to search for
         * @returns {Array} Matching records
         */
        findByBarcode(barcode) {
            if (!this.isInitialized()) {
                return [];
            }
            
            try {
                // Use index for fast lookup if available
                if (this.config.enableCache && this.barcodeIndex.has(String(barcode))) {
                    const postId = this.barcodeIndex.get(String(barcode));
                    const cachedData = this.postIdIndex.get(String(postId));
                    return cachedData ? [cachedData] : [];
                }
                
                // Fallback to table iteration
                const data = this.table.data().toArray();
                return data.filter(row => 
                    String(row.barcd || '').trim() === String(barcode).trim()
                );
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
    
    console.log('Table Manager: Optimized module loaded and ready for initialization');
    
    // Auto-initialize if table element is present
    setTimeout(() => {
        if ($('#discards-table').length > 0) {
            console.log('Table Manager: Auto-initializing...');
            window.discardsTableManager.init().then(success => {
                if (success) {
                    console.log('Table Manager: Auto-initialization successful');
                } else {
                    console.warn('Table Manager: Auto-initialization failed');
                }
            });
        }
    }, 500);
    
});