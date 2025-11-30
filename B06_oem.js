/**
 * OEM-specific functions - B04_oem.js
 * Functions for working with OEM data from Google Sheets
 */

/**
 * Get OEM entities with proper column mappings
 */
function getOEMEntities() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('OEM');
    
    if (!sheet) {
      throw new Error('OEM sheet not found');
    }
    
    // Get data range including column AF (32 columns: A-AF)
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(1, 1, lastRow, 32); // 32 columns: A(1) to AF(32)
    const values = range.getValues();
    console.log(`🔍 OEM Sheet: Reading ${lastRow} rows x 32 columns (A-AF)`);
    
    const oems = [];
    
    // Process each row (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Column B (index 1) is OEM name
      const name = row[1];
      if (!name || name.trim() === '') continue;
      
      const oem = {
        id: `oem_${i}`,
        name: name,
        type: 'oem',
        duns: row[0], // Column A
        parentCompany: row[2], // Column C
      };
      
      // Parse Obligations (Column D)
      const obligations = parseJSONColumn(row[3]);
      if (obligations) {
        oem.obligations = obligations;
        // Extract total
        if (obligations.summary?.total_obligations) {
          oem.totalObligations = obligations.summary.total_obligations;
        } else if (obligations.total_obligated) {
          oem.totalObligations = obligations.total_obligated;
        } else if (obligations.fiscal_year_breakdown) {
          // Sum up fiscal years
          let total = 0;
          for (const year in obligations.fiscal_year_breakdown) {
            const yearData = obligations.fiscal_year_breakdown[year];
            if (yearData.obligations) total += yearData.obligations;
          }
          oem.totalObligations = total;
        }
      }
      
      // Parse Small Business (Column E)
      const smallBusiness = parseJSONColumn(row[4]);
      if (smallBusiness) {
        oem.smallBusiness = smallBusiness;
        // Extract small business percentage
        if (smallBusiness.business_size_summaries?.['SMALL BUSINESS']) {
          oem.smallBusinessPercentage = smallBusiness.business_size_summaries['SMALL BUSINESS'].percentage_of_total;
        }
      }
      
      // Parse OneGov Tier (Column X)
      const oneGovTier = parseJSONColumn(row[23]);
      if (oneGovTier) {
        oem.oneGovTier = oneGovTier;
        oem.tier = oneGovTier.mode_tier || oneGovTier.overall_tier;
        if (!oem.totalObligations && oneGovTier.total_obligated) {
          oem.totalObligations = oneGovTier.total_obligated;
        }
      }
      
      // Parse Contract Vehicle (Column H)
      const contractVehicle = parseJSONColumn(row[7]);
      if (contractVehicle) {
        oem.contractVehicle = contractVehicle;
        // Count top contracts
        if (contractVehicle.top_contract_summaries) {
          oem.contractVehicleCount = Object.keys(contractVehicle.top_contract_summaries).length;
        }
      }
      
      // Parse AI Product (Column O)
      const aiProduct = parseJSONColumn(row[14]);
      if (aiProduct) {
        oem.aiProduct = aiProduct;
        oem.hasAIProducts = aiProduct.ai_product_status === 'Active AI Products';
        oem.aiProductCount = aiProduct.unique_products || 0;
      }
      
      // Parse Discount (Column J)
      const discount = parseJSONColumn(row[9]);
      if (discount) {
        oem.discount = discount;
        oem.hasDiscounts = discount.discount_status === 'Active Discounts';
      }
      
      // Parse Reseller (Column R)
      const reseller = parseJSONColumn(row[17]);
      if (reseller) {
        oem.reseller = reseller;
        if (reseller.top_15_reseller_summaries) {
          oem.topResellers = Object.keys(reseller.top_15_reseller_summaries).slice(0, 5);
        }
      }
      
      // Add timestamps
      oem.fasTimestamp = row[25]; // Column Z
      oem.bicTimestamp = row[27]; // Column AB
      
      // Add OneGov indicator (Column AF - index 31)
      // AF is the 32nd column (0-based index 31)
      const oneGovValue = row[31]; // Now guaranteed to have 32 columns
      
      const isOneGovValue = row[31]; // Column AF
      console.log(`📊 "${name}": AF[31]="${isOneGovValue}"`);

      if (isOneGovValue && String(isOneGovValue).trim().toLowerCase() === 'yes') {
        oem.isOneGov = true;
        console.log(`✅ ${name} isOneGov=true`);
      } else {
        oem.isOneGov = false;
      }
      
      oems.push(oem);
    }
    
    return createResponse(true, oems, null);
  } catch (error) {
    console.error('Error getting OEM entities:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Get detailed OEM data by ID
 */
function getOEMDetails(oemId) {
  try {
    const response = getOEMEntities();
    const oems = JSON.parse(response.getContent()).data;
    const oem = oems.find(o => o.id === oemId);
    
    if (!oem) {
      throw new Error('OEM not found: ' + oemId);
    }
    
    return createResponse(true, oem, null);
  } catch (error) {
    console.error('Error getting OEM details:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Get OEM analytics summary
 */
function getOEMAnalytics() {
  try {
    const response = getOEMEntities();
    const oems = JSON.parse(response.getContent()).data;
    
    const analytics = {
      totalOEMs: oems.length,
      totalObligations: 0,
      tierDistribution: {},
      aiAdoption: 0,
      discountProviders: 0,
      topOEMs: []
    };
    
    // Process each OEM
    oems.forEach(oem => {
      // Sum obligations
      if (oem.totalObligations) {
        analytics.totalObligations += oem.totalObligations;
      }
      
      // Count tiers
      if (oem.tier) {
        analytics.tierDistribution[oem.tier] = (analytics.tierDistribution[oem.tier] || 0) + 1;
      }
      
      // Count AI adoption
      if (oem.hasAIProducts) {
        analytics.aiAdoption++;
      }
      
      // Count discount providers
      if (oem.hasDiscounts) {
        analytics.discountProviders++;
      }
    });
    
    // Get top 10 OEMs by obligations
    analytics.topOEMs = oems
      .filter(o => o.totalObligations)
      .sort((a, b) => b.totalObligations - a.totalObligations)
      .slice(0, 10)
      .map(o => ({
        name: o.name,
        obligations: o.totalObligations,
        tier: o.tier
      }));
    
    // Calculate percentages
    analytics.aiAdoptionRate = ((analytics.aiAdoption / analytics.totalOEMs) * 100).toFixed(1) + '%';
    analytics.discountRate = ((analytics.discountProviders / analytics.totalOEMs) * 100).toFixed(1) + '%';
    
    return createResponse(true, analytics, null);
  } catch (error) {
    console.error('Error getting OEM analytics:', error);
    return createResponse(false, null, error.toString());
  }
}