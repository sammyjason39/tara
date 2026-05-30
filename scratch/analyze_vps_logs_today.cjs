const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
if (!fs.existsSync(filePath)) {
  console.log(`Log file not found at ${filePath}`);
  process.exit(1);
}

console.log('Analyzing vps_backend_logs_today.txt...');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

let searchKeywords = [
  'opname',
  'error',
  'fail',
  'exception',
  'undefined',
  'store'
];

let matches = [];

lines.forEach((line, index) => {
  const lineNum = index + 1;
  const lowerLine = line.toLowerCase();
  
  const hasKeyword = searchKeywords.some(keyword => lowerLine.includes(keyword));
  
  if (hasKeyword) {
    matches.push({ lineNum, text: line.trim() });
  }
});

console.log(`Found ${matches.length} matching lines.`);

console.log('\n--- MATCHES (ALL) ---');
matches.forEach(m => {
  console.log(`Line ${m.lineNum}: ${m.text.substring(0, 400)}`);
});
