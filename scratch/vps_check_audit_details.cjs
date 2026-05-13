const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const ids = ["e44bbdfc-2f71-43ae-9715-28a932bd1a1e", "c4b63057-4d9d-4ba5-97ea-6869eb9af599"];
    const sql = `SELECT id, counted_value, variance_value FROM inventory_audit_cycles WHERE id IN ('${ids[0]}', '${ids[1]}');`;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Audit Details Result:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
