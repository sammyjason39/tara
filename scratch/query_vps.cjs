const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    // Get tenant for the user
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT tenant_id FROM users WHERE email = 'bambusilverkedonganan@gmail.com';"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Tenant Result:\n' + output);
            
            // Now list locations
            conn.exec(`docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name, code FROM locations WHERE tenant_id = 'tnt-3rlhko' AND deleted_at IS NULL;"`, (err2, stream2) => {
                let output2 = '';
                stream2.on('data', (d) => { output2 += d; });
                stream2.on('close', () => {
                    console.log('Locations Result:\n' + output2);
                    conn.end();
                });
            });
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
