const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Harvest every valid model name from the current schema
const modelMatches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const modelSet = {}; // lowercase -> Exact Case

modelMatches.forEach(m => {
    const name = m[1];
    modelSet[name.toLowerCase()] = name;
});

console.log(`Aggregating ${Object.keys(modelSet).length} models for total resolution...`);

// 2. Project-wide Type Normalization
// We want to find any word that is used as a Type in a relation or field
// Prisma fields look like: "  fieldName Type" or "  fieldName Type[]"
let lines = content.split('\n');
const processedLines = lines.map(line => {
    // Matches whitespace + fieldName + Type
    // Field name must be characters, type must be word characters
    const fieldTypeRegex = /^(\s+\w+\s+)([\w_]+)([\?\s\[])/;
    const match = line.match(fieldTypeRegex);
    
    if (match) {
        const prefix = match[1];
        const currentType = match[2];
        const suffix = match[3];
        
        // Try to match currentType to a model (case-insensitive)
        const lowerType = currentType.toLowerCase();
        
        // Handling pluralized variations that might have been missed
        let target = modelSet[lowerType];
        
        if (!target) {
            // Check singularized version of currentType
            const singular = currentType.replace(/s$/, '').replace(/ies$/, 'y').replace(/es$/, '').toLowerCase();
            target = modelSet[singular];
        }
        
        if (target) {
            return prefix + target + suffix + line.slice(match[0].length);
        }
    }
    return line;
});

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Absolute Schema Finalization Complete.');
