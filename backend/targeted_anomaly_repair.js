const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Fix Broken Model Names (caused by over-aggressive singularization)
let newContent = content;

const brokenToFixed = {
    'adminModuleStatu': 'adminModuleStatus',
    'supplierBranche': 'supplierBranch',
    'productCategorie': 'productCategory',
    'procurementCategorie': 'procurementCategory',
    'bulletinCategorie': 'bulletinCategory',
};

for (const [broken, fixed] of Object.entries(brokenToFixed)) {
    // Replace model definition
    newContent = newContent.replace(new RegExp(`model\\s+${broken}\\s+{`, 'g'), `model ${fixed} {`);
    // Replace type usage
    newContent = newContent.replace(new RegExp(`(\\s+)${broken}(\\s|[\\?\\[])`, 'g'), `$1${fixed}$2`);
}

// 2. Fix remaining plural types in relations
const pluralToSingular = {
    'EcommerceConnectors': 'ecommerceConnector',
    'UserNotificationPreferences': 'userNotificationPreference',
    'Payables': 'payable',
    'Receivables': 'receivable',
    'Positions': 'position',
    'Employees': 'employee',
    'Departments': 'department',
    'Locations': 'location',
    'Users': 'user',
};

for (const [plural, singular] of Object.entries(pluralToSingular)) {
    const regex = new RegExp(`(\\s+)${plural}(\\s|[\\?\\[])`, 'gi');
    newContent = newContent.replace(regex, `$1${singular}$2`);
}

fs.writeFileSync(schemaPath, newContent);
console.log('Targeted Anomaly Repair Complete.');
