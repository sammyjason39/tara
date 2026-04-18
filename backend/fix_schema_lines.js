const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Fix merged lines caused by the previous regex
content = content.replace(/(@default\(cuid\(\)\))([a-zA-Z])/g, '$1\n  $2');
content = content.replace(/(@default\(now\(\)\))([a-zA-Z])/g, '$1\n  $2');
content = content.replace(/(@updatedAt)([a-zA-Z])/g, '$1\n  $2');

fs.writeFileSync(schemaPath, content);
console.log('Fixed merged lines in schema.');
