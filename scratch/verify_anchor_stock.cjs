const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // Check specific product stock in Anchor
    const sql = `
        SELECT p.name, p.sku, s.on_hand, l.name as location_name
        FROM item_masters p
        JOIN stock_levels s ON s.product_id = p.id
        JOIN locations l ON s.location_id = l.id
        WHERE l.name = 'Anchor' AND s.on_hand > 0
        ORDER BY s.on_hand DESC
        LIMIT 5;
    `;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => { output += data; });
        stream.on('close', () => {
            console.log('Stock in Anchor:\n' + output);
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
