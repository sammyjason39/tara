const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const cmd = 'docker logs --tail 50 bfs-backend';
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.stderr.on('data', (data) => { output += 'ERROR: ' + data; });
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
