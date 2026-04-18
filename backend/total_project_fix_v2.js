const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toSingularCamel = (s) => {
    // Basic singularization
    let name = s.replace(/ies$/, 'y').replace(/statuses$/, 'status').replace(/s$/, '').replace(/([^e])s$/, '$1');
    if (name.endsWith('classe')) name = 'class';
    if (name.endsWith('branthe')) name = 'branch';
    if (name.endsWith('categoric')) name = 'category';
    
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const primitives = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes', 'BigInt']);

// 1. First Pass: Collect all model renames
const modelMapping = {}; // snake_case -> singularCamel
const matches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
matches.forEach(m => {
    const original = m[1];
    modelMapping[original] = toSingularCamel(original);
});

// 2. Transformation
let lines = content.split('\n');
const finalLines = [];
let currentModelOriginalName = null;
let currentModelFields = {};

for (let line of lines) {
    const mMatch = line.match(/^model\s+(\w+)\s+{/);
    if (mMatch) {
         const original = mMatch[1];
         const newName = modelMapping[original];
         currentModelOriginalName = original;
         currentModelFields = {};
         finalLines.push(`model ${newName} {`);
         continue;
    }

    if (line.trim() === '}') {
        if (currentModelOriginalName) {
            finalLines.push(`  @@map("${currentModelOriginalName}")`);
        }
        currentModelOriginalName = null;
        finalLines.push(line);
        continue;
    }

    if (currentModelOriginalName && line.trim() && !line.includes('@@')) {
        const fieldRegex = /^(\s+)([a-z0-9_]+)(\s+)([\w_\[\]\?]+)(.*)$/;
        const fMatch = line.match(fieldRegex);
        
        if (fMatch) {
            const indent = fMatch[1];
            const snakeField = fMatch[2];
            const space = fMatch[3];
            let type = fMatch[4];
            let rest = fMatch[5];
            
            // a. Normalize type name (handle singularization)
            const baseType = type.replace(/[\[\]\?]/g, '');
            const markers = type.slice(baseType.length);
            
            // RELIABLE TYPE REPLACEMENT
            if (modelMapping[baseType]) {
                type = modelMapping[baseType] + markers;
            } else {
                // Try if baseType is actually a plural that was already singularized?
                const singularBase = baseType.replace(/s$/, '').replace(/ies$/, 'y');
                const target = Object.values(modelMapping).find(m => m.toLowerCase() === singularBase.toLowerCase());
                if (target) {
                    type = target + markers;
                }
            }

            // b. Normalize field name if scalar
            const isPrimitive = primitives.has(baseType);
            if (isPrimitive && snakeField.includes('_')) {
                const camelField = toCamel(snakeField);
                currentModelFields[snakeField] = camelField;
                line = `${indent}${camelField}${space}${type}${rest} @map("${snakeField}")`;
            } else {
                line = `${indent}${snakeField}${space}${type}${rest}`;
            }
        }
    }

    // Replace usages in constraints and relations
    if (line.includes('@@unique') || line.includes('@@index') || line.includes('@relation')) {
        for (const [snake, camel] of Object.entries(currentModelFields)) {
            line = line.replace(new RegExp(`\\b${snake}\\b`, 'g'), camel);
        }
    }

    finalLines.push(line);
}

fs.writeFileSync(schemaPath, finalLines.join('\n'));
console.log('Total Project Restoration V2 Complete.');
