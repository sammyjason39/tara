const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);
console.log('--- FIRST 5 LINES ---');
lines.slice(0, 5).forEach(l => console.log(l));
console.log('--- LAST 5 LINES ---');
lines.slice(-5).forEach(l => console.log(l));
