const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // Check stock_levels and see what tenant_id and location_id they have
    const sql = `
        SELECT s.tenant_id as s_tenant, s.location_id, s.on_hand, t.name as tenant_name, l.name as loc_name
        FROM stock_levels s
        JOIN tenants t ON s.tenant_id = t.id
        LEFT JOIN locations l ON s.location_id = l.id
        LIMIT 20;
    `;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    
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
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
