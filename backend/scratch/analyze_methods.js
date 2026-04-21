const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src/core/inventory/repositories/inventory.db.repository.ts', 'utf8');
const lines = content.split('\n');
let depth = 0;
lines.forEach((line, i) => {
    let open = (line.match(/{/g) || []).length;
    let close = (line.match(/}/g) || []).length;
    let prevDepth = depth;
    depth += open - close;
    if (prevDepth === 1 && open > 0) {
        // Potential method start if depth was 1 (inside class)
        console.log(`Method-like start at line ${i + 1}: ${line.trim()}`);
    }
    if (depth === 1 && close > 0 && prevDepth > 1) {
        // Potential method end
        console.log(`Method-like end at line ${i + 1}`);
    }
});
