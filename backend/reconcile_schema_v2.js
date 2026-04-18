const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// 1. Identify all models and their correct PascalCase names
const modelBlocks = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const mapping = {};
modelBlocks.forEach(match => {
    const name = match[1];
    mapping[name.toLowerCase()] = name; // Map lowercase to ACTUAL case in file
});

// 2. Global Type Fix
// Search for pattern: "fieldName snake_case_type" or "fieldName snake_case_type[]" or "fieldName snake_case_type?"
let newContent = content;

// Sort mapping keys by length descending to prevent partial replacement
const sortedSnakes = Object.keys(mapping).sort((a,b) => b.length - a.length);

for (const snake of sortedSnakes) {
    const correctCase = mapping[snake];
    
    // Regex matches whitespace + snake_case + (space or [ or ?)
    // We use a lookbehind/lookahead style to be safe
    const typeRefRegex = new RegExp(`(\\s+)${snake}(\\s|[\\?\\[])`, 'gi');
    newContent = newContent.replace(typeRefRegex, `$1${correctCase}$2`);
}

fs.writeFileSync(schemaPath, newContent);
console.log('Precision Type Restoration Complete.');
