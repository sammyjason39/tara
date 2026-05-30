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

async function main() {
  console.log('Generating fully recovered stock opname CSV from proxy logs...');

  // 1. Get tenant details
  const email = 'bambusilverkedonganan@gmail.com';
  const user = await prisma.users.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });

  if (!user) {
    console.error(`ERROR: User ${email} not found.`);
    await prisma.$disconnect();
    return;
  }

  const tenantId = user.tenant_id;
  console.log(`Tenant: ${tenantId}`);

  // 2. Read logs file
  const logsPath = path.join(__dirname, 'vps_frontend_logs.txt');
  if (!fs.existsSync(logsPath)) {
    console.error(`ERROR: Log file not found at ${logsPath}`);
    await prisma.$disconnect();
    return;
  }

  let content = fs.readFileSync(logsPath, 'utf8');
  if (content.includes('\u0000')) {
    content = fs.readFileSync(logsPath, 'utf16le');
  }
  const lines = content.split(/\r?\n/);

  const scanCounts = {};
  const fullLogRegex = /^([^\s]+)\s+-\s+-\s+\[([^\]]+)\]\s+"GET\s+\/api\/v1\/inventory\/items\/lookup\?barcode=([^&\s"]+)/;

  for (const line of lines) {
    const match = line.match(fullLogRegex);
    if (match) {
      const timestamp = match[2];
      const rawBarcode = match[3];
      const datePart = timestamp.split(':')[0];
      
      if (datePart === '18/May/2026') {
        let barcode = decodeURIComponent(rawBarcode).trim();
        scanCounts[barcode] = (scanCounts[barcode] || 0) + 1;
      }
    }
  }

  console.log(`Unique scanned barcodes found: ${Object.keys(scanCounts).length}`);

  // 3. Fetch production item masters
  console.log('Fetching live product catalog...');
  const dbItems = await prisma.item_masters.findMany({
    where: { tenant_id: tenantId },
    select: { sku: true, barcode: true, name: true }
  });
  console.log(`Fetched ${dbItems.length} live products.`);

  // Build lookups
  const skuLookup = new Map();
  const barcodeLookup = new Map();
  for (const item of dbItems) {
    if (item.sku) skuLookup.set(item.sku.toLowerCase(), item);
    if (item.barcode) barcodeLookup.set(item.barcode.toLowerCase(), item);
  }

  // 4. Build CSV Rows
  const csvRows = [];
  csvRows.push('SKU,Item Name,Expected,Actual,Variance');

  let registeredCount = 0;
  let unregisteredCount = 0;

  // We sort unique barcodes to ensure a deterministic output order
  const sortedBarcodes = Object.keys(scanCounts).sort();

  for (const barcode of sortedBarcodes) {
    const count = scanCounts[barcode];
    const searchKey = barcode.toLowerCase();
    const item = barcodeLookup.get(searchKey) || skuLookup.get(searchKey);

    if (item) {
      // Escape name to handle commas safely in CSV
      const escapedName = `"${item.name.replace(/"/g, '""')}"`;
      csvRows.push(`${item.sku},${escapedName},0,${count},${count}`);
      registeredCount++;
    } else {
      // Unregistered: Recover the raw barcode as SKU
      const escapedName = `"[Unregistered] Barcode: ${barcode.replace(/"/g, '""')}"`;
      csvRows.push(`${barcode},${escapedName},0,${count},${count}`);
      unregisteredCount++;
    }
  }

  const csvContent = csvRows.join('\n');

  // 5. Write to targets
  const targetDir1 = 'C:\\Users\\user\\Downloads\\Bambu Silver';
  const targetDir2 = 'C:\\Users\\user\\Downloads\\Bambu Silver\\Seminyak';

  const file1 = path.join(targetDir1, 'recovered_seminyak_opname.csv');
  const file2 = path.join(targetDir2, 'recovered_seminyak_opname.csv');

  if (!fs.existsSync(targetDir1)) {
    fs.mkdirSync(targetDir1, { recursive: true });
  }
  if (!fs.existsSync(targetDir2)) {
    fs.mkdirSync(targetDir2, { recursive: true });
  }

  fs.writeFileSync(file1, csvContent, 'utf8');
  fs.writeFileSync(file2, csvContent, 'utf8');

  console.log('\n============================================================');
  console.log('✅ RECOVERY SUCCESSFUL ✅');
  console.log('============================================================');
  console.log(`Saved: ${file1}`);
  console.log(`Saved: ${file2}`);
  console.log(`Total Scans Restored: ${Object.values(scanCounts).reduce((a, b) => a + b, 0)}`);
  console.log(`Registered Products Restored: ${registeredCount}`);
  console.log(`Unregistered Barcodes Rescued: ${unregisteredCount}`);
  console.log('============================================================\n');

  await prisma.$disconnect();
}

main();
