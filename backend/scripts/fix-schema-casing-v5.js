/**
 * fix-schema-casing-v5.js
 * 
 * Final cleanup script handling the remaining ~420 errors:
 * 
 * 1. TS2552 - "Cannot find name 'tenant_id'. Did you mean 'tenantId'?"
 *    The v3 script converted WHERE object keys, but in some cases the value
 *    was already being used as a shorthand `{ tenant_id }` AND the fix failed.
 *    Now: replace raw variable references `tenant_id` → `tenantId` where 
 *    the context is a function scope (inside method body, not inside Prisma object).
 *    BUT: also handle remaining `orderBy: { createdAt:` → `orderBy: { created_at:`
 *    And remaining camelCase fields missed before.
 *
 * 2. TS2339 remaining - Property 'financeAssetCategory' does not exist on TransactionClient
 *    More model name mismatches to fix.
 *
 * 3. orderBy camelCase fields: ledgerSequence → ledger_sequence, postingDate → posting_date etc.
 *
 * Usage: node scripts/fix-schema-casing-v5.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Remaining field corrections not caught by "Did you mean" hints
// These are in orderBy:, select:, where: contexts
// ============================================================
const REMAINING_ORDERBY_FIELDS = {
  ledgerSequence: 'ledger_sequence',
  postingDate: 'posting_date',
  effectiveDate: 'effective_date',
  settlementDate: 'settlement_date',
  journalType: 'journal_type',
  sourceEventId: 'source_event_id',
  entryHash: 'entry_hash',
  accountCode: 'account_code',
  projectId: 'project_id',
  ledgerSequenceRange: 'ledger_sequence_range',
  invoiceNumber: 'invoice_number',
  invoiceDate: 'invoice_date',
  scheduledAt: 'scheduled_at',
  plannedHireDate: 'planned_hire_date',
  startTime: 'start_time',
  endTime: 'end_time',
  nodeName: 'node_name',
  lastModified: 'last_modified',
  entryType: 'entry_type',
  skuId: 'sku_id',
  sourceModule: 'source_module',
  usefulLifeYears: 'useful_life_years',
  assetAccountRef: 'asset_account_ref',
  depreciationAccountRef: 'depreciation_account_ref',
};

// TS2552: These are variable references (not keys) that got incorrectly renamed
// Pattern: `tenant_id` used as variable name (not as object key `tenant_id:`)
// Reverse: replace standalone `tenant_id` → `tenantId`, etc. ONLY in value positions
const TS2552_REVERSE_MAP = {
  tenant_id: 'tenantId',
  location_id: 'locationId', 
  product_id: 'productId',
  source_event_id: 'sourceEventId',
  entry_type: 'entryType',
  sku_id: 'skuId',
  resolved_by: 'resolvedBy',
};

// Additional model name mappings not previously included
const ADDITIONAL_MODEL_MAP = {
  financeAssetCategory: 'financeAssetCategory', // Already correct - check why failing
  AssetCategory: 'financeAssetCategory', // Wrong import type 
  ledgerPosting: 'financeLedgerPosting',
  insightSnapshot: 'financeInsightSnapshot',
  journalEntry: 'financeJournalEntry',
  journalLine: 'financeJournalLine',
  chartOfAccount: 'financeChartOfAccount',
  fiscalYear: 'financeFiscalYear',
};

// ============================================================
// Read pre-captured tsc output
// ============================================================
const errorFile = path.join(__dirname, '..', 'tsc-errors.txt');
if (!fs.existsSync(errorFile)) {
  console.error('ERROR: tsc-errors.txt not found. Run: npx tsc --noEmit 2>&1 | Out-File -Encoding utf8 tsc-errors.txt');
  process.exit(1);
}
const tscOutput = fs.readFileSync(errorFile, 'utf8');
const tscLines = tscOutput.split(/\r?\n/);

// Parse TS2552 + remaining TS2353/TS2561 
const ts2552Fixes = [];
const remainingFieldFixes = [];

for (const line of tscLines) {
  // TS2552: Cannot find name 'snake_name'. Did you mean 'camelName'?
  const m2552 = line.match(/^(.*?)\((\d+),(\d+)\): error TS2552: Cannot find name '([\w_]+)'\. Did you mean '(\w+)'\?/);
  if (m2552) {
    const [, filePath, lineStr, colStr, wrongName, rightName] = m2552;
    ts2552Fixes.push({
      file: path.resolve(path.join(__dirname, '..'), filePath),
      line: parseInt(lineStr, 10),
      col: parseInt(colStr, 10),
      wrongName,
      rightName,
    });
    continue;
  }

  // TS2353/TS2561 with no suggestion (specific fields we know need fixing)
  const m2353 = line.match(/^(.*?)\((\d+),(\d+)\): error TS(2353|2561): .*'(createdAt|updatedAt|ledgerSequence|postingDate|postingdate|effectiveDate|scheduledAt|startDate|plannedHireDate|startTime|nodeName|sourceModule|accountCode|projectId|usefulLifeYears|assetAccountRef|depreciationAccountRef|entryType|skuId)'/i);
  if (m2353) {
    const [, filePath, lineStr, colStr, , wrongName] = m2353;
    const rightName = REMAINING_ORDERBY_FIELDS[wrongName] || (wrongName.includes('_') ? wrongName : wrongName.replace(/([A-Z])/g, '_$1').toLowerCase());
    remainingFieldFixes.push({
      file: path.resolve(path.join(__dirname, '..'), filePath),
      line: parseInt(lineStr, 10),
      col: parseInt(colStr, 10),
      wrongName,
      rightName,
    });
  }
}

console.log(`TS2552 variable fixes: ${ts2552Fixes.length}`);
console.log(`Remaining field fixes: ${remainingFieldFixes.length}`);

// Combine and group by file
const allFixes = [
  ...ts2552Fixes.map(f => ({ ...f, type: 'variable' })),
  ...remainingFieldFixes.map(f => ({ ...f, type: 'field' })),
];

const byFile = new Map();
for (const fix of allFixes) {
  if (!byFile.has(fix.file)) byFile.set(fix.file, []);
  byFile.get(fix.file).push(fix);
}

let totalFilesFixed = 0;
let totalFixes = 0;
const skipped = [];

for (const [filePath, fixes] of byFile.entries()) {
  if (!fs.existsSync(filePath)) continue;

  let fileLines = fs.readFileSync(filePath, 'utf8').split('\n');
  let changed = false;
  let count = 0;

  fixes.sort((a, b) => b.line - a.line || b.col - a.col);

  for (const fix of fixes) {
    const lineIdx = fix.line - 1;
    if (lineIdx < 0 || lineIdx >= fileLines.length) continue;

    const origLine = fileLines[lineIdx];
    const escaped = fix.wrongName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let newLine = origLine;

    if (fix.type === 'variable') {
      // TS2552: Replace standalone variable reference `snake_name` → `camelName`
      // It should NOT be followed by `:` (that would be an object key, already fixed)
      newLine = origLine.replace(new RegExp(`\\b${escaped}\\b(?!\\s*:)`, 'g'), fix.rightName);
    } else {
      // TS2353/2561: Replace remaining camelCase field keys
      newLine = origLine.replace(new RegExp(`\\b${escaped}(\\s*:)`, 'g'), `${fix.rightName}$1`);
    }

    if (newLine !== origLine) {
      fileLines[lineIdx] = newLine;
      changed = true;
      count++;
    } else {
      skipped.push(`SKIP ${fix.type} ${path.relative(process.cwd(), filePath)}:${fix.line} '${fix.wrongName}'`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, fileLines.join('\n'), 'utf8');
    totalFilesFixed++;
    totalFixes += count;
    const rel = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
    console.log(`  [${count.toString().padStart(4)}] ${rel}`);
  }
}

if (skipped.length > 0) {
  console.log(`\nSkipped (${skipped.length}):`);
  skipped.slice(0, 20).forEach(s => console.log('  ' + s));
  if (skipped.length > 20) console.log(`  ...and ${skipped.length - 20} more.`);
}

console.log('\n' + '='.repeat(60));
console.log(`Files fixed    : ${totalFilesFixed}`);
console.log(`Total fixes    : ${totalFixes}`);
console.log('='.repeat(60));
