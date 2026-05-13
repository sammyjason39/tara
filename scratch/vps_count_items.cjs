const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const tenantId = 'tnt-3rlhko';
    const sql = `SELECT count(*) FROM item_masters WHERE tenant_id = '${tenantId}' AND status != 'deleted';`;
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    conn.exec(cmd, (err, stream) => {
        let out = '';
        stream.on('data', d => out += d);
        stream.on('close', () => {
            console.log(out);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
