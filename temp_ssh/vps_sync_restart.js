const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  // Deployment Sequence:
  // 1. Pull latest code
  // 2. Restart backend (which should pick up code changes if mounted, or we might need to rebuild)
  // 3. Run Prisma migration
  const cmd = 'cd projects/business-flow-suite && git pull origin main && docker compose -p bfs build backend && docker compose -p bfs up -d backend && docker compose -p bfs exec -T backend npx prisma migrate deploy';
  
  console.log('Running:', cmd);
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Deployment finished with code:', code);
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
