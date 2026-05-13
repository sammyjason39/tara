const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // We will query to see the top items by quantity for BS-AN
    const sql = `
        SELECT p.id, p.name, SUM(
          CASE 
            WHEN s.location_id = ''BS-AN'' 
            THEN COALESCE(s.on_hand, 0) 
            ELSE 0 
          END
        ) as total_qty
        FROM item_masters p
        LEFT JOIN stock_levels s ON s.product_id = p.id
        WHERE p.status != ''deleted''
        GROUP BY p.id, p.name
        ORDER BY total_qty DESC
        LIMIT 10;
    `;
    
    const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql}"`;
    
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
