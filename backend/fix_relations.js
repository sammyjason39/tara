const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Replace specific types in relations that the automated script missed
content = content.replace(/(?<=^\s+\w+\s+)departments(?=\??\s+@relation)/gm, 'department');
content = content.replace(/(?<=^\s+\w+\s+)locations(?=\??\s+@relation)/gm, 'location');
content = content.replace(/(?<=^\s+\w+\s+)companies(?=\??\s+@relation)/gm, 'company');
content = content.replace(/(?<=^\s+\w+\s+)users(?=\??\s+@relation)/gm, 'user');
content = content.replace(/(?<=^\s+\w+\s+)stores(?=\??\s+@relation)/gm, 'store');
content = content.replace(/(?<=^\s+\w+\s+)modules(?=\??\s+@relation)/gm, 'module');

fs.writeFileSync(schemaPath, content);
console.log('Fixed plural relation types.');
