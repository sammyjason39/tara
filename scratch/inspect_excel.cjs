const ExcelJS = require('exceljs');
const fs = require('fs');

const EXCEL_PATH = 'C:\\Users\\user\\Downloads\\Bambu Silver\\SaldoStockALL.xlsx';

async function main() {
  console.log(`Checking if Excel file exists at ${EXCEL_PATH}...`);
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel file does not exist!');
    return;
  }
  console.log('File found. Loading workbook with exceljs...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  console.log('\n--- WORKSHEETS IN WORKBOOK ---');
  workbook.worksheets.forEach((sheet, index) => {
    console.log(`Index: ${index}, Name: "${sheet.name}", Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}`);
  });

  const activeSheet = workbook.worksheets[0];
  if (activeSheet) {
    console.log(`\n--- INSPECTING FIRST SHEET: "${activeSheet.name}" ---`);
    console.log(`First 10 rows:`);
    for (let r = 1; r <= Math.min(25, activeSheet.rowCount); r++) {
      const row = activeSheet.getRow(r);
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        values.push(cell.value);
      });
      console.log(`Row ${r}:`, JSON.stringify(values.slice(0, 15)));
    }
  }
}

main().catch(console.error);
