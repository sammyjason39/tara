const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const sqlContent = `
        SELECT a.id as cycle_id, a.status, a.location_id, COUNT(i.id) as item_count
        FROM inventory_audit_cycles a
        LEFT JOIN inventory_audit_items i ON a.id = i.cycle_id
        GROUP BY a.id, a.status, a.location_id
        ORDER BY a.created_at DESC
        LIMIT 5;
    `;
    
    const cmd = `cat << 'EOF' > /tmp/test4.sql
${sqlContent}
EOF
docker exec -i bfs-db psql -U zenvix -d zenvix_prod < /tmp/test4.sql
`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Result:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
