/**
 * OneGov FIT Market - Data Processing Functions
 * Functions for processing and transforming entity data
 */

/**
 * Process entity JSON data for charts and display
 */
function processEntityData(entity) {
    if (!entity) return null;
    
    const processed = {
        fiscalYearData: {},
        tierData: {},
        resellerData: {},
        contractData: {},
        agencyData: {},
        aiData: {},
        totalObligations: entity.totalObligations || 0
    };
    
    // Process fiscal year obligations
    if (entity.fiscalYearObligations) {
        processed.fiscalYearData = entity.fiscalYearObligations;
    } else if (entity.obligations && entity.obligations.fiscal_year_obligations) {
        processed.fiscalYearData = entity.obligations.fiscal_year_obligations;
    }
    
    // Process tier data
    if (entity.sumTier && entity.sumTier.tier_summaries) {
        processed.tierData = entity.sumTier.tier_summaries;
    } else if (entity.oneGovTier && entity.oneGovTier.tier_breakdown) {
        processed.tierData = entity.oneGovTier.tier_breakdown;
    }
    
    // Process reseller data
    if (entity.resellers) {
        processed.resellerData = entity.resellers;
    }
    
    // Process funding agencies as "customers"
    if (entity.fundingAgency && entity.fundingAgency.top_10_agency_summaries) {
        processed.agencyData = entity.fundingAgency.top_10_agency_summaries;
    }
    
    // Process contract vehicles
    if (entity.contractVehicle) {
        processed.contractData = entity.contractVehicle;
    }
    
    return processed;
}

/**
 * Dynamically detect available fiscal years from any JSON structure
 */
function detectFiscalYears(jsonData) {
    const years = new Set();
    
    // Check top-level fiscal year fields
    const fiscalData = jsonData?.fiscal_year_obligations || jsonData?.fiscal_years || 
                      jsonData?.yearly_totals || jsonData?.fiscal_year_summaries;
    
    if (fiscalData && typeof fiscalData === 'object') {
        Object.keys(fiscalData).forEach(year => {
            if (/^\d{4}$/.test(year)) { // Check if it's a 4-digit year
                years.add(year);
            }
        });
    }
    
    // Check nested structures like summaries
    if (jsonData) {
        Object.values(jsonData).forEach(value => {
            if (typeof value === 'object' && value?.fiscal_years) {
                Object.keys(value.fiscal_years).forEach(year => {
                    if (/^\d{4}$/.test(year)) {
                        years.add(year);
                    }
                });
            }
        });
    }
    
    // Return sorted array of years, fallback to default if none found
    return years.size > 0 ? Array.from(years).sort() : ['2022', '2023', '2024', '2025'];
}

/**
 * Extract fiscal year data from various JSON structures
 */
function extractFiscalYearData(jsonData) {
    if (!jsonData) return null;
    if (jsonData.fiscal_year_obligations) return jsonData.fiscal_year_obligations;
    if (jsonData.fiscal_years) return jsonData.fiscal_years;
    if (jsonData.yearly_totals) return jsonData.yearly_totals;
    
    // Look in nested objects
    for (const key in jsonData) {
        if (typeof jsonData[key] === 'object' && jsonData[key]?.fiscal_years) {
            return jsonData[key].fiscal_years;
        }
    }
    return null;
}

/**
 * Process and aggregate data for summary calculations
 */
function aggregateEntityData(entities) {
    if (!entities || !Array.isArray(entities)) return null;
    
    const summary = {
        totalEntities: entities.length,
        totalObligations: 0,
        totalContracts: 0,
        fiscalYears: new Set(),
        businessSizes: {},
        entityTypes: {}
    };
    
    entities.forEach(entity => {
        // Sum total obligations
        if (entity.totalObligations) {
            summary.totalObligations += entity.totalObligations;
        }
        
        // Count contracts
        if (entity.contractCount) {
            summary.totalContracts += entity.contractCount;
        }
        
        // Collect fiscal years
        const fiscalYears = detectFiscalYears(entity);
        fiscalYears.forEach(year => summary.fiscalYears.add(year));
        
        // Categorize business sizes
        if (entity.businessSize) {
            const category = getBusinessSizeCategory(entity.businessSize);
            summary.businessSizes[category] = (summary.businessSizes[category] || 0) + 1;
        }
        
        // Categorize entity types
        if (entity.type) {
            summary.entityTypes[entity.type] = (summary.entityTypes[entity.type] || 0) + 1;
        }
    });
    
    summary.fiscalYears = Array.from(summary.fiscalYears).sort();
    
    return summary;
}

/**
 * Transform data for chart consumption
 */
function transformDataForChart(data, chartType = 'bar') {
    if (!data || typeof data !== 'object') return null;
    
    const transformed = {
        labels: [],
        values: [],
        colors: []
    };
    
    Object.entries(data).forEach(([key, value], index) => {
        if (typeof value === 'number') {
            transformed.labels.push(cleanLabel(key));
            transformed.values.push(value);
            transformed.colors.push(getChartColor(index));
        } else if (typeof value === 'object' && value !== null) {
            // Handle nested objects
            const total = Object.values(value).reduce((sum, val) => {
                return sum + (typeof val === 'number' ? val : 0);
            }, 0);
            if (total > 0) {
                transformed.labels.push(cleanLabel(key));
                transformed.values.push(total);
                transformed.colors.push(getChartColor(index));
            }
        }
    });
    
    return transformed.labels.length > 0 ? transformed : null;
}

/**
 * Process USAi profile data for entity details
 */
function processUSAiProfile(entity) {
    if (!entity || !entity.usaiProfile) return null;
    
    console.log(`📝 USAI PROFILE DEBUG: Processing "${entity.name}" profile:`, {
        hasProfile: !!entity.usaiProfile,
        profileKeys: entity.usaiProfile ? Object.keys(entity.usaiProfile) : 'N/A',
        hasOverview: !!entity.usaiProfile?.overview,
        overviewLength: entity.usaiProfile?.overview?.length || 0,
        hasWebsite: !!entity.usaiProfile?.website,
        hasLinkedIn: !!entity.usaiProfile?.linkedin
    });
    
    return {
        overview: entity.usaiProfile.overview || 'No overview available',
        website: entity.usaiProfile.website || '',
        linkedin: entity.usaiProfile.linkedin || '',
        employees: entity.usaiProfile.employees || 'N/A',
        founded: entity.usaiProfile.founded || 'N/A',
        headquarters: entity.usaiProfile.headquarters || 'N/A'
    };
}