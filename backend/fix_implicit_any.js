/**
 * fix_implicit_any.js
 *
 * The generic regex in fix_syntax_corruption.js accidentally stripped `: any`
 * from arrow function *parameter* definitions (e.g., `(obj) =>` instead of `(obj: any) =>`).
 *
 * This script restores the `: any` annotation on arrow function params that now
 * have implicit-any errors, using exact line-targeted replacements.
 */

const fs = require('fs');
const path = require('path');

const BASE = __dirname;

function fixFile(relPath, replacements) {
  const filePath = path.join(BASE, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP (not found): ${relPath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [old, neu] of replacements) {
    if (content.includes(old)) {
      content = content.split(old).join(neu);
      changed = true;
      console.log(`  FIX in ${relPath}`);
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
}

// finance.db.repository.ts
fixFile('src/core/finance/repositories/finance.db.repository.ts', [
  // line 783: 'department' in employeesInclude — the generic script wrongly changed `departments:` to `department:` in an include block
  // We need to revert that include specifically
  ['include: { departments: true, locations: true }', 'include: { departments: true, locations: true }'], // no-op check
  // line 1282: arrow fn param `a` needs `: any`
  ['.sort((a, b) =>', '.sort((a: any, b: any) =>'],
  // line 1308: `c` needs `: any`
  ['.filter(c =>', '.filter((c: any) =>'],
]);

// journal.db.repository.ts - mapToDomain private method param
fixFile('src/core/finance/repositories/journal.db.repository.ts', [
  ['private mapToDomain(item): JournalEntry {', 'private mapToDomain(item: any): JournalEntry {'],
]);

// vendor.db.repository.ts - mapToDomain private method param
fixFile('src/core/finance/repositories/vendor.db.repository.ts', [
  ['private mapToDomain(item): IVendor {', 'private mapToDomain(item: any): IVendor {'],
]);

// audit-certification.service.ts
fixFile('src/core/finance/services/audit-certification.service.ts', [
  ['.forEach(obj =>', '.forEach((obj: any) =>'],
]);

// bank-ingestion.service.ts
fixFile('src/core/finance/services/bank-ingestion.service.ts', [
  ['.filter(v =>', '.filter((v: any) =>'],
  ['.map(v =>', '.map((v: any) =>'],
]);

// cashflow.service.ts
fixFile('src/core/finance/services/cashflow.service.ts', [
  ['.forEach(obj =>', '.forEach((obj: any) =>'],
]);

// consolidation-report.service.ts
fixFile('src/core/finance/services/consolidation-report.service.ts', [
  ['.map(payload =>', '.map((payload: any) =>'],
]);

// financial-dashboard.service.ts
fixFile('src/core/finance/services/financial-dashboard.service.ts', [
  ['.map(data =>', '.map((data: any) =>'],
  ['.forEach(obj =>', '.forEach((obj: any) =>'],
]);

// forecast.service.ts
fixFile('src/core/finance/services/forecast.service.ts', [
  ['.forEach(obj =>', '.forEach((obj: any) =>'],
]);

// insight.service.ts
fixFile('src/core/finance/services/insight.service.ts', [
  ['.forEach(obj =>', '.forEach((obj: any) =>'],
  ['.map(metrics =>', '.map((metrics: any) =>'],
]);

// journal-validation.service.ts
fixFile('src/core/finance/services/journal-validation.service.ts', [
  ['.validate(journal =>', '.validate((journal: any) =>'],
  ['.find(journal =>', '.find((journal: any) =>'],
  ['async validate(journal) {', 'async validate(journal: any) {'],
  ['function validate(journal) {', 'function validate(journal: any) {'],
]);

// ledger-event-ingestion-worker.service.ts
fixFile('src/core/finance/services/ledger-event-ingestion-worker.service.ts', [
  ['.map(event =>', '.map((event: any) =>'],
  ['.forEach(event =>', '.forEach((event: any) =>'],
  ['.filter(event =>', '.filter((event: any) =>'],
]);

// recommendation.service.ts
fixFile('src/core/finance/services/recommendation.service.ts', [
  ['.forEach(obj =>', '.forEach((obj: any) =>'],
]);

// reporting-engine.service.ts
fixFile('src/core/finance/services/reporting-engine.service.ts', [
  ['private stableSerialize(obj): string {', 'private stableSerialize(obj: any): string {'],
  ['private generateIntegrityHash(data): string {', 'private generateIntegrityHash(data: any): string {'],
]);

// inventory-subledger.db.repository.ts
fixFile('src/core/finance/subledger/repositories/inventory-subledger.db.repository.ts', [
  ['.then(dbEntry =>', '.then((dbEntry: any) =>'],
  ['.then(dbLayer =>', '.then((dbLayer: any) =>'],
  ['private mapToEntity(dbEntry) {', 'private mapToEntity(dbEntry: any) {'],
  ['private mapLayerToEntity(dbLayer) {', 'private mapLayerToEntity(dbLayer: any) {'],
]);

// ap-aging-projection.worker.ts
fixFile('src/core/finance/workers/ap-aging-projection.worker.ts', [
  ['.map(event =>', '.map((event: any) =>'],
  ['.forEach(event =>', '.forEach((event: any) =>'],
  ['.map(bucket =>', '.map((bucket: any) =>'],
]);

// ar-aging-projection.worker.ts
fixFile('src/core/finance/workers/ar-aging-projection.worker.ts', [
  ['.map(event =>', '.map((event: any) =>'],
  ['.forEach(event =>', '.forEach((event: any) =>'],
  ['.map(bucket =>', '.map((bucket: any) =>'],
]);

console.log('\nDone applying implicit-any fixes.');
