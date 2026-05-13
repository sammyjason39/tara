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

    async function cleanup() {
        try {
            console.log("Cleaning up stores...");
            await runSql(`UPDATE stores SET deleted_at = NOW() WHERE code IN ('BS-AN', 'BS-SS', 'BS-01') AND tenant_id = '${tenantId}'`);
            
            console.log("Merging Stock Opname Reports into Stock Opname...");
            const folders = await runSql(`SELECT id, name FROM explorer_folders WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL`);
            console.log(folders);
            
            // I'll just do direct ID based merge if I can find them
            // Old Root: 54af07bc-48bc-4886-89f1-747f86e1539f (Stock Opname Reports)
            // New Root: ff8dc393-0478-430e-8af7-af0cfc5e190a (Stock Opname)
            await runSql(`UPDATE explorer_folders SET parent_id = 'ff8dc393-0478-430e-8af7-af0cfc5e190a' WHERE parent_id = '54af07bc-48bc-4886-89f1-747f86e1539f'`);
            await runSql(`UPDATE explorer_files SET folder_id = 'ff8dc393-0478-430e-8af7-af0cfc5e190a' WHERE folder_id = '54af07bc-48bc-4886-89f1-747f86e1539f'`);
            await runSql(`UPDATE explorer_folders SET deleted_at = NOW() WHERE id = '54af07bc-48bc-4886-89f1-747f86e1539f'`);

            // Rename ID-named folders
            // a370e7ca-c1f7-4180-8824-846eaa6a3c8e is Anchor.
            // But Anchor (fbdc5d62...) already exists.
            // So merge 7aeadaa9... and 4642341e... into fbdc5d62...
            console.log("Merging Anchor folders...");
            await runSql(`UPDATE explorer_folders SET parent_id = 'fbdc5d62-257c-4e86-bf96-9bd6fbab565b' WHERE id IN ('7aeadaa9-30f0-4521-84ef-cc5489310af4', '4642341e-b937-4106-83e9-8a2944e45f93')`);
            // Actually, we want their CHILDREN to move to Anchor.
            await runSql(`UPDATE explorer_folders SET parent_id = 'fbdc5d62-257c-4e86-bf96-9bd6fbab565b' WHERE parent_id IN ('7aeadaa9-30f0-4521-84ef-cc5489310af4', '4642341e-b937-4106-83e9-8a2944e45f93')`);
            await runSql(`UPDATE explorer_files SET folder_id = 'fbdc5d62-257c-4e86-bf96-9bd6fbab565b' WHERE folder_id IN ('7aeadaa9-30f0-4521-84ef-cc5489310af4', '4642341e-b937-4106-83e9-8a2944e45f93')`);
            await runSql(`UPDATE explorer_folders SET deleted_at = NOW() WHERE id IN ('7aeadaa9-30f0-4521-84ef-cc5489310af4', '4642341e-b937-4106-83e9-8a2944e45f93')`);

            console.log("Cleanup finished.");
        } catch (e) {
            console.error("Cleanup failed:", e);
        } finally {
            conn.end();
        }
    }

    cleanup();
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
