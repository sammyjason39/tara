const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready');
    
    // Use a simpler way to send the script - pipe it to node
    const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const ctx = { tenant_id: 'tnt-3rlhko' };
    const location_id = ''; // All Locations
    const sortBy = 'quantity';
    const sortOrder = 'desc';
    const limit = 5;
    const skip = 0;

    const conditions = ["p.tenant_id = 'tnt-3rlhko'", "p.status != 'deleted'"];
    const whereClause = conditions.join(" AND ");
    const locationCondition = "1=1";

    const rawSql = "SELECT p.id, p.sku, p.name, SUM(COALESCE(s.on_hand, 0)) as total_qty FROM item_masters p LEFT JOIN stock_levels s ON s.product_id = p.id WHERE " + whereClause + " GROUP BY p.id, p.sku, p.name ORDER BY SUM(COALESCE(s.on_hand, 0)) DESC LIMIT " + limit + " OFFSET " + skip;

    const orderedIds = await prisma.$queryRawUnsafe(rawSql);
    console.log('Raw SQL Results:', JSON.stringify(orderedIds, null, 2));

    const ids = orderedIds.map(o => o.id);
    const products = await prisma.item_masters.findMany({
        where: { id: { in: ids } },
        include: { 
            product_categories: true, 
            item_images: true,
            stock_levels: {
                select: { on_hand: true, location_id: true, tenant_id: true }
            }
        }
    });

    console.log('Prisma Results:', JSON.stringify(products, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
    , 2));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
`;

    const cmd = "docker exec -i bfs-backend node";
    
    const stream = conn.exec(cmd, (err, chan) => {
        if (err) throw err;
        let output = '';
        chan.on('data', (data) => { output += data; });
        chan.stderr.on('data', (data) => { output += 'ERROR: ' + data; });
        chan.on('close', () => {
            console.log('Debug Output:\n' + output);
            conn.end();
        });
        chan.write(script);
        chan.end();
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});
