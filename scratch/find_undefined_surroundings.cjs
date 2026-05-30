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

function findSurroundings() {
  const files = fs.readdirSync(DIRECTORY)
    .filter(f => f.toLowerCase().endsWith('.csv') && f !== 'recovered_seminyak_opname.csv');

  console.log(`Found ${files.length} opname files.`);

  files.forEach(file => {
    const content = fs.readFileSync(path.join(DIRECTORY, file), 'utf8');
    const lines = content.trim().split(/\r?\n/);
    if (lines.length <= 1) return;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const sku = cols[0];
      const name = cols[1];
      
      if (sku === 'undefined' || !sku || name === 'undefined') {
        console.log(`\n=========================================`);
        console.log(`File: ${file} (Line ${i + 1})`);
        console.log(`=========================================`);
        
        // Print 3 lines before
        const start = Math.max(1, i - 3);
        for (let j = start; j < i; j++) {
          console.log(`Line ${j + 1}: ${lines[j]}`);
        }
        console.log(`>>> Line ${i + 1}: ${lines[i]} (TARGET) <<<`);
        // Print 3 lines after
        const end = Math.min(lines.length - 1, i + 3);
        for (let j = i + 1; j <= end; j++) {
          console.log(`Line ${j + 1}: ${lines[j]}`);
        }
      }
    }
  });
}

findSurroundings();
