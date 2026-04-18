const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Restore id @default(cuid()) if it's currently just @id
content = content.replace(/(id\s+String\s+@id)\s*(?!@default)/g, '$1 @default(cuid())');

// Restore createdAt @default(now())
content = content.replace(/(createdAt\s+DateTime)\s*(?!@default)/g, '$1 @default(now())');

// Restore updatedAt @updatedAt
content = content.replace(/(updatedAt\s+DateTime)\s*(?!@updatedAt)/g, '$1 @updatedAt');

fs.writeFileSync(schemaPath, content);
console.log('Restored Prisma defaults for id, createdAt, updatedAt.');
