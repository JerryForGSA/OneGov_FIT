/**
 * B13_ProcurementTables.js - Comprehensive FAS and BIC Procurement Table Management
 * Restored from working version 531 - Contains full table rendering, FPDS integration, and interactive features
 * Version: 589+ (Restored)
 */

// Global variables for table data management
var fasTableData = {
  data: [],
  pagination: {
    currentPage: 1,
    totalPages: 0,
    itemsPerPage: 25
  },
  isLoading: false
};

var bicTableData = {
  data: [],
  pagination: {
    currentPage: 1,
    totalPages: 0,
    itemsPerPage: 25
  },
  isLoading: false
};

var currentProcurementEntity = null;

/**
 * Format currency values in short format (e.g., $1.2M, $345K)
 */
function formatCurrencyShort(value) {
  if (!value || value === 0) return '$0';
  
  const absValue = Math.abs(value);
  if (absValue >= 1000000000) {
    return '$' + (value / 1000000000).toFixed(1) + 'B';
  } else if (absValue >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  } else if (absValue >= 1000) {
    return '$' + (value / 1000).toFixed(0) + 'K';
  } else {
    return '$' + Math.round(value).toLocaleString();
  }
}

/**
 * Format currency values in full format with commas
 */
function formatCurrencyFull(value) {
  if (!value || value === 0) return '$0';
  return '$' + Math.round(value).toLocaleString();
}

/**
 * Generate FPDS URL for a procurement record
 */
function generateFpdsUrl(row) {
  if (!row.piid && !row.reference_piid) {
    return '#';
  }
  
  let baseUrl = 'https://www.fpds.gov/ezsearch/search.do?indexName=awardfull&templateName=1.5.3&s=FPDS.GOV&q=';
  let searchTerms = [];
  
  if (row.piid) {
    searchTerms.push(`PIID%3A%22${encodeURIComponent(row.piid)}%22`);
  }
  
  if (row.reference_piid && row.reference_piid !== row.piid) {
    searchTerms.push(`REF_IDV_PIID%3A%22${encodeURIComponent(row.reference_piid)}%22`);
  }
  
  return baseUrl + searchTerms.join('%20%20');
}

/**
 * Load FAS table data for a specific page
 */
async function loadFasPage(page = 1) {
  if (!currentProcurementEntity) {
    return;
  }
  
  fasTableData.isLoading = true;
  updateFasTableStatus('Loading page ' + page + '...');
  
  try {
    const tableData = await loadTableDataFromBackend(currentProcurementEntity.fasTableUrl, page);
    
    if (tableData && tableData.data && Array.isArray(tableData.data)) {
      fasTableData = {
        data: tableData.data,
        pagination: {
          currentPage: page,
          totalPages: tableData.totalPages || 1,
          itemsPerPage: tableData.itemsPerPage || 25
        },
        isLoading: false
      };
      
      renderFasTable();
    } else {
      throw new Error('Invalid table data received');
    }
  } catch (error) {
    fasTableData.isLoading = false;
    updateFasTableStatus('Error loading data: ' + error.message);
    
    // Show error in table content
    const contentElement = document.getElementById('fas-table-content');
    if (contentElement) {
      contentElement.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc2626;">
          <div style="font-size: 1.2rem; margin-bottom: 8px;">⚠️ Error Loading FAS Data</div>
          <div style="font-size: 0.9rem; color: #6b7280;">${error.message}</div>
          <button onclick="loadFasPage(1)" style="margin-top: 16px; padding: 8px 16px; background: var(--orange); color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Retry
          </button>
        </div>
      `;
    }
  }
}

/**
 * Load BIC table data for a specific page
 */
async function loadBicPage(page = 1) {
  if (!currentProcurementEntity) {
    return;
  }
  
  bicTableData.isLoading = true;
  updateBicTableStatus('Loading page ' + page + '...');
  
  try {
    const tableData = await loadTableDataFromBackend(currentProcurementEntity.bicTableUrl, page);
    
    if (tableData && tableData.data && Array.isArray(tableData.data)) {
      bicTableData = {
        data: tableData.data,
        pagination: {
          currentPage: page,
          totalPages: tableData.totalPages || 1,
          itemsPerPage: tableData.itemsPerPage || 25
        },
        isLoading: false
      };
      
      renderBicTable();
    } else {
      throw new Error('Invalid table data received');
    }
  } catch (error) {
    bicTableData.isLoading = false;
    updateBicTableStatus('Error loading data: ' + error.message);
    
    // Show error in table content
    const contentElement = document.getElementById('bic-table-content');
    if (contentElement) {
      contentElement.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc2626;">
          <div style="font-size: 1.2rem; margin-bottom: 8px;">⚠️ Error Loading BIC Data</div>
          <div style="font-size: 0.9rem; color: #6b7280;">${error.message}</div>
          <button onclick="loadBicPage(1)" style="margin-top: 16px; padding: 8px 16px; background: var(--orange); color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Retry
          </button>
        </div>
      `;
    }
  }
}

/**
 * Backend Google Apps Script function to load table data from Google Drive CSV URLs
 * Updated to accept entityName and tableType for compatibility with frontend
 */
function loadTableData(entityNameOrUrl, tableTypeOrPage, tableUrl = null, page = 1) {
  // Handle different calling patterns for backward compatibility
  if (typeof entityNameOrUrl === 'string' && typeof tableTypeOrPage === 'string' && tableUrl) {
    // New format: loadTableData(entityName, tableType, tableUrl, page)
    return loadTableDataNew(entityNameOrUrl, tableTypeOrPage, tableUrl, page);
  } else {
    // Legacy format: loadTableData(tableUrl, page)
    return loadTableDataLegacy(entityNameOrUrl, tableTypeOrPage || 1);
  }
}

/**
 * New format: load table data with entity name and table type
 */
function loadTableDataNew(entityName, tableType, tableUrl, page = 1) {
  try {
    return loadTableDataLegacy(tableUrl, page);
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * Legacy format: load table data with just URL and page
 */
function loadTableDataLegacy(tableUrl, page = 1) {
  try {
    
    if (!tableUrl) {
      return { success: false, error: 'No table URL provided' };
    }
    
    let csvData;
    
    // Check if URL is Google Drive format
    const driveFileIdMatch = tableUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (driveFileIdMatch) {
      // Google Drive CSV file
      const fileId = driveFileIdMatch[1];
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      try {
        const driveFile = DriveApp.getFileById(fileId);
        const blob = driveFile.getBlob();
        csvData = blob.getDataAsString();
      } catch (fetchError) {
        return { success: false, error: 'Failed to fetch CSV from Google Drive: ' + fetchError.toString() };
      }
    } else {
      // Try legacy Google Sheets format as fallback
      const spreadsheetIdMatch = tableUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (spreadsheetIdMatch) {
        const spreadsheetId = spreadsheetIdMatch[1];
        
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheets = spreadsheet.getSheets();
        
        if (sheets.length === 0) {
          return { success: false, error: 'No sheets found in spreadsheet' };
        }
        
        // Convert sheet data to CSV format
        const sheet = sheets[0];
        const values = sheet.getDataRange().getValues();
        csvData = values.map(row => row.join(',')).join('\n');
      } else {
        return { success: false, error: 'Unsupported URL format - expected Google Drive or Google Sheets URL' };
      }
    }
    
    if (!csvData || csvData.trim().length === 0) {
      return { 
        success: true, 
        data: [], 
        totalPages: 0, 
        currentPage: page, 
        itemsPerPage: 25 
      };
    }
    
    // Parse CSV data
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) {
      return { 
        success: true, 
        data: [], 
        totalPages: 0, 
        currentPage: page, 
        itemsPerPage: 25 
      };
    }
    
    // Parse headers from first line
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j].toString().toLowerCase().replace(/\s+/g, '_');
        row[header] = values[j] || '';
      }
      data.push(row);
    }
    
    // Apply pagination
    const itemsPerPage = 25;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
    
    const result = {
      success: true,
      data: paginatedData,
      totalPages: totalPages,
      currentPage: page,
      itemsPerPage: itemsPerPage
    };
    
    return result;
    
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * Frontend function to call backend loadTableData
 */
async function loadTableDataFromBackend(tableUrl, page = 1) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((result) => {
        if (result && result.success) {
          resolve(result);
        } else {
          reject(new Error(result?.error || 'Failed to load table data'));
        }
      })
      .withFailureHandler((error) => {
        reject(new Error(error.toString()));
      })
      .loadTableData(tableUrl, page);
  });
}

/**
 * Update FAS table status indicator
 */
function updateFasTableStatus(status) {
  const statusElement = document.getElementById('fas-table-status');
  if (statusElement) {
    statusElement.textContent = status;
  }
}

/**
 * Update BIC table status indicator
 */
function updateBicTableStatus(status) {
  const statusElement = document.getElementById('bic-table-status');
  if (statusElement) {
    statusElement.textContent = status;
  }
}

/**
 * Render FAS procurement table with all data and pagination
 */
function renderFasTable(data = null) {
  const tableData = data || window.fasTableData || fasTableData;
  
  const contentElement = document.getElementById('fas-table-content');
  if (!contentElement) {
    return;
  }
  
  if (!tableData || !tableData.data) {
    contentElement.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">No table data available</div>';
    return;
  }
  
  updateFasTableStatus(`Showing ${tableData.data.length} records (Page ${tableData.currentPage} of ${tableData.totalPages})`);
  
  if (!tableData.data || tableData.data.length === 0) {
    contentElement.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--blue);">
        <div style="font-size: 1.1rem; margin-bottom: 8px;">📋 No FAS Data Available</div>
        <div style="font-size: 0.9rem; color: #6b7280;">No procurement records found for this entity.</div>
      </div>
    `;
    return;
  }
  
  // Get column headers from first row
  const headers = tableData.data.length > 0 ? Object.keys(tableData.data[0]) : [];
  
  let tableHTML = `
    <div style="overflow-x: auto; max-height: 600px; border: 1px solid #e5e7eb; border-radius: 6px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
        <thead style="background: #f8f9fa; position: sticky; top: 0; z-index: 10;">
          <tr>
            ${headers.map(header => `
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb; color: var(--dark-blue); white-space: nowrap; min-width: 120px;">
                ${header.replace(/_/g, ' ').toUpperCase()}
              </th>
            `).join('')}
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb; color: var(--dark-blue); white-space: nowrap; min-width: 100px;">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          ${tableData.data.map((row, index) => `
            <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: rgba(248, 249, 250, 0.5);' : ''}" 
                onmouseover="this.style.background='#f8f9fa'" 
                onmouseout="this.style.background='${index % 2 === 0 ? 'rgba(248, 249, 250, 0.5)' : 'white'}'">
              ${headers.map(header => {
                let value = row[header];
                let formattedValue = value;
                
                // Format currency columns
                if (header.toLowerCase().includes('amount') || 
                    header.toLowerCase().includes('obligation') || 
                    header.toLowerCase().includes('value')) {
                  if (value && !isNaN(value)) {
                    formattedValue = formatCurrencyFull(parseFloat(value));
                  }
                }
                
                // Format date columns
                if (header.toLowerCase().includes('date')) {
                  if (value) {
                    try {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        formattedValue = date.toLocaleDateString();
                      }
                    } catch (e) {
                      // Keep original value if date parsing fails
                    }
                  }
                }
                
                return `
                  <td style="padding: 10px 8px; text-align: center; vertical-align: top; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                    <span title="${value || ''}">${formattedValue || ''}</span>
                  </td>
                `;
              }).join('')}
              <td style="padding: 10px 8px; text-align: center; vertical-align: top;">
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                  <a href="${generateFpdsUrl(row)}" target="_blank" rel="noopener noreferrer" 
                     style="padding: 4px 8px; background: var(--blue); color: white; text-decoration: none; border-radius: 4px; font-size: 0.75rem; font-weight: 500;"
                     title="View in FPDS">
                    🔗 FPDS
                  </a>
                  <button onclick="expandProcurementRow(${JSON.stringify(row).replace(/"/g, '&quot;')}, 'fas')" 
                          style="padding: 4px 8px; background: var(--orange); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 500;"
                          title="View details">
                    📋 Details
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // Add pagination if multiple pages
  if (tableData.totalPages > 1) {
    tableHTML += generatePaginationHTML('fas', {currentPage: tableData.currentPage, totalPages: tableData.totalPages});
  }
  
  // Add export button
  tableHTML += `
    <div style="margin-top: 16px; text-align: center;">
      <button onclick="exportTableData('fas')" 
              style="padding: 8px 16px; background: var(--green); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        📊 Export to CSV
      </button>
    </div>
  `;
  
  contentElement.innerHTML = tableHTML;
}

/**
 * Render BIC procurement table with all data and pagination
 */
function renderBicTable(data = null) {
  const tableData = data || window.bicTableData || bicTableData;
  
  const contentElement = document.getElementById('bic-table-content');
  if (!contentElement) {
    return;
  }
  
  if (!tableData || !tableData.data) {
    contentElement.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">No table data available</div>';
    return;
  }
  
  updateBicTableStatus(`Showing ${tableData.data.length} records (Page ${tableData.currentPage} of ${tableData.totalPages})`);
  
  if (!tableData.data || tableData.data.length === 0) {
    contentElement.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--blue);">
        <div style="font-size: 1.1rem; margin-bottom: 8px;">🛒 No BIC Data Available</div>
        <div style="font-size: 0.9rem; color: #6b7280;">No procurement records found for this entity.</div>
      </div>
    `;
    return;
  }
  
  // Get column headers from first row
  const headers = tableData.data.length > 0 ? Object.keys(tableData.data[0]) : [];
  
  let tableHTML = `
    <div style="overflow-x: auto; max-height: 600px; border: 1px solid #e5e7eb; border-radius: 6px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
        <thead style="background: #f8f9fa; position: sticky; top: 0; z-index: 10;">
          <tr>
            ${headers.map(header => `
              <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb; color: var(--dark-blue); white-space: nowrap; min-width: 120px;">
                ${header.replace(/_/g, ' ').toUpperCase()}
              </th>
            `).join('')}
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb; color: var(--dark-blue); white-space: nowrap; min-width: 100px;">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          ${tableData.data.map((row, index) => `
            <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: rgba(248, 249, 250, 0.5);' : ''}" 
                onmouseover="this.style.background='#f8f9fa'" 
                onmouseout="this.style.background='${index % 2 === 0 ? 'rgba(248, 249, 250, 0.5)' : 'white'}'">
              ${headers.map(header => {
                let value = row[header];
                let formattedValue = value;
                
                // Format currency columns
                if (header.toLowerCase().includes('amount') || 
                    header.toLowerCase().includes('obligation') || 
                    header.toLowerCase().includes('value')) {
                  if (value && !isNaN(value)) {
                    formattedValue = formatCurrencyFull(parseFloat(value));
                  }
                }
                
                // Format date columns
                if (header.toLowerCase().includes('date')) {
                  if (value) {
                    try {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        formattedValue = date.toLocaleDateString();
                      }
                    } catch (e) {
                      // Keep original value if date parsing fails
                    }
                  }
                }
                
                return `
                  <td style="padding: 10px 8px; text-align: center; vertical-align: top; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                    <span title="${value || ''}">${formattedValue || ''}</span>
                  </td>
                `;
              }).join('')}
              <td style="padding: 10px 8px; text-align: center; vertical-align: top;">
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                  <a href="${generateFpdsUrl(row)}" target="_blank" rel="noopener noreferrer" 
                     style="padding: 4px 8px; background: var(--blue); color: white; text-decoration: none; border-radius: 4px; font-size: 0.75rem; font-weight: 500;"
                     title="View in FPDS">
                    🔗 FPDS
                  </a>
                  <button onclick="expandProcurementRow(${JSON.stringify(row).replace(/"/g, '&quot;')}, 'bic')" 
                          style="padding: 4px 8px; background: var(--orange); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 500;"
                          title="View details">
                    📋 Details
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // Add pagination if multiple pages
  if (tableData.totalPages > 1) {
    tableHTML += generatePaginationHTML('bic', {currentPage: tableData.currentPage, totalPages: tableData.totalPages});
  }
  
  // Add export button
  tableHTML += `
    <div style="margin-top: 16px; text-align: center;">
      <button onclick="exportTableData('bic')" 
              style="padding: 8px 16px; background: var(--green); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        📊 Export to CSV
      </button>
    </div>
  `;
  
  contentElement.innerHTML = tableHTML;
}

/**
 * Generate pagination HTML for tables
 */
function generatePaginationHTML(tableType, pagination) {
  const { currentPage, totalPages } = pagination;
  
  return `
    <div style="display: flex; justify-content: center; align-items: center; gap: 8px; padding: 16px; background: #f8f9fa; border-top: 1px solid #e5e7eb;">
      <button onclick="load${tableType.charAt(0).toUpperCase() + tableType.slice(1)}Page(1)" 
              ${currentPage === 1 ? 'disabled' : ''} 
              style="padding: 6px 12px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'};">
        ⟪ First
      </button>
      <button onclick="load${tableType.charAt(0).toUpperCase() + tableType.slice(1)}Page(${currentPage - 1})" 
              ${currentPage === 1 ? 'disabled' : ''} 
              style="padding: 6px 12px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'};">
        ‹ Previous
      </button>
      
      <span style="margin: 0 16px; font-size: 0.9rem; color: #6b7280;">
        Page ${currentPage} of ${totalPages}
      </span>
      
      <button onclick="load${tableType.charAt(0).toUpperCase() + tableType.slice(1)}Page(${currentPage + 1})" 
              ${currentPage === totalPages ? 'disabled' : ''} 
              style="padding: 6px 12px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'};">
        Next ›
      </button>
      <button onclick="load${tableType.charAt(0).toUpperCase() + tableType.slice(1)}Page(${totalPages})" 
              ${currentPage === totalPages ? 'disabled' : ''} 
              style="padding: 6px 12px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'};">
        Last ⟫
      </button>
    </div>
  `;
}

/**
 * Expand procurement row to show detailed modal
 */
function expandProcurementRow(rowData, tableType) {
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 900px;
    max-height: 90vh;
    width: 100%;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;
  
  const headers = Object.keys(rowData);
  const tableIcon = tableType === 'fas' ? '📊' : '🛒';
  const tableName = tableType.toUpperCase();
  
  modalContent.innerHTML = `
    <div style="padding: 24px; border-bottom: 2px solid #f0f0f0;">
      <h2 style="margin: 0; color: var(--dark-blue); font-size: 1.4rem; display: flex; align-items: center; gap: 8px;">
        ${tableIcon} ${tableName} Procurement Record Details
        <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                style="margin-left: auto; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
                title="Close">
          ×
        </button>
      </h2>
    </div>
    
    <div style="padding: 24px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        ${headers.map(header => {
          let value = rowData[header];
          let formattedValue = value;
          
          // Format currency columns
          if (header.toLowerCase().includes('amount') || 
              header.toLowerCase().includes('obligation') || 
              header.toLowerCase().includes('value')) {
            if (value && !isNaN(value)) {
              formattedValue = formatCurrencyFull(parseFloat(value));
            }
          }
          
          // Format date columns
          if (header.toLowerCase().includes('date')) {
            if (value) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  formattedValue = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                }
              } catch (e) {
                // Keep original value if date parsing fails
              }
            }
          }
          
          return `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid var(--orange);">
              <div style="font-weight: 600; color: var(--blue); margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase;">
                ${header.replace(/_/g, ' ')}
              </div>
              <div style="color: var(--text-dark); word-break: break-word;">
                ${formattedValue || 'N/A'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
        <a href="${generateFpdsUrl(rowData)}" target="_blank" rel="noopener noreferrer" 
           style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: var(--blue); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 2px 8px rgba(20, 70, 115, 0.2);">
          🔗 View Full Record in FPDS
        </a>
      </div>
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Close modal when clicking overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
}

/**
 * Export table data to CSV
 */
function exportTableData(tableType) {
  const tableData = tableType === 'fas' ? fasTableData : bicTableData;
  
  if (!tableData.data || tableData.data.length === 0) {
    alert('No data to export');
    return;
  }
  
  try {
    // Create CSV content
    const headers = Object.keys(tableData.data[0]);
    const csvContent = [
      headers.join(','),
      ...tableData.data.map(row => 
        headers.map(header => {
          let value = row[header] || '';
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tableType}_procurement_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    alert('Export failed: ' + error.message);
  }
}