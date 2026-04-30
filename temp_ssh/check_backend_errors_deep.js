const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Check both docker logs and the log file inside the container if it exists
  const cmd = 'docker logs bfs-backend 2>&1 | grep -iE "error|exception|fail" | tail -n 100';
  
  console.log('Searching for errors in backend logs...');
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('--- Search Finished ---');
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
