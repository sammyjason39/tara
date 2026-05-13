const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const id = 'a370e7ca-c1f7-4180-8824-846eaa6a3c8e';
    const cmd = `
        echo "Searching in tenants:" && docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name FROM tenants WHERE id = '${id}';" &&
        echo "Searching in locations:" && docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name FROM locations WHERE id = '${id}';" &&
        echo "Searching in companies:" && docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, name FROM companies WHERE id = '${id}';"
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
