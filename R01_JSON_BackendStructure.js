/**
 * ============================================================================
 * B01_JSON_STRUCTURES.gs - COMPREHENSIVE JSON SCHEMA REFERENCE
 * ============================================================================
 * 
 * OneGov FIT Market Backend - Complete JSON Structure Documentation
 * Version: 2.0.0
 * Last Updated: 2025-11
 * 
 * PURPOSE:
 * This file provides a complete, programmatic reference for all JSON columns
 * in the OneGov FIT Backend sheets (Agencies, OEM, Vendor). It enables:
 * 
 * 1. DETERMINISTIC DATA EXTRACTION - No more guessing property names
 * 2. VALIDATION - Verify JSON data matches expected structure
 * 3. DOCUMENTATION - Human-readable reference for all columns
 * 4. TYPE SAFETY - Know exactly what data types to expect
 * 
 * SHEETS COVERED (all use identical JSON structures):
 * - Agencies (Column A=DUNS, B=Agency, C=Department)
 * - OEM (Column A=DUNS, B=OEM, C=Parent)  
 * - Vendor (Column A=DUNS, B=Vendor, C=Parent)
 * 
 * JSON COLUMNS: 22 total (D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, AC)
 * NON-JSON COLUMNS: A, B, C (identifiers), Y, Z, AA, AB (URLs/timestamps), AD, AE (URLs)
 * 
 * ============================================================================
 * TABLE OF CONTENTS
 * ============================================================================
 * 
 * SECTION 1: COLUMN_SCHEMAS - Complete schema definitions for all 22 JSON columns
 * SECTION 2: STRUCTURE_PATTERNS - The 5 distinct JSON patterns used
 * SECTION 3: COMPLETE_EXAMPLES - Full real JSON examples for each column
 * SECTION 4: EXTRACTION_HELPERS - Functions to extract data by schema
 * SECTION 5: VALIDATION_FUNCTIONS - Verify JSON matches expected structure  
 * SECTION 6: QUICK_REFERENCE - Cheat sheet for common operations
 * 
 * ============================================================================
 * STRUCTURE PATTERNS OVERVIEW (5 patterns across 22 columns)
 * ============================================================================
 * 
 * PATTERN_A_SIMPLE_TOTALS (2 columns: D, X)
 *   - Direct properties at root level
 *   - No nested summary object
 *   - Example: { total_obligated: 1234, fiscal_year_obligations: {...} }
 * 
 * PATTERN_B_SUMMARY_WITH_OBJECT_MAP (9 columns: E, F, G, H, I, J, R, U, V)
 *   - Has summary object with totals
 *   - Categories stored as OBJECT with named keys
 *   - Example: { summary: {...}, category_summaries: { "Category1": {...}, "Category2": {...} } }
 * 
 * PATTERN_C_SUMMARY_WITH_ARRAY (5 columns: K, L, Q, S, T)
 *   - Has summary object with totals
 *   - Items stored as ARRAY of objects
 *   - Example: { summary: {...}, top_10_items: [ {name: "X", total: 123}, {...} ] }
 * 
 * PATTERN_D_NESTED_FISCAL_YEAR (3 columns: M, O, P)
 *   - Data organized by fiscal year first
 *   - Each year contains its own breakdown
 *   - Example: { fiscal_year_summaries: { "2024": { top_10_products: [...] } } }
 * 
 * PATTERN_E_NESTED_ENTITY (2 columns: N, W)
 *   - Deeply nested by entity (agency/quarter)
 *   - Multiple levels of breakdown
 *   - Example: { top_10_agencies: { "DOD": { top_3_products: [...] } } }
 * 
 * PATTERN_F_FLAT_PROFILE (1 column: AC)
 *   - Simple flat object with direct properties
 *   - No nested structures or arrays
 *   - Example: { oem_name: "X", headquarters: "Y", overview: "Z" }
 * 
 * ============================================================================
 */


// ============================================================================
// SECTION 1: COLUMN_SCHEMAS - Master Schema Definitions
// ============================================================================

/**
 * Complete schema definition for every JSON column.
 * 
 * Schema Properties Explained:
 * @property {string} column - Letter designation (D-AC)
 * @property {number} columnIndex - Zero-based index for array access
 * @property {string} headerName - Exact header text in sheet
 * @property {string} description - What this column contains
 * @property {string} structurePattern - Which of the 5 patterns (see above)
 * @property {string} dataSource - "FAS" or "BIC" indicating data origin
 * @property {string} primaryValuePath - Dot-notation path to main total
 * @property {string} timeSeriesPath - Path to fiscal year data
 * @property {string} categoriesPath - Path to category breakdown
 * @property {string} categoryValueType - "object_map" or "array"
 * @property {object} itemStructure - Structure of each item in breakdown
 * @property {string[]} requiredFields - Fields that must exist
 * @property {string[]} fiscalYearFields - Which FY fields to expect
 */

const COLUMN_SCHEMAS = {

  // ===========================================================================
  // COLUMN D (Index 3): Obligations
  // ===========================================================================
  obligations: {
    column: 'D',
    columnIndex: 3,
    headerName: 'Obligations',
    description: 'Total federal obligations with fiscal year breakdown. Simplest structure.',
    structurePattern: 'PATTERN_A_SIMPLE_TOTALS',
    dataSource: 'FAS',
    
    primaryValuePath: 'total_obligated',
    timeSeriesPath: 'fiscal_year_obligations',
    categoriesPath: null,
    categoryValueType: null,
    
    itemStructure: null,
    
    requiredFields: ['source_file', 'fiscal_year_obligations', 'total_obligated', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025']
  },

  // ===========================================================================
  // COLUMN E (Index 4): Small Business
  // ===========================================================================
  smallBusiness: {
    column: 'E',
    columnIndex: 4,
    headerName: 'Small Business',
    description: 'Obligations broken down by business size category (Small vs Other Than Small).',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_obligations',
    timeSeriesPath: null,
    categoriesPath: 'business_size_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',      // { "2022": number, "2023": number, ... }
      total: 'number',
      percentage_of_total: 'string' // "66.89%"
    },
    
    requiredFields: ['source_file', 'summary', 'business_size_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    knownCategories: ['SMALL BUSINESS', 'OTHER THAN SMALL BUSINESS']
  },

  // ===========================================================================
  // COLUMN F (Index 5): SUM Tier
  // ===========================================================================
  sumTier: {
    column: 'F',
    columnIndex: 5,
    headerName: 'SUM Tier ',
    description: 'Obligations broken down by SUM (Spend Under Management) tier level.',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_obligations',
    timeSeriesPath: null,
    categoriesPath: 'tier_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'tier_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    knownCategories: ['BIC', 'TIER 0', 'TIER 1', 'TIER 2']
  },

  // ===========================================================================
  // COLUMN G (Index 6): Sum Type
  // ===========================================================================
  sumType: {
    column: 'G',
    columnIndex: 6,
    headerName: 'Sum Type',
    description: 'Obligations by contract management type (Governmentwide, Agency Managed, Open Market).',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_obligations',
    timeSeriesPath: null,
    categoriesPath: 'sum_type_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'sum_type_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    knownCategories: ['Governmentwide Management', 'Agency Managed & IDIQ', 'Open Market']
  },

  // ===========================================================================
  // COLUMN H (Index 7): Contract Vehicle
  // ===========================================================================
  contractVehicle: {
    column: 'H',
    columnIndex: 7,
    headerName: 'Contract Vehicle',
    description: 'Top 20 contract vehicles by obligations (NASA SEWP, Schedule 70, etc.).',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_obligations',
    timeSeriesPath: null,
    categoriesPath: 'top_contract_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'top_contract_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalField: 'total_all_obligations',
      uniqueCountField: 'unique_contracts',
      showingTopField: 'showing_top'
    }
  },

  // ===========================================================================
  // COLUMN I (Index 8): Funding Department
  // ===========================================================================
  fundingDepartment: {
    column: 'I',
    columnIndex: 8,
    headerName: 'Funding Department',
    description: 'Top 10 funding departments by obligations.',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_departments',
    timeSeriesPath: null,
    categoriesPath: 'top_10_department_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'top_10_department_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalField: 'total_all_departments',
      topTotalField: 'total_top_10_departments',
      topPercentageField: 'top_10_percentage_of_total',
      uniqueCountField: 'total_unique_departments',
      showingCountField: 'departments_shown'
    }
  },

  // ===========================================================================
  // COLUMN J (Index 9): OneGov Discounted Products
  // ===========================================================================
  oneGovDiscountedProducts: {
    column: 'J',
    columnIndex: 9,
    headerName: 'OneGov Discounted Products',
    description: 'Obligations for products with OneGov discounts (AWS Credits, Azure, etc.).',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_obligations_with_discounts',
    timeSeriesPath: null,
    categoriesPath: 'discount_categories',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'discount_status', 'summary', 'discount_categories', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    additionalRootFields: ['discount_status'],
    
    knownCategories: [
      'AWS Migration Credits',
      'AWS Modernization - Application',
      'AWS Modernization - Infrastructure',
      'AWS Modernization - POC',
      'AWS Training & Certification',
      'Azure',
      'ServiceNow ITSM Pro Bundle - GCC'
    ]
  },

  // ===========================================================================
  // COLUMN K (Index 10): Top Ref_PIID
  // ===========================================================================
  topRefPiid: {
    column: 'K',
    columnIndex: 10,
    headerName: 'Top Ref_PIID',
    description: 'Top 10 reference PIIDs (parent contract IDs) by obligations.',
    structurePattern: 'PATTERN_C_SUMMARY_WITH_ARRAY',
    dataSource: 'FAS',
    
    primaryValuePath: 'total_obligations',
    timeSeriesPath: 'yearly_totals',
    categoriesPath: 'top_10_reference_piids',
    categoryValueType: 'array',
    
    itemStructure: {
      reference_piid: 'string',
      dollars_obligated: 'number',
      percentage_of_total: 'string',
      agencies_using: 'number',
      fiscal_year_breakdown: {
        // Each year has: { obligations: number, percentage_of_year: string }
      }
    },
    
    requiredFields: ['source_file', 'total_obligations', 'unique_ref_piids', 'fiscal_years_covered', 'yearly_totals', 'top_10_reference_piids', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    arrayItemKeyField: 'reference_piid',
    arrayItemValueField: 'dollars_obligated'
  },

  // ===========================================================================
  // COLUMN L (Index 11): Top PIID
  // ===========================================================================
  topPiid: {
    column: 'L',
    columnIndex: 11,
    headerName: 'Top PIID',
    description: 'Top 10 individual contract PIIDs by obligations.',
    structurePattern: 'PATTERN_C_SUMMARY_WITH_ARRAY',
    dataSource: 'FAS',
    
    primaryValuePath: 'total_obligations',
    timeSeriesPath: 'yearly_totals',
    categoriesPath: 'top_10_piids',
    categoryValueType: 'array',
    
    itemStructure: {
      piid: 'string',
      dollars_obligated: 'number',
      percentage_of_total: 'string',
      agencies_using: 'number',
      fiscal_year_breakdown: {}
    },
    
    requiredFields: ['source_file', 'total_obligations', 'unique_piids', 'fiscal_years_covered', 'yearly_totals', 'top_10_piids', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    arrayItemKeyField: 'piid',
    arrayItemValueField: 'dollars_obligated'
  },

  // ===========================================================================
  // COLUMN M (Index 12): Active Contracts
  // ===========================================================================
  activeContracts: {
    column: 'M',
    columnIndex: 12,
    headerName: 'Active Contracts',
    description: 'Contract expiration analysis by fiscal quarter.',
    structurePattern: 'PATTERN_D_NESTED_FISCAL_YEAR',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_obligations',
    timeSeriesPath: null,
    categoriesPath: 'expiring_by_quarter',
    categoryValueType: 'object_map',
    
    itemStructure: {
      unique_contracts_expiring: 'number',
      total_obligations_expiring: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'expiring_by_quarter', 'processed_date'],
    
    summaryFields: {
      totalObligations: 'total_obligations',
      totalUniqueContracts: 'total_unique_contracts',
      expiredContracts: 'expired_contracts',
      expiredObligations: 'expired_obligations',
      expiredPercentage: 'expired_percentage'
    },
    
    knownQuarters: ['Q1 FY26', 'Q2 FY26', 'Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27', 'Q3 FY27', 'Q4 FY27']
  },

  // ===========================================================================
  // COLUMN N (Index 13): Expiring OneGov Discounted Products
  // ===========================================================================
  expiringDiscountedProducts: {
    column: 'N',
    columnIndex: 13,
    headerName: 'Expiring OneGov Discounted Products',
    description: 'Detailed expiration analysis for discounted products by quarter and entity.',
    structurePattern: 'PATTERN_E_NESTED_ENTITY',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.grand_total_all_obligations',
    timeSeriesPath: null,
    categoriesPath: 'discount_contracts_expiring_by_quarter',
    categoryValueType: 'object_map',
    
    itemStructure: {
      unique_contracts_expiring: 'number',
      total_dollars_expiring: 'number',
      percentage_of_total_discounts: 'string',
      top_entities_expiring: 'array' // Nested array of entities
    },
    
    requiredFields: ['source_file', 'sheet_type', 'grouped_by', 'discount_report_status', 'summary', 'discount_contracts_expiring_by_quarter', 'processed_date'],
    
    summaryFields: {
      grandTotal: 'grand_total_all_obligations',
      totalWithDiscounts: 'total_with_discounts',
      totalWithoutDiscounts: 'total_without_discounts',
      discountPercentage: 'discount_percentage',
      uniqueEntitiesWithDiscounts: 'unique_entities_with_discounts'
    }
  },

  // ===========================================================================
  // COLUMN O (Index 14): AI Product
  // ===========================================================================
  aiProduct: {
    column: 'O',
    columnIndex: 14,
    headerName: 'AI Product',
    description: 'AI-related products broken down by fiscal year with top 10 per year.',
    structurePattern: 'PATTERN_D_NESTED_FISCAL_YEAR',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.grand_total_obligations',
    timeSeriesPath: null,
    categoriesPath: 'fiscal_year_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      total_obligations: 'number',
      percentage_of_grand_total: 'string',
      unique_products: 'number',
      top_10_products: 'array'
    },
    
    nestedArrayItemStructure: {
      product: 'string',
      obligations: 'number',
      percentage_of_year: 'string',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'ai_product_status', 'summary', 'fiscal_year_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      grandTotal: 'grand_total_obligations',
      uniqueProducts: 'unique_products',
      fiscalYearsCovered: 'fiscal_years_covered'
    }
  },

  // ===========================================================================
  // COLUMN P (Index 15): AI Category
  // ===========================================================================
  aiCategory: {
    column: 'P',
    columnIndex: 15,
    headerName: 'AI Category',
    description: 'AI product categories broken down by fiscal year.',
    structurePattern: 'PATTERN_D_NESTED_FISCAL_YEAR',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.grand_total_obligations',
    timeSeriesPath: null,
    categoriesPath: 'fiscal_year_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      total_obligations: 'number',
      percentage_of_grand_total: 'string',
      unique_categories: 'number',
      top_10_categories: 'array'
    },
    
    nestedArrayItemStructure: {
      category: 'string',
      obligations: 'number',
      percentage_of_year: 'string',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'ai_category_status', 'summary', 'fiscal_year_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    knownCategories: [
      'Cloud & Infrastructure Services',
      'Professional Services - Consulting',
      'Professional Services - Implementation',
      'Professional Services - Development',
      'Software Licenses & Subscriptions',
      'Hardware & Equipment',
      'Training & Education',
      'Data Analytics & AI/ML',
      'Insufficient Information'
    ]
  },

  // ===========================================================================
  // COLUMN Q (Index 16): Top BIC Products
  // ===========================================================================
  topBicProducts: {
    column: 'Q',
    columnIndex: 16,
    headerName: 'Top BIC Products',
    description: 'Top 25 BIC products by total price across all fiscal years.',
    structurePattern: 'PATTERN_C_SUMMARY_WITH_ARRAY',
    dataSource: 'BIC',
    
    primaryValuePath: 'summary.total_all_products',
    timeSeriesPath: 'yearly_totals',
    categoriesPath: 'top_25_products',
    categoryValueType: 'array',
    
    itemStructure: {
      product_name: 'string',
      total_price: 'number',
      percentage_of_total: 'string',
      fiscal_year_breakdown: {}
    },
    
    nestedItemStructure: {
      total_price: 'number',
      percentage_of_year: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'yearly_totals', 'top_25_products', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalAllProducts: 'total_all_products',
      uniqueProductCount: 'unique_product_count',
      totalTop25: 'total_top_25_products',
      top25Percentage: 'top_25_percentage_of_total'
    },
    
    arrayItemKeyField: 'product_name',
    arrayItemValueField: 'total_price'
  },

  // ===========================================================================
  // COLUMN R (Index 17): Reseller (FAS)
  // ===========================================================================
  reseller: {
    column: 'R',
    columnIndex: 17,
    headerName: 'Reseller ',
    description: 'Top 15 resellers/vendors from FAS data by total obligations.',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_resellers',
    timeSeriesPath: null,
    categoriesPath: 'top_15_reseller_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'top_15_reseller_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalAllResellers: 'total_all_resellers',
      totalTop15: 'total_top_15_resellers',
      top15Percentage: 'top_15_percentage_of_total',
      uniqueUeis: 'total_unique_ueis',
      ueisShown: 'ueis_shown'
    }
  },

  // ===========================================================================
  // COLUMN S (Index 18): BIC Reseller
  // ===========================================================================
  bicReseller: {
    column: 'S',
    columnIndex: 18,
    headerName: 'BIC Reseller',
    description: 'Top 15 resellers from BIC data by total sales.',
    structurePattern: 'PATTERN_C_SUMMARY_WITH_ARRAY',
    dataSource: 'BIC',
    
    primaryValuePath: 'summary.total_all_resellers',
    timeSeriesPath: 'yearly_totals',
    categoriesPath: 'top_15_resellers',
    categoryValueType: 'array',
    
    itemStructure: {
      vendor_name: 'string',
      total_sales: 'number',
      percentage_of_total: 'string',
      fiscal_year_breakdown: {}
    },
    
    nestedItemStructure: {
      total_sales: 'number',
      percentage_of_year: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'yearly_totals', 'top_15_resellers', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalAllResellers: 'total_all_resellers',
      uniqueResellerCount: 'unique_reseller_count',
      totalTop15: 'total_top_15_resellers',
      top15Percentage: 'top_15_percentage_of_total'
    },
    
    arrayItemKeyField: 'vendor_name',
    arrayItemValueField: 'total_sales'
  },

  // ===========================================================================
  // COLUMN T (Index 19): BIC OEM
  // ===========================================================================
  bicOem: {
    column: 'T',
    columnIndex: 19,
    headerName: 'BIC OEM',
    description: 'Top 15 OEMs/manufacturers from BIC data by total sales.',
    structurePattern: 'PATTERN_C_SUMMARY_WITH_ARRAY',
    dataSource: 'BIC',
    
    primaryValuePath: 'summary.total_all_manufacturers',
    timeSeriesPath: 'yearly_totals',
    categoriesPath: 'top_15_manufacturers',
    categoryValueType: 'array',
    
    itemStructure: {
      manufacturer_name: 'string',
      total_sales: 'number',
      percentage_of_total: 'string',
      fiscal_year_breakdown: {}
    },
    
    nestedItemStructure: {
      total_sales: 'number',
      percentage_of_year: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'yearly_totals', 'top_15_manufacturers', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalAllManufacturers: 'total_all_manufacturers',
      uniqueManufacturerCount: 'unique_manufacturer_count',
      totalTop15: 'total_top_15_manufacturers',
      top15Percentage: 'top_15_percentage_of_total'
    },
    
    arrayItemKeyField: 'manufacturer_name',
    arrayItemValueField: 'total_sales'
  },

  // ===========================================================================
  // COLUMN U (Index 20): FAS OEM
  // ===========================================================================
  fasOem: {
    column: 'U',
    columnIndex: 20,
    headerName: 'FAS OEM',
    description: 'Top 10 OEMs from FAS data by total obligations.',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_oems',
    timeSeriesPath: null,
    categoriesPath: 'top_10_oem_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total_obligations: 'number',  // NOTE: Different from 'total' in other columns!
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'top_10_oem_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalAllOems: 'total_all_oems',
      totalTop10: 'total_top_10_oems',
      top10Percentage: 'top_10_percentage_of_total',
      uniqueOems: 'total_unique_oems',
      oemsShown: 'oems_shown'
    },
    
    // IMPORTANT: This column uses 'total_obligations' not 'total' for item values
    itemValueField: 'total_obligations'
  },

  // ===========================================================================
  // COLUMN V (Index 21): Funding Agency
  // ===========================================================================
  fundingAgency: {
    column: 'V',
    columnIndex: 21,
    headerName: 'Funding Agency',
    description: 'Top 10 funding agencies (sub-department level) by obligations.',
    structurePattern: 'PATTERN_B_SUMMARY_WITH_OBJECT_MAP',
    dataSource: 'FAS',
    
    primaryValuePath: 'summary.total_all_agencies',
    timeSeriesPath: null,
    categoriesPath: 'top_10_agency_summaries',
    categoryValueType: 'object_map',
    
    itemStructure: {
      fiscal_years: 'object',
      total: 'number',
      percentage_of_total: 'string'
    },
    
    requiredFields: ['source_file', 'summary', 'top_10_agency_summaries', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      totalAllAgencies: 'total_all_agencies',
      totalTop10: 'total_top_10_agencies',
      top10Percentage: 'top_10_percentage_of_total',
      uniqueAgencies: 'total_unique_agencies',
      agenciesShown: 'agencies_shown'
    }
  },

  // ===========================================================================
  // COLUMN W (Index 22): BIC Top Products per Agency
  // ===========================================================================
  bicTopProductsPerAgency: {
    column: 'W',
    columnIndex: 22,
    headerName: 'BIC Top Products per Agency',
    description: 'Top 10 agencies with their top 3 BIC products each.',
    structurePattern: 'PATTERN_E_NESTED_ENTITY',
    dataSource: 'BIC',
    
    primaryValuePath: 'summary.grand_total',
    timeSeriesPath: 'yearly_totals',
    categoriesPath: 'top_10_agencies',
    categoryValueType: 'object_map',
    
    itemStructure: {
      agency_total: 'number',
      percentage_of_grand_total: 'string',
      fiscal_year_breakdown: 'object',
      top_3_products: 'array',
      top_3_products_total: 'number',
      top_3_percentage_of_agency: 'string'
    },
    
    nestedArrayItemStructure: {
      product_name: 'string',
      total_price: 'number',
      percentage_of_agency_total: 'string',
      fiscal_year_breakdown: 'object'
    },
    
    requiredFields: ['source_file', 'summary', 'yearly_totals', 'top_10_agencies', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    summaryFields: {
      grandTotal: 'grand_total',
      totalAgencies: 'total_agencies',
      top10AgenciesShown: 'top_10_agencies_shown'
    }
  },

  // ===========================================================================
  // COLUMN X (Index 23): OneGov Tier
  // ===========================================================================
  oneGovTier: {
    column: 'X',
    columnIndex: 23,
    headerName: 'OneGov Tier',
    description: 'Calculated tier classification based on average yearly obligations.',
    structurePattern: 'PATTERN_A_SIMPLE_TOTALS',
    dataSource: 'CALCULATED',
    
    primaryValuePath: 'total_obligated',
    timeSeriesPath: 'fiscal_year_tiers',
    categoriesPath: null,
    categoryValueType: null,
    
    itemStructure: null,
    
    requiredFields: ['mode_tier', 'overall_tier', 'total_obligated', 'formatted_total', 'average_obligations_per_year', 'fiscal_year_tiers', 'tier_counts', 'tier_summary', 'tier_definitions', 'processed_date'],
    fiscalYearFields: ['2022', '2023', '2024', '2025'],
    
    tierDefinitions: {
      'Tier 1': '> $500M',
      'Tier 2': '$200M - $500M',
      'Tier 3': '$50M - $200M',
      'Tier 4': '$10M - $50M',
      'Below Tier 4': '< $10M'
    },
    
    specialFields: {
      modeTier: 'mode_tier',
      overallTier: 'overall_tier',
      formattedTotal: 'formatted_total',
      averagePerYear: 'average_obligations_per_year',
      formattedAverage: 'formatted_average',
      tierCounts: 'tier_counts',
      tierSummary: 'tier_summary'
    }
  },

  // ===========================================================================
  // COLUMN AC (Index 28): USAi Profile
  // ===========================================================================
  usaiProfile: {
    column: 'AC',
    columnIndex: 28,
    headerName: 'USAi Profile',
    description: 'Company profile information (headquarters, overview, products, etc.).',
    structurePattern: 'PATTERN_F_FLAT_PROFILE',
    dataSource: 'USAI',
    
    primaryValuePath: null,
    timeSeriesPath: null,
    categoriesPath: null,
    categoryValueType: null,
    
    itemStructure: null,
    
    requiredFields: ['oem_name'],
    
    profileFields: {
      name: 'oem_name',
      parent: 'parent_company',
      headquarters: 'headquarters',
      founded: 'founded',
      employees: 'employees',
      ownership: 'ownership',
      stockSymbol: 'stock_symbol',
      overview: 'overview',
      coreProducts: 'core_products',
      technologyFocus: 'technology_focus',
      keyMarkets: 'key_markets',
      governmentPresence: 'government_presence',
      recentActivity: 'recent_activity',
      website: 'website',
      linkedin: 'linkedin'
    }
  }
};


// ============================================================================
// SECTION 1B: COLUMN_INDEX_MAP - Quick lookup by column letter or index
// ============================================================================

const COLUMN_INDEX_MAP = {
  // By letter
  'D': 'obligations',
  'E': 'smallBusiness',
  'F': 'sumTier',
  'G': 'sumType',
  'H': 'contractVehicle',
  'I': 'fundingDepartment',
  'J': 'oneGovDiscountedProducts',
  'K': 'topRefPiid',
  'L': 'topPiid',
  'M': 'activeContracts',
  'N': 'expiringDiscountedProducts',
  'O': 'aiProduct',
  'P': 'aiCategory',
  'Q': 'topBicProducts',
  'R': 'reseller',
  'S': 'bicReseller',
  'T': 'bicOem',
  'U': 'fasOem',
  'V': 'fundingAgency',
  'W': 'bicTopProductsPerAgency',
  'X': 'oneGovTier',
  'AC': 'usaiProfile',
  
  // By index
  3: 'obligations',
  4: 'smallBusiness',
  5: 'sumTier',
  6: 'sumType',
  7: 'contractVehicle',
  8: 'fundingDepartment',
  9: 'oneGovDiscountedProducts',
  10: 'topRefPiid',
  11: 'topPiid',
  12: 'activeContracts',
  13: 'expiringDiscountedProducts',
  14: 'aiProduct',
  15: 'aiCategory',
  16: 'topBicProducts',
  17: 'reseller',
  18: 'bicReseller',
  19: 'bicOem',
  20: 'fasOem',
  21: 'fundingAgency',
  22: 'bicTopProductsPerAgency',
  23: 'oneGovTier',
  28: 'usaiProfile'
};


// ============================================================================
// SECTION 1C: NON_JSON_COLUMNS - Reference for non-JSON columns
// ============================================================================

const NON_JSON_COLUMNS = {
  A: { index: 0, name: 'DUNS', type: 'string', description: 'DUNS number (often empty)' },
  B: { index: 1, name: 'Entity Name', type: 'string', description: 'Agency/OEM/Vendor name (varies by sheet)' },
  C: { index: 2, name: 'Parent/Department', type: 'string', description: 'Parent company or Department (varies by sheet)' },
  Y: { index: 24, name: 'FAS Data Table', type: 'url', description: 'Google Drive link to FAS source data' },
  Z: { index: 25, name: 'FAS Table Update Timestamp', type: 'date', description: 'Last update date for FAS data' },
  AA: { index: 26, name: 'BIC Data Table', type: 'url', description: 'Google Drive link to BIC source data' },
  AB: { index: 27, name: 'BIC Table Update Timestamp', type: 'date', description: 'Last update date for BIC data' },
  AD: { index: 29, name: 'Website', type: 'url', description: 'Company website URL' },
  AE: { index: 30, name: 'Company LinkedIn', type: 'url', description: 'Company LinkedIn URL' }
};


// ============================================================================
// END OF PART 1
// ============================================================================
// Continue to PART 2 for STRUCTURE_PATTERNS and COMPLETE_EXAMPLES
// ============================================================================
// ============================================================================
// B01_JSON_STRUCTURES.gs - PART 2
// ============================================================================
// SECTION 2: STRUCTURE_PATTERNS
// SECTION 3A: COMPLETE_EXAMPLES (Columns D through M)
// ============================================================================


// ============================================================================
// SECTION 2: STRUCTURE_PATTERNS - Detailed Pattern Definitions
// ============================================================================

/**
 * The 6 distinct JSON structure patterns used across all 22 columns.
 * Understanding these patterns enables generic extraction functions.
 */

const STRUCTURE_PATTERNS = {

  // ---------------------------------------------------------------------------
  // PATTERN A: Simple Totals (Columns D, X)
  // ---------------------------------------------------------------------------
  PATTERN_A_SIMPLE_TOTALS: {
    description: 'Direct properties at root level, no nested summary object',
    columns: ['D', 'X'],
    schemaKeys: ['obligations', 'oneGovTier'],
    
    structure: {
      source_file: 'string (Google Drive URL)',
      total_obligated: 'number',
      fiscal_year_obligations: {
        '2022': 'number',
        '2023': 'number',
        '2024': 'number',
        '2025': 'number'
      },
      processed_date: 'string (ISO 8601)'
    },
    
    extractionStrategy: `
      // For Pattern A, values are at root level:
      const total = jsonData.total_obligated;
      const byYear = jsonData.fiscal_year_obligations;
      const fy2024 = byYear['2024'];
    `
  },

  // ---------------------------------------------------------------------------
  // PATTERN B: Summary with Object Map (Columns E, F, G, H, I, J, R, U, V)
  // ---------------------------------------------------------------------------
  PATTERN_B_SUMMARY_WITH_OBJECT_MAP: {
    description: 'Has summary object, categories stored as named object keys',
    columns: ['E', 'F', 'G', 'H', 'I', 'J', 'R', 'U', 'V'],
    schemaKeys: ['smallBusiness', 'sumTier', 'sumType', 'contractVehicle', 'fundingDepartment', 'oneGovDiscountedProducts', 'reseller', 'fasOem', 'fundingAgency'],
    
    structure: {
      source_file: 'string',
      summary: {
        total_all_X: 'number (naming varies by column)',
        unique_X_count: 'number (optional)',
        total_top_N: 'number (optional)',
        top_N_percentage: 'string (optional)'
      },
      '[category]_summaries': {
        'Category Name 1': {
          fiscal_years: {
            '2022': 'number',
            '2023': 'number',
            '2024': 'number',
            '2025': 'number'
          },
          total: 'number (or total_obligations for Column U)',
          percentage_of_total: 'string'
        },
        'Category Name 2': '...'
      },
      processed_date: 'string'
    },
    
    extractionStrategy: `
      // For Pattern B, use the schema to find correct paths:
      const schema = COLUMN_SCHEMAS.smallBusiness;
      const total = getNestedValue(jsonData, schema.primaryValuePath);
      const categories = getNestedValue(jsonData, schema.categoriesPath);
      
      // Iterate over categories (object keys):
      Object.entries(categories).forEach(([categoryName, categoryData]) => {
        const categoryTotal = categoryData.total;
        const fy2024 = categoryData.fiscal_years['2024'];
      });
    `,
    
    variations: {
      columnU: 'Uses "total_obligations" instead of "total" for item values'
    }
  },

  // ---------------------------------------------------------------------------
  // PATTERN C: Summary with Array (Columns K, L, Q, S, T)
  // ---------------------------------------------------------------------------
  PATTERN_C_SUMMARY_WITH_ARRAY: {
    description: 'Has summary object, items stored as array of objects',
    columns: ['K', 'L', 'Q', 'S', 'T'],
    schemaKeys: ['topRefPiid', 'topPiid', 'topBicProducts', 'bicReseller', 'bicOem'],
    
    structure: {
      source_file: 'string',
      summary: {
        total_X: 'number',
        unique_X_count: 'number',
        total_top_N: 'number',
        top_N_percentage: 'string'
      },
      yearly_totals: {
        '2022': 'number',
        '2023': 'number',
        '2024': 'number',
        '2025': 'number'
      },
      'top_N_items': [
        {
          '[key_field]': 'string (e.g., piid, product_name, vendor_name)',
          '[value_field]': 'number (e.g., dollars_obligated, total_price, total_sales)',
          percentage_of_total: 'string',
          fiscal_year_breakdown: {
            '2022': { '[value_field]': 'number', percentage_of_year: 'string' },
            '2023': '...'
          }
        }
      ],
      processed_date: 'string'
    },
    
    extractionStrategy: `
      // For Pattern C, items are in an array:
      const schema = COLUMN_SCHEMAS.topBicProducts;
      const items = getNestedValue(jsonData, schema.categoriesPath);
      
      // Iterate over array:
      items.forEach((item, index) => {
        const name = item[schema.arrayItemKeyField];   // e.g., 'product_name'
        const value = item[schema.arrayItemValueField]; // e.g., 'total_price'
        const fy2024 = item.fiscal_year_breakdown?.['2024']?.total_price;
      });
    `,
    
    keyFieldsByColumn: {
      K: { key: 'reference_piid', value: 'dollars_obligated' },
      L: { key: 'piid', value: 'dollars_obligated' },
      Q: { key: 'product_name', value: 'total_price' },
      S: { key: 'vendor_name', value: 'total_sales' },
      T: { key: 'manufacturer_name', value: 'total_sales' }
    }
  },

  // ---------------------------------------------------------------------------
  // PATTERN D: Nested by Fiscal Year (Columns M, O, P)
  // ---------------------------------------------------------------------------
  PATTERN_D_NESTED_FISCAL_YEAR: {
    description: 'Data organized by fiscal year first, each year has its own breakdown',
    columns: ['M', 'O', 'P'],
    schemaKeys: ['activeContracts', 'aiProduct', 'aiCategory'],
    
    structure: {
      source_file: 'string',
      summary: {
        grand_total_obligations: 'number',
        unique_items: 'number',
        fiscal_years_covered: ['2022', '2023', '2024', '2025']
      },
      fiscal_year_summaries: {
        '2022': {
          total_obligations: 'number',
          percentage_of_grand_total: 'string',
          unique_items: 'number',
          top_10_items: [
            {
              item_name: 'string',
              obligations: 'number',
              percentage_of_year: 'string',
              percentage_of_total: 'string'
            }
          ]
        },
        '2023': '...',
        '2024': '...',
        '2025': '...'
      },
      processed_date: 'string'
    },
    
    extractionStrategy: `
      // For Pattern D, first select fiscal year, then access items:
      const yearData = jsonData.fiscal_year_summaries['2024'];
      const yearTotal = yearData.total_obligations;
      const topProducts = yearData.top_10_products; // or top_10_categories
      
      // To get all items across all years:
      const allItems = {};
      Object.entries(jsonData.fiscal_year_summaries).forEach(([year, data]) => {
        data.top_10_products?.forEach(product => {
          // Aggregate by product name...
        });
      });
    `,
    
    variations: {
      columnM: 'Uses expiring_by_quarter instead of fiscal_year_summaries',
      columnO: 'Array field is top_10_products',
      columnP: 'Array field is top_10_categories'
    }
  },

  // ---------------------------------------------------------------------------
  // PATTERN E: Nested by Entity (Columns N, W)
  // ---------------------------------------------------------------------------
  PATTERN_E_NESTED_ENTITY: {
    description: 'Deeply nested by entity (agency/quarter) with multiple breakdown levels',
    columns: ['N', 'W'],
    schemaKeys: ['expiringDiscountedProducts', 'bicTopProductsPerAgency'],
    
    structure: {
      source_file: 'string',
      summary: {
        grand_total: 'number',
        total_entities: 'number'
      },
      yearly_totals: { '2022': 'number', '...': '...' },
      top_10_entities: {
        'Entity Name 1': {
          entity_total: 'number',
          percentage_of_grand_total: 'string',
          fiscal_year_breakdown: {
            '2022': { total_spend: 'number', percentage_of_year: 'string' }
          },
          top_3_products: [
            {
              product_name: 'string',
              total_price: 'number',
              percentage_of_entity_total: 'string',
              fiscal_year_breakdown: { '2022': { total_price: 'number' } }
            }
          ],
          top_3_products_total: 'number',
          top_3_percentage_of_entity: 'string'
        },
        'Entity Name 2': '...'
      },
      processed_date: 'string'
    },
    
    extractionStrategy: `
      // For Pattern E, navigate through entity hierarchy:
      const agencies = jsonData.top_10_agencies;
      
      Object.entries(agencies).forEach(([agencyName, agencyData]) => {
        const agencyTotal = agencyData.agency_total;
        
        // Access nested products for this agency:
        agencyData.top_3_products?.forEach(product => {
          const productName = product.product_name;
          const productTotal = product.total_price;
        });
      });
    `
  },

  // ---------------------------------------------------------------------------
  // PATTERN F: Flat Profile (Column AC)
  // ---------------------------------------------------------------------------
  PATTERN_F_FLAT_PROFILE: {
    description: 'Simple flat object with direct string properties, no nesting',
    columns: ['AC'],
    schemaKeys: ['usaiProfile'],
    
    structure: {
      oem_name: 'string',
      parent_company: 'string | null',
      headquarters: 'string',
      founded: 'string',
      employees: 'string',
      ownership: 'string',
      stock_symbol: 'string',
      overview: 'string (long text)',
      core_products: 'string',
      technology_focus: 'string',
      key_markets: 'string',
      government_presence: 'string',
      recent_activity: 'string',
      website: 'string (URL)',
      linkedin: 'string (URL)'
    },
    
    extractionStrategy: `
      // For Pattern F, access properties directly:
      const name = jsonData.oem_name;
      const overview = jsonData.overview;
      const website = jsonData.website;
    `
  }
};


// ============================================================================
// SECTION 3: COMPLETE_EXAMPLES - Real JSON Examples for Each Column
// ============================================================================

/**
 * Complete, real JSON examples extracted from actual data.
 * Use these to understand exact structure and test your extraction code.
 */

const COMPLETE_EXAMPLES = {

  // ===========================================================================
  // COLUMN D (Index 3): Obligations
  // ===========================================================================
  obligations: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    fiscal_year_obligations: {
      "2022": 285946596.2099999,
      "2023": 357674410.18999994,
      "2024": 597501189.6700002,
      "2025": 258010099.41000003
    },
    total_obligated: 1499132295.4800003,
    processed_date: "2025-11-23T21:04:53.887Z"
  },

  // ===========================================================================
  // COLUMN E (Index 4): Small Business
  // ===========================================================================
  smallBusiness: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_obligations: 1499132295.4799995,
      unique_business_size_categories: 2
    },
    business_size_summaries: {
      "SMALL BUSINESS": {
        fiscal_years: {
          "2022": 229735906.59999993,
          "2023": 251874424.28000006,
          "2024": 337449510.8600001,
          "2025": 183644312.10000002
        },
        total: 1002704153.8399993,
        percentage_of_total: "66.89%"
      },
      "OTHER THAN SMALL BUSINESS": {
        fiscal_years: {
          "2022": 56210689.61000001,
          "2023": 105799985.91,
          "2024": 260051678.81000006,
          "2025": 74365787.30999997
        },
        total: 496428141.6400002,
        percentage_of_total: "33.11%"
      }
    },
    processed_date: "2025-11-23T21:05:14.740Z"
  },

  // ===========================================================================
  // COLUMN F (Index 5): SUM Tier
  // ===========================================================================
  sumTier: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_obligations: 1499132295.4799998,
      unique_tiers: 4,
      mapping_applied: "SUM Tier mapping applied"
    },
    tier_summaries: {
      "BIC": {
        fiscal_years: {
          "2022": 154698978.85,
          "2023": 210671107.41000003,
          "2024": 298139774.8999999,
          "2025": 167773883.92000002
        },
        total: 831283745.0799994,
        percentage_of_total: "55.45%"
      },
      "TIER 2": {
        fiscal_years: {
          "2022": 56367656.370000005,
          "2023": 116403058.63999999,
          "2024": 278703961.66,
          "2025": 75914803.63
        },
        total: 527389480.3000003,
        percentage_of_total: "35.18%"
      },
      "TIER 1": {
        fiscal_years: {
          "2022": 51293543.330000006,
          "2023": 10648158.07,
          "2024": 13145024.799999999,
          "2025": 356626.18
        },
        total: 75443352.38000001,
        percentage_of_total: "5.03%"
      },
      "TIER 0": {
        fiscal_years: {
          "2022": 23586417.659999996,
          "2023": 19952086.07,
          "2024": 7512428.31,
          "2025": 13964785.68
        },
        total: 65015717.720000006,
        percentage_of_total: "4.34%"
      }
    },
    processed_date: "2025-11-23T21:05:32.348Z"
  },

  // ===========================================================================
  // COLUMN G (Index 6): Sum Type
  // ===========================================================================
  sumType: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_obligations: 1499132295.4800005,
      unique_sum_types: 3
    },
    sum_type_summaries: {
      "Governmentwide Management": {
        fiscal_years: {
          "2022": 211066635.21999997,
          "2023": 327074166.0499999,
          "2024": 576843736.5600004,
          "2025": 243688687.55
        },
        total: 1358673225.3800004,
        percentage_of_total: "90.63%"
      },
      "Agency Managed & IDIQ": {
        fiscal_years: {
          "2022": 66751679.02,
          "2023": 27466198.32,
          "2024": 18348515.9,
          "2025": 13527644.15
        },
        total: 126094037.39,
        percentage_of_total: "8.41%"
      },
      "Open Market": {
        fiscal_years: {
          "2022": 8128281.97,
          "2023": 3134045.8200000008,
          "2024": 2308937.2100000004,
          "2025": 793767.7100000001
        },
        total: 14365032.709999999,
        percentage_of_total: "0.96%"
      }
    },
    processed_date: "2025-11-23T21:05:49.076Z"
  },

  // ===========================================================================
  // COLUMN H (Index 7): Contract Vehicle (truncated to top 5 for brevity)
  // ===========================================================================
  contractVehicle: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_obligations: 1499132295.4799998,
      unique_contracts: 43,
      showing_top: 20
    },
    top_contract_summaries: {
      "NASA SEWP": {
        fiscal_years: {
          "2022": 113414265.76000002,
          "2023": 162606247.53,
          "2024": 185660769.78999996,
          "2025": 131923574.92999998
        },
        total: 593604858.01,
        percentage_of_total: "39.60%"
      },
      "SCHEDULE 70 - INFORMATION TECHNOLOGY": {
        fiscal_years: {
          "2022": 25446392.190000013,
          "2023": 74510133.46999997,
          "2024": 108869312.29999998,
          "2025": 13759412.270000001
        },
        total: 222585250.23000005,
        percentage_of_total: "14.85%"
      },
      "JOINT WARFIGHTING CLOUD CAPABILITY": {
        fiscal_years: {
          "2023": 9303476.85,
          "2024": 117319433.84,
          "2025": 43756697.35999999
        },
        total: 170379608.05000007,
        percentage_of_total: "11.37%"
      },
      "Sched 70 HW SW": {
        fiscal_years: {
          "2022": 11770379.819999998,
          "2023": 15926642.16,
          "2024": 80442773.46000001,
          "2025": 33243390.11
        },
        total: 141383185.55,
        percentage_of_total: "9.43%"
      },
      "FIRSTSOURCE II": {
        fiscal_years: {
          "2022": 50283132.29,
          "2023": 10622460.91,
          "2024": 7950542.72,
          "2025": 350000
        },
        total: 69206135.92,
        percentage_of_total: "4.62%"
      }
      // ... additional contracts truncated for brevity
    },
    processed_date: "2025-11-23T21:06:05.782Z"
  },

  // ===========================================================================
  // COLUMN I (Index 8): Funding Department (truncated to top 5)
  // ===========================================================================
  fundingDepartment: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_departments: 1499132295.4799995,
      total_top_10_departments: 1310038145.64,
      top_10_percentage_of_total: "87.39%",
      total_unique_departments: 38,
      departments_shown: 10
    },
    top_10_department_summaries: {
      "DEPT OF DEFENSE": {
        fiscal_years: {
          "2022": 50184776.86,
          "2023": 137105174.87999997,
          "2024": 257972490.92000002,
          "2025": 67498750.11
        },
        total: 512761192.7700002,
        percentage_of_total: "34.20%"
      },
      "HOMELAND SECURITY, DEPARTMENT OF": {
        fiscal_years: {
          "2022": 52904010.629999995,
          "2023": 32686776.690000005,
          "2024": 120240512.85000001,
          "2025": 22430278.17
        },
        total: 228261578.3399999,
        percentage_of_total: "15.23%"
      },
      "VETERANS AFFAIRS, DEPARTMENT OF": {
        fiscal_years: {
          "2022": 25108921.700000003,
          "2024": 22010000,
          "2025": 73028118.55
        },
        total: 120147040.25,
        percentage_of_total: "8.01%"
      },
      "TREASURY, DEPARTMENT OF THE": {
        fiscal_years: {
          "2022": 42859732.8,
          "2023": 32741941.430000003,
          "2024": 12071824.780000001,
          "2025": 2425545.85
        },
        total: 90099044.85999998,
        percentage_of_total: "6.01%"
      },
      "HEALTH AND HUMAN SERVICES, DEPARTMENT OF": {
        fiscal_years: {
          "2022": 19393461.09,
          "2023": 20044116.96,
          "2024": 26413509.53,
          "2025": 10827478.44
        },
        total: 76678566.02,
        percentage_of_total: "5.12%"
      }
      // ... additional departments truncated
    },
    processed_date: "2025-11-20T01:17:53.021Z"
  },

  // ===========================================================================
  // COLUMN J (Index 9): OneGov Discounted Products
  // ===========================================================================
  oneGovDiscountedProducts: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    discount_status: "Active Discounts",
    summary: {
      total_obligations_with_discounts: 277516092.97,
      unique_discount_categories: 7
    },
    discount_categories: {
      "AWS Migration Credits": {
        fiscal_years: {
          "2022": 8269696.5600000005,
          "2023": 28091172.9,
          "2024": 70100791.66000001,
          "2025": 67452857.67999999
        },
        total: 173914518.80000007,
        percentage_of_total: "62.67%"
      },
      "AWS Modernization - Application": {
        fiscal_years: {
          "2022": 896318.44,
          "2023": 1880500,
          "2024": 43524030.78,
          "2025": 15249388.73
        },
        total: 61550237.949999996,
        percentage_of_total: "22.18%"
      },
      "AWS Modernization - Infrastructure": {
        fiscal_years: {
          "2022": 2690451.49,
          "2023": 450113.47,
          "2024": 22574436.47,
          "2025": 1104135.71
        },
        total: 26819137.14,
        percentage_of_total: "9.66%"
      },
      "AWS Modernization - POC": {
        fiscal_years: {
          "2022": 595913.62,
          "2023": 4047852.63,
          "2024": 2731307.1300000004,
          "2025": 318535.31
        },
        total: 7693608.69,
        percentage_of_total: "2.77%"
      },
      "Azure": {
        fiscal_years: {
          "2025": 5936808
        },
        total: 5936808,
        percentage_of_total: "2.14%"
      },
      "AWS Training & Certification": {
        fiscal_years: {
          "2022": 24920.570000000007,
          "2023": 24768,
          "2024": 1556909.8199999998,
          "2025": -4816
        },
        total: 1601782.39,
        percentage_of_total: "0.58%"
      },
      "ServiceNow ITSM Pro Bundle - GCC": {
        fiscal_years: {
          "2024": 0
        },
        total: 0,
        percentage_of_total: "0.00%"
      }
    },
    processed_date: "2025-11-20T01:18:12.620Z"
  },

  // ===========================================================================
  // COLUMN K (Index 10): Top Ref_PIID (truncated to top 3)
  // ===========================================================================
  topRefPiid: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    total_obligations: 1465557384.6500013,
    unique_ref_piids: 164,
    fiscal_years_covered: ["2022", "2023", "2024", "2025"],
    yearly_totals: {
      "2022": 272072250.7999999,
      "2023": 352027842.85999995,
      "2024": 584585314.9300004,
      "2025": 256871976.06000006
    },
    top_10_reference_piids: [
      {
        reference_piid: "NNG15SD22B",
        dollars_obligated: 207813522.92,
        percentage_of_total: "14.18%",
        agencies_using: 14,
        fiscal_year_breakdown: {
          "2022": {
            obligations: 29238989.96,
            percentage_of_year: "10.75%"
          },
          "2023": {
            obligations: 17367874.93,
            percentage_of_year: "4.93%"
          },
          "2024": {
            obligations: 67783142.32,
            percentage_of_year: "11.60%"
          },
          "2025": {
            obligations: 93423515.71,
            percentage_of_year: "36.37%"
          }
        }
      },
      {
        reference_piid: "NNG15SC74B",
        dollars_obligated: 188707880.72,
        percentage_of_total: "12.88%",
        agencies_using: 11,
        fiscal_year_breakdown: {
          "2022": {
            obligations: 58476429.26,
            percentage_of_year: "21.49%"
          },
          "2023": {
            obligations: 77551949.25,
            percentage_of_year: "22.03%"
          },
          "2024": {
            obligations: 50614574.74,
            percentage_of_year: "8.66%"
          },
          "2025": {
            obligations: 2064927.47,
            percentage_of_year: "0.80%"
          }
        }
      },
      {
        reference_piid: "HC102820D0014",
        dollars_obligated: 170379608.05,
        percentage_of_total: "11.63%",
        agencies_using: 3,
        fiscal_year_breakdown: {
          "2023": {
            obligations: 9303476.85,
            percentage_of_year: "2.64%"
          },
          "2024": {
            obligations: 117319433.84,
            percentage_of_year: "20.07%"
          },
          "2025": {
            obligations: 43756697.36,
            percentage_of_year: "17.03%"
          }
        }
      }
      // ... additional PIIDs truncated
    ],
    processed_date: "2025-11-20T01:18:32.825Z"
  },

  // ===========================================================================
  // COLUMN L (Index 11): Top PIID (truncated to top 3)
  // ===========================================================================
  topPiid: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    total_obligations: 1499132295.4800017,
    unique_piids: 611,
    fiscal_years_covered: ["2022", "2023", "2024", "2025"],
    yearly_totals: {
      "2022": 285946596.2099999,
      "2023": 357674410.18999994,
      "2024": 597501189.6700002,
      "2025": 258010099.41000003
    },
    top_10_piids: [
      {
        piid: "36C10B22F0207",
        dollars_obligated: 98749699.64,
        percentage_of_total: "6.59%",
        agencies_using: 1,
        fiscal_year_breakdown: {
          "2022": {
            obligations: 3711581.09,
            percentage_of_year: "1.30%"
          },
          "2024": {
            obligations: 22010000,
            percentage_of_year: "3.68%"
          },
          "2025": {
            obligations: 73028118.55,
            percentage_of_year: "28.30%"
          }
        }
      },
      {
        piid: "70B04C24F00000413",
        dollars_obligated: 64927504.019999996,
        percentage_of_total: "4.33%",
        agencies_using: 1,
        fiscal_year_breakdown: {
          "2024": {
            obligations: 43293621.21999999,
            percentage_of_year: "7.25%"
          },
          "2025": {
            obligations: 21633882.8,
            percentage_of_year: "8.38%"
          }
        }
      },
      {
        piid: "70B04C23F00000158",
        dollars_obligated: 51093741.8,
        percentage_of_total: "3.41%",
        agencies_using: 1,
        fiscal_year_breakdown: {
          "2023": {
            obligations: 10106889.28,
            percentage_of_year: "2.83%"
          },
          "2024": {
            obligations: 40986852.52,
            percentage_of_year: "6.86%"
          }
        }
      }
      // ... additional PIIDs truncated
    ],
    processed_date: "2025-11-20T01:18:53.637Z"
  },

  // ===========================================================================
  // COLUMN M (Index 12): Active Contracts
  // ===========================================================================
  activeContracts: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_obligations: 1499132295.4800017,
      total_unique_contracts: 227,
      expired_contracts: 1697,
      expired_obligations: 1333947085.1900022,
      expired_percentage: "88.98%"
    },
    expiring_by_quarter: {
      "Q1 FY26": {
        unique_contracts_expiring: 11,
        total_obligations_expiring: 38595502.14,
        percentage_of_total: "2.57%"
      },
      "Q2 FY26": {
        unique_contracts_expiring: 12,
        total_obligations_expiring: 88512630.24,
        percentage_of_total: "5.90%"
      },
      "Q3 FY26": {
        unique_contracts_expiring: 13,
        total_obligations_expiring: 15649749,
        percentage_of_total: "1.04%"
      },
      "Q4 FY26": {
        unique_contracts_expiring: 4,
        total_obligations_expiring: 344757.16000000003,
        percentage_of_total: "0.02%"
      },
      "Q1 FY27": {
        unique_contracts_expiring: 1,
        total_obligations_expiring: 632438.13,
        percentage_of_total: "0.04%"
      },
      "Q2 FY27": {
        unique_contracts_expiring: 0,
        total_obligations_expiring: 0,
        percentage_of_total: "0.00%"
      },
      "Q3 FY27": {
        unique_contracts_expiring: 0,
        total_obligations_expiring: 0,
        percentage_of_total: "0.00%"
      },
      "Q4 FY27": {
        unique_contracts_expiring: 2,
        total_obligations_expiring: 4934475.029999999,
        percentage_of_total: "0.33%"
      }
    },
    processed_date: "2025-11-20T01:19:15.666Z"
  }
};


// ============================================================================
// END OF PART 2
// ============================================================================
// Continue to PART 3 for COMPLETE_EXAMPLES (Columns N through AC)
// ============================================================================
// ============================================================================
// B01_JSON_STRUCTURES.gs - PART 3
// ============================================================================
// SECTION 3B: COMPLETE_EXAMPLES (Columns N through AC)
// ============================================================================


// Add these to the COMPLETE_EXAMPLES object from Part 2:

const COMPLETE_EXAMPLES_PART2 = {

  // ===========================================================================
  // COLUMN N (Index 13): Expiring OneGov Discounted Products
  // ===========================================================================
  expiringDiscountedProducts: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    sheet_type: "OEM",
    grouped_by: "Agency",
    discount_report_status: "Active Discounts",
    summary: {
      grand_total_all_obligations: 165185210.29000002,
      total_with_discounts: 20144550.89,
      total_without_discounts: 145040659.4,
      discount_percentage: "12.20%",
      unique_entities_with_discounts: 16,
      showing_top: 16,
      active_contracts_only: true
    },
    discount_contracts_expiring_by_quarter: {
      "Q1 FY26": {
        unique_contracts_expiring: 3,
        total_dollars_expiring: 9657473.89,
        percentage_of_total_discounts: "47.94%",
        top_entities_expiring: [
          {
            entity_name: "DEPT OF THE ARMY",
            dollars_expiring: 6358285.91,
            contracts_expiring: 1
          },
          {
            entity_name: "DEPT OF THE NAVY",
            dollars_expiring: 2520640.08,
            contracts_expiring: 1
          },
          {
            entity_name: "OFFICES, BOARDS AND DIVISIONS",
            dollars_expiring: 531000,
            contracts_expiring: 1
          },
          {
            entity_name: "ENERGY, DEPARTMENT OF",
            dollars_expiring: 247547.9,
            contracts_expiring: 1
          }
        ]
      },
      "Q2 FY26": {
        unique_contracts_expiring: 8,
        total_dollars_expiring: 9557920.299999999,
        percentage_of_total_discounts: "47.45%",
        top_entities_expiring: [
          {
            entity_name: "GAO, EXCEPT COMPTROLLER GENERAL",
            dollars_expiring: 4454859.86,
            contracts_expiring: 1
          },
          {
            entity_name: "IMMIGRATION AND CUSTOMS ENFORCEMENT",
            dollars_expiring: 2000000,
            contracts_expiring: 1
          }
          // ... additional entities
        ]
      },
      "Q3 FY26": {
        unique_contracts_expiring: 2,
        total_dollars_expiring: 929156.7,
        percentage_of_total_discounts: "4.61%",
        top_entities_expiring: []
      },
      "Q4 FY26": {
        unique_contracts_expiring: 0,
        total_dollars_expiring: 0,
        percentage_of_total_discounts: "0.00%",
        top_entities_expiring: []
      }
    },
    processed_date: "2025-11-20T01:19:37.942Z"
  },

  // ===========================================================================
  // COLUMN O (Index 14): AI Product (truncated - shows structure)
  // ===========================================================================
  aiProduct: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    ai_product_status: "Active AI Products",
    summary: {
      grand_total_obligations: 1499132295.4800005,
      unique_products: 824,
      fiscal_years_covered: ["2022", "2023", "2024", "2025"]
    },
    fiscal_year_summaries: {
      "2022": {
        total_obligations: 285946596.2099999,
        percentage_of_grand_total: "19.07%",
        unique_products: 234,
        top_10_products: [
          {
            product: "Amazon Web Services cloud services",
            obligations: 80164297.07000001,
            percentage_of_year: "28.03%",
            percentage_of_total: "5.35%"
          },
          {
            product: "Amazon Web Services (AWS)",
            obligations: 37163676.16,
            percentage_of_year: "13.00%",
            percentage_of_total: "2.48%"
          },
          {
            product: "Amazon Web Services (AWS) cloud services",
            obligations: 25685365.39,
            percentage_of_year: "8.98%",
            percentage_of_total: "1.71%"
          },
          {
            product: "Amazon Web Services (AWS) cloud credits",
            obligations: 18366285.180000003,
            percentage_of_year: "6.42%",
            percentage_of_total: "1.23%"
          },
          {
            product: "Amazon Web Services Infrastructure Credit Units",
            obligations: 12082617,
            percentage_of_year: "4.23%",
            percentage_of_total: "0.81%"
          }
          // ... additional products
        ]
      },
      "2023": {
        total_obligations: 357674410.18999994,
        percentage_of_grand_total: "23.86%",
        unique_products: 312,
        top_10_products: [
          {
            product: "Amazon Web Services cloud services",
            obligations: 95234567.89,
            percentage_of_year: "26.63%",
            percentage_of_total: "6.35%"
          }
          // ... additional products
        ]
      },
      "2024": {
        total_obligations: 597501189.6700002,
        percentage_of_grand_total: "39.86%",
        unique_products: 456,
        top_10_products: [
          {
            product: "Amazon Web Services cloud services",
            obligations: 180000000,
            percentage_of_year: "30.13%",
            percentage_of_total: "12.01%"
          }
          // ... additional products
        ]
      },
      "2025": {
        total_obligations: 258010099.41000003,
        percentage_of_grand_total: "17.21%",
        unique_products: 289,
        top_10_products: [
          {
            product: "Amazon Web Services cloud services",
            obligations: 75000000,
            percentage_of_year: "29.07%",
            percentage_of_total: "5.00%"
          }
          // ... additional products
        ]
      }
    },
    processed_date: "2025-11-20T01:19:59.592Z"
  },

  // ===========================================================================
  // COLUMN P (Index 15): AI Category
  // ===========================================================================
  aiCategory: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    ai_category_status: "Active AI Categories",
    summary: {
      grand_total_obligations: 1499132295.4800022,
      unique_categories: 14,
      fiscal_years_covered: ["2022", "2023", "2024", "2025"]
    },
    fiscal_year_summaries: {
      "2022": {
        total_obligations: 285946596.2099999,
        percentage_of_grand_total: "19.07%",
        unique_categories: 12,
        top_10_categories: [
          {
            category: "Cloud & Infrastructure Services",
            obligations: 278182775.1399999,
            percentage_of_year: "97.28%",
            percentage_of_total: "18.56%"
          },
          {
            category: "Professional Services - Consulting",
            obligations: 3444942,
            percentage_of_year: "1.20%",
            percentage_of_total: "0.23%"
          },
          {
            category: "Professional Services - Implementation",
            obligations: 3274119.38,
            percentage_of_year: "1.15%",
            percentage_of_total: "0.22%"
          },
          {
            category: "Insufficient Information",
            obligations: 481170,
            percentage_of_year: "0.17%",
            percentage_of_total: "0.03%"
          },
          {
            category: "Software Licenses & Subscriptions",
            obligations: 147010.85,
            percentage_of_year: "0.05%",
            percentage_of_total: "0.01%"
          }
          // ... additional categories
        ]
      },
      "2023": {
        total_obligations: 357674410.18999994,
        percentage_of_grand_total: "23.86%",
        unique_categories: 13,
        top_10_categories: [
          {
            category: "Cloud & Infrastructure Services",
            obligations: 345000000,
            percentage_of_year: "96.46%",
            percentage_of_total: "23.01%"
          }
          // ... additional categories
        ]
      },
      "2024": {
        total_obligations: 597501189.6700002,
        percentage_of_grand_total: "39.86%",
        unique_categories: 14,
        top_10_categories: []
      },
      "2025": {
        total_obligations: 258010099.41000003,
        percentage_of_grand_total: "17.21%",
        unique_categories: 11,
        top_10_categories: []
      }
    },
    processed_date: "2025-11-20T01:20:19.765Z"
  },

  // ===========================================================================
  // COLUMN Q (Index 16): Top BIC Products (truncated to top 5)
  // ===========================================================================
  topBicProducts: {
    source_file: "https://drive.google.com/file/d/1cNKgLWx4mA8pAjb_WCsH_UCBF61De5N-/view?usp=drivesdk",
    summary: {
      total_all_products: 378028244.24423826,
      unique_product_count: 1201,
      total_top_25_products: 357058845.0554126,
      top_25_percentage_of_total: "94.45%",
      fiscal_years_covered: ["2022", "2023", "2024", "2025"]
    },
    yearly_totals: {
      "2022": 94183188.40526548,
      "2023": 116816051.3668004,
      "2024": 125220748.54721239,
      "2025": 41808255.92500005
    },
    top_25_products: [
      {
        product_name: "AMAZON WEB SERVICES  AWS  1 CREDIT  CAN BE USED FOR ALL AWS AND STRATEGIC COMMU",
        total_price: 81518620.3862,
        percentage_of_total: "21.56%",
        fiscal_year_breakdown: {
          "2022": {
            total_price: 8919357.993,
            percentage_of_year: "9.47%"
          },
          "2023": {
            total_price: 9779980.3332,
            percentage_of_year: "8.37%"
          },
          "2024": {
            total_price: 37483964.279999994,
            percentage_of_year: "29.93%"
          },
          "2025": {
            total_price: 25335317.78,
            percentage_of_year: "60.60%"
          }
        }
      },
      {
        product_name: "The scope of this CLIN includes all curr",
        total_price: 63712182.230200015,
        percentage_of_total: "16.85%",
        fiscal_year_breakdown: {
          "2022": {
            total_price: 50000000,
            percentage_of_year: "53.09%"
          },
          "2023": {
            total_price: 13712182.23,
            percentage_of_year: "11.74%"
          }
        }
      },
      {
        product_name: "AMAZON WEB SERVICES INC CLOUD PROFESSIONAL SERVICES",
        total_price: 45000000,
        percentage_of_total: "11.90%",
        fiscal_year_breakdown: {
          "2023": {
            total_price: 25000000,
            percentage_of_year: "21.40%"
          },
          "2024": {
            total_price: 20000000,
            percentage_of_year: "15.97%"
          }
        }
      }
      // ... additional products truncated
    ],
    processed_date: "2025-11-20T01:22:47.823Z"
  },

  // ===========================================================================
  // COLUMN R (Index 17): Reseller (FAS) - truncated to top 5
  // ===========================================================================
  reseller: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_resellers: 1499132295.48,
      total_top_15_resellers: 1409173062.2000003,
      top_15_percentage_of_total: "94.00%",
      total_unique_ueis: 139,
      ueis_shown: 15
    },
    top_15_reseller_summaries: {
      "FOUR POINTS TECHNOLOGY, L.L.C.": {
        fiscal_years: {
          "2022": 151838647.4,
          "2023": 112641355.44999999,
          "2024": 215155357.6599999,
          "2025": 132064229.86000001
        },
        total: 611699590.3700001,
        percentage_of_total: "40.80%"
      },
      "AMAZON WEB SERVICES, INC.": {
        fiscal_years: {
          "2022": 24339906.85,
          "2023": 88068061.35,
          "2024": 230184809.70000005,
          "2025": 47481962.8
        },
        total: 390074740.7000001,
        percentage_of_total: "26.02%"
      },
      "STRATEGIC COMMUNICATIONS, LLC": {
        fiscal_years: {
          "2022": 9492583.71,
          "2023": 43841737.57,
          "2024": 41656778.79,
          "2025": 26333641.5
        },
        total: 121324741.57000002,
        percentage_of_total: "8.09%"
      },
      "NEW TECH SOLUTIONS, INC.": {
        fiscal_years: {
          "2022": 9702933.709999999,
          "2023": 22787943.37,
          "2024": 12403874.66,
          "2025": 717090.74
        },
        total: 45611842.480000004,
        percentage_of_total: "3.04%"
      },
      "CARAHSOFT TECHNOLOGY CORP.": {
        fiscal_years: {
          "2022": 15000000,
          "2023": 12000000,
          "2024": 10000000,
          "2025": 5000000
        },
        total: 42000000,
        percentage_of_total: "2.80%"
      }
      // ... additional resellers truncated
    },
    processed_date: "2025-11-20T01:20:43.352Z"
  },

  // ===========================================================================
  // COLUMN S (Index 18): BIC Reseller (truncated to top 3)
  // ===========================================================================
  bicReseller: {
    source_file: "https://drive.google.com/file/d/1cNKgLWx4mA8pAjb_WCsH_UCBF61De5N-/view?usp=drivesdk",
    summary: {
      total_all_resellers: 378028244.24423826,
      unique_reseller_count: 53,
      total_top_15_resellers: 374595276.7464115,
      top_15_percentage_of_total: "99.09%",
      fiscal_years_covered: ["2022", "2023", "2024", "2025"]
    },
    yearly_totals: {
      "2022": 94183188.40526548,
      "2023": 116816051.3668004,
      "2024": 125220748.54721239,
      "2025": 41808255.92500005
    },
    top_15_resellers: [
      {
        vendor_name: "Strategic Communications",
        total_sales: 93240801.65619999,
        percentage_of_total: "24.67%",
        fiscal_year_breakdown: {
          "2022": {
            total_sales: 20559108.973,
            percentage_of_year: "21.83%"
          },
          "2023": {
            total_sales: 9781299.803199999,
            percentage_of_year: "8.37%"
          },
          "2024": {
            total_sales: 37565075.1,
            percentage_of_year: "30.00%"
          },
          "2025": {
            total_sales: 25335317.78,
            percentage_of_year: "60.60%"
          }
        }
      },
      {
        vendor_name: "Four Points Technology",
        total_sales: 75791977.54989998,
        percentage_of_total: "20.05%",
        fiscal_year_breakdown: {
          "2022": {
            total_sales: 18000000,
            percentage_of_year: "19.11%"
          },
          "2023": {
            total_sales: 25000000,
            percentage_of_year: "21.40%"
          },
          "2024": {
            total_sales: 28000000,
            percentage_of_year: "22.36%"
          },
          "2025": {
            total_sales: 4791977.55,
            percentage_of_year: "11.46%"
          }
        }
      },
      {
        vendor_name: "Carahsoft Technology",
        total_sales: 50000000,
        percentage_of_total: "13.23%",
        fiscal_year_breakdown: {
          "2022": {
            total_sales: 15000000,
            percentage_of_year: "15.93%"
          },
          "2023": {
            total_sales: 20000000,
            percentage_of_year: "17.12%"
          },
          "2024": {
            total_sales: 15000000,
            percentage_of_year: "11.98%"
          }
        }
      }
      // ... additional resellers truncated
    ],
    processed_date: "2025-11-20T01:23:57.303Z"
  },

  // ===========================================================================
  // COLUMN T (Index 19): BIC OEM (truncated to top 3)
  // ===========================================================================
  bicOem: {
    source_file: "https://drive.google.com/file/d/1cNKgLWx4mA8pAjb_WCsH_UCBF61De5N-/view?usp=drivesdk",
    summary: {
      total_all_manufacturers: 361580808.736432,
      unique_manufacturer_count: 50,
      total_top_15_manufacturers: 361570291.81765217,
      top_15_percentage_of_total: "100.00%",
      fiscal_years_covered: ["2022", "2023", "2024", "2025"]
    },
    yearly_totals: {
      "2022": 83476657.90745297,
      "2023": 111903311.57680026,
      "2024": 125220748.54721239,
      "2025": 40980090.70500005
    },
    top_15_manufacturers: [
      {
        manufacturer_name: "Amazon.com Inc",
        total_sales: 192889345.47180012,
        percentage_of_total: "53.35%",
        fiscal_year_breakdown: {
          "2022": {
            total_sales: 68403245.1676,
            percentage_of_year: "81.94%"
          },
          "2023": {
            total_sales: 53734409.5742,
            percentage_of_year: "48.02%"
          },
          "2024": {
            total_sales: 70417870.72999999,
            percentage_of_year: "56.23%"
          },
          "2025": {
            total_sales: 333820,
            percentage_of_year: "0.81%"
          }
        }
      },
      {
        manufacturer_name: "Amazon",
        total_sales: 67365382.69469997,
        percentage_of_total: "18.63%",
        fiscal_year_breakdown: {
          "2023": {
            total_sales: 30000000,
            percentage_of_year: "26.81%"
          },
          "2024": {
            total_sales: 25000000,
            percentage_of_year: "19.97%"
          },
          "2025": {
            total_sales: 12365382.69,
            percentage_of_year: "30.17%"
          }
        }
      },
      {
        manufacturer_name: "Microsoft Corporation",
        total_sales: 45000000,
        percentage_of_total: "12.44%",
        fiscal_year_breakdown: {
          "2022": {
            total_sales: 10000000,
            percentage_of_year: "11.98%"
          },
          "2023": {
            total_sales: 15000000,
            percentage_of_year: "13.41%"
          },
          "2024": {
            total_sales: 15000000,
            percentage_of_year: "11.98%"
          },
          "2025": {
            total_sales: 5000000,
            percentage_of_year: "12.20%"
          }
        }
      }
      // ... additional manufacturers truncated
    ],
    processed_date: "2025-11-20T01:30:44.874Z"
  },

  // ===========================================================================
  // COLUMN U (Index 20): FAS OEM
  // NOTE: Uses 'total_obligations' instead of 'total' for item values!
  // ===========================================================================
  fasOem: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_oems: 1499132295.4800017,
      total_top_10_oems: 1499132295.4800017,
      top_10_percentage_of_total: "100.00%",
      total_unique_oems: 1,
      oems_shown: 1
    },
    top_10_oem_summaries: {
      "Amazon": {
        fiscal_years: {
          "2022": 285946596.2099999,
          "2023": 357674410.18999994,
          "2024": 597501189.6700002,
          "2025": 258010099.41000003
        },
        total_obligations: 1499132295.4800017,  // NOTE: Different field name!
        percentage_of_total: "100.00%"
      }
    },
    processed_date: "2025-11-20T01:21:06.897Z"
  },

  // ===========================================================================
  // COLUMN V (Index 21): Funding Agency (truncated to top 5)
  // ===========================================================================
  fundingAgency: {
    source_file: "https://drive.google.com/file/d/14w7EL20t2GNjvYxGA7UeJAYbs0ebQRxZ/view?usp=drivesdk",
    summary: {
      total_all_agencies: 1499132295.4799988,
      total_top_10_agencies: 942540591.14,
      top_10_percentage_of_total: "62.87%",
      total_unique_agencies: 94,
      agencies_shown: 10
    },
    top_10_agency_summaries: {
      "U.S. CUSTOMS AND BORDER PROTECTION": {
        fiscal_years: {
          "2022": 47240207.589999996,
          "2023": 15800926.339999998,
          "2024": 73724866.89999999,
          "2025": 21132468.29
        },
        total: 157898469.11999997,
        percentage_of_total: "10.53%"
      },
      "DEPT OF THE NAVY": {
        fiscal_years: {
          "2022": 8519396.69,
          "2023": 59349043.48,
          "2024": 76235938.30999999,
          "2025": -5527213.319999998
        },
        total: 138577165.15999994,
        percentage_of_total: "9.24%"
      },
      "VETERANS AFFAIRS, DEPARTMENT OF": {
        fiscal_years: {
          "2022": 25108921.700000003,
          "2024": 22010000,
          "2025": 73028118.55
        },
        total: 120147040.25,
        percentage_of_total: "8.01%"
      },
      "DEFENSE HEALTH AGENCY (DHA)": {
        fiscal_years: {
          "2022": 12290334.99,
          "2023": 23221335.159999996,
          "2024": 44669416.150000006,
          "2025": 36776252.980000004
        },
        total: 116957339.28,
        percentage_of_total: "7.80%"
      },
      "DEPT OF THE AIR FORCE": {
        fiscal_years: {
          "2022": 9019319.18,
          "2023": 17965609.599999998,
          "2024": 18123507.560000002,
          "2025": 0
        },
        total: 45108436.34,
        percentage_of_total: "3.01%"
      }
      // ... additional agencies truncated
    },
    processed_date: "2025-11-20T01:21:53.246Z"
  },

  // ===========================================================================
  // COLUMN W (Index 22): BIC Top Products per Agency (truncated)
  // ===========================================================================
  bicTopProductsPerAgency: {
    source_file: "https://drive.google.com/file/d/1cNKgLWx4mA8pAjb_WCsH_UCBF61De5N-/view?usp=drivesdk",
    summary: {
      grand_total: 378028244.24423826,
      total_agencies: 23,
      top_10_agencies_shown: 10,
      fiscal_years_covered: ["2022", "2023", "2024", "2025"]
    },
    yearly_totals: {
      "2022": 94183188.40526548,
      "2023": 116816051.3668004,
      "2024": 125220748.54721239,
      "2025": 41808255.92500005
    },
    top_10_agencies: {
      "DOD": {
        agency_total: 147584309.035413,
        percentage_of_grand_total: "39.04%",
        fiscal_year_breakdown: {
          "2022": {
            total_spend: 35720085.14411249,
            percentage_of_year: "37.93%"
          },
          "2023": {
            total_spend: 47886719.4708,
            percentage_of_year: "40.99%"
          },
          "2024": {
            total_spend: 38452378.15050001,
            percentage_of_year: "30.71%"
          },
          "2025": {
            total_spend: 25525126.269999996,
            percentage_of_year: "61.05%"
          }
        },
        top_3_products: [
          {
            product_name: "AMAZON WEB SERVICES  AWS  1 CREDIT  CAN BE USED FOR ALL AWS AND STRATEGIC COMMU",
            total_price: 70519297.1462,
            percentage_of_agency_total: "47.78%",
            fiscal_year_breakdown: {
              "2022": {
                total_price: 6139068.273,
                percentage_of_agency_year: "17.19%"
              },
              "2023": {
                total_price: 9779980.3332,
                percentage_of_agency_year: "20.42%"
              },
              "2024": {
                total_price: 29264930.76,
                percentage_of_agency_year: "76.10%"
              },
              "2025": {
                total_price: 25335317.78,
                percentage_of_agency_year: "99.26%"
              }
            }
          },
          {
            product_name: "The scope of this CLIN includes all curr",
            total_price: 50000000,
            percentage_of_agency_total: "33.88%",
            fiscal_year_breakdown: {
              "2022": {
                total_price: 50000000,
                percentage_of_agency_year: "140.00%"
              }
            }
          },
          {
            product_name: "AWS Professional Services",
            total_price: 15000000,
            percentage_of_agency_total: "10.16%",
            fiscal_year_breakdown: {
              "2023": {
                total_price: 10000000,
                percentage_of_agency_year: "20.88%"
              },
              "2024": {
                total_price: 5000000,
                percentage_of_agency_year: "13.00%"
              }
            }
          }
        ],
        top_3_products_total: 135519297.1462,
        top_3_percentage_of_agency: "91.83%"
      },
      "DHS": {
        agency_total: 108524357.16999997,
        percentage_of_grand_total: "28.71%",
        fiscal_year_breakdown: {
          "2022": {
            total_spend: 9184.88,
            percentage_of_year: "0.01%"
          },
          "2023": {
            total_spend: 89827483.04000002,
            percentage_of_year: "76.90%"
          },
          "2024": {
            total_spend: 17543109.64,
            percentage_of_year: "14.01%"
          },
          "2025": {
            total_spend: 1144579.61,
            percentage_of_year: "2.74%"
          }
        },
        top_3_products: [
          {
            product_name: "SERVICENOW IT SERVICE MANAGEMENT FULFILLER USER V2",
            total_price: 53012520,
            percentage_of_agency_total: "48.85%",
            fiscal_year_breakdown: {
              "2023": {
                total_price: 53012520,
                percentage_of_agency_year: "59.02%"
              }
            }
          }
          // ... additional products
        ],
        top_3_products_total: 87464330.25,
        top_3_percentage_of_agency: "80.59%"
      }
      // ... additional agencies truncated
    },
    processed_date: "2025-11-20T01:31:38.254Z"
  },

  // ===========================================================================
  // COLUMN X (Index 23): OneGov Tier
  // ===========================================================================
  oneGovTier: {
    mode_tier: "Tier 2",
    overall_tier: "Tier 1",
    total_obligated: 1499132295.4800003,
    formatted_total: "$1,499,132,295.48",
    average_obligations_per_year: 374783073.87000006,
    formatted_average: "$374,783,073.87",
    fiscal_year_tiers: {
      "2022": {
        amount: 285946596.2099999,
        tier: "Tier 2",
        formatted_amount: "$285,946,596.21"
      },
      "2023": {
        amount: 357674410.18999994,
        tier: "Tier 2",
        formatted_amount: "$357,674,410.19"
      },
      "2024": {
        amount: 597501189.6700002,
        tier: "Tier 1",
        formatted_amount: "$597,501,189.67"
      },
      "2025": {
        amount: 258010099.41000003,
        tier: "Tier 2",
        formatted_amount: "$258,010,099.41"
      }
    },
    tier_counts: {
      "Tier 2": 3,
      "Tier 1": 1
    },
    tier_summary: {
      years_analyzed: 4,
      mode_frequency: 3,
      tie_broken: false,
      all_modes: ["Tier 2"]
    },
    tier_definitions: {
      "Tier 1": "> $500M",
      "Tier 2": "$200M - $500M",
      "Tier 3": "$50M - $200M",
      "Tier 4": "$10M - $50M",
      "Below Tier 4": "< $10M"
    },
    processed_date: "2025-11-20T05:28:44.127Z"
  },

  // ===========================================================================
  // COLUMN AC (Index 28): USAi Profile
  // ===========================================================================
  usaiProfile: {
    oem_name: "Amazon.com, Inc.",
    parent_company: null,
    headquarters: "Seattle, Washington, USA",
    founded: "1994",
    employees: "1,600,000+",
    ownership: "Public",
    stock_symbol: "NASDAQ: AMZN",
    overview: "Amazon is a global technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence. Starting as an online bookstore, it has grown into the world's largest e-commerce company and cloud services provider. The company has revolutionized retail, logistics, and computing services while expanding into various technology sectors including smart devices, entertainment, and autonomous systems.",
    core_products: "Amazon.com marketplace, Amazon Web Services (AWS), Amazon Prime, Alexa, Kindle, Amazon Echo, Fire TV, Ring",
    technology_focus: "cloud computing, artificial intelligence, machine learning, robotics, e-commerce platforms, IoT devices, autonomous systems, digital streaming",
    key_markets: "e-commerce, cloud services, digital content, smart home, advertising, groceries, healthcare",
    government_presence: "Major government contractor through AWS, providing cloud services to numerous federal agencies including the CIA, DoD, and NASA",
    recent_activity: "Expansion of healthcare services through Amazon Care and acquisition of One Medical, continued growth in AWS infrastructure, development of Project Kuiper satellite internet service, advancement in autonomous delivery systems",
    website: "https://www.amazon.com",
    linkedin: "https://linkedin.com/company/amazon"
  }
};


// ============================================================================
// END OF PART 3
// ============================================================================
// Continue to PART 4 for EXTRACTION_HELPERS, VALIDATION, and QUICK_REFERENCE
// ============================================================================
// ============================================================================
// B01_JSON_STRUCTURES.gs - PART 4
// ============================================================================
// SECTION 4: EXTRACTION_HELPERS - Functions to extract data by schema
// SECTION 5: VALIDATION_FUNCTIONS - Verify JSON matches expected structure
// SECTION 6: QUICK_REFERENCE - Cheat sheet for common operations
// ============================================================================


// ============================================================================
// SECTION 4: EXTRACTION_HELPERS
// ============================================================================

/**
 * Get nested value from object using dot notation path
 * @param {Object} obj - The object to extract from
 * @param {string} path - Dot notation path (e.g., 'summary.total_all_obligations')
 * @returns {*} The value at the path, or undefined if not found
 * 
 * @example
 * const total = getNestedValue(jsonData, 'summary.total_all_obligations');
 */
function getNestedValue(obj, path) {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}


/**
 * Get the primary total value from any JSON column
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS (e.g., 'obligations', 'smallBusiness')
 * @returns {number|undefined} The primary total value
 * 
 * @example
 * const total = getPrimaryValue(jsonData, 'smallBusiness');
 * // Returns: 1499132295.48
 */
function getPrimaryValue(jsonData, schemaKey) {
  const schema = COLUMN_SCHEMAS[schemaKey];
  if (!schema || !schema.primaryValuePath) return undefined;
  return getNestedValue(jsonData, schema.primaryValuePath);
}


/**
 * Get the primary total value by column letter or index
 * @param {Object} jsonData - The parsed JSON data
 * @param {string|number} columnRef - Column letter ('D') or index (3)
 * @returns {number|undefined} The primary total value
 * 
 * @example
 * const total = getPrimaryValueByColumn(jsonData, 'E');
 * const total2 = getPrimaryValueByColumn(jsonData, 4);
 */
function getPrimaryValueByColumn(jsonData, columnRef) {
  const schemaKey = COLUMN_INDEX_MAP[columnRef];
  if (!schemaKey) return undefined;
  return getPrimaryValue(jsonData, schemaKey);
}


/**
 * Get fiscal year data from any JSON column
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @returns {Object|undefined} Object with fiscal year keys and values
 * 
 * @example
 * const fyData = getFiscalYearData(jsonData, 'obligations');
 * // Returns: { "2022": 285946596.21, "2023": 357674410.19, ... }
 */
function getFiscalYearData(jsonData, schemaKey) {
  const schema = COLUMN_SCHEMAS[schemaKey];
  if (!schema) return undefined;
  
  // Pattern A: Direct fiscal_year_obligations
  if (schema.timeSeriesPath) {
    return getNestedValue(jsonData, schema.timeSeriesPath);
  }
  
  // Pattern B/C: Need to aggregate from categories
  if (schema.categoriesPath) {
    const categories = getNestedValue(jsonData, schema.categoriesPath);
    if (!categories) return undefined;
    
    const fyTotals = {};
    const isArray = Array.isArray(categories);
    
    if (isArray) {
      // Pattern C: Array of items
      categories.forEach(item => {
        const fyBreakdown = item.fiscal_year_breakdown;
        if (fyBreakdown) {
          Object.entries(fyBreakdown).forEach(([year, yearData]) => {
            const value = yearData.obligations || yearData.total_price || yearData.total_sales || 0;
            fyTotals[year] = (fyTotals[year] || 0) + value;
          });
        }
      });
    } else {
      // Pattern B: Object map
      Object.values(categories).forEach(categoryData => {
        if (categoryData.fiscal_years) {
          Object.entries(categoryData.fiscal_years).forEach(([year, value]) => {
            fyTotals[year] = (fyTotals[year] || 0) + value;
          });
        }
      });
    }
    
    return Object.keys(fyTotals).length > 0 ? fyTotals : undefined;
  }
  
  return undefined;
}


/**
 * Get categories/items from any JSON column
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @returns {Array} Array of { name, value, percentage, fiscalYears } objects
 * 
 * @example
 * const items = getCategories(jsonData, 'smallBusiness');
 * // Returns: [
 * //   { name: "SMALL BUSINESS", value: 1002704153.84, percentage: "66.89%", fiscalYears: {...} },
 * //   { name: "OTHER THAN SMALL BUSINESS", value: 496428141.64, percentage: "33.11%", fiscalYears: {...} }
 * // ]
 */
function getCategories(jsonData, schemaKey) {
  const schema = COLUMN_SCHEMAS[schemaKey];
  if (!schema || !schema.categoriesPath) return [];
  
  const categories = getNestedValue(jsonData, schema.categoriesPath);
  if (!categories) return [];
  
  const result = [];
  
  if (schema.categoryValueType === 'array') {
    // Pattern C: Array
    const keyField = schema.arrayItemKeyField;
    const valueField = schema.arrayItemValueField;
    
    categories.forEach(item => {
      result.push({
        name: item[keyField],
        value: item[valueField],
        percentage: item.percentage_of_total,
        fiscalYears: item.fiscal_year_breakdown || {}
      });
    });
  } else {
    // Pattern B: Object map
    Object.entries(categories).forEach(([name, data]) => {
      // Handle the Column U special case (total_obligations vs total)
      const value = data.total_obligations !== undefined ? data.total_obligations : data.total;
      
      result.push({
        name: name,
        value: value,
        percentage: data.percentage_of_total,
        fiscalYears: data.fiscal_years || {}
      });
    });
  }
  
  return result;
}


/**
 * Get a specific category's data by name
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @param {string} categoryName - The name of the category to find
 * @returns {Object|undefined} The category data
 * 
 * @example
 * const smallBiz = getCategoryByName(jsonData, 'smallBusiness', 'SMALL BUSINESS');
 */
function getCategoryByName(jsonData, schemaKey, categoryName) {
  const categories = getCategories(jsonData, schemaKey);
  return categories.find(c => c.name === categoryName);
}


/**
 * Get top N categories sorted by value
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @param {number} n - Number of top items to return
 * @returns {Array} Top N categories sorted by value descending
 */
function getTopCategories(jsonData, schemaKey, n = 10) {
  const categories = getCategories(jsonData, schemaKey);
  return categories
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, n);
}


/**
 * Get value for a specific fiscal year from any column
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @param {string} year - The fiscal year (e.g., '2024')
 * @returns {number|undefined} The value for that year
 */
function getValueForYear(jsonData, schemaKey, year) {
  const fyData = getFiscalYearData(jsonData, schemaKey);
  return fyData ? fyData[year] : undefined;
}


/**
 * Extract all data from a JSON column in a normalized format
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @returns {Object} Normalized data structure
 * 
 * @example
 * const normalized = extractNormalizedData(jsonData, 'smallBusiness');
 * // Returns: {
 * //   schema: {...},
 * //   primaryValue: 1499132295.48,
 * //   fiscalYears: { "2022": ..., "2023": ..., ... },
 * //   categories: [...],
 * //   metadata: { processedDate: "...", sourceFile: "..." }
 * // }
 */
function extractNormalizedData(jsonData, schemaKey) {
  const schema = COLUMN_SCHEMAS[schemaKey];
  if (!schema) return null;
  
  return {
    schema: {
      column: schema.column,
      columnIndex: schema.columnIndex,
      headerName: schema.headerName,
      structurePattern: schema.structurePattern,
      dataSource: schema.dataSource
    },
    primaryValue: getPrimaryValue(jsonData, schemaKey),
    fiscalYears: getFiscalYearData(jsonData, schemaKey),
    categories: getCategories(jsonData, schemaKey),
    metadata: {
      processedDate: jsonData.processed_date,
      sourceFile: jsonData.source_file
    }
  };
}


/**
 * Determine which schema applies to a JSON object based on its structure
 * @param {Object} jsonData - The parsed JSON data
 * @returns {string|null} The schema key that matches, or null if none match
 */
function detectSchema(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') return null;
  
  // Pattern F: Flat profile (Column AC)
  if (jsonData.oem_name && jsonData.headquarters) {
    return 'usaiProfile';
  }
  
  // Pattern A: Simple totals with direct fiscal_year_obligations
  if (jsonData.total_obligated && jsonData.fiscal_year_obligations) {
    return 'obligations';
  }
  
  // Pattern A: OneGov Tier
  if (jsonData.mode_tier && jsonData.tier_definitions) {
    return 'oneGovTier';
  }
  
  // Check for specific category paths
  if (jsonData.business_size_summaries) return 'smallBusiness';
  if (jsonData.tier_summaries) return 'sumTier';
  if (jsonData.sum_type_summaries) return 'sumType';
  if (jsonData.top_contract_summaries) return 'contractVehicle';
  if (jsonData.top_10_department_summaries) return 'fundingDepartment';
  if (jsonData.discount_categories) return 'oneGovDiscountedProducts';
  if (jsonData.top_10_reference_piids) return 'topRefPiid';
  if (jsonData.top_10_piids) return 'topPiid';
  if (jsonData.expiring_by_quarter) return 'activeContracts';
  if (jsonData.discount_contracts_expiring_by_quarter) return 'expiringDiscountedProducts';
  if (jsonData.ai_product_status) return 'aiProduct';
  if (jsonData.ai_category_status) return 'aiCategory';
  if (jsonData.top_25_products) return 'topBicProducts';
  if (jsonData.top_15_reseller_summaries) return 'reseller';
  if (jsonData.top_15_resellers && Array.isArray(jsonData.top_15_resellers)) return 'bicReseller';
  if (jsonData.top_15_manufacturers) return 'bicOem';
  if (jsonData.top_10_oem_summaries) return 'fasOem';
  if (jsonData.top_10_agency_summaries) return 'fundingAgency';
  if (jsonData.top_10_agencies && jsonData.summary?.grand_total) return 'bicTopProductsPerAgency';
  
  return null;
}


// ============================================================================
// SECTION 5: VALIDATION_FUNCTIONS
// ============================================================================

/**
 * Validate that JSON data matches expected schema structure
 * @param {Object} jsonData - The parsed JSON data
 * @param {string} schemaKey - The key from COLUMN_SCHEMAS
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateJsonStructure(jsonData, schemaKey) {
  const schema = COLUMN_SCHEMAS[schemaKey];
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!schema) {
    result.isValid = false;
    result.errors.push(`Unknown schema key: ${schemaKey}`);
    return result;
  }
  
  if (!jsonData || typeof jsonData !== 'object') {
    result.isValid = false;
    result.errors.push('JSON data is null or not an object');
    return result;
  }
  
  // Check required fields
  if (schema.requiredFields) {
    schema.requiredFields.forEach(field => {
      if (getNestedValue(jsonData, field) === undefined) {
        result.errors.push(`Missing required field: ${field}`);
        result.isValid = false;
      }
    });
  }
  
  // Check primary value exists and is a number
  if (schema.primaryValuePath) {
    const primaryValue = getNestedValue(jsonData, schema.primaryValuePath);
    if (primaryValue === undefined) {
      result.warnings.push(`Primary value path '${schema.primaryValuePath}' not found`);
    } else if (typeof primaryValue !== 'number') {
      result.warnings.push(`Primary value is not a number: ${typeof primaryValue}`);
    }
  }
  
  // Check categories path exists
  if (schema.categoriesPath) {
    const categories = getNestedValue(jsonData, schema.categoriesPath);
    if (categories === undefined) {
      result.warnings.push(`Categories path '${schema.categoriesPath}' not found`);
    } else if (schema.categoryValueType === 'array' && !Array.isArray(categories)) {
      result.errors.push(`Expected array at '${schema.categoriesPath}', got ${typeof categories}`);
      result.isValid = false;
    } else if (schema.categoryValueType === 'object_map' && (Array.isArray(categories) || typeof categories !== 'object')) {
      result.errors.push(`Expected object at '${schema.categoriesPath}', got ${Array.isArray(categories) ? 'array' : typeof categories}`);
      result.isValid = false;
    }
  }
  
  return result;
}


/**
 * Validate JSON string and parse it
 * @param {string} jsonString - The JSON string to validate and parse
 * @returns {Object} { isValid: boolean, data: Object|null, error: string|null }
 */
function parseAndValidateJson(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return { isValid: false, data: null, error: 'Input is not a string' };
  }
  
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('{')) {
    return { isValid: false, data: null, error: 'String does not start with {' };
  }
  
  try {
    const data = JSON.parse(trimmed);
    return { isValid: true, data: data, error: null };
  } catch (e) {
    return { isValid: false, data: null, error: e.message };
  }
}


/**
 * Get validation report for all JSON columns in a row
 * @param {Array} rowData - Array of cell values from a sheet row
 * @returns {Object} Map of column letters to validation results
 */
function validateRowJsonColumns(rowData) {
  const results = {};
  
  Object.entries(COLUMN_INDEX_MAP).forEach(([key, schemaKey]) => {
    // Skip numeric keys (they're duplicates of letter keys)
    if (!isNaN(key)) return;
    
    const schema = COLUMN_SCHEMAS[schemaKey];
    const cellValue = rowData[schema.columnIndex];
    
    if (!cellValue || cellValue.trim() === '') {
      results[key] = { status: 'empty', schemaKey: schemaKey };
      return;
    }
    
    const parseResult = parseAndValidateJson(cellValue);
    if (!parseResult.isValid) {
      results[key] = { status: 'parse_error', error: parseResult.error, schemaKey: schemaKey };
      return;
    }
    
    const validationResult = validateJsonStructure(parseResult.data, schemaKey);
    results[key] = {
      status: validationResult.isValid ? 'valid' : 'invalid',
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      schemaKey: schemaKey
    };
  });
  
  return results;
}


// ============================================================================
// SECTION 6: QUICK_REFERENCE
// ============================================================================

/**
 * QUICK REFERENCE GUIDE
 * =====================
 * 
 * This section provides quick lookup tables and common operations.
 */

const QUICK_REFERENCE = {
  
  // ---------------------------------------------------------------------------
  // Column Letter to Schema Key Mapping
  // ---------------------------------------------------------------------------
  columnToSchema: {
    'D': 'obligations',
    'E': 'smallBusiness',
    'F': 'sumTier',
    'G': 'sumType',
    'H': 'contractVehicle',
    'I': 'fundingDepartment',
    'J': 'oneGovDiscountedProducts',
    'K': 'topRefPiid',
    'L': 'topPiid',
    'M': 'activeContracts',
    'N': 'expiringDiscountedProducts',
    'O': 'aiProduct',
    'P': 'aiCategory',
    'Q': 'topBicProducts',
    'R': 'reseller',
    'S': 'bicReseller',
    'T': 'bicOem',
    'U': 'fasOem',
    'V': 'fundingAgency',
    'W': 'bicTopProductsPerAgency',
    'X': 'oneGovTier',
    'AC': 'usaiProfile'
  },
  
  // ---------------------------------------------------------------------------
  // Primary Value Paths - Quick lookup
  // ---------------------------------------------------------------------------
  primaryValuePaths: {
    'D': 'total_obligated',
    'E': 'summary.total_all_obligations',
    'F': 'summary.total_all_obligations',
    'G': 'summary.total_all_obligations',
    'H': 'summary.total_all_obligations',
    'I': 'summary.total_all_departments',
    'J': 'summary.total_obligations_with_discounts',
    'K': 'total_obligations',
    'L': 'total_obligations',
    'M': 'summary.total_obligations',
    'N': 'summary.grand_total_all_obligations',
    'O': 'summary.grand_total_obligations',
    'P': 'summary.grand_total_obligations',
    'Q': 'summary.total_all_products',
    'R': 'summary.total_all_resellers',
    'S': 'summary.total_all_resellers',
    'T': 'summary.total_all_manufacturers',
    'U': 'summary.total_all_oems',
    'V': 'summary.total_all_agencies',
    'W': 'summary.grand_total',
    'X': 'total_obligated',
    'AC': null  // No primary value for profile
  },
  
  // ---------------------------------------------------------------------------
  // Categories/Items Paths - Quick lookup
  // ---------------------------------------------------------------------------
  categoriesPaths: {
    'D': null,
    'E': 'business_size_summaries',
    'F': 'tier_summaries',
    'G': 'sum_type_summaries',
    'H': 'top_contract_summaries',
    'I': 'top_10_department_summaries',
    'J': 'discount_categories',
    'K': 'top_10_reference_piids',
    'L': 'top_10_piids',
    'M': 'expiring_by_quarter',
    'N': 'discount_contracts_expiring_by_quarter',
    'O': 'fiscal_year_summaries',
    'P': 'fiscal_year_summaries',
    'Q': 'top_25_products',
    'R': 'top_15_reseller_summaries',
    'S': 'top_15_resellers',
    'T': 'top_15_manufacturers',
    'U': 'top_10_oem_summaries',
    'V': 'top_10_agency_summaries',
    'W': 'top_10_agencies',
    'X': 'fiscal_year_tiers',
    'AC': null
  },
  
  // ---------------------------------------------------------------------------
  // Data Sources by Column
  // ---------------------------------------------------------------------------
  dataSources: {
    FAS: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'U', 'V'],
    BIC: ['Q', 'S', 'T', 'W'],
    CALCULATED: ['X'],
    USAI: ['AC']
  },
  
  // ---------------------------------------------------------------------------
  // Patterns by Column
  // ---------------------------------------------------------------------------
  patternsByColumn: {
    PATTERN_A_SIMPLE_TOTALS: ['D', 'X'],
    PATTERN_B_SUMMARY_WITH_OBJECT_MAP: ['E', 'F', 'G', 'H', 'I', 'J', 'R', 'U', 'V'],
    PATTERN_C_SUMMARY_WITH_ARRAY: ['K', 'L', 'Q', 'S', 'T'],
    PATTERN_D_NESTED_FISCAL_YEAR: ['M', 'O', 'P'],
    PATTERN_E_NESTED_ENTITY: ['N', 'W'],
    PATTERN_F_FLAT_PROFILE: ['AC']
  },
  
  // ---------------------------------------------------------------------------
  // Common Operations Examples
  // ---------------------------------------------------------------------------
  examples: {
    // Get total obligated from Column D
    getTotalObligated: `
      const json = JSON.parse(cellValue);
      const total = json.total_obligated;
    `,
    
    // Get small business percentage from Column E
    getSmallBusinessPct: `
      const json = JSON.parse(cellValue);
      const smallBizPct = json.business_size_summaries['SMALL BUSINESS'].percentage_of_total;
    `,
    
    // Get top contract vehicle from Column H
    getTopContractVehicle: `
      const json = JSON.parse(cellValue);
      const contracts = json.top_contract_summaries;
      const topContract = Object.entries(contracts)
        .sort((a, b) => b[1].total - a[1].total)[0];
      const name = topContract[0];
      const value = topContract[1].total;
    `,
    
    // Get top reseller from Column R
    getTopReseller: `
      const json = JSON.parse(cellValue);
      const resellers = json.top_15_reseller_summaries;
      const topReseller = Object.entries(resellers)
        .sort((a, b) => b[1].total - a[1].total)[0];
    `,
    
    // Get FY2024 value from Column D
    getFY2024Value: `
      const json = JSON.parse(cellValue);
      const fy2024 = json.fiscal_year_obligations['2024'];
    `,
    
    // Get tier classification from Column X
    getTier: `
      const json = JSON.parse(cellValue);
      const tier = json.overall_tier;  // e.g., "Tier 1"
      const modeTier = json.mode_tier; // Most common tier across years
    `,
    
    // Using helper functions
    usingHelpers: `
      // Parse JSON first
      const json = JSON.parse(cellValue);
      
      // Get primary value for any column
      const total = getPrimaryValue(json, 'smallBusiness');
      
      // Get all categories as normalized array
      const categories = getCategories(json, 'contractVehicle');
      
      // Get fiscal year data
      const fyData = getFiscalYearData(json, 'obligations');
      
      // Get specific year
      const fy2024 = getValueForYear(json, 'obligations', '2024');
      
      // Auto-detect schema
      const schemaKey = detectSchema(json);
      
      // Full normalized extraction
      const normalized = extractNormalizedData(json, 'smallBusiness');
    `
  },
  
  // ---------------------------------------------------------------------------
  // Known Issues and Gotchas
  // ---------------------------------------------------------------------------
  gotchas: {
    columnU_totalField: "Column U (FAS OEM) uses 'total_obligations' instead of 'total' for item values",
    columnO_productKey: "Column O (AI Product) has a typo: ' product' with leading space in some records",
    negativeValues: "Some fiscal year values can be negative (e.g., contract deobligations)",
    missingYears: "Not all fiscal years are present in every record - check for undefined",
    percentageFormat: "Percentages are strings with % symbol (e.g., '66.89%') - parse with parseFloat()",
    emptyCategories: "Some columns may have empty categories arrays if no data exists"
  }
};


// ============================================================================
// SECTION 7: EXPORT FOR TESTING
// ============================================================================

/**
 * Test function to verify schemas are working
 * Run this from Apps Script editor to validate setup
 */
function testJsonStructures() {
  console.log('=== B01_JSON_STRUCTURES Test ===');
  console.log(`Total schemas defined: ${Object.keys(COLUMN_SCHEMAS).length}`);
  console.log(`Columns mapped: ${Object.keys(QUICK_REFERENCE.columnToSchema).join(', ')}`);
  
  // Test extraction helpers with sample data
  const sampleObligations = COMPLETE_EXAMPLES.obligations;
  const total = getPrimaryValue(sampleObligations, 'obligations');
  console.log(`Sample obligations total: ${total}`);
  
  const fyData = getFiscalYearData(sampleObligations, 'obligations');
  console.log(`Fiscal years: ${Object.keys(fyData).join(', ')}`);
  
  // Test schema detection
  const detected = detectSchema(sampleObligations);
  console.log(`Detected schema: ${detected}`);
  
  // Test validation
  const validation = validateJsonStructure(sampleObligations, 'obligations');
  console.log(`Validation passed: ${validation.isValid}`);
  
  console.log('=== Test Complete ===');
}


// ============================================================================
// END OF B01_JSON_STRUCTURES.gs
// ============================================================================
// 
// TO USE THIS FILE:
// 1. Combine all 4 parts into a single .gs file in your Apps Script project
// 2. The COLUMN_SCHEMAS, STRUCTURE_PATTERNS, COMPLETE_EXAMPLES, and helper
//    functions will all be available globally
// 3. Use the QUICK_REFERENCE for rapid lookups
// 4. Run testJsonStructures() to verify setup
//
// MAINTENANCE:
// - If JSON structures change, update the relevant COLUMN_SCHEMAS entry
// - If new columns are added, add new entries to COLUMN_SCHEMAS and COLUMN_INDEX_MAP
// - Update COMPLETE_EXAMPLES when structure changes significantly
//
// ============================================================================
// File organization clean - JSON files removed
