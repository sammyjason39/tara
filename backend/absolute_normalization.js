const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toCamel = (s) => {
    const parts = s.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
};

const commonSnakes = [
    'tenant_id', 'created_at', 'updated_at', 'deleted_at', 'location_id', 'company_id',
    'user_id', 'department_id', 'start_date', 'end_date', 'fiscal_period_id', 'journal_ref',
    'posting_date', 'journal_type', 'account_id', 'account_code', 'purchase_order_id',
    'requisition_id', 'item_id', 'supplier_id', 'vendor_id', 'event_type', 'entity_id', 'entity_type'
];

let processedContent = content;

console.log('Performing Global Field and Index Normalization...');

for (const snake of commonSnakes) {
    const camel = toCamel(snake);
    
    // 1. Force the field definition to be camelCase and have @map
    // Positive lookbehind for start of line + spaces
    // Match: snake_name[space]Type
    // We replace it with: camelName[space]Type ... @map("snake_name")
    // We handle cases where @map might already exist or not
    const fieldDefRegex = new RegExp(`^(\\s+)${snake}(\\s+)(\\w+)`, 'gm');
    processedContent = processedContent.replace(fieldDefRegex, `$1${camel}$2$3 @map("${snake}")`);
    
    // Cleanup double maps
    processedContent = processedContent.replace(new RegExp(`@map\\("${snake}"\\)\\s+@map\\("${snake}"\\)`, 'g'), `@map("${snake}")`);

    // 2. Global replace in @@unique, @@index, and @relation using word boundaries
    const wordRegex = new RegExp(`\\b${snake}\\b`, 'g');
    processedContent = processedContent.replace(wordRegex, camel);
    
    // 3. BUT we must NOT replace the name INSIDE the @map we just added
    // Revert @map("camelName") to @map("snake_name") if it happened
    processedContent = processedContent.replace(new RegExp(`@map\\("${camel}"\\)`, 'g'), `@map("${snake}")`);
}

fs.writeFileSync(schemaPath, processedContent);
console.log('Absolute Normalization Complete.');
