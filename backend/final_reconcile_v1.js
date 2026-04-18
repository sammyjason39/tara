const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toSingularCamel = (s) => {
    let name = s;
    if (name.endsWith('ies')) name = name.slice(0, -3) + 'y';
    else if (name.endsWith('es')) {
        if (name.endsWith('ses') || name.endsWith('xes')) name = name.slice(0, -2);
        else name = name.slice(0, -1);
    }
    else if (name.endsWith('s') && !name.endsWith('ss')) name = name.slice(0, -1);
    
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const modelMatches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const mapping = {};
modelNames = modelMatches.map(m => m[1]);

modelNames.forEach(name => {
    // We want to map current model name to singular camelCase
    const snake = name.split(/(?=[A-Z])/).join('_').toLowerCase();
    mapping[name] = toSingularCamel(snake);
});

// Force core models
mapping['companies'] = 'company';
mapping['users'] = 'user';
mapping['locations'] = 'location';
mapping['departments'] = 'department';

console.log(`Mapping ${Object.keys(mapping).length} models to Final Singular CamelCase...`);

let newContent = content;
const sortedKeys = Object.keys(mapping).sort((a,b) => b.length - a.length);

for (const oldName of sortedKeys) {
    const target = mapping[oldName];
    
    // 1. Fix Model definition
    const modelDefRegex = new RegExp(`model\\s+${oldName}\\s+{`, 'g');
    newContent = newContent.replace(modelDefRegex, `model ${target} {`);

    // 2. Fix Relationship types (Case-Insensitive)
    const typeRefRegex = new RegExp(`(\\s+)${oldName}(\\s|[\\?\\[])`, 'gi');
    newContent = newContent.replace(typeRefRegex, `$1${target}$2`);
}

fs.writeFileSync(schemaPath, newContent);
console.log('Final Relation Casing Fixed.');
