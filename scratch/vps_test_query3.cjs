const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const sqlContent = `
        SELECT product_id, location_id, on_hand, available 
        FROM stock_levels 
        WHERE location_id = 'BS-AN' AND on_hand > 0
        LIMIT 10;
    `;
    
    const cmd = `cat << 'EOF' > /tmp/test2.sql
${sqlContent}
EOF
docker exec -i bfs-db psql -U zenvix -d zenvix_prod < /tmp/test2.sql
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
