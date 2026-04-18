const fs = require('fs');
const path = require('path');

const prismaPath = path.join(process.cwd(), '..', 'myschema.prisma');
let content = fs.readFileSync(prismaPath, 'utf8');

// Remove duplicate tenant_settings in companies model
const lines = content.split('\n');
const newLines = [];
let foundFirst = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('tenant_settings') && lines[i].includes('tenant_settings?')) {
        if (!foundFirst) {
            newLines.push(lines[i]);
            foundFirst = true;
        } else {
            // Found a second one, skip it
            console.log(`Skipping duplicate tenant_settings at line ${i + 1}`);
        }
    } else {
        newLines.push(lines[i]);
    }
}

fs.writeFileSync(prismaPath, newLines.join('\n'));
console.log('Successfully de-duplicated tenant_settings in myschema.prisma');
