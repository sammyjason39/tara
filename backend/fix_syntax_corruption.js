/**
 * fix_syntax_corruption.js
 * 
 * Fixes TypeScript syntax corruption introduced by a previous mass-replace script.
 * The corruptions are of two kinds:
 * 
 * 1. Method call arguments got `: any` injected:
 *    e.g. `this.mapToDomain(res: any)` → `this.mapToDomain(res)`
 *         `this.mapToDomain(item: any)` → `this.mapToDomain(item)`
 *         `pattern.test(line: any)` → `pattern.test(line)`
 *         `sections.assets.push(item: any)` → `sections.assets.push(item)`
 * 
 * 2. Arrow function params got split:
 *    e.g. `recommendations.map(re(c: any) =>` → `recommendations.map(rec =>`
 *         `.map((r: any) => this.deepFreeze(r: any))` → `.map(r => this.deepFreeze(r))`
 *         `.catch(er(r: any) =>` → `.catch(err =>`
 *         `numbe(r: any) =>` → `number =>`
 * 
 * 3. `this.stableSerialize(item: any)` in a map callback → `this.stableSerialize(item)`
 */

const fs = require('fs');
const path = require('path');

const financeDir = path.join(__dirname, 'src', 'core', 'finance');

// Targeted per-file fixes (exact string replacements)
const fileFixes = {
  'src/core/finance/ar/repositories/ar-customer.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapToDomain(item: any));', 'return list.map((item: any) => this.mapToDomain(item));'],
  ],
  'src/core/finance/ar/repositories/ar-invoice.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapToDomain(item: any));', 'return list.map((item: any) => this.mapToDomain(item));'],
    ['return createdLines.map((line: any) => this.mapLineToDomain(line: any));', 'return createdLines.map((line: any) => this.mapLineToDomain(line));'],
    ['return list.map((line: any) => this.mapLineToDomain(line: any));', 'return list.map((line: any) => this.mapLineToDomain(line));'],
  ],
  'src/core/finance/ar/repositories/ar-payment.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapAllocationToDomain(item: any));', 'return list.map((item: any) => this.mapAllocationToDomain(item));'],
  ],
  'src/core/finance/repositories/asset.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapToDomain(item: any));', 'return list.map((item: any) => this.mapToDomain(item));'],
  ],
  'src/core/finance/repositories/coa.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapToDomain(item: any));', 'return list.map((item: any) => this.mapToDomain(item));'],
  ],
  'src/core/finance/repositories/journal.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapToDomain(item: any));', 'return list.map((item: any) => this.mapToDomain(item));'],
  ],
  'src/core/finance/repositories/vendor.db.repository.ts': [
    ['return this.mapToDomain(res: any);', 'return this.mapToDomain(res);'],
    ['return list.map((item: any) => this.mapToDomain(item: any));', 'return list.map((item: any) => this.mapToDomain(item));'],
  ],
  'src/core/finance/services/ledger-architecture-guard.service.ts': [
    ['if (pattern.test(line: any)) {', 'if (pattern.test(line)) {'],
  ],
  'src/core/finance/services/ledger-posting.service.ts': [
    ['}).catch(er(r: any) => this.logger.error(`Projection Worker Failed: ${err.message}`))', '}).catch(err => this.logger.error(`Projection Worker Failed: ${err.message}`))'],
  ],
  'src/core/finance/services/recommendation.service.ts': [
    ['const scored = recommendations.map(re(c: any) => ({', 'const scored = recommendations.map(rec => ({'],
    ['const filtered = scored.filter(re(c: any) => rec.priorityScore >= 4.0);', 'const filtered = scored.filter(rec => rec.priorityScore >= 4.0);'],
    ['.map((r: any) => this.deepFreeze(r: any));', '.map(r => this.deepFreeze(r));'],
  ],
  'src/core/finance/services/reporting-engine.service.ts': [
    ["return '[' + obj.map((item: any) => this.stableSerialize(item: any)).join(',') + ']';", "return '[' + obj.map((item: any) => this.stableSerialize(item)).join(',') + ']';"],
    ['sections.assets.push(item: any);', 'sections.assets.push(item);'],
    ['sections.liabilities.push(item: any);', 'sections.liabilities.push(item);'],
    ['sections.equity.push(item: any);', 'sections.equity.push(item);'],
  ],
  'src/core/finance/workers/ledger-worker.constants.ts': [
    ['export const getBackoffSeconds = (retryCount: number): numbe(r: any) => {', 'export const getBackoffSeconds = (retryCount: number): number => {'],
  ],
};

// Now apply remaining service files we need to check individually
const remainingServiceFixes = {
  'src/core/finance/services/audit-certification.service.ts': [],
  'src/core/finance/services/cashflow.service.ts': [],
  'src/core/finance/services/financial-dashboard.service.ts': [],
  'src/core/finance/services/forecast.service.ts': [],
  'src/core/finance/services/insight.service.ts': [],
};

const baseDir = __dirname;
let fixedCount = 0;

for (const [relPath, replacements] of Object.entries(fileFixes)) {
  const filePath = path.join(baseDir, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP (not found): ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [old, replacement] of replacements) {
    if (content.includes(old)) {
      content = content.split(old).join(replacement);
      changed = true;
      console.log(`  FIX: ${relPath}\n    "${old}" → "${replacement}"`);
    } else {
      console.warn(`  WARN (not found): "${old}" in ${relPath}`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
  }
}

// Generic pass: fix any remaining `foo(bar: any)` inside function CALLS (not definitions)
// This handles: .push(x: any), .test(x: any), mapToDomain(x: any) etc.
// We need to be careful NOT to replace parameter definitions like `(item: any) =>`
// Pattern: identifier followed by (varname: any) that is NOT followed by =>
//   i.e., `someMethod(varname: any)` → `someMethod(varname)` 
//   but NOT `(varname: any) =>` (arrow fn param)

const allTsFiles = [];
function collectTs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
      collectTs(full);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      allTsFiles.push(full);
    }
  }
}
collectTs(financeDir);

// Regex: matches (identifier: any) NOT followed by => or , (which would indicate a param list)
// We use a simple approach: match `.someMethod(word: any)` patterns
const callArgCorruption = /(\w+)\((\w+): any\)(?!\s*=>)(?!\s*,)/g;

let genericFixed = 0;
for (const filePath of allTsFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  // Fix call-argument corruption: someFunc(word: any) → someFunc(word)
  content = content.replace(callArgCorruption, (match, fn, arg) => {
    // Don't fix things like `(arg: any) =>` arrow definitions - those are fine
    return `${fn}(${arg})`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    genericFixed++;
    console.log(`  GENERIC FIX: ${path.relative(baseDir, filePath)}`);
  }
}

console.log(`\nDone. Explicit fixes: ${fixedCount} files. Generic fixes: ${genericFixed} files.`);
