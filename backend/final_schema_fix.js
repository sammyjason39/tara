const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// 1. Extract Enums (to preserve them)
const enums = [...content.matchAll(/enum\s+(\w+)\s+{[\s\S]*?}/g)].map(m => m[0]);

// 2. Identify and De-duplicate Models
const modelBlocks = [...content.matchAll(/model\s+(\w+)\s+{([\s\S]*?)}/g)];
const models = {};

modelBlocks.forEach(match => {
    const originalName = match[1];
    const body = match[2];
    const normalizedName = originalName.toLowerCase();
    
    // Convert normalized name to PascalCase for the model name
    const pascalName = toPascal(normalizedName);
    
    // Store if it's the first time we see this model, or if this block has more content
    if (!models[pascalName] || body.length > models[pascalName].body.length) {
        models[pascalName] = {
            originalSnake: normalizedName,
            pascal: pascalName,
            body: body
        };
    }
});

console.log(`Found ${Object.keys(models).length} unique models.`);

// 3. Rebuild the Schema
let output = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

// Add Enums
output += enums.join('\n\n') + '\n\n';

// 4. Process Model Bodies (Fix relations and add @@map)
const pascalModels = Object.keys(models);

for (const name of pascalModels) {
    let body = models[name].body;
    const snake = models[name].originalSnake;

    // Fix Types in relations: search for any other model name in the body
    for (const otherName of pascalModels) {
        const otherSnake = models[otherName].originalSnake;
        if (otherSnake === otherName) continue; // Already Pascal or no change needed
        
        // Replace type usage: ": snake" or " snake[" or " snake?" or " snake "
        const typeRegex = new RegExp(`(\\s+)${otherSnake}(\\s|[\\?\\[])`, 'gi');
        body = body.replace(typeRegex, `$1${otherName}$2`);
    }

    // Ensure @@map
    if (!body.includes('@@map')) {
        body += `\n  @@map("${snake}")`;
    }

    output += `model ${name} {${body}}\n\n`;
}

fs.writeFileSync(schemaPath, output);
console.log('Final Schema Stabilization Complete.');
