const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const folderIds = [
        '4663c4d0-e60f-4e5c-b6a0-cddc52b0a57f', // May
        '29553d21-6be2-40e6-bee5-32b0d25a8a0d', // 2026
        'fbdc5d62-257c-4e86-bf96-9bd6fbab565b', // Anchor
        'ff8dc393-0478-430e-8af7-af0cfc5e190a'  // Stock Opname
    ];
    
    const sql = `SELECT f.name, f.path, fo.name as folder_name 
                 FROM explorer_files f 
                 JOIN explorer_folders fo ON f.folder_id = fo.id 
                 WHERE f.folder_id IN (${folderIds.map(id => `'${id}'`).join(',')})`;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Files Result:\n' + output);
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
