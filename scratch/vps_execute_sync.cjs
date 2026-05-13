const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const tenantId = 'tnt-3rlhko';
    
    const runSql = (sql) => {
        return new Promise((resolve, reject) => {
            const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
            conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                let output = '';
                stream.on('data', (data) => { output += data; });
                stream.on('close', () => resolve(output));
            });
        });
    };

    async function execute() {
        try {
            console.log("--- Phase 1: Store & Location Sync ---");
            
            // Restore and Fix Main Stores
            console.log("Restoring and updating primary stores...");
            await runSql(`UPDATE stores SET deleted_at = NULL, location_id = 'a370e7ca-c1f7-4180-8824-846eaa6a3c8e', name = 'Anchor' WHERE code = 'BS-AN' AND tenant_id = '${tenantId}'`);
            await runSql(`UPDATE stores SET deleted_at = NULL, location_id = 'ccd6c269-7a9e-4540-8b20-198ac296f701', name = 'SS' WHERE code = 'BS-SS' AND tenant_id = '${tenantId}'`);
            await runSql(`UPDATE stores SET deleted_at = NULL, location_id = 'f7b7e5f0-0fb8-4995-8840-ff4577d84989', name = 'Double Six' WHERE code = 'BS-01' AND tenant_id = '${tenantId}'`);
            await runSql(`UPDATE stores SET deleted_at = NULL, location_id = 'ee3bcfcf-d49c-4894-8b52-0e87df2794ff', name = 'Sahadewa' WHERE code = 'BS-02' AND tenant_id = '${tenantId}'`);
            await runSql(`UPDATE stores SET deleted_at = NULL, location_id = 'a3a241a4-4841-45a3-90cd-f7135e6847b4', name = 'Seminyak' WHERE code = 'BS-03' AND tenant_id = '${tenantId}'`);

            // Delete redundant stores
            console.log("Deleting redundant stores...");
            await runSql(`UPDATE stores SET deleted_at = NOW() WHERE code IN ('BS-ANC-01', 'BS-DS-01', 'BS-SS-01') AND tenant_id = '${tenantId}'`);

            // Delete redundant locations (except HQ and the 5 branches)
            console.log("Deleting redundant locations...");
            await runSql(`UPDATE locations SET deleted_at = NOW() 
                          WHERE tenant_id = '${tenantId}' 
                          AND id NOT IN (
                            '5de931c0-8843-4453-8fa9-b419c707d0d9', -- HQ
                            'a370e7ca-c1f7-4180-8824-846eaa6a3c8e', -- Anchor
                            'ccd6c269-7a9e-4540-8b20-198ac296f701', -- SS
                            'f7b7e5f0-0fb8-4995-8840-ff4577d84989', -- Double Six
                            'ee3bcfcf-d49c-4894-8b52-0e87df2794ff', -- Sahadewa
                            'a3a241a4-4841-45a3-90cd-f7135e6847b4'  -- Seminyak
                          )`);

            console.log("--- Phase 2: Stock Reset ---");
            console.log("Resetting stock levels to 0...");
            await runSql(`UPDATE stock_levels SET on_hand = 0, available = 0, reserved = 0, in_transit = 0 WHERE tenant_id = '${tenantId}'`);
            
            console.log("Clearing stock movements...");
            await runSql(`DELETE FROM stock_movements WHERE tenant_id = '${tenantId}'`);

            console.log("--- Phase 3: Explorer Cleanup ---");
            console.log("Deleting Stock Opname files and folders...");
            // Get the root folder ID first
            const rootRes = await runSql(`SELECT id FROM explorer_folders WHERE name = 'Stock Opname' AND tenant_id = '${tenantId}' AND parent_id IS NULL LIMIT 1`);
            console.log(rootRes);
            
            // Hardcoded root ID from previous query: ff8dc393-0478-430e-8af7-af0cfc5e190a
            const rootId = 'ff8dc393-0478-430e-8af7-af0cfc5e190a';
            
            // Delete files in the hierarchy
            await runSql(`DELETE FROM explorer_files WHERE folder_id IN (SELECT id FROM explorer_folders WHERE (id = '${rootId}' OR parent_id = '${rootId}') AND tenant_id = '${tenantId}')`);
            await runSql(`DELETE FROM explorer_files WHERE folder_id IN (SELECT id FROM explorer_folders WHERE parent_id IN (SELECT id FROM explorer_folders WHERE parent_id = '${rootId}') AND tenant_id = '${tenantId}')`);
            
            // Delete subfolders
            await runSql(`UPDATE explorer_folders SET deleted_at = NOW() WHERE parent_id = '${rootId}' AND tenant_id = '${tenantId}'`);
            await runSql(`UPDATE explorer_folders SET deleted_at = NOW() WHERE parent_id IN (SELECT id FROM explorer_folders WHERE parent_id = '${rootId}' AND tenant_id = '${tenantId}')`);

            console.log("Execution finished successfully.");
        } catch (e) {
            console.error("Execution failed:", e);
        } finally {
            conn.end();
        }
    }

    execute();
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
