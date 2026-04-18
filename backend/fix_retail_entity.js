const fs = require('fs');
const path = require('path');

const targetFiles = [
    'src/modules/retail/repositories/retail.db.repository.ts'
];

targetFiles.forEach(relPath => {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the specific entity import
    content = content.replace(/import\s*{\s*retailOrder\s*}\s*from\s*['"]\.\.\/entities\/retail\.entity['"]/, "import { RetailOrder } from '../entities/retail.entity'");
    
    // Fix ProcurementAuditEvent
    content = content.replace(/import\s*{\s*ProcurementAuditEvent\s*}\s*from\s*['"]@prisma\/client['"]/, "import { procurementAuditEvent } from '@prisma/client'");

    fs.writeFileSync(filePath, content);
});

console.log('Fixed export caps rollback.');
