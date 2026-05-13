const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const tenantId = 'tnt-3rlhko';
    const queries = [
        `SELECT id, name, code, deleted_at FROM stores WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL ORDER BY name;`,
        `SELECT id, name, code, deleted_at FROM locations WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL ORDER BY name;`
    ];

    async function run() {
        for (const q of queries) {
            await new Promise((resolve) => {
                const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${q}"`;
                conn.exec(cmd, (err, stream) => {
                    let out = '';
                    stream.on('data', d => out += d);
                    stream.on('close', () => {
                        console.log('Query:', q);
                        console.log(out);
                        resolve();
                    });
                });
            });
        }
        conn.end();
    }
    run();
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
