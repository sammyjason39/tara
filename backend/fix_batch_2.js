const fs = require('fs');
const path = require('path');

const replacements = {
  'this.prisma.stockMovement': 'this.prisma.stock_movements',
  'this.prisma.stockLevel': 'this.prisma.stock_levels',
  'this.prisma.retailOrder': 'this.prisma.retail_orders',
  'this.prisma.location': 'this.prisma.locations',
  'this.prisma.employee': 'this.prisma.employees',
  'this.prisma.inventoryAlert': 'this.prisma.inventory_alerts',
  'this.prisma.company': 'this.prisma.companies',
  'this.prisma.auditLog': 'this.prisma.audit_logs',
  'this.prisma.adminModuleStatus': 'this.prisma.admin_module_statuses',
  'this.prisma.adminAuditEvent': 'this.prisma.admin_audit_events',
  'this.prisma.adminRequest': 'this.prisma.admin_requests',
  'this.prisma.store': 'this.prisma.stores',
  'this.prisma.user(?![A-Za-z])': 'this.prisma.users', 
  'this.prisma.userCompany': 'this.prisma.user_companies',
  'this.prisma.department': 'this.prisma.departments',
  'tx.stockMovement': 'tx.stock_movements',
  'tx.stockLevel': 'tx.stock_levels',
  'tx.retailOrder': 'tx.retail_orders',
  'tx.location': 'tx.locations',
  'tx.employee': 'tx.employees',
  'tx.inventoryAlert': 'tx.inventory_alerts',
  'tx.company': 'tx.companies',
  'tx.auditLog': 'tx.audit_logs',
  'tx.adminModuleStatus': 'tx.admin_module_statuses',
  'tx.adminAuditEvent': 'tx.admin_audit_events',
  'tx.adminRequest': 'tx.admin_requests',
  'tx.store': 'tx.stores',
  'tx.user(?![A-Za-z])': 'tx.users', 
  'tx.userCompany': 'tx.user_companies',
  'tx.department': 'tx.departments'
};

const files = [
  'src/agentic/inventory/anomaly-detector.service.ts',
  'src/agentic/inventory/forecaster.service.ts',
  'src/agentic/inventory/replenishment.service.ts',
  'src/core/admin/admin.controller.ts',
  'src/core/admin/repositories/admin.prisma.repository.ts',
  'src/core/auth/guards/branch-gating.guard.ts',
  'src/core/auth/guards/module-state.guard.ts',
  'src/core/auth/repositories/auth.db.repository.ts',
  'src/core/auth/repositories/provisioning.db.repository.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
      console.log('Skipping missing file', file);
      return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [target, replacement] of Object.entries(replacements)) {
    const escapedTarget = target.replace(/\./g, '\\.');
    const regex = new RegExp(escapedTarget, 'g');
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content);
  console.log('Fixed', file);
});
