const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  // 1. Force permissions on scripts
  // 2. Run auto-deploy (which pulls 04342e9 and restarts)
  const cmd = 'cd projects/business-flow-suite && chmod +x vps-auto-deploy.sh vps-up.sh && ./vps-auto-deploy.sh && tail -n 20 logs/vps-deploy.log';
  
  console.log('Executing deployment command...');
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Command finished with code:', code);
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
