const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const regexes = [
    { bad: 'companies', good: 'company' },
    { bad: 'departments', good: 'department' },
    { bad: 'locations', good: 'location' },
    { bad: 'employees', good: 'employee' },
    { bad: 'users', good: 'user' },
    { bad: 'stores', good: 'store' }
];

for (const { bad, good } of regexes) {
    // Look for `  companies    company @relation(...) `
    // Replace the first 'companies' with 'company'
    const reg = new RegExp(`^(\\s+)${bad}(\\s+)${good}(\\??\\s+@relation)`, 'gm');
    content = content.replace(reg, `$1${good}$2${good}$3`);
}

// there might also be multi-table relations where the word is embedded, like companies_companies... but we'll focus on the exact 1-to-1 map first

fs.writeFileSync(schemaPath, content);
console.log('Fixed plural relation properties pointing to singular models.');
