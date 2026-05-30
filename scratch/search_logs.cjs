const fs = require('fs');
const path = require('path');

const logFiles = [
  'vps_backend_logs_today.txt',
  'vps_backend_logs.txt',
  'vps_backend_logs_v3.txt',
  'vps_backend_logs_v4.txt',
  'vps_backend_logs_v5.txt'
];

const keywords = [
  'lookup',
  'barcode',
  'items/lookup',
  'inventory/items',
  'GET'
];

function searchLogs() {
  const rootDir = 'c:\\Users\\user\\Documents\\Software-Developer\\zenvix-demo\\business-flow-suite-v2';
  
  for (const logFile of logFiles) {
    const filePath = path.join(rootDir, logFile);
    if (!fs.existsSync(filePath)) {
      console.log(`Log file not found: ${logFile}`);
      continue;
    }
    
    console.log(`\n========================================`);
    console.log(`Searching in: ${logFile}`);
    console.log(`========================================`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    
    let matchCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match keywords
      const hasKeyword = keywords.some(k => line.toLowerCase().includes(k.toLowerCase()));
      
      // Also match barcode digits pattern (e.g., 8 to 15 consecutive digits)
      const hasBarcodePattern = /\b\d{8,15}\b/.test(line);
      
      if (hasKeyword || hasBarcodePattern) {
        console.log(`Line ${i + 1}: ${line.trim().substring(0, 200)}`);
        matchCount++;
        if (matchCount >= 50) {
          console.log(`... truncated after 50 matches`);
          break;
        }
      }
    }
    
    if (matchCount === 0) {
      console.log(`No matches found in ${logFile}.`);
    } else {
      console.log(`Total matches in ${logFile}: ${matchCount}`);
    }
  }
}

searchLogs();
