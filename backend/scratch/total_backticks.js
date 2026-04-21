const fs = require('fs');
const content = fs.readFileSync('c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src/core/inventory/repositories/inventory.db.repository.ts', 'utf8');
const total = (content.match(/`/g) || []).length;
console.log('Total backticks:', total);
if (total % 2 !== 0) {
    console.log('ERROR: Odd number of backticks!');
} else {
    console.log('Backticks are balanced.');
}
