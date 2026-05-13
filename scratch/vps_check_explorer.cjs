const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const tenantId = 'tnt-3rlhko';
    const sql = `SELECT f.name as file_name, fo.name as folder_name 
                 FROM explorer_files f 
                 JOIN explorer_folders fo ON f.folder_id = fo.id 
                 WHERE f.tenant_id = '${tenantId}'
                 ORDER BY f.created_at DESC LIMIT 5;`;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Explorer Result:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
