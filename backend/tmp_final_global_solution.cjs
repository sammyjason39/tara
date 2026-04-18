const fs = require('fs');
const path = require('path');

const files = [
    'src/core/hr/repositories/hr.db.repository.ts',
    'src/core/hr/hr-consistency.service.ts',
    'src/core/hr/services/hr-insight.service.ts',
    'src/core/hr/services/hr-metric.service.ts',
    'src/support/explorer/explorer.service.ts'
];

files.forEach(f => {
    const fullPath = path.resolve(__dirname, '..', 'backend', f);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // 1. Force Singularization in Includes/Selects
    // replaces plural relations with singular relations from the refined schema
    content = content.replace(/companies: true/g, 'company: true');
    content = content.replace(/locations: true/g, 'location: true');
    content = content.replace(/departments: true/g, 'department: true');
    content = content.replace(/employees: true/g, 'employee: true');
    
    // 2. Remove hardcoded IDs and Managed Fields in Create/Upsert
    // (Pattern: id: "...", / updatedAt: new Date(), / createdAt: new Date(),)
    content = content.replace(/\s+id: ['"][^'"]+['"],/g, '');
    content = content.replace(/\s+updated_at: [^,]+,/g, '');
    content = content.replace(/\s+created_at: [^,]+,/g, '');
    content = content.replace(/\s+updatedAt: [^,]+,/g, '');
    content = content.replace(/\s+createdAt: [^,]+,/g, '');
    
    // 3. Fix Property Names (snake_case -> camelCase)
    content = content.replace(/tenant_id/g, 'tenantId');
    content = content.replace(/location_id/g, 'locationId');
    content = content.replace(/department_id/g, 'departmentId');
    content = content.replace(/employee_id/g, 'employeeId');
    content = content.replace(/company_id/g, 'companyId');

    // 4. Restore common Broken Blocks (the source of the TS1005 errors)
    // Fix empty orderBy blocks
    content = content.replace(/orderBy: \{\s+select: \{/g, "orderBy: { updatedAt: 'desc' },\n      select: {");
    content = content.replace(/orderBy: \{\s+take: ([0-9]+),/g, "orderBy: { id: 'desc' },\n          take: $1,");
    content = content.replace(/orderBy: \{\s+\}/g, "orderBy: { id: 'desc' }");
    
    // 5. Ensure missing braces are restored in findMany/findFirst calls
    // Fix the "orderBy: { id: 'desc' });" -> "orderBy: { id: 'desc' } });" issue
    content = content.replace(/orderBy: \{ id: 'desc' \}\s*\);/g, "orderBy: { id: 'desc' }\n    });");

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Restored and fixed ${f}`);
});
