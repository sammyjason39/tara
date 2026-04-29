const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Check git log and docker status
  const cmd = 'cd projects/business-flow-suite && git log -n 1 && docker compose ps';
  console.log('Running:', cmd);
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let result = '';
    stream.on('close', (code, signal) => {
      console.log('--- Info Finished ---');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
      result += data;
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
      result += 'ERR: ' + data;
    });
  });
}).connect({
  host: '43.156.118.56',
  port: 22,
  username: 'ubuntu',
  password: 'forest-38$-storm'
});
