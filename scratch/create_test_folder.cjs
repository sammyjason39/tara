const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    // Create a test folder to verify visibility
    const sql = `
        INSERT INTO explorer_folders (id, name, tenant_id, access_level) 
        VALUES (gen_random_uuid(), 'Visibility Test Folder', 'tnt-3rlhko', 'shared');
    `;
    conn.exec(`docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`, (err, stream) => {
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
