const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready - Fetching ALL lookup requests...');
    const cmd = `docker logs --tail 250000 bfs-backend`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let stdout = '';
        let stderr = '';
        stream.on('data', (data) => { stdout += data; });
        stream.stderr.on('data', (data) => { stderr += data; });
        stream.on('close', () => {
            const allLogs = stdout + '\n' + stderr;
            const lines = allLogs.split('\n');
            const lookups = [];
            
            lines.forEach((line, idx) => {
                if (line.includes('/inventory/items/lookup?barcode=')) {
                    lookups.push({
                        lineNum: idx + 1,
                        text: line.trim()
                    });
                }
            });
            
            console.log(`Found ${lookups.length} total lookup requests.`);
            const targetPath = path.join(__dirname, '..', 'scratch', 'all_lookups.txt');
            fs.writeFileSync(targetPath, JSON.stringify(lookups, null, 2), 'utf8');
            console.log(`Saved to ${targetPath}`);
            
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
