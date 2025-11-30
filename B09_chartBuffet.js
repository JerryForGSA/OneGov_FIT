/**
 * @fileoverview Chart Buffet System for OneGov FIT Market Report Builder
 * @module B16_chartBuffet
 * @version 1.2.0
 * @description Comprehensive chart generation system with intelligent type selection
 *              based on data characteristics and user preferences. URGENT FIXES v526.
 * @author OneGov FIT Market Development Team
 */

/**
 * Abbreviate long agency names for better chart readability
 * @param {string} agencyName - Full agency name
 * @returns {string} Abbreviated agency name
 */
function abbreviateAgencyName(agencyName) {
  if (!agencyName || typeof agencyName !== 'string') return agencyName;
  
  const abbreviations = {
    'VETERANS AFFAIRS, DEPARTMENT OF': 'VA',
    'DEFENSE INFORMATION SYSTEMS AGENCY (DISA)': 'DISA',
    'CENTERS FOR MEDICARE AND MEDICAID SERVICES': 'CMS',
    'DEPT OF THE NAVY': 'Navy',
    'DEPT OF THE ARMY': 'Army',
    'DEPT OF THE AIR FORCE': 'Air Force',
    'STATE, DEPARTMENT OF': 'State Dept',
    'INTERNAL REVENUE SERVICE': 'IRS',
    'DEFENSE INFORMATION SYSTEMS AGENCY': 'DISA',
    'HOMELAND SECURITY, DEPARTMENT OF': 'DHS',
    'TREASURY, DEPARTMENT OF THE': 'Treasury',
    'HEALTH AND HUMAN SERVICES, DEPARTMENT OF': 'HHS',
    'TRANSPORTATION, DEPARTMENT OF': 'DOT',
    'EDUCATION, DEPARTMENT OF': 'Education',
    'AGRICULTURE, DEPARTMENT OF': 'USDA',
    'JUSTICE, DEPARTMENT OF': 'DOJ',
    'ENERGY, DEPARTMENT OF': 'DOE',
    'COMMERCE, DEPARTMENT OF': 'Commerce',
    'LABOR, DEPARTMENT OF': 'Labor',
    'HOUSING AND URBAN DEVELOPMENT, DEPARTMENT OF': 'HUD',
    'ENVIRONMENTAL PROTECTION AGENCY': 'EPA',
    'NATIONAL AERONAUTICS AND SPACE ADMINISTRATION': 'NASA',
    'SOCIAL SECURITY ADMINISTRATION': 'SSA',
    'U.S. CUSTOMS AND BORDER PROTECTION': 'CBP',
    'CUSTOMS AND BORDER PROTECTION': 'CBP',
    'IMMIGRATION AND CUSTOMS ENFORCEMENT': 'ICE',
    'FEDERAL BUREAU OF INVESTIGATION': 'FBI',
    'CENTRAL INTELLIGENCE AGENCY': 'CIA'
  };
  
  // First try exact match
  const upperName = agencyName.toUpperCase();
  if (abbreviations[upperName]) {
    return abbreviations[upperName];
  }
  
  // Then try partial matches for common patterns
  for (const [fullName, abbrev] of Object.entries(abbreviations)) {
    if (upperName.includes(fullName)) {
      return abbrev;
    }
  }
  
  // If no match found, return original name (truncate if very long)
  return agencyName.length > 25 ? agencyName.substring(0, 22) + '...' : agencyName;
}

/**
 * Format currency values in billions/millions for better readability
 * @param {number} value - Currency value
 * @returns {string} Formatted currency string
 */
function formatCurrencyShort(value) {
  if (!value || isNaN(value)) return '$0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    return '$' + (value / 1000000000).toFixed(1) + 'B';
  } else if (absValue >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  } else if (absValue >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  } else {
    return '$' + value.toFixed(0);
  }
}

/**
 * Chart type selection logic based on entity count and data type
 * @param {number} entityCount - Number of entities to display
 * @param {string} dataType - Type of data (obligations, piid, etc.)
 * @returns {Array<string>} Recommended chart types
 */
function getRecommendedChartTypes(entityCount, dataType) {
  // Special cases for PIID data
  if (dataType === 'topRefPiid' || dataType === 'topPiid') {
    return ['funnel', 'horizontalBar', 'verticalBar'];
  }
  
  // Entity count based recommendations - REMOVED LINE CHARTS for entity-based data
  if (entityCount <= 5) {
    return ['verticalBar', 'horizontalBar', 'pie', 'doughnut'];
  } else if (entityCount <= 10) {
    return ['horizontalBar', 'stackedBar', 'pie'];
  } else if (entityCount <= 15) {
    return ['horizontalBar', 'funnel'];
  } else {
    return ['horizontalBar', 'funnel'];
  }
}

/**
 * Generate complete chart buffet for a column
 * @param {string} entityType - Type of entity (agency, oem, vendor)
 * @param {string} columnId - Column identifier
 * @param {Array} entities - Pre-processed entity data from DataManager
 * @param {Object} options - Chart generation options
 * @returns {Array} Array of chart cards
 */
function generateChartBuffet(entityType, columnId, entities, options = {}) {
  const { topN = 10, selectedEntities = [], forceChartTypes = null } = options;
  
  // EMERGENCY DEBUG: Check if entities data exists
  console.log(`🚨 EMERGENCY DEBUG: Chart Buffet called with:`, {
    entityType, 
    columnId, 
    entitiesLength: entities?.length || 0, 
    topN, 
    hasEntities: !!entities,
    firstEntity: entities?.[0] || 'NONE'
  });
  
  // If no entities, return empty array immediately
  if (!entities || entities.length === 0) {
    console.error(`🚨 CRITICAL: No entities provided to generateChartBuffet for ${entityType}/${columnId}`);
    return [];
  }
  
  // Use topN directly (no more "All" option)
  const effectiveTopN = topN || 10;
  
  // Calculate overall total from all entities for percentage calculations
  const overallTotal = entities.reduce((sum, e) => sum + (e.value || 0), 0);
  
  // Get top N entities and calculate "Others"
  const topEntities = entities.slice(0, effectiveTopN);
  const topTotal = topEntities.reduce((sum, e) => sum + (e.value || 0), 0);
  const othersValue = overallTotal - topTotal;
  
  // Create entities with "Others" category if there are remaining entities
  const entitiesWithOthers = [...topEntities];
  if (othersValue > 0 && entities.length > effectiveTopN) {
    entitiesWithOthers.push({
      name: 'Others',
      value: othersValue,
      isOthers: true
    });
  }
  
  console.log(`📊 Chart Buffet: Top ${effectiveTopN} total: ${formatCurrencyShort(topTotal)}, Others: ${formatCurrencyShort(othersValue)}, Overall: ${formatCurrencyShort(overallTotal)}`);
  
  // Get DataManager instance
  const dataManager = getDataManager();
  const cards = [];
  
  // Determine recommended chart types
  const chartTypes = forceChartTypes || getRecommendedChartTypes(effectiveTopN, columnId);
  
  // Generate KPI card with top-line numbers (always included)
  const kpiCard = generateKPINumbers(entities, entityType, columnId);
  if (kpiCard) cards.push(kpiCard);
  
  // Generate each recommended chart type
  chartTypes.forEach(chartType => {
    let card = null;
    
    switch(chartType) {
      case 'verticalBar':
        card = generateVerticalBarChart(entitiesWithOthers, entityType, columnId, effectiveTopN, overallTotal);
        break;
      case 'horizontalBar':
        card = generateHorizontalBarChart(entitiesWithOthers, entityType, columnId, effectiveTopN, overallTotal);
        break;
      case 'line':
        card = generateLineChart(entitiesWithOthers, entityType, columnId, overallTotal);
        break;
      case 'funnel':
        card = generateFunnelChart(entitiesWithOthers, entityType, columnId, effectiveTopN, overallTotal);
        break;
      case 'pie':
        card = generatePieChart(entitiesWithOthers, entityType, columnId, effectiveTopN, overallTotal);
        break;
      case 'doughnut':
        card = generateDoughnutChart(entitiesWithOthers, entityType, columnId, effectiveTopN, overallTotal);
        break;
      case 'stackedBar':
        // Year over Year chart limited to max 5 entities (even if user selects Top 15)
        card = generateStackedBarChart(entities, entityType, columnId, Math.min(effectiveTopN, 5));
        break;
      case 'area':
        card = generateAreaChart(entities, entityType, columnId);
        break;
    }
    
    if (card) cards.push(card);
  });
  
  // Add trend over time if fiscal year data exists
  const trendCard = generateTrendOverTime(entityType, columnId, selectedEntities);
  if (trendCard) cards.push(trendCard);
  
  return cards;
}

/**
 * Generate KPI top-line numbers card
 */
function generateKPINumbers(entities, entityType, columnId) {
  try {
    const totalValue = entities.reduce((sum, e) => sum + (e.value || 0), 0);
    const avgValue = entities.length > 0 ? totalValue / entities.length : 0;
    const maxEntity = entities.reduce((max, e) => e.value > max.value ? e : max, entities[0] || {});
    
    // Create entity type label for display
    const entityLabel = entityType === 'agency' ? 'Agencies' : 
                       entityType === 'oem' ? 'OEMs' : 
                       entityType === 'vendor' ? 'Vendors' : 'Entities';
    
    return {
      id: `${entityType}_${columnId}_kpi`,
      title: `Top ${entities.length} ${entityLabel} Overview`,
      cardType: 'kpi_numbers',
      kpiData: {
        count: {
          label: 'Entity Count',
          value: entities.length,
          raw: entities.length
        },
        average: {
          label: 'Average',
          value: formatCurrencyShort(avgValue),
          raw: avgValue
        },
        total: {
          label: 'Total Value',
          value: formatCurrencyShort(totalValue),
          raw: totalValue
        },
        top: {
          label: 'Top Entity',
          value: maxEntity.name || 'N/A',
          amount: formatCurrency(maxEntity.value || 0)
        }
      },
      tableData: {
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Value', formatCurrency(totalValue)],
          ['Average Value', formatCurrency(avgValue)],
          ['Entity Count', entities.length.toString()],
          ['Top Entity', maxEntity.name || 'N/A'],
          ['Top Entity Value', formatCurrency(maxEntity.value || 0)]
        ]
      },
      displayStyle: 'cards' // or 'table'
    };
  } catch (error) {
    console.error('Error generating KPI numbers:', error);
    return null;
  }
}

/**
 * Generate vertical bar chart (for ≤5 entities)
 */
function generateVerticalBarChart(entities, entityType, columnId, topN, overallTotal) {
  // entities already includes "Others" if applicable
  const actualTopN = entities.filter(e => !e.isOthers).length;
  const titleSuffix = `Top ${actualTopN}${entities.some(e => e.isOthers) ? ' + Others' : ''}`;
  
  return {
    id: `${entityType}_${columnId}_verticalBar`,
    title: `${getColumnDisplayName(columnId)} - ${titleSuffix}`,
    cardType: 'chart',
    chartType: 'bar',
    chartData: {
      labels: entities.map(e => {
        if (e.isOthers) return 'Others';
        return entityType === 'agency' ? abbreviateAgencyName(e.name) : e.name;
      }),
      datasets: [{
        label: getColumnDisplayName(columnId),
        data: entities.map(e => e.value),
        backgroundColor: entities.map(e => e.isOthers ? '#9ca3af' : '#144673'),
        borderColor: entities.map(e => e.isOthers ? '#6b7280' : '#0a2240'),
        borderWidth: 1
      }]
    },
    chartOptions: {
      indexAxis: 'x', // Vertical bars
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Top ${topN} by ${getColumnDisplayName(columnId)}`
        }
      }
    },
    tableData: {
      headers: ['Entity', 'Value', 'Rank'],
      rows: topEntities.map((entity, index) => [
        entity.name,
        formatCurrency(entity.value),
        `#${index + 1}`
      ])
    }
  };
}

/**
 * Generate horizontal bar chart (better for longer names)
 */
function generateHorizontalBarChart(entities, entityType, columnId, topN, overallTotal) {
  // entities already includes "Others" if applicable
  const actualTopN = entities.filter(e => !e.isOthers).length;
  const titleSuffix = `Top ${actualTopN}${entities.some(e => e.isOthers) ? ' + Others' : ''}`;
  
  return {
    id: `${entityType}_${columnId}_horizontalBar`,
    title: `${getColumnDisplayName(columnId)} - ${titleSuffix} (Horizontal)`,
    cardType: 'chart',
    chartType: 'bar',
    chartData: {
      labels: entities.map(e => {
        if (e.isOthers) return 'Others';
        return entityType === 'agency' ? abbreviateAgencyName(e.name) : e.name;
      }),
      datasets: [{
        label: getColumnDisplayName(columnId),
        data: entities.map(e => e.value),
        backgroundColor: entities.map(e => e.isOthers ? '#9ca3af' : '#144673'),
        borderColor: entities.map(e => e.isOthers ? '#6b7280' : '#0a2240'),
        borderWidth: 1
      }]
    },
    chartOptions: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrencyShort(value);
            }
          }
        }
      }
    },
    tableData: {
      headers: ['Rank', 'Entity', 'Value', 'Percentage'],
      rows: topEntities.map((entity, index) => {
        const totalValue = topEntities.reduce((sum, e) => sum + e.value, 0);
        const percentage = totalValue > 0 ? ((entity.value / totalValue) * 100).toFixed(1) : '0.0';
        return [
          `#${index + 1}`,
          entity.name,
          formatCurrency(entity.value),
          `${percentage}%`
        ];
      })
    }
  };
}

/**
 * Generate line chart (for trends and 5-15 entities)
 */
function generateLineChart(entities, entityType, columnId) {
  return {
    id: `${entityType}_${columnId}_line`,
    title: `${getColumnDisplayName(columnId)} - Trend Analysis`,
    cardType: 'chart',
    chartType: 'line',
    chartData: {
      labels: entities.map(e => entityType === 'agency' ? abbreviateAgencyName(e.name) : e.name),
      datasets: [{
        label: getColumnDisplayName(columnId),
        data: entities.map(e => e.value),
        borderColor: '#144673',
        backgroundColor: 'rgba(20, 70, 115, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    chartOptions: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrencyShort(value);
            }
          }
        }
      }
    },
    tableData: {
      headers: ['Position', 'Entity', 'Value'],
      rows: entities.map((entity, index) => [
        `${index + 1}`,
        entity.name,
        formatCurrency(entity.value)
      ])
    }
  };
}

/**
 * Generate funnel chart (for PIID and conversion data)
 */
function generateFunnelChart(entities, entityType, columnId, topN) {
  const topEntities = entities.slice(0, topN);
  const titleSuffix = topN >= entities.length ? `All ${entities.length}` : `Top ${topN}`;
  
  // Calculate percentages for funnel
  const maxValue = Math.max(...topEntities.map(e => e.value));
  const funnelData = topEntities.map(e => ({
    ...e,
    percentage: (e.value / maxValue) * 100
  }));
  
  return {
    id: `${entityType}_${columnId}_funnel`,
    title: `${getColumnDisplayName(columnId)} - ${titleSuffix} Funnel`,
    cardType: 'funnel',
    funnelData: funnelData.map((item, index) => ({
      label: entityType === 'agency' ? abbreviateAgencyName(item.name) : item.name,
      value: item.value,
      percentage: item.percentage,
      color: generateColorGradient(topN)[index],
      displayValue: formatCurrency(item.value)
    })),
    summary: {
      topValue: funnelData[0]?.value || 0,
      bottomValue: funnelData[funnelData.length - 1]?.value || 0,
      conversionRate: funnelData.length > 1 ? 
        ((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(1) + '%' : 
        'N/A'
    },
    tableData: {
      headers: ['Stage', 'Entity', 'Value', 'Relative %', 'Drop-off %'],
      rows: funnelData.map((item, index) => {
        const prevValue = index > 0 ? funnelData[index - 1].value : item.value;
        const dropOff = index > 0 ? 
          (((prevValue - item.value) / prevValue) * 100).toFixed(1) + '%' : 
          '0.0%';
        return [
          `${index + 1}`,
          item.name,
          formatCurrency(item.value),
          `${item.percentage.toFixed(1)}%`,
          dropOff
        ];
      })
    }
  };
}

/**
 * Generate fiscal year breakdown pie chart
 */
function generatePieChart(entities, entityType, columnId, topN) {
  // Get DataManager for fiscal year aggregation
  const dataManager = getDataManager();
  
  // Get all entities for this type to aggregate fiscal years
  const allEntities = dataManager.getEntities(entityType);
  
  // Aggregate fiscal year data across all entities
  const fiscalYearTotals = {};
  
  allEntities.forEach(entity => {
    const jsonData = entity[columnId];
    if (!jsonData) return;
    
    // Extract fiscal year data based on column type
    let fyData = null;
    switch(columnId) {
      case 'reseller':
        // Aggregate from top_15_reseller_summaries
        if (jsonData.top_15_reseller_summaries) {
          Object.values(jsonData.top_15_reseller_summaries).forEach(reseller => {
            if (reseller.fiscal_years) {
              Object.entries(reseller.fiscal_years).forEach(([year, value]) => {
                fiscalYearTotals[year] = (fiscalYearTotals[year] || 0) + value;
              });
            }
          });
        }
        break;
        
      case 'bicOem':
        // Use yearly_totals from BIC OEM structure
        if (jsonData.yearly_totals) {
          Object.entries(jsonData.yearly_totals).forEach(([year, value]) => {
            fiscalYearTotals[year] = (fiscalYearTotals[year] || 0) + value;
          });
        }
        break;
        
      case 'fasOem':
        // Aggregate from top_10_oem_summaries
        if (jsonData.top_10_oem_summaries) {
          Object.values(jsonData.top_10_oem_summaries).forEach(oem => {
            if (oem.fiscal_years) {
              Object.entries(oem.fiscal_years).forEach(([year, value]) => {
                fiscalYearTotals[year] = (fiscalYearTotals[year] || 0) + value;
              });
            }
          });
        }
        break;
        
      case 'fundingAgency':
        // Aggregate from top_10_agency_summaries
        if (jsonData.top_10_agency_summaries) {
          Object.values(jsonData.top_10_agency_summaries).forEach(agency => {
            if (agency.fiscal_years) {
              Object.entries(agency.fiscal_years).forEach(([year, value]) => {
                fiscalYearTotals[year] = (fiscalYearTotals[year] || 0) + value;
              });
            }
          });
        }
        break;
        
      default:
        // Generic fiscal year extraction
        const fyData = jsonData.fiscal_year_obligations || 
                       jsonData.fiscal_years || 
                       jsonData.yearly_totals || 
                       jsonData.fiscal_year_breakdown;
        
        if (fyData && typeof fyData === 'object') {
          Object.entries(fyData).forEach(([year, value]) => {
            fiscalYearTotals[year] = (fiscalYearTotals[year] || 0) + (parseFloat(value) || 0);
          });
        }
    }
  });
  
  // Sort years and create chart data
  const years = Object.keys(fiscalYearTotals).sort();
  const values = years.map(year => fiscalYearTotals[year]);
  const totalValue = values.reduce((sum, val) => sum + val, 0);
  
  // If no fiscal year data, fallback to top entities
  if (years.length === 0) {
    const topEntities = entities.slice(0, Math.min(topN, 8));
    const entityTotal = topEntities.reduce((sum, e) => sum + e.value, 0);
    
    return {
      id: `${entityType}_${columnId}_pie`,
      title: `${getColumnDisplayName(columnId)} - Top ${topEntities.length} Distribution`,
      cardType: 'chart',
      chartType: 'pie',
      chartData: {
        labels: topEntities.map(e => entityType === 'agency' ? abbreviateAgencyName(e.name) : e.name),
        datasets: [{
          data: topEntities.map(e => e.value),
          backgroundColor: generateColorGradient(topEntities.length),
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      chartOptions: {
        responsive: true,
        plugins: {
          legend: { position: 'right' }
        }
      },
      tableData: {
        headers: ['Entity', 'Value', 'Percentage'],
        rows: topEntities.map((entity) => {
          const percentage = entityTotal > 0 ? ((entity.value / entityTotal) * 100).toFixed(1) : '0.0';
          return [
            entity.name,
            formatCurrency(entity.value),
            `${percentage}%`
          ];
        })
      }
    };
  }
  
  return {
    id: `${entityType}_${columnId}_pie`,
    title: `${getColumnDisplayName(columnId)} - Fiscal Year Breakdown`,
    cardType: 'chart',
    chartType: 'pie',
    chartData: {
      labels: years,
      datasets: [{
        data: values,
        backgroundColor: ['#0a2240', '#144673', '#3a6ea5', '#f47920', '#ff6b35'],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    chartOptions: {
      responsive: true,
      plugins: {
        legend: { 
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const percentage = ((context.parsed / totalValue) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
            }
          }
        }
      }
    },
    tableData: {
      headers: ['Fiscal Year', 'Value', 'Percentage', 'Growth'],
      rows: years.map((year, index) => {
        const value = values[index];
        const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0';
        const growth = index > 0 ? 
          (((value - values[index - 1]) / values[index - 1]) * 100).toFixed(1) + '%' : 
          'N/A';
        return [
          `FY${year}`,
          formatCurrency(value),
          `${percentage}%`,
          growth
        ];
      })
    }
  };
}

/**
 * Generate doughnut chart
 */
function generateDoughnutChart(entities, entityType, columnId, topN) {
  const pieChart = generatePieChart(entities, entityType, columnId, topN);
  return {
    ...pieChart,
    id: `${entityType}_${columnId}_doughnut`,
    title: pieChart.title ? pieChart.title.replace('Breakdown', 'Doughnut') : `${getColumnDisplayName(columnId)} - Doughnut View`,
    chartType: 'doughnut'
    // tableData already included from pieChart
  };
}

/**
 * Generate stacked bar chart for fiscal year comparisons
 */
function generateStackedBarChart(entities, entityType, columnId, maxEntities = 5) {
  // Get fiscal year data from DataManager
  const dataManager = getDataManager();
  const fiscalYearData = {};
  
  // Aggregate fiscal year data for top entities (max 5 for readability)
  entities.slice(0, maxEntities).forEach(entity => {
    // Try multiple fiscal year property names from JSON columns
    const fiscalYearBreakdown = entity.fiscal_year_breakdown || 
                               entity.fiscal_year_obligations || 
                               entity.fiscal_years ||
                               entity.yearly_totals;
    
    if (fiscalYearBreakdown && typeof fiscalYearBreakdown === 'object') {
      Object.entries(fiscalYearBreakdown).forEach(([year, value]) => {
        if (!fiscalYearData[year]) fiscalYearData[year] = {};
        fiscalYearData[year][entity.name] = parseFloat(value) || 0;
      });
    }
    
    console.log(`📅 Fiscal Year Debug: ${entity.name} has fiscal data:`, !!fiscalYearBreakdown);
  });
  
  const years = Object.keys(fiscalYearData).sort();
  const entityNames = entities.slice(0, maxEntities).map(e => entityType === 'agency' ? abbreviateAgencyName(e.name) : e.name);
  
  // Create table data showing year-over-year by entity
  const tableRows = [];
  entityNames.forEach(entityName => {
    const entityRow = [entityName];
    years.forEach(year => {
      const value = fiscalYearData[year]?.[entityName] || 0;
      entityRow.push(formatCurrency(value));
    });
    // Add total column
    const total = years.reduce((sum, year) => sum + (fiscalYearData[year]?.[entityName] || 0), 0);
    entityRow.push(formatCurrency(total));
    tableRows.push(entityRow);
  });
  
  return {
    id: `${entityType}_${columnId}_stackedBar`,
    title: `${getColumnDisplayName(columnId)} - Year over Year`,
    cardType: 'chart',
    chartType: 'bar',
    chartData: {
      labels: years,
      datasets: entityNames.map((name, index) => ({
        label: name,
        data: years.map(year => fiscalYearData[year]?.[name] || 0),
        backgroundColor: generateColorGradient(entityNames.length)[index]
      }))
    },
    chartOptions: {
      indexAxis: 'y', // Make it horizontal bars
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          mode: 'point',
          intersect: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrencyShort(value);
            }
          }
        },
        y: {
          stacked: false
        }
      }
    },
    tableData: {
      headers: ['Entity', ...years, 'Total'],
      rows: tableRows
    }
  };
}

/**
 * Generate area chart for trends
 */
function generateAreaChart(entities, entityType, columnId) {
  const lineChart = generateLineChart(entities, entityType, columnId);
  return {
    ...lineChart,
    id: `${entityType}_${columnId}_area`,
    title: `${getColumnDisplayName(columnId)} - Area Trend`,
    chartData: {
      ...lineChart.chartData,
      datasets: [{
        ...lineChart.chartData.datasets[0],
        fill: true,
        backgroundColor: 'rgba(20, 70, 115, 0.3)'
      }]
    }
    // tableData already included from lineChart
  };
}

/**
 * Generate trend over time chart
 */
function generateTrendOverTime(entityType, columnId, selectedEntities = []) {
  const dataManager = getDataManager();
  const fiscalYearData = dataManager.getFiscalYearTrends(entityType, columnId, selectedEntities);
  
  if (!fiscalYearData || Object.keys(fiscalYearData).length === 0) {
    return null;
  }
  
  const years = Object.keys(fiscalYearData).sort();
  const values = years.map(year => fiscalYearData[year]);
  
  // Calculate year-over-year growth
  const growthRates = [];
  for (let i = 1; i < values.length; i++) {
    const growth = values[i-1] !== 0 ? ((values[i] - values[i-1]) / values[i-1]) * 100 : 0;
    growthRates.push(growth);
  }
  
  return {
    id: `${entityType}_${columnId}_trend`,
    title: `${getColumnDisplayName(columnId)} - Historical Trend`,
    cardType: 'chart',
    chartType: 'line',
    chartData: {
      labels: years,
      datasets: [
        {
          label: 'Total Value',
          data: values,
          borderColor: '#144673',
          backgroundColor: 'rgba(20, 70, 115, 0.1)',
          yAxisID: 'y',
          tension: 0.3
        },
        {
          label: 'YoY Growth %',
          data: [null, ...growthRates.map(r => r.toFixed(1))],
          borderColor: '#f47920',
          backgroundColor: 'rgba(244, 121, 32, 0.1)',
          yAxisID: 'y1',
          borderDash: [5, 5]
        }
      ]
    },
    chartOptions: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            callback: function(value) {
              return formatCurrencyShort(value);
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    },
    summary: {
      totalGrowth: values.length > 1 ? 
        (((values[values.length - 1] - values[0]) / values[0]) * 100).toFixed(1) + '%' : 
        'N/A',
      avgAnnualGrowth: growthRates.length > 0 ?
        (growthRates.reduce((a, b) => a + b, 0) / growthRates.length).toFixed(1) + '%' :
        'N/A'
    },
    tableData: {
      headers: ['Year', 'Total Value', 'YoY Growth %', 'YoY Change'],
      rows: years.map((year, index) => [
        year,
        formatCurrency(values[index]),
        index > 0 ? `${growthRates[index - 1].toFixed(1)}%` : 'N/A',
        index > 0 ? formatCurrency(values[index] - values[index - 1]) : 'N/A'
      ])
    }
  };
}

/**
 * Helper function to generate color gradient
 */
function generateColorGradient(count) {
  const baseColors = [
    '#0a2240', // Dark Blue
    '#144673', // Blue
    '#3a6ea5', // Light Blue
    '#f47920', // Orange
    '#ff6b35', // Light Orange
    '#22c55e', // Green
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#06b6d4'  // Cyan
  ];
  
  return baseColors.slice(0, count);
}

/**
 * Get display name for column
 */
function getColumnDisplayName(columnId) {
  const columnNames = {
    obligations: 'Obligations',
    smallBusiness: 'Small Business',
    sumTier: 'SUM Tier',
    contractVehicle: 'Contract Vehicle',
    fundingDepartment: 'Funding Department',
    discount: 'Discount',
    topRefPiid: 'Top Referenced PIID',
    topPiid: 'Top PIID',
    activeContracts: 'Active Contracts',
    discountOfferings: 'Discount Offerings',
    aiProduct: 'AI Products',
    aiCategory: 'AI Category',
    topBicProducts: 'Top BIC Products',
    reseller: 'Reseller',
    bicReseller: 'BIC Reseller',
    bicOem: 'BIC OEM',
    fasOem: 'FAS OEM',
    fundingAgency: 'Funding Agency',
    bicTopProductsPerAgency: 'BIC Top Products per Agency',
    oneGovTier: 'OneGov Tier'
  };
  
  return columnNames[columnId] || columnId;
}

/**
 * Main entry point to replace existing generateColumnReports
 */
function generateColumnReportsBuffet(entityType, columnId, topN = 10, selectedEntities = []) {
  console.log('🍽️ Chart Buffet: Generating visualization suite for', entityType, columnId);
  
  try {
    // Get DataManager instance
    const dataManager = getDataManager();
    
    // Get entities using DataManager
    const options = {
      entityType: entityType,
      columnId: columnId,
      topN: topN,
      selectedEntities: selectedEntities
    };
    
    // Load entities for report building - EMERGENCY FIX
    console.log('🚨 EMERGENCY: Attempting to load entities via DataManager');
    let reportEntities = [];
    
    try {
      // Try multiple methods to get entities
      if (dataManager.getEntitiesForView) {
        reportEntities = dataManager.getEntitiesForView('reportBuilder', options);
        console.log('✅ getEntitiesForView worked, got:', reportEntities.length, 'entities');
      } else if (dataManager.getAgencies && entityType === 'agency') {
        reportEntities = dataManager.getAgencies();
        console.log('✅ getAgencies fallback worked, got:', reportEntities.length, 'entities');
      } else if (dataManager.getOEMs && entityType === 'oem') {
        reportEntities = dataManager.getOEMs();
        console.log('✅ getOEMs fallback worked, got:', reportEntities.length, 'entities');
      } else if (dataManager.getVendors && entityType === 'vendor') {
        reportEntities = dataManager.getVendors();
        console.log('✅ getVendors fallback worked, got:', reportEntities.length, 'entities');
      }
    } catch (error) {
      console.error('🚨 DataManager entity loading failed:', error);
    }
    
    if (reportEntities.length === 0) {
      console.error('🚨 CRITICAL: No entities found after all attempts');
      return [];
    }
    
    // Generate the complete chart buffet
    const cards = generateChartBuffet(entityType, columnId, reportEntities, {
      topN: topN,
      selectedEntities: selectedEntities
    });
    
    console.log(`🍽️ Chart Buffet: Generated ${cards.length} visualizations`);
    
    // Add metadata to each card
    cards.forEach(card => {
      card.metadata = {
        generatedBy: 'Chart Buffet v1.0',
        entityType: entityType,
        columnId: columnId,
        timestamp: new Date().toISOString()
      };
    });
    
    return cards;
    
  } catch (error) {
    console.error('Chart Buffet Error:', error);
    return [];
  }
}