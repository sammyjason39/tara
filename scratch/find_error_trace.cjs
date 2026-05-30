const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
if (!fs.existsSync(logPath)) {
  console.log('Log file not found!');
  return;
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

console.log('Searching for error stack traces...');
lines.forEach((line, idx) => {
  if (line.includes('Error') || line.includes('Exception') || line.includes('TypeError') || line.includes('failed') || line.includes('fail')) {
    // print the line and the next 10 lines
    console.log(`--- Match at line ${idx + 1} ---`);
    console.log(lines.slice(idx, idx + 15).join('\n'));
    console.log('-------------------------------');
  }
});
