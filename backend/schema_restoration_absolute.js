const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const mapping = {
    'tenant_id': 'tenantId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'deleted_at': 'deletedAt',
    'location_id': 'locationId',
    'company_id': 'companyId',
    'user_id': 'userId',
    'department_id': 'departmentId',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'fiscal_period_id': 'fiscalPeriodId',
    'journal_ref': 'journalRef',
    'posting_date': 'postingDate',
    'journal_type': 'journalType',
    'account_id': 'accountId',
    'account_code': 'accountCode',
    'source_id': 'sourceId',
    'destination_id': 'destinationId',
    'purchase_order_id': 'purchaseOrderId',
    'requisition_id': 'requisitionId',
    'item_id': 'itemId',
    'supplier_id': 'supplierId',
    'vendor_id': 'vendorId',
};

// 1. First, CLEAN UP ANY MESS from previous failed scripts (like malformed strings)
content = content.replace(/@map\("[^"]*\\+[^"]*"\)/g, ''); // Remove malformed maps
content = content.replace(/@map\(" [^"]*"\)/g, ''); // Remove leading spaces in maps

// 2. Perform Clean Replacement
let lines = content.split('\n');
const processedLines = lines.map(line => {
    // Only target field definition lines (indented with at least 2 spaces)
    if (line.startsWith('  ') && !line.includes('@@') && !line.includes('model ')) {
        // Find if line contains a field from our mapping
        for (const [snake, camel] of Object.entries(mapping)) {
            // Regex for: fieldName Type ...
            // We search for the snake word as the FIRST word of the line
            const regex = new RegExp(`^(\\s+)${snake}(\\s+)`, 'g');
            if (line.match(regex)) {
                // Rename field and add @map
                line = line.replace(regex, `$1${camel}$2`);
                if (!line.includes('@map')) {
                    // Find where to insert @map (usually before or after existing attributes)
                    // We'll just append it to the end of the field definition
                    line = line.trimEnd() + ` @map("${snake}")`;
                }
                break;
            }
        }
    }
    return line;
});

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Absolute Schema Restoration Complete.');
