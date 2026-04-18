const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const primitives = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes', 'BigInt']);

// 1. Dynamic Harvesting of Snake Case Fields
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

console.log(`Harvested ${Object.keys(snakeToCamelMap).length} snake_case fields for total normalization.`);

// 2. Total Transformation
let processedContent = content;
const sortedSnakes = Object.keys(snakeToCamelMap).sort((a, b) => b.length - a.length);

for (const snake of sortedSnakes) {
    const camel = snakeToCamelMap[snake];
    
    // Rename Field Definition and add @map
    // Match line-start + indent + snake + space + PrimitiveType possibly with ? or []
    // We replace it with: camelName[space]TypePossiblyWith?Or[] ... @map("snake_name")
    const fieldDefRegex = new RegExp(`^(\\s+)${snake}(\\s+)([A-Z][a-zA-Z\\[\\]\\?]+)(.*)$`, 'gm');
    processedContent = processedContent.replace(fieldDefRegex, (match, indent, space, type, rest) => {
        // If it already has @map, don't add another one
        if (rest.includes('@map')) return match;
        return `${indent}${camel}${space}${type}${rest} @map("${snake}")`;
    });
    
    // Global replace in constraints using word boundaries
    const wordRegex = new RegExp(`\\b${snake}\\b`, 'g');
    processedContent = processedContent.replace(wordRegex, camel);
    
    // Protection: Revert accidental rename inside existing @map strings
    processedContent = processedContent.replace(new RegExp(`@map\\("${camel}"\\)`, 'g'), `@map("${snake}")`);
}

// 3. Final Cleanup: Fix double/malformed maps
processedContent = processedContent.replace(/@map\("([^"]+)"\)\s+@map\("\1"\)/g, '@map("$1")');

fs.writeFileSync(schemaPath, processedContent);
console.log('Total System Normalization V2 Complete.');
