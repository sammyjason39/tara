const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const barcodes = new Set();
const pattern = /barcode=([^&\s|]+)/;

lines.forEach(line => {
  const match = line.match(pattern);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    barcodes.add(decoded);
  }
});

console.log('--- ALL UNIQUE BARCODES QUERIED IN LOGS ---');
console.log(Array.from(barcodes));
