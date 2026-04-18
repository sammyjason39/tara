const fs = require('fs');
const path = require('path');

const prismaPath = path.join(process.cwd(), '..', 'myschema.prisma');
let content = fs.readFileSync(prismaPath, 'utf8');

// 1. Restore admin_audit_events correctly if missing
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

// 2. Fix companies relation (remove extra stubs)
content = content.replace(/procurement_receipts\s+procurement_receipts\[\]\n\s+sourcing_events\s+procurement_sourcing_events\[\]\n\s+sourcing_events\s+procurement_sourcing_events\[\]/, 'procurement_receipts     procurement_receipts[]\n  tenant_settings          tenant_settings?');

// 3. Fix ProcurementMode and tenant_settings at line 80 area
content = content.replace(/enum ProcurementMode \{[\s\S]*?\}\n\nmodel tenant_settings \{[\s\S]*?\}/, `enum ProcurementMode {
  DIRECT
  BIDDING
}

model tenant_settings {
  id               String          @id @default(uuid())
  tenant_id        String          @unique
  procurement_mode ProcurementMode @default(DIRECT)
  created_at       DateTime        @default(now())
  updated_at       DateTime        @updatedAt
  companies       companies       @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id])
}`);

// 4. Update procurement_final_pos properly
content = content.replace(/model procurement_final_pos \{([\s\S]*?)\}/, (match, p1) => {
    let inner = p1;
    if (!inner.includes('metadata')) {
        inner = inner.replace(/finance_commitment_id\s+String\?/, 'finance_commitment_id    String?\n  metadata                 Json?');
    }
    if (!inner.includes('sourcing_events')) {
        inner = inner.replace(/procurement_receipts\s+procurement_receipts\[\]/, 'procurement_receipts     procurement_receipts[]\n  sourcing_events          procurement_sourcing_events[]');
    }
    return `model procurement_final_pos {${inner}}`;
});

// 5. Update procurement_requisitions
content = content.replace(/model procurement_requisitions \{([\s\S]*?)\}/, (match, p1) => {
    let inner = p1;
    if (!inner.includes('sourcing_events')) {
        inner = inner.replace(/procurement_final_pos\s+procurement_final_pos\[\]/, 'procurement_final_pos procurement_final_pos[]\n  sourcing_events       procurement_sourcing_events[]');
    }
    return `model procurement_requisitions {${inner}}`;
});

// 6. Add procurement_sourcing_events model correctly
if (!content.includes('model procurement_sourcing_events {')) {
    const sourcingModel = `\nmodel procurement_sourcing_events {
  id             String                    @id @default(uuid())
  tenant_id      String
  requisition_id String?
  final_po_id    String?
  status         String                    @default("OPEN")
  bid_deadline   DateTime?
  metadata       Json?
  created_at     DateTime                  @default(now())
  updated_at     DateTime                  @updatedAt
  requisitions   procurement_requisitions?  @relation(fields: [requisition_id], references: [id])
  final_pos      procurement_final_pos?     @relation(fields: [final_po_id], references: [id])
  companies      companies                 @relation(fields: [tenant_id], references: [id])

  @@index([requisition_id])
  @@index([tenant_id])
}\n`;
    content = content.replace(/model procurement_risk_signals \{[\s\S]*?\}/, (match) => match + sourcingModel);
}

// Final Cleanup: remove bad stubs
content = content.replace(/model procurement_final_pos \{\s+id\s+String\s+@id\s+\}/g, '');

fs.writeFileSync(prismaPath, content);
console.log('Successfully patched myschema.prisma');
