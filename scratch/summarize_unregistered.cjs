const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '..', 'scratch', 'unregistered_lookups_report.txt');
if (!fs.existsSync(reportPath)) {
  console.log('Report not found!');
  return;
}

const content = fs.readFileSync(reportPath, 'utf8');
const lines = content.split('\n');

const counts = {};
lines.forEach(line => {
  const match = line.match(/^L\d+: "([^"]+)"/);
  if (match) {
    const barcode = match[1];
    counts[barcode] = (counts[barcode] || 0) + 1;
  }
});

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log(`Total unique unregistered barcodes: ${sorted.length}`);
console.log('Top 30 unregistered barcodes by lookup count:');
sorted.slice(0, 30).forEach(([barcode, count], index) => {
  console.log(`${index + 1}. "${barcode}": ${count}`);
});
