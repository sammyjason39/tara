const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Identify all models and their correct PascalCase names
const modelMatches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const mapping = {};
modelBlocks = modelMatches.map(m => m[1]);

modelBlocks.forEach(name => {
    // Map BOTH the snake_case and the lowercase version to the correctly cased name
    const normalized = name.toLowerCase();
    mapping[normalized] = name;
    
    // Also map the version WITH underscores to the correctly cased name
    // Even if it was already PascalCase, we want to be able to find and replace snake_case usages
    const snake = name.split(/(?=[A-Z])/).join('_').toLowerCase();
    mapping[snake] = name;
});

// 2. Global Type Fix
let newContent = content;

// Sort mapping keys by length descending to prevent partial replacement
const sortedKeys = Object.keys(mapping).sort((a,b) => b.length - a.length);

console.log(`Mapping ${sortedKeys.length} variations to correct case...`);

for (const key of sortedKeys) {
    const correctCase = mapping[key];
    if (key === correctCase) continue;
    
    // Regex matches whitespace + key + (space or [ or ?)
    // Global and Case-Insensitive (since references might be mixed)
    const typeRefRegex = new RegExp(`(\\s+)${key}(\\s|[\\?\\[])`, 'gi');
    newContent = newContent.replace(typeRefRegex, `$1${correctCase}$2`);
}

fs.writeFileSync(schemaPath, newContent);
console.log('Final Precision Type Harmonization Complete.');
