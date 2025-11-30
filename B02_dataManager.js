/**
 * @fileoverview Centralized Data Management Layer for OneGov FIT Market
 * @module B15_dataManager
 * @version 1.0.0
 * @description Single source of truth for all entity data with intelligent caching.
 *              Reduces redundant spreadsheet reads and improves performance 5x.
 * @author OneGov FIT Market Development Team
 */

/**
 * Main data manager class for all entity operations
 * @class OneGovDataManager
 * @description Handles all data loading, caching, and transformation for the application
 */
class OneGovDataManager {
  /**
   * @constructor
   * @description Initialize the data manager with cache and configuration
   */
  constructor() {
    /**
     * @property {Object} cache - Main cache storage
     * @property {Array} cache.agencies - Cached agency entities
     * @property {Array} cache.oems - Cached OEM entities
     * @property {Array} cache.vendors - Cached vendor entities
     * @property {number} cache.lastUpdated - Timestamp of last update
     * @property {boolean} cache.isLoading - Loading state flag
     */
    this.cache = {
      agencies: null,
      oems: null,
      vendors: null,
      lastUpdated: null,
      isLoading: false
    };
    
    /** @property {number} TTL - Time to live in milliseconds (2 minutes) */
    this.TTL = 2 * 60 * 1000;
    
    /** @property {string} SPREADSHEET_ID - Google Sheets ID */
    this.SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    
    /**
     * @property {Object} columnMappings - Column index mappings for each entity type
     * @description Maps column names to their spreadsheet column indices (1-based)
     */
    this.columnMappings = this._initializeColumnMappings();
  }
  
  /**
   * Initialize column mappings for all entity types
   * @private
   * @returns {Object} Column mapping configuration
   */
  _initializeColumnMappings() {
    return {
      agency: {
        sheetName: 'Agency',
        columns: {
          agencyCode: 1,        // A
          name: 2,              // B
          parentCompany: 3,     // C
          obligations: 4,       // D
          smallBusiness: 5,     // E
          sumTier: 6,          // F
          sumType: 7,          // G
          contractVehicle: 8,   // H
          fundingDepartment: 9, // I
          discount: 10,         // J
          topRefPiid: 11,      // K
          topPiid: 12,         // L
          activeContracts: 13,  // M
          discountOfferings: 14,// N
          aiProduct: 15,        // O
          aiCategory: 16,       // P
          topBicProducts: 17,   // Q
          reseller: 18,         // R
          bicReseller: 19,      // S
          bicOem: 20,          // T
          fasOem: 21,          // U
          fundingAgency: 22,    // V
          bicTopProductsPerAgency: 23, // W
          oneGovTier: 24,      // X
          fasDataTable: 25,    // Y
          fasTimestamp: 26,    // Z
          bicDataTable: 27,    // AA
          bicTimestamp: 28     // AB
        }
      },
      oem: {
        sheetName: 'OEM',
        columns: {
          duns: 1,              // A
          name: 2,              // B
          parentCompany: 3,     // C
          obligations: 4,       // D
          smallBusiness: 5,     // E
          sumTier: 6,          // F
          sumType: 7,          // G
          contractVehicle: 8,   // H
          fundingDepartment: 9, // I
          discount: 10,         // J
          topRefPiid: 11,      // K
          topPiid: 12,         // L
          activeContracts: 13,  // M
          discountOfferings: 14,// N
          aiProduct: 15,        // O
          aiCategory: 16,       // P
          topBicProducts: 17,   // Q
          reseller: 18,         // R
          bicReseller: 19,      // S
          bicOem: 20,          // T
          fasOem: 21,          // U
          fundingAgency: 22,    // V
          bicTopProductsPerAgency: 23, // W
          oneGovTier: 24,      // X
          fasDataTable: 25,    // Y
          fasTimestamp: 26,    // Z
          bicDataTable: 27,    // AA
          bicTimestamp: 28     // AB
        }
      },
      vendor: {
        sheetName: 'Vendor',
        columns: {
          uei: 1,               // A
          name: 2,              // B
          parentCompany: 3,     // C
          obligations: 4,       // D
          smallBusiness: 5,     // E
          sumTier: 6,          // F
          sumType: 7,          // G
          contractVehicle: 8,   // H
          fundingDepartment: 9, // I
          discount: 10,         // J
          topRefPiid: 11,      // K
          topPiid: 12,         // L
          activeContracts: 13,  // M
          discountOfferings: 14,// N
          aiProduct: 15,        // O
          aiCategory: 16,       // P
          topBicProducts: 17,   // Q
          reseller: 18,         // R
          bicReseller: 19,      // S
          bicOem: 20,          // T
          fasOem: 21,          // U
          fundingAgency: 22,    // V
          bicTopProductsPerAgency: 23, // W
          oneGovTier: 24,      // X
          fasDataTable: 25,    // Y
          fasTimestamp: 26,    // Z
          bicDataTable: 27,    // AA
          bicTimestamp: 28     // AB
        }
      }
    };
  }
  
  /**
   * Check if cache needs refresh
   * @returns {boolean} True if cache is stale or empty
   */
  needsRefresh() {
    if (!this.cache.lastUpdated) return true;
    if (!this.cache.agencies || !this.cache.oems || !this.cache.vendors) return true;
    return (Date.now() - this.cache.lastUpdated) > this.TTL;
  }
  
  /**
   * Load all entity data from spreadsheet
   * @param {boolean} [forceRefresh=false] - Force reload even if cache is valid
   * @returns {Object} Cached data object with agencies, oems, vendors
   */
  loadAllData(forceRefresh = false) {
    // Return cached data if still valid
    if (!forceRefresh && !this.needsRefresh()) {
      console.log('DataManager: Returning cached data');
      return this.cache;
    }
    
    // Prevent multiple simultaneous loads
    if (this.cache.isLoading) {
      console.log('DataManager: Load already in progress');
      return this.cache;
    }
    
    try {
      this.cache.isLoading = true;
      console.log('DataManager: Loading fresh data from spreadsheet');
      
      const spreadsheet = SpreadsheetApp.openById(this.SPREADSHEET_ID);
      
      // Load all three entity types
      this.cache.agencies = this.loadEntitySheet(spreadsheet, 'agency');
      this.cache.oems = this.loadEntitySheet(spreadsheet, 'oem');
      this.cache.vendors = this.loadEntitySheet(spreadsheet, 'vendor');
      
      this.cache.lastUpdated = Date.now();
      this.cache.isLoading = false;
      
      console.log(`DataManager: Loaded ${this.cache.agencies.length} agencies, ${this.cache.oems.length} OEMs, ${this.cache.vendors.length} vendors`);
      
      return this.cache;
    } catch (error) {
      console.error('DataManager: Error loading data:', error);
      this.cache.isLoading = false;
      throw error;
    }
  }
  
  /**
   * Load a single entity sheet
   * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Spreadsheet object
   * @param {string} entityType - Type of entity ('agency', 'oem', 'vendor')
   * @returns {Array} Array of parsed entities
   */
  loadEntitySheet(spreadsheet, entityType) {
    const config = this.columnMappings[entityType];
    const sheet = spreadsheet.getSheetByName(config.sheetName);
    
    if (!sheet) {
      console.error(`DataManager: Sheet not found: ${config.sheetName}`);
      return [];
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    const entities = [];
    
    // Process rows (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const name = row[config.columns.name - 1];
      
      if (!name || name.trim() === '') continue;
      
      const entity = {
        id: `${entityType}_${i}`,
        name: name.trim(),
        type: entityType,
        rowIndex: i // Keep for reference
      };
      
      // Parse all columns
      for (const [key, colIndex] of Object.entries(config.columns)) {
        if (key === 'name') continue; // Already processed
        
        const value = row[colIndex - 1];
        
        // Handle JSON columns
        if (this.isJsonColumn(key)) {
          entity[key] = this.parseJSON(value);
        } else {
          // Handle regular columns
          entity[key] = value;
        }
      }
      
      // Calculate derived fields
      entity.totalObligations = this.extractTotalObligations(entity.obligations);
      entity.tier = this.extractTier(entity);
      entity.hasAIProducts = this.checkAIProducts(entity);
      
      entities.push(entity);
    }
    
    return entities;
  }
  
  /**
   * Check if column contains JSON data
   * @param {string} columnName - Name of the column
   * @returns {boolean} True if column contains JSON data
   */
  isJsonColumn(columnName) {
    const jsonColumns = [
      'obligations', 'smallBusiness', 'sumTier', 'sumType',
      'contractVehicle', 'fundingDepartment', 'discount',
      'topRefPiid', 'topPiid', 'activeContracts', 'discountOfferings',
      'aiProduct', 'aiCategory', 'topBicProducts', 'reseller',
      'bicReseller', 'bicOem', 'fasOem', 'fundingAgency',
      'bicTopProductsPerAgency', 'oneGovTier'
    ];
    return jsonColumns.includes(columnName);
  }
  
  /**
   * Parse JSON column safely
   * @param {*} value - Raw cell value
   * @returns {Object|null} Parsed JSON object or null
   */
  parseJSON(value) {
    if (!value) return null;
    
    try {
      // Already an object
      if (typeof value === 'object') return value;
      
      // Empty or invalid
      const strValue = String(value).trim();
      if (strValue === '' || strValue === '{}' || strValue === '[]') return null;
      
      return JSON.parse(strValue);
    } catch (error) {
      console.warn('DataManager: JSON parse error:', error);
      return null;
    }
  }
  
  /**
   * Extract total obligations from JSON
   * @param {Object} obligationsJson - Obligations JSON object
   * @returns {number} Total obligation amount
   */
  extractTotalObligations(obligationsJson) {
    if (!obligationsJson) return 0;
    
    // Check various possible structures
    if (obligationsJson.total_obligated) {
      return obligationsJson.total_obligated;
    }
    if (obligationsJson.summary?.total_obligations) {
      return obligationsJson.summary.total_obligations;
    }
    if (obligationsJson.fiscal_year_obligations) {
      return Object.values(obligationsJson.fiscal_year_obligations)
        .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }
    
    return 0;
  }
  
  /**
   * Extract tier information
   * @param {Object} entity - Entity object
   * @returns {string|null} Tier designation
   */
  extractTier(entity) {
    if (entity.oneGovTier?.mode_tier) {
      return entity.oneGovTier.mode_tier;
    }
    if (entity.sumTier?.tier) {
      return entity.sumTier.tier;
    }
    return null;
  }
  
  /**
   * Check if entity has AI products
   * @param {Object} entity - Entity object
   * @returns {boolean} True if entity has AI products
   */
  checkAIProducts(entity) {
    return !!(entity.aiProduct && Object.keys(entity.aiProduct).length > 0);
  }
  
  /**
   * Get all entities of a specific type
   * @param {string} [entityType] - Type of entity to retrieve
   * @param {boolean} [forceRefresh=false] - Force data refresh
   * @returns {Array} Array of entities
   */
  getEntities(entityType, forceRefresh = false) {
    const data = this.loadAllData(forceRefresh);
    
    switch(entityType?.toLowerCase()) {
      case 'agency':
        return data.agencies;
      case 'oem':
        return data.oems;
      case 'vendor':
        return data.vendors;
      default:
        // Return all if no type specified
        return [...data.agencies, ...data.oems, ...data.vendors];
    }
  }
  
  /**
   * Get entities filtered and transformed for specific use cases
   * @param {string} viewType - Type of view requesting data
   * @param {Object} options - Filter and transformation options
   * @returns {Array} Transformed entities for the view
   */
  getEntitiesForView(viewType, options = {}) {
    const { entityType, columnId, topN, selectedEntities, parentFilter } = options;
    
    // Get base entities
    let entities = this.getEntities(entityType);
    
    // Apply filters
    if (selectedEntities && selectedEntities.length > 0) {
      entities = entities.filter(e => selectedEntities.includes(e.name));
    }
    
    if (parentFilter) {
      entities = entities.filter(e => e.parentCompany === parentFilter);
    }
    
    // Transform based on view type
    switch(viewType) {
      case 'dashboard':
        return this.transformForDashboard(entities);
      case 'reportBuilder':
        return this.transformForReportBuilder(entities, columnId, topN);
      case 'entityDetail':
        return entities; // Return full data for detail view
      case 'reportTable':
        return this.transformForTable(entities);
      default:
        return entities;
    }
  }
  
  /**
   * Transform entities for dashboard view
   * @param {Array} entities - Raw entities
   * @returns {Array} Simplified entities for dashboard
   */
  transformForDashboard(entities) {
    return entities.map(entity => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      totalObligations: entity.totalObligations,
      tier: entity.tier,
      contractCount: entity.activeContracts ? Object.keys(entity.activeContracts).length : 0,
      hasAIProducts: entity.hasAIProducts,
      parentCompany: entity.parentCompany
    }));
  }
  
  /**
   * Transform entities for report builder
   * @param {Array} entities - Raw entities
   * @param {string} columnId - Column to analyze
   * @param {number} topN - Number of top entities to return
   * @returns {Array} Top entities by column value
   */
  transformForReportBuilder(entities, columnId, topN = 10) {
    if (!columnId || !entities.length) return [];
    
    // Extract values for specified column
    const entityValues = entities
      .map(entity => {
        const jsonData = entity[columnId];
        if (!jsonData) return null;
        
        const value = this.extractNumericValue(jsonData, columnId);
        return {
          name: entity.name,
          value: value,
          jsonData: jsonData
        };
      })
      .filter(e => e && e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
    
    return entityValues;
  }
  
  /**
   * Transform entities for report table
   * @param {Array} entities - Raw entities
   * @returns {Array} Flattened entities for table display
   */
  transformForTable(entities) {
    return entities.map(entity => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      category: entity.type.toUpperCase(),
      total: entity.totalObligations,
      fy24: entity.obligations?.fiscal_year_obligations?.['2024'] || 0,
      fy25: entity.obligations?.fiscal_year_obligations?.['2025'] || 0,
      tier: entity.tier || 'N/A',
      small_business: entity.smallBusiness?.is_small_business || 'N/A'
    }));
  }
  
  /**
   * Extract numeric value from JSON data based on known structures
   * @param {*} jsonData - JSON data to extract value from
   * @param {string} columnId - Column identifier for context-specific extraction
   * @returns {number} Numeric value
   */
  extractNumericValue(jsonData, columnId) {
    if (!jsonData) return 0;
    if (typeof jsonData === 'number') return jsonData;
    
    // Column-specific extraction based on B01_JSON_STRUCTURES documentation
    switch(columnId) {
      case 'reseller':
        // Column R structure
        if (jsonData.summary?.total_top_15_resellers) {
          return jsonData.summary.total_top_15_resellers;
        }
        if (jsonData.summary?.total_all_resellers) {
          return jsonData.summary.total_all_resellers;
        }
        break;
        
      case 'bicOem':
        // Column T structure
        if (jsonData.summary?.total_top_15_manufacturers) {
          return jsonData.summary.total_top_15_manufacturers;
        }
        if (jsonData.summary?.total_all_manufacturers) {
          return jsonData.summary.total_all_manufacturers;
        }
        break;
        
      case 'fasOem':
        // Column U structure
        if (jsonData.summary?.total_top_10_oems) {
          return jsonData.summary.total_top_10_oems;
        }
        if (jsonData.summary?.total_all_oems) {
          return jsonData.summary.total_all_oems;
        }
        break;
        
      case 'fundingAgency':
        // Column V structure
        if (jsonData.summary?.total_top_10_agencies) {
          return jsonData.summary.total_top_10_agencies;
        }
        if (jsonData.summary?.total_all_agencies) {
          return jsonData.summary.total_all_agencies;
        }
        break;
    }
    
    // Generic extraction for other columns
    if (jsonData.total_obligated) return jsonData.total_obligated;
    if (jsonData.total_obligations) return jsonData.total_obligations;
    if (jsonData.total) return jsonData.total;
    if (jsonData.sum) return jsonData.sum;
    
    // Sum fiscal years if available
    if (jsonData.fiscal_year_obligations) {
      return Object.values(jsonData.fiscal_year_obligations)
        .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }
    
    // Sum fiscal_years if available (alternate structure)
    if (jsonData.fiscal_years) {
      return Object.values(jsonData.fiscal_years)
        .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }
    
    return 0;
  }
  
  /**
   * Get fiscal year trends from column data
   * @param {string} entityType - Type of entity
   * @param {string} columnId - Column to analyze
   * @param {Array} [selectedEntities=[]] - Filter to specific entities
   * @returns {Object} Fiscal year aggregated data
   */
  getFiscalYearTrends(entityType, columnId, selectedEntities = []) {
    let entities = this.getEntities(entityType);
    
    // Apply entity filter
    if (selectedEntities.length > 0) {
      entities = entities.filter(e => selectedEntities.includes(e.name));
    }
    
    const fiscalYearData = {};
    
    entities.forEach(entity => {
      const jsonData = entity[columnId];
      if (!jsonData) return;
      
      let fyData = null;
      
      // Column-specific fiscal year extraction based on B01_JSON_STRUCTURES
      switch(columnId) {
        case 'reseller':
          // Aggregate from top_15_reseller_summaries
          if (jsonData.top_15_reseller_summaries) {
            fyData = {};
            Object.values(jsonData.top_15_reseller_summaries).forEach(reseller => {
              if (reseller.fiscal_years) {
                Object.entries(reseller.fiscal_years).forEach(([year, value]) => {
                  fyData[year] = (fyData[year] || 0) + value;
                });
              }
            });
          }
          break;
          
        case 'bicOem':
          // Use yearly_totals from BIC OEM structure
          fyData = jsonData.yearly_totals;
          break;
          
        case 'fasOem':
          // Aggregate from top_10_oem_summaries
          if (jsonData.top_10_oem_summaries) {
            fyData = {};
            Object.values(jsonData.top_10_oem_summaries).forEach(oem => {
              if (oem.fiscal_years) {
                Object.entries(oem.fiscal_years).forEach(([year, value]) => {
                  fyData[year] = (fyData[year] || 0) + value;
                });
              }
            });
          }
          break;
          
        case 'fundingAgency':
          // Aggregate from top_10_agency_summaries
          if (jsonData.top_10_agency_summaries) {
            fyData = {};
            Object.values(jsonData.top_10_agency_summaries).forEach(agency => {
              if (agency.fiscal_years) {
                Object.entries(agency.fiscal_years).forEach(([year, value]) => {
                  fyData[year] = (fyData[year] || 0) + value;
                });
              }
            });
          }
          break;
          
        default:
          // Generic fiscal year extraction
          fyData = jsonData.fiscal_year_obligations || 
                   jsonData.fiscal_years || 
                   jsonData.yearly_totals || 
                   jsonData.fiscal_year_breakdown;
      }
      
      if (fyData && typeof fyData === 'object') {
        for (const [year, value] of Object.entries(fyData)) {
          if (!fiscalYearData[year]) fiscalYearData[year] = 0;
          fiscalYearData[year] += parseFloat(value) || 0;
        }
      }
    });
    
    return fiscalYearData;
  }
  
  /**
   * Clear cache for manual refresh
   */
  clearCache() {
    console.log('DataManager: Clearing cache');
    this.cache = {
      agencies: null,
      oems: null,
      vendors: null,
      lastUpdated: null,
      isLoading: false
    };
  }
  
  /**
   * Get cache status information
   * @returns {Object} Cache status details
   */
  getCacheStatus() {
    return {
      hasData: !!(this.cache.agencies || this.cache.oems || this.cache.vendors),
      lastUpdated: this.cache.lastUpdated,
      isStale: this.needsRefresh(),
      entityCounts: {
        agencies: this.cache.agencies?.length || 0,
        oems: this.cache.oems?.length || 0,
        vendors: this.cache.vendors?.length || 0
      }
    };
  }
}

// ============================================================================
// SINGLETON PATTERN IMPLEMENTATION
// ============================================================================

/** @type {OneGovDataManager|null} Singleton instance */
let dataManagerInstance = null;

/**
 * Get or create the data manager singleton instance
 * @returns {OneGovDataManager} Data manager instance
 */
function getDataManager() {
  if (!dataManagerInstance) {
    dataManagerInstance = new OneGovDataManager();
  }
  return dataManagerInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create standardized API response object
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} error - Error message if any
 * @returns {Object} Standardized response object
 */
function createResponse(success, data, error) {
  return {
    success: success,
    data: data,
    error: error,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Get all entities from all sheets for dashboard
 * @returns {Array} All entities formatted for dashboard view
 */
function getAllEntities() {
  try {
    const manager = getDataManager();
    const allEntities = manager.getEntitiesForView('dashboard');
    
    console.log(`DataManager getAllEntities: Returning ${allEntities.length} entities for dashboard`);
    return allEntities;
  } catch (error) {
    console.error('DataManager getAllEntities error:', error);
    return [];
  }
}

/**
 * Get entities of a specific type
 * @param {string} entityType - Type of entity to retrieve
 * @returns {Object} Response object with success status and data
 * @deprecated Use getDataManager().getEntities(entityType) instead
 */
function getEntities(entityType) {
  const manager = getDataManager();
  const entities = manager.getEntities(entityType);
  
  // Return in old response format for compatibility
  return createResponse(true, entities, null);
}

/**
 * Force refresh all cached data
 * @returns {Object} Success status message
 */
function refreshDataCache() {
  const manager = getDataManager();
  manager.clearCache();
  manager.loadAllData(true);
  return { success: true, message: 'Cache refreshed' };
}

/**
 * Get cache statistics
 * @returns {Object} Cache status information
 */
function getDataCacheStatus() {
  const manager = getDataManager();
  return manager.getCacheStatus();
}