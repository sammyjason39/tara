const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const errsPath = path.join(__dirname, 'prisma_errs.txt');
if (!fs.existsSync(errsPath)) {
    console.log("No errors file found.");
    process.exit(0);
}

const errs = fs.readFileSync(errsPath, 'utf8');

const toSingularCamel = (s) => {
    let name = s.replace(/ies$/, 'y').replace(/statuses$/, 'status').replace(/s$/, '').replace(/([^e])s$/, '$1');
    if (name.endsWith('classe')) name = 'class';
    if (name.endsWith('branthe')) name = 'branch';
    if (name.endsWith('categoric')) name = 'category';
    
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const regex = /Type "([^"]+)" is neither/g;
let match;
const fixMap = {};

while ((match = regex.exec(errs)) !== null) {
    const bad = match[1];
    fixMap[bad] = toSingularCamel(bad);
}

console.log("Dynamically extracted fixes from validation errors:", fixMap);

for (const [bad, good] of Object.entries(fixMap)) {
    // We want to replace ` bad ` or ` bad?` or ` bad[]` ONLY when it's the type.
    // So space + bad + (space or ? or [)
    // Positive lookbehind for space
    const targetReg = new RegExp(`(?<=\\s)${bad}(?=\\s|\\?|\\[)`, 'g');
    content = content.replace(targetReg, good);
}

fs.writeFileSync(schemaPath, content);
console.log('Fixed dynamic errors.');
