const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Check store count and IT overview
  const tenantId = 'tnt-2kjfmw';
  const cmd = `docker exec bfs-db psql -U zenvix -d zenvix_dev -t -c "SELECT count(*) FROM stores WHERE tenant_id = '${tenantId}';" && curl -s -X GET http://localhost:3001/v1/it/overview -H "x-tenant-id: ${tenantId}" -H "x-user-role: OWNER"`;
  console.log('Running:', cmd);
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '43.156.118.56',
  port: 22,
  username: 'ubuntu',
  password: 'forest-38$-storm'
});
