const fs = require('fs');
const path = require('path');

const logFiles = [
  'vps_backend_logs.txt',
  'vps_backend_logs_v3.txt',
  'vps_backend_logs_v4.txt',
  'vps_backend_logs_v5.txt',
];

logFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  console.log(`\n========================================`);
  console.log(`Analyzing: ${file}`);
  console.log(`========================================`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let matchCount = 0;
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (line.toLowerCase().includes('opname') || 
        line.toLowerCase().includes('seminyak') || 
        line.toLowerCase().includes('bambusilver') || 
        line.toLowerCase().includes('undefined')) {
      
      // Print the matching line and some context
      console.log(`Line ${lineNum}: ${line.trim().substring(0, 300)}`);
      matchCount++;
    }
  });
  
  console.log(`Total matches in ${file}: ${matchCount}`);
});
