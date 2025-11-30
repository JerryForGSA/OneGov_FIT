/**
 * Debug Functions - B07_debug.js
 * Test functions to debug data loading issues
 */

/**
 * Test basic sheet access - this will show in execution transcript
 */
function testSheetAccess() {
  console.log('Starting sheet access test...');
  
  try {
    const SPREADSHEET_ID = '1DwUIL4oJwxwYbTXjo7GvqRtUkcMd6MTZDG_gZqqYL04';
    console.log('Attempting to open spreadsheet:', SPREADSHEET_ID);
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet opened successfully:', spreadsheet.getName());
    
    const result = {
      success: true,
      spreadsheetName: spreadsheet.getName(),
      sheets: [],
      sampleData: {}
    };
    
    // Get all sheet names
    const sheets = spreadsheet.getSheets();
    console.log('Found sheets:', sheets.length);
    
    for (let i = 0; i < sheets.length; i++) {
      result.sheets.push(sheets[i].getName());
      console.log('Sheet', i + 1, ':', sheets[i].getName());
    }
    
    // Get sample data from OEM sheet
    try {
      console.log('Attempting to access OEM sheet...');
      const oemSheet = spreadsheet.getSheetByName('OEM');
      if (oemSheet) {
        console.log('OEM sheet found');
        const range = oemSheet.getRange(1, 1, 3, 5); // First 3 rows, 5 columns
        const values = range.getValues();
        result.sampleData.oem = values;
        console.log('Sample data retrieved, rows:', values.length);
        
        // Test JSON parsing on first data row
        if (values.length > 1) {
          const firstDataRow = values[1];
          result.sampleData.firstRowName = firstDataRow[0];
          result.sampleData.firstRowObligations = firstDataRow[1];
          
          console.log('First row name:', firstDataRow[0]);
          console.log('First row obligations raw:', firstDataRow[1]);
          
          // Try parsing the JSON
          const parsedJson = parseJSONColumn(firstDataRow[1]);
          result.sampleData.parsedObligations = parsedJson;
          console.log('Parsed JSON:', parsedJson);
          
          if (parsedJson) {
            result.sampleData.summedObligations = sumJsonValues(parsedJson);
            console.log('Summed obligations:', result.sampleData.summedObligations);
          }
        }
      } else {
        console.log('OEM sheet not found!');
      }
    } catch (error) {
      result.oemError = error.toString();
      console.log('Error accessing OEM sheet:', error.toString());
    }
    
    console.log('Test completed successfully');
    console.log('Final result:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.log('Major error in testSheetAccess:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test entity loading for a specific type
 */
function testEntityLoading(entityType = 'oem') {
  try {
    const result = getEntities(entityType);
    
    // Add debug info
    const debugInfo = {
      entityType: entityType,
      resultSuccess: result.getBlob ? 'ContentService response' : result.success,
      timestamp: new Date().toISOString()
    };
    
    if (result.getBlob) {
      // It's a ContentService response, parse it
      const responseText = result.getContent();
      const parsedResponse = JSON.parse(responseText);
      debugInfo.parsedSuccess = parsedResponse.success;
      debugInfo.dataLength = parsedResponse.data ? parsedResponse.data.length : 0;
      debugInfo.error = parsedResponse.error;
    }
    
    return createResponse(true, debugInfo, null);
  } catch (error) {
    return createResponse(false, null, `Entity loading error: ${error.toString()}`);
  }
}

/**
 * Test raw column data from Google Sheets
 */
function testColumnData() {
  try {
    const SPREADSHEET_ID = '1DwUIL4oJwxwYbTXjo7GvqRtUkcMd6MTZDG_gZqqYL04';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const oemSheet = spreadsheet.getSheetByName('OEM');
    
    if (!oemSheet) {
      return createResponse(false, null, 'OEM sheet not found');
    }
    
    // Get first few rows to check column data
    const range = oemSheet.getRange(1, 1, 3, 28); // First 3 rows, columns A to AB (28 columns)
    const values = range.getValues();
    
    const result = {
      headers: values[0], // First row headers
      firstEntityRow: values[1], // First entity data
      columnCheck: {}
    };
    
    // Check specific columns for data
    const columnsToCheck = {
      'Q (index 16 - topBicProducts)': 16,
      'T (index 19 - bicOems)': 19,
      'O (index 14 - aiProduct)': 14,
      'P (index 15 - aiCategories)': 15
    };
    
    Object.entries(columnsToCheck).forEach(([label, index]) => {
      const cellValue = values[1][index]; // First entity row
      result.columnCheck[label] = {
        hasData: !!cellValue,
        dataLength: cellValue ? cellValue.length : 0,
        dataPreview: cellValue ? cellValue.substring(0, 100) + '...' : 'EMPTY'
      };
    });
    
    return createResponse(true, result, null);
  } catch (error) {
    return createResponse(false, null, `Column test error: ${error.toString()}`);
  }
}