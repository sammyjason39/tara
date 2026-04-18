const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const lines = content.split('\n');
const processedLines = [];
let currentModel = null;

for (let line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s+{/);
    if (modelMatch) currentModel = modelMatch[1];
    if (line.trim() === '}') currentModel = null;

    if (currentModel && line.trim() && !line.includes('@@') && !line.includes('@id') && !line.match(/^\s*model/)) {
        // Matches a field: "  tenant_id String" or "  tenant_id String @default(...)"
        // But avoid lines that are already camelCase or relations
        const fieldRegex = /^(\s+)([a-z0-9_]+)(\s+)([\w_]+)(.*)$/;
        const match = line.match(fieldRegex);
        
        if (match) {
            const indent = match[1];
            const snakeField = match[2];
            const space = match[3];
            const type = match[4];
            const rest = match[5];
            
            // Only convert if it has underscores and is not already camelCase or a capitalized model name
            if (snakeField.includes('_') && !type.match(/^[A-Z]/)) {
                const camelField = toCamel(snakeField);
                
                // Add @map if not present
                if (!rest.includes('@map')) {
                    line = `${indent}${camelField}${space}${type}${rest} @map("${snakeField}")`;
                } else {
                    // Update existing map if needed? No, just replace field name
                    line = `${indent}${camelField}${space}${type}${rest}`;
                }
            }
        }
    }
    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Final Field Normalization Complete.');
