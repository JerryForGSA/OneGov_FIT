/**
 * Vendor-specific functions - B05_vendor.js
 * Functions for working with Vendor data from Google Sheets
 */

/**
 * Get vendor entities with proper column mappings
 */
function getVendorEntities() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Vendor');
    
    if (!sheet) {
      throw new Error('Vendor sheet not found');
    }
    
    // Get data range including column AF and beyond (35 columns: A-AI)
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(1, 1, lastRow, 35); // 35 columns: A(1) to AI(35) to include AC
    const values = range.getValues();
    console.log(`🔍 Vendor Sheet: Reading ${lastRow} rows x 35 columns (A-AI)`);
    
    const vendors = [];
    
    // Process each row (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Column B (index 1) is Vendor name
      const name = row[1];
      if (!name || name.trim() === '') continue;
      
      const vendor = {
        id: `vendor_${i}`,
        name: name,
        type: 'vendor',
        uei: row[0], // Column A - UEI
        parentCompany: row[2], // Column C
      };
      
      // Parse Obligations (Column D)
      const obligations = parseJSONColumn(row[3]);
      if (obligations) {
        vendor.obligations = obligations;
        // Extract total
        if (obligations.summary?.total_obligations) {
          vendor.totalObligations = obligations.summary.total_obligations;
        } else if (obligations.total_obligated) {
          vendor.totalObligations = obligations.total_obligated;
        } else if (obligations.fiscal_year_breakdown) {
          // Sum up fiscal years
          let total = 0;
          for (const year in obligations.fiscal_year_breakdown) {
            const yearData = obligations.fiscal_year_breakdown[year];
            if (yearData.obligations) total += yearData.obligations;
          }
          vendor.totalObligations = total;
        }
      }
      
      // Parse Small Business (Column E)
      const smallBusiness = parseJSONColumn(row[4]);
      if (smallBusiness) {
        vendor.smallBusiness = smallBusiness;
        // Extract small business percentage
        if (smallBusiness.business_size_summaries?.['SMALL BUSINESS']) {
          vendor.smallBusinessPercentage = smallBusiness.business_size_summaries['SMALL BUSINESS'].percentage_of_total;
        }
      }
      
      // Parse OneGov Tier (Column X)
      const oneGovTier = parseJSONColumn(row[23]);
      if (oneGovTier) {
        vendor.oneGovTier = oneGovTier;
        vendor.tier = oneGovTier.mode_tier || oneGovTier.overall_tier;
        if (!vendor.totalObligations && oneGovTier.total_obligated) {
          vendor.totalObligations = oneGovTier.total_obligated;
        }
      }
      
      // Parse Contract Vehicle (Column H)
      const contractVehicle = parseJSONColumn(row[7]);
      if (contractVehicle) {
        vendor.contractVehicle = contractVehicle;
        // Count top contracts
        if (contractVehicle.top_contract_summaries) {
          vendor.contractVehicleCount = Object.keys(contractVehicle.top_contract_summaries).length;
        }
      }
      
      // Parse AI Product (Column O)
      const aiProduct = parseJSONColumn(row[14]);
      if (aiProduct) {
        vendor.aiProduct = aiProduct;
        vendor.hasAIProducts = aiProduct.ai_product_status === 'Active AI Products';
        vendor.aiProductCount = aiProduct.unique_products || 0;
      }
      
      // Parse Discount (Column J)
      const discount = parseJSONColumn(row[9]);
      if (discount) {
        vendor.discount = discount;
        vendor.hasDiscounts = discount.discount_status === 'Active Discounts';
      }
      
      // Parse Funding Department (Column I)
      const fundingDepartment = parseJSONColumn(row[8]);
      if (fundingDepartment) {
        vendor.fundingDepartment = fundingDepartment;
      }
      
      // Parse Reseller (Column R)
      const reseller = parseJSONColumn(row[17]);
      if (reseller) {
        vendor.reseller = reseller;
        if (reseller.top_15_reseller_summaries) {
          vendor.topOEMs = Object.keys(reseller.top_15_reseller_summaries).slice(0, 5);
        }
      }
      
      // Parse Funding Agency (Column V - index 21, but dataManager uses 1-based so it's actually index 21)
      const fundingAgency = parseJSONColumn(row[21]);
      if (fundingAgency) {
        vendor.fundingAgency = fundingAgency;
        if (fundingAgency.top_10_agency_summaries) {
          vendor.topAgencies = Object.keys(fundingAgency.top_10_agency_summaries).slice(0, 5);
        }
      }
      
      // Add timestamps
      vendor.fasTimestamp = row[25]; // Column Z
      vendor.bicTimestamp = row[27]; // Column AB
      
      // Add OneGov indicator (Column AF - index 31)
      // AF is the 32nd column (0-based index 31)
      const oneGovValue = row[31]; // Now guaranteed to have 32 columns
      
      const isOneGovValue = row[31]; // Column AF
      console.log(`📊 "${name}": AF[31]="${isOneGovValue}"`);

      if (isOneGovValue && String(isOneGovValue).trim().toLowerCase() === 'yes') {
        vendor.isOneGov = true;
        console.log(`✅ ${name} isOneGov=true`);
      } else {
        vendor.isOneGov = false;
      }
      
      // Parse USAi Profile (Column AC - index 28)
      const usaiProfileRaw = row[28];
      console.log(`🔍 "${name}": Raw AC[28] = "${usaiProfileRaw}"`);
      const usaiProfile = parseJSONColumn(row[28]);
      if (usaiProfile) {
        vendor.usaiProfile = usaiProfile;
        console.log(`📝 "${name}": USAi Profile found with overview: ${usaiProfile.overview ? 'Yes' : 'No'}`);
        if (usaiProfile.overview) {
          console.log(`📄 "${name}": Overview length: ${usaiProfile.overview.length} chars`);
        }
      } else {
        console.log(`❌ "${name}": No USAi Profile found in AC[28]`);
      }
      
      vendors.push(vendor);
    }
    
    return createResponse(true, vendors, null);
  } catch (error) {
    console.error('Error getting vendor entities:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Get detailed vendor data by ID
 */
function getVendorDetails(vendorId) {
  try {
    const response = getVendorEntities();
    const vendors = JSON.parse(response.getContent()).data;
    const vendor = vendors.find(v => v.id === vendorId);
    
    if (!vendor) {
      throw new Error('Vendor not found: ' + vendorId);
    }
    
    return createResponse(true, vendor, null);
  } catch (error) {
    console.error('Error getting vendor details:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Get vendor analytics summary
 */
function getVendorAnalytics() {
  try {
    const response = getVendorEntities();
    const vendors = JSON.parse(response.getContent()).data;
    
    const analytics = {
      totalVendors: vendors.length,
      totalObligations: 0,
      tierDistribution: {},
      aiAdoption: 0,
      discountProviders: 0,
      topVendors: [],
      parentCompanies: {}
    };
    
    // Process each vendor
    vendors.forEach(vendor => {
      // Sum obligations
      if (vendor.totalObligations) {
        analytics.totalObligations += vendor.totalObligations;
      }
      
      // Count tiers
      if (vendor.tier) {
        analytics.tierDistribution[vendor.tier] = (analytics.tierDistribution[vendor.tier] || 0) + 1;
      }
      
      // Count AI adoption
      if (vendor.hasAIProducts) {
        analytics.aiAdoption++;
      }
      
      // Count discount providers
      if (vendor.hasDiscounts) {
        analytics.discountProviders++;
      }
      
      // Count parent companies
      if (vendor.parentCompany) {
        analytics.parentCompanies[vendor.parentCompany] = (analytics.parentCompanies[vendor.parentCompany] || 0) + 1;
      }
    });
    
    // Get top 10 vendors by obligations
    analytics.topVendors = vendors
      .filter(v => v.totalObligations)
      .sort((a, b) => b.totalObligations - a.totalObligations)
      .slice(0, 10)
      .map(v => ({
        name: v.name,
        uei: v.uei,
        obligations: v.totalObligations,
        tier: v.tier
      }));
    
    // Calculate percentages
    analytics.aiAdoptionRate = ((analytics.aiAdoption / analytics.totalVendors) * 100).toFixed(1) + '%';
    analytics.discountRate = ((analytics.discountProviders / analytics.totalVendors) * 100).toFixed(1) + '%';
    
    return createResponse(true, analytics, null);
  } catch (error) {
    console.error('Error getting vendor analytics:', error);
    return createResponse(false, null, error.toString());
  }
}