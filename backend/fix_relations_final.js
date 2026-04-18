const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toSingularCamel = (s) => {
    let name = s.replace(/ies$/, 'y').replace(/statuses$/, 'status').replace(/s$/, '').replace(/([^e])s$/, '$1');
    if (name.endsWith('classe')) name = 'class';
    if (name.endsWith('branthe')) name = 'branch';
    if (name.endsWith('categoric')) name = 'category';
    
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const modelMapping = {};
const matches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
matches.forEach(m => {
    const name = m[1];
    modelMapping[name] = name;
});

// We need a map from whatever snake case plural to the correct camelCase singular
const fixMap = {
    'employees': 'employee',
    'chat_members': 'chatMember',
    'chat_rooms': 'chatRoom',
    'bulletin_categories': 'bulletinCategory',
    'retail_shifts': 'retailShift',
    'retail_catalogs': 'retailCatalog',
    'hr_career_paths': 'hrCareerPath',
    'inventory_pools': 'inventoryPool',
    'retail_orders': 'retailOrder'
};

const lines = content.split('\n');
const processedLines = [];

for (let line of lines) {
    if (line.match(/^\s+\w+\s+/) && !line.includes('@@')) {
        for (const [bad, good] of Object.entries(fixMap)) {
            // Find exactly the type token, allowing for optional ? or array []
            const regex = new RegExp(`(?<=^\\s+\\w+\\s+)${bad}(?=\\[\\]|\\?|\\s+)`, 'g');
            line = line.replace(regex, good);
            
            // Just in case it's the exact word
            const wordRegex = new RegExp(`\\b${bad}\\b`, 'g');
            // Actually, we ONLY want to replace the type, not the field name. 
            // So the first regex is perfect.
        }
    }
    processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Fixed straggling relation types.');
