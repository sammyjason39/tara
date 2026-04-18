const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const pascal = s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

// 1. Identify all models (currently PascalCase from previous sweep or snake_case)
const modelMatches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const mapping = {};

modelMatches.forEach(m => {
    const currentName = m[1];
    
    // We want the camelCase version of the database table name
    // BUT we need to know the database table name from @@map if it exists
    // Actually, just using the current name and camelCasing its snake version works
    const snake = currentName.split(/(?=[A-Z])/).join('_').toLowerCase();
    mapping[currentName] = toCamel(snake);
});

console.log(`Mapping ${Object.keys(mapping).length} models to camelCase.`);

// 2. Global replacement
let newContent = content;
const sortedKeys = Object.keys(mapping).sort((a,b) => b.length - a.length);

for (const oldName of sortedKeys) {
    const camel = mapping[oldName];
    if (oldName === camel) continue;

    // Model Definition
    const modelDefRegex = new RegExp(`model\\s+${oldName}\\s+{`, 'g');
    newContent = newContent.replace(modelDefRegex, `model ${camel} {`);

    // Type usage in relations
    const typeRefRegex = new RegExp(`(\\s+)${oldName}(\\s|[\\?\\[])`, 'g');
    newContent = newContent.replace(typeRefRegex, `$1${camel}$2`);
}

fs.writeFileSync(schemaPath, newContent);
console.log('Final Camel Sweep Complete.');
