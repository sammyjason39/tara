const fs = require('fs');
const path = require('path');

const DIRECTORY = 'c:\\Users\\user\\Downloads\\Bambu Silver\\Seminyak';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function recover() {
  if (!fs.existsSync(DIRECTORY)) {
    console.error(`Error: Directory not found: ${DIRECTORY}`);
    return;
  }

  const files = fs.readdirSync(DIRECTORY)
    .filter(f => f.toLowerCase().endsWith('.csv'))
    .map(f => ({
      name: f,
      path: path.join(DIRECTORY, f),
      time: fs.statSync(path.join(DIRECTORY, f)).mtimeMs,
      content: fs.readFileSync(path.join(DIRECTORY, f), 'utf8')
    }));

  // Sort files by timestamp extracted from name or mtime
  files.sort((a, b) => {
    const timeA = a.name.match(/\d+/) ? parseInt(a.name.match(/\d+/)[0]) : a.time;
    const timeB = b.name.match(/\d+/) ? parseInt(b.name.match(/\d+/)[0]) : b.time;
    return timeA - timeB;
  });

  console.log(`Found ${files.length} CSV files.`);

  // 1. Identify identical file contents
  const uniqueFiles = [];
  const duplicates = [];

  for (const file of files) {
    const cleanedContent = file.content.trim().replace(/\r\n/g, '\n');
    const existing = uniqueFiles.find(u => u.cleaned === cleanedContent);
    if (existing) {
      duplicates.push({ name: file.name, duplicateOf: existing.name });
    } else {
      uniqueFiles.push({
        name: file.name,
        cleaned: cleanedContent,
        raw: file.content
      });
    }
  }

  console.log(`\n--- DE-DUPLICATION SUMMARY ---`);
  console.log(`Unique files: ${uniqueFiles.length}`);
  console.log(`Duplicate files excluded: ${duplicates.length}`);
  duplicates.forEach(d => {
    console.log(`  - ${d.name} is a duplicate of ${d.duplicateOf}`);
  });

  // 2. Aggregate quantities
  const aggregated = {};
  let undefinedRowsFound = [];

  uniqueFiles.forEach(file => {
    const lines = file.cleaned.split('\n');
    if (lines.length <= 1) return; // Skip empty files or header-only files

    const header = parseCSVLine(lines[0]);
    // Expected headers: SKU, Item Name, Expected, Actual, Variance
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      if (cols.length < 4) continue;

      const sku = cols[0];
      const name = cols[1];
      const expected = parseInt(cols[2]) || 0;
      const actual = parseInt(cols[3]) || 0;

      if (sku === 'undefined' || !sku) {
        undefinedRowsFound.push({
          file: file.name,
          sku,
          name,
          actual,
          lineNum: i + 1
        });
      }

      if (!aggregated[sku]) {
        aggregated[sku] = {
          sku,
          name,
          actual: 0
        };
      }
      aggregated[sku].actual += actual;
    }
  });

  console.log(`\n--- UNDEFINED / ANOMALOUS ENTRIES DETECTED ---`);
  if (undefinedRowsFound.length === 0) {
    console.log("No 'undefined' SKU rows found in unique files.");
  } else {
    console.log(`Found ${undefinedRowsFound.length} rows with 'undefined' SKUs:`);
    undefinedRowsFound.forEach(u => {
      console.log(`  - File: ${u.file} (Line ${u.lineNum}): name="${u.name}", actual quantity=${u.actual}`);
    });
  }

  // Generate clean recovery report
  const sortedSKUs = Object.values(aggregated).sort((a, b) => a.sku.localeCompare(b.sku));
  
  console.log(`\n--- AGGREGATED UNIQUE STOCK COUNT (Total Unique SKUs: ${sortedSKUs.length}) ---`);
  
  // Write to a recovered JSON and CSV report
  const reportCsvPath = path.join(path.dirname(DIRECTORY), 'recovered_seminyak_opname.csv');
  const reportCsvContent = [
    'SKU,Item Name,Actual Quantity',
    ...sortedSKUs.map(s => `"${s.sku.replace(/"/g, '""')}","${s.name.replace(/"/g, '""')}",${s.actual}`)
  ].join('\n');

  fs.writeFileSync(reportCsvPath, reportCsvContent, 'utf8');
  console.log(`\nRecovered CSV successfully written to: ${reportCsvPath}`);

  // Print top items for immediate feedback
  console.log(`\nSample of Recovered Items (First 15):`);
  sortedSKUs.slice(0, 15).forEach(s => {
    console.log(`  [${s.sku}] ${s.name}: ${s.actual}`);
  });
}

recover();
