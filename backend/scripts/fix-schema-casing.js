/**
 * fix-schema-casing.js
 * Automated fix for 1804 TypeScript errors caused by camelCase field names
 * in Prisma query contexts. The schema uses snake_case, code uses camelCase.
 *
 * Usage: node scripts/fix-schema-casing.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Comprehensive camelCase → snake_case mapping for all Prisma schema fields
// ============================================================
const FIELD_MAPPINGS = {
  // Universal / Cross-module fields
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

  // Auth / Session
  tokenHash: 'token_hash',
  revokedAt: 'revoked_at',
  expiresAt: 'expires_at',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  passwordHash: 'password_hash',
  passwordUpdatedAt: 'password_updated_at',

  // Finance
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
  arCustomerId: 'ar_customer_id',
  creditLimit: 'credit_limit',
  usedCredit: 'used_credit',

  // HR
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

  // Inventory / Stock
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

  // Procurement
  requisitionId: 'requisition_id',
  purchaseOrderId: 'purchase_order_id',
  contractId: 'contract_id',
  bidId: 'bid_id',
  shipmentId: 'shipment_id',
  legalHandoffId: 'legal_handoff_id',
  goodsReceiptId: 'goods_receipt_id',
  accessRequestId: 'access_request_id',

  // Sales / CRM
  salesOrderId: 'sales_order_id',
  customerId: 'customer_id',
  opportunityId: 'opportunity_id',
  leadId: 'lead_id',
  dealId: 'deal_id',
  pipelineId: 'pipeline_id',
  stageId: 'stage_id',
  forecastAmount: 'forecast_amount',
  closedAt: 'closed_at',
  assignedTo: 'assigned_to',
  contactId: 'contact_id',
  lastActivityAt: 'last_activity_at',

  // Payment
  transactionId: 'transaction_id',
  settlementId: 'settlement_id',
  refundId: 'refund_id',
  channelFee: 'channel_fee',
  verificationStatus: 'verification_status',

  // Marketing
  campaignId: 'campaign_id',
  attributionId: 'attribution_id',
  segmentId: 'segment_id',

  // IT
  deviceId: 'device_id',
  lastHeartbeatAt: 'last_heartbeat_at',
  firmwareVersion: 'firmware_version',
  macAddress: 'mac_address',
  isActive: 'is_active',

  // Retail / Cart / Wishlist
  storeId: 'store_id',
  cartId: 'cart_id',
  wishlistId: 'wishlist_id',
  channelId: 'channel_id',
  ecommerceStoreId: 'ecommerce_store_id',
  retailOrderId: 'retail_order_id',

  // Compound unique index keys (used in where unique)
  'locationId_productId_departmentId': 'location_id_product_id_department_id',
  'tenantId_email': 'tenant_id_email',
  'userId_tenantId': 'user_id_tenant_id',
  'tenant_id_company_id_snapshot_sequence_forecast_hash': 'tenant_id_company_id_snapshot_sequence_forecast_hash',
};

// TypeScript primitive/built-in type names that signal a type annotation (not a value)
const TS_TYPE_KEYWORDS = new Set([
  'string', 'number', 'boolean', 'Date', 'any', 'null', 'undefined',
  'never', 'void', 'object', 'unknown', 'bigint', 'symbol',
  'String', 'Number', 'Boolean', 'Object', 'Array', 'Promise',
  'Record', 'Partial', 'Required', 'Readonly', 'Map', 'Set',
]);

/**
 * Determine if a line should be skipped entirely (not a data access line).
 */
function shouldSkipLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  // Comments
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // Imports and exports
  if (/^(import|export)\s/.test(trimmed)) return true;
  // Decorator lines
  if (trimmed.startsWith('@')) return true;
  // Interface / type / class / abstract / enum declarations (opening line)
  if (/^(interface|type\s+\w+\s*=|class\s|abstract\s|enum\s)/.test(trimmed)) return true;
  return false;
}

/**
 * Determine if the occurrence of `camelKey:` on this line is a TypeScript
 * type annotation rather than a Prisma object literal key-value pair.
 *
 * Heuristic:
 *  - If the value after the colon starts with a TS type keyword → type annotation
 *  - If the line ends with a semicolon and has no parentheses/await → type annotation
 *  - If the line contains a readonly/public/private/protected modifier → class property
 */
function isTypeAnnotation(line, camelKey) {
  // Escape for regex use
  const escapedKey = camelKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = line.match(new RegExp(`\\b${escapedKey}\\s*[?]?\\s*:\\s*([\\w<|&{[('"]+)`));
  if (!match) return false;

  const afterColon = match[1];
  const firstWord = afterColon.split(/[<|&;\s]/)[0];

  // If value starts with a known TS type keyword
  if (TS_TYPE_KEYWORDS.has(firstWord)) return true;

  // If value starts with an uppercase letter followed by non-`:` (likely a class/interface type)
  // and line ends with semicolon (class/interface member pattern)
  if (/^[A-Z]/.test(firstWord) && line.trim().endsWith(';') && !line.includes('await') && !line.includes('(')) return true;

  // Class-style modifiers
  if (/\b(readonly|private|public|protected)\b/.test(line)) return true;

  return false;
}

let totalFilesModified = 0;
let totalChanges = 0;

function processFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return;
  }

  const lines = content.split('\n');
  let fileChanged = false;
  let fileChanges = 0;

  const newLines = lines.map((line) => {
    if (shouldSkipLine(line)) return line;

    let newLine = line;

    for (const [camel, snake] of Object.entries(FIELD_MAPPINGS)) {
      if (!newLine.includes(camel)) continue;

      const escapedCamel = camel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // --- Replacement 1: Object literal key  `camelKey:` → `snake_key:`
      if (newLine.includes(camel + ':') || newLine.includes(camel + ' :') || newLine.includes(camel + '?:')) {
        if (!isTypeAnnotation(newLine, camel)) {
          const before = newLine;
          newLine = newLine.replace(
            new RegExp(`\\b${escapedCamel}(\\s*[?]?\\s*:)`, 'g'),
            `${snake}$1`
          );
          if (newLine !== before) fileChanges++;
        }
      }

      // --- Replacement 2: Property access  `.camelKey`  → `.snake_key`
      if (newLine.includes('.' + camel)) {
        const before = newLine;
        newLine = newLine.replace(new RegExp(`\\.${escapedCamel}\\b`, 'g'), `.${snake}`);
        if (newLine !== before) fileChanges++;
      }
    }

    if (newLine !== line) fileChanged = true;
    return newLine;
  });

  if (fileChanged) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    totalFilesModified++;
    totalChanges += fileChanges;
    const rel = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
    console.log(`  [${fileChanges.toString().padStart(4, ' ')}] ${rel}`);
  }
}

function walkDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', 'generated'].includes(entry.name)) continue;
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      processFile(fullPath);
    }
  }
}

// ============================================================
// MAIN
// ============================================================
const srcDir = path.join(__dirname, '..', 'src');
console.log('='.repeat(60));
console.log('Zenvix Schema Casing Fix — camelCase → snake_case');
console.log('='.repeat(60));
console.log(`Scanning: ${srcDir}\n`);

walkDir(srcDir);

console.log('\n' + '='.repeat(60));
console.log(`Files modified : ${totalFilesModified}`);
console.log(`Total changes  : ${totalChanges}`);
console.log('='.repeat(60));
console.log('\nNext step: run  npx tsc --noEmit  to check remaining errors.');
