const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Simply remove contiguous duplicates
content = content.replace(/(@default\(cuid\(\)\)\s*)+/g, '@default(cuid()) ');
content = content.replace(/(@default\(uuid\(\)\)\s*)+/g, '@default(uuid()) ');
content = content.replace(/(@default\(cuid\(\)\)\s*@default\(uuid\(\)\))/g, '@default(uuid())');
content = content.replace(/(@default\(uuid\(\)\)\s*@default\(cuid\(\)\))/g, '@default(uuid())');

content = content.replace(/(@default\(now\(\)\)\s*)+/g, '@default(now()) ');
content = content.replace(/(@updatedAt\s*)+/g, '@updatedAt ');

fs.writeFileSync(schemaPath, content);
console.log('Cleaned duplicate defaults.');
