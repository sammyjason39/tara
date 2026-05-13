const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    const tenantId = 'tnt-3rlhko';
    const branches = ['Anchor', 'Double Six - Seminyak', 'Retail Branch SS'];
    
    async function check() {
        for (const branch of branches) {
            const sql = `SELECT s.id, s.product_id, s.on_hand, l.name as loc_name 
                         FROM stock_levels s 
                         JOIN locations l ON s.location_id = l.id 
                         WHERE s.tenant_id = '${tenantId}' 
                         AND l.name = '${branch}' 
                         AND s.on_hand > 0 
                         LIMIT 5;`;
            
            const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_prod -c "${sql.replace(/\n/g, ' ')}"`;
            
            await new Promise((resolve) => {
                conn.exec(cmd, (err, stream) => {
                    let out = '';
                    stream.on('data', d => out += d);
                    stream.on('close', () => {
                        console.log(`Branch: ${branch}\n` + out);
                        resolve();
                    });
                });
            });
        }
        conn.end();
    }
    check();
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108',
    port: 22,
    username: 'ubuntu',
    password: 'ocean-65%-forest'
});
