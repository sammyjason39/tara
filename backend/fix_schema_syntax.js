const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Fix the "@@map(...) }" issue where the brace is on the same line
const fixed = content.replace(/@@map\((\"[^\"]*\")\)}/g, '  @@map($1)\n}');

fs.writeFileSync(schemaPath, fixed);
console.log('Syntax fix applied.');
