import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper to determine the DB URL based on availability
const localUrl = "postgresql://zenvix:zenvix_secure_2026!@localhost:5432/zenvix_prod?schema=public";
const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";

// Check if we want to run on Production or Local
const useProd = process.argv.includes('--prod');
const databaseUrl = useProd ? prodUrl : localUrl;

console.log(`Connecting to database: ${useProd ? 'PRODUCTION' : 'LOCAL'}`);
console.log(`URL: ${databaseUrl}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

interface ExcelRecord {
  sku: string;
  name: string;
  category: string;
  branch: string;
  qty: number;
  capital: number;
  selling: number;
}

async function main() {
  // 1. Resolve Tenant ID
  const tenantId = useProd ? 'tnt-3rlhko' : 'bambu-tenant';
  console.log(`Resolved Tenant ID: ${tenantId}`);

  // 2. Resolve Locations and Branch Mapping
  const locations = await prisma.locations.findMany({
    where: { tenant_id: tenantId }
  });

  const activeMapping: Array<{ locationId: string, name: string, code: string, excelBranch: string }> = [];
  
  for (const loc of locations) {
    let excelBranch: string | undefined;
    if (loc.code === 'BS-01' || loc.code === 'BS-DS-LOC') excelBranch = 'DOUBLE SIX';
    else if (loc.code === 'BS-02') excelBranch = 'SAHA';
    else if (loc.code === 'BS-03') excelBranch = 'UBUD 1';
    else if (loc.code === 'BS-SS-LOC') excelBranch = 'SS';
    else if (loc.code === 'BS-ANC-LOC') excelBranch = 'LOVE ANCHOR';
    
    if (excelBranch) {
      activeMapping.push({
        locationId: loc.id,
        name: loc.name,
        code: loc.code,
        excelBranch
      });
      console.log(`Mapped Location: "${loc.name}" (Code: ${loc.code}) -> Excel Branch: "${excelBranch}"`);
    }
  }

  // 3. Load Excel Catalog
  const excelCatalogPath = 'C:\\Users\\user\\Downloads\\Bambu Silver\\excel_catalog.json';
  if (!fs.existsSync(excelCatalogPath)) {
    throw new Error(`Excel catalog JSON not found at ${excelCatalogPath}. Please run excel_to_json.py first.`);
  }
  const excelData: ExcelRecord[] = JSON.parse(fs.readFileSync(excelCatalogPath, 'utf8'));
  console.log(`Loaded ${excelData.length} records from Excel catalog.`);

  // 4. Load CSV Stock Opname Scans
  const csvPath = 'C:\\Users\\user\\Downloads\\Bambu Silver\\recovered_seminyak_opname.csv';
  const csvCounts: Record<string, number> = {};
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^"([^"]*)","([^"]*)",(\d+)/);
      if (match) {
        const sku = match[1].trim();
        const actual = Number(match[3]);
        if (sku && !isNaN(actual)) {
          csvCounts[sku] = (csvCounts[sku] || 0) + actual;
        }
      }
    }
    console.log(`Loaded ${Object.keys(csvCounts).length} unique SKUs from recovered scan CSV.`);
  } else {
    console.warn(`Warning: CSV scans not found at {csvPath}.`);
  }

  // 5. Load Handwritten Image Transcription
  const imageTranscriptionPath = path.join(process.cwd(), 'scratch', 'image_transcription.json');
  let imageCounts: Record<string, number> = {};
  if (fs.existsSync(imageTranscriptionPath)) {
    imageCounts = JSON.parse(fs.readFileSync(imageTranscriptionPath, 'utf8'));
    console.log(`Loaded ${Object.keys(imageCounts).length} SKUs from image transcription JSON.`);
  } else {
    console.warn(`Warning: Image transcription JSON not found at ${imageTranscriptionPath}.`);
  }

  // 6. Merge Opname Counts (CSV Scans + Image Transcription)
  const opnameCounts: Record<string, number> = { ...csvCounts };
  for (const [sku, count] of Object.entries(imageCounts)) {
    opnameCounts[sku] = (opnameCounts[sku] || 0) + count;
  }
  console.log(`Total unique SKUs in merged Stock Opname: ${Object.keys(opnameCounts).length}`);

  // 7. Get or Create Categories
  console.log("Upserting product categories...");
  const uniqueCategories = Array.from(new Set(excelData.map(r => r.category))).filter(Boolean);
  
  if (!uniqueCategories.includes('STONES')) uniqueCategories.push('STONES');
  if (!uniqueCategories.includes('ZIRCONIA')) uniqueCategories.push('ZIRCONIA');

  const categoryMap: Record<string, string> = {}; // Name -> ID
  const dbCategories = await prisma.product_categories.findMany({
    where: { tenant_id: tenantId }
  });
  
  for (const catName of uniqueCategories) {
    let cat = dbCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (!cat) {
      cat = await prisma.product_categories.create({
        data: {
          id: uuidv4(),
          tenant_id: tenantId,
          name: catName,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log(`Created category: "${catName}"`);
    }
    categoryMap[catName] = cat.id;
  }
  console.log(`Verified ${Object.keys(categoryMap).length} categories.`);

  // 8. Upsert Item Masters from Excel
  console.log("Upserting items in item_masters...");
  const excelProducts: Record<string, ExcelRecord> = {};
  for (const record of excelData) {
    if (!excelProducts[record.sku] || (excelProducts[record.sku].capital === 0 && record.capital > 0)) {
      excelProducts[record.sku] = record;
    }
  }

  const manualItems: Record<string, Partial<ExcelRecord>> = {
    '585 557R': {
      sku: '585 557R',
      name: 'E.ZIRCONE MIX STAR 6MM (RED)',
      category: 'ZIRCONIA',
      capital: 21550,
      selling: 200000
    },
    '580 209C': {
      sku: '580 209C',
      name: 'P.OPAL STONE W/RESIN C',
      category: 'STONES',
      capital: 244750,
      selling: 890000
    }
  };

  for (const [sku, item] of Object.entries(manualItems)) {
    if (!excelProducts[sku]) {
      excelProducts[sku] = item as ExcelRecord;
    }
  }

  const allSkusToSync = Array.from(new Set([
    ...Object.keys(excelProducts),
    ...Object.keys(opnameCounts)
  ]));

  console.log(`Syncing a total of ${allSkusToSync.length} items to database catalog...`);
  
  const chunkSize = 200;
  let syncedCount = 0;
  
  for (let i = 0; i < allSkusToSync.length; i += chunkSize) {
    const chunk = allSkusToSync.slice(i, i + chunkSize);
    
    const existingDbItems = await prisma.item_masters.findMany({
      where: {
        tenant_id: tenantId,
        sku: { in: chunk }
      }
    });
    
    const existingDbMap = new Map(existingDbItems.map(item => [item.sku, item]));
    
    for (const sku of chunk) {
      const excelItem = excelProducts[sku];
      const dbItem = existingDbMap.get(sku);
      
      const categoryName = excelItem?.category || 'Uncategorized';
      const categoryId = categoryMap[categoryName] || categoryMap['Uncategorized'] || (await getOrCreateDefaultCategory(tenantId));
      
      const itemName = excelItem?.name || `Product ${sku}`;
      const capitalPrice = excelItem?.capital || 0;
      const sellingPrice = excelItem?.selling || 0;
      
      if (dbItem) {
        await prisma.item_masters.update({
          where: { id: dbItem.id },
          data: {
            name: itemName,
            category_id: categoryId,
            base_price: capitalPrice,
            selling_price: sellingPrice,
            status: 'active',
            updated_at: new Date()
          }
        });
      } else {
        await prisma.item_masters.create({
          data: {
            id: uuidv4(),
            tenant_id: tenantId,
            category_id: categoryId,
            name: itemName,
            sku: sku,
            barcode: sku,
            unit: 'pcs',
            base_price: capitalPrice,
            tax_rate: 0.11,
            status: 'active',
            type: 'ITEM',
            selling_price: sellingPrice,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      syncedCount++;
    }
    console.log(`Synced ${syncedCount}/${allSkusToSync.length} items...`);
  }
  
  console.log("Database catalog update complete!");

  // 9. Reconcile and Sync Stock Levels for all active mapped locations
  const allTenantItems = await prisma.item_masters.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, sku: true }
  });
  console.log(`\nReconciling stock levels for ${allTenantItems.length} items across all mapped branches...`);

  for (const mapping of activeMapping) {
    console.log(`\nProcessing location: "${mapping.name}" (Code: ${mapping.code}, Excel Branch: "${mapping.excelBranch}")`);
    
    // Extract only records for this Excel branch
    const branchRecords = excelData.filter(r => r.branch === mapping.excelBranch);
    const branchQtyMap: Record<string, number> = {};
    for (const record of branchRecords) {
      branchQtyMap[record.sku] = record.qty;
    }
    console.log(`- Excel has ${Object.keys(branchQtyMap).length} items listed for branch "${mapping.excelBranch}".`);

    const isSeminyak = mapping.code === 'BS-03';
    if (isSeminyak) {
      console.log(`- This is Seminyak. Merged stock opname counts will be applied. Fallback is Excel branch "${mapping.excelBranch}".`);
    } else {
      console.log(`- Standard branch. Excel branch "${mapping.excelBranch}" quantities will be applied directly.`);
    }

    let stockUpdatedCount = 0;
    let stockCreatedCount = 0;

    const itemsToUpdate: Array<{ id: string, on_hand: number, reserved: number }> = [];
    const itemsToCreate: Array<{ product_id: string, on_hand: number }> = [];

    for (let i = 0; i < allTenantItems.length; i += chunkSize) {
      const chunk = allTenantItems.slice(i, i + chunkSize);
      const productIds = chunk.map(item => item.id);
      
      const existingLevels = await prisma.stock_levels.findMany({
        where: {
          tenant_id: tenantId,
          location_id: mapping.locationId,
          product_id: { in: productIds }
        }
      });
      
      const existingLevelsMap = new Map(existingLevels.map(level => [level.product_id, level]));
      
      for (const item of chunk) {
        let finalQty = 0;
        
        if (isSeminyak) {
          // Seminyak gets opname counts, fallback to Excel branch quantity
          if (opnameCounts[item.sku] !== undefined) {
            finalQty = opnameCounts[item.sku];
          } else if (branchQtyMap[item.sku] !== undefined) {
            finalQty = branchQtyMap[item.sku];
          }
        } else {
          // Other branches get Excel branch quantity directly
          if (branchQtyMap[item.sku] !== undefined) {
            finalQty = branchQtyMap[item.sku];
          }
        }
        
        const existingLevel = existingLevelsMap.get(item.id);
        
        if (existingLevel) {
          const reserved = Number(existingLevel.reserved || 0);
          // Only update if the quantity has changed
          if (existingLevel.on_hand !== finalQty) {
            itemsToUpdate.push({
              id: existingLevel.id,
              on_hand: finalQty,
              reserved
            });
          }
        } else {
          // If no existing level, create one only if quantity > 0
          if (finalQty > 0) {
            itemsToCreate.push({
              product_id: item.id,
              on_hand: finalQty
            });
          }
        }
      }
    }

    console.log(`- Queue sizes: ${itemsToUpdate.length} updates pending, ${itemsToCreate.length} creates pending.`);

    // Perform updates in parallel chunks
    const pLimit = 50;
    if (itemsToUpdate.length > 0) {
      console.log(`- Reconciling updates in parallel (concurrency: ${pLimit})...`);
      for (let i = 0; i < itemsToUpdate.length; i += pLimit) {
        const batch = itemsToUpdate.slice(i, i + pLimit);
        await Promise.all(batch.map(up =>
          prisma.stock_levels.update({
            where: { id: up.id },
            data: {
              on_hand: up.on_hand,
              available: Math.max(0, up.on_hand - up.reserved),
              updated_at: new Date()
            }
          })
        ));
        stockUpdatedCount += batch.length;
        if (stockUpdatedCount % 2000 === 0 || i + pLimit >= itemsToUpdate.length) {
          console.log(`  - Executed ${stockUpdatedCount}/${itemsToUpdate.length} updates...`);
        }
      }
    }

    // Perform creates in parallel chunks
    if (itemsToCreate.length > 0) {
      console.log(`- Reconciling creates in parallel (concurrency: ${pLimit})...`);
      for (let i = 0; i < itemsToCreate.length; i += pLimit) {
        const batch = itemsToCreate.slice(i, i + pLimit);
        await Promise.all(batch.map(cr =>
          prisma.stock_levels.create({
            data: {
              id: uuidv4(),
              tenant_id: tenantId,
              location_id: mapping.locationId,
              product_id: cr.product_id,
              on_hand: cr.on_hand,
              available: cr.on_hand,
              reserved: 0,
              min_buffer: 0,
              max_capacity: 0,
              created_at: new Date(),
              updated_at: new Date()
            }
          })
        ));
        stockCreatedCount += batch.length;
        if (stockCreatedCount % 2000 === 0 || i + pLimit >= itemsToCreate.length) {
          console.log(`  - Executed ${stockCreatedCount}/${itemsToCreate.length} creates...`);
        }
      }
    }

    console.log(`- Finished "${mapping.name}": Updated ${stockUpdatedCount} rows, Created ${stockCreatedCount} rows.`);
  }

  console.log("\nAll branches stock reconciliation complete!");

  // 10. Close and finalize the inventory audit cycle for Seminyak if it exists
  const targetCycleId = 'cffa2442-3d30-43b7-90cd-f988b129fe60';
  const targetCycle = await prisma.inventory_audit_cycles.findUnique({
    where: { id: targetCycleId }
  });
  
  if (targetCycle) {
    const totalCountedQty = Object.values(opnameCounts).reduce((a, b) => a + b, 0);
    await prisma.inventory_audit_cycles.update({
      where: { id: targetCycleId },
      data: {
        status: 'COMPLETED',
        counted_value: totalCountedQty,
        variance_value: 0,
        closed_by: 'system-reconciliation',
        updated_at: new Date()
      }
    });
    console.log(`✅ Closed Stock Opname Audit Cycle ${targetCycleId} (status set to COMPLETED).`);
  } else {
    console.log(`Audit Cycle ${targetCycleId} not found, skipping closure.`);
  }
}

async function getOrCreateDefaultCategory(tenantId: string): Promise<string> {
  const defaultCatName = 'Uncategorized';
  const existing = await prisma.product_categories.findFirst({
    where: { tenant_id: tenantId, name: defaultCatName }
  });
  if (existing) return existing.id;
  
  const created = await prisma.product_categories.create({
    data: {
      id: uuidv4(),
      tenant_id: tenantId,
      name: defaultCatName,
      created_at: new Date(),
      updated_at: new Date()
    }
  });
  return created.id;
}

main()
  .catch((e) => {
    console.error("Error during sync execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
