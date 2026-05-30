const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');

if (!fs.existsSync(filePath)) {
  console.log(`Log file not found`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const searchTerms = [
  'submitopname',
  'submit-opname',
  '/retail/inventory/opname',
  'inventory/audit',
  'audit-cycles',
  'opname',
  'bambusilverkedonganan',
];

console.log(`Searching for opname terms...`);

const matchedIndices = [];
lines.forEach((line, idx) => {
  const lowerLine = line.toLowerCase();
  if (searchTerms.some(term => lowerLine.includes(term))) {
    // Exclude continuous audit integrity checks to reduce noise
    if (!lowerLine.includes('monitoringjobservice') && !lowerLine.includes('auditchainservice')) {
      matchedIndices.push(idx);
    }
  }
});

console.log(`Found ${matchedIndices.length} filtered matches.`);

// Print matches with 2 lines of preceding and succeeding context
matchedIndices.forEach(idx => {
  console.log(`\n--------------------------------------------`);
  console.log(`Context for Match on Line ${idx + 1}:`);
  console.log(`--------------------------------------------`);
  
  const start = Math.max(0, idx - 2);
  const end = Math.min(lines.length - 1, idx + 2);
  
  for (let i = start; i <= end; i++) {
    const prefix = i === idx ? '=> ' : '   ';
    console.log(`${prefix}Line ${i + 1}: ${lines[i].trim()}`);
  }
});
