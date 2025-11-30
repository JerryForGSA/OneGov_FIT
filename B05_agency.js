/**
 * Agency-specific functions - B03_agency.js
 * Functions for working with Agency data from Google Sheets
 */

/**
 * Get agency entities with proper column mappings
 */
function getAgencyEntities() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Agency');
    
    if (!sheet) {
      throw new Error('Agency sheet not found');
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    const agencies = [];
    
    // Process each row (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Column B (index 1) is Agency name
      const name = row[1];
      if (!name || name.trim() === '') continue;
      
      const agency = {
        id: `agency_${i}`,
        name: name,
        type: 'agency',
        agencyCode: row[0], // Column A - Agency Code
        department: row[2], // Column C - Parent/Department
      };
      
      // Parse Obligations (Column D)
      const obligations = parseJSONColumn(row[3]);
      if (obligations) {
        agency.obligations = obligations;
        // Extract total
        if (obligations.summary?.total_obligations) {
          agency.totalObligations = obligations.summary.total_obligations;
        } else if (obligations.total_obligated) {
          agency.totalObligations = obligations.total_obligated;
        } else if (obligations.fiscal_year_breakdown) {
          // Sum up fiscal years
          let total = 0;
          for (const year in obligations.fiscal_year_breakdown) {
            const yearData = obligations.fiscal_year_breakdown[year];
            if (yearData.obligations) total += yearData.obligations;
          }
          agency.totalObligations = total;
        }
      }
      
      // Parse Small Business (Column E)
      const smallBusiness = parseJSONColumn(row[4]);
      if (smallBusiness) {
        agency.smallBusiness = smallBusiness;
        // Extract small business percentage
        if (smallBusiness.business_size_summaries?.['SMALL BUSINESS']) {
          agency.smallBusinessPercentage = smallBusiness.business_size_summaries['SMALL BUSINESS'].percentage_of_total;
        }
      }
      
      // Parse OneGov Tier (Column X)
      const oneGovTier = parseJSONColumn(row[23]);
      if (oneGovTier) {
        agency.oneGovTier = oneGovTier;
        agency.tier = oneGovTier.mode_tier || oneGovTier.overall_tier;
        if (!agency.totalObligations && oneGovTier.total_obligated) {
          agency.totalObligations = oneGovTier.total_obligated;
        }
      }
      
      // Parse Contract Vehicle (Column H)
      const contractVehicle = parseJSONColumn(row[7]);
      if (contractVehicle) {
        agency.contractVehicle = contractVehicle;
        // Count top contracts
        if (contractVehicle.top_contract_summaries) {
          agency.contractVehicleCount = Object.keys(contractVehicle.top_contract_summaries).length;
        }
      }
      
      // Parse AI Product (Column O)
      const aiProduct = parseJSONColumn(row[14]);
      if (aiProduct) {
        agency.aiProduct = aiProduct;
        agency.hasAIProducts = aiProduct.ai_product_status === 'Active AI Products';
        agency.aiProductCount = aiProduct.unique_products || 0;
      }
      
      // Parse Discount (Column J)
      const discount = parseJSONColumn(row[9]);
      if (discount) {
        agency.discount = discount;
        agency.hasDiscounts = discount.discount_status === 'Active Discounts';
      }
      
      // Parse Reseller/OEM (Column R)
      const reseller = parseJSONColumn(row[17]);
      if (reseller) {
        agency.reseller = reseller;
        if (reseller.top_15_reseller_summaries) {
          agency.topOEMs = Object.keys(reseller.top_15_reseller_summaries).slice(0, 5);
        }
      }
      
      // Parse Funding Agency (Column V)
      const fundingAgency = parseJSONColumn(row[21]);
      if (fundingAgency) {
        agency.fundingAgency = fundingAgency;
        // This shows which agencies are funding this agency
      }
      
      // Parse Funding Department (Column I)
      const fundingDepartment = parseJSONColumn(row[8]);
      if (fundingDepartment) {
        agency.fundingDepartment = fundingDepartment;
      }
      
      // Add timestamps
      agency.fasTimestamp = row[25]; // Column Z
      agency.bicTimestamp = row[27]; // Column AB
      
      agencies.push(agency);
    }
    
    return createResponse(true, agencies, null);
  } catch (error) {
    console.error('Error getting agency entities:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Get detailed agency data by ID
 */
function getAgencyDetails(agencyId) {
  try {
    const response = getAgencyEntities();
    const agencies = JSON.parse(response.getContent()).data;
    const agency = agencies.find(a => a.id === agencyId);
    
    if (!agency) {
      throw new Error('Agency not found: ' + agencyId);
    }
    
    return createResponse(true, agency, null);
  } catch (error) {
    console.error('Error getting agency details:', error);
    return createResponse(false, null, error.toString());
  }
}

/**
 * Get agency analytics summary
 */
function getAgencyAnalytics() {
  try {
    const response = getAgencyEntities();
    const agencies = JSON.parse(response.getContent()).data;
    
    const analytics = {
      totalAgencies: agencies.length,
      totalObligations: 0,
      tierDistribution: {},
      departmentDistribution: {},
      aiAdoption: 0,
      discountUsers: 0,
      topAgencies: []
    };
    
    // Process each agency
    agencies.forEach(agency => {
      // Sum obligations
      if (agency.totalObligations) {
        analytics.totalObligations += agency.totalObligations;
      }
      
      // Count tiers
      if (agency.tier) {
        analytics.tierDistribution[agency.tier] = (analytics.tierDistribution[agency.tier] || 0) + 1;
      }
      
      // Count departments
      if (agency.department) {
        analytics.departmentDistribution[agency.department] = (analytics.departmentDistribution[agency.department] || 0) + 1;
      }
      
      // Count AI adoption
      if (agency.hasAIProducts) {
        analytics.aiAdoption++;
      }
      
      // Count discount users
      if (agency.hasDiscounts) {
        analytics.discountUsers++;
      }
    });
    
    // Get top 10 agencies by obligations
    analytics.topAgencies = agencies
      .filter(a => a.totalObligations)
      .sort((a, b) => b.totalObligations - a.totalObligations)
      .slice(0, 10)
      .map(a => ({
        name: a.name,
        agencyCode: a.agencyCode,
        department: a.department,
        obligations: a.totalObligations,
        tier: a.tier
      }));
    
    // Calculate percentages
    analytics.aiAdoptionRate = ((analytics.aiAdoption / analytics.totalAgencies) * 100).toFixed(1) + '%';
    analytics.discountUsageRate = ((analytics.discountUsers / analytics.totalAgencies) * 100).toFixed(1) + '%';
    
    return createResponse(true, analytics, null);
  } catch (error) {
    console.error('Error getting agency analytics:', error);
    return createResponse(false, null, error.toString());
  }
}