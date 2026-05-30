const { Client } = require('pg');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";
const tenantId = 'tnt-3rlhko';
const locationId = 'a3a241a4-4841-45a3-90cd-f7135e6847b4'; // Seminyak
const companyId = 'b74e21b9-4e99-42fd-857b-36bf4dee7ed5'; // Bambu Silver

async function seedOpname(dryRun = true) {
  console.log(`==================================================`);
  console.log(`🚀 STARTING SEEDING PROCESS (${dryRun ? 'DRY RUN' : 'PRODUCTION LIVE EXECUTION'})`);
  console.log(`==================================================`);
  console.log(`Tenant:   ${tenantId}`);
  console.log(`Location: ${locationId} (Seminyak)`);
  console.log(`Company:  ${companyId} (Bambu Silver)`);
  console.log(`==================================================\n`);

  const reportData = JSON.parse(fs.readFileSync('final_opname_report.json', 'utf8'));
  const { summary, items } = reportData;

  console.log(`Loaded ${items.length} items from final report.`);
  console.log(`Expected total counted value: ${summary.totalActual}\n`);

  const client = new Client({ connectionString: prodUrl });
  try {
    await client.connect();
    console.log('Connected to Production VPS Database.');

    // 1. Fetch current stock level records for backups
    console.log('Fetching existing stock levels for backup...');
    const backupRes = await client.query(
      `SELECT * FROM stock_levels WHERE tenant_id = $1 AND location_id = $2`,
      [tenantId, locationId]
    );
    
    // Save backup to file
    const backupFilename = `backup_stock_levels_seminyak_${Date.now()}.json`;
    fs.writeFileSync(backupFilename, JSON.stringify(backupRes.rows, null, 2));
    console.log(`Saved backup of ${backupRes.rows.length} existing stock level rows to ${backupFilename}`);

    // Begin SQL Transaction
    await client.query('BEGIN');
    console.log('\nTransaction started.');

    let updatedCount = 0;
    let createdCount = 0;
    let movementsCount = 0;

    const now = new Date().toISOString();

    for (const item of items) {
      const { productId, sku, name, expected, actual, variance, reserved } = item;
      
      // Check if stock level record exists in the DB
      const checkRes = await client.query(
        `SELECT id, on_hand, reserved, available FROM stock_levels 
         WHERE tenant_id = $1 AND location_id = $2 AND product_id = $3`,
        [tenantId, locationId, productId]
      );

      const exists = checkRes.rows.length > 0;

      if (exists) {
        // Update existing stock level
        const currentStock = checkRes.rows[0];
        const newOnHand = actual;
        const newReserved = parseFloat(currentStock.reserved) || 0;
        const newAvailable = newOnHand - newReserved;

        console.log(`[UPDATE] SKU ${sku} | On Hand: ${expected} -> ${newOnHand} | Reserved: ${newReserved} | Available: ${newAvailable}`);

        await client.query(
          `UPDATE stock_levels 
           SET on_hand = $1, available = $2, last_stock_take_at = $3, updated_at = $4 
           WHERE id = $5`,
          [newOnHand, newAvailable, now, now, currentStock.id]
        );
        updatedCount++;
      } else {
        // Create new stock level
        const newId = uuidv4();
        const newOnHand = actual;
        const newAvailable = actual;

        console.log(`[CREATE] SKU ${sku} | On Hand: 0 -> ${newOnHand} | Available: ${newAvailable}`);

        await client.query(
          `INSERT INTO stock_levels (id, tenant_id, location_id, product_id, on_hand, available, reserved, last_stock_take_at, updated_at, department_id, company_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, null, $10)`,
          [newId, tenantId, locationId, productId, newOnHand, newAvailable, 0, now, now, companyId]
        );
        createdCount++;
      }

      // Create stock movement record
      const movementId = uuidv4();
      const movementQty = variance;
      
      await client.query(
        `INSERT INTO stock_movements (id, tenant_id, product_id, to_location_id, quantity, type, reference_id, reference_type, performed_by, updated_at, from_location_id, location_id, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, null, $11, $12)`,
        [movementId, tenantId, productId, locationId, movementQty, 'STOCK_OPNAME', 'OPNAME-MAY-2026', 'BULK_SCAN', 'system', now, locationId, companyId]
      );
      movementsCount++;
    }

    // Create inventory audit cycle record
    const auditId = uuidv4();
    console.log(`\n[AUDIT_CYCLE] Creating inventory audit cycle record...`);
    console.log(`Expected Value: ${summary.totalExpected} | Counted Value: ${summary.totalActual} | Variance: ${summary.totalVariance}`);
    
    await client.query(
      `INSERT INTO inventory_audit_cycles (id, tenant_id, company_id, location_code, scope, status, expected_value, counted_value, variance_value, opened_by, closed_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        auditId, 
        tenantId, 
        companyId, 
        locationId, 
        'STORE_OPNAME', 
        'COMPLETED', 
        summary.totalExpected, 
        summary.totalActual, 
        summary.totalVariance, 
        'system', 
        'system', 
        now, 
        now
      ]
    );

    console.log(`\nSeeding statistics summary:`);
    console.log(`- Updated Stock Levels:    ${updatedCount}`);
    console.log(`- Created Stock Levels:    ${createdCount}`);
    console.log(`- Created Stock Movements: ${movementsCount}`);
    console.log(`- Created Audit Cycle:     1`);

    if (dryRun) {
      console.log('\nDRY RUN: Rolling back transaction. No changes were saved.');
      await client.query('ROLLBACK');
    } else {
      console.log('\nLIVE RUN: Committing transaction. Saving changes to the database...');
      await client.query('COMMIT');
      console.log('Transaction committed successfully!');
    }

    await client.end();
    console.log('\nSeeding completed successfully!');
  } catch (err) {
    console.error('\n❌ ERROR OCCURRED! Rolling back transaction...', err.message);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Failed to rollback transaction:', rollbackErr.message);
    }
    try {
      await client.end();
    } catch (e) {}
    process.exit(1);
  }
}

// Read args
const isLive = process.argv.includes('--live');
seedOpname(!isLive);
