const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name, parent_id FROM explorer_folders WHERE tenant_id = 'tnt-3rlhko' AND deleted_at IS NULL ORDER BY name;"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Folders Result:\n' + output);
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
