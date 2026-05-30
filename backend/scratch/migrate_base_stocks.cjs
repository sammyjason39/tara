const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

const EXCEL_PATH = 'C:\\Users\\user\\Downloads\\Bambu Silver\\SaldoStockALL.xlsx';
const TENANT_ID = 'tnt-3rlhko';
const CATEGORY_RECOVERED_ID = 'a1caa60b-bb17-7777-7777-a1caa60bb177'; // Stable ID of "Unregistered Recovered Scans" category

// Location Mappings
const BRANCH_MAPPING = {
  'DOUBLE SIX': 'f7b7e5f0-0fb8-4995-8840-ff4577d84989', // BS-01
  'LOVE ANCHOR': 'a370e7ca-c1f7-4180-8824-846eaa6a3c8e', // BS-ANC-LOC
  'SAHA': 'ee3bcfcf-d49c-4894-8b52-0e87df2794ff',        // BS-02
  'UBUD 1': 'a3a241a4-4841-45a3-90cd-f7135e6847b4',      // BS-03 (Seminyak - Preserved)
  'SS': 'ccd6c269-7a9e-4540-8b20-198ac296f701'          // BS-SS-LOC (SS - Preserved)
};

const PRESERVED_BRANCH_IDS = new Set([
  BRANCH_MAPPING['UBUD 1'],
  BRANCH_MAPPING['SS']
]);

async function main() {
  console.log('🚀 INITIALIZING MASSIVE INVENTORY IMPORT & ENRICHMENT (BULK OPTIMIZED) 🚀');
  console.log('============================================================');
  
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`ERROR: Excel sheet not found at: ${EXCEL_PATH}`);
    await prisma.$disconnect();
    return;
  }

  console.log('Loading Excel Workbook (this may take a few seconds due to 12k+ rows)...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.worksheets[0];
  console.log(`Excel sheet loaded successfully. Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}`);

  // 1. First Pass: Aggregate Excel Data
  console.log('\n--- Pass 1: Aggregating categories, products, and branch stock levels ---');
  const uniqueCategoryNames = new Set();
  const excelProducts = new Map(); // SKU -> { name, categoryName, basePrice, sellingPrice }
  const excelStocks = new Map(); // "SKU|locationId" -> Summed Quantity
  
  let rowsParsed = 0;
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const skuVal = row.getCell(1).value;
    if (!skuVal) continue;

    const sku = String(skuVal).trim();
    const name = String(row.getCell(2).value || '').trim();
    const categoryName = String(row.getCell(3).value || '').trim();
    const branchName = String(row.getCell(4).value || '').trim();
    const qty = Number(row.getCell(5).value || 0);
    const basePrice = Number(row.getCell(6).value || 0);
    const sellingPrice = Number(row.getCell(7).value || 0);

    if (categoryName) uniqueCategoryNames.add(categoryName);

    // Aggregate Product Catalog Info (prefer row info with pricing if available)
    const existingProd = excelProducts.get(sku);
    if (!existingProd || basePrice > 0 || sellingPrice > 0) {
      excelProducts.set(sku, {
        name: name || (existingProd ? existingProd.name : `Product ${sku}`),
        categoryName: categoryName || (existingProd ? existingProd.categoryName : 'Recovered Scans'),
        basePrice: basePrice || (existingProd ? existingProd.basePrice : 0),
        sellingPrice: sellingPrice || (existingProd ? existingProd.sellingPrice : 0)
      });
    }

    // Aggregate Stock levels
    const locId = BRANCH_MAPPING[branchName];
    if (locId) {
      const stockKey = `${sku}|${locId}`;
      const currentSum = excelStocks.get(stockKey) || 0;
      excelStocks.set(stockKey, currentSum + qty);
    }
    
    rowsParsed++;
  }
  console.log(`Aggregated: ${excelProducts.size} unique products and ${excelStocks.size} branch stock keys across ${rowsParsed} rows.`);

  // 2. Synchronize Product Categories
  console.log('\n--- Pass 2: Syncing Product Categories ---');
  const categoryNameToId = new Map();
  categoryNameToId.set('Recovered Scans', CATEGORY_RECOVERED_ID);

  for (const catName of uniqueCategoryNames) {
    let category = await prisma.product_categories.findFirst({
      where: { tenant_id: TENANT_ID, name: catName }
    });

    if (!category) {
      const newCatId = crypto.randomUUID();
      category = await prisma.product_categories.create({
        data: {
          id: newCatId,
          tenant_id: TENANT_ID,
          name: catName
        }
      });
      console.log(`Created Category: "${catName}" (ID: ${newCatId})`);
    }
    categoryNameToId.set(catName, category.id);
  }
  console.log(`Category synchronization complete. Active Categories Map: ${categoryNameToId.size}`);

  // 3. Pre-fetch and cache existing Catalog Items
  console.log('\n--- Pass 3: Pre-fetching existing Catalog Products ---');
  const existingItems = await prisma.item_masters.findMany({
    where: { tenant_id: TENANT_ID }
  });
  
  const itemsBySku = new Map();
  for (const item of existingItems) {
    itemsBySku.set(item.sku, item);
    itemsBySku.set(item.barcode, item);
  }
  console.log(`Cached ${existingItems.length} active database catalog items.`);

  // 4. Enrich & Synchronize Item Catalog
  console.log('\n--- Pass 4: Syncing & Enriching Item Catalog ---');
  let itemsCreated = 0;
  let itemsEnriched = 0;

  for (const [sku, details] of excelProducts.entries()) {
    let item = itemsBySku.get(sku);
    const catId = categoryNameToId.get(details.categoryName) || CATEGORY_RECOVERED_ID;

    if (!item) {
      // Create new catalog item
      const newItemId = crypto.randomUUID();
      item = await prisma.item_masters.create({
        data: {
          id: newItemId,
          tenant_id: TENANT_ID,
          category_id: catId,
          name: details.name,
          sku: sku,
          barcode: sku,
          unit: 'pcs',
          base_price: details.basePrice,
          tax_rate: 0.11,
          status: 'active',
          type: 'ITEM',
          selling_price: details.sellingPrice
        }
      });
      itemsBySku.set(sku, item);
      itemsCreated++;
    } else {
      // Enrich existing item's pricing & category (reclassify recovered items if possible)
      const updateData = {};
      if (details.basePrice > 0 && Number(item.base_price || 0) === 0) {
        updateData.base_price = details.basePrice;
      }
      if (details.sellingPrice > 0 && Number(item.selling_price || 0) === 0) {
        updateData.selling_price = details.sellingPrice;
      }
      if (item.category_id === CATEGORY_RECOVERED_ID && catId !== CATEGORY_RECOVERED_ID) {
        updateData.category_id = catId; // Reclassify to correct category
      }

      if (Object.keys(updateData).length > 0) {
        item = await prisma.item_masters.update({
          where: { id: item.id },
          data: {
            ...updateData,
            updated_at: new Date()
          }
        });
        itemsBySku.set(sku, item);
        itemsEnriched++;
      }
    }
  }
  console.log(`Completed Catalog Sync: Created ${itemsCreated} new items, enriched pricing for ${itemsEnriched} items.`);

  // 5. Pre-fetch and cache existing stock levels
  console.log('\n--- Pass 5: Pre-fetching existing stock levels ---');
  const existingStockLevels = await prisma.stock_levels.findMany({
    where: { tenant_id: TENANT_ID }
  });
  
  const stockLevelsMap = new Map(); // "productId|locationId" -> StockLevel record
  for (const sl of existingStockLevels) {
    stockLevelsMap.set(`${sl.product_id}|${sl.location_id}`, sl);
  }
  console.log(`Cached ${existingStockLevels.length} active database stock records.`);

  // 6. Update Stock Levels (Applying stocks for new branches, safeguarding Seminyak/SS)
  console.log('\n--- Pass 6: Synchronizing stock levels (safeguarding Seminyak and SS) ---');
  let stockCreated = 0;
  let stockUpdated = 0;
  let stockPreserved = 0;

  const stockCreates = [];

  // Process all products from our catalog cache
  for (const [sku, item] of itemsBySku.entries()) {
    // Only process actual catalog item entries (skipping duplicate barcode pointers in map)
    if (item.sku !== sku) continue; 

    // We sync for all 5 branches
    for (const [branchName, locId] of Object.entries(BRANCH_MAPPING)) {
      const isPreservedBranch = PRESERVED_BRANCH_IDS.has(locId);
      const excelKey = `${sku}|${locId}`;
      const excelQty = excelStocks.get(excelKey) || 0;

      const stockKey = `${item.id}|${locId}`;
      const existingSl = stockLevelsMap.get(stockKey);

      if (isPreservedBranch) {
        // Seminyak or SS - PRESERVE THEIR STOCK
        if (!existingSl) {
          // Initialize missing stock record to 0 so cashiers/scans resolve nicely
          stockCreates.push({
            id: crypto.randomUUID(),
            tenant_id: TENANT_ID,
            location_id: locId,
            product_id: item.id,
            on_hand: 0,
            available: 0,
            reserved: 0,
            min_buffer: 0,
            max_capacity: 0
          });
          stockCreated++;
        } else {
          // Keep active counts untouched
          stockPreserved++;
        }
      } else {
        // Anchor, Double Six, or Sahadewa - APPLY BASE STOCK FROM EXCEL
        if (!existingSl) {
          stockCreates.push({
            id: crypto.randomUUID(),
            tenant_id: TENANT_ID,
            location_id: locId,
            product_id: item.id,
            on_hand: excelQty,
            available: excelQty,
            reserved: 0,
            min_buffer: 0,
            max_capacity: 0
          });
          stockCreated++;
        } else {
          const reserved = Number(existingSl.reserved || 0);
          // If the quantity in the database is different from Excel, let's update it!
          if (Number(existingSl.on_hand || 0) !== excelQty) {
            await prisma.stock_levels.update({
              where: { id: existingSl.id },
              data: {
                on_hand: excelQty,
                available: Math.max(0, excelQty - reserved),
                updated_at: new Date()
              }
            });
            stockUpdated++;
          } else {
            stockPreserved++;
          }
        }
      }
    }
  }

  if (stockCreates.length > 0) {
    console.log(`\nBulk inserting ${stockCreates.length} stock level records...`);
    const BATCH_SIZE = 5000;
    for (let i = 0; i < stockCreates.length; i += BATCH_SIZE) {
      const batch = stockCreates.slice(i, i + BATCH_SIZE);
      await prisma.stock_levels.createMany({
        data: batch,
        skipDuplicates: true
      });
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(stockCreates.length / BATCH_SIZE)}`);
    }
  }

  console.log('============================================================');
  console.log('🎉 MASSIVE DATABASE MIGRATION & ENRICHMENT COMPLETE 🎉');
  console.log('============================================================');
  console.log(`Tenant ID:           ${TENANT_ID}`);
  console.log(`Total Products:      ${itemsBySku.size}`);
  console.log(`New Catalog Items:   ${itemsCreated}`);
  console.log(`Pricing Enriched:    ${itemsEnriched}`);
  console.log(`Stock Levels Created: ${stockCreated} (including 0-init for Seminyak/SS)`);
  console.log(`Stock Levels Updated: ${stockUpdated} (Base stocks applied for other branches)`);
  console.log(`Stock Levels Kept:    ${stockPreserved} (Opname counts strictly preserved!)`);
  console.log('============================================================\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
