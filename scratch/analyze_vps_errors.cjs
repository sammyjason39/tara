const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- SEARCHING FOR ERRORS/FAILURES ---');
lines.forEach((line, idx) => {
  if (line.includes('Error') || line.includes('exception') || line.includes('fail') || line.includes('TypeError') || line.includes('Internal server error')) {
    // Skip the AuditService failed log since we already know it
    if (line.includes('Failed to create audit log') || line.includes('at AuditService') || line.includes('at execute')) {
      return;
    }
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
