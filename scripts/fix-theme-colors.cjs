/**
 * THEME COLOR FIX SCRIPT
 * 
 * This script automatically fixes hardcoded colors in component files
 * by replacing them with theme-aware alternatives.
 * 
 * Usage:
 *   node scripts/fix-theme-colors.cjs            Fix the curated FILES_TO_PROCESS list.
 *   node scripts/fix-theme-colors.cjs --all      Recursively fix every .ts/.tsx file under src/.
 *   node scripts/fix-theme-colors.cjs --check     Report Hardcoded_Color usage without writing
 *                                                 (exit code 1 if any are found — CI-friendly).
 *   node scripts/fix-theme-colors.cjs --all --check   Report across the whole src/ tree.
 *
 * The explicit COLOR_MAPPINGS below are applied first (curated, high-confidence replacements),
 * then a generic palette-class pass driven by the shared patterns in
 * `scripts/theme-color-patterns.cjs` (which mirror `isHardcodedColor()`/`convertToThemeColor()`
 * in `src/lib/theme-colors.ts`) catches remaining mappable palette classes such as
 * `bg-emerald-100`. Raw hex/rgb/hsl literals are reported in --check mode but never auto-rewritten
 * (there is no safe automatic Theme_Token for an arbitrary literal).
 */

const fs = require('fs');
const path = require('path');
const patterns = require('./theme-color-patterns.cjs');

const SRC_DIR = path.resolve(__dirname, '..', 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
// Files excluded from scanning: the enforcement infrastructure itself and generated output.
const EXCLUDED_FILES = new Set([path.resolve(SRC_DIR, 'lib', 'theme-colors.ts')]);
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git']);

// Color replacement mappings
const COLOR_MAPPINGS = [
  // Red/rose/destructive
  { pattern: /text-red-500/g, replacement: 'text-destructive' },
  { pattern: /text-red-600/g, replacement: 'text-destructive' },
  { pattern: /bg-red-500\/10/g, replacement: 'bg-destructive/10' },
  { pattern: /bg-red-500\/20/g, replacement: 'bg-destructive/20' },
  { pattern: /bg-red-900\/20/g, replacement: 'bg-destructive/20' },
  { pattern: /border-red-500/g, replacement: 'border-destructive' },
  
  // Amber/warning
  { pattern: /text-amber-500/g, replacement: 'text-warning' },
  { pattern: /text-amber-600/g, replacement: 'text-warning' },
  { pattern: /bg-amber-500\/10/g, replacement: 'bg-warning/10' },
  { pattern: /bg-amber-500\/20/g, replacement: 'bg-warning/20' },
  { pattern: /border-amber-500/g, replacement: 'border-warning' },
  
  // Emerald/green/success
  { pattern: /text-emerald-500/g, replacement: 'text-success' },
  { pattern: /text-emerald-600/g, replacement: 'text-success' },
  { pattern: /bg-emerald-500\/10/g, replacement: 'bg-success/10' },
  { pattern: /bg-emerald-600/g, replacement: 'bg-success' },
  { pattern: /bg-emerald-900\/20/g, replacement: 'bg-success/20' },
  { pattern: /border-emerald-500/g, replacement: 'border-success' },
  { pattern: /shadow-emerald-600/g, replacement: 'shadow-success' },
  
  // Green (success)
  { pattern: /text-green-500/g, replacement: 'text-success' },
  { pattern: /text-green-600/g, replacement: 'text-success' },
  { pattern: /bg-green-500\/10/g, replacement: 'bg-success/10' },
  { pattern: /bg-green-500\/20/g, replacement: 'bg-success/20' },
  { pattern: /border-green-500/g, replacement: 'border-success' },
  
  // Blue/primary/info
  { pattern: /text-blue-400/g, replacement: 'text-primary' },
  { pattern: /text-blue-500/g, replacement: 'text-primary' },
  { pattern: /bg-blue-500\/10/g, replacement: 'bg-primary/10' },
  { pattern: /bg-blue-500\/20/g, replacement: 'bg-primary/20' },
  { pattern: /border-blue-500/g, replacement: 'border-primary' },
  
  // Purple (keep for specific cases)
  { pattern: /text-purple-500/g, replacement: 'text-purple-500' },
  { pattern: /bg-purple-500\/10/g, replacement: 'bg-purple-500/10' },
  
  // Pink (keep for specific cases)
  { pattern: /text-pink-600/g, replacement: 'text-pink-600' },
  { pattern: /bg-pink-500\/10/g, replacement: 'bg-pink-500/10' },
  
  // Indigo/primary
  { pattern: /text-indigo-400/g, replacement: 'text-primary' },
  { pattern: /text-indigo-500/g, replacement: 'text-primary' },
  { pattern: /bg-indigo-500\/10/g, replacement: 'bg-primary/10' },
  { pattern: /border-indigo-500/g, replacement: 'border-primary' },
  
  // Sky/info
  { pattern: /text-sky-400/g, replacement: 'text-info' },
  { pattern: /text-sky-600/g, replacement: 'text-info' },
  { pattern: /bg-sky-400/g, replacement: 'bg-info' },
  { pattern: /bg-sky-500\/10/g, replacement: 'bg-info/10' },
  { pattern: /bg-sky-500\/20/g, replacement: 'bg-info/20' },
  { pattern: /border-sky-500/g, replacement: 'border-info' },
  
  // Orange (keep for specific cases)
  { pattern: /text-orange-500/g, replacement: 'text-orange-500' },
  { pattern: /bg-orange-500\/10/g, replacement: 'bg-orange-500/10' },
  
  // Yellow/warning
  { pattern: /text-yellow-500/g, replacement: 'text-warning' },
  { pattern: /bg-yellow-500\/10/g, replacement: 'bg-warning/10' },
  { pattern: /border-yellow-500/g, replacement: 'border-warning' },
  
  // Cyan (keep for specific cases)
  { pattern: /text-cyan-600/g, replacement: 'text-cyan-600' },
  { pattern: /bg-cyan-500\/10/g, replacement: 'bg-cyan-500/10' },
  
  // Lime (keep for specific cases)
  { pattern: /text-lime-600/g, replacement: 'text-lime-600' },
  { pattern: /bg-lime-500\/10/g, replacement: 'bg-lime-500/10' },
  
  // Rose (destructive)
  { pattern: /text-rose-400/g, replacement: 'text-destructive' },
  { pattern: /text-rose-500/g, replacement: 'text-destructive' },
  { pattern: /bg-rose-500\/10/g, replacement: 'bg-destructive/10' },
  { pattern: /border-rose-500/g, replacement: 'border-destructive' },
  
  // Gray/zinc/neutral (keep for specific cases)
  { pattern: /text-gray-500/g, replacement: 'text-muted-foreground' },
  { pattern: /text-gray-600/g, replacement: 'text-muted-foreground' },
  { pattern: /bg-gray-500\/10/g, replacement: 'bg-muted/10' },
  
  // Muted
  { pattern: /text-muted-foreground/g, replacement: 'text-muted-foreground' },
  { pattern: /bg-muted\/10/g, replacement: 'bg-muted/10' },
  { pattern: /bg-muted\/20/g, replacement: 'bg-muted/20' },
  { pattern: /border-muted/g, replacement: 'border-muted' },
  
  // Success
  { pattern: /text-success/g, replacement: 'text-success' },
  { pattern: /bg-success\/10/g, replacement: 'bg-success/10' },
  { pattern: /bg-success\/20/g, replacement: 'bg-success/20' },
  { pattern: /border-success/g, replacement: 'border-success' },
  
  // Warning
  { pattern: /text-warning/g, replacement: 'text-warning' },
  { pattern: /bg-warning\/10/g, replacement: 'bg-warning/10' },
  { pattern: /bg-warning\/20/g, replacement: 'bg-warning/20' },
  { pattern: /border-warning/g, replacement: 'border-warning' },
  
  // Destructive
  { pattern: /text-destructive/g, replacement: 'text-destructive' },
  { pattern: /bg-destructive\/10/g, replacement: 'bg-destructive/10' },
  { pattern: /bg-destructive\/20/g, replacement: 'bg-destructive/20' },
  { pattern: /border-destructive/g, replacement: 'border-destructive' },
  
  // Info
  { pattern: /text-info/g, replacement: 'text-info' },
  { pattern: /bg-info\/10/g, replacement: 'bg-info/10' },
  { pattern: /bg-info\/20/g, replacement: 'bg-info/20' },
  { pattern: /border-info/g, replacement: 'border-info' },
  
  // Primary
  { pattern: /text-primary/g, replacement: 'text-primary' },
  { pattern: /bg-primary\/10/g, replacement: 'bg-primary/10' },
  { pattern: /bg-primary\/20/g, replacement: 'bg-primary/20' },
  { pattern: /bg-primary\/50/g, replacement: 'bg-primary/50' },
  { pattern: /border-primary/g, replacement: 'border-primary' },
  
  // Background
  { pattern: /bg-background/g, replacement: 'bg-background' },
  { pattern: /text-foreground/g, replacement: 'text-foreground' },
  { pattern: /border-border/g, replacement: 'border-border' },
];

// Files to process (relative to workspace root)
const FILES_TO_PROCESS = [
  'src/pages/retail/management/DeviceControlCenter.tsx',
  'src/pages/retail/management/DeveloperConsole.tsx',
  'src/pages/retail/operational/OperationalGateway.tsx',
  'src/pages/retail/operational/pos/Cashier.tsx',
  'src/pages/retail/operational/RefundReturnDesk.tsx',
  'src/pages/retail/management/EcommerceAnalytics.tsx',
  'src/pages/retail/operational/SelfServiceKiosk.tsx',
  'src/pages/fnb/Cashier.tsx',
  'src/pages/fnb/Inventory.tsx',
  'src/pages/industry/farming/FarmDesk.tsx',
  'src/pages/core/inventory/InventoryAdjustments.tsx',
  'src/pages/retail/management/command-center/GlobalKpiRow.tsx',
  'src/pages/retail/management/command-center/InfrastructureHealth.tsx',
];

function fixColorsInFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${fullPath}`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = 0;

  // Pass 1: curated, high-confidence explicit mappings.
  for (const mapping of COLOR_MAPPINGS) {
    const matches = content.match(mapping.pattern);
    if (matches) {
      content = content.replace(mapping.pattern, mapping.replacement);
      changes += matches.length;
    }
  }

  // Pass 2: generic palette-class mapping for anything the curated list missed
  // (e.g. `bg-emerald-100`). Only classes with a canonical Theme_Token are rewritten.
  content = content.replace(patterns.paletteClassRegex(), (cls) => {
    const mapped = patterns.mapPaletteClass(cls);
    if (mapped && mapped !== cls) {
      changes += 1;
      return mapped;
    }
    return cls;
  });

  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${changes} colors in: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed for: ${filePath}`);
  }
  return changes;
}

/** Report (without modifying) every Hardcoded_Color found in a file. Returns finding count. */
function checkFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${fullPath}`);
    return 0;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  let findings = 0;

  lines.forEach((line, index) => {
    const issues = [];

    const classMatches = line.match(patterns.paletteClassRegex());
    if (classMatches) {
      for (const cls of [...new Set(classMatches)]) {
        const mapped = patterns.mapPaletteClass(cls);
        issues.push(mapped ? `${cls} → ${mapped}` : `${cls} (no auto-mapping)`);
      }
    }
    if (patterns.hexColorRegex().test(line)) issues.push('hex literal');
    if (patterns.rgbColorRegex().test(line)) issues.push('rgb()/rgba() literal');
    if (patterns.hslColorRegex().test(line)) issues.push('hsl()/hsla() literal');

    if (issues.length > 0) {
      findings += issues.length;
      console.log(`  ${filePath}:${index + 1}  ${issues.join(', ')}`);
    }
  });

  return findings;
}

/** Recursively collect .ts/.tsx files under a directory, skipping excluded paths. */
function collectSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) out.push(...collectSourceFiles(abs));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) && !EXCLUDED_FILES.has(abs)) {
      out.push(path.relative(path.resolve(__dirname, '..'), abs).split(path.sep).join('/'));
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const scanAll = args.includes('--all');

  const files = scanAll ? collectSourceFiles(SRC_DIR) : FILES_TO_PROCESS;

  if (checkOnly) {
    console.log('🔍 Checking for Hardcoded_Color usage (no files will be modified)...\n');
    let totalFindings = 0;
    let filesWithFindings = 0;
    for (const filePath of files) {
      const findings = checkFile(filePath);
      if (findings > 0) {
        filesWithFindings++;
        totalFindings += findings;
      }
    }
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary (check mode):');
    console.log(`   Files scanned: ${files.length}`);
    console.log(`   Files with Hardcoded_Color: ${filesWithFindings}`);
    console.log(`   Total findings: ${totalFindings}`);
    console.log('='.repeat(60));
    if (totalFindings > 0) {
      console.log('\n❌ Hardcoded colors found. Run without --check to auto-fix mappable classes.');
      process.exitCode = 1;
    } else {
      console.log('\n✅ No Hardcoded_Color usage found.');
    }
    return;
  }

  console.log('🔍 Starting theme color fix script...\n');

  let totalChanges = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    const changes = fixColorsInFile(filePath);
    if (changes > 0) {
      filesChanged++;
      totalChanges += changes;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Total files checked: ${files.length}`);
  console.log(`   Files changed: ${filesChanged}`);
  console.log(`   Total replacements: ${totalChanges}`);
  console.log('='.repeat(60));
  console.log('\n✅ Theme color fix complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review the changes in each file');
  console.log('   2. Test in both light and dark modes');
  console.log('   3. Update any remaining hardcoded colors manually');
  console.log('   4. Use the new theme-aware components for future development');
}

main();
