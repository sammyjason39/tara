const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// 1. Recover Enums more robustly
// We look for where the enums WERE in recent errors (e.g. ItemType has ITEM)
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
  ITEM
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

// 2. Extract Models
const modelBlocks = [...content.matchAll(/model\s+(\w+)\s+{([\s\S]*?)}/g)];
const mapping = {};
const models = {};

modelBlocks.forEach(match => {
    const originalName = match[1];
    const body = match[2];
    const normalizedName = originalName.toLowerCase();
    const pascalName = toPascal(normalizedName);
    
    if (!models[pascalName] || body.length > models[pascalName].body.length) {
        models[pascalName] = body;
        mapping[normalizedName] = pascalName;
    }
});

console.log(`Mapping ${Object.keys(mapping).length} unique models to PascalCase.`);

// 3. Rebuild with Global Case-Insensitive Replacement for Relation Types
let output = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

${enums}
`;

for (const [pascal, body] of Object.entries(models)) {
    let cleanBody = body;
    const snake = Object.keys(mapping).find(key => mapping[key] === pascal);

    // Replace ANY model name reference (case-insensitive) with its PascalCase equivalent
    // BUT only when it appears in a position where a type would be (after property name or inside [])
    // We use a simplified regex that finds all keys in mapping
    for (const [snakeKey, pascalVal] of Object.entries(mapping)) {
        // Find usage as type: ": snake_key" or " snake_key[" or " snake_key?"
        // Case-insensitive match for the snake_key
        const typeRegex = new RegExp(`(\\s+)${snakeKey}(\\s|[\\?\\[])`, 'gi');
        cleanBody = cleanBody.replace(typeRegex, `$1${pascalVal}$2`);
    }

    // Double check @@map
    cleanBody = cleanBody.replace(/@@map\(\"[^\"]*\"\)/g, ''); // Clear existing maps
    cleanBody = cleanBody.trim();
    
    output += `model ${pascal} {\n  ${cleanBody}\n  @@map("${snake}")\n}\n\n`;
}

fs.writeFileSync(schemaPath, output);
console.log('Final Reconciliation Strategy Executed.');
