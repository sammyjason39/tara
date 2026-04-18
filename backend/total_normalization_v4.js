const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const primitives = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes', 'BigInt']);

// 1. Dynamic Harvesting
const snakeToCamelMap = {};
const lines = content.split('\n');
for (let line of lines) {
    const match = line.match(/^(\s+)([a-z][a-z0-9_]+)(\s+)([\w_\[\]\?]+)/);
    if (match) {
        const snake = match[2];
        const typeMatch = match[4].replace(/[\[\]\?]/g, '');
        if (snake.includes('_') && primitives.has(typeMatch)) {
            snakeToCamelMap[snake] = toCamel(snake);
        }
    }
}

// 2. Transformation
let processedContent = content;
const sortedSnakes = Object.keys(snakeToCamelMap).sort((a, b) => b.length - a.length);

for (const snake of sortedSnakes) {
    const camel = snakeToCamelMap[snake];
    
    // Line definition: INDENT snake SPACE TypePossiblyOptionalPossiblyArray REST
    const fieldDefRegex = new RegExp(`^(\\s+)${snake}(\\s+)([A-Z][a-zA-Z]+)([\\?\\[\\]]+)?(.*)$`, 'gm');
    processedContent = processedContent.replace(fieldDefRegex, (match, indent, space, type, markers, rest) => {
        if (rest.includes('@map')) return match;
        const markStr = markers || '';
        return `${indent}${camel}${space}${type}${markStr}${rest} @map("${snake}")`;
    });
    
    // Global replace in constraints
    const wordRegex = new RegExp(`\\b${snake}\\b`, 'g');
    processedContent = processedContent.replace(wordRegex, camel);
    
    // Protection
    processedContent = processedContent.replace(new RegExp(`@map\\("${camel}"\\)`, 'g'), `@map("${snake}")`);
}

// 3. FINAL SYNTAX CLEANUP: Ensure ? and [] are before @map
processedContent = processedContent.replace(/(@map\("[^"]+"\))([\?\[\]]+)/g, '$2 $1');

fs.writeFileSync(schemaPath, processedContent);
console.log('Total System Normalization V4 Complete.');
