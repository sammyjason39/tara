const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    const sqlContent = `
        SELECT location_id, count(*), sum(on_hand) as total_stock
        FROM stock_levels 
        WHERE on_hand > 0
        GROUP BY location_id;
    `;
    
    const cmd = `cat << 'EOF' > /tmp/test_all_stock.sql
${sqlContent}
EOF
docker exec -i bfs-db psql -U zenvix -d zenvix_prod < /tmp/test_all_stock.sql
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
