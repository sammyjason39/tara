const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // 1. Fix host permissions for volumes
  // 2. Run prisma migrate deploy inside the backend container
  // 3. Restart the backend service to ensure everything is fresh
  const cmd = `
    cd projects/business-flow-suite && 
    echo "Fixing host permissions..." &&
    sudo chown -R 1000:1000 ./logs ./backups &&
    sudo chmod -R 775 ./logs ./backups &&
    echo "Running prisma migrate deploy..." &&
    docker compose -p bfs exec -T backend npx prisma migrate deploy &&
    echo "Restarting backend..." &&
    docker compose -p bfs restart backend
  `;
  console.log('Running:', cmd);
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Process closed with code:', code);
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
