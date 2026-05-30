const { Client } = require('pg');

async function testConnection(url, name) {
  console.log(`Connecting to ${name}...`);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log(`Connected to ${name} successfully!`);
    
    // Query users
    const userRes = await client.query(
      `SELECT id, email, tenant_id FROM users WHERE email = $1`,
      ['bambusilverkedonganan@gmail.com']
    );
    console.log(`User Search Results for bambusilverkedonganan@gmail.com:`, userRes.rows);
    
    let tenantId = null;
    if (userRes.rows.length > 0) {
      tenantId = userRes.rows[0].tenant_id;
      console.log(`Found tenant_id: ${tenantId}`);
    }

    // Query locations
    const locRes = await client.query(
      `SELECT id, name, code, tenant_id FROM locations WHERE name ILIKE '%Seminyak%'`
    );
    console.log(`Location Search Results for 'Seminyak':`, locRes.rows);

    // Query stores
    const storeRes = await client.query(
      `SELECT id, name, location_id, tenant_id, company_id FROM stores WHERE name ILIKE '%Seminyak%' OR location_id IN (SELECT id FROM locations WHERE name ILIKE '%Seminyak%')`
    );
    console.log(`Store Search Results:`, storeRes.rows);

    // Let's also check if there are other locations/stores under the tenant
    if (tenantId) {
      const allLocs = await client.query(
        `SELECT id, name, code FROM locations WHERE tenant_id = $1`,
        [tenantId]
      );
      console.log(`All locations for tenant ${tenantId}:`, allLocs.rows);
      
      const allStores = await client.query(
        `SELECT id, name, location_id FROM stores WHERE tenant_id = $1`,
        [tenantId]
      );
      console.log(`All stores for tenant ${tenantId}:`, allStores.rows);
    }

    await client.end();
  } catch (err) {
    console.error(`Connection to ${name} failed:`, err.message);
    try { client.end(); } catch (e) {}
  }
}

async function run() {
  const localUrl = "postgresql://zenvix:zenvix_secure_2026!@localhost:5432/zenvix_prod?schema=public";
  const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";
  
  await testConnection(localUrl, "Local Database (5432)");
  console.log('\n-----------------------------------------\n');
  await testConnection(prodUrl, "Production VPS Database (5433)");
}

run();
