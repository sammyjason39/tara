const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Use a simple, non-greedy match to find ID fields without defaults
// We look for 'id String @id' not followed by '@default'
const regex = /(id\s+String\s+@id)(?!\s+@default)/g;

content = content.replace(regex, (match) => {
    console.log(`Injecting default into: ${match.trim()}`);
    return `${match} @default(uuid())`;
});

fs.writeFileSync(path, content);
console.log('Successfully injected UUID defaults.');
