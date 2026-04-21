const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src/core/inventory/repositories/inventory.db.repository.ts', 'utf8');
let inTemplate = false;
let startLine = -1;
const lines = content.split('\n');
lines.forEach((line, i) => {
    let j = 0;
    while (j < line.length) {
        if (line[j] === '`') {
            // Check for escape
            if (j === 0 || line[j-1] !== '\\') {
                inTemplate = !inTemplate;
                if (inTemplate) startLine = i + 1;
                else startLine = -1;
            }
        }
        j++;
    }
});

if (inTemplate) {
    console.log('Unterminated template literal starts at line:', startLine);
} else {
    console.log('All template literals are closed.');
}
