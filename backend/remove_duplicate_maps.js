const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const lines = content.split('\n');
const processedLines = [];
let hasMapInModel = false;

for (let line of lines) {
    if (line.match(/^model\s+/)) {
        hasMapInModel = false;
        processedLines.push(line);
        continue;
    }
    
    if (line.match(/^\s*@@map\(/)) {
        if (hasMapInModel) {
            // Already encountered an @@map in this model, skip this one
            continue;
        }
        hasMapInModel = true;
    }
    
    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Removed duplicate @@map entries.');
