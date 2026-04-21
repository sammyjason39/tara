const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src/core/inventory/repositories/inventory.db.repository.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  const count = (line.match(/`/g) || []).length;
  if (count > 0) {
    console.log(`${i + 1}: ${count} backticks - ${line.trim()}`);
  }
});
