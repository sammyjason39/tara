const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const primitives = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes', 'BigInt']);

const lines = content.split('\n');
const processedLines = [];
let currentModelFields = {}; // snake -> camel for current model

for (let line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s+{/);
    if (modelMatch) {
        currentModelFields = {};
    }

    if (line.match(/^\s+\w+\s+[\w_\[\]\?]+/)) {
        const fieldRegex = /^(\s+)([a-z0-9_]+)(\s+)([\w_\[\]\?]+)(.*)$/;
        const match = line.match(fieldRegex);
        
        if (match) {
            const indent = match[1];
            const snakeField = match[2];
            const space = match[3];
            const type = match[4];
            const rest = match[5];
            
            const baseType = type.replace(/[\[\]\?]/g, '');
            const isPrimitive = primitives.has(baseType);
            const isRelation = !isPrimitive && !rest.includes('@id') && !rest.includes('@unique');

            if (snakeField.includes('_') && !isRelation) {
                const camelField = toCamel(snakeField);
                currentModelFields[snakeField] = camelField;
                
                if (!rest.includes('@map')) {
                    line = `${indent}${camelField}${space}${type}${rest} @map("${snakeField}")`;
                } else {
                    line = `${indent}${camelField}${space}${type}${rest}`;
                }
            }
        }
    }

    // Update indexes and unique constraints
    if (line.includes('@@unique') || line.includes('@@index')) {
        for (const [snake, camel] of Object.entries(currentModelFields)) {
            // Match the field name inside [ ... ]
            const fieldInConstraintRegex = new RegExp(`([\\s,\\[])${snake}([\\s,\\]])`, 'g');
            line = line.replace(fieldInConstraintRegex, `$1${camel}$2`);
        }
    }

    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Final Field Normalization V4 Complete.');
