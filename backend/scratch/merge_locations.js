const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeDuplicateLocations() {
  console.log('--- STARTING LOCATION MERGE ---');
  
  // 1. Find all duplicate locations (same name within same tenant)
  const locations = await prisma.locations.findMany({
    where: { deleted_at: null }
  });

  const groups = new Map();
  for (const loc of locations) {
    const key = `${loc.tenant_id}:${loc.name.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(loc);
  }

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(`Processing duplicate group: "${key}" (${group.length} items)`);
      
      // Pick the winner: the one that has stock levels, or the first one
      let winner = group[0];
      let maxStockEntries = -1;
      
      for (const loc of group) {
        const count = await prisma.stock_levels.count({ where: { location_id: loc.id } });
        if (count > maxStockEntries) {
          maxStockEntries = count;
          winner = loc;
        }
      }
      
      console.log(`  - Winner: ${winner.id} (${winner.name}) with ${maxStockEntries} stock entries.`);
      
      const losers = group.filter(l => l.id !== winner.id);
      for (const loser of losers) {
        console.log(`  - Merging loser: ${loser.id} (${loser.name})`);
        
        // Update all referencing tables
        const tables = [
          { name: 'stock_levels', field: 'location_id' },
          { name: 'stock_movements', field: 'location_id' },
          { name: 'stock_movements', field: 'to_location_id' },
          { name: 'inventory_audit_cycles', field: 'location_code' },
          { name: 'inventory_adjustments', field: 'location_id' },
          { name: 'inventory_transfers', field: 'from_location_id' },
          { name: 'inventory_transfers', field: 'to_location_id' },
          { name: 'stores', field: 'location_id' },
          { name: 'warehouse_bins', field: 'location_id' },
          { name: 'departments', field: 'location_id' },
          { name: 'pos_devices', field: 'location_id' }
        ];

        for (const table of tables) {
          try {
            // Check if model exists in prisma
            if (prisma[table.name]) {
              const result = await prisma[table.name].updateMany({
                where: { [table.field]: loser.id },
                data: { [table.field]: winner.id }
              });
              if (result.count > 0) console.log(`    - Updated ${result.count} rows in ${table.name}.${table.field}`);
            } else {
              // Try direct SQL for tables not in prisma or with different names
              await prisma.$executeRawUnsafe(`UPDATE ${table.name} SET ${table.field} = '${winner.id}' WHERE ${table.field} = '${loser.id}'`);
              console.log(`    - Updated ${table.name}.${table.field} via raw SQL`);
            }
          } catch (e) {
            console.warn(`    - Failed to update ${table.name}.${table.field}: ${e.message}`);
          }
        }

        // Special case for inventory_audit_cycles.location_code which might store the NAME or CODE
        await prisma.inventory_audit_cycles.updateMany({
           where: { location_code: loser.code },
           data: { location_code: winner.id }
        });

        // Delete the loser
        await prisma.locations.update({
          where: { id: loser.id },
          data: { deleted_at: new Date(), name: `${loser.name} (MERGED-${winner.id})` }
        });
        console.log(`    - Soft-deleted loser ${loser.id}`);
      }
    }
  }

  console.log('--- MERGE COMPLETE ---');
  await prisma.$disconnect();
}

mergeDuplicateLocations();
