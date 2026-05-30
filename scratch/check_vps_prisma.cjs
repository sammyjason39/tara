const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready - Checking prisma client keys in VPS container...');
    
    // We execute a node script inside the container using docker exec
    const jsCode = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.audit_hash_anchors.findFirst().then(anchor => {
    console.log('VPS_KEYS:', anchor ? Object.keys(anchor) : 'No anchors found');
    process.exit(0);
}).catch(err => {
    console.error('VPS_ERROR:', err);
    process.exit(1);
});
`;
    
    const cmd = `docker exec -i bfs-backend node -e "${jsCode.replace(/"/g, '\\"')}"`;
    
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
