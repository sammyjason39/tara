const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Split by model blocks
const parts = content.split(/model\s+(\w+)\s+\{/);
const header = parts[0];
const models = {};

for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    const body = parts[i + 1];
    if (!models[name]) {
        models[name] = body;
    } else {
        console.log(`Removing duplicate model: ${name}`);
    }
}

let newContent = header;
Object.keys(models).forEach(name => {
    newContent += `model ${name} {${models[name]}`;
});

fs.writeFileSync('prisma/schema.prisma', newContent);
console.log('Deduplication complete.');
