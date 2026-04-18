const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const replacements = {
    'inventory_pools': 'inventoryPool',
    'retail_orders': 'retailOrder',
    'bulletin_categories': 'bulletinCategory',
    'retail_shifts': 'retailShift',
    'retail_catalogs': 'retailCatalog',
    'hr_career_paths': 'hrCareerPath'
};

for (const [snake, camel] of Object.entries(replacements)) {
    // Only replace when it's a type (after whitespace, before [] or ? and @relation)
    const regex = new RegExp(`(?<=^\\s+\\w+\\s+)${snake}(?=\\[\\]|\\?|\\s+@|\\s*$)`, 'gm');
    content = content.replace(regex, camel);
}

fs.writeFileSync(schemaPath, content);
console.log('Fixed snake case types in relations.');
