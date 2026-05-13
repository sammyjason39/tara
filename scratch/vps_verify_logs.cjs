const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // Call the API via curl on VPS
    // Location Anchor ID: a370e7ca-c1f7-4180-8824-846eaa6a3c8e
    // Sorting by quantity DESC
    const url = 'http://localhost:3001/api/v1/inventory/items?location_id=a370e7ca-c1f7-4180-8824-846eaa6a3c8e&sortBy=quantity&sortOrder=desc&limit=5';
    
    // We need a token. I'll try to find one or just check the SQL logic since I already verified the DB stock.
    // Actually, I'll just check if the backend log shows my new logic being executed.
    
    const cmd = 'docker logs --tail 50 bfs-backend';
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Backend Logs:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
