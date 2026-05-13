const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // Check locations and see what tenant_id they have
    const sql = `
        SELECT id, tenant_id, name, code
        FROM locations
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
