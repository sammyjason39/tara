const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// 1. Identify all models from the introspected schema (which are currently snake_case)
const modelMatches = [...content.matchAll(/model\s+([a-z0-9_]+)\s+{/g)];
const mapping = {};

modelMatches.forEach(m => {
    const snake = m[1];
    mapping[snake] = toPascal(snake);
});

console.log(`Found ${Object.keys(mapping).length} snake_case models to Pascalize.`);

// 2. Project-wide name replacement
let newContent = content;

// Sorted by length descending to prevent partial replacement
const sortedKeys = Object.keys(mapping).sort((a,b) => b.length - a.length);

for (const snake of sortedKeys) {
    const pascal = mapping[snake];
    if (snake === pascal) continue;

    // 2a. Replace model definition
    const modelDefRegex = new RegExp(`model\\s+${snake}\\s+{`, 'g');
    newContent = newContent.replace(modelDefRegex, `model ${pascal} {`);

    // 2b. Replace as a type in relationships
    // Search for ": snake", " snake[", " snake?", " snake "
    const typeRefRegex = new RegExp(`(\\s+)${snake}(\\s|[\\?\\[])`, 'g');
    newContent = newContent.replace(typeRefRegex, `$1${pascal}$2`);
}

// 3. Ensure @@map for all models
const lines = newContent.split('\n');
let currentModel = null;
let currentSnake = null;
let hasMap = false;
const processedLines = [];

for (let line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s+{/);
    if (modelMatch) {
        currentModel = modelMatch[1];
        currentSnake = Object.keys(mapping).find(k => mapping[k] === currentModel);
        hasMap = false;
    }

    if (line.includes('@@map')) {
        hasMap = true;
    }

    if (line.trim() === '}' && currentModel) {
        if (!hasMap && currentSnake && currentSnake !== currentModel) {
            processedLines.push(`  @@map("${currentSnake}")`);
        }
        currentModel = null;
    }
    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Clean Sweep Complete.');
