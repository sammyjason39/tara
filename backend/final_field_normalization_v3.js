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
let currentModel = null;

for (let line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s+{/);
    if (modelMatch) currentModel = modelMatch[1];
    if (line.trim() === '}') currentModel = null;

    if (currentModel && line.trim() && !line.includes('@@') && !line.match(/^\s*model/)) {
        const fieldRegex = /^(\s+)([a-z0-9_]+)(\s+)([\w_\[\]\?]+)(.*)$/;
        const match = line.match(fieldRegex);
        
        if (match) {
            const indent = match[1];
            const snakeField = match[2];
            const space = match[3];
            const type = match[4];
            const rest = match[5];
            
            // Clean type (remove [], ?)
            const baseType = type.replace(/[\[\]\?]/g, '');
            
            if (snakeField.includes('_')) {
                const camelField = toCamel(snakeField);
                
                // It is a scalar field if the type is primitive OR if it has @map/other attributes
                // AND it's not a relation
                const isPrimitive = primitives.has(baseType);
                const isRelation = !isPrimitive && !rest.includes('@id') && !rest.includes('@unique');

                if (!isRelation && !rest.includes('@map')) {
                    line = `${indent}${camelField}${space}${type}${rest} @map("${snakeField}")`;
                } else if (!isRelation) {
                    line = `${indent}${camelField}${space}${type}${rest}`;
                }
            }
        }
    }
    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Final Field Normalization V3 Complete.');
