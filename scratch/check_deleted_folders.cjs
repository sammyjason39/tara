const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    // Check for Stock Opname Reports folder including deleted ones
    conn.exec('docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name, parent_id, deleted_at, tenant_id FROM explorer_folders WHERE name = \'Stock Opname Reports\' AND tenant_id = \'tnt-3rlhko\';"', (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => console.log('OUT: ' + data));
        stream.stderr.on('data', (data) => console.log('STDERR: ' + data));
        stream.on('close', () => conn.end());
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
