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

    if (currentModel && line.trim() && !line.includes('@@') && !line.match(/^\s*model/)) {
        // Matches a field: "  tenant_id String" or "  tenant_id String @default(...)"
        const fieldRegex = /^(\s+)([a-z0-9_]+)(\s+)([\w_\[\]\?]+)(.*)$/;
        const match = line.match(fieldRegex);
        
        if (match) {
            const indent = match[1];
            const snakeField = match[2];
            const space = match[3];
            const type = match[4];
            const rest = match[5];
            
            // Convert if it has underscores
            if (snakeField.includes('_')) {
                const camelField = toCamel(snakeField);
                
                // Add @map if not present and NOT a relation (relations don't take @map)
                // Relations usually have @relation or the type starts with Upstairs case
                const isRelation = rest.includes('@relation') || type.match(/^[A-Z]/);
                
                if (!isRelation && !rest.includes('@map')) {
                    line = `${indent}${camelField}${space}${type}${rest} @map("${snakeField}")`;
                } else {
                    line = `${indent}${camelField}${space}${type}${rest}`;
                }
            }
        }
    }
    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Final Field Normalization V2 Complete.');
