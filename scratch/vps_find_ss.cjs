const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const cmd = `
        echo "Searching in tenants:" && docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name, code FROM tenants WHERE name ILIKE '%SS%' OR code ILIKE '%SS%';" &&
        echo "Searching in locations:" && docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name, code FROM locations WHERE name ILIKE '%SS%' OR code ILIKE '%SS%';"
    `;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Search Results:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
