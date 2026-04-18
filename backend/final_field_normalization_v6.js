const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const primitives = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes', 'BigInt']);

// 1. Target model blocks
let newContent = content.replace(/model\s+(\w+)\s+{([\s\S]*?)}/g, (match, modelName, body) => {
    const lines = body.split('\n');
    const fieldMapping = {};
    const processedLines = [];

    // First pass: identify fields and normalize definitions
    for (let line of lines) {
        // Matches scalar field definition
        const fieldRegex = /^(\s+)([a-z0-9_]+)(\s+)([\w_\[\]\?]+)(.*)$/;
        const fMatch = line.match(fieldRegex);
        
        if (fMatch) {
            const indent = fMatch[1];
            const snakeField = fMatch[2];
            const space = fMatch[3];
            const type = fMatch[4];
            const rest = fMatch[5];
            
            const baseType = type.replace(/[\[\]\?]/g, '');
            const isPrimitive = primitives.has(baseType);
            const isRelation = !isPrimitive && !rest.includes('@id') && !rest.includes('@unique');

            if (snakeField.includes('_') && !isRelation) {
                const camelField = toCamel(snakeField);
                fieldMapping[snakeField] = camelField;
                
                if (!rest.includes('@map')) {
                    line = `${indent}${camelField}${space}${type}${rest} @map("${snakeField}")`;
                } else {
                    line = `${indent}${camelField}${space}${type}${rest}`;
                }
            }
        }
        processedLines.push(line);
    }

    // Second pass: replace usages of mapped fields in indexes/constraints within THIS model
    let revisedBody = processedLines.join('\n');
    for (const [snake, camel] of Object.entries(fieldMapping)) {
        const regex = new RegExp(`\\b${snake}\\b`, 'g');
        revisedBody = revisedBody.replace(regex, camel);
    }

    return `model ${modelName} {${revisedBody}}`;
});

fs.writeFileSync(schemaPath, newContent);
console.log('Final Field Normalization V6 Complete.');
