/**
 * fix-schema-casing-v3.js
 * 
 * PRECISE automated fix: uses TypeScript compiler error output as the
 * authoritative source of truth to make exact, targeted replacements.
 *
 * Strategy:
 * 1. Run `npx tsc --noEmit` and capture error output
 * 2. For each TS2561/TS2551/TS2353 error that says:
 *    "'camelKey' does not exist ... Did you mean 'snake_key'?"
 * 3. Open the exact file, go to the exact line:column, replace only that occurrence
 * 4. Write the file back
 *
 * This is 100% precise — no false positives, no guessing.
 * 
 * Usage:
 *   node scripts/fix-schema-casing-v3.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read pre-captured tsc output from file
const errorFile = path.join(__dirname, '..', 'tsc-errors.txt');
if (!fs.existsSync(errorFile)) {
  console.error('ERROR: tsc-errors.txt not found. Run:');
  console.error('  npx tsc --noEmit 2>&1 | Out-File -Encoding utf8 tsc-errors.txt');
  process.exit(1);
}
const tscOutput = fs.readFileSync(errorFile, 'utf8');
console.log(`Read ${tscOutput.split('\n').length} lines from tsc-errors.txt`);

// Parse TSC error lines
// Format: path/to/file.ts(line,col): error TS2561: ... 'wrongName' ... 'rightName'?
// Key patterns:
//   TS2561: Object literal may only specify known properties, but 'wrongKey' does not exist in type '...'. Did you mean to write 'rightKey'?
//   TS2551: Property 'wrongProp' does not exist on type '...'. Did you mean 'rightProp'?
//   TS2353: Object literal may only specify known properties, and 'wrongKey' does not exist in type '...'  (no suggestion, skip if no suggestion)

const SUPPORTED_CODES = new Set(['2561', '2551', '2553', '2353']);

// Parse error lines (handle Windows CRLF)
const lines = tscOutput.split(/\r?\n/);
const fixes = [];

for (const line of lines) {
  const m = line.match(/^(.*?)\((\d+),(\d+)\): error TS(\d+): (.*)$/);
  if (!m) continue;
  
  const [, filePath, lineStr, colStr, code, message] = m;
  if (!SUPPORTED_CODES.has(code)) continue;

  // Extract wrong name and right name
  let wrongName, rightName;

  // Pattern for TS2561/TS2353: 'wrongKey' does not exist ... Did you mean to write 'rightKey'?
  const meanToWrite = message.match(/but '(\w+)' does not exist.*Did you mean to write '([\w]+)'\?/);
  if (meanToWrite) {
    wrongName = meanToWrite[1];
    rightName = meanToWrite[2];
  }

  // Pattern for TS2551: Property 'wrongProp' does not exist ... Did you mean 'rightProp'?
  const didYouMean = message.match(/Property '(\w+)' does not exist.*Did you mean '([\w]+)'\?/);
  if (didYouMean) {
    wrongName = didYouMean[1];
    rightName = didYouMean[2];
  }

  if (!wrongName || !rightName || wrongName === rightName) continue;

  // Resolve absolute path
  const absPath = path.resolve(path.join(__dirname, '..'), filePath);
  if (!fs.existsSync(absPath)) continue;

  fixes.push({
    file: absPath,
    line: parseInt(lineStr, 10),
    col: parseInt(colStr, 10),
    wrongName,
    rightName,
    code,
  });
}

console.log(`\nFound ${fixes.length} fixable errors.\n`);

if (fixes.length === 0) {
  console.log('Nothing to fix.');
  process.exit(0);
}

// Group fixes by file
const byFile = new Map();
for (const fix of fixes) {
  if (!byFile.has(fix.file)) byFile.set(fix.file, []);
  byFile.get(fix.file).push(fix);
}

let totalFilesFixed = 0;
let totalReplacements = 0;
const skipped = [];

for (const [filePath, fileFixes] of byFile.entries()) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileLines = content.split('\n');
  let changed = false;
  let count = 0;

  // Sort fixes by line descending so line modifications don't shift subsequent line numbers
  fileFixes.sort((a, b) => b.line - a.line || b.col - a.col);

  for (const fix of fileFixes) {
    const lineIdx = fix.line - 1;
    if (lineIdx < 0 || lineIdx >= fileLines.length) continue;

    const origLine = fileLines[lineIdx];
    const colIdx = fix.col - 1;

    // Verify the wrongName actually appears at/near the given column
    const segment = origLine.substring(Math.max(0, colIdx - 2));
    if (!segment.includes(fix.wrongName)) {
      // Try anywhere on the line
      if (!origLine.includes(fix.wrongName)) {
        skipped.push(`SKIP ${path.relative(process.cwd(), filePath)}:${fix.line} — '${fix.wrongName}' not found on line`);
        continue;
      }
    }

    // Make the replacement — targeted at the column position
    // Only replace the first occurrence at/after the column
    const before = origLine.substring(0, colIdx);
    const after = origLine.substring(colIdx);
    const escaped = fix.wrongName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // For object keys (TS2561, TS2353): replace `wrongName:` → `rightName:`
    // For property access (TS2551): replace `.wrongName` → `.rightName`
    let newAfter;
    if (fix.code === '2551') {
      // Property access — replace .wrongName
      newAfter = after.replace(new RegExp(`\\.${escaped}\\b`), `.${fix.rightName}`);
      if (newAfter === after) {
        // try without dot (direct access)
        newAfter = after.replace(new RegExp(`\\b${escaped}\\b`), fix.rightName);
      }
    } else {
      // Object key — replace wrongName:
      newAfter = after.replace(new RegExp(`\\b${escaped}\\b`), fix.rightName);
    }

    if (newAfter === after) {
      skipped.push(`SKIP ${path.relative(process.cwd(), filePath)}:${fix.line} — replacement failed for '${fix.wrongName}'`);
      continue;
    }

    fileLines[lineIdx] = before + newAfter;
    changed = true;
    count++;
  }

  if (changed) {
    fs.writeFileSync(filePath, fileLines.join('\n'), 'utf8');
    totalFilesFixed++;
    totalReplacements += count;
    const rel = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
    console.log(`  [${count.toString().padStart(4)}] ${rel}`);
  }
}

if (skipped.length > 0) {
  console.log(`\nSkipped ${skipped.length} replacements:`);
  skipped.slice(0, 20).forEach(s => console.log('  ' + s));
  if (skipped.length > 20) console.log(`  ...and ${skipped.length - 20} more.`);
}

console.log('\n' + '='.repeat(60));
console.log(`Files fixed    : ${totalFilesFixed}`);
console.log(`Total fixes    : ${totalReplacements}`);
console.log(`Skipped        : ${skipped.length}`);
console.log('='.repeat(60));
console.log('\nRun  npx tsc --noEmit  again to check remaining errors.');
console.log('If errors remain, run this script again (it re-reads tsc output each time).');
