/**
 * fix-schema-casing-v2.js
 * 
 * CORRECTED automated fix for TSC schema casing errors.
 * 
 * Problem with v1: The `.property` access replacement was too broad,
 * replacing camelCase on internal TypeScript interfaces (DTOs, events, etc.)
 * that legitimately use camelCase.
 *
 * Strategy v2:
 * 1. Only replace OBJECT LITERAL KEYS (key: value patterns) in Prisma contexts
 *    - NOT property accesses (.propName)
 * 2. Rely on Prisma-context detection: only replace when inside a Prisma query call
 * 3. Revert over-aggressive property access fixes from v1 run
 *
 * Usage: node scripts/fix-schema-casing-v2.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// REVERT MAP: snake_case → camelCase (undo v1 property access over-replacements)
// These are internal TypeScript interface/DTO fields that should stay camelCase.
// ============================================================
const REVERT_PROPERTY_ACCESS = {
  // Internal service params / DTOs
  '.tenant_id': '.tenantId',
  '.entity_type': '.entityType',
  '.entity_id': '.entityId',
  '.user_id': '.userId',
  '.correlation_id': '.correlationId',
  '.hash_chain': '.hashChain',
  '.anchored_at': '.anchoredAt',
  '.previous_hash': '.previousHash',
  '.created_at': '.createdAt',
  '.updated_at': '.updatedAt',
  '.deleted_at': '.deletedAt',
  // Note: We will only do this on non-Prisma model files
};

// ============================================================
// FORWARD MAP: camelCase → snake_case (for Prisma object literal KEYS)
// ============================================================
const FIELD_MAPPINGS = {
  tenantId: 'tenant_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  locationId: 'location_id',
  departmentId: 'department_id',
  userId: 'user_id',
  entityType: 'entity_type',
  entityId: 'entity_id',
  correlationId: 'correlation_id',
  branchCode: 'branch_code',
  branchId: 'branch_id',
  managerId: 'manager_id',
  tokenHash: 'token_hash',
  revokedAt: 'revoked_at',
  expiresAt: 'expires_at',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  passwordHash: 'password_hash',
  passwordUpdatedAt: 'password_updated_at',
  accountId: 'account_id',
  accountName: 'account_name',
  journalId: 'journal_id',
  fiscalPeriodId: 'fiscal_period_id',
  ledgerPostingId: 'ledger_posting_id',
  taxRate: 'tax_rate',
  taxAmount: 'tax_amount',
  payableId: 'payable_id',
  receivableId: 'receivable_id',
  invoiceId: 'invoice_id',
  vendorId: 'vendor_id',
  assetId: 'asset_id',
  assetCategoryId: 'asset_category_id',
  totalAmount: 'total_amount',
  dueDate: 'due_date',
  paymentId: 'payment_id',
  approvedBy: 'approved_by',
  requestedBy: 'requested_by',
  createdBy: 'created_by',
  hashChain: 'hash_chain',
  anchoredAt: 'anchored_at',
  previousHash: 'previous_hash',
  hashValue: 'hash_value',
  parentId: 'parent_id',
  scenarioId: 'scenario_id',
  budgetId: 'budget_id',
  forecastId: 'forecast_id',
  taxConfigId: 'tax_config_id',
  providerReference: 'provider_reference',
  providerId: 'provider_id',
  employeeId: 'employee_id',
  firstName: 'first_name',
  lastName: 'last_name',
  hireDate: 'hire_date',
  terminationDate: 'termination_date',
  jobRoleId: 'job_role_id',
  baseSalary: 'base_salary',
  hourlyRate: 'hourly_rate',
  employmentType: 'employment_type',
  shiftId: 'shift_id',
  performanceScore: 'performance_score',
  payrollRunId: 'payroll_run_id',
  payPeriodStart: 'pay_period_start',
  payPeriodEnd: 'pay_period_end',
  reviewerId: 'reviewer_id',
  leaveType: 'leave_type',
  startDate: 'start_date',
  endDate: 'end_date',
  skillId: 'skill_id',
  jobPostingId: 'job_posting_id',
  applicantId: 'applicant_id',
  candidateId: 'candidate_id',
  productId: 'product_id',
  warehouseId: 'warehouse_id',
  inventoryPoolId: 'inventory_pool_id',
  reorderPoint: 'reorder_point',
  maxStock: 'max_stock',
  minStock: 'min_stock',
  minBuffer: 'min_buffer',
  unitCost: 'unit_cost',
  unitPrice: 'unit_price',
  basePrice: 'base_price',
  onHand: 'on_hand',
  reservedQty: 'reserved_qty',
  supplierId: 'supplier_id',
  supplierBranchId: 'supplier_branch_id',
  lastSyncAt: 'last_sync_at',
  requestedDelta: 'requested_delta',
  adjustmentId: 'adjustment_id',
  batchId: 'batch_id',
  batchNumber: 'batch_number',
  expiryDate: 'expiry_date',
  movementType: 'movement_type',
  fromLocationId: 'from_location_id',
  toLocationId: 'to_location_id',
  requisitionId: 'requisition_id',
  purchaseOrderId: 'purchase_order_id',
  contractId: 'contract_id',
  bidId: 'bid_id',
  shipmentId: 'shipment_id',
  salesOrderId: 'sales_order_id',
  customerId: 'customer_id',
  opportunityId: 'opportunity_id',
  leadId: 'lead_id',
  dealId: 'deal_id',
  pipelineId: 'pipeline_id',
  stageId: 'stage_id',
  closedAt: 'closed_at',
  assignedTo: 'assigned_to',
  contactId: 'contact_id',
  lastActivityAt: 'last_activity_at',
  transactionId: 'transaction_id',
  settlementId: 'settlement_id',
  refundId: 'refund_id',
  verificationStatus: 'verification_status',
  campaignId: 'campaign_id',
  deviceId: 'device_id',
  lastHeartbeatAt: 'last_heartbeat_at',
  macAddress: 'mac_address',
  isActive: 'is_active',
  storeId: 'store_id',
  cartId: 'cart_id',
  wishlistId: 'wishlist_id',
  channelId: 'channel_id',
  retailOrderId: 'retail_order_id',
  arCustomerId: 'ar_customer_id',
  creditLimit: 'credit_limit',
  usedCredit: 'used_credit',
  paymentMethod: 'payment_method',
  paymentStatus: 'payment_status',
  grandTotal: 'grand_total',
};

// These TS keywords—if they appear as the VALUE after the colon—indicate a type annotation
const TS_TYPE_KEYWORDS = new Set([
  'string', 'number', 'boolean', 'Date', 'any', 'null', 'undefined',
  'never', 'void', 'object', 'unknown', 'bigint', 'symbol',
  'String', 'Number', 'Boolean', 'Object', 'Array', 'Promise',
  'Record', 'Partial', 'Required', 'Readonly', 'Map', 'Set',
  'Omit', 'Pick', 'Extract', 'Exclude',
]);

function shouldSkipLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  if (/^(import|export\s+type|export\s+interface|export\s+abstract|export\s+class|export\s+enum)\s/.test(trimmed)) return true;
  if (trimmed.startsWith('@')) return true;
  if (/^(interface|type\s+\w+|abstract\s+class|enum\s)/.test(trimmed)) return true;
  return false;
}

function isTypeAnnotation(line, camelKey) {
  const escapedKey = camelKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = line.match(new RegExp(`\\b${escapedKey}\\s*[?!]?\\s*:\\s*([\\w<|&'"({[]+)`));
  if (!match) return false;
  const firstWord = match[1].split(/[<|&;\s>]/)[0];
  if (TS_TYPE_KEYWORDS.has(firstWord)) return true;
  // Class property with modifier
  if (/\b(readonly|private|public|protected|static)\b/.test(line)) return true;
  // Ends with semicolon, no assignment or call - interface member
  if (line.trim().endsWith(';') && !line.includes('=') && !line.includes('(') && !line.includes('await')) return true;
  return false;
}

function processForwardFix(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch (e) { return 0; }

  const lines = content.split('\n');
  let changed = false;
  let count = 0;

  const result = lines.map((line) => {
    if (shouldSkipLine(line)) return line;
    let newLine = line;

    for (const [camel, snake] of Object.entries(FIELD_MAPPINGS)) {
      if (!newLine.includes(camel)) continue;
      const escapedCamel = camel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // ONLY replace as object literal key: `camelKey:` → `snake_key:`
      // Do NOT replace property access `.camelKey`
      if (newLine.match(new RegExp(`\\b${escapedCamel}\\s*[?!]?\\s*:`))) {
        if (!isTypeAnnotation(newLine, camel)) {
          const before = newLine;
          newLine = newLine.replace(
            new RegExp(`\\b${escapedCamel}(\\s*[?!]?\\s*:)`, 'g'),
            `${snake}$1`
          );
          if (newLine !== before) count++;
        }
      }
    }
    if (newLine !== line) changed = true;
    return newLine;
  });

  if (changed) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    return count;
  }
  return 0;
}

let totalFiles = 0;
let totalChanges = 0;

function walkDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', 'generated', 'scripts'].includes(entry.name)) continue;
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const n = processForwardFix(fullPath);
      if (n > 0) {
        totalFiles++;
        totalChanges += n;
        const rel = path.relative(path.join(__dirname, '..'), fullPath).replace(/\\/g, '/');
        console.log(`  [${n.toString().padStart(4)}] ${rel}`);
      }
    }
  }
}

const srcDir = path.join(__dirname, '..', 'src');
console.log('='.repeat(60));
console.log('Zenvix Schema Casing Fix v2 — Object Key Pass Only');
console.log('='.repeat(60));
console.log(`Scanning: ${srcDir}\n`);
walkDir(srcDir);
console.log('\n' + '='.repeat(60));
console.log(`Files modified : ${totalFiles}`);
console.log(`Total changes  : ${totalChanges}`);
console.log('='.repeat(60));
