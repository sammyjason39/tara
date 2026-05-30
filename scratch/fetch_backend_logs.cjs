const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready - Fetching backend logs...');
    
    const cmd = 'docker logs --tail 100000 bfs-backend';
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let stdout = '';
        let stderr = '';
        stream.on('data', (data) => { stdout += data; });
        stream.stderr.on('data', (data) => { stderr += data; });
        stream.on('close', () => {
            const allLogs = stdout + '\n' + stderr;
            const targetPath = path.join(__dirname, '..', 'vps_backend_logs_today.txt');
            fs.writeFileSync(targetPath, allLogs, 'utf8');
            console.log(`Successfully fetched ${allLogs.split('\n').length} lines of logs and wrote to ${targetPath}`);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
