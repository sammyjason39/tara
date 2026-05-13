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

    async function mergeDuplicates() {
        try {
            console.log("Merging duplicate folders recursively...");
            // Run multiple times to handle nested duplicates
            for (let i = 0; i < 3; i++) {
                await runSql(`
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid) as parent_uuid, COUNT(*) 
        FROM explorer_folders 
        WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL 
        GROUP BY name, parent_uuid
        HAVING COUNT(*) > 1
    ) LOOP
        DECLARE
            target_id UUID;
        BEGIN
            IF r.parent_uuid = '00000000-0000-0000-0000-000000000000'::uuid THEN
                SELECT id INTO target_id FROM explorer_folders 
                WHERE name = r.name AND parent_id IS NULL
                AND tenant_id = '${tenantId}' AND deleted_at IS NULL 
                ORDER BY created_at ASC LIMIT 1;
                
                UPDATE explorer_folders SET parent_id = target_id 
                WHERE name = r.name AND parent_id IS NULL
                AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL;
                
                UPDATE explorer_files SET folder_id = target_id 
                WHERE folder_id IN (
                    SELECT id FROM explorer_folders 
                    WHERE name = r.name AND parent_id IS NULL
                    AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL
                );
                
                UPDATE explorer_folders SET deleted_at = NOW() 
                WHERE name = r.name AND parent_id IS NULL
                AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL;
            ELSE
                SELECT id INTO target_id FROM explorer_folders 
                WHERE name = r.name AND parent_id = r.parent_uuid
                AND tenant_id = '${tenantId}' AND deleted_at IS NULL 
                ORDER BY created_at ASC LIMIT 1;
                
                UPDATE explorer_folders SET parent_id = target_id 
                WHERE name = r.name AND parent_id = r.parent_uuid
                AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL;
                
                UPDATE explorer_files SET folder_id = target_id 
                WHERE folder_id IN (
                    SELECT id FROM explorer_folders 
                    WHERE name = r.name AND parent_id = r.parent_uuid
                    AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL
                );
                
                UPDATE explorer_folders SET deleted_at = NOW() 
                WHERE name = r.name AND parent_id = r.parent_uuid
                AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL;
            END IF;
        END;
    END LOOP;
END $$;
                `);
            }
            console.log("Merge finished.");
        } catch (e) {
            console.error("Merge failed:", e);
        } finally {
            conn.end();
        }
    }

    mergeDuplicates();
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
