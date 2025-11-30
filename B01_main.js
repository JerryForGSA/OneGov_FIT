/**
 * Backend Main Entry Point - B01_main.js
 * Google Apps Script main functions for OneGov FIT Market
 */

/**
 * Main entry point for Google Apps Script
 * This function will be called by the web app
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const page = e.parameter.page;
    
    // Handle page routing
    if (page === 'reportbuilder') {
      return HtmlService.createHtmlOutputFromFile('F03_ReportBuilder')
        .setTitle('OneGov FIT Market - Report Builder')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    if (page === 'reporttable') {
      return HtmlService.createHtmlOutputFromFile('F04_ReportTable')
        .setTitle('OneGov FIT Market - Report Table')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // If no action or page specified, serve the main HTML page
    if (!action) {
      // Use the exact React version with advanced JSON architecture
      return HtmlService.createHtmlOutputFromFile('F05_ExactReactWithJSON')
        .setTitle('OneGov FIT Market')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Handle API calls
    const entityType = e.parameter.entityType;
    switch (action) {
      case 'getEntities':
        try {
          const manager = getDataManager();
          const entities = manager.getEntities(entityType);
          return createWebResponse(true, entities, null);
        } catch (error) {
          console.error('Error getting entities:', error);
          return createWebResponse(false, null, error.toString());
        }
      case 'getAnalytics':
        return getAnalytics(e.parameter.entityId);
      case 'exportReport':
        return exportReport(JSON.parse(e.parameter.reportData));
      default:
        return createResponse(false, null, 'Unknown action');
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Include other HTML files (for templates)
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    console.error('Include error for', filename, ':', error);
    return `<div class="error">Failed to load ${filename}: ${error.toString()}</div>`;
  }
}

/**
 * Get URL for Report Builder web app
 */
function getReportBuilderUrl() {
  try {
    // Get the current web app URL and modify it to serve the Report Builder
    const webAppUrl = ScriptApp.getService().getUrl();
    return webAppUrl + '?page=reportbuilder';
  } catch (error) {
    console.error('Error getting Report Builder URL:', error);
    return null;
  }
}

/**
 * Get URL for Report Table web app
 */
function getReportTableUrl() {
  try {
    // Get the current web app URL and modify it to serve the Report Table
    const webAppUrl = ScriptApp.getService().getUrl();
    return webAppUrl + '?page=reporttable';
  } catch (error) {
    console.error('Error getting Report Table URL:', error);
    return null;
  }
}

/**
 * Get available columns for dynamic dropdown
 */
function getAvailableColumns(entityType = 'agency') {
  try {
    console.log(`🔍 DYNAMIC COLUMNS: Getting available columns for ${entityType}`);
    
    // Use DataManager to get entity data - but never return the instance
    const dataManager = OneGovDataManager.getInstance();
    let entities = [];
    
    switch (entityType.toLowerCase()) {
      case 'agency':
        entities = dataManager.getAgencies();
        break;
      case 'oem':
        entities = dataManager.getOEMs();
        break;
      case 'vendor':
        entities = dataManager.getVendors();
        break;
      default:
        entities = dataManager.getAgencies();
    }
    
    if (!entities || entities.length === 0) {
      console.log('⚠️ DYNAMIC COLUMNS: No entities found');
      return ['obligations'];
    }
    
    // Get first entity to analyze available columns
    const sampleEntity = entities[0];
    console.log(`📊 DYNAMIC COLUMNS: Sample entity structure:`, Object.keys(sampleEntity));
    
    const availableColumns = [];
    
    // Check for ALL numeric columns in the entity data
    Object.keys(sampleEntity).forEach(key => {
      const value = sampleEntity[key];
      
      // Skip system columns only
      if (key === 'name' || key === 'id' || key === 'type') return;
      
      // Skip ONLY these 2 specific excluded columns
      if (key === 'OneGov Discounted Products' || key === 'Expiring OneGov Discounted Products') return;
      
      // Include ALL other numeric columns
      if (typeof value === 'number') {
        availableColumns.push(key);
      } else if (typeof value === 'string') {
        try {
          // Check if it's a JSON column with numeric data
          const jsonData = JSON.parse(value);
          if (jsonData && typeof jsonData === 'object') {
            // If it has fiscal year data or is numeric, include it
            if (jsonData.fiscal_years || 
                jsonData.fiscal_year_breakdown || 
                jsonData.fiscal_year_obligations ||
                jsonData.yearly_totals ||
                jsonData.total ||
                typeof jsonData === 'number') {
              availableColumns.push(key);
            }
          } else if (typeof jsonData === 'number') {
            availableColumns.push(key);
          }
        } catch (e) {
          // Not JSON, check if it's a direct numeric value
          if (!isNaN(parseFloat(value)) && isFinite(value)) {
            availableColumns.push(key);
          }
        }
      }
    });
    
    console.log(`🔍 DYNAMIC COLUMNS DEBUG: Entity keys:`, Object.keys(sampleEntity));
    console.log(`🔍 DYNAMIC COLUMNS DEBUG: Found columns:`, availableColumns);
    
    // Ensure 'obligations' is included as default
    if (!availableColumns.includes('obligations')) {
      availableColumns.unshift('obligations');
    }
    
    // Convert snake_case to Title Case for display
    const formattedColumns = availableColumns.map(col => ({
      id: col,
      name: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
    
    console.log(`✅ DYNAMIC COLUMNS: Found ${formattedColumns.length} columns:`, formattedColumns);
    
    return ensureSerializable(formattedColumns);
    
  } catch (error) {
    console.error('🚨 DYNAMIC COLUMNS Error:', error);
    // Return default fallback
    return ensureSerializable([
      { id: 'obligations', name: 'Obligations' },
      { id: 'contracts', name: 'Contracts' },
      { id: 'fiscal_year_breakdown', name: 'Fiscal Year Breakdown' }
    ]);
  }
}

/**
 * Simple test function to isolate serialization issues
 */
function testBasicReturn() {
  return "Hello World";
}

/**
 * Find entities that actually have FAS/BIC URLs
 */
function findEntitiesWithTables() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const results = [];
    const sheetsToCheck = ['OEM', 'Vendor', 'Agency'];
    
    for (const sheetName of sheetsToCheck) {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) continue;
      
      const values = sheet.getDataRange().getValues();
      console.log(`🔍 Checking ${sheetName} sheet with ${values.length} rows`);
      
      // Check first 10 rows for entities with URLs
      for (let i = 1; i < Math.min(11, values.length); i++) {
        const row = values[i];
        const name = row[1]; // Column B
        const fasUrl = row[24]; // Column Y
        const bicUrl = row[26]; // Column AA
        
        if (name && (fasUrl || bicUrl)) {
          results.push({
            sheet: sheetName,
            name: name,
            fasUrl: fasUrl || 'None',
            bicUrl: bicUrl || 'None',
            rowNumber: i + 1
          });
        }
      }
    }
    
    console.log(`🔍 Found ${results.length} entities with table URLs`);
    return results;
  } catch (error) {
    console.error('Error finding entities with tables:', error);
    return { error: error.toString() };
  }
}

/**
 * Test function to check FAS/BIC URLs directly for Adobe
 */
function testFasBicUrls() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('OEM');
    
    if (!sheet) {
      return { error: 'OEM sheet not found' };
    }
    
    const values = sheet.getDataRange().getValues();
    console.log('🔍 Sheet has', values.length, 'rows and', values[0].length, 'columns');
    
    // Find Adobe row
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const name = row[1]; // Column B
      
      if (name && name.toLowerCase().includes('adobe')) {
        console.log('🔍 Found Adobe at row', i + 1);
        console.log('🔍 Adobe name:', name);
        console.log('🔍 Row length:', row.length);
        console.log('🔍 Column Y (index 24):', row[24]);
        console.log('🔍 Column AA (index 26):', row[26]);
        
        return {
          name: name,
          rowLength: row.length,
          fasUrl: row[24], // Column Y 
          bicUrl: row[26]  // Column AA
        };
      }
    }
    
    return { error: 'Adobe not found in OEM sheet' };
  } catch (error) {
    console.error('Error in testFasBicUrls:', error);
    return { error: error.toString() };
  }
}

function testArrayReturn() {
  return [1, 2, 3];
}

function testObjectReturn() {
  return { test: "value", number: 123 };
}

/**
 * Get current user information
 */
function getCurrentUser() {
  try {
    const user = Session.getActiveUser();
    return {
      name: user.getEmail().split('@')[0],
      email: user.getEmail(),
      role: 'Team Member', // Default role
      lastSync: new Date().toLocaleString()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return {
      name: 'Unknown User',
      email: '',
      role: 'Team Member',
      lastSync: 'N/A'
    };
  }
}

/**
 * Simple test function for debugging
 */
function sayHello() {
  return 'Hello from OneGov FIT Market! Current time: ' + new Date().toLocaleString();
}

/**
 * Test function to verify data access
 */
function getSimpleData() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const oemSheet = spreadsheet.getSheetByName('OEM');
    
    if (!oemSheet) {
      return { error: 'OEM sheet not found' };
    }
    
    // Get first few rows to test
    const range = oemSheet.getRange(1, 1, 3, 5);
    const values = range.getValues();
    
    return {
      success: true,
      message: 'Data access successful',
      sample: values,
      rowCount: oemSheet.getLastRow(),
      colCount: oemSheet.getLastColumn()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get data for Ready view
 */
function getReadyViewDataOptimizedWrapper() {
  try {
    return {
      extractionLog: [],
      oemFiles: [],
      playbook: []
    };
  } catch (error) {
    console.error('Error getting ready view data:', error);
    return {
      extractionLog: [],
      oemFiles: [],
      playbook: []
    };
  }
}

/**
 * Log visitor activity
 */
function logVisitorActivity(viewName) {
  try {
    // You can add actual logging logic here if needed
    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Get entities from Google Sheets using proper column structure
 */
function getEntities(entityType) {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Updated column mappings based on new sheet structure
    let sheetName, columns;
    switch (entityType?.toLowerCase()) {
      case 'oem':
        sheetName = 'OEM';
        columns = {
          duns: 1,              // Column A - DUNS
          name: 2,              // Column B - OEM name
          parentCompany: 3,     // Column C - Parent
          obligations: 4,       // Column D - Obligations (JSON)
          smallBusiness: 5,     // Column E - Small Business (JSON)
          sumTier: 6,          // Column F - SUM Tier (JSON)
          sumType: 7,          // Column G - Sum Type (JSON)
          contractVehicle: 8,   // Column H - Contract Vehicle (JSON)
          fundingDepartment: 9, // Column I - Funding Department (JSON)
          discount: 10,         // Column J - Discount (JSON)
          topRefPiid: 11,      // Column K - Top Ref_PIID (JSON)
          topPiid: 12,         // Column L - Top PIID (JSON)
          activeContracts: 13,  // Column M - Active Contracts (JSON)
          discountOfferings: 14,// Column N - Discount Offerings (JSON)
          aiProduct: 15,        // Column O - AI Product (JSON)
          aiCategory: 16,       // Column P - AI Category (JSON)
          topBicProducts: 17,   // Column Q - Top BIC Products (JSON)
          reseller: 18,         // Column R - Reseller (JSON)
          bicReseller: 19,      // Column S - BIC Reseller (JSON)
          bicOem: 20,          // Column T - BIC OEM (JSON)
          fasOem: 21,          // Column U - FAS OEM (JSON)
          fundingAgency: 22,    // Column V - Funding Agency (JSON)
          bicTopProductsPerAgency: 23, // Column W - BIC Top Products per Agency (JSON)
          oneGovTier: 24,      // Column X - OneGov Tier (JSON)
          fasDataTable: 25,    // Column Y - FAS Data Table (link)
          fasTimestamp: 26,    // Column Z - FAS Table Update Timestamp
          bicDataTable: 27,    // Column AA - BIC Data Table (link)
          bicTimestamp: 28     // Column AB - BIC Table Update Timestamp
        };
        console.log('🔍 Column mapping for', entityType, '- FAS:', columns.fasDataTable, 'BIC:', columns.bicDataTable);
        break;
      case 'vendor':
        sheetName = 'Vendor';
        columns = {
          uei: 1,               // Column A - UEI
          name: 2,              // Column B - Vendor name
          parentCompany: 3,     // Column C - Parent
          obligations: 4,       // Column D - Obligations (JSON)
          smallBusiness: 5,     // Column E - Small Business (JSON)
          sumTier: 6,          // Column F - SUM Tier (JSON)
          sumType: 7,          // Column G - Sum Type (JSON)
          contractVehicle: 8,   // Column H - Contract Vehicle (JSON)
          fundingDepartment: 9, // Column I - Funding Department (JSON)
          discount: 10,         // Column J - Discount (JSON)
          topRefPiid: 11,      // Column K - Top Ref_PIID (JSON)
          topPiid: 12,         // Column L - Top PIID (JSON)
          activeContracts: 13,  // Column M - Active Contracts (JSON)
          discountOfferings: 14,// Column N - Discount Offerings (JSON)
          aiProduct: 15,        // Column O - AI Product (JSON)
          aiCategory: 16,       // Column P - AI Category (JSON)
          topBicProducts: 17,   // Column Q - Top BIC Products (JSON)
          reseller: 18,         // Column R - Reseller (JSON)
          bicReseller: 19,      // Column S - BIC Reseller (JSON)
          bicOem: 20,          // Column T - BIC OEM (JSON)
          fasOem: 21,          // Column U - FAS OEM (JSON)
          fundingAgency: 22,    // Column V - Funding Agency (JSON)
          bicTopProductsPerAgency: 23, // Column W - BIC Top Products per Agency (JSON)
          oneGovTier: 24,      // Column X - OneGov Tier (JSON)
          fasDataTable: 25,    // Column Y - FAS Data Table (link)
          fasTimestamp: 26,    // Column Z - FAS Table Update Timestamp
          bicDataTable: 27,    // Column AA - BIC Data Table (link)
          bicTimestamp: 28     // Column AB - BIC Table Update Timestamp
        };
        console.log('🔍 Column mapping for', entityType, '- FAS:', columns.fasDataTable, 'BIC:', columns.bicDataTable);
        break;
      case 'agency':
        sheetName = 'Agency';
        columns = {
          agencyCode: 1,        // Column A - Agency Code
          name: 2,              // Column B - Agency name  
          parentCompany: 3,     // Column C - Parent/Department
          obligations: 4,       // Column D - Obligations (JSON)
          smallBusiness: 5,     // Column E - Small Business (JSON)
          sumTier: 6,          // Column F - SUM Tier (JSON)
          sumType: 7,          // Column G - Sum Type (JSON)
          contractVehicle: 8,   // Column H - Contract Vehicle (JSON)
          fundingDepartment: 9, // Column I - Funding Department (JSON)
          discount: 10,         // Column J - Discount (JSON)
          topRefPiid: 11,      // Column K - Top Ref_PIID (JSON)
          topPiid: 12,         // Column L - Top PIID (JSON)
          activeContracts: 13,  // Column M - Active Contracts (JSON)
          discountOfferings: 14,// Column N - Discount Offerings (JSON)
          aiProduct: 15,        // Column O - AI Product (JSON)
          aiCategory: 16,       // Column P - AI Category (JSON)
          topBicProducts: 17,   // Column Q - Top BIC Products (JSON)
          reseller: 18,         // Column R - Reseller (JSON)
          bicReseller: 19,      // Column S - BIC Reseller (JSON)
          bicOem: 20,          // Column T - BIC OEM (JSON)
          fasOem: 21,          // Column U - FAS OEM (JSON)
          fundingAgency: 22,    // Column V - Funding Agency (JSON)
          bicTopProductsPerAgency: 23, // Column W - BIC Top Products per Agency (JSON)
          oneGovTier: 24,      // Column X - OneGov Tier (JSON)
          fasDataTable: 25,    // Column Y - FAS Data Table (link)
          fasTimestamp: 26,    // Column Z - FAS Table Update Timestamp
          bicDataTable: 27,    // Column AA - BIC Data Table (link)
          bicTimestamp: 28     // Column AB - BIC Table Update Timestamp
        };
        console.log('🔍 Column mapping for', entityType, '- FAS:', columns.fasDataTable, 'BIC:', columns.bicDataTable);
        break;
      default:
        sheetName = 'OEM';
        columns = {
          name: 2,
          obligations: 4,
        };
    }
    
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    // Process entities, skipping rows without valid JSON data where required
    const entities = [];
    for (let i = 1; i < values.length; i++) { // Start from row 2 (skip header)
      const row = values[i];
      const name = row[columns.name - 1]; // Convert to 0-based index
      
      if (!name || name.trim() === '') continue; // Skip empty names
      
      const entity = {
        id: `${entityType}_${i}`,
        name: name,
        type: entityType,
      };
      
      // Process JSON columns with new structure
      if (columns.obligations && row[columns.obligations - 1]) {
        const obligations = parseJSONColumn(row[columns.obligations - 1]);
        if (obligations) {
          entity.obligations = obligations;
          // Extract total from the JSON structure
          if (obligations.summary?.total_obligations) {
            entity.totalObligations = obligations.summary.total_obligations;
          } else if (obligations.total_obligated) {
            entity.totalObligations = obligations.total_obligated;
          }
        }
      }
      
      if (columns.smallBusiness && row[columns.smallBusiness - 1]) {
        const smallBusiness = parseJSONColumn(row[columns.smallBusiness - 1]);
        if (smallBusiness) entity.smallBusiness = smallBusiness;
      }
      
      if (columns.sumTier && row[columns.sumTier - 1]) {
        const sumTier = parseJSONColumn(row[columns.sumTier - 1]);
        if (sumTier) entity.sumTier = sumTier;
      }
      
      if (columns.contractVehicle && row[columns.contractVehicle - 1]) {
        const contractVehicle = parseJSONColumn(row[columns.contractVehicle - 1]);
        if (contractVehicle) entity.contractVehicle = contractVehicle;
      }
      
      if (columns.sumType && row[columns.sumType - 1]) {
        const sumType = parseJSONColumn(row[columns.sumType - 1]);
        if (sumType) {
          entity.sumType = sumType;
        }
      }
      
      if (columns.discount && row[columns.discount - 1]) {
        const discount = parseJSONColumn(row[columns.discount - 1]);
        if (discount) entity.discount = discount;
      }
      
      if (columns.topRefPiid && row[columns.topRefPiid - 1]) {
        const topRefPiid = parseJSONColumn(row[columns.topRefPiid - 1]);
        if (topRefPiid) entity.topRefPiid = topRefPiid;
      }
      
      if (columns.topPiid && row[columns.topPiid - 1]) {
        const topPiid = parseJSONColumn(row[columns.topPiid - 1]);
        if (topPiid) entity.topPiid = topPiid;
      }
      
      if (columns.aiProduct && row[columns.aiProduct - 1]) {
        const aiProduct = parseJSONColumn(row[columns.aiProduct - 1]);
        if (aiProduct) entity.aiProduct = aiProduct;
      }
      
      if (columns.aiCategory && row[columns.aiCategory - 1]) {
        console.log('AI CATEGORY - Column exists, raw data:', row[columns.aiCategory - 1]);
        const aiCategory = parseJSONColumn(row[columns.aiCategory - 1]);
        if (aiCategory) {
          entity.aiCategories = aiCategory;
          console.log('AI CATEGORY - Parsed and assigned:', aiCategory);
        } else {
          console.log('AI CATEGORY - Failed to parse JSON');
        }
      } else {
        console.log('AI CATEGORY - Column missing or empty. Column index:', columns.aiCategory, 'Row length:', row.length, 'Value:', row[columns.aiCategory - 1]);
      }
      
      if (columns.topBicProducts && row[columns.topBicProducts - 1]) {
        console.log('BIC PRODUCTS - Column exists, raw data:', row[columns.topBicProducts - 1]);
        const topBicProducts = parseJSONColumn(row[columns.topBicProducts - 1]);
        if (topBicProducts) {
          entity.topBicProducts = topBicProducts;
          console.log('BIC PRODUCTS - Parsed and assigned:', topBicProducts);
        } else {
          console.log('BIC PRODUCTS - Failed to parse JSON');
        }
      } else {
        console.log('BIC PRODUCTS - Column missing or empty. Column index:', columns.topBicProducts, 'Row length:', row.length, 'Value:', row[columns.topBicProducts - 1]);
      }
      
      if (columns.discountOfferings && row[columns.discountOfferings - 1]) {
        console.log('DISCOUNT OFFERINGS - Column exists, raw data:', row[columns.discountOfferings - 1]);
        const discountOfferings = parseJSONColumn(row[columns.discountOfferings - 1]);
        if (discountOfferings) {
          entity.discountOfferings = discountOfferings;
          console.log('DISCOUNT OFFERINGS - Parsed and assigned:', discountOfferings);
        } else {
          console.log('DISCOUNT OFFERINGS - Failed to parse JSON');
        }
      } else {
        console.log('DISCOUNT OFFERINGS - Column missing or empty. Column index:', columns.discountOfferings, 'Row length:', row.length, 'Value:', row[columns.discountOfferings - 1]);
      }
      
      if (columns.reseller && row[columns.reseller - 1]) {
        const reseller = parseJSONColumn(row[columns.reseller - 1]);
        if (reseller) entity.reseller = reseller;
      }
      
      if (columns.fundingAgency && row[columns.fundingAgency - 1]) {
        const fundingAgency = parseJSONColumn(row[columns.fundingAgency - 1]);
        if (fundingAgency) entity.fundingAgency = fundingAgency;
      }
      
      if (columns.oneGovTier && row[columns.oneGovTier - 1]) {
        const oneGovTier = parseJSONColumn(row[columns.oneGovTier - 1]);
        if (oneGovTier) {
          entity.oneGovTier = oneGovTier;
          // Extract tier information
          if (oneGovTier.mode_tier) entity.tier = oneGovTier.mode_tier;
          if (oneGovTier.total_obligated) entity.totalObligated = oneGovTier.total_obligated;
        }
      }
      
      if (columns.bicOem && row[columns.bicOem - 1]) {
        console.log('BIC OEM - Column exists, raw data:', row[columns.bicOem - 1]);
        const bicOem = parseJSONColumn(row[columns.bicOem - 1]);
        if (bicOem) {
          entity.bicOem = bicOem;
          console.log('BIC OEM - Parsed and assigned:', bicOem);
        } else {
          console.log('BIC OEM - Failed to parse JSON');
        }
      } else {
        console.log('BIC OEM - Column missing or empty. Column index:', columns.bicOem, 'Row length:', row.length, 'Value:', row[columns.bicOem - 1]);
      }
      
      if (columns.fasOem && row[columns.fasOem - 1]) {
        const fasOem = parseJSONColumn(row[columns.fasOem - 1]);
        if (fasOem) entity.fasOem = fasOem;
      }
      
      // Add non-JSON fields
      if (columns.parentCompany && row[columns.parentCompany - 1]) {
        entity.parentCompany = row[columns.parentCompany - 1];
      }
      
      if (columns.uei && row[columns.uei - 1]) {
        entity.uei = row[columns.uei - 1];
      }
      
      if (columns.duns && row[columns.duns - 1]) {
        entity.duns = row[columns.duns - 1];
      }
      
      if (columns.agencyCode && row[columns.agencyCode - 1]) {
        entity.agencyCode = row[columns.agencyCode - 1];
      }
      
      // Debug info for Adobe specifically
      if (entity.name && entity.name.toLowerCase().includes('adobe')) {
        console.log('🔍 Adobe debug - Row length:', row.length, 
                   'FAS column:', columns.fasDataTable, 'value:', row[columns.fasDataTable - 1],
                   'BIC column:', columns.bicDataTable, 'value:', row[columns.bicDataTable - 1]);
      }
      
      // Always assign FAS/BIC URLs even if they appear empty
      if (columns.fasDataTable) {
        entity.fasTableUrl = row[columns.fasDataTable - 1] || '';
        if (entity.fasTableUrl && entity.fasTableUrl.trim()) {
          console.log('🔍 FAS URL found for', entity.name, ':', entity.fasTableUrl);
        }
      }
      
      if (columns.bicDataTable) {
        entity.bicTableUrl = row[columns.bicDataTable - 1] || '';
        if (entity.bicTableUrl && entity.bicTableUrl.trim()) {
          console.log('🔍 BIC URL found for', entity.name, ':', entity.bicTableUrl);
        }
      }
      
      entities.push(entity);
    }
    
    return createResponse(true, entities, null);
  } catch (error) {
    console.error('Error getting entities:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Wrapper function for getting OEM entities
 */
function getOEMs() {
  try {
    console.log('🔍 getOEMs() called - calling getEntities(oem)');
    return getEntities('oem');
  } catch (error) {
    console.error('Error getting OEMs:', error);
    return createWebResponse(false, null, error.toString());
  }
}

/**
 * Wrapper function for getting Vendor entities
 */
function getVendors() {
  try {
    return getEntities('vendor');
  } catch (error) {
    console.error('Error getting Vendors:', error);
    return createWebResponse(false, null, error.toString());
  }
}

/**
 * Wrapper function for getting Agency entities
 */
function getAgencies() {
  try {
    return getEntities('agency');
  } catch (error) {
    console.error('Error getting Agencies:', error);
    return createWebResponse(false, null, error.toString());
  }
}

/**
 * Legacy wrapper for OEM entities (for backward compatibility)
 */
function getOEMEntities() {
  return getOEMs();
}

/**
 * Legacy wrapper for Vendor entities (for backward compatibility)
 */
function getVendorEntities() {
  return getVendors();
}

/**
 * Legacy wrapper for Agency entities (for backward compatibility)
 */
function getAgencyEntities() {
  return getAgencies();
}

/**
 * Get report table data
 */
function getReportTableData() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Combine data from all entity types
    const oems = getEntities('oem') || [];
    const vendors = getEntities('vendor') || [];
    const agencies = getEntities('agency') || [];
    
    // Format for report table
    const reportData = [];
    let id = 1;
    
    // Add OEMs
    oems.forEach(entity => {
      reportData.push({
        id: id++,
        name: entity.name || entity.entityName,
        category: 'OEM',
        type: 'Manufacturer',
        total: entity.totalObligations || 0,
        fy24: entity.fy24Obligations || 0,
        fy25: entity.fy25Obligations || 0,
        tier: entity.tier || 'N/A',
        small_business: entity.smallBusiness || 'N/A'
      });
    });
    
    // Add Vendors
    vendors.forEach(entity => {
      reportData.push({
        id: id++,
        name: entity.name || entity.entityName,
        category: 'Vendor',
        type: entity.vendorType || 'Reseller',
        total: entity.totalObligations || 0,
        fy24: entity.fy24Obligations || 0,
        fy25: entity.fy25Obligations || 0,
        tier: entity.tier || 'Tier 2',
        small_business: entity.smallBusiness || 'N/A'
      });
    });
    
    // Add Agencies
    agencies.forEach(entity => {
      reportData.push({
        id: id++,
        name: entity.name || entity.entityName,
        category: 'Agency',
        type: 'Federal Agency',
        total: entity.totalObligations || 0,
        fy24: entity.fy24Obligations || 0,
        fy25: entity.fy25Obligations || 0,
        tier: 'N/A',
        small_business: 'N/A'
      });
    });
    
    return reportData;
  } catch (error) {
    console.error('Error getting report table data:', error);
    return [];
  }
}

/**
 * Export report table data
 */
function exportReportTable(data, format) {
  try {
    if (format === 'sheets') {
      // Create a new spreadsheet
      const spreadsheet = SpreadsheetApp.create('OneGov FIT Report Export - ' + new Date().toISOString());
      const sheet = spreadsheet.getActiveSheet();
      
      // Add headers
      const headers = Object.keys(data[0] || {});
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Add data
      const rows = data.map(row => headers.map(header => row[header] || ''));
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
      
      return { success: true, url: spreadsheet.getUrl() };
    } else if (format === 'csv') {
      // Generate CSV content
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
      ].join('\n');
      
      return { success: true, csv: csv };
    }
    
    return { success: false, error: 'Invalid format' };
  } catch (error) {
    console.error('Error exporting report table:', error);
    throw error;
  }
}

/**
 * Get comprehensive cross-sheet analytics for summary dashboard
 */
function getSummaryDashboardData() {
  try {
    // Get data from all three entity types
    const oemResponse = getOEMEntities();
    const vendorResponse = getVendorEntities();
    const agencyResponse = getAgencyEntities();
    
    if (!oemResponse.success || !vendorResponse.success || !agencyResponse.success) {
      throw new Error('Failed to load entity data');
    }
    
    const oems = JSON.parse(oemResponse.getContent()).data;
    const vendors = JSON.parse(vendorResponse.getContent()).data;
    const agencies = JSON.parse(agencyResponse.getContent()).data;
    
    const dashboard = {
      overview: {
        totalEntities: oems.length + vendors.length + agencies.length,
        totalOEMs: oems.length,
        totalVendors: vendors.length,
        totalAgencies: agencies.length
      },
      obligations: {
        oemTotal: 0,
        vendorTotal: 0,
        agencyTotal: 0,
        grandTotal: 0
      },
      tiers: {
        oem: {},
        vendor: {},
        agency: {}
      },
      aiAdoption: {
        oemCount: 0,
        vendorCount: 0,
        agencyCount: 0,
        oemPercent: 0,
        vendorPercent: 0,
        agencyPercent: 0
      },
      topPerformers: {
        topOEMs: [],
        topVendors: [],
        topAgencies: []
      },
      fiscalYearTrends: {
        2022: { oem: 0, vendor: 0, agency: 0 },
        2023: { oem: 0, vendor: 0, agency: 0 },
        2024: { oem: 0, vendor: 0, agency: 0 },
        2025: { oem: 0, vendor: 0, agency: 0 }
      },
      contracts: {
        oemContracts: 0,
        vendorContracts: 0,
        agencyContracts: 0
      }
    };
    
    // Process OEM data
    oems.forEach(oem => {
      if (oem.totalObligations) {
        dashboard.obligations.oemTotal += oem.totalObligations;
      }
      if (oem.tier) {
        dashboard.tiers.oem[oem.tier] = (dashboard.tiers.oem[oem.tier] || 0) + 1;
      }
      if (oem.hasAIProducts) {
        dashboard.aiAdoption.oemCount++;
      }
      if (oem.contractVehicleCount) {
        dashboard.contracts.oemContracts += oem.contractVehicleCount;
      }
    });
    
    // Process Vendor data
    vendors.forEach(vendor => {
      if (vendor.totalObligations) {
        dashboard.obligations.vendorTotal += vendor.totalObligations;
      }
      if (vendor.tier) {
        dashboard.tiers.vendor[vendor.tier] = (dashboard.tiers.vendor[vendor.tier] || 0) + 1;
      }
      if (vendor.hasAIProducts) {
        dashboard.aiAdoption.vendorCount++;
      }
      if (vendor.contractVehicleCount) {
        dashboard.contracts.vendorContracts += vendor.contractVehicleCount;
      }
    });
    
    // Process Agency data  
    agencies.forEach(agency => {
      if (agency.totalObligations) {
        dashboard.obligations.agencyTotal += agency.totalObligations;
      }
      if (agency.tier) {
        dashboard.tiers.agency[agency.tier] = (dashboard.tiers.agency[agency.tier] || 0) + 1;
      }
      if (agency.hasAIProducts) {
        dashboard.aiAdoption.agencyCount++;
      }
      if (agency.contractVehicleCount) {
        dashboard.contracts.agencyContracts += agency.contractVehicleCount;
      }
    });
    
    // Calculate totals and percentages
    dashboard.obligations.grandTotal = dashboard.obligations.oemTotal + 
                                      dashboard.obligations.vendorTotal + 
                                      dashboard.obligations.agencyTotal;
    
    dashboard.aiAdoption.oemPercent = (dashboard.aiAdoption.oemCount / oems.length * 100).toFixed(1);
    dashboard.aiAdoption.vendorPercent = (dashboard.aiAdoption.vendorCount / vendors.length * 100).toFixed(1);
    dashboard.aiAdoption.agencyPercent = (dashboard.aiAdoption.agencyCount / agencies.length * 100).toFixed(1);
    
    // Get top performers
    dashboard.topPerformers.topOEMs = oems
      .filter(o => o.totalObligations)
      .sort((a, b) => b.totalObligations - a.totalObligations)
      .slice(0, 5)
      .map(o => ({ name: o.name, obligations: o.totalObligations, tier: o.tier }));
      
    dashboard.topPerformers.topVendors = vendors
      .filter(v => v.totalObligations)
      .sort((a, b) => b.totalObligations - a.totalObligations)
      .slice(0, 5)
      .map(v => ({ name: v.name, obligations: v.totalObligations, tier: v.tier }));
      
    dashboard.topPerformers.topAgencies = agencies
      .filter(a => a.totalObligations)
      .sort((a, b) => b.totalObligations - a.totalObligations)
      .slice(0, 5)
      .map(a => ({ name: a.name, obligations: a.totalObligations, tier: a.tier }));
    
    return createResponse(true, dashboard, null);
  } catch (error) {
    console.error('Error getting summary dashboard data:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Legacy analytics function for backward compatibility
 */
function getAnalytics(entityId) {
  return getSummaryDashboardData();
}

/**
 * Sum values from JSON object (for obligations, etc.)
 */
function sumJsonValues(jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object') return 0;
  
  // Handle different JSON structures based on your documentation
  
  // 1. Obligations JSON - has total_obligated field
  if (jsonObj.total_obligated && typeof jsonObj.total_obligated === 'number') {
    return jsonObj.total_obligated;
  }
  
  // 2. Fiscal year obligations - sum the yearly amounts
  if (jsonObj.fiscal_year_obligations && typeof jsonObj.fiscal_year_obligations === 'object') {
    let sum = 0;
    for (const year in jsonObj.fiscal_year_obligations) {
      const value = jsonObj.fiscal_year_obligations[year];
      if (typeof value === 'number') {
        sum += value;
      }
    }
    return sum;
  }
  
  // 3. Tier JSON - has summary.total_all_obligations
  if (jsonObj.summary && jsonObj.summary.total_all_obligations && typeof jsonObj.summary.total_all_obligations === 'number') {
    return jsonObj.summary.total_all_obligations;
  }
  
  // 4. Contract vehicle structure - sum all contract totals
  // This handles the structure I see in your debug output
  let contractSum = 0;
  let hasContractData = false;
  
  for (const key in jsonObj) {
    const item = jsonObj[key];
    if (item && typeof item === 'object') {
      if (item.total && typeof item.total === 'number') {
        contractSum += item.total;
        hasContractData = true;
      }
      // Also handle fiscal_years structure within contracts
      if (item.fiscal_years && typeof item.fiscal_years === 'object') {
        for (const year in item.fiscal_years) {
          const yearValue = item.fiscal_years[year];
          if (typeof yearValue === 'number') {
            contractSum += yearValue;
            hasContractData = true;
          }
        }
      }
    }
  }
  
  if (hasContractData) {
    return contractSum;
  }
  
  // 5. Direct total field
  if (jsonObj.total && typeof jsonObj.total === 'number') {
    return jsonObj.total;
  }
  
  // 6. Sum all numeric values in top level
  let sum = 0;
  for (const key in jsonObj) {
    const value = jsonObj[key];
    if (typeof value === 'number') {
      sum += value;
    } else if (typeof value === 'string') {
      // Try to parse as number, removing $ and commas
      const numValue = parseFloat(value.replace(/[$,]/g, ''));
      if (!isNaN(numValue)) {
        sum += numValue;
      }
    }
  }
  
  return sum;
}

/**
 * Extract meaningful data from different JSON column types
 */
function extractJsonInsights(jsonObj, columnType) {
  if (!jsonObj || typeof jsonObj !== 'object') return {};
  
  const insights = {};
  
  switch (columnType) {
    case 'tier':
      if (jsonObj.summary) {
        insights.uniqueOEMs = jsonObj.summary.unique_oems;
        insights.tierDistribution = jsonObj.summary.tier_distribution;
        insights.totalObligations = jsonObj.summary.total_all_obligations;
      }
      if (jsonObj.tier_details) {
        insights.tierDetails = jsonObj.tier_details;
      }
      break;
      
    case 'obligations':
      if (jsonObj.fiscal_year_obligations) {
        insights.fiscalYears = Object.keys(jsonObj.fiscal_year_obligations);
        insights.latestYear = Math.max(...insights.fiscalYears.map(y => parseInt(y)));
        insights.totalObligations = jsonObj.total_obligated;
      }
      break;
      
    case 'resellers':
    case 'contractVehicle':
    case 'fundingAgency':
      // For these, count the number of entries and extract top items
      insights.count = Object.keys(jsonObj).length;
      insights.items = Object.keys(jsonObj).slice(0, 5); // Top 5
      break;
  }
  
  return insights;
}

/**
 * Export report to Google Docs/Sheets/Slides
 */
function exportReport(reportData) {
  try {
    const { selectedCards, exportFormat } = reportData;
    
    switch (exportFormat) {
      case 'docs':
        return exportToGoogleDocs(selectedCards);
      case 'sheets':
        return exportToGoogleSheets(selectedCards);
      case 'slides':
        return exportToGoogleSlides(selectedCards);
      default:
        throw new Error(`Unknown export format: ${exportFormat}`);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Export to Google Docs
 */
function exportToGoogleDocs(cards) {
  try {
    const doc = DocumentApp.create('OneGov FIT Market Report - ' + new Date().toLocaleDateString());
    const body = doc.getBody();
    
    body.appendParagraph('OneGov FIT Market Analytics Report')
      .setHeading(DocumentApp.ParagraphHeading.TITLE);
    
    body.appendParagraph('Generated on: ' + new Date().toLocaleString())
      .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
    
    cards.forEach((card, index) => {
      body.appendParagraph(`${index + 1}. ${card.title}`)
        .setHeading(DocumentApp.ParagraphHeading.HEADING1);
      
      if (card.selected === 'chart' || card.selected === 'both') {
        body.appendParagraph(`Chart: ${card.chart.title}`);
      }
      
      if (card.selected === 'table' || card.selected === 'both') {
        body.appendParagraph(`Table: ${card.table.title}`);
        // Add table data here
      }
    });
    
    const url = doc.getUrl();
    doc.saveAndClose();
    
    return createResponse(true, { url }, null);
  } catch (error) {
    console.error('Error exporting to Google Docs:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Export to Google Sheets
 */
function exportToGoogleSheets(cards) {
  try {
    // Implementation for Google Sheets export
    const sheet = SpreadsheetApp.create('OneGov FIT Market Report - ' + new Date().toLocaleDateString());
    const url = sheet.getUrl();
    return createResponse(true, { url }, null);
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Export to Google Slides
 */
function exportToGoogleSlides(cards) {
  try {
    // Implementation for Google Slides export
    const presentation = SlidesApp.create('OneGov FIT Market Report - ' + new Date().toLocaleDateString());
    const url = presentation.getUrl();
    return createResponse(true, { url }, null);
  } catch (error) {
    console.error('Error exporting to Google Slides:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Helper function to parse JSON columns
 */
function parseJSONColumn(value) {
  if (!value) return null;
  
  try {
    // Handle both string and object types
    if (typeof value === 'object') {
      return value; // Already parsed
    }
    
    if (typeof value === 'string') {
      // Clean up the JSON string - remove extra whitespace and newlines
      const cleanValue = value.trim();
      if (cleanValue === '' || cleanValue === '{}' || cleanValue === '[]') {
        return null;
      }
      
      return JSON.parse(cleanValue);
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing JSON column:', error, 'Value:', value);
    return null;
  }
}

/**
 * Helper function to create standardized web responses
 */
function createWebResponse(success, data, error) {
  const response = {
    success: success,
    data: data,
    error: error,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper function to safely parse column data
 */
function parseColumnData(sheet, row, colIndex) {
  const value = sheet.getRange(row, colIndex).getValue();
  if (!value || value === '') return null;
  try {
    return JSON.parse(value);
  } catch(e) {
    console.error(`Parse error at row ${row}, col ${colIndex}:`, e);
    return null;
  }
}

/**
 * Get column index by name for new sheet structure
 */
function getColumnByName(columnName) {
  const columns = {
    'DUNS': 1, 'OEM': 2, 'Parent': 3, 'Obligations': 4,
    'Small Business': 5, 'SUM Tier': 6, 'Sum Type': 7,
    'Contract Vehicle': 8, 'Funding Department': 9,
    'Discount': 10, 'Top Ref_PIID': 11, 'Top PIID': 12,
    'Active Contracts': 13, 'Discount Offerings': 14,
    'AI Product': 15, 'AI Category': 16, 'Top BIC Products': 17,
    'Reseller': 18, 'BIC Reseller': 19, 'BIC OEM': 20,
    'FAS OEM': 21, 'Funding Agency': 22,
    'BIC Top Products per Agency': 23, 'OneGov Tier': 24,
    'FAS Data Table': 25, 'FAS Table Update Timestamp': 26,
    'BIC Data Table': 27, 'BIC Table Update Timestamp': 28
  };
  return columns[columnName];
}

/**
 * Test function to verify if functions are accessible
 */
function testReportBuilder() {
  console.log('TEST: testReportBuilder called successfully');
  return "Test successful";
}

/**
 * Get top entities data for a specific column (CRITICAL FUNCTION)
 * Used by frontend Chart Buffet for chart generation
 * 
 * @param {string} entityType - Type of entity ('agency', 'oem', 'vendor')
 * @param {string} columnId - Column identifier ('obligations', 'smallBusiness', etc.)
 * @param {number} topN - Number of top entities to return (default: 10)
 * @returns {Array} Array of entities with processed data
 */
function getColumnFirstData(entityType, columnId, topN = 10) {
  console.log(`🔍 getColumnFirstData called: entityType=${entityType}, columnId=${columnId}, topN=${topN}`);
  
  try {
    // Get data with safe error handling
    let entities = [];
    try {
      const entitiesResponse = getEntities(entityType);
      if (entitiesResponse && entitiesResponse.success) {
        entities = JSON.parse(entitiesResponse.getContent()).data || [];
      }
    } catch (error) {
      console.error('❌ Error getting entities:', error);
      return [];
    }
    
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      console.log('❌ No valid entities found for type:', entityType);
      return [];
    }
    
    console.log(`📊 Found ${entities.length} ${entityType} entities`);
    
    // Define column mappings
    const columnMap = {
      agency: {
        obligations: 'D',
        smallBusiness: 'E',
        sumTier: 'F',
        contractVehicle: 'H',
        fundingDepartment: 'I'
      },
      oem: {
        obligations: 'D',
        smallBusiness: 'E',
        sumTier: 'F',
        contractVehicle: 'H',
        fundingDepartment: 'I',
        aiProduct: 'O',
        topBicProducts: 'Q'
      },
      vendor: {
        obligations: 'D',
        smallBusiness: 'E',
        sumTier: 'F',
        contractVehicle: 'H',
        fundingDepartment: 'I'
      }
    };
    
    const column = columnMap[entityType]?.[columnId];
    if (!column) {
      console.log(`❌ Column ${columnId} not found for ${entityType}`);
      return [];
    }
    
    // Process entities and extract column data
    const processedEntities = [];
    
    for (const entity of entities) {
      try {
        const columnData = entity[column];
        let value = 0;
        let fiscalYearData = {};
        
        if (columnData) {
          // Parse JSON data
          const parsed = JSON.parse(columnData);
          
          if (columnId === 'obligations' && parsed.total) {
            value = parsed.total;
            fiscalYearData = parsed.fiscal_years || parsed.yearly_totals || {};
          } else if (parsed.total) {
            value = parsed.total;
          }
        }
        
        processedEntities.push({
          name: entity.A || 'Unknown',
          value: value,
          fiscal_year_obligations: fiscalYearData,
          type: entityType,
          tier: entity.C || 'N/A'
        });
        
      } catch (parseError) {
        console.log(`⚠️ Error parsing data for entity ${entity.A}:`, parseError);
        processedEntities.push({
          name: entity.A || 'Unknown',
          value: 0,
          fiscal_year_obligations: {},
          type: entityType,
          tier: entity.C || 'N/A'
        });
      }
    }
    
    // Sort by value (descending) and take top N
    const topEntities = processedEntities
      .filter(entity => entity.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
    
    // Ensure all returned data is serializable
    const serializedEntities = topEntities.map(entity => ({
      name: String(entity.name || ''),
      value: Number(entity.value || 0),
      fiscal_year_obligations: entity.fiscal_year_obligations || {},
      type: String(entity.type || ''),
      tier: String(entity.tier || '')
    }));
    
    console.log(`✅ Returning ${serializedEntities.length} top ${entityType} entities for ${columnId}`);
    return ensureSerializable(serializedEntities);
    
  } catch (error) {
    console.error('🚨 ERROR in getColumnFirstData:', error);
    return [];
  }
}

/**
 * Wrapper to ensure all returned data is serializable
 * @param {*} data - Data to serialize
 * @returns {*} Serializable data
 */
function ensureSerializable(data) {
  try {
    // Convert to JSON and back to ensure it's serializable
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error('Serialization error:', error);
    return null;
  }
}

/**
 * Get report builder data with cards for each JSON column
 */
function getReportBuilderData() {
  console.log('REPORT BUILDER: getReportBuilderData called - starting execution');
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Define JSON columns for each entity type
    const jsonColumns = {
      agency: [
        {id: 'obligations', name: 'Obligations', column: 'D'},
        {id: 'smallBusiness', name: 'Small Business', column: 'E'},
        {id: 'sumTier', name: 'SUM Tier', column: 'F'},
        {id: 'sumType', name: 'Sum Type', column: 'G'},
        {id: 'contractVehicle', name: 'Contract Vehicle', column: 'H'},
        {id: 'fundingDepartment', name: 'Funding Department', column: 'I'},
        {id: 'discount', name: 'Discount', column: 'J'}
      ],
      oem: [
        {id: 'obligations', name: 'Obligations', column: 'D'},
        {id: 'smallBusiness', name: 'Small Business', column: 'E'},
        {id: 'sumTier', name: 'SUM Tier', column: 'F'},
        {id: 'sumType', name: 'Sum Type', column: 'G'},
        {id: 'contractVehicle', name: 'Contract Vehicle', column: 'H'},
        {id: 'fundingDepartment', name: 'Funding Department', column: 'I'},
        {id: 'discount', name: 'Discount', column: 'J'},
        {id: 'discountOfferings', name: 'Discount Offerings', column: 'N'},
        {id: 'aiProduct', name: 'AI Product', column: 'O'},
        {id: 'topBicProducts', name: 'Top BIC Products', column: 'Q'},
        {id: 'reseller', name: 'Reseller', column: 'R'},
        {id: 'fundingAgency', name: 'Funding Agency', column: 'V'}
      ],
      vendor: [
        {id: 'obligations', name: 'Obligations', column: 'D'},
        {id: 'smallBusiness', name: 'Small Business', column: 'E'},
        {id: 'sumTier', name: 'SUM Tier', column: 'F'},
        {id: 'sumType', name: 'Sum Type', column: 'G'},
        {id: 'contractVehicle', name: 'Contract Vehicle', column: 'H'},
        {id: 'fundingDepartment', name: 'Funding Department', column: 'I'},
        {id: 'discount', name: 'Discount', column: 'J'},
        {id: 'discountOfferings', name: 'Discount Offerings', column: 'N'}
      ]
    };
    
    const cards = [];
    
    // Generate cards for each entity type
    for (const [entityType, columns] of Object.entries(jsonColumns)) {
      for (const columnInfo of columns) {
        // Generate KPI card
        const kpiCard = generateKPICard(spreadsheet, entityType, columnInfo);
        if (kpiCard) cards.push(kpiCard);
        
        // Generate trend card
        const trendCard = generateTrendCard(spreadsheet, entityType, columnInfo);
        if (trendCard) cards.push(trendCard);
      }
    }
    
    console.log('REPORT BUILDER: Generated', cards.length, 'cards total');
    return ensureSerializable(cards);
    
  } catch (error) {
    console.error('REPORT BUILDER ERROR:', error);
    console.error('REPORT BUILDER ERROR STACK:', error.stack);
    // Return a simple fallback card to test if the function is being called
    return [{
      id: 'test_card',
      title: 'Test Card - Backend Working',
      category: 'agency',
      cardType: 'kpi',
      chartType: 'bar',
      chartData: {
        labels: ['Test'],
        datasets: [{
          data: [100],
          backgroundColor: ['#144673']
        }]
      },
      tableData: {
        headers: ['Test'],
        rows: [['Working']]
      }
    }];
  }
}

/**
 * Get entity names for a specific entity type
 */
function getEntityNames(entityType) {
  console.log('BACKEND: getEntityNames called for:', entityType);
  
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Convert entity type to proper sheet name
    const entityTypeMap = {
      'agency': 'Agency',
      'oem': 'OEM', 
      'vendor': 'Vendor'
    };
    const sheetName = entityTypeMap[entityType.toLowerCase()] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
    console.log('BACKEND: Sheet name:', sheetName);
    
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      console.log('BACKEND: Sheet not found:', sheetName);
      console.log('BACKEND: Available sheets:', spreadsheet.getSheets().map(s => s.getName()));
      return [];
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    console.log('BACKEND: Total rows:', values.length);
    
    if (values.length > 1) {
      console.log('BACKEND: Header row:', values[0]);
      console.log('BACKEND: Sample row 1:', values[1]);
      console.log('BACKEND: Sample row 2:', values[2] || 'No row 2');
    }
    
    const entityNames = new Set();
    const sampleNames = [];
    
    // Process data starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const entityName = row[1]; // Column B is entity name
      
      if (entityName && entityName.trim() !== '') {
        const trimmedName = entityName.trim();
        entityNames.add(trimmedName);
        
        // Collect first 3 for debugging
        if (sampleNames.length < 3) {
          sampleNames.push(trimmedName);
        }
      }
    }
    
    console.log('BACKEND: Sample entity names found:', sampleNames);
    console.log('BACKEND: Total unique entity names found:', entityNames.size);
    
    // Convert to sorted array with value/label format
    const sortedNames = Array.from(entityNames)
      .sort()
      .map(name => ({
        value: name,
        label: name
      }));
      
    console.log(`BACKEND: Final unique count after processing: ${sortedNames.length}`);
    console.log('BACKEND: First 3 sorted names:', sortedNames.slice(0, 3));
    
    return sortedNames;
    
  } catch (error) {
    console.error('BACKEND: Error in getEntityNames:', error);
    return [];
  }
}

/**
 * Generate column-specific reports using Chart Buffet System
 */
function generateColumnReports(entityType, columnId, topN = 10, selectedEntities = []) {
  console.log('🍽️ Chart Buffet v2.1: === generateColumnReports (Fiscal Year Pie) ===');
  console.log('🍽️ Chart Buffet: Creating visualization suite with fiscal year breakdown');
  console.log('🍽️ Chart Buffet Params:', {entityType, columnId, topN, selectedEntitiesCount: selectedEntities.length});
  
  // Use the new Chart Buffet system
  return generateColumnReportsBuffet(entityType, columnId, topN, selectedEntities);
}

/**
 * LEGACY: Generate column-specific reports using DataManager
 * Keeping for backward compatibility
 */
function generateColumnReportsLegacy(entityType, columnId, topN = 10, selectedEntities = []) {
  console.log('🔥 DataManager BACKEND: === generateColumnReports v520 ===');
  console.log('🔥 DataManager BACKEND: Using centralized data layer');
  console.log('🔥 DataManager BACKEND: Params:', {entityType, columnId, topN, selectedEntitiesCount: selectedEntities.length});
  
  try {
    // Get DataManager instance
    const dataManager = getDataManager();
    console.log('DataManager: Instance acquired');
    
    // Define available columns for each entity type
    const availableColumns = {
      agency: [
        {id: 'obligations', name: 'Obligations'},
        {id: 'smallBusiness', name: 'Small Business'},
        {id: 'sumTier', name: 'SUM Tier'},
        {id: 'contractVehicle', name: 'Contract Vehicle'}
      ],
      oem: [
        {id: 'obligations', name: 'Obligations'},
        {id: 'smallBusiness', name: 'Small Business'},
        {id: 'sumTier', name: 'SUM Tier'},
        {id: 'aiProduct', name: 'AI Product'},
        {id: 'reseller', name: 'Reseller'}
      ],
      vendor: [
        {id: 'obligations', name: 'Obligations'},
        {id: 'smallBusiness', name: 'Small Business'},
        {id: 'sumTier', name: 'SUM Tier'},
        {id: 'contractVehicle', name: 'Contract Vehicle'}
      ]
    };

    console.log('DataManager: Available columns for', entityType, ':', availableColumns[entityType]);
    
    const columnInfo = availableColumns[entityType]?.find(col => col.id === columnId);
    if (!columnInfo) {
      console.log(`DataManager ERROR: Column ${columnId} not found for ${entityType}`);
      return [];
    }

    console.log('DataManager: Found column info:', columnInfo);

    // Get entities using DataManager
    const options = {
      entityType: entityType,
      columnId: columnId,
      topN: topN,
      selectedEntities: selectedEntities
    };
    
    // Load entities for report building
    const reportEntities = dataManager.getEntitiesForView('reportBuilder', options);
    console.log(`DataManager: Loaded ${reportEntities.length} entities for report`);
    
    if (reportEntities.length === 0) {
      console.log('DataManager: No entities found, returning empty cards');
      return [];
    }

    // Generate cards for the specific column
    const cards = [];
    
    // Create trend card using DataManager's fiscal year data
    console.log('DataManager: Generating trend card...');
    let trendCard = null;
    try {
      const fiscalYearData = dataManager.getFiscalYearTrends(entityType, columnId, selectedEntities);
      if (Object.keys(fiscalYearData).length > 0) {
        const years = Object.keys(fiscalYearData).sort();
        const values = years.map(year => fiscalYearData[year]);
        
        trendCard = {
          id: `${entityType}_${columnInfo.id}_trend`,
          title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${columnInfo.name} - Fiscal Year Trends`,
          category: entityType,
          cardType: 'trend',
          columnId: columnInfo.id,
          chartType: 'line',
          chartData: {
            labels: years,
            datasets: [{
              label: columnInfo.name,
              data: values,
              borderColor: '#144673',
              backgroundColor: 'rgba(20, 70, 115, 0.1)',
              fill: true
            }]
          },
          tableData: {
            headers: ['Fiscal Year', 'Value'],
            rows: years.map(year => [year, formatCurrency(fiscalYearData[year])])
          },
          summary: {
            totalValue: values.reduce((sum, val) => sum + val, 0),
            avgValue: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0,
            periodCount: years.length
          }
        };
        console.log('DataManager: Trend card created successfully');
      }
    } catch (error) {
      console.error('DataManager: Error creating trend card:', error);
    }
    
    if (trendCard) {
      cards.push(trendCard);
    }
    
    // Create KPI card using report entities
    console.log('DataManager: Generating KPI card...');
    const kpiCard = generateKPICardFromEntities(reportEntities, entityType, columnInfo, topN);
    if (kpiCard) {
      cards.push(kpiCard);
      console.log('DataManager: KPI card created successfully');
    }
    
    // Create distribution card from trend data
    console.log('DataManager: Generating distribution card...');
    if (trendCard) {
      const distributionCard = {
        ...trendCard,
        id: `${entityType}_${columnInfo.id}_distribution`,
        title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${columnInfo.name} - Distribution`,
        chartType: 'bar',
        cardType: 'distribution'
      };
      cards.push(distributionCard);
      console.log('DataManager: Distribution card created');
    }
    
    // Create summary card from KPI data
    console.log('DataManager: Generating summary card...');
    if (kpiCard) {
      const summaryCard = {
        ...kpiCard,
        id: `${entityType}_${columnInfo.id}_summary`,
        title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${columnInfo.name} - Summary`,
        cardType: 'summary'
      };
      cards.push(summaryCard);
      console.log('DataManager: Summary card created');
    }

    console.log(`DataManager: Generated ${cards.length} cards for ${entityType} ${columnId}`);
    
    // Add debug info
    const debugInfo = {
      functionCalled: 'generateColumnReports v520 (DataManager)',
      parameters: {entityType, columnId, topN, selectedEntitiesCount: selectedEntities.length},
      cardsGenerated: cards.length,
      entitiesProcessed: reportEntities.length,
      trendCardGenerated: !!trendCard,
      kpiCardGenerated: !!kpiCard,
      timestamp: new Date().toISOString(),
      dataSource: 'DataManager Cache'
    };
    
    // Add debug info to each card
    cards.forEach(card => {
      if (!card.debugInfo) card.debugInfo = {};
      card.debugInfo.generatedBy = 'generateColumnReports v520 (DataManager)';
      card.debugInfo.parameters = debugInfo.parameters;
      card.debugInfo.dataSource = 'Centralized Cache';
    });
    
    console.log('🔥 DataManager FINAL DEBUG INFO:', debugInfo);
    return ensureSerializable(cards);
    
  } catch (error) {
    console.error('DataManager ERROR in generateColumnReports:', error);
    return [];
  }
}

/**
 * Generate KPI card from pre-processed entities (DataManager version)
 */
function generateKPICardFromEntities(entities, entityType, columnInfo, topN = 10) {
  try {
    console.log(`DataManager KPI: Processing ${entities.length} entities for ${columnInfo.name}`);
    
    if (!entities || entities.length === 0) {
      console.log('DataManager KPI: No entities provided');
      return null;
    }
    
    // Extract values and create top entities list
    let totalValue = 0;
    const topEntities = entities
      .map(entity => ({
        name: entity.name,
        value: entity.value || 0
      }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
    
    totalValue = topEntities.reduce((sum, e) => sum + e.value, 0);
    
    console.log(`DataManager KPI: Created top ${topEntities.length} entities, total value: ${totalValue}`);
    
    const cardId = `${entityType}_${columnInfo.id}_kpi`;
    
    return {
      id: cardId,
      title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${columnInfo.name} - Market Overview`,
      category: entityType,
      cardType: 'kpi',
      columnId: columnInfo.id,
      chartType: 'doughnut',
      chartData: {
        labels: topEntities.map(e => e.name),
        datasets: [{
          data: topEntities.map(e => e.value),
          backgroundColor: ['#0a2240', '#144673', '#3a6ea5', '#f47920', '#ff6b35']
        }]
      },
      tableData: {
        headers: ['Entity', 'Value'],
        rows: topEntities.map(e => [e.name, formatCurrency(e.value)])
      },
      summary: {
        totalValue: totalValue,
        entityCount: topEntities.length,
        avgValue: topEntities.length > 0 ? totalValue / topEntities.length : 0,
        topEntity: topEntities[0]?.name || 'N/A'
      },
      metadata: {
        entityType: entityType,
        columnId: columnInfo.id,
        topN: topN,
        dataSource: 'DataManager'
      }
    };
    
  } catch (error) {
    console.error('DataManager KPI Error:', error);
    return null;
  }
}

/**
 * Generate KPI card for a JSON column
 */
function generateKPICard(spreadsheet, entityType, columnInfo, selectedEntities = [], topN = 10) {
  try {
    console.log('REPORT BUILDER: Generating KPI card for', entityType, columnInfo.name);
    
    // Convert entity type to proper sheet name
    const entityTypeMap = {
      'agency': 'Agency',
      'oem': 'OEM', 
      'vendor': 'Vendor'
    };
    const sheetName = entityTypeMap[entityType.toLowerCase()] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      console.log('REPORT BUILDER: Sheet not found:', entityType.charAt(0).toUpperCase() + entityType.slice(1));
      return null;
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    const columnIndex = getColumnIndexFromLetter(columnInfo.column);
    
    let totalValue = 0;
    let entityCount = 0;
    let topEntities = [];
    
    // Process data starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const entityName = row[1]; // Column B is entity name
      if (!entityName) continue;
      
      // Apply entity filter if specified
      if (selectedEntities.length > 0 && !selectedEntities.includes(entityName)) {
        continue;
      }
      
      entityCount++;
      
      // Parse JSON column data
      const jsonData = parseJSONColumn(row[columnIndex]);
      if (jsonData) {
        const value = extractNumericValue(jsonData);
        totalValue += value;
        
        if (value > 0) {
          topEntities.push({name: entityName, value: value});
        }
      }
    }
    
    // Sort and get top N entities based on user selection
    topEntities.sort((a, b) => b.value - a.value);
    
    // Debug: Log entity count info
    console.log(`KPI CARD DEBUG: Found ${topEntities.length} entities with valid data`);
    console.log(`KPI CARD DEBUG: Requested topN: ${topN}, will slice to: ${topN || 10}`);
    console.log(`KPI CARD DEBUG: Top entities:`, topEntities.slice(0, 15).map(e => ({name: e.name, value: e.value})));
    
    topEntities = topEntities.slice(0, topN || 10);
    
    const cardId = `${entityType}_${columnInfo.id}_kpi`;
    
    return {
      id: cardId,
      title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${columnInfo.name} - Market Overview`,
      category: entityType,
      cardType: 'kpi',
      columnId: columnInfo.id,
      chartType: 'doughnut',
      chartData: {
        labels: topEntities.map(e => e.name),
        datasets: [{
          data: topEntities.map(e => e.value),
          backgroundColor: ['#0a2240', '#144673', '#3a6ea5', '#f47920', '#ff6b35']
        }]
      },
      tableData: {
        headers: ['Rank', 'Entity Name', 'Value', '% of Total'],
        rows: topEntities.map((entity, index) => [
          index + 1,
          entity.name,
          formatCurrency(entity.value),
          ((entity.value / totalValue) * 100).toFixed(1) + '%'
        ])
      },
      kpiMetrics: {
        totalValue: totalValue,
        entityCount: entityCount,
        averageValue: totalValue / entityCount || 0,
        topEntity: topEntities[0]?.name || 'N/A'
      }
    };
    
  } catch (error) {
    console.error(`Error generating KPI card for ${entityType} ${columnInfo.name}:`, error);
    return null;
  }
}

/**
 * Generate trend card for a JSON column
 */
function generateTrendCard(spreadsheet, entityType, columnInfo, selectedEntities = []) {
  console.log('🚨 BACKEND TREND: === FUNCTION START - ENTRY POINT HIT ===');
  console.log('🚨 BACKEND TREND: Function called successfully!');
  console.log('🚨 BACKEND TREND: Called with entityType:', entityType);
  console.log('🚨 BACKEND TREND: Called with columnInfo:', columnInfo);
  console.log('🚨 BACKEND TREND: Called with selectedEntities:', selectedEntities);
  console.log('🚨 BACKEND TREND: spreadsheet object exists:', !!spreadsheet);
  
  try {
    // Convert entity type to proper sheet name
    const entityTypeMap = {
      'agency': 'Agency',
      'oem': 'OEM', 
      'vendor': 'Vendor'
    };
    const sheetName = entityTypeMap[entityType.toLowerCase()] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
    console.log('BACKEND TREND: Attempting to access sheet:', sheetName);
    
    const sheet = spreadsheet.getSheetByName(sheetName);
    console.log('BACKEND TREND: Sheet found?', !!sheet);
    
    if (!sheet) {
      console.log('BACKEND TREND: ERROR - Sheet not found, returning null');
      return null;
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    const columnIndex = getColumnIndexFromLetter(columnInfo.column);
    
    // Aggregate fiscal year data
    const fiscalYearData = {};
    
    console.log('BACKEND TREND: Column ID:', columnInfo.id);
    console.log('BACKEND TREND: Column letter:', columnInfo.column);
    console.log('BACKEND TREND: Column index:', columnIndex);
    console.log('BACKEND TREND: Total rows:', values.length);
    console.log('BACKEND TREND: First 3 rows sample:', values.slice(0, 3));
    console.log('BACKEND: Generating trend card for entities:', selectedEntities.length > 0 ? selectedEntities : 'ALL ENTITIES');
    
    let totalRowsProcessed = 0;
    let filteredRows = 0;
    let jsonParseSuccesses = 0;
    let fiscalYearFoundCount = 0;
    
    // Process data starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const entityName = row[1]; // Column B is entity name
      if (!entityName) continue;
      
      totalRowsProcessed++;
      
      // Apply entity filter if specified
      if (selectedEntities.length > 0 && !selectedEntities.includes(entityName)) {
        continue;
      }
      
      filteredRows++;
      
      // Debug the raw column data
      if (filteredRows <= 3) {
        console.log(`BACKEND TREND: Row ${i} entity "${entityName}" raw column data:`, row[columnIndex]);
      }
      
      // Parse JSON column data
      const jsonData = parseJSONColumn(row[columnIndex]);
      
      if (jsonData) {
        jsonParseSuccesses++;
        if (filteredRows <= 3) {
          console.log(`BACKEND TREND: Row ${i} parsed JSON:`, jsonData);
          console.log(`BACKEND TREND: Row ${i} JSON keys:`, Object.keys(jsonData));
          console.log(`BACKEND TREND: Row ${i} has fiscal_year_breakdown?`, !!jsonData.fiscal_year_breakdown);
        }
      }
      if (jsonData && (jsonData.fiscal_year_obligations || jsonData.fiscal_year_breakdown || jsonData.fiscal_years || jsonData.yearly_totals)) {
        const fyData = jsonData.fiscal_year_obligations || jsonData.fiscal_year_breakdown || jsonData.fiscal_years || jsonData.yearly_totals;
        fiscalYearFoundCount++;
        if (fiscalYearFoundCount <= 3) {
          console.log(`BACKEND TREND: Row ${i} fiscal year data:`, fyData);
        }
        for (const [fy, value] of Object.entries(fyData)) {
          if (!fiscalYearData[fy]) fiscalYearData[fy] = 0;
          fiscalYearData[fy] += parseFloat(value) || 0;
        }
      }
    }
    
    // Sort fiscal years and prepare chart data
    const sortedFYs = Object.keys(fiscalYearData).sort();
    const chartLabels = sortedFYs;
    const chartValues = sortedFYs.map(fy => fiscalYearData[fy]);
    
    const cardId = `${entityType}_${columnInfo.id}_trend`;
    
    const result = {
      id: cardId,
      title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${columnInfo.name} - Fiscal Year Trends`,
      category: entityType,
      cardType: 'trend',
      columnId: columnInfo.id,
      chartType: 'line',
      chartData: {
        labels: chartLabels,
        datasets: [{
          label: columnInfo.name,
          data: chartValues,
          borderColor: '#144673',
          backgroundColor: 'rgba(20, 70, 115, 0.1)',
          tension: 0.4
        }]
      },
      tableData: {
        headers: ['Fiscal Year', 'Total Value', 'YoY Change', '% Change'],
        rows: chartLabels.map((fy, index) => {
          const currentValue = chartValues[index];
          const previousValue = index > 0 ? chartValues[index - 1] : null;
          const change = previousValue ? currentValue - previousValue : null;
          const percentChange = previousValue ? ((change / previousValue) * 100).toFixed(1) + '%' : '--';
          
          return [
            fy,
            formatCurrency(currentValue),
            change ? (change >= 0 ? '+' : '') + formatCurrency(change) : '--',
            percentChange
          ];
        })
      }
    };
    
    console.log(`BACKEND TREND: Rows processed: ${totalRowsProcessed}, Filtered rows: ${filteredRows}`);
    console.log(`BACKEND TREND: JSON parse successes: ${jsonParseSuccesses}, Fiscal year found: ${fiscalYearFoundCount}`);
    console.log('BACKEND TREND: Final fiscalYearData:', fiscalYearData);
    console.log('BACKEND: Final tableData rows:', result.tableData.rows.length);
    console.log('BACKEND: Final chartData labels:', result.chartData.labels);
    console.log('BACKEND: Final chartData values:', result.chartData.datasets[0].data);
    
    return result;
    
  } catch (error) {
    console.error('BACKEND TREND: === ERROR CAUGHT ===');
    console.error(`BACKEND TREND: Error generating trend card for ${entityType} ${columnInfo.name}:`, error);
    console.error('BACKEND TREND: Error stack:', error.stack);
    return null;
  }
}

/**
 * Helper function to get column index from letter (A=0, B=1, etc.)
 */
function getColumnIndexFromLetter(letter) {
  return letter.charCodeAt(0) - 65;
}

/**
 * Helper function to extract numeric value from JSON data
 */
function extractNumericValue(jsonData) {
  if (typeof jsonData === 'number') return jsonData;
  if (jsonData.total_obligated) return parseFloat(jsonData.total_obligated) || 0;
  if (jsonData.total_obligations) return parseFloat(jsonData.total_obligations) || 0;
  if (jsonData.total) return parseFloat(jsonData.total) || 0;
  if (jsonData.sum) return parseFloat(jsonData.sum) || 0;
  
  // Sum fiscal year breakdown if available
  if (jsonData.fiscal_year_breakdown) {
    return Object.values(jsonData.fiscal_year_breakdown)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }
  
  return 0;
}

/**
 * Helper function to format currency
 */
function formatCurrency(value) {
  if (value >= 1000000000) {
    return '$' + (value / 1000000000).toFixed(1) + 'B';
  } else if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  } else {
    return '$' + value.toFixed(0);
  }
}

/**
 * Get filter options for report builder
 */
function getReportBuilderFilters(entityType = null) {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const entities = new Set();
    const parents = new Set();
    
    // Process specific entity type or all types
    const entityTypes = entityType ? 
      [entityType.charAt(0).toUpperCase() + entityType.slice(1)] : 
      ['Agency', 'OEM', 'Vendor'];
      
    entityTypes.forEach(sheetName => {
      try {
        const sheet = spreadsheet.getSheetByName(sheetName);
        if (!sheet) return;
        
        const range = sheet.getDataRange();
        const values = range.getValues();
        
        // Process data starting from row 2 (skip header)
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          const entityName = row[1]; // Column B is entity name
          const parentName = row[2]; // Column C is parent/department
          
          if (entityName && entityName.trim() !== '') {
            entities.add(entityName.trim());
          }
          
          if (parentName && parentName.trim() !== '') {
            parents.add(parentName.trim());
          }
        }
      } catch (error) {
        console.error(`Error processing ${sheetName} sheet for filters:`, error);
      }
    });
    
    return {
      entities: Array.from(entities).sort(),
      parents: Array.from(parents).sort()
    };
    
  } catch (error) {
    console.error('Error in getReportBuilderFilters:', error);
    return {
      entities: [],
      parents: []
    };
  }
}

/**
 * Get filtered report builder data
 */
function getFilteredReportBuilderData(entityFilter, parentFilter) {
  try {
    const allCards = getReportBuilderData();
    
    if (!entityFilter && !parentFilter) {
      return allCards;
    }
    
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Generate filtered cards for each entity type
    const filteredCards = [];
    
    for (const card of allCards) {
      if (card.category && (entityFilter || parentFilter)) {
        const filteredCard = generateFilteredCard(spreadsheet, card, entityFilter, parentFilter);
        if (filteredCard) {
          filteredCards.push(filteredCard);
        }
      } else {
        filteredCards.push(card);
      }
    }
    
    return filteredCards;
    
  } catch (error) {
    console.error('Error in getFilteredReportBuilderData:', error);
    return getReportBuilderData(); // Fallback to unfiltered data
  }
}

/**
 * Generate filtered card with specific entity/parent data
 */
function generateFilteredCard(spreadsheet, originalCard, entityFilter, parentFilter) {
  try {
    const sheet = spreadsheet.getSheetByName(originalCard.category.charAt(0).toUpperCase() + originalCard.category.slice(1));
    if (!sheet) return originalCard;
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    const columnIndex = getColumnIndexFromLetter(getColumnLetterFromId(originalCard.columnId));
    
    let filteredData = [];
    
    // Process data starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const entityName = row[1]; // Column B is entity name
      const parentName = row[2]; // Column C is parent/department
      
      if (!entityName) continue;
      
      // Apply filters
      if (entityFilter && entityName !== entityFilter) continue;
      if (parentFilter && parentName !== parentFilter) continue;
      
      filteredData.push({
        name: entityName,
        parent: parentName,
        jsonData: parseJSONColumn(row[columnIndex])
      });
    }
    
    if (filteredData.length === 0) return null;
    
    // Regenerate card with filtered data
    if (originalCard.cardType === 'kpi') {
      return regenerateKPICardWithData(originalCard, filteredData);
    } else {
      return regenerateTrendCardWithData(originalCard, filteredData);
    }
    
  } catch (error) {
    console.error('Error generating filtered card:', error);
    return originalCard;
  }
}

/**
 * Helper function to get column letter from column ID
 */
function getColumnLetterFromId(columnId) {
  const columnMap = {
    'obligations': 'D',
    'smallBusiness': 'E',
    'sumTier': 'F',
    'sumType': 'G',
    'contractVehicle': 'H',
    'fundingDepartment': 'I',
    'discount': 'J',
    'discountOfferings': 'N',
    'aiProduct': 'O',
    'topBicProducts': 'Q',
    'reseller': 'R',
    'fundingAgency': 'V'
  };
  return columnMap[columnId] || 'D';
}

/**
 * Regenerate KPI card with filtered data
 */
function regenerateKPICardWithData(originalCard, filteredData) {
  let totalValue = 0;
  let topEntities = [];
  
  for (const item of filteredData) {
    if (item.jsonData) {
      const value = extractNumericValue(item.jsonData);
      totalValue += value;
      
      if (value > 0) {
        topEntities.push({name: item.name, value: value});
      }
    }
  }
  
  topEntities.sort((a, b) => b.value - a.value);
  topEntities = topEntities.slice(0, 5);
  
  return {
    ...originalCard,
    chartData: {
      ...originalCard.chartData,
      labels: topEntities.map(e => e.name),
      datasets: [{
        ...originalCard.chartData.datasets[0],
        data: topEntities.map(e => e.value)
      }]
    },
    tableData: {
      ...originalCard.tableData,
      rows: topEntities.map((entity, index) => [
        index + 1,
        entity.name,
        formatCurrency(entity.value),
        ((entity.value / totalValue) * 100).toFixed(1) + '%'
      ])
    },
    kpiMetrics: {
      totalValue: totalValue,
      entityCount: filteredData.length,
      averageValue: totalValue / filteredData.length || 0,
      topEntity: topEntities[0]?.name || 'N/A'
    }
  };
}

/**
 * Regenerate trend card with filtered data
 */
function regenerateTrendCardWithData(originalCard, filteredData) {
  const fiscalYearData = {};
  
  for (const item of filteredData) {
    if (item.jsonData && item.jsonData.fiscal_year_breakdown) {
      for (const [fy, value] of Object.entries(item.jsonData.fiscal_year_breakdown)) {
        if (!fiscalYearData[fy]) fiscalYearData[fy] = 0;
        fiscalYearData[fy] += parseFloat(value) || 0;
      }
    }
  }
  
  const sortedFYs = Object.keys(fiscalYearData).sort();
  const chartValues = sortedFYs.map(fy => fiscalYearData[fy]);
  
  return {
    ...originalCard,
    chartData: {
      ...originalCard.chartData,
      labels: sortedFYs,
      datasets: [{
        ...originalCard.chartData.datasets[0],
        data: chartValues
      }]
    },
    tableData: {
      ...originalCard.tableData,
      rows: sortedFYs.map((fy, index) => {
        const currentValue = chartValues[index];
        const previousValue = index > 0 ? chartValues[index - 1] : null;
        const change = previousValue ? currentValue - previousValue : null;
        const percentChange = previousValue ? ((change / previousValue) * 100).toFixed(1) + '%' : '--';
        
        return [
          fy,
          formatCurrency(currentValue),
          change ? (change >= 0 ? '+' : '') + formatCurrency(change) : '--',
          percentChange
        ];
      })
    }
  };
}