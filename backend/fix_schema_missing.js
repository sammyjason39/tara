const fs = require('fs');
const missing = `
model event_deliveries {
  id String @id @default(uuid())
  tenant_id String
  event_id String
  handler_name String
  status String @default("PENDING")
  attempts Int @default(0)
  last_error String?
  next_retry_at DateTime?
  created_at DateTime @default(now())
  updated_at DateTime @default(now())
  domain_events domain_events @relation(fields: [event_id], references: [id])
  companies companies @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, event_id, handler_name])
  @@map("event_deliveries")
}

model permission_overrides {
  id String @id @default(uuid())
  tenant_id String
  user_id String
  module String
  action String
  is_granted Boolean @default(false)
  created_at DateTime @default(now())
  companies companies @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, user_id, module, action])
  @@map("permission_overrides")
}

model print_job_queue {
  id String @id @default(uuid())
  tenant_id String
  printer_id String
  payload Json
  status String @default("PENDING")
  created_at DateTime @default(now())
  companies companies @relation(fields: [tenant_id], references: [id])
  @@map("print_job_queue")
}

model stock_audit_master {
  id String @id @default(uuid())
  tenant_id String
  location_id String
  auditor_id String
  status String @default("DRAFT")
  created_at DateTime @default(now())
  stock_audit_lines stock_audit_lines[]
  companies companies @relation(fields: [tenant_id], references: [id])
  @@map("stock_audit_master")
}

model stock_audit_lines {
  id String @id @default(uuid())
  master_id String
  product_id String
  expected_qty Decimal @db.Decimal(19,4)
  actual_qty Decimal @db.Decimal(19,4)
  notes String?
  stock_audit_master stock_audit_master @relation(fields: [master_id], references: [id])
  @@map("stock_audit_lines")
}
`;

fs.appendFileSync('prisma/schema.prisma', missing);
console.log('Re-added missing models to schema.');
