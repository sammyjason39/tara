const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready - Running git status on VPS host...');
    
    const cmd = `docker logs bfs-backend 2>&1 | grep -i "items/lookup" | tail -n 100`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let stdout = '';
        let stderr = '';
        stream.on('data', (data) => { stdout += data; });
        stream.stderr.on('data', (data) => { stderr += data; });
        stream.on('close', () => {
            console.log('STDOUT:\n', stdout);
            console.log('STDERR:\n', stderr);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
