const fs = require('fs');
const content = fs.readFileSync('src/pages/core/inventory/InventoryStockHub.tsx', 'utf8');

let openDivs = 0;
let lines = content.split('\n');
lines.forEach((line, i) => {
    const opening = (line.match(/<div/g) || []).length;
    const closing = (line.match(/<\/div>/g) || []).length;
    openDivs += opening - closing;
    if (openDivs < 0) {
        console.log(`Extra closing div at line ${i + 1}`);
        openDivs = 0;
    }
});
console.log(`Total open divs: ${openDivs}`);
