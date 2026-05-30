const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- SEARCHING FOR OPNAME/AUDIT EVENTS ---');
lines.forEach((line, idx) => {
  if (line.includes('opname') || line.includes('Opname') || line.includes('audit') || line.includes('Audit') || line.includes('submit') || line.includes('close')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
