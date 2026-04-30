const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  // 1. Push DB schema
  const cmd1 = 'docker exec bfs-backend npx prisma db push --accept-data-loss';
  console.log('Running:', cmd1);
  
  conn.exec(cmd1, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Prisma push finished with code:', code);
      
      // 2. Seed SYSTEM tenant
      const cmd2 = 'docker exec bfs-db psql -U zenvix -d zenvix_dev -c "INSERT INTO tenants (id, name, code, status) VALUES (\'SYSTEM\', \'System Administration\', \'SYSTEM\', \'active\') ON CONFLICT (id) DO NOTHING;"';
      console.log('Running:', cmd2);
      
      conn.exec(cmd2, (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', (code2) => {
          console.log('Seed finished with code:', code2);
          
          // 3. Restart backend
          const cmd3 = 'docker restart bfs-backend';
          console.log('Running:', cmd3);
          
          conn.exec(cmd3, (err3, stream3) => {
             if (err3) throw err3;
             stream3.on('close', () => {
                 console.log('Backend restarted.');
                 conn.end();
             }).on('data', (data) => process.stdout.write(data));
          });
        }).on('data', (data) => process.stdout.write(data));
      });
    }).on('data', (data) => process.stdout.write(data))
      .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect({
  host: '43.156.118.56',
  port: 22,
  username: 'ubuntu',
  password: 'forest-38$-storm'
});
