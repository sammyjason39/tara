const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src/core/inventory/repositories/inventory.db.repository.ts', 'utf8');
const lines = content.split('\n');
let depth = 0;
lines.forEach((line, i) => {
    let open = (line.match(/{/g) || []).length;
    let close = (line.match(/}/g) || []).length;
    depth += open - close;
    if (depth < 0) {
        console.log(`NEGATIVE DEPTH at line ${i + 1}: ${depth}`);
    }
});
console.log('Final depth:', depth);
