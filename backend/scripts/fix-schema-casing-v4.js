/**
 * fix-schema-casing-v4.js
 * 
 * Fixes two remaining error classes after v3:
 * 
 * 1. TS18004 — Shorthand property broken:
 *    The v3 script converted `{ tenantId }` → `{ tenant_id }` but variable
 *    in scope is still called `tenantId`. Fix: `{ tenant_id: tenantId }`.
 *
 * 2. TS2339 — Wrong Prisma model accessor names:
 *    Code uses `prisma.arCreditMemo` but schema model is `financeArCreditMemo`.
 *    Fix: add the correct `finance` prefix.
 *
 * Usage: node scripts/fix-schema-casing-v4.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Convert snake_case to camelCase (for TS18004 shorthand fix)
// ============================================================
function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// ============================================================
// Prisma model name corrections (TS2339):
// Wrong model accessor → Correct model accessor (on prisma client)
// Pattern: prisma.wrongName → prisma.correctName
//          tx.wrongName → tx.correctName
// ============================================================
const MODEL_NAME_MAP = {
  // Finance AR
  arCreditMemo: 'financeArCreditMemo',
  customerCreditBalance: 'financeArCustomerCreditBalance',
  arCustomer: 'financeArCustomer',
  arInvoice: 'financeArInvoice',
  arInvoiceLine: 'financeArInvoiceLine',
  arPayment: 'financeArPayment',
  arPaymentAllocation: 'financeArPaymentAllocation',
  apPaymentAllocation: 'financeApPaymentAllocation',

  // Finance Core
  journalEntry: 'financeJournalEntry',
  journalLine: 'financeJournalLine',
  journalReversal: 'financeJournalReversal',
  ledgerPosting: 'financeLedgerPosting',
  ledgerPostingLine: 'financeLedgerPostingLine',
  ledgerEventLog: 'financeLedgerEventLog',
  ledgerIdempotency: 'financeLedgerIdempotency',
  chartOfAccount: 'financeChartOfAccount',
  fiscalPeriod: 'financeFiscalPeriod',
  fiscalYear: 'financeFiscalYear',
  accountBalance: 'financeAccountBalance',
  insightSnapshot: 'financeInsightSnapshot',
  budgetLine: 'financeBudgetLine',
  budgetActual: 'financeBudgetActual',
  bankStatement: 'financeBankStatement',
  expensePolicy: 'financeExpensePolicy',
  assetCategory: 'financeAssetCategory',
  financeSubledgerEntry: 'financeInventorySubledgerEntry',

  // HR
  hrSuccessionCandidates: 'hrSuccessionCandidate',
};

// ============================================================
// Read pre-captured tsc output
// ============================================================
const errorFile = path.join(__dirname, '..', 'tsc-errors.txt');
if (!fs.existsSync(errorFile)) {
  console.error('ERROR: tsc-errors.txt not found.');
  process.exit(1);
}
const tscOutput = fs.readFileSync(errorFile, 'utf8');
const tscLines = tscOutput.split(/\r?\n/);

// ============================================================
// Parse TS18004 errors: shorthand property fix needed
// ============================================================
const shorthandFixes = []; // { file, line, col, propName }
const modelAccessFixes = []; // { file, line, col, wrongName, rightName }

for (const line of tscLines) {
  // TS18004: shorthand property 'xxx'
  const m18004 = line.match(/^(.*?)\((\d+),(\d+)\): error TS18004: .*shorthand property '([\w_]+)'/);
  if (m18004) {
    const [, filePath, lineStr, colStr, propName] = m18004;
    shorthandFixes.push({
      file: path.resolve(path.join(__dirname, '..'), filePath),
      line: parseInt(lineStr, 10),
      col: parseInt(colStr, 10),
      propName,
      varName: snakeToCamel(propName),
    });
    continue;
  }

  // TS2339: Property 'xxx' does not exist on type 'TransactionClient' or 'PrismaClient'
  const m2339 = line.match(/^(.*?)\((\d+),(\d+)\): error TS2339: Property '(\w+)' does not exist on type '(TransactionClient|PrismaService|PrismaClient)'/);
  if (m2339) {
    const [, filePath, lineStr, colStr, wrongName] = m2339;
    const rightName = MODEL_NAME_MAP[wrongName];
    if (rightName) {
      modelAccessFixes.push({
        file: path.resolve(path.join(__dirname, '..'), filePath),
        line: parseInt(lineStr, 10),
        col: parseInt(colStr, 10),
        wrongName,
        rightName,
      });
    }
  }
}

console.log(`TS18004 shorthand fixes: ${shorthandFixes.length}`);
console.log(`TS2339 model access fixes: ${modelAccessFixes.length}`);

// ============================================================
// Apply fixes — group by file
// ============================================================
const allFixes = [
  ...shorthandFixes.map(f => ({ ...f, type: 'shorthand' })),
  ...modelAccessFixes.map(f => ({ ...f, type: 'model' })),
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

  // Sort by line descending so we don't shift indices
  fixes.sort((a, b) => b.line - a.line || b.col - a.col);

  for (const fix of fixes) {
    const lineIdx = fix.line - 1;
    if (lineIdx < 0 || lineIdx >= fileLines.length) continue;

    const origLine = fileLines[lineIdx];

    if (fix.type === 'shorthand') {
      // Convert `{ snake_name }` → `{ snake_name: camelName }`
      // Pattern: standalone snake_name not followed by `:`
      const escaped = fix.propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Make sure it's a shorthand (not already key: value)
      const shorthandPattern = new RegExp(`\\b${escaped}\\b(?!\\s*:)`);
      if (!shorthandPattern.test(origLine)) {
        skipped.push(`SKIP 18004 ${path.relative(process.cwd(), filePath)}:${fix.line} '${fix.propName}' shorthand not found`);
        continue;
      }
      const newLine = origLine.replace(shorthandPattern, `${fix.propName}: ${fix.varName}`);
      if (newLine !== origLine) {
        fileLines[lineIdx] = newLine;
        changed = true;
        count++;
      }
    } else if (fix.type === 'model') {
      // Replace model accessor: `.wrongName` or `prisma.wrongName` → `.rightName`
      const escaped = fix.wrongName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newLine = origLine.replace(new RegExp(`\\.${escaped}\\b`, 'g'), `.${fix.rightName}`);
      if (newLine !== origLine) {
        fileLines[lineIdx] = newLine;
        changed = true;
        count++;
      } else {
        skipped.push(`SKIP 2339 ${path.relative(process.cwd(), filePath)}:${fix.line} '${fix.wrongName}' not found with dot`);
      }
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
  skipped.slice(0, 15).forEach(s => console.log('  ' + s));
  if (skipped.length > 15) console.log(`  ...and ${skipped.length - 15} more.`);
}

console.log('\n' + '='.repeat(60));
console.log(`Files fixed    : ${totalFilesFixed}`);
console.log(`Total fixes    : ${totalFixes}`);
console.log(`Skipped        : ${skipped.length}`);
console.log('='.repeat(60));
console.log('\nNext: npx tsc --noEmit 2>&1 | Out-File -Encoding utf8 tsc-errors.txt');
