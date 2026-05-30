const { Client } = require('ssh2');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Ready - Streaming docker logs to find lookup requests...');
    
    const cmd = `docker logs --tail 200000 bfs-backend`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let stdout = '';
        let stderr = '';
        stream.on('data', (data) => { stdout += data; });
        stream.stderr.on('data', (data) => { stderr += data; });
        stream.on('close', async () => {
            const allLogs = stdout + '\n' + stderr;
            await processLogs(allLogs);
            conn.end();
            await prisma.$disconnect();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({
    host: '150.109.15.108', port: 22, username: 'ubuntu', password: 'ocean-65%-forest'
});

async function processLogs(logsText) {
    console.log('Logs fetched, querying active item masters...');
    const items = await prisma.item_masters.findMany({
        where: { tenant_id: 'tnt-3rlhko' },
        select: { sku: true, barcode: true }
    });

    const dbKeys = new Set();
    items.forEach(item => {
        if (item.sku) dbKeys.add(item.sku.toLowerCase().trim());
        if (item.barcode) dbKeys.add(item.barcode.toLowerCase().trim());
    });

    console.log(`Loaded ${dbKeys.size} valid SKUs/barcodes from database.`);

    const lookupPattern = /barcode=([^&\s|]+)/gi;
    const allLookups = [];
    let match;
    
    const lines = logsText.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('/inventory/items/lookup?barcode=')) {
            // Find barcode in this line
            const matches = line.match(/barcode=([^&\s|]+)/i);
            if (matches) {
                const barcode = decodeURIComponent(matches[1]).trim();
                allLookups.push({
                    barcode,
                    lineNum: idx + 1,
                    line: line.trim()
                });
            }
        }
    });

    console.log(`Found ${allLookups.length} total lookup requests in logs.`);

    const unregisteredLookups = allLookups.filter(l => !dbKeys.has(l.barcode.toLowerCase()));
    console.log(`Found ${unregisteredLookups.length} lookups of UNREGISTERED barcodes.`);

    // Aggregate counts
    const counts = {};
    unregisteredLookups.forEach(l => {
        counts[l.barcode] = (counts[l.barcode] || 0) + 1;
    });

    console.log('\n--- UNREGISTERED BARCODES BY REQUEST COUNT ---');
    const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    sortedCounts.forEach(([barcode, count]) => {
        console.log(`Barcode: "${barcode}" -> Count in logs: ${count}`);
    });

    // Write detailed log of unregistered lookups to a file
    const reportPath = path.join(__dirname, '..', 'scratch', 'unregistered_lookups_report.txt');
    const reportContent = unregisteredLookups.map(l => `L${l.lineNum}: "${l.barcode}" | ${l.line}`).join('\n');
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`\nDetailed report written to ${reportPath}`);
}
