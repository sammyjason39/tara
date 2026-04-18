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
const processedLines = lines.map(line => {
    // Matches "  field_name Type" or "  field_name Type[]"
    // We target ONLY lowercase snake_case field names (at least one underscore)
    const match = line.match(/^(\s+)([a-z][a-z0-9_]+)(\s+)([\w_\[\]\?]+)(.*)$/);
    if (match) {
        const indent = match[1];
        const snake = match[2];
        const space = match[3];
        const type = match[4];
        const rest = match[5];
        
        // Scalar condition: Type is primitive OR it has attributes (excluding @relation)
        const isPrimitive = primitives.has(type.replace(/[\[\]\?]/g, ''));
        const isRelation = !isPrimitive && rest.includes('@relation');

        if (snake.includes('_') && !isRelation) {
            const camel = toCamel(snake);
            // Ensure no duplicate @map
            if (!rest.includes('@map')) {
                return `${indent}${camel}${space}${type}${rest} @map("${snake}")`;
            } else {
                return `${indent}${camel}${space}${type}${rest}`;
            }
        }
    }
    return line;
});

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Final Nuclear Normalization Complete.');
