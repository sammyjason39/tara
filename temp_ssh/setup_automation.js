const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  // 1. Pull latest changes (including new scripts)
  // 2. Set permissions
  // 3. Add cron job if not already present
  const projectPath = '~/projects/business-flow-suite';
  const cmd = `
    cd ${projectPath} && 
    git pull origin main && 
    chmod +x vps-auto-deploy.sh vps-up.sh &&
    (crontab -l 2>/dev/null | grep -q "vps-auto-deploy.sh" || (crontab -l 2>/dev/null; echo "*/5 * * * * ${projectPath}/vps-auto-deploy.sh >> ${projectPath}/logs/cron.log 2>&1") | crontab -) &&
    echo "✅ Setup successful. Crontab updated." &&
    crontab -l | grep "vps-auto-deploy.sh"
  `;
  
  console.log('Running setup commands...');
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('--- Setup Finished with code ' + code + ' ---');
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
