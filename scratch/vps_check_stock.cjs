const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const tenantId = 'tnt-3rlhko';
    const sql = `SELECT s.id, s.product_id, s.on_hand, s.available, l.name as loc_name 
                 FROM stock_levels s 
                 JOIN locations l ON s.location_id = l.id 
                 WHERE s.tenant_id = '${tenantId}' 
                 AND s.on_hand > 0 
                 LIMIT 10;`;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql.replace(/\n/g, ' ')}"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Result:\n' + output);
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
