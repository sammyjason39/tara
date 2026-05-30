const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

const DIRECTORY = 'c:\\Users\\user\\Downloads\\Bambu Silver\\Seminyak';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log('Loading active item masters...');
  const items = await prisma.item_masters.findMany({
    where: { tenant_id: 'tnt-3rlhko' },
    select: { sku: true, barcode: true, name: true }
  });

  const validBarcodes = new Set();
  const validSKUs = new Set();
  const itemMap = new Map();

  items.forEach(item => {
    if (item.barcode) {
      const b = item.barcode.toLowerCase().trim();
      validBarcodes.add(b);
      itemMap.set(b, item);
    }
    if (item.sku) {
      const s = item.sku.toLowerCase().trim();
      validSKUs.add(s);
      itemMap.set(s, item);
    }
  });
  console.log(`Loaded ${items.length} items from database.`);

  // Load all lookups from logs
  const allLookupsPath = path.join(__dirname, 'all_lookups.txt');
  if (!fs.existsSync(allLookupsPath)) {
    console.error('ERROR: all_lookups.txt not found.');
    await prisma.$disconnect();
    return;
  }
  const rawLookups = JSON.parse(fs.readFileSync(allLookupsPath, 'utf8'));
  
  // Parse lookups list into clean structures
  const lookups = [];
  rawLookups.forEach(l => {
    let urlStr = '';
    if (l.text.includes('OriginalURL: ')) {
      const parts = l.text.split('OriginalURL: ');
      urlStr = parts[1].split(',')[0].trim();
    } else if (l.text.includes('GET ')) {
      const parts = l.text.split('GET ');
      urlStr = parts[1].split('|')[0].trim();
    } else if (l.text.includes('URL: ')) {
      const parts = l.text.split('URL: ');
      urlStr = parts[1].split(',')[0].trim();
    }

    if (urlStr) {
      try {
        const parsedUrl = new URL('http://localhost' + urlStr);
        const rawBarcode = parsedUrl.searchParams.get('barcode');
        if (rawBarcode) {
          const trimmed = rawBarcode.trim();
          lookups.push({
            lineNum: l.lineNum,
            rawBarcode: trimmed,
            cleanBarcode: trimmed.replace(/,$/, '').trim(),
            text: l.text
          });
        }
      } catch (e) {
        // Fallback to regex if URL parsing fails
        const match = l.text.match(/barcode=([^&\s\|]+)/i);
        if (match) {
          const trimmed = decodeURIComponent(match[1]).trim();
          lookups.push({
            lineNum: l.lineNum,
            rawBarcode: trimmed,
            cleanBarcode: trimmed.replace(/,$/, '').trim(),
            text: l.text
          });
        }
      }
    }
  });
  console.log(`Parsed ${lookups.length} clean lookups from logs.`);

  // Load and de-duplicate CSV files
  const files = fs.readdirSync(DIRECTORY)
    .filter(f => f.toLowerCase().endsWith('.csv') && f !== 'recovered_seminyak_opname.csv')
    .map(f => ({
      name: f,
      path: path.join(DIRECTORY, f),
      time: fs.statSync(path.join(DIRECTORY, f)).mtimeMs,
      content: fs.readFileSync(path.join(DIRECTORY, f), 'utf8')
    }));

  // Sort files by timestamp
  files.sort((a, b) => {
    const timeA = a.name.match(/\d+/) ? parseInt(a.name.match(/\d+/)[0]) : a.time;
    const timeB = b.name.match(/\d+/) ? parseInt(b.name.match(/\d+/)[0]) : b.time;
    return timeA - timeB;
  });

  const uniqueFiles = [];
  for (const file of files) {
    const cleanedContent = file.content.trim().replace(/\r\n/g, '\n');
    const existing = uniqueFiles.find(u => u.cleaned === cleanedContent);
    if (!existing) {
      uniqueFiles.push({
        name: file.name,
        cleaned: cleanedContent,
        raw: file.content
      });
    }
  }
  console.log(`De-duplicated to ${uniqueFiles.length} unique files.`);

  // Map each undefined row
  console.log('\n============================================================');
  console.log('RECONCILING UNDEFINED SCANS BY SEQUENCE MATCHING');
  console.log('============================================================');

  const resolvedUndefinedRows = [];

  uniqueFiles.forEach(file => {
    const lines = file.cleaned.split('\n');
    if (lines.length <= 1) return;

    const parsedLines = lines.map((line, idx) => {
      const cols = parseCSVLine(line);
      return {
        lineNum: idx + 1,
        sku: cols[0] || '',
        name: cols[1] || '',
        expected: parseInt(cols[2]) || 0,
        actual: parseInt(cols[3]) || 0
      };
    }).filter((l, idx) => idx > 0); // Skip header

    parsedLines.forEach((row, idx) => {
      if (row.sku === 'undefined' || !row.sku || row.name === 'undefined') {
        // Neighbors adjacent to this row in the CSV
        const neighborAfter = idx > 0 ? parsedLines[idx - 1] : null;
        const neighborBefore = idx < parsedLines.length - 1 ? parsedLines[idx + 1] : null;
        
        console.log(`\nMatching Undefined SKU in ${file.name} (Row ${idx + 2}):`);
        console.log(`  - Neighbor Scanned Before (older, below in CSV): ${neighborBefore ? neighborBefore.sku : 'None'} ("${neighborBefore ? neighborBefore.name : ''}")`);
        console.log(`  - Neighbor Scanned After (newer, above in CSV): ${neighborAfter ? neighborAfter.sku : 'None'} ("${neighborAfter ? neighborAfter.name : ''}")`);
        console.log(`  - Actual Count: ${row.actual}`);

        let bestCandidate = null;
        let bestScore = -1;

        // Search lookups list
        for (let lIdx = 0; lIdx < lookups.length; lIdx++) {
          const l = lookups[lIdx];
          
          // Is unregistered?
          const isUnregistered = l.rawBarcode.includes(',') || (!validBarcodes.has(l.cleanBarcode.toLowerCase()) && !validSKUs.has(l.cleanBarcode.toLowerCase()));
          
          if (!isUnregistered) continue;

          let score = 0;
          let matchedBefore = false;
          let matchedAfter = false;

          const windowSize = 40; // look in a wider window
          const start = Math.max(0, lIdx - windowSize);
          const end = Math.min(lookups.length - 1, lIdx + windowSize);

          for (let wIdx = start; wIdx <= end; wIdx++) {
            const wl = lookups[wIdx];
            const dist = Math.abs(wIdx - lIdx);
            const weight = (windowSize - dist) / windowSize;

            if (neighborBefore && wl.cleanBarcode.toLowerCase() === neighborBefore.sku.toLowerCase()) {
              if (wIdx < lIdx) { // scanned before (appears earlier in log)
                score += 15 * weight;
                matchedBefore = true;
              } else {
                score += 2 * weight;
              }
            }

            if (neighborAfter && wl.cleanBarcode.toLowerCase() === neighborAfter.sku.toLowerCase()) {
              if (wIdx > lIdx) { // scanned after (appears later in log)
                score += 15 * weight;
                matchedAfter = true;
              } else {
                score += 2 * weight;
              }
            }
          }

          if (neighborBefore && neighborAfter && matchedBefore && matchedAfter) {
            score += 30; // strong match bonus
          }

          // Also check if neighbor before/after is adjacent in the log
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = l;
          }
        }

        if (bestCandidate && bestScore > 0) {
          const resolvedBarcode = bestCandidate.cleanBarcode;
          const dbItem = itemMap.get(resolvedBarcode.toLowerCase());
          
          console.log(`  🌟 MATCH FOUND (Score: ${bestScore.toFixed(1)})!`);
          console.log(`  - Raw Scanned Barcode in Log: "${bestCandidate.rawBarcode}" (Line ${bestCandidate.lineNum})`);
          console.log(`  - Resolved Barcode: "${resolvedBarcode}"`);
          if (dbItem) {
            console.log(`  - DB Item SKU: "${dbItem.sku}"`);
            console.log(`  - DB Item Name: "${dbItem.name}"`);
            resolvedUndefinedRows.push({
              file: file.name,
              csvLine: idx + 2,
              actual: row.actual,
              rawBarcode: bestCandidate.rawBarcode,
              resolvedSku: dbItem.sku,
              resolvedName: dbItem.name
            });
          } else {
            console.log(`  - DB Item: NOT FOUND IN DATABASE ENRICHED LIST`);
            resolvedUndefinedRows.push({
              file: file.name,
              csvLine: idx + 2,
              actual: row.actual,
              rawBarcode: bestCandidate.rawBarcode,
              resolvedSku: resolvedBarcode,
              resolvedName: `[Resolved Unregistered] Barcode: ${resolvedBarcode}`
            });
          }
        } else {
          console.log(`  ❌ NO MATCH FOUND IN LOG SEQUENCE`);
        }
      }
    });
  });

  console.log('\n============================================================');
  console.log('RECONCILIATION COMPLETE SUMMARY');
  console.log('============================================================');
  console.log(`Total undefined scans matched: ${resolvedUndefinedRows.length}`);
  resolvedUndefinedRows.forEach(r => {
    console.log(`  - File: ${r.file} (Line ${r.csvLine}): count=${r.actual} -> "${r.resolvedSku}" (${r.resolvedName})`);
  });

  // Save mapping to JSON
  const mappingPath = path.join(__dirname, 'undefined_resolved_mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(resolvedUndefinedRows, null, 2), 'utf8');
  console.log(`\nMapping saved to ${mappingPath}`);

  await prisma.$disconnect();
}

main();
