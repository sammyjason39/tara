const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  const cmd = 'cd ~/projects/business-flow-suite && ./vps-auto-deploy.sh && cat logs/vps-deploy.log';
  
  console.log('Running manual deployment check...');
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('--- Verification Finished ---');
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
