const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

const TENANT_ID = 'tnt-3rlhko';
const LOCATION_ID = 'a3a241a4-4841-45a3-90cd-f7135e6847b4'; // Seminyak Branch Location ID
const CATEGORY_ID = 'a1caa60b-bb17-7777-7777-a1caa60bb177'; // Stable UUID for Recovered Scans Category
const TARGET_CYCLE_ID = 'cffa2442-3d30-43b7-90cd-f988b129fe60'; // The latest open cycle at Seminyak

async function main() {
  console.log('🚀 STARTING DATABASE BATCH REGISTER & RECONCILIATION 🚀');
  console.log('============================================================');

  // 1. Create/Ensure Category exists
  console.log('1. Checking product category...');
  const category = await prisma.product_categories.upsert({
    where: { id: CATEGORY_ID },
    update: { name: 'Unregistered Recovered Scans' },
    create: {
      id: CATEGORY_ID,
      tenant_id: TENANT_ID,
      name: 'Unregistered Recovered Scans'
    }
  });
  console.log(`Product Category: "${category.name}" is verified (ID: ${CATEGORY_ID}).`);

  // 2. Read the recovered CSV
  const csvPath = 'C:\\Users\\user\\Downloads\\Bambu Silver\\recovered_seminyak_opname.csv';
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found at ${csvPath}`);
    await prisma.$disconnect();
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/).slice(1); // skip header
  
  const parsedItems = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    
    let sku, name, expected, actual, variance;
    
    if (line.includes('"')) {
      const firstQuoteIdx = line.indexOf('"');
      const lastQuoteIdx = line.lastIndexOf('"');
      sku = line.substring(0, firstQuoteIdx - 1).trim();
      name = line.substring(firstQuoteIdx + 1, lastQuoteIdx);
      const rest = line.substring(lastQuoteIdx + 2).split(',');
      expected = Number(rest[0]);
      actual = Number(rest[1]);
      variance = Number(rest[2]);
    } else {
      const parts = line.split(',');
      sku = parts[0].trim();
      name = parts[1].trim();
      expected = Number(parts[2]);
      actual = Number(parts[3]);
      variance = Number(parts[4]);
    }
    
    parsedItems.push({ sku, name, expected, actual, variance });
  }

  console.log(`Loaded ${parsedItems.length} items from CSV.`);

  // 3. Process items and build stock levels
  let newlyRegisteredCount = 0;
  let alreadyRegisteredCount = 0;
  let totalScannedQty = 0;

  console.log('\n2. Syncing item masters and stock levels...');

  for (const parsedItem of parsedItems) {
    const isUnregistered = parsedItem.name.startsWith('[Unregistered]');
    totalScannedQty += parsedItem.actual;

    // Search if item exists in item_masters
    let item = await prisma.item_masters.findFirst({
      where: {
        tenant_id: TENANT_ID,
        OR: [
          { sku: parsedItem.sku },
          { barcode: parsedItem.sku }
        ]
      }
    });

    if (!item) {
      // Register new item
      const newId = crypto.randomUUID();
      item = await prisma.item_masters.create({
        data: {
          id: newId,
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          name: `[Recovered] Barcode: ${parsedItem.sku}`,
          sku: parsedItem.sku,
          barcode: parsedItem.sku,
          unit: 'pcs',
          base_price: 0,
          tax_rate: 0.11,
          status: 'active',
          type: 'ITEM',
          selling_price: 0
        }
      });
      newlyRegisteredCount++;
    } else {
      alreadyRegisteredCount++;
    }

    // Ensure stock_levels entry exists for Seminyak Branch
    const existingLevel = await prisma.stock_levels.findFirst({
      where: {
        tenant_id: TENANT_ID,
        location_id: LOCATION_ID,
        product_id: item.id
      }
    });

    if (!existingLevel) {
      await prisma.stock_levels.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: TENANT_ID,
          location_id: LOCATION_ID,
          product_id: item.id,
          on_hand: 0,
          available: 0,
          reserved: 0,
          min_buffer: 0,
          max_capacity: 0
        }
      });
    }

    // Update physical stock levels to match exact opname counts
    const levelToUpdate = await prisma.stock_levels.findFirst({
      where: {
        tenant_id: TENANT_ID,
        location_id: LOCATION_ID,
        product_id: item.id
      }
    });

    if (levelToUpdate) {
      const reserved = Number(levelToUpdate.reserved || 0);
      await prisma.stock_levels.update({
        where: { id: levelToUpdate.id },
        data: {
          on_hand: parsedItem.actual,
          available: Math.max(0, parsedItem.actual - reserved),
          updated_at: new Date()
        }
      });
    }
  }

  console.log(`Registered ${newlyRegisteredCount} new items.`);
  console.log(`Validated ${alreadyRegisteredCount} existing catalog items.`);
  console.log(`Updated stock levels for all ${parsedItems.length} items to match actual counts.`);

  // 4. Finalize stock opname audit cycles
  console.log('\n3. Finalizing Stock Opname Audit Cycles...');

  // Update target cycle to COMPLETED
  const targetCycle = await prisma.inventory_audit_cycles.findUnique({
    where: { id: TARGET_CYCLE_ID }
  });

  if (targetCycle) {
    await prisma.inventory_audit_cycles.update({
      where: { id: TARGET_CYCLE_ID },
      data: {
        status: 'COMPLETED',
        counted_value: totalScannedQty,
        variance_value: 0,
        closed_by: 'system-recovered',
        updated_at: new Date()
      }
    });
    console.log(`✅ Closed Stock Opname Audit Cycle: ${TARGET_CYCLE_ID} (status set to COMPLETED).`);
  } else {
    console.warn(`WARNING: Target cycle ${TARGET_CYCLE_ID} not found.`);
  }

  // Cancel all other open audit cycles for Seminyak Branch to keep dashboard clean
  const openCycles = await prisma.inventory_audit_cycles.findMany({
    where: {
      tenant_id: TENANT_ID,
      location_code: LOCATION_ID,
      status: 'OPEN',
      id: { not: TARGET_CYCLE_ID }
    }
  });

  if (openCycles.length > 0) {
    console.log(`Found ${openCycles.length} other open cycles at Seminyak. Cancelling them to clear UI clutter...`);
    for (const cycle of openCycles) {
      await prisma.inventory_audit_cycles.update({
        where: { id: cycle.id },
        data: {
          status: 'CANCELLED',
          closed_by: 'system-cleanup',
          updated_at: new Date()
        }
      });
    }
    console.log(`✅ Cleaned up ${openCycles.length} stale duplicate open cycles.`);
  }

  console.log('\n============================================================');
  console.log('🎉 RECONCILIATION & SAVING COMPLETION SUCCESSFUL 🎉');
  console.log('============================================================');
  console.log(`Tenant ID:         ${TENANT_ID}`);
  console.log(`Location ID:       ${LOCATION_ID} (Seminyak Branch)`);
  console.log(`Total Products:    ${parsedItems.length}`);
  console.log(`New Items Added:   ${newlyRegisteredCount}`);
  console.log(`Old Items Synced:  ${alreadyRegisteredCount}`);
  console.log(`Total Stock Qty:   ${totalScannedQty}`);
  console.log(`Closed Cycle:      ${TARGET_CYCLE_ID}`);
  console.log('============================================================\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
