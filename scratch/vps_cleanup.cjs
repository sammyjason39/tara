const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const tenantId = 'tnt-3rlhko';
    
    const sql = `
-- 1. CLEANUP STORES
-- Delete redundant 'Anchor' store pointed to HQ
UPDATE stores SET deleted_at = NOW() WHERE code = 'BS-AN' AND tenant_id = '${tenantId}';
-- Delete redundant 'SS' store pointed to HQ
UPDATE stores SET deleted_at = NOW() WHERE code = 'BS-SS' AND tenant_id = '${tenantId}';
-- Delete redundant 'Double Six' if needed, but let's just mark deleted_at for the one we don't want.
-- We'll keep BS-DS-01 for Double Six Branch.
UPDATE stores SET deleted_at = NOW() WHERE code = 'BS-01' AND tenant_id = '${tenantId}';

-- 2. CLEANUP LOCATIONS
-- Delete locations that are no longer used by active stores
UPDATE locations SET deleted_at = NOW() 
WHERE tenant_id = '${tenantId}' 
AND id NOT IN (SELECT location_id FROM stores WHERE deleted_at IS NULL AND tenant_id = '${tenantId}')
AND type = 'branch'
AND code NOT IN ('BS-ANC-LOC', 'BS-DS-LOC', 'BS-SS-LOC');

-- 3. CLEANUP EXPLORER FOLDERS
-- Merge 'Stock Opname Reports' into 'Stock Opname'
-- First, find the IDs
DO $$
DECLARE
    old_root_id UUID;
    new_root_id UUID;
BEGIN
    SELECT id INTO old_root_id FROM explorer_folders WHERE name = 'Stock Opname Reports' AND tenant_id = '${tenantId}' AND deleted_at IS NULL LIMIT 1;
    SELECT id INTO new_root_id FROM explorer_folders WHERE name = 'Stock Opname' AND tenant_id = '${tenantId}' AND deleted_at IS NULL LIMIT 1;
    
    IF old_root_id IS NOT NULL AND new_root_id IS NOT NULL THEN
        -- Move children
        UPDATE explorer_folders SET parent_id = new_root_id WHERE parent_id = old_root_id;
        UPDATE explorer_files SET folder_id = new_root_id WHERE folder_id = old_root_id;
        -- Delete old root
        UPDATE explorer_folders SET deleted_at = NOW() WHERE id = old_root_id;
    END IF;
END $$;

-- 4. FIX UUID FOLDERS
-- Find folders whose names are UUIDs of locations and rename them to location names
UPDATE explorer_folders f
SET name = l.name
FROM locations l
WHERE f.name = l.id::text
AND f.tenant_id = '${tenantId}'
AND l.tenant_id = '${tenantId}';

-- 5. MERGE DUPLICATE FOLDERS BY NAME
-- (Simplified version: if multiple folders with same name under same parent, merge them)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT name, parent_id, COUNT(*) 
        FROM explorer_folders 
        WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL 
        GROUP BY name, parent_id 
        HAVING COUNT(*) > 1
    ) LOOP
        -- Merge all but the oldest into the oldest
        DECLARE
            target_id UUID;
        BEGIN
            SELECT id INTO target_id FROM explorer_folders 
            WHERE name = r.name AND (parent_id = r.parent_id OR (parent_id IS NULL AND r.parent_id IS NULL))
            AND tenant_id = '${tenantId}' AND deleted_at IS NULL 
            ORDER BY created_at ASC LIMIT 1;
            
            UPDATE explorer_folders SET parent_id = target_id 
            WHERE name = r.name AND (parent_id = r.parent_id OR (parent_id IS NULL AND r.parent_id IS NULL))
            AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL;
            
            UPDATE explorer_files SET folder_id = target_id 
            WHERE folder_id IN (
                SELECT id FROM explorer_folders 
                WHERE name = r.name AND (parent_id = r.parent_id OR (parent_id IS NULL AND r.parent_id IS NULL))
                AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL
            );
            
            UPDATE explorer_folders SET deleted_at = NOW() 
            WHERE name = r.name AND (parent_id = r.parent_id OR (parent_id IS NULL AND r.parent_id IS NULL))
            AND tenant_id = '${tenantId}' AND id != target_id AND deleted_at IS NULL;
        END;
    END LOOP;
END $$;
`;

    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql.replace(/"/g, '\\"')}"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Cleanup Result:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
