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
    
    // 1. Hardcoded ID and updatedAt removal in create/upsert
    content = content.replace(/\s+id: ['"][^'"]+['"],/g, '');
    content = content.replace(/\s+updated_at: new Date\(\),/g, '');
    content = content.replace(/\s+updatedAt: new Date\(\),/g, '');
    
    // 2. camelCase consistency
    content = content.replace(/updated_at/g, 'updatedAt');
    content = content.replace(/tenant_id/g, 'tenantId');
    content = content.replace(/location_id/g, 'locationId');
    content = content.replace(/company_id/g, 'companyId');
    content = content.replace(/employee_id/g, 'employeeId');
    
    // 3. Singularize relation includes (the most common source of TS2353)
    content = content.replace(/include: \{\s*companies: true/g, 'include: { company: true');
    content = content.replace(/include: \{\s*locations: true/g, 'include: { location: true');
    content = content.replace(/include: \{\s*departments: true/g, 'include: { department: true');
    content = content.replace(/include: \{\s*employees: true/g, 'include: { employee: true');
    content = content.replace(/include: \{\s*users: true/g, 'include: { user: true');
    
    // 4. Singularize model calls on this.prisma.<model>
    // (Wait, I'll be careful here as TransactionClient might still want plural)
    // Actually, let's fix the obvious ones that are 100% singular in refined schema
    content = content.replace(/\.employees\./g, '.employee.');
    content = content.replace(/\.locations\./g, '.location.');
    content = content.replace(/\.departments\./g, '.department.');
    content = content.replace(/\.companies\./g, '.company.');
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Cleaned up ${f}`);
});
