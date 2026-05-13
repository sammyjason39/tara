const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // Pull and REBUILD
    const cmd = 'cd zenvix && git pull origin main && docker compose up -d --build backend';
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.stderr.on('data', (data) => { output += 'ERROR: ' + data; });
        stream.on('close', () => {
            console.log('VPS Deployment Output:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
