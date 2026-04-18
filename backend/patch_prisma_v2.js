const fs = require('fs');
const path = require('path');

const prismaPath = path.join(process.cwd(), '..', 'myschema.prisma');
let content = fs.readFileSync(prismaPath, 'utf8');

// 1. Ensure admin_audit_events is there
if (!content.includes('model admin_audit_events')) {
     const restoreText = `model admin_audit_events {
  id          String   @id
  tenant_id   String
  action      String
  entity_type String
  entity_id   String
  actor_id    String
  created_at  DateTime @default(now())
}\n\n`;
    content = content.replace(/model accounting_periods \{[\s\S]*?\}\n\n/, (match) => match + restoreText);
}

// 2. Add sourcing_events to companies model
if (!content.includes('sourcing_events       procurement_sourcing_events[]')) {
    content = content.replace(/workflow_requests\s+workflow_requests\[\]/, 'workflow_requests                   workflow_requests[]\n  sourcing_events                     procurement_sourcing_events[]');
}

// 3. Update procurement_final_pos sourcing_events relation name if needed
// Actually, the error said it's missing on model companies.

fs.writeFileSync(prismaPath, content);
console.log('Successfully patched myschema.prisma for companies relation');
