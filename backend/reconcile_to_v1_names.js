const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toSingularCamel = (s) => {
    // 1. Remove plural 's' or 'es' or 'ies'
    let name = s;
    if (name.endsWith('ies')) name = name.slice(0, -3) + 'y';
    else if (name.endsWith('es')) {
        // exceptions like 'process' -> 'processes'? No, usually business entities.
        if (name.endsWith('ses') || name.endsWith('xes')) name = name.slice(0, -2);
        else name = name.slice(0, -1);
    }
    else if (name.endsWith('s') && !name.endsWith('ss')) name = name.slice(0, -1);
    
    // 2. camelCase
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

// 3. Identify Models
const modelMatches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const mapping = {};
modelNames = modelMatches.map(m => m[1]);

modelNames.forEach(name => {
    // Current name is likely PascalCase or snake_case from previous sweeps
    const snake = name.split(/(?=[A-Z])/).join('_').toLowerCase();
    mapping[name] = toSingularCamel(snake);
});

// Special fixes for common Zenvix models
mapping['Companies'] = 'companies'; // Known lowercase in some places
mapping['Users'] = 'users';
mapping['Locations'] = 'locations';
mapping['Departments'] = 'departments';

console.log(`Mapping models to Singular CamelCase...`);

let newContent = content;
const sortedKeys = Object.keys(mapping).sort((a,b) => b.length - a.length);

for (const oldName of sortedKeys) {
    const target = mapping[oldName];
    if (oldName === target) continue;

    const modelDefRegex = new RegExp(`model\\s+${oldName}\\s+{`, 'g');
    newContent = newContent.replace(modelDefRegex, `model ${target} {`);

    const typeRefRegex = new RegExp(`(\\s+)${oldName}(\\s|[\\?\\[])`, 'g');
    newContent = newContent.replace(typeRefRegex, `$1${target}$2`);
}

fs.writeFileSync(schemaPath, newContent);
console.log('Singular CamelCase Restoration Complete.');
