const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Fix merged lines properly by matching the space followed by a camelCase word
content = content.replace(/@default\(cuid\(\)\)\s+([a-z][a-zA-Z0-9_]*\s+String)/g, '@default(cuid())\n  $1');
content = content.replace(/@default\(now\(\)\)\s+([a-z][a-zA-Z0-9_]*\s+String)/g, '@default(now())\n  $1');
content = content.replace(/@updatedAt\s+([a-z][a-zA-Z0-9_]*\s+String)/g, '@updatedAt\n  $1');

// Catch any other general ones
content = content.replace(/@default\(cuid\(\)\)\s+([a-zA-Z_]+)(?=\s+)/g, '@default(cuid())\n  $1');
content = content.replace(/@default\(now\(\)\)\s+([a-zA-Z_]+)(?=\s+)/g, '@default(now())\n  $1');
content = content.replace(/@updatedAt\s+([a-zA-Z_]+)(?=\s+)/g, '@updatedAt\n  $1');

fs.writeFileSync(schemaPath, content);
console.log('Restored missing newlines.');
