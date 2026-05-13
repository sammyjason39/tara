const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
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

    async function finalCleanup() {
        try {
            console.log("Merging specific duplicate folders...");
            
            // Merge 2026 duplicates under Anchor
            // Primary: 29553d21-6be2-40e6-bee5-32b0d25a8a0d
            await runSql(`UPDATE explorer_folders SET parent_id = '29553d21-6be2-40e6-bee5-32b0d25a8a0d' WHERE parent_id IN ('2b98093f-819c-480a-9e15-8b93d31693d2', '1e4f5468-e50f-423a-8bfb-dcec4807e4ad')`);
            await runSql(`UPDATE explorer_files SET folder_id = '29553d21-6be2-40e6-bee5-32b0d25a8a0d' WHERE folder_id IN ('2b98093f-819c-480a-9e15-8b93d31693d2', '1e4f5468-e50f-423a-8bfb-dcec4807e4ad')`);
            await runSql(`UPDATE explorer_folders SET deleted_at = NOW() WHERE id IN ('2b98093f-819c-480a-9e15-8b93d31693d2', '1e4f5468-e50f-423a-8bfb-dcec4807e4ad')`);

            // Merge May duplicates under 2026
            // Primary: 4663c4d0-e60f-4e5c-b6a0-cddc52b0a57f
            await runSql(`UPDATE explorer_folders SET parent_id = '4663c4d0-e60f-4e5c-b6a0-cddc52b0a57f' WHERE parent_id IN ('826d27db-a9ca-48b6-87d4-30b0b92cc0ed', 'b138a0f9-d0b9-44c3-b257-f5132aa4b1d4')`);
            await runSql(`UPDATE explorer_files SET folder_id = '4663c4d0-e60f-4e5c-b6a0-cddc52b0a57f' WHERE folder_id IN ('826d27db-a9ca-48b6-87d4-30b0b92cc0ed', 'b138a0f9-d0b9-44c3-b257-f5132aa4b1d4')`);
            await runSql(`UPDATE explorer_folders SET deleted_at = NOW() WHERE id IN ('826d27db-a9ca-48b6-87d4-30b0b92cc0ed', 'b138a0f9-d0b9-44c3-b257-f5132aa4b1d4')`);

            console.log("Final cleanup finished.");
        } catch (e) {
            console.error("Cleanup failed:", e);
        } finally {
            conn.end();
        }
    }

    finalCleanup();
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
