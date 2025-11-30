/**
 * Apps Script Compatible Functions - B10_SimpleCompatible.js
 * Simple functions that return data directly (no wrapper functions)
 */

/**
 * Get OEM data - Apps Script compatible
 */
function getOEMs() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('OEM');
    
    if (!sheet) {
      return { error: 'OEM sheet not found' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    console.log('DEBUG getOEMs: Total rows found:', values.length);
    
    const oems = [];
    
    // Process rows starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) { // Load all data
      const row = values[i];
      
      const name = row[1]; // Column B - OEM name
      if (!name || name.trim() === '') {
        console.log('DEBUG getOEMs: Skipping row', i, '- empty name');
        continue;
      }
      
      const oem = {
        id: 'oem_' + i,
        name: name,
        type: 'oem',
        duns: row[0] || 'N/A', // Column A - DUNS
        parentCompany: row[2] || 'N/A' // Column C - Parent
      };
      
      // Parse Obligations (Column D - index 3) - Rich fiscal year data
      if (row[3]) {
        try {
          const obligationsData = JSON.parse(row[3]);
          if (obligationsData) {
            oem.obligations = obligationsData;
            
            // Multiple ways to extract total obligations
            if (obligationsData.summary && obligationsData.summary.total_obligations) {
              oem.totalObligations = obligationsData.summary.total_obligations;
            } else if (obligationsData.total_obligated) {
              oem.totalObligations = obligationsData.total_obligated;
            } else if (obligationsData.fiscal_year_obligations) {
              // Sum all fiscal years
              let total = 0;
              for (const year in obligationsData.fiscal_year_obligations) {
                total += obligationsData.fiscal_year_obligations[year] || 0;
              }
              oem.totalObligations = total;
            }
            
            // Extract fiscal year data for trending charts
            if (obligationsData.fiscal_year_obligations) {
              oem.fiscalYearObligations = obligationsData.fiscal_year_obligations;
              oem.fiscalYearTrend = calculateYearOverYearGrowth(obligationsData.fiscal_year_obligations);
            }
          }
        } catch (e) {
          oem.totalObligations = 0;
        }
      }
      
      // Parse SUM Tier (Column F - index 5) - Tier distribution
      if (row[5]) {
        try {
          const sumTierData = JSON.parse(row[5]);
          if (sumTierData) {
            oem.sumTier = sumTierData;
            oem.tierDistribution = extractTierDistribution(sumTierData);
            oem.topTiers = getTopItems(sumTierData, 5);
            
            // Extract primary tier and total from SUM Tier data too
            if (sumTierData.tier_summaries) {
              let maxTotal = 0;
              let primaryTier = 'N/A';
              for (const tierName in sumTierData.tier_summaries) {
                const tierInfo = sumTierData.tier_summaries[tierName];
                if (tierInfo.total && tierInfo.total > maxTotal) {
                  maxTotal = tierInfo.total;
                  primaryTier = tierName;
                }
              }
              if (!oem.tier || oem.tier === 'N/A') {
                oem.tier = primaryTier;
              }
              
              // Use summary total if available and not already set
              if (sumTierData.summary && sumTierData.summary.total_all_obligations && !oem.totalObligations) {
                oem.totalObligations = sumTierData.summary.total_all_obligations;
              }
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Sum Type (Column G - index 6) - Type distribution
      if (row[6]) {
        try {
          const sumTypeData = JSON.parse(row[6]);
          if (sumTypeData) {
            oem.sumType = sumTypeData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Contract Vehicle (Column H - index 7) - Contract types
      if (row[7]) {
        try {
          const contractData = JSON.parse(row[7]);
          if (contractData) {
            oem.contractVehicle = contractData;
            oem.topContracts = getTopItems(contractData, 5);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Reseller data (Column R - index 17) - Top resellers
      if (row[17]) {
        try {
          const resellerData = JSON.parse(row[17]);
          if (resellerData) {
            oem.resellers = resellerData;
            oem.topResellers = getTopItems(resellerData, 10);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Funding Agency (Column V - index 21) - Top agencies
      if (row[21]) {
        try {
          const fundingAgencyData = JSON.parse(row[21]);
          if (fundingAgencyData) {
            oem.fundingAgency = fundingAgencyData;
            oem.topAgencies = getTopItems(fundingAgencyData, 10);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse OneGov Tier (Column X - index 23) - Tier classification with new structure
      if (row[23]) {
        try {
          const tierData = JSON.parse(row[23]);
          if (tierData) {
            oem.oneGovTier = tierData;
            
            // Extract tier using new structure - prioritize mode_tier
            if (tierData.mode_tier) {
              oem.tier = tierData.mode_tier;
            } else if (tierData.overall_tier) {
              oem.tier = tierData.overall_tier;
            } else if (tierData.tier_summaries) {
              // Fallback to old structure
              let maxTotal = 0;
              let primaryTier = 'N/A';
              for (const tierName in tierData.tier_summaries) {
                const tierInfo = tierData.tier_summaries[tierName];
                if (tierInfo.total && tierInfo.total > maxTotal) {
                  maxTotal = tierInfo.total;
                  primaryTier = tierName;
                }
              }
              oem.tier = primaryTier;
            }
            
            // Extract average obligations per year
            if (tierData.average_obligations_per_year) {
              oem.averageObligationsPerYear = tierData.average_obligations_per_year;
            }
            
            // Extract total obligations from new structure
            if (tierData.total_obligated) {
              oem.tierObligations = tierData.total_obligated;
              // Use tier obligations as total if main total not set
              if (!oem.totalObligations) {
                oem.totalObligations = tierData.total_obligated;
              }
            } else if (tierData.summary && tierData.summary.total_all_obligations) {
              oem.tierObligations = tierData.summary.total_all_obligations;
            } else if (tierData.tier_summaries) {
              // Fallback to old structure
              let total = 0;
              for (const tierName in tierData.tier_summaries) {
                const tierInfo = tierData.tier_summaries[tierName];
                if (tierInfo.total) {
                  total += tierInfo.total;
                }
              }
              oem.tierObligations = total;
            }
            
            // Extract fiscal year data from new structure
            if (tierData.fiscal_year_tiers) {
              const fiscalYearData = {};
              for (const year in tierData.fiscal_year_tiers) {
                fiscalYearData[year] = tierData.fiscal_year_tiers[year].amount;
              }
              // Use this as fiscal year obligations if not already set
              if (!oem.fiscalYearObligations) {
                oem.fiscalYearObligations = fiscalYearData;
                oem.fiscalYearTrend = calculateYearOverYearGrowth(fiscalYearData);
              }
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Top Ref_PIID for contract references (Column K - index 10)
      if (row[10]) {
        try {
          const refPiidData = JSON.parse(row[10]);
          if (refPiidData) {
            oem.topRefPiid = refPiidData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Top PIID (Column L - index 11)
      if (row[11]) {
        try {
          const piidData = JSON.parse(row[11]);
          if (piidData) {
            oem.topPiid = piidData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Small Business data (Column E - index 4)
      if (row[4]) {
        try {
          const smallBizData = JSON.parse(row[4]);
          if (smallBizData) {
            oem.smallBusiness = smallBizData;
            if (smallBizData.small_business_percentage) {
              oem.smallBusinessPercent = smallBizData.small_business_percentage;
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Discount data (Column J - index 9)
      if (row[9]) {
        try {
          const discountData = JSON.parse(row[9]);
          if (discountData) {
            oem.discounts = discountData;
            oem.topDiscounts = getTopItems(discountData, 5);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse AI Product (Column O - index 14)
      if (row[14]) {
        try {
          const aiProductData = JSON.parse(row[14]);
          if (aiProductData) {
            oem.aiProduct = aiProductData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse AI Categories (Column P - index 15)
      if (row[15]) {
        try {
          const aiCategoriesData = JSON.parse(row[15]);
          if (aiCategoriesData) {
            oem.aiCategories = aiCategoriesData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse BIC Products (Column Q - index 16)
      if (row[16]) {
        try {
          console.log('🔧 BACKEND OEM: Parsing topBicProducts for', oem.name, 'from Column Q:', row[16].substring(0, 200) + '...');
          const topBicProductsData = JSON.parse(row[16]);
          if (topBicProductsData) {
            oem.topBicProducts = topBicProductsData;
            console.log('🔧 BACKEND OEM: Successfully parsed topBicProducts for', oem.name);
          }
        } catch (e) {
          console.log('🔧 BACKEND OEM: Failed to parse topBicProducts for', oem.name, 'Error:', e.toString());
        }
      } else {
        console.log('🔧 BACKEND OEM: No topBicProducts data in Column Q for', oem.name);
      }
      
      // Parse BIC OEM (Column T - index 19)
      if (row[19]) {
        try {
          const bicOemData = JSON.parse(row[19]);
          if (bicOemData) {
            oem.bicOem = bicOemData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse USAi Profile data for entity bio (need to find correct column)
      // This might be in a different column - let's check multiple columns for profile data
      for (let colIndex = 24; colIndex < 28; colIndex++) {
        if (row[colIndex]) {
          try {
            const profileData = JSON.parse(row[colIndex]);
            if (profileData && (profileData.oem_name || profileData.company_name || profileData.overview)) {
              oem.profile = profileData;
              oem.biography = profileData.overview || profileData.description;
              oem.founded = profileData.founded;
              oem.employees = profileData.employees;
              oem.headquarters = profileData.headquarters;
              oem.stockSymbol = profileData.stock_symbol;
              oem.ownership = profileData.ownership;
              oem.coreProducts = profileData.core_products;
              oem.technologyFocus = profileData.technology_focus;
              oem.websiteUrl = profileData.website_url;
              oem.linkedinUrl = profileData.linkedin_url;
              break;
            }
          } catch (e) {
            // Continue checking other columns
          }
        }
      }
      
      // OneGov check - Column AF (index 31)
      const isOneGovValue = row[31]; // Column AF
      console.log(`📊 "${name}": AF[31]="${isOneGovValue}"`);

      if (isOneGovValue && String(isOneGovValue).trim().toLowerCase() === 'yes') {
        oem.isOneGov = true;
        console.log(`✅ ${name} isOneGov=true`);
      } else {
        oem.isOneGov = false;
      }
      
      // Add FAS/BIC table URLs - Columns Y (24) and AA (26)
      const fasUrl = row[24]; // Column Y 
      const bicUrl = row[26]; // Column AA
      
      if (name && (name.toLowerCase().includes('adobe') || name.toLowerCase().includes('box'))) {
        console.log(`🔍 ${name} FAS/BIC URLs - Row length: ${row.length}, FAS[24]: "${fasUrl}", BIC[26]: "${bicUrl}"`);
      }
      
      oem.fasTableUrl = fasUrl && fasUrl.trim() ? fasUrl.trim() : '';
      oem.bicTableUrl = bicUrl && bicUrl.trim() ? bicUrl.trim() : '';
      
      if (oem.fasTableUrl) {
        console.log(`🔍 FAS URL found for ${name}: ${oem.fasTableUrl.substring(0, 80)}...`);
      }
      if (oem.bicTableUrl) {
        console.log(`🔍 BIC URL found for ${name}: ${oem.bicTableUrl.substring(0, 80)}...`);
      }
      
      oems.push(oem);
    }
    
    console.log('DEBUG getOEMs: Returning', oems.length, 'OEMs');
    return oems;
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Get Agency data - Apps Script compatible
 */
function getAgencies() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Agency');
    
    if (!sheet) {
      return { error: 'Agency sheet not found' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    console.log('DEBUG getAgencies: Total rows found:', values.length);
    const agencies = [];
    
    // Process rows starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) { // Load all data
      try {
        const row = values[i];
        
        // Debug every 10th row to track progress
        if (i % 10 === 0) {
          console.log('DEBUG getAgencies: Processing row', i, 'name:', row[1]);
        }
        
        const name = row[1]; // Column B - Agency name
        if (!name || name.trim() === '') {
          console.log('DEBUG getAgencies: Skipping row', i, '- empty name, continuing...');
          continue;
        }
      
      const agency = {
        id: 'agency_' + i,
        name: name,
        type: 'agency',
        agencyCode: row[0] || 'N/A', // Column A - Agency Code
        department: row[2] || 'N/A' // Column C - Department
      };
      
      // Parse Obligations (Column D - index 3) - Rich fiscal year data
      if (row[3]) {
        try {
          const obligationsData = JSON.parse(row[3]);
          if (obligationsData) {
            agency.obligations = obligationsData;
            
            // Extract total obligations
            if (obligationsData.total_obligated) {
              agency.totalObligations = obligationsData.total_obligated;
            } else if (obligationsData.summary && obligationsData.summary.total_obligations) {
              agency.totalObligations = obligationsData.summary.total_obligations;
            } else if (obligationsData.fiscal_year_obligations) {
              // Sum all fiscal years
              let total = 0;
              for (const year in obligationsData.fiscal_year_obligations) {
                total += obligationsData.fiscal_year_obligations[year] || 0;
              }
              agency.totalObligations = total;
            }
            
            // Extract fiscal year data for trending charts
            if (obligationsData.fiscal_year_obligations) {
              agency.fiscalYearObligations = obligationsData.fiscal_year_obligations;
              agency.fiscalYearTrend = calculateYearOverYearGrowth(obligationsData.fiscal_year_obligations);
            }
          }
        } catch (e) {
          agency.totalObligations = 0;
        }
      }
      
      // Parse SUM Tier (Column F - index 5) - Tier distribution 
      if (row[5]) {
        try {
          const sumTierData = JSON.parse(row[5]);
          if (sumTierData) {
            agency.sumTier = sumTierData;
            agency.tierDistribution = extractTierDistribution(sumTierData);
            agency.topTiers = getTopItems(sumTierData, 5);
            
            // Extract primary tier and total from SUM Tier data too
            if (sumTierData.tier_summaries) {
              let maxTotal = 0;
              let primaryTier = 'N/A';
              for (const tierName in sumTierData.tier_summaries) {
                const tierInfo = sumTierData.tier_summaries[tierName];
                if (tierInfo.total && tierInfo.total > maxTotal) {
                  maxTotal = tierInfo.total;
                  primaryTier = tierName;
                }
              }
              if (!agency.tier || agency.tier === 'N/A') {
                agency.tier = primaryTier;
              }
              
              // Use summary total if available and not already set
              if (sumTierData.summary && sumTierData.summary.total_all_obligations && !agency.totalObligations) {
                agency.totalObligations = sumTierData.summary.total_all_obligations;
              }
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Sum Type (Column G - index 6) - Type distribution for agencies
      if (row[6]) {
        try {
          const sumTypeData = JSON.parse(row[6]);
          if (sumTypeData) {
            agency.sumType = sumTypeData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Contract Vehicle (Column H - index 7) - Contract types
      if (row[7]) {
        try {
          const contractData = JSON.parse(row[7]);
          if (contractData) {
            agency.contractVehicle = contractData;
            agency.topContracts = getTopItems(contractData, 5);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Top Ref_PIID (Column K - index 10) for agencies
      if (row[10]) {
        try {
          const refPiidData = JSON.parse(row[10]);
          if (refPiidData) {
            agency.topRefPiid = refPiidData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Top PIID (Column L - index 11) for agencies
      if (row[11]) {
        try {
          const piidData = JSON.parse(row[11]);
          if (piidData) {
            agency.topPiid = piidData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse AI Product (Column O - index 14) for agencies
      if (row[14]) {
        try {
          const aiProductData = JSON.parse(row[14]);
          if (aiProductData) {
            agency.aiProduct = aiProductData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse AI Categories (Column P - index 15) for agencies
      if (row[15]) {
        try {
          const aiCategoriesData = JSON.parse(row[15]);
          if (aiCategoriesData) {
            agency.aiCategories = aiCategoriesData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse BIC Products (Column Q - index 16) for agencies
      if (row[16]) {
        try {
          const topBicProductsData = JSON.parse(row[16]);
          if (topBicProductsData) {
            agency.topBicProducts = topBicProductsData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse BIC OEM (Column T - index 19) for agencies
      if (row[19]) {
        try {
          const bicOemData = JSON.parse(row[19]);
          if (bicOemData) {
            agency.bicOem = bicOemData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Funding Agency (Column V - index 21) - Top vendors for agencies
      if (row[21]) {
        try {
          const fundingAgencyData = JSON.parse(row[21]);
          if (fundingAgencyData) {
            agency.fundingAgency = fundingAgencyData;
            agency.topVendors = getTopItems(fundingAgencyData, 10);
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse OneGov Tier (Column X - index 23) - Tier classification with new structure
      if (row[23]) {
        try {
          const tierData = JSON.parse(row[23]);
          if (tierData) {
            agency.oneGovTier = tierData;
            
            // Extract tier using new structure - prioritize mode_tier
            if (tierData.mode_tier) {
              agency.tier = tierData.mode_tier;
            } else if (tierData.overall_tier) {
              agency.tier = tierData.overall_tier;
            } else if (tierData.tier_summaries) {
              // Fallback to old structure
              let maxTotal = 0;
              let primaryTier = 'N/A';
              for (const tierName in tierData.tier_summaries) {
                const tierInfo = tierData.tier_summaries[tierName];
                if (tierInfo.total && tierInfo.total > maxTotal) {
                  maxTotal = tierInfo.total;
                  primaryTier = tierName;
                }
              }
              agency.tier = primaryTier;
            }
            
            // Extract average obligations per year
            if (tierData.average_obligations_per_year) {
              agency.averageObligationsPerYear = tierData.average_obligations_per_year;
            }
            
            // Extract total obligations from new structure
            if (tierData.total_obligated) {
              agency.tierObligations = tierData.total_obligated;
              // Use tier obligations as total if main total not set
              if (!agency.totalObligations) {
                agency.totalObligations = tierData.total_obligated;
              }
            } else if (tierData.summary && tierData.summary.total_all_obligations) {
              agency.tierObligations = tierData.summary.total_all_obligations;
            } else if (tierData.tier_summaries) {
              // Fallback to old structure
              let total = 0;
              for (const tierName in tierData.tier_summaries) {
                const tierInfo = tierData.tier_summaries[tierName];
                if (tierInfo.total) {
                  total += tierInfo.total;
                }
              }
              agency.tierObligations = total;
            }
            
            // Extract fiscal year data from new structure
            if (tierData.fiscal_year_tiers) {
              const fiscalYearData = {};
              for (const year in tierData.fiscal_year_tiers) {
                fiscalYearData[year] = tierData.fiscal_year_tiers[year].amount;
              }
              // Use this as fiscal year obligations if not already set
              if (!agency.fiscalYearObligations) {
                agency.fiscalYearObligations = fiscalYearData;
                agency.fiscalYearTrend = calculateYearOverYearGrowth(fiscalYearData);
              }
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      agencies.push(agency);
      } catch (rowError) {
        console.error('DEBUG getAgencies: Error processing row', i, ':', rowError.toString());
        // Continue to next row instead of stopping
      }
    }
    
    console.log('DEBUG getAgencies: Returning', agencies.length, 'agencies');
    return agencies;
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Get Vendor data - Apps Script compatible
 */
function getVendors() {
  try {
    const SPREADSHEET_ID = '18h0TYPAPiWCKPB09v7kChoICQOELJSLBfwaZwpYheXE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('Vendor');
    
    if (!sheet) {
      return { error: 'Vendor sheet not found' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    const vendors = [];
    
    // Process rows starting from row 2 (skip header)
    for (let i = 1; i < values.length; i++) { // Load all data
      const row = values[i];
      
      const name = row[1]; // Column B - Vendor name
      if (!name || name.trim() === '') continue;
      
      const vendor = {
        id: 'vendor_' + i,
        name: name,
        type: 'vendor',
        uei: row[0] || 'N/A', // Column A - UEI
        parentCompany: row[2] || 'N/A' // Column C - Parent
      };
      
      // Parse Obligations (Column D - index 3) - Rich fiscal year data
      if (row[3]) {
        try {
          const obligationsData = JSON.parse(row[3]);
          if (obligationsData) {
            vendor.obligations = obligationsData;
            
            // Multiple ways to extract total obligations
            if (obligationsData.summary && obligationsData.summary.total_obligations) {
              vendor.totalObligations = obligationsData.summary.total_obligations;
            } else if (obligationsData.total_obligated) {
              vendor.totalObligations = obligationsData.total_obligated;
            } else if (obligationsData.fiscal_year_obligations) {
              // Sum all fiscal years
              let total = 0;
              for (const year in obligationsData.fiscal_year_obligations) {
                total += obligationsData.fiscal_year_obligations[year] || 0;
              }
              vendor.totalObligations = total;
            }
            
            // Extract fiscal year data for trending charts
            if (obligationsData.fiscal_year_obligations) {
              vendor.fiscalYearObligations = obligationsData.fiscal_year_obligations;
              vendor.fiscalYearTrend = calculateYearOverYearGrowth(obligationsData.fiscal_year_obligations);
            }
          }
        } catch (e) {
          vendor.totalObligations = 0;
        }
      }
      
      // Parse SUM Tier (Column F - index 5) - Tier distribution
      if (row[5]) {
        try {
          const sumTierData = JSON.parse(row[5]);
          if (sumTierData) {
            vendor.sumTier = sumTierData;
            vendor.tierDistribution = extractTierDistribution(sumTierData);
            vendor.topTiers = getTopItems(sumTierData, 5);
            
            // Extract primary tier and total from SUM Tier data too
            if (sumTierData.tier_summaries) {
              let maxTotal = 0;
              let primaryTier = 'N/A';
              for (const tierName in sumTierData.tier_summaries) {
                const tierInfo = sumTierData.tier_summaries[tierName];
                if (tierInfo.total && tierInfo.total > maxTotal) {
                  maxTotal = tierInfo.total;
                  primaryTier = tierName;
                }
              }
              if (!vendor.tier || vendor.tier === 'N/A') {
                vendor.tier = primaryTier;
              }
              
              // Use summary total if available and not already set
              if (sumTierData.summary && sumTierData.summary.total_all_obligations && !vendor.totalObligations) {
                vendor.totalObligations = sumTierData.summary.total_all_obligations;
              }
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Sum Type (Column G - index 6) - Type distribution for vendors
      if (row[6]) {
        try {
          const sumTypeData = JSON.parse(row[6]);
          if (sumTypeData) {
            vendor.sumType = sumTypeData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Reseller data for vendor obligations (Column R - index 17)
      if (row[17]) {
        try {
          const resellerData = JSON.parse(row[17]);
          if (resellerData) {
            vendor.vendorObligations = resellerData; // This replaces agency obligations for vendors
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse OneGov Tier (Column X - index 23) - Tier classification with new structure
      if (row[23]) {
        try {
          const tierData = JSON.parse(row[23]);
          if (tierData) {
            vendor.oneGovTier = tierData;
            
            // Extract tier using new structure - prioritize mode_tier
            if (tierData.mode_tier) {
              vendor.tier = tierData.mode_tier;
            } else if (tierData.overall_tier) {
              vendor.tier = tierData.overall_tier;
            } else if (tierData.tier_summaries) {
              // Fallback to old structure
              let maxTotal = 0;
              let primaryTier = 'N/A';
              for (const tierName in tierData.tier_summaries) {
                const tierInfo = tierData.tier_summaries[tierName];
                if (tierInfo.total && tierInfo.total > maxTotal) {
                  maxTotal = tierInfo.total;
                  primaryTier = tierName;
                }
              }
              vendor.tier = primaryTier;
            }
            
            // Extract average obligations per year
            if (tierData.average_obligations_per_year) {
              vendor.averageObligationsPerYear = tierData.average_obligations_per_year;
            }
            
            // Extract total obligations from new structure
            if (tierData.total_obligated) {
              vendor.tierObligations = tierData.total_obligated;
              // Use tier obligations as total if main total not set
              if (!vendor.totalObligations) {
                vendor.totalObligations = tierData.total_obligated;
              }
            } else if (tierData.summary && tierData.summary.total_all_obligations) {
              vendor.tierObligations = tierData.summary.total_all_obligations;
            } else if (tierData.tier_summaries) {
              // Fallback to old structure
              let total = 0;
              for (const tierName in tierData.tier_summaries) {
                const tierInfo = tierData.tier_summaries[tierName];
                if (tierInfo.total) {
                  total += tierInfo.total;
                }
              }
              vendor.tierObligations = total;
            }
            
            // Extract fiscal year data from new structure
            if (tierData.fiscal_year_tiers) {
              const fiscalYearData = {};
              for (const year in tierData.fiscal_year_tiers) {
                fiscalYearData[year] = tierData.fiscal_year_tiers[year].amount;
              }
              // Use this as fiscal year obligations if not already set
              if (!vendor.fiscalYearObligations) {
                vendor.fiscalYearObligations = fiscalYearData;
                vendor.fiscalYearTrend = calculateYearOverYearGrowth(fiscalYearData);
              }
            }
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Top Ref_PIID (Column K - index 10) for vendors
      if (row[10]) {
        try {
          const refPiidData = JSON.parse(row[10]);
          if (refPiidData) {
            vendor.topRefPiid = refPiidData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse Top PIID (Column L - index 11) for vendors
      if (row[11]) {
        try {
          const piidData = JSON.parse(row[11]);
          if (piidData) {
            vendor.topPiid = piidData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse AI Product (Column O - index 14) for vendors
      if (row[14]) {
        try {
          const aiProductData = JSON.parse(row[14]);
          if (aiProductData) {
            vendor.aiProduct = aiProductData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse AI Categories (Column P - index 15) for vendors
      if (row[15]) {
        try {
          const aiCategoriesData = JSON.parse(row[15]);
          if (aiCategoriesData) {
            vendor.aiCategories = aiCategoriesData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse BIC Products (Column Q - index 16) for vendors
      if (row[16]) {
        try {
          const topBicProductsData = JSON.parse(row[16]);
          if (topBicProductsData) {
            vendor.topBicProducts = topBicProductsData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // Parse BIC OEM (Column T - index 19) for vendors
      if (row[19]) {
        try {
          const bicOemData = JSON.parse(row[19]);
          if (bicOemData) {
            vendor.bicOem = bicOemData;
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
      
      // OneGov check - Column AF (index 31)
      const isOneGovValue = row[31]; // Column AF
      console.log(`📊 "${name}": AF[31]="${isOneGovValue}"`);

      if (isOneGovValue && String(isOneGovValue).trim().toLowerCase() === 'yes') {
        vendor.isOneGov = true;
        console.log(`✅ ${name} isOneGov=true`);
      } else {
        vendor.isOneGov = false;
      }
      
      vendors.push(vendor);
    }
    
    return vendors;
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Get cross-sheet summary - Apps Script compatible
 */
function getSummaryData() {
  try {
    const oems = getOEMs();
    const vendors = getVendors();
    const agencies = getAgencies();
    
    // Check for errors
    if (oems.error) return { error: 'OEM error: ' + oems.error };
    if (vendors.error) return { error: 'Vendor error: ' + vendors.error };
    if (agencies.error) return { error: 'Agency error: ' + agencies.error };
    
    // Calculate totals
    let totalOemObligations = 0;
    let totalVendorObligations = 0;
    let totalAgencyObligations = 0;
    
    for (let i = 0; i < oems.length; i++) {
      if (oems[i].totalObligations) {
        totalOemObligations += oems[i].totalObligations;
      }
    }
    
    for (let i = 0; i < vendors.length; i++) {
      if (vendors[i].totalObligations) {
        totalVendorObligations += vendors[i].totalObligations;
      }
    }
    
    for (let i = 0; i < agencies.length; i++) {
      if (agencies[i].totalObligations) {
        totalAgencyObligations += agencies[i].totalObligations;
      }
    }
    
    return {
      counts: {
        oems: oems.length,
        vendors: vendors.length,
        agencies: agencies.length,
        total: oems.length + vendors.length + agencies.length
      },
      obligations: {
        oems: totalOemObligations,
        vendors: totalVendorObligations,
        agencies: totalAgencyObligations,
        total: totalOemObligations + totalVendorObligations + totalAgencyObligations
      },
      topOEMs: oems.slice(0, 5),
      topVendors: vendors.slice(0, 5),
      topAgencies: agencies.slice(0, 5)
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Calculate year-over-year growth from fiscal year obligations
 */
function calculateYearOverYearGrowth(fiscalYearData) {
  const years = Object.keys(fiscalYearData).sort();
  const growth = {};
  
  for (let i = 1; i < years.length; i++) {
    const currentYear = years[i];
    const previousYear = years[i - 1];
    const current = fiscalYearData[currentYear] || 0;
    const previous = fiscalYearData[previousYear] || 0;
    
    if (previous > 0) {
      growth[currentYear] = ((current - previous) / previous * 100).toFixed(1);
    }
  }
  
  return growth;
}

/**
 * Extract tier distribution from SUM Tier JSON
 */
function extractTierDistribution(tierData) {
  const distribution = {};
  
  // Handle new tier structure with tier_summaries
  if (tierData.tier_summaries) {
    for (const key in tierData.tier_summaries) {
      if (tierData.tier_summaries.hasOwnProperty(key)) {
        const item = tierData.tier_summaries[key];
        distribution[key] = {
          total: item.total || 0,
          percentage: item.percentage_of_total || item.percentage || 0,
          contracts: item.contracts || 0,
          fiscalYears: item.fiscal_years || {}
        };
      }
    }
  } else {
    // Fallback to original structure
    for (const key in tierData) {
      if (tierData.hasOwnProperty(key) && typeof tierData[key] === 'object') {
        const item = tierData[key];
        distribution[key] = {
          total: item.total || item.count || 0,
          percentage: item.percentage || 0,
          contracts: item.contracts || 0
        };
      }
    }
  }
  
  return distribution;
}

/**
 * Extract top N items from any JSON object by value
 */
function getTopItems(jsonData, limit) {
  const items = [];
  
  // Handle tier structure with tier_summaries
  let dataToProcess = jsonData;
  if (jsonData.tier_summaries) {
    dataToProcess = jsonData.tier_summaries;
  }
  
  for (const key in dataToProcess) {
    if (dataToProcess.hasOwnProperty(key)) {
      const item = dataToProcess[key];
      
      if (typeof item === 'object' && item !== null) {
        // Extract value from different possible fields
        // For tier data, use total. For others, try total, obligations, amount, count
        const value = item.total || item.obligations || item.amount || item.count || 0;
        const percentage = item.percentage_of_total || item.percentage || 0;
        
        items.push({
          name: key,
          value: value,
          percentage: percentage,
          fiscal_years: item.fiscal_years || {},
          contracts: item.contracts || 0,
          raw: item
        });
      } else if (typeof item === 'number') {
        items.push({
          name: key,
          value: item,
          percentage: 0,
          fiscal_years: {},
          contracts: 0
        });
      }
    }
  }
  
  // Sort by value descending and take top N
  items.sort((a, b) => b.value - a.value);
  return items.slice(0, limit);
}

/**
 * Calculate percentage distribution for chart displays
 */
function calculatePercentageDistribution(items) {
  const total = items.reduce((sum, item) => sum + (item.value || 0), 0);
  
  return items.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : 0
  }));
}

/**
 * Process small business data for pie charts
 */
function processSmallBusinessData(smallBizData) {
  if (!smallBizData) return null;
  
  const processed = {
    smallBusiness: 0,
    other: 0,
    smallBusinessPercent: 0,
    fiscalYears: {}
  };
  
  // Handle different JSON structures
  if (smallBizData.small_business && smallBizData.other) {
    processed.smallBusiness = smallBizData.small_business;
    processed.other = smallBizData.other;
    processed.smallBusinessPercent = smallBizData.small_business_percentage || 0;
  }
  
  if (smallBizData.fiscal_years) {
    processed.fiscalYears = smallBizData.fiscal_years;
  }
  
  return processed;
}