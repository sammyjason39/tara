const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// 1. Manually Reconstruct Enums (since they were mangled)
const enums = `
enum ProcurementMode {
  DIRECT
  BIDDING
}

enum ChatMessageType {
  TEXT
  IMAGE
  FILE
}

enum ChatRoomType {
  DIRECT
  GROUP
  DEPARTMENT
}

enum ItemType {
  PRODUCT
  SERVICE
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}

enum NotificationChannel {
  EMAIL
  PUSH
  SMS
  IN_APP
}
`;

// 2. Identify Models and De-duplicate (Case-Insensitive)
const modelBlocks = [...content.matchAll(/model\s+(\w+)\s+{([\s\S]*?)}/g)];
const models = {};

modelBlocks.forEach(match => {
    const originalName = match[1];
    const body = match[2];
    const normalizedName = originalName.toLowerCase();
    
    const pascalName = toPascal(normalizedName);
    
    // Prioritize blocks with more fields or @@map
    if (!models[pascalName] || body.length > models[pascalName].body.length) {
        models[pascalName] = {
            originalSnake: normalizedName,
            pascal: pascalName,
            body: body
        };
    }
});

console.log(`Found ${Object.keys(models).length} de-duplicated models.`);

// 3. Start Rebuilding
let output = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

${enums}
`;

// 4. Fix Relations and Add @@map
const pascalModels = Object.keys(models);

for (const name of pascalModels) {
    let body = models[name].body;
    const snake = models[name].originalSnake;

    // Remove any nested model/enum definitions if they leaked into the body
    body = body.replace(/model\s+\w+\s+{[\s\S]*?}/g, '');
    body = body.replace(/enum\s+\w+\s+{[\s\S]*?}/g, '');

    // Standardize field names to snake_case? No, project uses mix.
    // BUT we must fix relationship TYPES to PascalCase
    for (const otherName of pascalModels) {
        const otherSnake = models[otherName].originalSnake;
        // Replace usage as type: ": other_snake" or " other_snake[" or " other_snake?" or " other_snake "
        // Use word boundaries or specific patterns
        const typeRegex = new RegExp(`(\\s+)${otherSnake}(\\s|[\\?\\[])`, 'gi');
        body = body.replace(typeRegex, `$1${otherName}$2`);
    }

    // Clean up body (remove double maps, etc.)
    const mapRegex = /@@map\(\"[^\"]*\"\)/g;
    body = body.replace(mapRegex, '');
    body = body.trim();
    if (body) {
        body = '\n  ' + body + `\n  @@map("${snake}")\n`;
    } else {
        body = `\n  @@map("${snake}")\n`;
    }

    output += `model ${name} {${body}}\n\n`;
}

fs.writeFileSync(schemaPath, output);
console.log('Schema V4 Reconstruction Complete.');
